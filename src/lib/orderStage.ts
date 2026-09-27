// One stage per order, shared by the Track list and the live tracking page.
// Mirrors api/_orderStage.js so the app and the backend always agree.

export type Stage = 'placed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export function toStage(order: { status?: string; orderStatus?: string } | null | undefined): Stage {
  const s = String(order?.status || '').toLowerCase();
  const os = String(order?.orderStatus || '').toUpperCase();
  if (s === 'cancelled' || os === 'CANCELLED' || os === 'REJECTED') return 'cancelled';
  if (s === 'delivered' || s === 'completed' || os === 'DELIVERED') return 'delivered';
  if (s === 'out for delivery' || os === 'OUT_FOR_DELIVERY' || os === 'PICKED_UP') return 'out_for_delivery';
  if (s === 'preparing' || os === 'ACCEPTED' || os === 'PREPARING' || os === 'READY') return 'preparing';
  return 'placed';
}

export const STAGE_STEPS: Array<{ key: Exclude<Stage, 'cancelled'>; label: string }> = [
  { key: 'placed', label: 'Placed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'out_for_delivery', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
];

export const STAGE_TITLE: Record<Stage, string> = {
  placed: 'Order placed',
  preparing: 'Your food is being prepared',
  out_for_delivery: 'Your order is on the way',
  delivered: 'Order delivered',
  cancelled: 'Order cancelled',
};
