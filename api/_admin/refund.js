// POST /api/admin/refund -- a refund requested from the Super Admin.
//
// Body: { orderId, amount (rupees), reason, requestId }
// Auth: Authorization: Bearer <Firebase ID token> of an active SUPER_ADMIN
//       or FINANCE_MANAGER (checked against users/{uid}, not the request).
//
// The refund is reserved on the order inside a transaction before the
// provider is called, so two operators clicking at once cannot together
// refund more than was paid; requestId makes a retried click return the
// first result instead of refunding twice. The provider's own record of the
// payment is checked too. The outcome is written to refunds/{requestId}, to
// the order, and to the audit log; a failure is rolled back on the order and
// reported on the Monitoring screen.

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../_firebaseAdmin.js';
import { razorpayConfigured, fetchRazorpayPayment } from '../_payments.js';
import { panelCors, requireStaff, auditEntry } from '../_staffAuth.js';
import { logOpsEvent } from '../_ops.js';

const REFUND_ROLES = ['SUPER_ADMIN', 'FINANCE_MANAGER'];
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0);

export default async function handler(req, res) {
  if (panelCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  let staff;
  try {
    staff = await requireStaff(req, REFUND_ROLES);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const body = req.body || {};
  const orderId = String(body.orderId || '');
  const reason = String(body.reason || '').trim();
  const requestId = String(body.requestId || '');
  const amount = Math.round(num(body.amount) * 100) / 100;
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(orderId)) return res.status(400).json({ error: 'Unknown order.' });
  if (!/^[A-Za-z0-9_-]{6,120}$/.test(requestId)) return res.status(400).json({ error: 'Missing request id.' });
  if (!(amount > 0)) return res.status(400).json({ error: 'The refund must be more than zero.' });
  if (reason.length < 3) return res.status(400).json({ error: 'A reason is required.' });
  if (!razorpayConfigured()) return res.status(503).json({ error: 'The payment provider is not configured on the server.' });

  const orderRef = adminDb.collection('orders').doc(orderId);
  const refundRef = adminDb.collection('refunds').doc(requestId);

  // 1. Reserve the refund on the order, or return the earlier result.
  let reserved;
  try {
    reserved = await adminDb.runTransaction(async (tx) => {
      const [orderSnap, refundSnap] = await Promise.all([tx.get(orderRef), tx.get(refundRef)]);
      if (refundSnap.exists) return { replay: refundSnap.data() };
      if (!orderSnap.exists) throw Object.assign(new Error('That order no longer exists.'), { status: 404 });
      const o = orderSnap.data();
      const paid = o.paymentStatus === 'completed' || o.paymentStatus === 'paid';
      if (!paid || String(o.paymentMethod || 'cod').toLowerCase() === 'cod') {
        throw Object.assign(new Error('Only orders paid online can be refunded here.'), { status: 409 });
      }
      if (!/^pay_[A-Za-z0-9]+$/.test(String(o.paymentId || ''))) {
        throw Object.assign(new Error('This payment was not made through Razorpay; refund it in its provider’s dashboard.'), { status: 501 });
      }
      const charged = num(o.totalAmount ?? o.grandTotal ?? o.payableAmount);
      const already = num(o.refundAmount);
      if (amount > charged - already + 0.001) {
        throw Object.assign(new Error(`At most ₹${Math.max(0, charged - already).toFixed(2)} can still be refunded on this order.`), { status: 409 });
      }
      tx.set(refundRef, {
        orderId, orderNumber: o.orderNumber || '', paymentId: o.paymentId, amount, reason, status: 'requested',
        requestedBy: staff.uid, requestedByEmail: staff.email, createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(orderRef, { refundStatus: 'requested', refundAmount: already + amount, refundRequestedAt: FieldValue.serverTimestamp() });
      return { order: o, already };
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Could not reserve the refund.' });
  }
  if (reserved.replay) return res.status(200).json({ ok: true, replay: true, ...reserved.replay });

  const { order, already } = reserved;
  const paise = Math.round(amount * 100);

  const rollBack = async (message, status = 502) => {
    await Promise.all([
      refundRef.update({ status: 'failed', error: message.slice(0, 300), failedAt: FieldValue.serverTimestamp() }),
      orderRef.update({ refundStatus: already > 0 ? 'processed' : 'failed', refundAmount: already }),
    ]).catch(() => {});
    await logOpsEvent('refund', 'error', `Refund of ₹${amount} failed: ${message}`, orderId);
    return res.status(status).json({ error: message });
  };

  // 2. The provider's own view of the payment: never refund past it.
  const payment = await fetchRazorpayPayment(order.paymentId);
  if (!payment) return rollBack('Could not read the payment from Razorpay.');
  if (num(payment.amount_refunded) + paise > num(payment.amount)) {
    return rollBack('Razorpay shows this payment is already refunded up to its full amount.', 409);
  }

  // 3. Refund through the provider.
  let result;
  try {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const r = await fetch(`https://api.razorpay.com/v1/payments/${order.paymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: paise, speed: 'normal', receipt: requestId.slice(0, 40), notes: { orderId, requestId, reason: reason.slice(0, 200) } }),
    });
    result = await r.json().catch(() => ({}));
    if (!r.ok || !result.id) return rollBack(result?.error?.description || `Razorpay refused the refund (${r.status}).`);
  } catch (e) {
    return rollBack(`Could not reach Razorpay: ${e?.message || e}`);
  }

  // 4. Record it. "processed" now, or "pending" until Razorpay's refund
  // webhook confirms it.
  const status = result.status === 'processed' ? 'processed' : 'pending';
  await Promise.all([
    refundRef.update({ status, providerRefundId: result.id, providerStatus: result.status, processedAt: FieldValue.serverTimestamp() }),
    orderRef.update({ refundStatus: status, refundId: result.id, refundNeeded: false }),
    adminDb.collection('auditLogs').add({
      ...auditEntry(staff, {
        action: 'refund.issue', entity: 'orders', entityId: orderId, cityId: order.cityId || '', reason,
        summary: `Refunded ₹${amount} on #${order.orderNumber || orderId} (${result.id})`,
        before: { refundAmount: already }, after: { refundAmount: already + amount, status },
      }),
      at: FieldValue.serverTimestamp(),
    }),
  ]).catch((e) => logOpsEvent('refund', 'warning', `Refund ${result.id} succeeded but recording it failed: ${e?.message}`, orderId));

  return res.status(200).json({ ok: true, refundId: result.id, status, amount });
}
