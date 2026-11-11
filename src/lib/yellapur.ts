import type { DeliveryLocation } from '../store/locationStore';

/**
 * Within this many km of the kitchen counts as Yellapur town, whatever the
 * address text says. Men's wear promises 10-minute delivery, which only holds
 * in town, not across the whole food delivery radius.
 */
export const YELLAPUR_TOWN_KM = 5;

/** Is this delivery address in Yellapur? */
export function isInYellapur(loc: DeliveryLocation | null | undefined): boolean {
  if (!loc) return false;
  return /yellapur/i.test(loc.address || '') || (typeof loc.distance === 'number' && loc.distance <= YELLAPUR_TOWN_KM);
}
