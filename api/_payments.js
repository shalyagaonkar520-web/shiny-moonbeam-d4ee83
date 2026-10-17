// Payment helpers shared by place-order, verify-payment and the webhooks.
//
// Two gateways are supported and PAYMENT_PROVIDER chooses between them:
//   razorpay (default) — the licensed aggregator, unchanged.
//   shalya             — the self-hosted UPI gateway, see ./_shalyaPay.js.
// It defaults to razorpay, so a deployment that sets nothing keeps working
// exactly as before and the new path stays inert until it is switched on
// deliberately. Switching back is one environment variable, not a code change,
// which matters when the alternative is a PC at home serving live payments.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { adminDb } from './_firebaseAdmin.js';
import { loadGroup, announceOnce, sendTelegram } from './_orderMessage.js';
import {
  shalyaConfigured,
  createShalyaOrder,
  fetchShalyaPayment,
  isPaidStatus,
} from './_shalyaPay.js';

export const PAYMENT_PROVIDER = (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase();
export const usingShalya = () => PAYMENT_PROVIDER === 'shalya';

export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

/** Is the gateway currently selected by PAYMENT_PROVIDER usable? */
export const paymentsConfigured = () => (usingShalya() ? shalyaConfigured() : razorpayConfigured());

/**
 * Creates an order with whichever gateway is selected.
 * Returns null when the gateway is unreachable — place-order turns that into a
 * 503 so checkout can offer Cash on Delivery rather than stranding the customer.
 */
export async function createPaymentOrder(amountRupees, receipt) {
  if (usingShalya()) return createShalyaOrder(amountRupees, receipt);
  return createRazorpayOrder(amountRupees, receipt);
}

/**
 * One payment, in one shape, whichever gateway reported it.
 * `utr` is only ever set by Shalya Pay, where confirmation is inferred from a
 * bank credit alert and the UPI reference is the only unforgeable identifier.
 */
export async function fetchPayment(paymentId) {
  if (usingShalya()) return fetchShalyaPayment(paymentId);
  const rzp = await fetchRazorpayPayment(paymentId);
  if (!rzp) return null;
  return {
    id: rzp.id,
    orderId: rzp.order_id,
    amountPaise: Number(rzp.amount),
    status: String(rzp.status || '').toLowerCase(),
    utr: rzp.acquirer_data?.rrn ?? null,
    raw: rzp,
  };
}

/** Razorpay calls an authorised-but-uncaptured payment good; Shalya has its own words. */
function paymentSucceeded(status) {
  return usingShalya()
    ? isPaidStatus(status)
    : ['authorized', 'captured'].includes(String(status || '').toLowerCase());
}

/** Creates a Razorpay order for an amount the server computed. */
export async function createRazorpayOrder(amountRupees, receipt) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100),
      currency: 'INR',
      receipt: receipt.slice(0, 40),
      notes: { orderId: receipt },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id) throw new Error(`Razorpay order failed: ${res.status} ${body?.error?.description || ''}`);
  return body;
}

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout signature: HMAC-SHA256(order_id|payment_id) with the key secret. */
export function validCheckoutSignature(razorpayOrderId, paymentId, signature) {
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpayOrderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw body) with the webhook secret. */
export function validWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}

/**
 * Marks an order group paid, once, and tells the team. Only called after
 * Razorpay's signature proves the payment is genuine. The payment is checked
 * against payments/<razorpayOrderId>, written by /api/place-order when it
 * created the Razorpay order. Only the Admin SDK can write that collection
 * (the rules deny every client), so nothing on the order document itself is
 * trusted.
 *
 * @param {string} razorpayOrderId  the Razorpay order the payment belongs to
 * @param {string} paymentId
 * @param {{ groupId?: string, amountPaise?: number }} expect
 *   groupId: the order the caller claims (checkout path) — must match the record.
 *   amountPaise: what was actually paid (webhook path) — must match the record.
 */
/** A payment as Razorpay itself reports it, or null if it cannot be fetched. */
export async function fetchRazorpayPayment(paymentId) {
  if (!razorpayConfigured() || !/^pay_[A-Za-z0-9]+$/.test(String(paymentId || ''))) return null;
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  try {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, { headers: { Authorization: `Basic ${auth}` } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function markGroupPaid(razorpayOrderId, paymentId, expect = {}) {
  if (!razorpayOrderId) return { ok: false, error: 'missing_razorpay_order' };
  const recordRef = adminDb.collection('payments').doc(razorpayOrderId);
  const recordSnap = await recordRef.get();
  if (!recordSnap.exists) return { ok: false, error: 'unknown_razorpay_order' };
  const record = recordSnap.data();
  if (expect.groupId && expect.groupId !== record.groupId) return { ok: false, error: 'payment_order_mismatch' };
  if (typeof expect.amountPaise === 'number' && expect.amountPaise !== record.amountPaise) {
    return { ok: false, error: 'amount_mismatch' };
  }

  // A valid signature proves the gateway authorised the payment; also ask the
  // gateway directly that it belongs to this order and is for the full amount.
  // A null reply means the gateway was unreachable, not that the payment is
  // bad, so the signature alone has to carry it — which is why the signature
  // check upstream of here is never optional.
  const payment = await fetchPayment(paymentId);
  if (payment) {
    if (payment.orderId && payment.orderId !== razorpayOrderId) {
      return { ok: false, error: 'payment_order_mismatch' };
    }
    if (payment.amountPaise !== record.amountPaise) return { ok: false, error: 'amount_mismatch' };
    if (!paymentSucceeded(payment.status)) return { ok: false, error: 'payment_not_successful' };
    // Shalya Pay infers payments from bank credit alerts, where an amount on
    // its own cannot tell two simultaneous customers apart. Refuse to mark an
    // order paid unless the gateway gave a UPI reference to pin it to.
    if (usingShalya() && !payment.utr) return { ok: false, error: 'missing_utr' };
  }

  const groupId = record.groupId;
  const group = await loadGroup(groupId);
  if (!group.length) return { ok: false, error: 'order_not_found' };
  if (group[0].data.razorpayOrderId !== razorpayOrderId) return { ok: false, error: 'payment_order_mismatch' };

  const paidAt = new Date().toISOString();
  // Only an order still waiting for its payment becomes a kitchen order. A
  // payment that lands after the order was cancelled is recorded and flagged
  // for a refund instead of silently re-opening it.
  const outcome = await adminDb.runTransaction(async (tx) => {
    const snaps = await Promise.all(group.map((g) => tx.get(g.ref)));
    const primary = snaps[0].data();
    if (primary.paymentStatus === 'completed') return 'already';
    const waiting = primary.status === 'awaiting_payment';
    snaps.forEach((snap) => {
      tx.update(snap.ref, waiting
        ? { paymentStatus: 'completed', paymentId, paidAt, status: 'pending', orderStatus: 'NEW' }
        : { paymentStatus: 'completed', paymentId, paidAt, refundNeeded: true });
    });
    // Keeping the UTR and the provider on the payment record is what makes a
    // disputed UPI payment traceable back to a specific bank credit later.
    tx.update(recordRef, {
      paymentId,
      paidAt,
      utr: payment?.utr ?? null,
      provider: PAYMENT_PROVIDER,
    });
    return waiting ? 'paid' : 'late';
  });

  if (outcome === 'late') {
    await sendTelegram(`💸 <b>Payment received for an order that is no longer open</b>
🆔 <code>${groupId}</code>
Payment ${paymentId}. Refund it or restore the order.`);
  } else {
    await announceOnce(groupId);
  }
  return { ok: true, groupId, outcome };
}
