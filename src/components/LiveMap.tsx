import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Smoother, angleDelta } from '../lib/smoothMove';
import { routeAhead } from '../lib/route';

interface Pt {
  lat: number;
  lng: number;
}

interface Props {
  pickup?: Pt | null;
  drop?: Pt | null;
  rider?: Pt | null;
  /** The whole road route, [lat, lng] points. The part already travelled is trimmed off as the bike moves. */
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
};

/**
 * The rider: a pink puck with a bike and a small arrow that turns to face the
 * direction of travel (the bike itself stays upright).
 */
const riderIcon = () =>
  L.divIcon({
    className: '',
    html:
      `<div class="mm-rider" style="width:58px;height:58px;position:relative">` +
      `<div class="mm-cone" style="position:absolute;left:50%;top:0;width:0;height:0;margin-left:-8px;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:15px solid #e11d48;opacity:0"></div>` +
      `<div style="position:absolute;left:8px;top:8px;width:42px;height:42px;border-radius:50%;background:#ff4d6d;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">` +
      `<span class="mm-bike" style="font-size:20px;line-height:1;display:block">🛵</span></div></div>`,
    iconSize: [58, 58],
    iconAnchor: [29, 29],
  });

/** Distance between two points in metres (small distances). */
const metres = (a: Pt, b: Pt) => {
  const dLat = (b.lat - a.lat) * 111320;
  const dLng = (b.lng - a.lng) * 111320 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};

/**
 * Live delivery map (Leaflet + OpenStreetMap).
 *
 * The rider moves like a vehicle: it glides along continuously between GPS
 * fixes (see lib/smoothMove), turns to face where it is going, and leaves the
 * road behind it trimmed off. The camera frames the trip once and then only
 * nudges the view when the bike nears the edge, so the map does not jump; a
 * drag stops the following until "Recentre" is tapped.
 */
