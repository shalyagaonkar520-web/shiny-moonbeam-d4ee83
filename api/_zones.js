// Delivery zones on the server, mirroring src/lib/zones.ts.
//
// LPU is a rider-direct zone: its rectangle, pickup point and on/off switch
// live in cities/lpu, the same document the Firestore rules check when a
// browser writes an order. Orders inside it skip the kitchen and go straight
// to ID Partner riders.

import { randomBytes } from 'node:crypto';

export const LPU_CITY_ID = 'lpu';
export const LPU_DEFAULT_PICKUP = { lat: 31.2554, lng: 75.705 };

/** The LPU zone if it is switched on, else null. */
export async function activeLpuZone(adminDb) {
  try {
    const snap = await adminDb.collection('cities').doc(LPU_CITY_ID).get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    const b = d.deliveryBounds;
    if (d.active !== true || d.riderDirect !== true || !b) return null;
    if (![b.minLat, b.maxLat, b.minLng, b.maxLng].every((n) => typeof n === 'number')) return null;
    const p = d.pickupLocation;
    return {
      bounds: b,
      pickup: p && typeof p.lat === 'number' && typeof p.lng === 'number' ? { lat: p.lat, lng: p.lng } : LPU_DEFAULT_PICKUP,
    };
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
