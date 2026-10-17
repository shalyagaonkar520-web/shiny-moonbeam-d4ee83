import { adminDb } from './_firebaseAdmin.js';

// GET /api/payment-status?id=<orderId>
//
// "Has this order been paid yet?" — polled by the UPI payment screen while the
// customer is in their bank app.
//
// A UPI payment has no callback into the browser the way a card modal does: the
// customer leaves for GPay or PhonePe and may never come back to the tab. The
// only authority on whether money arrived is the server, which learns it from
// /api/shalya-webhook. So the browser asks, repeatedly, and is never allowed to
// decide for itself.
//
// Knowing the order id is what authorises the read, the same model as
// /api/track and the /track/<orderId> links customers are sent. The reply is
// therefore the bare minimum: whether it is paid, and the stage. It never
// returns the payment id, the UTR, the amount, the customer, or anything that
// would make this endpoint useful for trawling other people's orders.

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{6,100}$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  if (!adminDb) return res.status(503).json({ ok: false, error: 'not_configured' });

  const id = String(req.query?.id || '');
  if (!ORDER_ID_PATTERN.test(id)) return res.status(400).json({ ok: false, error: 'bad_order_id' });

  try {
    const snap = await adminDb.collection('orders').doc(id).get();
    if (!snap.exists) {
      // Indistinguishable from "not paid yet" on purpose: a 404 would let
      // someone probe which order ids exist.
      return res.status(200).json({ ok: true, paid: false, status: 'unknown' });
    }
    const order = snap.data() || {};
    return res.status(200).json({
      ok: true,
      paid: order.paymentStatus === 'completed',
      status: order.status || 'unknown',
    });
  } catch (error) {
    console.error('payment-status: lookup failed', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}
