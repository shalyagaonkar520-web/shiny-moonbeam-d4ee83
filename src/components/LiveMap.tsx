import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Pt {
  lat: number;
  lng: number;
}

interface Props {
  pickup?: Pt | null;
  drop?: Pt | null;
  rider?: Pt | null;
  /** [lat, lng] road points to draw. */
  route?: [number, number][] | null;
  className?: string;
}

const pin = (bg: string, emoji: string, size = 34) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.5)}px">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const ICONS = {
  pickup: pin('#111827', '🏪'),
  drop: pin('#e11d48', '🏠'),
  rider: pin('#ff4d6d', '🛵', 42),
};

/**
 * Live delivery map (Leaflet + OpenStreetMap, as elsewhere in the app).
 *
 * The rider marker glides from its last position to each new GPS fix over a
 * couple of seconds instead of jumping, and the view follows the rider and
 * the drop point until the user moves the map themselves.
 */
export default function LiveMap({ pickup, drop, rider, route, className = '' }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<{ pickup?: L.Marker; drop?: L.Marker; rider?: L.Marker; line?: L.Polyline }>({});
  const anim = useRef<number | null>(null);
  const userMoved = useRef(false);

  useEffect(() => {
    if (!box.current || map.current) return;
    const center = rider || drop || pickup || { lat: 31.2554, lng: 75.705 };
    const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(m);
    m.on('dragstart', () => {
      userMoved.current = true;
    });
    map.current = m;
    return () => {
      if (anim.current) cancelAnimationFrame(anim.current);
      try {
        m.stop(); // a pan/zoom still animating would touch removed panes
      } catch {
        /* already stopped */
      }
      m.remove();
      map.current = null;
      markers.current = {};
    };
  }, []);

  const place = (key: 'pickup' | 'drop', p?: Pt | null) => {
    const m = map.current;
    if (!m) return;
    const cur = markers.current[key];
    if (!p) {
      if (cur) m.removeLayer(cur);
      markers.current[key] = undefined;
      return;
    }
    if (cur) cur.setLatLng([p.lat, p.lng]);
    else markers.current[key] = L.marker([p.lat, p.lng], { icon: ICONS[key] }).addTo(m);
  };

  useEffect(() => place('pickup', pickup), [pickup?.lat, pickup?.lng]);
  useEffect(() => place('drop', drop), [drop?.lat, drop?.lng]);

  // The rider glides to each new fix.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!rider) {
      if (markers.current.rider) m.removeLayer(markers.current.rider);
      markers.current.rider = undefined;
      return;
    }
    const mk = markers.current.rider;
    if (!mk) {
      markers.current.rider = L.marker([rider.lat, rider.lng], { icon: ICONS.rider, zIndexOffset: 1000 }).addTo(m);
      return;
    }
    const from = mk.getLatLng();
    const to = L.latLng(rider.lat, rider.lng);
    if (from.distanceTo(to) > 2000) {
      mk.setLatLng(to); // a jump this big is a new fix after a gap, not motion
      return;
    }
    if (anim.current) cancelAnimationFrame(anim.current);
    const start = performance.now();
    const DURATION = 2500;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / DURATION);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      mk.setLatLng([from.lat + (to.lat - from.lat) * e, from.lng + (to.lng - from.lng) * e]);
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [rider?.lat, rider?.lng]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (markers.current.line) m.removeLayer(markers.current.line);
    markers.current.line = route && route.length > 1
      ? L.polyline(route, { color: '#e11d48', weight: 5, opacity: 0.75 }).addTo(m)
      : undefined;
  }, [route]);

  // Keep the important points in view unless the user has taken over.
  useEffect(() => {
    const m = map.current;
    if (!m || userMoved.current) return;
    const pts = [rider, drop, rider ? null : pickup].filter(Boolean) as Pt[];
    // Starting a new view while an earlier zoom is still animating is what
    // makes Leaflet throw "_leaflet_pos" (and leave the map half-drawn), so
    // stop it first and never let a re-centre take the page down.
    try {
      m.stop();
      if (pts.length === 1) m.setView([pts[0].lat, pts[0].lng], 16, { animate: false });
      else if (pts.length > 1) m.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), { padding: [50, 50], maxZoom: 17, animate: false });
    } catch {
      /* map not ready yet; the next update re-centres */
    }
  }, [rider?.lat, rider?.lng, drop?.lat, drop?.lng, pickup?.lat, pickup?.lng]);

  return <div ref={box} className={`w-full ${className}`} style={{ zIndex: 0 }} />;
}
