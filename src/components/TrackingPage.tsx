import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { ChevronLeft, Phone, MapPin, ReceiptText, MessageCircle, RotateCcw, XCircle, Bike, CookingPot, CheckCircle2, Radio } from 'lucide-react';
import { db } from '../firebase';
import { useSEO } from '../utils/seo';
import FoodLoader from './FoodLoader';
import RateOrderCard from './RateOrderCard';
import { reorderAndGo, localOrder } from '../lib/reorder';
import { haversineDistance } from '../lib/location';
import { toStage, Stage, STAGE_STEPS, STAGE_TITLE } from '../lib/orderStage';
import { useSystemStore } from '../store/systemStore';
import { openExternal } from '../lib/openExternal';

// Mintoo kitchen, where every delivery starts.
const KITCHEN = { lat: 14.9643, lng: 74.7121 };
// Typical time from order to food leaving the kitchen, and town riding speed.
const PREP_MINUTES = 20;
const AVG_KMH = 22;
const POLL_MS = 10000;

type LatLng = { lat: number; lng: number };

interface TrackView {
  stage: Stage;
  items: Array<{ name: string; qty: number; price?: number }>;
  amount: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  address: string;
  dest: LatLng | null;
  riderId: string | null;
  rider: { name: string; phone: string; location: LatLng | null } | null;
  createdAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  rated: boolean;
}

interface Route {
  coords: Array<[number, number]>;
  durationMin: number;
}

const isLatLng = (v: any): v is LatLng => v && typeof v.lat === 'number' && typeof v.lng === 'number';

/** A Firestore order document, or the copy saved on this phone at checkout. */
function fromRaw(o: any): TrackView {
  return {
    stage: toStage(o),
    items: (o.items || []).map((i: any) => ({
      name: i?.name || 'Item',
      qty: Number(i?.finalQuantity ?? i?.quantity ?? 1),
      price: typeof i?.price === 'number' ? i.price : undefined,
    })),
    amount: Number(o.payableAmount ?? o.grandTotal ?? 0),
    paymentMethod: o.paymentMethod || null,
    paymentStatus: o.paymentStatus || null,
    address: o.deliveryLocation?.address || '',
    dest: isLatLng(o.deliveryLocation) ? { lat: o.deliveryLocation.lat, lng: o.deliveryLocation.lng } : null,
    riderId: o.riderId || null,
    rider: null,
    createdAt: o.createdAt || null,
    outForDeliveryAt: o.outForDeliveryAt || null,
    deliveredAt: o.deliveredAt || null,
    rated: !!o.customerRating,
  };
}

/** The trimmed /api/track response. */
function fromApi(o: any, prev: TrackView | null): TrackView {
  return {
    stage: o.stage,
    items: o.items?.length
      ? o.items.map((i: any) => ({ name: i.name, qty: i.quantity, price: prev?.items.find((p) => p.name === i.name)?.price }))
      : prev?.items || [],
    amount: o.amount ?? prev?.amount ?? 0,
    paymentMethod: o.paymentMethod ?? prev?.paymentMethod ?? null,
    paymentStatus: o.paymentStatus ?? prev?.paymentStatus ?? null,
    address: o.delivery?.address || prev?.address || '',
    dest: isLatLng(o.delivery) ? { lat: o.delivery.lat, lng: o.delivery.lng } : prev?.dest || null,
    riderId: prev?.riderId || null,
    rider: o.rider
      ? { name: o.rider.name || 'Delivery partner', phone: o.rider.phone || '', location: isLatLng(o.rider.location) ? o.rider.location : null }
      : null,
    createdAt: o.createdAt ?? prev?.createdAt ?? null,
    outForDeliveryAt: o.outForDeliveryAt ?? prev?.outForDeliveryAt ?? null,
    deliveredAt: o.deliveredAt ?? prev?.deliveredAt ?? null,
    rated: !!o.rated || !!prev?.rated,
  };
}

