// What the Super Admin manages, read by checkout on the server.
//
// Everything here comes from Firestore collections the panel writes:
// menuItems, hotels, cities, serviceAreas, coupons, couponRedemptions,
// system/business. pricing takes a "source" so the same rules run against
// the real database or against fixtures in tests; with no database every
// getter returns nothing and checkout behaves exactly as it did before.

import { adminDb } from './_firebaseAdmin.js';

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/** A source with nothing in it: the old, catalogue-only behaviour. */
export const emptySource = {
  menuItems: async () => ({}),
  hotels: async () => ({}),
  cities: async () => ({}),
  areas: async () => [],
  business: async () => ({}),
  coupon: async () => null,
  customerHistory: async () => ({ priorOrders: 0, redemptions: 0 }),
};

/** Reads from Firestore with the Admin SDK. */
export function dbSource(db = adminDb) {
  if (!db) return emptySource;
  const getMany = async (col, ids) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return {};
    const snaps = await db.getAll(...unique.map((id) => db.collection(col).doc(id)));
    const out = {};
    snaps.forEach((s) => { if (s.exists) out[s.id] = s.data(); });
    return out;
  };
  let businessCache = { at: 0, data: {} };
  return {
    menuItems: (ids) => getMany('menuItems', ids),
    hotels: (ids) => getMany('hotels', ids),
    cities: (ids) => getMany('cities', ids),
    async areas(cityIds) {
      const ids = [...new Set(cityIds.filter(Boolean))];
      if (!ids.length) return [];
      const parts = await Promise.all(chunk(ids, 30).map((c) => db.collection('serviceAreas').where('cityId', 'in', c).get()));
      return parts.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    async business() {
      if (Date.now() - businessCache.at < 60 * 1000) return businessCache.data;
      const s = await db.collection('system').doc('business').get();
      businessCache = { at: Date.now(), data: s.exists ? s.data() : {} };
      return businessCache.data;
    },
    async coupon(code) {
      if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return null;
      const s = await db.collection('coupons').doc(code).get();
      return s.exists ? s.data() : null;
    },
    async customerHistory({ phone, userId }, code) {
      const [orders, redeemed] = await Promise.all([
        phone ? db.collection('orders').where('userPhone', '==', phone).limit(5).get() : null,
        code && (userId || phone)
          ? db.collection('couponRedemptions').where('code', '==', code).where(userId ? 'userId' : 'phone', '==', userId || phone).get()
          : null,
      ]);
      const priorOrders = orders ? orders.docs.filter((d) => !['CANCELLED', 'AWAITING_PAYMENT'].includes(d.data().orderStatus)).length : 0;
      return { priorOrders, redemptions: redeemed ? redeemed.size : 0 };
    },
  };
}

// ── Rules shared by pricing and place-order ────────────────────────────

function istParts(now) {
  const parts = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return { day: get('weekday').toLowerCase().slice(0, 3), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Inside an open–close window (close before open = past midnight). Unset = open. */
export function withinWindow(open, close, minutes) {
  const a = toMinutes(open);
  const b = toMinutes(close);
  if (a === null || b === null || a === b) return true;
  return a < b ? minutes >= a && minutes < b : minutes >= a || minutes < b;
}

/**
 * Why a restaurant cannot take an order right now, or null if it can.
 * Mirrors what the panel shows: inactive, not taking orders, paused, outside
 * its hours, or its city is switched off.
 */
export function closedReason(hotel, city, now = new Date()) {
  if (!hotel) return 'not_found';
  if (hotel.status === 'INACTIVE') return 'inactive';
  if (hotel.acceptingOrders !== true) return 'not_accepting';
  if (hotel.pausedUntil && new Date(hotel.pausedUntil).getTime() > now.getTime()) return 'paused';
  if (city && city.active === false) return 'city_inactive';
  const { day, minutes } = istParts(now);
  const today = hotel.hours && hotel.hours[day];
  if (today) {
    if (today.closed) return 'closed_today';
    if (!withinWindow(today.open, today.close, minutes)) return 'outside_hours';
  }
  return null;
}

export function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.lng > p.lng !== b.lng > p.lng && p.lat < ((b.lat - a.lat) * (p.lng - a.lng)) / (b.lng - a.lng) + a.lat) inside = !inside;
  }
  return inside;
}

/** The service area an address falls in, from a set the restaurant serves. */
export function matchArea(areas, location, address, haversineKm) {
  const pin = (String(address || '').match(/\b\d{6}\b/) || [])[0] || null;
  return areas.find((a) => {
    if (a.active === false) return false;
    if (a.type === 'pincode') return !!pin && (a.pincodes || []).includes(pin);
    if (a.type === 'radius') return !!a.center && haversineKm(a.center.lat, a.center.lng, location.lat, location.lng) <= Number(a.radiusKm || 0);
    if (a.type === 'polygon') return (a.polygon || []).length >= 3 && pointInPolygon(location, a.polygon);
    return false;
  }) || null;
}
