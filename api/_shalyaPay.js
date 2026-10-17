// Shalya Pay — the self-hosted UPI gateway at pay-api.momsmagic.shop.
//
// ─────────────────────────────────────────────────────────────────────────────
// THREE THINGS STILL NEED CONFIRMING AGAINST THE REAL SPEC.
//
// They are all environment variables, not code, so correcting them is a Vercel
// settings change and a redeploy of nothing:
//
//   1. SHALYA_CREATE_PATH / SHALYA_FETCH_PATH — the actual route names.
//   2. SHALYA_SIGNATURE_FORMAT — what string is HMAC'd. Default "ts.body"
//      (timestamp, a dot, then the raw JSON body); "body" signs the body alone.
//   3. The response field names. normalisePayment() below accepts the handful
//      of spellings these APIs usually use, so a mismatch is unlikely — but
//      check it against a real response before trusting it with money.
//
// What is NOT guesswork: the header set, which the server itself advertises in
// its CORS preflight —
//   Authorization, Idempotency-Key, X-Device-Id, X-Timestamp, X-Signature,
//   X-Api-Key, X-Merchant-Id
// ─────────────────────────────────────────────────────────────────────────────
//
// Unlike Razorpay there is no licensed aggregator here: the customer pays by
// UPI straight into the owner's account and this service infers the payment
// from the bank's credit alert. Two consequences shape the code below.
//
//   * Confirmation is a *guess made from an SMS*, so it must be bound to the
//     UPI reference (UTR) and never to the amount alone. Two customers paying
//     the same amount in the same minute are otherwise indistinguishable, and
//     one would mark the other's order paid. markGroupPaid already refuses a
//     payment whose order does not match; fetchPayment keeps the UTR so that
//     check has something unforgeable to work with.
//
//   * The service runs on a PC behind a Cloudflare tunnel, so it will be
//     unreachable sometimes. Every call here has a timeout and returns null
//     rather than throwing, so checkout can offer Cash on Delivery instead of
//     hanging on a dead payment screen.

import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

const BASE = (process.env.SHALYA_API_BASE || 'https://pay-api.momsmagic.shop').replace(/\/+$/, '');
const CREATE_PATH = process.env.SHALYA_CREATE_PATH || '/payments';
const FETCH_PATH = process.env.SHALYA_FETCH_PATH || '/payments/{id}';
const SIGNATURE_FORMAT = process.env.SHALYA_SIGNATURE_FORMAT || 'ts.body';
const TIMEOUT_MS = Number(process.env.SHALYA_TIMEOUT_MS || 12000);
/** How far out of date a signed request or webhook may be, in seconds. */
const MAX_SKEW_S = Number(process.env.SHALYA_MAX_SKEW_S || 300);

export const shalyaConfigured = () =>
  !!(process.env.SHALYA_API_KEY && process.env.SHALYA_MERCHANT_ID);

/** The exact bytes that get signed. Keep this identical on both sides. */
function signingPayload(timestamp, rawBody) {
  return SIGNATURE_FORMAT === 'body' ? String(rawBody) : `${timestamp}.${rawBody}`;
}

function sign(timestamp, rawBody, secret) {
  return createHmac('sha256', secret).update(signingPayload(timestamp, rawBody)).digest('hex');
}

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

