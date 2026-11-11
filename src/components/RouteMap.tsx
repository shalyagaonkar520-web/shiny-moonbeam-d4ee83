import { useEffect, useRef, useState } from 'react';
import LiveMap from './LiveMap';
import { fetchRoute, routeAhead, type RouteInfo } from '../lib/route';
import { haversineDistance } from '../lib/location';

interface Pt {
  lat: number;
  lng: number;
}

/**
 * The rider's position joined to the customer by the road route, with the
 * distance and time left. Re-routes when the rider has moved 150 m or every
 * 45 s, so a moving rider does not hammer the routing service.
 */
export default function RouteMap({ from, to, className = '' }: { from: Pt | null; to: Pt | null; className?: string }) {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const last = useRef<(Pt & { at: number }) | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    const prev = last.current;
    const moved = prev ? haversineDistance(prev.lat, prev.lng, from.lat, from.lng) * 1000 : Infinity;
    if (prev && moved < 150 && Date.now() - prev.at < 45_000) return;
    last.current = { ...from, at: Date.now() };
    const ac = new AbortController();
    fetchRoute(from, to, ac.signal).then(setRoute);
    return () => ac.abort();
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  return (
    <div className="relative">
      <LiveMap rider={from} drop={to} route={from ? routeAhead(route?.coords, from, to) : null} className={className} />
      {from && route && (
        <span className="absolute top-2 right-2 z-[500] bg-white/95 rounded-full px-3 py-1 text-xs font-black text-gray-900 shadow">
          {route.distanceKm < 1 ? `${Math.round(route.distanceKm * 1000)} m` : `${route.distanceKm.toFixed(1)} km`} · {route.durationMin} min
        </span>
      )}
      {!from && (
        <span className="absolute top-2 right-2 z-[500] bg-white/95 rounded-full px-3 py-1 text-[11px] font-bold text-gray-600 shadow">
          Waiting for your location…
        </span>
      )}
    </div>
  );
}
