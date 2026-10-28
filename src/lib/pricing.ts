// Pricing rules shown at checkout. api/_pricing.js applies the same rules on
// the server with menu prices; keep the two in step.

export interface CouponRule {
  code: string;
  type: 'free_delivery' | 'fixed_discount' | 'percent_discount';
  value: number;
  minOrderValue: number;
  isActive: boolean;
}

/**
 * Discount a coupon gives on this subtotal, or 0. Checked on every render, not
 * only when the code is applied: lowering quantities below the minimum, or the
 * admin switching the coupon off, removes the discount. Never more than the food.
 */
export function couponDiscountFor(coupon: CouponRule | null | undefined, subtotal: number): number {
  if (!coupon || !coupon.isActive || subtotal < Number(coupon.minOrderValue || 0)) return 0;
  if (coupon.type === 'fixed_discount') return Math.min(Number(coupon.value) || 0, subtotal);
  if (coupon.type === 'percent_discount') {
    return Math.min(Math.round((subtotal * (Number(coupon.value) || 0)) / 100), subtotal);
  }
  return 0;
}

export function couponGivesFreeDelivery(coupon: CouponRule | null | undefined, subtotal: number): boolean {
  return !!coupon && coupon.isActive && coupon.type === 'free_delivery' && subtotal >= Number(coupon.minOrderValue || 0);
}

/** A 10-digit Indian mobile number from whatever the customer typed, or null. */
export function normaliseIndianMobile(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
