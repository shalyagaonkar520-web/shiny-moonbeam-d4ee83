import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { haversineDistance } from './location';

/**
 * Delivery zones.
 *
 * Yellapur is the original zone: a circle round the kitchen, orders go to JIS
 * and the kitchens. LPU (Lovely Professional University) is a rider-direct
 * zone: a rectangle the admin sets in `cities/lpu`, and orders go straight
 * to ID Partner riders with no kitchen step.
 *
 * The database rules enforce the LPU rectangle at order creation, from the
 * same `cities/lpu` document, so this file only decides what the customer is
 * shown; it cannot let an order through that the backend would refuse.
 */

export type ZoneId = 'yellapur' | 'lpu';

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

export interface LpuZone {
  /** Orders are taken only while JIS has the zone switched on. */
  active: boolean;
  name: string;
  bounds: Bounds;
  /** Where riders collect the food. */
  pickup: LatLng & { label: string };
  /** Shown to the customer as "about N minutes"; set by the admin. */
  etaMinutes: number;
}

export const YELLAPUR_ZONE = {
  id: 'yellapur' as const,
  name: 'Yellapur',
  origin: { lat: 14.9643, lng: 74.7121 },
  /** Outer edge of the area served (see locationStore SERVICE_RADIUS_KM). */
  radiusKm: 12,
};

/**
 * Defaults until the admin saves the real zone. Lovely Professional
 * University, Phagwara: the campus and its immediate surroundings.
 */
export const LPU_DEFAULTS: LpuZone = {
  active: false,
  name: 'LPU',
  bounds: { minLat: 31.244, maxLat: 31.264, minLng: 75.692, maxLng: 75.715 },
  pickup: { lat: 31.2554, lng: 75.705, label: 'LPU pickup point' },
  etaMinutes: 10,
};

export const LPU_CITY_ID = 'lpu';

const CACHE_KEY = 'mintoo_lpu_zone';

function readCache(): LpuZone | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as LpuZone) : null;
  } catch {
    return null;
  }
}

function fromDoc(d: any): LpuZone {
  const b = d?.deliveryBounds;
  const okBounds =
    b && [b.minLat, b.maxLat, b.minLng, b.maxLng].every((n) => typeof n === 'number') && b.minLat < b.maxLat && b.minLng < b.maxLng;
  const p = d?.pickupLocation;
  return {
    active: d?.active === true && d?.riderDirect === true,
    name: typeof d?.name === 'string' && d.name ? d.name : LPU_DEFAULTS.name,
    bounds: okBounds ? { minLat: b.minLat, maxLat: b.maxLat, minLng: b.minLng, maxLng: b.maxLng } : LPU_DEFAULTS.bounds,
    pickup:
      p && typeof p.lat === 'number' && typeof p.lng === 'number'
        ? { lat: p.lat, lng: p.lng, label: typeof p.label === 'string' && p.label ? p.label : LPU_DEFAULTS.pickup.label }
        : LPU_DEFAULTS.pickup,
    etaMinutes: typeof d?.etaMinutes === 'number' && d.etaMinutes > 0 && d.etaMinutes < 180 ? d.etaMinutes : LPU_DEFAULTS.etaMinutes,
  };
}

interface ZoneStore {
  lpu: LpuZone;
  loaded: boolean;
  /** One read per app start; the last known zone is cached for offline starts. */
  load: () => Promise<void>;
  setLpu: (z: LpuZone) => void;
}

export const useZoneStore = create<ZoneStore>((set, get) => ({
  lpu: readCache() || LPU_DEFAULTS,
  loaded: false,
  load: async () => {
    if (get().loaded || !firebaseReady) return;
    try {
      const snap = await getDoc(doc(db, 'cities', LPU_CITY_ID));
      const lpu = snap.exists() ? fromDoc(snap.data()) : LPU_DEFAULTS;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(lpu));
      } catch {
        /* storage full or blocked */
      }
      set({ lpu, loaded: true });
    } catch (err) {
      console.warn('Could not load the LPU zone; using the last known one.', err);
      set({ loaded: true });
    }
  },
  setLpu: (lpu) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(lpu));
    } catch {
      /* ignore */
    }
    set({ lpu });
  },
}));

export function inBounds(p: LatLng, b: Bounds): boolean {
  return p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng;
}

export interface Located {
  zoneId: ZoneId | null;
  /** Km from the zone's origin (Yellapur kitchen, or the LPU pickup point). */
  distance: number;
}

/** Which zone serves this point, and how far it is from that zone's origin. */
export function locate(lat: number, lng: number): Located {
  const lpu = useZoneStore.getState().lpu;
  if (lpu.active && inBounds({ lat, lng }, lpu.bounds)) {
    const d = haversineDistance(lpu.pickup.lat, lpu.pickup.lng, lat, lng);
    return { zoneId: 'lpu', distance: parseFloat(d.toFixed(2)) };
  }
  const d = haversineDistance(YELLAPUR_ZONE.origin.lat, YELLAPUR_ZONE.origin.lng, lat, lng);
  return { zoneId: d <= YELLAPUR_ZONE.radiusKm ? 'yellapur' : null, distance: parseFloat(d.toFixed(2)) };
}

/**
 * Is this saved delivery location one we serve? LPU is re-checked against the
 * current rectangle; a location saved before zones existed is judged by its
 * distance from the Yellapur kitchen, as it always was.
 */
export function inServiceArea(loc: { lat?: number; lng?: number; distance: number; zoneId?: ZoneId | null } | null | undefined): boolean {
  if (!loc) return false;
  if (loc.zoneId === 'lpu') {
    const lpu = useZoneStore.getState().lpu;
    if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
    return lpu.active && inBounds({ lat: loc.lat, lng: loc.lng }, lpu.bounds);
  }
  return loc.distance <= YELLAPUR_ZONE.radiusKm;
}

/** Customer-facing list of where Minto delivers. */
export function servedAreasText(): string {
  return useZoneStore.getState().lpu.active ? `${YELLAPUR_ZONE.name} and ${useZoneStore.getState().lpu.name}` : YELLAPUR_ZONE.name;
}

/** 24 URL-safe random characters: the public key of tracking/{trackingId}. */
export function newTrackingId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Fields that make an order rider-direct (LPU): no kitchen step, an open
 * offer to ID Partner riders, and a tracking id for the customer's live map.
 * The Firestore rules accept these only inside the LPU rectangle.
 */
export function riderDirectFields(loc: { zoneId?: ZoneId | null } | null | undefined) {
  if (loc?.zoneId !== 'lpu') return null;
  return {
    dispatchStatus: 'RIDER_DIRECT' as const,
    riderOffer: 'OPEN' as const,
    riderId: '',
    riderName: '',
    cityId: LPU_CITY_ID,
    trackingId: newTrackingId(),
    etaMinutes: useZoneStore.getState().lpu.etaMinutes,
  };
}
