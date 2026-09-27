// Shared by track, rate-order and notify-order so they agree on an order's stage.
//
// Orders carry both a legacy `status` (pending / Preparing / Out For Delivery /
// delivered / cancelled) and the newer dispatch `orderStatus`. Collapse them to
// one stage the client can render.
export function toStage(order) {
  const s = String(order.status || '').toLowerCase();
  const os = String(order.orderStatus || '').toUpperCase();
  if (s === 'cancelled' || os === 'CANCELLED' || os === 'REJECTED') return 'cancelled';
  if (s === 'delivered' || s === 'completed' || os === 'DELIVERED') return 'delivered';
  if (s === 'out for delivery' || os === 'OUT_FOR_DELIVERY' || os === 'PICKED_UP') return 'out_for_delivery';
  if (s === 'preparing' || os === 'ACCEPTED' || os === 'PREPARING' || os === 'READY') return 'preparing';
  return 'placed';
}

export const STAGE_LABEL = {
  placed: 'Order placed',
  preparing: 'Being prepared',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

