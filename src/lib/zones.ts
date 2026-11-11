import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { haversineDistance } from './location';

/**
 * Yellapur delivery, and ID Partner "rider-direct" delivery.
 *
 * The service area is unchanged: a circle round the kitchen. What the admin
 * can switch on (at /admin/rider-delivery, stored on `cities/yellapur`) is
 * rider-direct delivery: while it is on, an order placed inside the delivery
 * rectangle goes straight to ID Partner riders (alarm, accept, pickup at the
 * restaurant, live tracking, cash) instead of waiting for JIS to send it to
 * the kitchen. While it is off, orders go to JIS exactly as before.
 *
 * The database rules check the same `cities/yellapur` fields when the order
 * is written, so this file only decides what the customer's phone does; it
 * cannot get an order past the backend.
 */

export type ZoneId = 'yellapur';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const YELLAPUR_ZONE = {
  id: 'yellapur' as const,
  name: 'Yellapur',
  origin: { lat: 14.9643, lng: 74.7121 },
  /** Outer edge of the area served (see locationStore SERVICE_RADIUS_KM). */
  radiusKm: 12,
};

/** The city document the rules read for rider-direct orders. */
export const DIRECT_CITY_ID = 'yellapur';

export interface RiderZone {
  /** Rider-direct delivery switched on by the admin. */
  active: boolean;
  /** Orders outside this rectangle keep the normal JIS flow (and the rules refuse them as rider-direct). */
  bounds: Bounds;
  /** "About N minutes", set by the admin; shown as approximate. */
  etaMinutes: number;
}

/** The 12 km service circle, as a rectangle. */
export const RIDER_ZONE_DEFAULTS: RiderZone = {
  active: false,
  bounds: { minLat: 14.856, maxLat: 15.073, minLng: 74.6, maxLng: 74.824 },
  etaMinutes: 15,
};

const CACHE_KEY = 'mintoo_rider_zone';

function readCache(): RiderZone | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as RiderZone) : null;
  } catch {
    return null;
  }
}

export function validBounds(b: any): b is Bounds {
  return !!b && [b.minLat, b.maxLat, b.minLng, b.maxLng].every((n) => typeof n === 'number' && isFinite(n)) && b.minLat < b.maxLat && b.minLng < b.maxLng;
}

export function riderZoneFromDoc(d: any): RiderZone {
  const bounds = validBounds(d?.deliveryBounds) ? d.deliveryBounds : RIDER_ZONE_DEFAULTS.bounds;
  return {
    active: d?.riderDirect === true && d?.active !== false && validBounds(d?.deliveryBounds),
    bounds: { minLat: bounds.minLat, maxLat: bounds.maxLat, minLng: bounds.minLng, maxLng: bounds.maxLng },
    etaMinutes: typeof d?.etaMinutes === 'number' && d.etaMinutes > 0 && d.etaMinutes < 180 ? d.etaMinutes : RIDER_ZONE_DEFAULTS.etaMinutes,
  };
}

interface ZoneStore {
  rider: RiderZone;
  loaded: boolean;
  /** One read per app start; the last known setting is cached for offline starts. */
  load: () => Promise<void>;
  setRider: (z: RiderZone) => void;
}

export const useZoneStore = create<ZoneStore>((set, get) => ({
  rider: readCache() || RIDER_ZONE_DEFAULTS,
  loaded: false,
  load: async () => {
    if (get().loaded || !firebaseReady) return;
    try {
      const snap = await getDoc(doc(db, 'cities', DIRECT_CITY_ID));
      get().setRider(riderZoneFromDoc(snap.data()));
      set({ loaded: true });
    } catch (err) {
      console.warn('Could not load the rider-delivery setting; using the last known one.', err);
      set({ loaded: true });
    }
  },
  setRider: (rider) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(rider));
    } catch {
      /* storage full or blocked */
    }
    set({ rider });
  },
}));

export function inBounds(p: LatLng, b: Bounds): boolean {
  return p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng;
}

export interface Located {
  zoneId: ZoneId | null;
  /** Km from the Yellapur kitchen. */
  distance: number;
}

/** Is this point in Yellapur's service area, and how far from the kitchen? */
export function locate(lat: number, lng: number): Located {
  const d = haversineDistance(YELLAPUR_ZONE.origin.lat, YELLAPUR_ZONE.origin.lng, lat, lng);
  return { zoneId: d <= YELLAPUR_ZONE.radiusKm ? 'yellapur' : null, distance: parseFloat(d.toFixed(2)) };
}

/** Is this saved delivery location one we serve? Judged by distance, as always. */
export function inServiceArea(loc: { distance: number } | null | undefined): boolean {
  return !!loc && loc.distance <= YELLAPUR_ZONE.radiusKm;
}

/** Customer-facing name of where Minto delivers. */
export function servedAreasText(): string {
  return YELLAPUR_ZONE.name;
}

/** 24 URL-safe random characters: the public key of tracking/{trackingId}. */
export function newTrackingId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Fields that make an order rider-direct: an open offer to ID Partner riders
 * and a tracking id for the customer's live map. Null (normal JIS flow) when
 * rider delivery is off or the drop point is outside the rectangle.
 */
export function riderDirectFields(loc: { lat?: number; lng?: number; distance: number } | null | undefined) {
  const z = useZoneStore.getState().rider;
  if (!z.active || !loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
  if (!inServiceArea(loc) || !inBounds({ lat: loc.lat, lng: loc.lng }, z.bounds)) return null;
  return {
    dispatchStatus: 'RIDER_DIRECT' as const,
    riderOffer: 'OPEN' as const,
    riderId: '',
    riderName: '',
    cityId: DIRECT_CITY_ID,
    trackingId: newTrackingId(),
    etaMinutes: z.etaMinutes,
  };
}