/** fetch with a deadline; null on timeout, network error or a non-2xx reply. */
async function call(path, { method = 'GET', body = null, idempotencyKey } = {}) {
  if (!shalyaConfigured()) return null;

  const raw = body ? JSON.stringify(body) : '';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = process.env.SHALYA_SIGNING_SECRET || process.env.SHALYA_API_KEY;

  const headers = {
    'X-Api-Key': process.env.SHALYA_API_KEY,
    'X-Merchant-Id': process.env.SHALYA_MERCHANT_ID,
    'X-Timestamp': timestamp,
    'X-Signature': sign(timestamp, raw, secret),
  };
  if (raw) headers['Content-Type'] = 'application/json';
  // Retries and double taps must not create two UPI collections for one order.
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: raw || undefined,
      signal: controller.signal,
    });
    const parsed = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('shalya-pay: %s %s -> %s %j', method, path, res.status, parsed);
      return null;
    }
    return parsed;
  } catch (error) {
    // Includes the tunnel being down, which is an expected state here.
    console.error('shalya-pay: %s %s unreachable:', method, path, error?.message || error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Flattens a payment into the shape the rest of the codebase expects, accepting
 * the spellings these APIs commonly use so a small spec difference does not
 * silently read `undefined` and compare equal to nothing.
 */
export function normalisePayment(body) {
  if (!body || typeof body !== 'object') return null;
  const p = body.payment || body.data || body;

  const rupees = p.amountRupees ?? p.amount_rupees ?? null;
  const paiseRaw = p.amountPaise ?? p.amount_paise ?? p.amount ?? null;
  // `amount` is paise in most gateways; only treat it as rupees if the API
  // explicitly said so via SHALYA_AMOUNT_UNIT.
  const unitIsRupees = (process.env.SHALYA_AMOUNT_UNIT || 'paise') === 'rupees';
  const amountPaise =
    rupees != null ? Math.round(Number(rupees) * 100)
      : paiseRaw != null ? Math.round(Number(paiseRaw) * (unitIsRupees ? 100 : 1))
        : null;

  const status = String(p.status ?? p.state ?? '').toLowerCase();

  return {
    id: p.id ?? p.paymentId ?? p.payment_id ?? null,
    orderId: p.orderId ?? p.order_id ?? p.merchantOrderId ?? p.merchant_order_id ?? p.receipt ?? null,
    amountPaise,
    status,
    // The UPI reference. This is the only field that uniquely identifies a real
    // bank credit, so it is what makes SMS-derived confirmation trustworthy.
    utr: p.utr ?? p.rrn ?? p.referenceId ?? p.reference_id ?? p.bankReference ?? null,
    // What the customer's UPI app should open, when the API returns one.
    payLink: p.upiLink ?? p.upi_link ?? p.intentUrl ?? p.intent_url ?? p.payLink ?? null,
    qr: p.qr ?? p.qrCode ?? p.qr_code ?? null,
    raw: p,
  };
}

/** True when the gateway says this payment actually succeeded. */
export function isPaidStatus(status) {
  return ['paid', 'success', 'successful', 'completed', 'captured', 'settled'].includes(
    String(status || '').toLowerCase()
  );
}

/**
 * Asks Shalya Pay to collect `amountRupees` for order `receipt`.
 * Returns an object shaped like a Razorpay order ({ id, ... }) or null when the
 * gateway could not be reached, which place-order turns into a 503 so the
 * customer is offered Cash on Delivery.
 */
export async function createShalyaOrder(amountRupees, receipt) {
  const body = await call(CREATE_PATH, {
    method: 'POST',
    idempotencyKey: `order-${receipt}`,
    body: {
      amount: Math.round(amountRupees * 100),
      currency: 'INR',
      merchantOrderId: receipt,
      reference: randomUUID(),
      notes: { orderId: receipt },
    },
  });
  const payment = normalisePayment(body);
  if (!payment?.id) return null;
  return { ...payment, id: payment.id };
}

/**
 * The `upi://pay?...` deep link the customer's bank app opens.
 *
 * Built here rather than taken from the gateway, because the destination is a
 * fixed VPA the owner controls: the gateway's job is to *detect* the credit,
 * not to collect it. If the gateway does return its own link, createShalyaOrder
 * prefers that one.
 *
 * `tn` carries the order id so the bank's narration has something to match on,
 * but banks truncate and mangle that field, so nothing may depend on it — the
 * UTR is what actually binds a payment to an order.
 */
export function upiIntentLink(amountRupees, orderId) {
  const vpa = process.env.SHALYA_UPI_VPA;
  if (!vpa) return null;
  const params = new URLSearchParams({
    pa: vpa,
    pn: process.env.SHALYA_UPI_NAME || "Mom's Magic",
    am: Number(amountRupees).toFixed(2),
    cu: 'INR',
    tn: `Order ${orderId}`.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}

/** The payment as the gateway currently reports it, or null. */
export async function fetchShalyaPayment(paymentId) {
  if (!paymentId) return null;
  const path = FETCH_PATH.replace('{id}', encodeURIComponent(String(paymentId)));
  return normalisePayment(await call(path));
}

/**
 * Verifies a notification the gateway pushed to us.
 *
 * Checks the HMAC *and* the timestamp: without the freshness check a captured
 * request could be replayed forever to re-confirm payments. Fails closed when
 * SHALYA_WEBHOOK_SECRET is unset, so an unconfigured deployment cannot be told
 * that an order is paid.
 */
export function validShalyaWebhook(rawBody, headers = {}) {
  const secret = process.env.SHALYA_WEBHOOK_SECRET;
  if (!secret) return { ok: false, error: 'webhook_secret_not_configured' };

  const get = (name) =>
    typeof headers.get === 'function' ? headers.get(name) : headers[name] ?? headers[name.toLowerCase()];

  const signature = get('x-signature');
  const timestamp = get('x-timestamp');
  if (!signature || !timestamp) return { ok: false, error: 'missing_signature' };

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_SKEW_S) return { ok: false, error: 'stale_timestamp' };

  if (!safeEqualHex(sign(timestamp, rawBody, secret), signature)) {
    return { ok: false, error: 'bad_signature' };
  }
  return { ok: true };
}
