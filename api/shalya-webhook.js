import { validShalyaWebhook, normalisePayment, isPaidStatus } from './_shalyaPay.js';
import { logOpsEvent } from './_ops.js';
import { markGroupPaid, usingShalya } from './_payments.js';

// Shalya Pay tells us a UPI payment landed.
//
// This is the single most security-sensitive endpoint in the app: a request
// that gets past it marks an order paid and sends it to the kitchen. It is also
// the weakest link by nature, because upstream the "payment" is a bank credit
// alert parsed on a home PC rather than a card network's authorisation.
//
// So it is deliberately paranoid:
//
//   * HMAC over the raw body, verified before the JSON is even parsed. Parsing
//     first would let an attacker reach the parser with unsigned input.
//   * Timestamp freshness, so a request captured once cannot be replayed to
//     re-confirm payments later.
//   * Fails closed when SHALYA_WEBHOOK_SECRET is unset. An unconfigured
//     deployment must not be tellable that an order is paid.
//   * Refuses to act at all unless PAYMENT_PROVIDER is shalya, so the endpoint
//     is inert while Razorpay is the live gateway.
//   * A UTR is required. Confirmation derived from an SMS cannot distinguish
//     two customers paying the same amount in the same minute; the UPI
//     reference is the only field that identifies one real bank credit.
//   * The amount is taken from the webhook and checked by markGroupPaid against
//     the server-side payments/{orderId} record. Nothing the caller says about
//     price is trusted.
//
// Always answers 200 once the signature is good, even when the payment is
// rejected downstream. Gateways retry non-2xx replies, and a retry storm for a
// payment we will never accept helps nobody; the reason is logged instead.

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  if (!usingShalya()) {
    // Razorpay is live; this endpoint should not be doing anything.
    return res.status(503).json({ ok: false, error: 'provider_not_active' });
  }

  const raw = await readRawBody(req).catch(() => '');
  if (!raw) return res.status(400).json({ ok: false, error: 'empty_body' });

  const check = validShalyaWebhook(raw, req.headers);
  if (!check.ok) {
    console.error('shalya-webhook: rejected (%s)', check.error);
    // 401 and no detail: a caller who cannot sign gets no help working out why.
    return res.status(401).json({ ok: false });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  const payment = normalisePayment(body);
  if (!payment?.id || !payment.orderId) {
    console.error('shalya-webhook: payment id or order id missing', body);
    return res.status(200).json({ ok: false, error: 'incomplete_payment' });
  }

  if (!isPaidStatus(payment.status)) {
    // Pending and failed notifications are normal; nothing to do but log.
    console.info('shalya-webhook: %s is %s, ignoring', payment.id, payment.status || 'unknown');
    return res.status(200).json({ ok: true, ignored: payment.status || 'unknown' });
  }

  if (!payment.utr) {
    console.error('shalya-webhook: %s claims paid with no UTR, refusing', payment.id);
    return res.status(200).json({ ok: false, error: 'missing_utr' });
  }

  try {
    const result = await markGroupPaid(payment.orderId, payment.id, {
      amountPaise: payment.amountPaise ?? undefined,
    });
    if (!result.ok) {
      console.error('shalya-webhook: not marked paid (%s)', result.error);
      await logOpsEvent('payment_webhook', 'error', `Shalya payment not marked paid: ${result.error}`, String(payment.id || ''));
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('shalya-webhook: failed to mark paid', error);
    await logOpsEvent('payment_webhook', 'error', `Shalya webhook failed: ${error?.message || error}`);
    // 500 so the gateway retries — this one is our fault, not the caller's.
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}