/** Road route from the kitchen to the customer (OSRM on OpenStreetMap), straight line if unavailable. */
async function fetchRoute(dest: LatLng, cacheKey: string): Promise<Route> {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }
  const straight = (): Route => {
    const km = haversineDistance(KITCHEN.lat, KITCHEN.lng, dest.lat, dest.lng) * 1.3;
    return { coords: [[KITCHEN.lat, KITCHEN.lng], [dest.lat, dest.lng]], durationMin: Math.max(3, (km / AVG_KMH) * 60) };
  };
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${KITCHEN.lng},${KITCHEN.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const body = await res.json();
    const r = body?.routes?.[0];
    if (!r) return straight();
    const route: Route = {
      coords: r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
      // OSRM assumes car speeds; town scooter riding with stops is slower.
      durationMin: Math.max(3, (r.distance / 1000 / AVG_KMH) * 60),
    };
    try { sessionStorage.setItem(cacheKey, JSON.stringify(route)); } catch { /* ignore */ }
    return route;
  } catch {
    return straight();
  }
}

/** The point a fraction (0..1) of the way along a polyline. */
function pointAlong(coords: Array<[number, number]>, fraction: number): LatLng {
  if (coords.length === 1) return { lat: coords[0][0], lng: coords[0][1] };
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineDistance(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    seg.push(d);
    total += d;
  }
  let target = total * Math.min(Math.max(fraction, 0), 1);
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? target / seg[i] : 0;
      const [a, b] = [coords[i], coords[i + 1]];
      return { lat: a[0] + (b[0] - a[0]) * t, lng: a[1] + (b[1] - a[1]) * t };
    }
    target -= seg[i];
  }
  const last = coords[coords.length - 1];
  return { lat: last[0], lng: last[1] };
}

const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

// Map markers are inline SVG (lucide shapes), not emoji: emoji fonts differ by
// phone and some render the kitchen and bike unrecognisably.
const svg = (paths: string, color: string, size = 18) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const UTENSILS = '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>';
const HOUSE = '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
const BIKE = '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>';

