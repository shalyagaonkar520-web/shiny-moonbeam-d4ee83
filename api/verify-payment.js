import { adminDb } from './_firebaseAdmin.js';
import { paymentsConfigured, validCheckoutSignature, markGroupPaid } from './_payments.js';

// POST /api/verify-payment
// { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
//
// Called by the app when Razorpay's checkout succeeds. The order is marked
// paid only if the signature proves Razorpay issued this payment for the
// Razorpay order we created for this exact order group.

const ORDER_ID = /^[0-9]{13}[A-Z2-9]{10}$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  if (!adminDb || !paymentsConfigured()) return res.status(503).json({ ok: false, error: 'payments_not_configured' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const orderId = String(body.orderId || '');
  const rzpOrder = String(body.razorpay_order_id || '');
  const paymentId = String(body.razorpay_payment_id || '');
  const signature = String(body.razorpay_signature || '');

  if (!ORDER_ID.test(orderId) || !rzpOrder || !paymentId || !signature) {
    return res.status(400).json({ ok: false, error: 'invalid_request' });
  }
  if (!validCheckoutSignature(rzpOrder, paymentId, signature)) {
    return res.status(400).json({ ok: false, error: 'invalid_signature' });
  }

  try {
    const result = await markGroupPaid(rzpOrder, paymentId, { groupId: orderId });
    return res.status(result.ok ? 200 : 409).json(result);
  } catch (err) {
    console.error('verify-payment failed', err);
    return res.status(502).json({ ok: false, error: 'verify_failed' });
  }
}
