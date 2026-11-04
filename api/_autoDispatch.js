// Orders go straight to their restaurant.
//
// The panel used to hold every new order at JIS until someone pressed SEND.
// With system/settings.autoDispatch on (the default; the Super Admin can
// switch it off in Settings) the server does what SEND did, at the moment the
// order becomes a kitchen order: cash orders when they are placed, online
// ones when the payment is verified. That is:
//
//   * dispatchStatus SENT, with sentAt / sentBy and the hotel's city stamped,
//     which is what puts the order on the restaurant's screen and rings its
//     new-order alarm;
//   * a random trackingId, and the public tracking/{trackingId} card the
//     customer's live tracking reads;
//   * the ORDER_SENT_TO_HOTEL notification the restaurant's bell lists.
//
// Riders are still offered the order only when the restaurant accepts it,
// and the first rider to accept gets it (enforced by the Firestore rules).

import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';

export const AUTO_SENDER = 'auto';

let cache = { at: 0, on: true };

/** Whether orders skip the JIS review step. On unless switched off. */
export async function autoDispatchOn(db) {
  if (!db) return false;
  if (Date.now() - cache.at < 30 * 1000) return cache.on;
  try {
    const s = await db.collection('system').doc('settings').get();
    cache = { at: Date.now(), on: !(s.exists && s.data().autoDispatch === false) };
  } catch {
    // Unreadable settings must not hold orders back: keep the last answer.
    cache = { at: Date.now(), on: cache.on };
  }
  return cache.on;
}

/** Test hook. */
export function resetAutoDispatchCache() {
  cache = { at: 0, on: true };
}

export function newTrackingId() {
  return randomBytes(18).toString('base64url');
}

/** The fields SEND writes, for an order of this hotel. */
export function sentFields(order, hotel) {
  const cityId = (hotel && hotel.cityId) || order.cityId || '';
  return {
    dispatchStatus: 'SENT',
    sentAt: FieldValue.serverTimestamp(),
    sentBy: AUTO_SENDER,
    ...(cityId ? { cityId } : {}),
    trackingId: order.trackingId || newTrackingId(),
    updatedAt: FieldValue.serverTimestamp(),
    statusHistory: FieldValue.arrayUnion({
      status: 'SENT',
      timestamp: new Date().toISOString(),
      updatedBy: AUTO_SENDER,
      note: `Sent straight to ${order.hotelName || order.hotelId}`,
    }),
  };
}

const point = (v) => (v && typeof v.lat === 'number' && typeof v.lng === 'number' ? { lat: v.lat, lng: v.lng } : null);
const millis = (v) => {
  if (!v) return null;
  if (typeof v.toMillis === 'function') return v.toMillis();
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};

/**
 * After the orders are SENT: the tracking card and the restaurant's
 * notification. Best effort -- the order itself is already on the
 * restaurant's screen, so a failure here never fails the checkout.
 */
export async function afterSent(db, orderIds) {
  await Promise.all(orderIds.map(async (id) => {
    try {
      const snap = await db.collection('orders').doc(id).get();
      const o = snap.exists ? snap.data() : null;
      if (!o || o.dispatchStatus !== 'SENT' || !o.trackingId) return;
      const h = o.hotelId ? (await db.collection('hotels').doc(o.hotelId).get()).data() : null;
      const times = {};
      const placed = millis(o.createdAt);
      const sent = millis(o.sentAt);
      if (placed) times.placed = placed;
      if (sent) times.sent = sent;
      const amount = Number(o.subtotal ?? o.totalAmount ?? 0);
      await db.collection('tracking').doc(o.trackingId).set({
        orderId: id,
        orderNumber: o.orderNumber || '',
        status: o.orderStatus || 'NEW',
        hotelName: o.hotelName || '',
        hotelLocation: point(h) || point(h && h.location),
        dropLocation: point(o.deliveryLocation),
        riderId: o.riderId || '',
        riderName: o.riderName || '',
        times,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      // create(): a retry finds it already there and does not alert twice.
      await db.collection('notifications').doc(`${id}__ORDER_SENT_TO_HOTEL`).create({
        event: 'ORDER_SENT_TO_HOTEL',
        audience: 'HOTEL',
        orderId: id,
        orderNumber: o.orderNumber || '',
        hotelId: o.hotelId || '',
        hotelName: o.hotelName || '',
        title: 'NEW ORDER',
        message: `Order #${o.orderNumber || id.slice(-6)} · ₹${amount}`,
        amount,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      }).catch((e) => {
        if (!(e?.code === 6 || /ALREADY_EXISTS/i.test(String(e?.message)))) throw e;
      });
    } catch (err) {
      console.error('auto-dispatch: tracking/notification not written for', id, err?.message || err);
    }
  }));
}