const pinIcon = (paths: string, bg: string, fg: string) =>
  L.divIcon({
    html: `<div style="width:38px;height:38px;border-radius:9999px;background:${bg};border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(17,24,39,.25)">${svg(paths, fg)}</div>`,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

const kitchenIcon = pinIcon(UTENSILS, '#e11d48', '#ffffff');
const homeIcon = pinIcon(HOUSE, '#111827', '#ffffff');

const bikeIcon = L.divIcon({
  html: `<div style="position:relative;width:48px;height:48px"><span style="position:absolute;inset:0;border-radius:9999px;background:rgba(225,29,72,.28);animation:mm-ping 1.6s ease-out infinite"></span><div style="position:absolute;inset:5px;border-radius:9999px;background:#ffffff;border:3px solid #e11d48;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(225,29,72,.45)">${svg(BIKE, '#e11d48', 20)}</div></div>`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

export default function TrackingPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  useSEO('Live Tracking', "Track your Mintoo order live.");
  const supportNumber = useSystemStore((s) => s.settings?.whatsappNumber) || '+919606001790';

  const [view, setView] = useState<TrackView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [route, setRoute] = useState<Route | null>(null);
  const [now, setNow] = useState(Date.now());

  // ---- data: Firestore live, then the /api/track backend, then this phone's copy
  useEffect(() => {
    if (!orderId) return;
    const saved = localOrder(orderId);
    if (saved) {
      setView(fromRaw(saved));
      setLoading(false);
    }

    let pollTimer: number | undefined;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/track?id=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
        if (res.status === 404 && !saved) setNotFound(true);
        if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
          const body = await res.json();
          if (body?.ok && !stopped) setView((prev) => fromApi(body.order, prev));
        }
      } catch { /* offline or backend not configured: keep what we have */ }
      if (!stopped) setLoading(false);
    };

    let unsubOrder = () => {};
    try {
      unsubOrder = onSnapshot(
        doc(db, 'orders', orderId),
        (snap) => {
          if (snap.exists()) {
            const raw = snap.data();
            setView((prev) => ({ ...fromRaw(raw), rider: prev?.rider || null }));
            setLoading(false);
          }
        },
        // Signed-out customers cannot read orders under the live rules; the
        // backend poll below reads with server credentials instead.
        () => {}
      );
    } catch { /* Firebase unavailable: the poll covers it */ }

    // The backend also supplies the rider's position, so poll the whole time.
    poll();
    pollTimer = window.setInterval(poll, POLL_MS);

    return () => {
      stopped = true;
      unsubOrder();
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [orderId]);

  // Rider document, when this browser is allowed to read it directly.
  useEffect(() => {
    if (!view?.riderId) return;
    try {
      return onSnapshot(
        doc(db, 'riders', view.riderId),
        (snap) => {
          const r: any = snap.data();
          if (!r) return;
          setView((prev) =>
            prev && {
              ...prev,
              rider: { name: r.name || 'Delivery partner', phone: r.phone || '', location: isLatLng(r.currentLocation) ? r.currentLocation : null },
            }
          );
        },
        () => { /* not readable: the backend poll supplies the rider */ }
      );
    } catch {
      return undefined;
    }
  }, [view?.riderId]);

  // Route once we know where the customer is.
  const destKey = view?.dest ? `${view.dest.lat.toFixed(5)},${view.dest.lng.toFixed(5)}` : '';
  useEffect(() => {
    if (!view?.dest) return;
    let cancelled = false;
    fetchRoute(view.dest, `moms_magic_route_${destKey}`).then((r) => !cancelled && setRoute(r));
    return () => { cancelled = true; };
  }, [destKey]);

  // Clock for the arrival time and the estimated bike position.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  // ---- where the bike is, and when the food arrives
  const stage = view?.stage || 'placed';
  const liveRider = stage === 'out_for_delivery' && view?.rider?.location ? view.rider.location : null;
  const dispatchedAt = view?.outForDeliveryAt ? new Date(view.outForDeliveryAt).getTime() : null;
  const driveMin = route?.durationMin ?? null;

  let bike: LatLng | null = null;
  let bikeMode: 'live' | 'estimated' | null = null;
  if (liveRider) {
    bike = liveRider;
    bikeMode = 'live';
  } else if (stage === 'out_for_delivery' && route) {
    const frac = dispatchedAt && driveMin ? Math.min(0.97, (now - dispatchedAt) / (driveMin * 60000)) : 0.05;
    bike = pointAlong(route.coords, frac);
    bikeMode = 'estimated';
  }

  let etaMin: number | null = null;
  if (view && driveMin && stage !== 'delivered' && stage !== 'cancelled') {
    if (stage === 'out_for_delivery') {
      if (liveRider && view.dest) {
        const km = haversineDistance(liveRider.lat, liveRider.lng, view.dest.lat, view.dest.lng) * 1.3;
        etaMin = (km / AVG_KMH) * 60 + 1;
      } else {
        etaMin = dispatchedAt ? driveMin - (now - dispatchedAt) / 60000 : driveMin;
      }
    } else {
      const created = view.createdAt ? new Date(view.createdAt).getTime() : now;
      const readyIn = Math.max(stage === 'preparing' ? 5 : 8, (created + PREP_MINUTES * 60000 - now) / 60000);
      etaMin = readyIn + driveMin;
    }
    etaMin = Math.max(1, Math.round(etaMin));
  }

  // ---- map
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ home?: L.Marker; bike?: L.Marker; route?: L.Polyline; casing?: L.Polyline; lastLeg?: L.Polyline }>({});
  const fitted = useRef('');
  const tripBounds = useRef<L.LatLngBounds | null>(null);
  // Room at the top for the badge and at the bottom for the arrival pill.
  // No animation: leaving the page mid-zoom made Leaflet throw.
  const frameTrip = (m: L.Map) => {
    if (tripBounds.current) {
      m.fitBounds(tripBounds.current, { paddingTopLeft: [40, 80], paddingBottomRight: [40, 130], maxZoom: 16, animate: false });
    }
  };
  const anim = useRef<number>(0);
  const hasView = !!view;

  useEffect(() => {
    if (!mapEl.current || map.current) return;
    const m = L.map(mapEl.current, { zoomControl: false, attributionControl: false }).setView([KITCHEN.lat, KITCHEN.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
    L.marker([KITCHEN.lat, KITCHEN.lng], { icon: kitchenIcon }).addTo(m).bindPopup("Mintoo kitchen");
    map.current = m;
    // The page fades in, so the container gets its final size after Leaflet first measures it.
    // Re-frame too: a fit done before the final size lands off-centre.
    const settle = () => { m.invalidateSize(); frameTrip(m); };
    const t1 = window.setTimeout(settle, 250);
    const t2 = window.setTimeout(settle, 800);
    const onResize = () => m.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(anim.current);
      m.remove();
      map.current = null;
      layers.current = {};
      fitted.current = '';
      tripBounds.current = null;
    };
  }, [hasView]);

  useEffect(() => {
    const m = map.current;
    if (!m || !view?.dest) return;
    const home: [number, number] = [view.dest.lat, view.dest.lng];
    if (!layers.current.home) layers.current.home = L.marker(home, { icon: homeIcon }).addTo(m).bindPopup('Your location');
    else layers.current.home.setLatLng(home);

    const coords = route?.coords || [[KITCHEN.lat, KITCHEN.lng], home];
    if (!layers.current.route) {
      layers.current.casing = L.polyline(coords, { color: '#ffffff', weight: 9, opacity: 0.9 }).addTo(m);
      layers.current.route = L.polyline(coords, { color: '#e11d48', weight: 5, opacity: 0.9 }).addTo(m);
    } else {
      layers.current.casing!.setLatLngs(coords);
      layers.current.route.setLatLngs(coords);
    }

    // The road route stops at the nearest road; a dashed line covers the last
    // stretch to the door (a lane, a farm track).
    const roadEnd = coords[coords.length - 1];
    const leg: Array<[number, number]> = [roadEnd as [number, number], home];
    if (!layers.current.lastLeg) {
      layers.current.lastLeg = L.polyline(leg, { color: '#e11d48', weight: 3, opacity: 0.8, dashArray: '4 8' }).addTo(m);
    } else {
      layers.current.lastLeg.setLatLngs(leg);
    }

    // Frame the whole trip once per route, not on every update.
    const key = `${destKey}|${route ? 'road' : 'line'}`;
    if (fitted.current !== key) {
      fitted.current = key;
      // Room at the top for the badge and at the bottom for the arrival pill.
      // No animation: leaving the page mid-zoom made Leaflet throw.
      tripBounds.current = L.latLngBounds([...coords, home, [KITCHEN.lat, KITCHEN.lng]] as L.LatLngExpression[]);
      frameTrip(m);
    }
  }, [view?.dest, route, destKey, hasView]);

  // Glide the bike to each new position instead of jumping.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!bike) {
      layers.current.bike?.remove();
      layers.current.bike = undefined;
      return;
    }
    if (!layers.current.bike) {
      layers.current.bike = L.marker([bike.lat, bike.lng], { icon: bikeIcon, zIndexOffset: 1000 }).addTo(m);
      return;
    }
    const marker = layers.current.bike;
    const from = marker.getLatLng();
    const to = bike;
    const start = performance.now();
    cancelAnimationFrame(anim.current);
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 1800);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      marker.setLatLng([from.lat + (to.lat - from.lat) * e, from.lng + (to.lng - from.lng) * e]);
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [bike?.lat, bike?.lng, hasView]);

  // ---- render
  if (loading && !view) return <FoodLoader />;

  if (!view) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff1f4] via-[#fff8fa] to-white text-gray-900 flex flex-col items-center justify-center p-8 text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-white border border-rose-100 shadow-sm flex items-center justify-center text-3xl">🔍</div>
        <h1 className="text-lg font-black">{notFound ? 'Order not found' : "Couldn't load this order"}</h1>
        <p className="text-sm text-gray-500 max-w-xs">
          It may have been placed on another phone, or the link may be out of date.
        </p>
        <button onClick={() => navigate('/track')} className="mt-2 px-6 py-3 rounded-2xl bg-[#e11d48] text-white font-black text-sm">
          See my orders
        </button>
      </div>
    );
  }

  const cancelled = stage === 'cancelled';
  const currentStep = STAGE_STEPS.findIndex((s) => s.key === stage);
  const StageIcon = stage === 'out_for_delivery' ? Bike : stage === 'delivered' ? CheckCircle2 : stage === 'cancelled' ? XCircle : CookingPot;
  const itemsTotal = view.items.reduce((sum, i) => sum + (i.price ?? 0) * i.qty, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4] via-[#fff8fa] to-white text-gray-900 pb-28">
      <style>{`@keyframes mm-ping{0%{transform:scale(.8);opacity:.9}100%{transform:scale(1.8);opacity:0}}`}</style>
      <div className="max-w-md mx-auto">
        {/* Map */}
        <div className="relative h-[46vh] min-h-[300px] max-h-[460px] bg-rose-50 overflow-hidden">
          <div ref={mapEl} className="absolute inset-0 z-0" />

          <button
            onClick={() => navigate('/track')}
            aria-label="Back"
            className="absolute top-4 left-4 z-[500] w-10 h-10 rounded-full bg-white shadow-md border border-rose-100 flex items-center justify-center text-gray-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {bikeMode && (
            <span className="absolute top-4 right-4 z-[500] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white shadow-md border border-rose-100 text-[10px] font-black uppercase tracking-wider text-gray-700">
              {bikeMode === 'live' ? (
                <><Radio className="w-3 h-3 text-emerald-600" /> Live GPS</>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-amber-400" /> Estimated position</>
              )}
            </span>
          )}

          {/* Arrival time, Zomato style */}
          {!cancelled && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[500] px-5 py-2.5 rounded-2xl bg-[#e11d48] text-white shadow-xl shadow-rose-500/30 text-center min-w-[190px]">
              {stage === 'delivered' ? (
                <p className="text-sm font-black">
                  Delivered{view.deliveredAt ? ` at ${fmtTime(new Date(view.deliveredAt))}` : ''} 🎉
                </p>
              ) : etaMin !== null ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Arriving in</p>
                  <p className="text-2xl font-black leading-tight">{etaMin} min{etaMin === 1 ? '' : 's'}</p>
                  <p className="text-[10px] font-semibold opacity-80">by {fmtTime(new Date(now + etaMin * 60000))}</p>
                </>
              ) : (
                <p className="text-sm font-black">Calculating arrival time…</p>
              )}
            </div>
          )}
        </div>

        {/* Sheet */}
        <div className="relative z-10 -mt-5 px-4 space-y-3.5">
          <div className="bg-white rounded-[26px] p-4 border border-rose-100/90 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${cancelled ? 'bg-gray-100 text-gray-500' : 'bg-rose-50 text-[#e11d48]'}`}>
                <StageIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-black text-gray-900">{STAGE_TITLE[stage]}</h1>
                <p className="text-[11px] font-semibold text-gray-500">
                  Order #{orderId.slice(0, 13)}
                  {view.createdAt && ` · ${new Date(view.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`}
                </p>
              </div>
            </div>

            {cancelled ? (
              <p className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3">
                This order was cancelled. If you were charged, message us on WhatsApp and we'll sort it out.
              </p>
            ) : (
              <ol className="grid grid-cols-4 gap-1.5" aria-label="Order progress">
                {STAGE_STEPS.map((s, i) => (
                  <li key={s.key} className="space-y-1.5" aria-current={i === currentStep ? 'step' : undefined}>
                    <div className={`h-1.5 rounded-full ${i <= currentStep ? 'bg-[#e11d48]' : 'bg-gray-200'} ${i === currentStep && stage !== 'delivered' ? 'animate-pulse' : ''}`} />
                    <p className={`text-[10px] font-bold text-center ${i <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Delivery partner */}
          {!cancelled && stage !== 'delivered' && (
            <div className="bg-white rounded-[26px] p-4 border border-rose-100/90 shadow-sm">
              {view.rider ? (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#e11d48] text-white flex items-center justify-center text-lg font-black shrink-0">
                    {view.rider.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-gray-900 truncate">{view.rider.name}</p>
                    <p className="text-[11px] font-semibold text-gray-500">Your delivery partner 🛵</p>
                  </div>
                  {view.rider.phone && (
                    <a
                      href={`tel:${view.rider.phone}`}
                      aria-label={`Call ${view.rider.name}`}
                      className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30"
                    >
                      <Phone className="w-4.5 h-4.5" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center text-xl shrink-0">🛵</div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Assigning a delivery partner</p>
                    <p className="text-[11px] font-semibold text-gray-500">You'll see their name and live location here.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* After delivery */}
          {stage === 'delivered' && (
            <div className="space-y-3">
              <RateOrderCard orderId={orderId} alreadyRated={view.rated} />
              <button
                onClick={() => reorderAndGo(localOrder(orderId) || { items: view.items.map((i) => ({ name: i.name, quantity: i.qty })) }, navigate, toast)}
                className="w-full py-3.5 rounded-2xl bg-white border border-rose-200 text-[#e11d48] font-black text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Order again
              </button>
            </div>
          )}

          {/* Order details */}
          <div className="bg-white rounded-[26px] p-4 border border-rose-100/90 shadow-sm space-y-3">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <ReceiptText className="w-3.5 h-3.5 text-[#e11d48]" /> Order details
            </h2>
            <ul className="space-y-2">
              {view.items.map((i, idx) => (
                <li key={idx} className="flex items-start justify-between gap-3 text-sm">
                  <span className="font-semibold text-gray-800">
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 mr-2 rounded-md bg-rose-50 text-[#e11d48] text-[11px] font-black">
                      {i.qty}×
                    </span>
                    {i.name}
                  </span>
                  {i.price !== undefined && <span className="font-bold text-gray-900 shrink-0">₹{i.price * i.qty}</span>}
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-dashed border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">
                {view.paymentMethod === 'cod' ? 'Cash on delivery' : view.paymentMethod === 'online' ? (view.paymentStatus === 'completed' ? 'Paid online' : 'Online payment pending') : view.paymentMethod === 'wallet' ? 'Paid from wallet' : 'Total'}
                {itemsTotal > 0 && view.amount > itemsTotal ? ' · incl. delivery' : ''}
              </span>
              <span className="text-base font-black text-gray-900">₹{view.amount}</span>
            </div>
          </div>

          {/* Address */}
          {view.address && (
            <div className="bg-white rounded-[26px] p-4 border border-rose-100/90 shadow-sm flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#e11d48]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Delivering to</p>
                <p className="text-sm font-bold text-gray-900">{view.address}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const text = `Hi Mintoo, I need help with my order #${orderId}`;
              openExternal(`https://wa.me/${supportNumber.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
            }}
            className="w-full py-3.5 rounded-2xl bg-white border border-rose-100 shadow-sm text-gray-900 font-black text-sm flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" /> Need help with this order?
          </button>
        </div>
      </div>
    </div>
  );
}
