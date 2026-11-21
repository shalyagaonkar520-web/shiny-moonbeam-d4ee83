// Server copy of src/lib/freeDeliveryDays.ts: delivery is free every Saturday
// and Sunday, India time. tests/freeDelivery.test.mjs checks both agree.

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKEND_FREE_DELIVERY_REASON = 'Weekend Free Delivery';

export function isWeekendFreeDelivery(now = new Date()) {
  const d = (Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) + 4) % 7; // 0 = Sunday
  return d === 6 || d === 0;
}
