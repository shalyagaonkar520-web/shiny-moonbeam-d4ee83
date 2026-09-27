// The one place the admin panel and the rider dashboard change an order's status.
//
// Orders carry a legacy `status` (read by TrackingPage, OrdersPage, the admin
// filters and api/_orderStage.js) and the dispatch `orderStatus` (read by the
// kitchen panel). Writing them separately let the two drift -- the admin
// "Delivered" button wrote 'Delivered' while every reader checked 'delivered',
// and orderStatus stayed 'NEW' forever. Both are written together here.
import { doc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyOrderStatus } from './push';
import { toStage, type Stage } from './orderStage';

/** A stage, plus 'confirmed': the admin has seen the order but the kitchen has not started. */
export type OrderStageAction = Stage | 'confirmed';

/** Rider commission per delivered order, credited by /api/notify-order (shown to the rider). */
export const RIDER_COMMISSION = 40;

const LEGACY_STATUS: Record<OrderStageAction, string> = {
  placed: 'pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out For Delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const ORDER_STATUS: Record<OrderStageAction, string> = {
  placed: 'NEW',
  confirmed: 'NEW',
  preparing: 'ACCEPTED',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
};

function stageFields(stage: OrderStageAction): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    status: LEGACY_STATUS[stage],
    orderStatus: ORDER_STATUS[stage],
  };
  // Timestamps the customer's tracking screen uses for its arrival time.
  const now = new Date().toISOString();
  if (stage === 'out_for_delivery') fields.outForDeliveryAt = now;
  if (stage === 'delivered') fields.deliveredAt = now;
  return fields;
}

/**
 * Move an order to `stage`. `extra` carries fields that change with it
 * (riderStatus, trackingLink). Throws if the write fails.
 *
 * Moving to 'delivered' runs in a transaction that reads the order first, so a
 * double tap or a second device does not overwrite the original deliveredAt.
 * Returns true when this call is the one that delivered the order.
 *
 * The rider's commission is NOT written here: a browser that can add to
 * earnings can add any amount. /api/notify-order (called below) credits it on
 * the server, once per order.
 */
export async function setOrderStage(
  orderId: string,
  stage: OrderStageAction,
  extra: Record<string, unknown> = {},
): Promise<boolean> {
  const orderRef = doc(db, 'orders', orderId);
  let credited = false;

  if (stage === 'delivered') {
    await runTransaction(db, async (tx) => {
      credited = false;
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw new Error('Order not found');
      const order = snap.data();
      const riderId = typeof order.riderId === 'string' ? order.riderId : '';
      const alreadyDelivered = toStage(order) === 'delivered';
      const update: Record<string, unknown> = { ...extra };
      if (!alreadyDelivered) {
        Object.assign(update, stageFields('delivered'));
      } else {
        // Normalise old 'Delivered' docs but keep their original deliveredAt.
        update.status = LEGACY_STATUS.delivered;
        update.orderStatus = ORDER_STATUS.delivered;
      }
      credited = !!riderId && !alreadyDelivered;
      tx.update(orderRef, update);
    });
  } else {
    await updateDoc(orderRef, { ...stageFields(stage), ...extra });
  }

  notifyOrderStatus(orderId);
  return credited;
}
