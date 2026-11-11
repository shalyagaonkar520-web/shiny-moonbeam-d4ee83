// ID Partner rider-direct delivery on the server, mirroring src/lib/zones.ts.
//
// While JIS has it switched on (cities/yellapur: riderDirect, deliveryBounds),
// an order inside the rectangle skips the kitchen dispatch and goes straight
// to ID Partner riders. The Firestore rules check the same document when a
// browser writes an order.

import { randomBytes } from 'node:crypto';

export const DIRECT_CITY_ID = 'yellapur';

/** The rider-delivery rectangle if rider-direct delivery is on, else null. */
export async function activeRiderZone(adminDb) {
  try {
    const snap = await adminDb.collection('cities').doc(DIRECT_CITY_ID).get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    const b = d.deliveryBounds;
    if (d.active === false || d.riderDirect !== true || !b) return null;
    if (![b.minLat, b.maxLat, b.minLng, b.maxLng].every((n) => typeof n === 'number')) return null;
    return { bounds: b, etaMinutes: typeof d.etaMinutes === 'number' ? d.etaMinutes : null };
  } catch {
    return null;
  }
}

export function inBounds(lat, lng, b) {
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

/** 24 URL-safe random characters, the public key of tracking/{trackingId}. */
export function newTrackingId() {
  return randomBytes(18).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}
