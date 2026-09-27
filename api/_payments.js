// Razorpay helpers shared by place-order, verify-payment and the webhook.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { adminDb } from './_firebaseAdmin.js';
import { loadGroup, announceOnce, sendTelegram } from './_orderMessage.js';

export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

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

  // A checkout signature proves Razorpay authorised the payment; also confirm
  // with Razorpay that it belongs to this order and is for the full amount.
  const payment = await fetchRazorpayPayment(paymentId);
  if (payment) {
    if (payment.order_id !== razorpayOrderId) return { ok: false, error: 'payment_order_mismatch' };
    if (Number(payment.amount) !== record.amountPaise) return { ok: false, error: 'amount_mismatch' };
    if (!['authorized', 'captured'].includes(payment.status)) return { ok: false, error: 'payment_not_successful' };
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
    tx.update(recordRef, { paymentId, paidAt });
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
