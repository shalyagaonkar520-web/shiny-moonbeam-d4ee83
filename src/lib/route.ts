import { haversineDistance } from './location';

export interface LatLngLite {
  lat: number;
  lng: number;
}

export interface RouteInfo {
  /** [lat, lng] points along the road. */
  coords: [number, number][];
  distanceKm: number;
  durationMin: number;
  /** false when this is a straight-line estimate (routing service unreachable). */
  onRoad: boolean;
}

/** A two-wheeler in campus/town traffic. */
const FALLBACK_SPEED_KMH = 18;

/** Straight-line estimate, padded for real roads. */
export function estimateRoute(from: LatLngLite, to: LatLngLite): RouteInfo {
  const km = haversineDistance(from.lat, from.lng, to.lat, to.lng) * 1.3;
  return {
    coords: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distanceKm: Math.round(km * 100) / 100,
    durationMin: Math.max(1, Math.round((km / FALLBACK_SPEED_KMH) * 60)),
    onRoad: false,
  };
}

/**
 * Road route between two points from the public OSRM router (no API key).
 * Falls back to the straight-line estimate if it is slow or unreachable, so
 * the map and ETA keep working offline or when the service is busy.
 */
export async function fetchRoute(from: LatLngLite, to: LatLngLite, signal?: AbortSignal): Promise<RouteInfo> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const timeout = new AbortController();
    const t = window.setTimeout(() => timeout.abort(), 6000);
    signal?.addEventListener('abort', () => timeout.abort());
    const res = await fetch(url, { signal: timeout.signal });
    window.clearTimeout(t);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const r = data?.routes?.[0];
    if (!r?.geometry?.coordinates?.length) throw new Error('no route');
    const km = r.distance / 1000;
    return {
      coords: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
      distanceKm: Math.round(km * 100) / 100,
      // OSRM's car profile is optimistic for a bike in traffic; never quicker
      // than the bike estimate for the same distance.
      durationMin: Math.max(1, Math.round(Math.max(r.duration / 60, (km / FALLBACK_SPEED_KMH) * 60))),
      onRoad: true,
    };
  } catch {
    return estimateRoute(from, to);
  }
}

/**
 * The part of a route still ahead of the rider: from their current position,
 * joined to the nearest point on the road, on to the customer. Keeps the line
 * starting at the bike even between re-routes.
 */
export function routeAhead(
  coords: [number, number][] | null | undefined,
  at: LatLngLite | null | undefined,
  to?: LatLngLite | null
): [number, number][] | null {
  if (!coords || coords.length < 2) return coords || null;
  // The road route stops at the nearest road; finish the line at the door.
  if (to) coords = [...coords, [to.lat, to.lng]];
  if (!at) return coords;
  let best = 0;
  let bestD = Infinity;
  coords.forEach(([la, ln], i) => {
    const d = (la - at.lat) ** 2 + (ln - at.lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return [[at.lat, at.lng], ...coords.slice(Math.min(best + 1, coords.length - 1))];
}
