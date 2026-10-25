import { FieldValue } from 'firebase-admin/firestore';
import { logOpsEvent } from './_ops.js';
import { adminDb, adminMessaging } from './_firebaseAdmin.js';
import { toStage } from './_orderStage.js';

// POST /api/notify-order  { orderId }
//
// Sends the customer a push notification for the stage their order is in NOW
// (accepted, out for delivery, delivered, cancelled). Called by the admin panel
// and the rider dashboard right after they change an order's status.
//
// It needs no auth because it cannot be abused: the message is chosen from the
// order's real status in Firestore (a caller cannot make up text or a stage),
// it goes only to the device that placed that order, and each stage is sent at
// most once (tracked in order.notifiedStages).

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{6,100}$/;
const SITE = 'https://momsmagic.shop';
// Paid to the assigned rider for each delivered order.
const RIDER_FEE_PER_DELIVERY = 40;
// Deliveries before this were credited by the old in-app counter.
const RIDER_CREDIT_FROM = '2026-09-27T00:00:00.000Z';

const MESSAGES = {
  preparing: { title: 'Order accepted 👩‍🍳', body: 'The kitchen is preparing your food.' },
  out_for_delivery: { title: 'On the way 🛵', body: 'Your order is out for delivery. Tap to track your rider live.' },
  delivered: { title: 'Delivered 🎉', body: 'Enjoy your meal! Tap to rate your order.' },
  cancelled: { title: 'Order cancelled', body: 'Your order was cancelled. Contact us on WhatsApp if you have questions.' },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  if (!adminDb || !adminMessaging) return res.status(503).json({ ok: false, error: 'push_not_configured' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const orderId = String(body.orderId || '').trim();
  if (!ORDER_ID_PATTERN.test(orderId)) return res.status(400).json({ ok: false, error: 'invalid_order_id' });

  try {
    const orderRef = adminDb.collection('orders').doc(orderId);

    // Claim the stage inside a transaction so two quick calls (admin and rider
    // both updating) cannot both send the same notification.
    const claim = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) return { skip: 'order_not_found' };
      const order = snap.data();
      const stage = toStage(order);
      const updates = {};

      // Rider pay is credited here, once per order, when it really becomes
      // delivered. It used to be a counter the rider's phone rewrote itself,
      // which could be double-counted or set to any value.
      // deliveredAt is written by staff/rider status changes (setOrderStage),
      // which the rules only allow for the assigned rider or an admin.
      if (
        stage === 'delivered' && order.riderId && !order.riderCredited && !order.riderCreditedAt &&
        // Only deliveries made after server-side crediting went live: older
        // orders were paid by the old app counter and must not pay again.
        String(order.deliveredAt || '') >= RIDER_CREDIT_FROM
      ) {
        const riderRef = adminDb.collection('riders').doc(String(order.riderId));
        const riderSnap = await tx.get(riderRef);
        if (riderSnap.exists) {
          tx.update(riderRef, {
            earnings: FieldValue.increment(RIDER_FEE_PER_DELIVERY),
            deliveredCount: FieldValue.increment(1),
          });
          updates.riderCredited = true;
          updates.riderCreditedAt = new Date().toISOString();
          updates.riderCommission = RIDER_FEE_PER_DELIVERY;
        }
      }

      const token = order.customerPushToken;
      let result;
      if (!MESSAGES[stage]) result = { skip: 'nothing_to_send', stage };
      else if (!token) result = { skip: 'no_device_token', stage };
      else if ((order.notifiedStages || []).includes(stage)) result = { skip: 'already_sent', stage };
      else {
        updates.notifiedStages = FieldValue.arrayUnion(stage);
        result = { stage, token };
      }
      if (Object.keys(updates).length) tx.update(orderRef, updates);
      return result;
    });

    if (claim.skip) return res.status(200).json({ ok: true, sent: false, reason: claim.skip, stage: claim.stage });

    const { title, body: text } = MESSAGES[claim.stage];
    const path = `/track/${encodeURIComponent(orderId)}`;
    try {
      await adminMessaging.send({
        token: claim.token,
        notification: { title, body: text },
        data: { url: path, orderId, stage: claim.stage },
        android: {
          priority: 'high',
          notification: { channelId: 'order_updates', tag: `order-${orderId}` },
        },
        webpush: {
          fcmOptions: { link: `${SITE}${path}` },
          notification: { tag: `order-${orderId}`, icon: '/logo-sm.webp' },
        },
      });
    } catch (err) {
      const code = err?.errorInfo?.code || err?.code || '';
      // Release the claim so a retry can send it, unless the token is dead.
      const dead = code.includes('registration-token-not-registered') || code.includes('invalid-registration-token');
      await orderRef.update(
        dead
          ? { customerPushToken: FieldValue.delete() }
          : { notifiedStages: FieldValue.arrayRemove(claim.stage) }
      );
      console.error('notify-order: send failed', code || err);
      return res.status(200).json({ ok: true, sent: false, reason: dead ? 'device_unregistered' : 'send_failed' });
    }

    return res.status(200).json({ ok: true, sent: true, stage: claim.stage });
  } catch (error) {
    console.error('notify-order failed', error);
    await logOpsEvent('notification', 'error', `Order push failed: ${error?.message || error}`, orderId);
    return res.status(502).json({ ok: false, error: 'notify_failed' });
  }
}
