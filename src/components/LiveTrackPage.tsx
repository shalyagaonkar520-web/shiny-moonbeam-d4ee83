import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Bike, CheckCircle2, ChevronLeft, Clock, MapPin, Navigation, Wallet } from 'lucide-react';
import { db, firebaseReady } from '../firebase';
import { useSEO } from '../utils/seo';
import { useZoneStore } from '../lib/zones';
import { fetchRoute, estimateRoute, type RouteInfo } from '../lib/route';
import { haversineDistance } from '../lib/location';
import { playSound, SOUNDS } from '../utils/audio';
import LiveMap from './LiveMap';
import TrackComingSoon from './TrackComingSoon';

/** Orders this device placed, as checkout saved them. */
function localOrders(): any[] {
  try {
    return JSON.parse(localStorage.getItem('mintoo_orders') || '[]');
  } catch {
    return [];
  }
}

/**
 * /track/:orderId. Rider-direct orders carry a trackingId and get the
 * live map; any other order keeps the "coming soon" screen.
 */
export default function TrackRoute() {
  const { orderId } = useParams();
  const orders = useMemo(
    () => localOrders().filter((o) => o?.trackingId && (o.id === orderId || String(o.id).startsWith(`${orderId}-`))),
    [orderId]
  );
  const [pick, setPick] = useState(0);
  if (!orders.length) return <TrackComingSoon />;
  return (
    <>
      {orders.length > 1 && (
        <div className="fixed top-0 inset-x-0 z-40 bg-white border-b border-rose-100 flex gap-2 overflow-x-auto px-3 py-2">
          {orders.map((o, i) => (
            <button key={o.id} onClick={() => setPick(i)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${i === pick ? 'bg-[#e11d48] text-white' : 'bg-gray-100 text-gray-700'}`}>
              {o.hotelName || `Order ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <LiveTrack key={orders[pick].id} order={orders[pick]} offsetTop={orders.length > 1} />
    </>
  );
}

type Step = 'placed' | 'accepted' | 'pickedUp' | 'onTheWay' | 'delivered' | 'completed';

const STEPS: Array<[Step, string]> = [
  ['placed', 'Order placed'],
  ['accepted', 'Order accepted'],
  ['pickedUp', 'Rider picked up'],
  ['onTheWay', 'Rider on the way'],
  ['delivered', 'Delivered'],
  ['completed', 'Payment completed'],
];

const HEADLINES: Record<Step, [string, string]> = {
  placed: ['Order placed', 'Finding a delivery partner for you…'],
  accepted: ['Your order has been accepted!', 'Your delivery partner is preparing to deliver your order.'],
  pickedUp: ['Your order has been picked up by the delivery partner!', 'Live tracking will start in a moment.'],
  onTheWay: ['Your order is on the way', 'Follow your delivery partner live on the map.'],
  delivered: ['Your order has been delivered successfully!', 'Enjoy your meal.'],
  completed: ['Delivery completed', 'Payment received. Thank you for ordering with Mintoo!'],
};

/** A fix older than this is shown as "last seen", not as live. */
const STALE_MS = 60_000;

function LiveTrack({ order, offsetTop }: { order: any; offsetTop: boolean }) {
  useSEO('Track your order - Mintoo', 'Live order tracking.');
  const navigate = useNavigate();
  const zone = useZoneStore((s) => s.rider);
  const [t, setT] = useState<any | null>(null);
  const [connected, setConnected] = useState(true);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [now, setNow] = useState(Date.now());
  const routeFrom = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const lastStep = useRef<Step | null>(null);

  useEffect(() => {
    void useZoneStore.getState().load();
    if (!firebaseReady) return;
    return onSnapshot(
      doc(db, 'tracking', order.trackingId),
      { includeMetadataChanges: true },
      (s) => {
        setConnected(!s.metadata.fromCache);
        setT(s.exists() ? s.data() : null);
      },
      () => setConnected(false)
    );
  }, [order.trackingId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const status: string = t?.status || 'NEW';
  const fix = t?.riderLocation && t.riderLocation.riderId === t.riderId ? t.riderLocation : null;
  const fixFresh = !!fix && now - Number(fix.at || 0) < STALE_MS;

  const step: Step =
    status === 'COMPLETED' ? 'completed'
    : status === 'DELIVERED' ? 'delivered'
    : status === 'OUT_FOR_DELIVERY' ? (fix ? 'onTheWay' : 'pickedUp')
    : t?.riderId ? 'accepted'
    : 'placed';

  // Tell the customer when the step changes (not on first load).
  useEffect(() => {
    if (lastStep.current && lastStep.current !== step) {
      const [title] = HEADLINES[step];
      toast.success(title, { duration: 5000 });
      playSound(SOUNDS.ORDER_SUCCESS);
      try {
        if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
          new Notification('Mintoo order update', { body: title, icon: '/logo-sm.webp', tag: `track-${order.id}` });
        }
      } catch {
        /* ignore */
      }
    }
    lastStep.current = step;
  }, [step]);

  const drop = t?.dropLocation || (order.deliveryLocation ? { lat: order.deliveryLocation.lat, lng: order.deliveryLocation.lng } : null);
  const delivering = status === 'OUT_FOR_DELIVERY';

  // Road route + ETA: from the rider's live position to the customer.
  useEffect(() => {
    if (!drop) return;
    if (!fix) return;
    const from = { lat: fix.lat, lng: fix.lng };
    const prev = routeFrom.current;
    const moved = prev ? haversineDistance(prev.lat, prev.lng, from.lat, from.lng) * 1000 : Infinity;
    // Re-route when the rider has moved 150 m or every 45 s; in between the
    // estimate is scaled from the straight-line distance left.
    if (prev && moved < 150 && Date.now() - prev.at < 45_000) return;
    routeFrom.current = { ...from, at: Date.now() };
    const ac = new AbortController();
    fetchRoute(from, drop, ac.signal).then(setRoute);
    return () => ac.abort();
  }, [fix?.lat, fix?.lng, drop?.lat, drop?.lng]);

  const eta = useMemo(() => {
    if (!drop) return null;
    if (delivering && fix) {
      const r = route || estimateRoute(fix, drop);
      return { minutes: r.durationMin, km: r.distanceKm };
    }
    return null;
  }, [route, delivering, fix?.lat, fix?.lng, drop?.lat, drop?.lng]);

  const etaMinutes = Number(order.etaMinutes) || zone.etaMinutes;
  const [headline, sub] = HEADLINES[step];
  const times: Record<string, number> = { placed: Date.parse(order.createdAt) || 0, ...(t?.times || {}) };
  const reached = STEPS.findIndex(([k]) => k === step);
  const fmt = (ms?: number) => (ms ? new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');

  return (
    <div className={`min-h-screen bg-[#fff5f7] pb-28 ${offsetTop ? 'pt-12' : ''}`}>
      <header className="bg-white border-b border-rose-100">
        <div className="max-w-2xl mx-auto px-3 py-3 flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-100" aria-label="Home"><ChevronLeft className="w-6 h-6" /></button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900">Order #{String(order.id).slice(-6).toUpperCase()}</p>
            <p className="text-[11px] text-gray-500 truncate">{order.hotelName}</p>
          </div>
          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
            {connected ? '● Live' : 'Reconnecting…'}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 pt-3 space-y-3">
        <section className="bg-white rounded-[24px] border border-rose-100 p-4">
          <h1 className="text-lg font-black text-gray-900 leading-snug">{headline}</h1>
          <p className="text-sm text-gray-600 mt-0.5">{sub}</p>
          {step === 'accepted' && (
            <p className="mt-2 text-sm font-bold text-[#e11d48] flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Estimated delivery: about {etaMinutes} min
              <span className="text-[11px] font-semibold text-gray-400">(approximate)</span>
            </p>
          )}
          {eta && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-rose-50 rounded-2xl p-3">
                <p className="text-2xl font-black text-[#e11d48]">{eta.minutes} min</p>
                <p className="text-[11px] font-bold text-gray-500">estimated arrival</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-3">
                <p className="text-2xl font-black text-gray-900">{eta.km < 1 ? `${Math.round(eta.km * 1000)} m` : `${eta.km.toFixed(1)} km`}</p>
                <p className="text-[11px] font-bold text-gray-500">distance remaining</p>
              </div>
            </div>
          )}
          {delivering && fix && !fixFresh && (
            <p className="mt-2 text-[11px] font-bold text-amber-700">
              Rider's location last updated {Math.round((now - Number(fix.at)) / 1000)} s ago. It refreshes when their signal returns.
            </p>
          )}
          {t?.riderName && step !== 'placed' && (
            <p className="mt-3 text-xs text-gray-600 flex items-center gap-1.5"><Bike className="w-4 h-4 text-[#e11d48]" /> Delivery partner: <b>{t.riderName}</b></p>
          )}
        </section>

        <LiveMap
          pickup={null}
          drop={drop}
          rider={delivering && fix ? { lat: fix.lat, lng: fix.lng } : null}
          route={step === 'delivered' || step === 'completed' || !fix ? null : route?.coords || null}
          className="h-72 rounded-[24px] overflow-hidden border border-rose-100"
        />

        <section className="bg-white rounded-[24px] border border-rose-100 p-4">
          <ol className="relative">
            {STEPS.map(([k, label], i) => {
              const done = i <= reached;
              const current = i === reached;
              const time = k === 'onTheWay' ? times.pickedUp : times[k];
              return (
                <li key={k} className="flex gap-3 pb-4 last:pb-0 relative">
                  {i < STEPS.length - 1 && <span className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${i < reached ? 'bg-[#e11d48]' : 'bg-gray-200'}`} />}
                  <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-[#e11d48] text-white' : 'bg-gray-200 text-gray-400'} ${current ? 'ring-4 ring-rose-100' : ''}`}>
                    {k === 'completed' ? <Wallet className="w-3.5 h-3.5" /> : k === 'onTheWay' ? <Navigation className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  </span>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <p className={`text-sm ${done ? 'font-black text-gray-900' : 'font-semibold text-gray-400'}`}>{label}</p>
                    {done && time ? <p className="text-[11px] text-gray-500">{fmt(time)}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="bg-white rounded-[24px] border border-rose-100 p-4 text-sm text-gray-700 flex gap-2">
          <MapPin className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" />
          <span>{order.deliveryLocation?.address}</span>
        </section>
      </main>
    </div>
  );
}