export default function LiveMap({ pickup, drop, rider, route, className = '' }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<{ pickup?: L.Marker; drop?: L.Marker; rider?: L.Marker; line?: L.Polyline }>({});
  const smoother = useRef(new Smoother());
  const raf = useRef<number | null>(null);
  const userMoved = useRef(false);
  const tail = useRef<[number, number][]>([]); // road still ahead of the bike
  const heading = useRef<number | null>(null); // heading as drawn (smoothed)
  const lastLine = useRef(0);
  const frame = useRef<{ key: string; dist: number } | null>(null);
  const recentreBtn = useRef<HTMLButtonElement>(null);

  // ── Map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!box.current || map.current) return;
    const center = rider || drop || pickup || { lat: 14.9643, lng: 74.7121 };
    const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(m);
    m.on('dragstart', () => {
      userMoved.current = true;
      if (recentreBtn.current) recentreBtn.current.style.display = 'block';
    });
    map.current = m;
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      try {
        m.stop(); // a pan/zoom still animating would touch removed panes
      } catch {
        /* already stopped */
      }
      m.remove();
      map.current = null;
      markers.current = {};
      smoother.current.reset();
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

  // ── Camera ─────────────────────────────────────────────────────────
  /** Fit the trip in view (rider + destination, or whatever is known). */
  const frameTrip = (force = false) => {
    const m = map.current;
    if (!m || (userMoved.current && !force)) return;
    const pts = [rider, drop, rider ? null : pickup].filter(Boolean) as Pt[];
    if (!pts.length) return;
    try {
      m.stop();
      if (pts.length === 1) m.setView([pts[0].lat, pts[0].lng], 16, { animate: false });
      else m.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), { padding: [50, 50], maxZoom: 17, animate: false });
      frame.current = { key: frame.current?.key || '', dist: rider && drop ? metres(rider, drop) : 0 };
    } catch {
      /* map not ready yet; the next update frames it */
    }
  };

  /** Nudge the view just enough to keep the bike inside an inner margin. */
  const follow = (p: Pt) => {
    const m = map.current;
    if (!m || userMoved.current) return;
    try {
      const size = m.getSize();
      const pt = m.latLngToContainerPoint([p.lat, p.lng]);
      const pad = Math.min(70, size.x * 0.22, size.y * 0.22);
      let dx = 0;
      let dy = 0;
      if (pt.x < pad) dx = pt.x - pad;
      else if (pt.x > size.x - pad) dx = pt.x - (size.x - pad);
      if (pt.y < pad) dy = pt.y - pad;
      else if (pt.y > size.y - pad) dy = pt.y - (size.y - pad);
      if (dx || dy) m.panBy([dx, dy], { animate: false });
    } catch {
      /* ignore: next frame retries */
    }
  };

  // Frame the trip when the destination (or first known point) changes.
  useEffect(() => {
    const key = `${drop?.lat},${drop?.lng}|${pickup?.lat},${pickup?.lng}|${rider ? 'r' : 'n'}`;
    if (frame.current?.key === key) return;
    frame.current = { key, dist: 0 };
    frameTrip();
    frame.current.key = key;
  }, [drop?.lat, drop?.lng, pickup?.lat, pickup?.lng, !!rider]);

  // ── The bike ───────────────────────────────────────────────────────
  const draw = (now: number) => {
    raf.current = null;
    const m = map.current;
    const mk = markers.current.rider;
    const p = smoother.current.at(now);
    if (!m || !mk || !p) return;
    mk.setLatLng([p.lat, p.lng]);

    // Face the direction of travel, turning the short way, a little each frame.
    const target = smoother.current.heading();
    const el = mk.getElement();
    if (el) {
      el.setAttribute('data-lat', p.lat.toFixed(6));
      el.setAttribute('data-lng', p.lng.toFixed(6));
      if (target !== null) {
        heading.current = heading.current === null ? target : (heading.current + angleDelta(heading.current, target) * 0.18 + 360) % 360;
        const rot = el.querySelector('.mm-rider') as HTMLElement | null;
        const bike = el.querySelector('.mm-bike') as HTMLElement | null;
        const cone = el.querySelector('.mm-cone') as HTMLElement | null;
        if (rot) rot.style.transform = `rotate(${heading.current.toFixed(1)}deg)`;
        if (bike) bike.style.transform = `rotate(${(-heading.current).toFixed(1)}deg)`;
        if (cone) cone.style.opacity = '0.95';
      }
    }

    // The road behind the bike disappears: the line starts at the bike.
    const line = markers.current.line;
    if (line && now - lastLine.current > 50) {
      lastLine.current = now;
      line.setLatLngs([[p.lat, p.lng], ...tail.current]);
    }

    follow(p);
    if (smoother.current.active(now)) raf.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!rider) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      if (markers.current.rider) m.removeLayer(markers.current.rider);
      markers.current.rider = undefined;
      smoother.current.reset();
      heading.current = null;
      return;
    }
    const now = performance.now();
    if (!markers.current.rider) {
      markers.current.rider = L.marker([rider.lat, rider.lng], { icon: riderIcon(), zIndexOffset: 1000 }).addTo(m);
      smoother.current.reset();
      frameTrip();
    }
    smoother.current.push({ lat: rider.lat, lng: rider.lng }, now);

    // Once the rider has covered most of the trip since the last framing,
    // frame it again so the view tightens as they get close.
    if (drop && frame.current && frame.current.dist > 0 && !userMoved.current) {
      const left = metres(rider, drop);
      if (left < frame.current.dist * 0.3 && frame.current.dist > 250) frameTrip();
    }
    if (raf.current === null) raf.current = requestAnimationFrame(draw);
  }, [rider?.lat, rider?.lng]);

  // ── The road ───────────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const ahead = routeAhead(route, rider ? { lat: rider.lat, lng: rider.lng } : null, drop);
    if (!ahead || ahead.length < 2) {
      if (markers.current.line) m.removeLayer(markers.current.line);
      markers.current.line = undefined;
      tail.current = [];
      return;
    }
    // Everything after the first point (the rider) is the road still ahead.
    tail.current = rider ? ahead.slice(1) : ahead;
    const drawn = rider ? [[rider.lat, rider.lng] as [number, number], ...tail.current] : ahead;
    if (markers.current.line) markers.current.line.setLatLngs(drawn);
    else markers.current.line = L.polyline(drawn, { color: '#e11d48', weight: 5, opacity: 0.75 }).addTo(m);
  }, [route, rider?.lat, rider?.lng, drop?.lat, drop?.lng]);

  return (
    <div className={`relative w-full ${className}`}>
      <div ref={box} className="w-full h-full" style={{ zIndex: 0 }} />
      <button
        ref={recentreBtn}
        type="button"
        onClick={() => {
          userMoved.current = false;
          if (recentreBtn.current) recentreBtn.current.style.display = 'none';
          frameTrip(true);
        }}
        style={{ display: 'none' }}
        className="absolute bottom-3 left-3 z-[500] bg-white/95 rounded-full px-3 py-1.5 text-xs font-black text-gray-900 shadow-md"
      >
        Recentre
      </button>
    </div>
  );
}
