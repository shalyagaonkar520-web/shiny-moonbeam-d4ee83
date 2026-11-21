// Delivery is free every Saturday and Sunday (India time), on top of any
// coupon. The day is worked out in IST explicitly, not from the phone's time
// zone. The server applies the same rule (api/_freeDeliveryDays.js), so a wrong
// phone clock cannot change what an order costs.

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKEND_FREE_DELIVERY_REASON = 'Weekend Free Delivery';

/** 0 = Sunday ... 6 = Saturday, in IST. */
function istWeekday(now: Date): number {
  // 1 Jan 1970 (day 0 of the epoch) was a Thursday (4).
  return (Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) + 4) % 7;
}

export function isWeekendFreeDelivery(now: Date = new Date()): boolean {
  const d = istWeekday(now);
  return d === 6 || d === 0;
}
