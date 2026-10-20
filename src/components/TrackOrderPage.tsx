import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, PackageSearch, MapPin, Search, Loader2, CheckCircle2, CookingPot, Bike, ReceiptText, XCircle } from 'lucide-react';
import { useSEO } from '../utils/seo';
import { toStage, Stage } from '../lib/orderStage';
import toast from 'react-hot-toast';
import { reorderAndGo, localOrder } from '../lib/reorder';
import { hasRatedLocally } from './RateOrderCard';


interface TrackedOrder {
  id: string;
  stage: Stage;
  stageLabel: string;
  createdAt: string | null;
  items: Array<{ name: string; quantity: number }>;
  amount: number;
  rated?: boolean;
}

const STAGES: Array<{ key: Stage; label: string; Icon: typeof ReceiptText }> = [
  { key: 'placed', label: 'Placed', Icon: ReceiptText },
  { key: 'preparing', label: 'Preparing', Icon: CookingPot },
  { key: 'out_for_delivery', label: 'On the way', Icon: Bike },
  { key: 'delivered', label: 'Delivered', Icon: CheckCircle2 },
];

function fromLocal(o: any): TrackedOrder {
  const stage = toStage(o);
  return {
    id: o.id,
    stage,
    stageLabel: STAGES.find((s) => s.key === stage)?.label || 'Cancelled',
    createdAt: o.createdAt || null,
    items: (o.items || []).map((i: any) => ({ name: i.name, quantity: i.finalQuantity ?? i.quantity ?? 1 })),
    amount: Number(o.payableAmount ?? o.grandTotal ?? 0),
  };
}

/** Resolves null only when the order really does not exist; throws when the backend is unavailable. */
async function fetchTracked(id: string): Promise<TrackedOrder | null> {
  const res = await fetch(`/api/track?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`track ${res.status}`);
  const body = await res.json();
  return body?.ok ? (body.order as TrackedOrder) : null;
}

function StageBar({ stage }: { stage: Stage }) {
  if (stage === 'cancelled') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
        <XCircle className="w-4 h-4" /> This order was cancelled
      </div>
    );
  }
  const current = STAGES.findIndex((s) => s.key === stage);
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Order progress">
      {STAGES.map(({ key, label, Icon }, i) => {
        const done = i <= current;
        return (
          <li key={key} className="flex flex-col items-center gap-1 text-center" aria-current={i === current ? 'step' : undefined}>
            <div className={`h-1 w-full rounded-full ${done ? 'bg-[#e11d48]' : 'bg-gray-200'}`} />
            <Icon className={`w-4 h-4 mt-1 ${done ? 'text-[#e11d48]' : 'text-gray-300'}`} />
            <span className={`text-[10px] font-bold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function TrackOrderPage() {
  useSEO('Track Order', "Track your Mintoo order.");
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState('');
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [refreshing, setRefreshing] = useState(true);

  // Orders placed on this device, newest first, refreshed from the backend.
  useEffect(() => {
    let stored: any[] = [];
    try {
      stored = JSON.parse(localStorage.getItem('mintoo_orders') || '[]');
    } catch {
      stored = [];
    }
    const recent = stored
      .filter((o) => o && o.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    setOrders(recent.map(fromLocal));

    let cancelled = false;
    Promise.all(recent.map((o) => fetchTracked(o.id).catch(() => null))).then((live) => {
      if (cancelled) return;
      setOrders(recent.map((o, i) => live[i] || fromLocal(o)));
      setRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = orderId.trim().replace(/^#/, '');
    if (!/^[A-Za-z0-9_-]{6,100}$/.test(id)) {
      setLookupError('Enter the full order ID from your order confirmation.');
      return;
    }
    setLookupError(null);
    setChecking(true);
    try {
      const found = await fetchTracked(id);
      if (found) {
        navigate(`/track/${encodeURIComponent(id)}`);
      } else {
        setLookupError("We couldn't find an order with that ID. Check it and try again.");
      }
    } catch {
      // Endpoint unreachable: let the live tracking page try Firestore directly.
      navigate(`/track/${encodeURIComponent(id)}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4]/70 via-[#fff8fa]/60 to-white text-gray-900 pb-32 pt-6 px-4">
      <div className="max-w-md mx-auto space-y-5 text-left">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-gray-900">Track Order</h1>
        </div>

        <form onSubmit={handleLookup} className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-3">
          <label htmlFor="track-order-id" className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-[#e11d48]" /> Find by order ID
          </label>
          <div className="flex gap-2">
            <input
              id="track-order-id"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. 1790399929700AB12CD34"
              autoComplete="off"
              className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-semibold outline-none focus:border-[#e11d48]"
            />
            <button
              type="submit"
              disabled={checking}
              className="px-4 rounded-xl bg-[#e11d48] text-white font-black text-sm flex items-center gap-1.5 disabled:opacity-70"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Track'}
            </button>
          </div>
          {lookupError && <p role="alert" className="text-xs font-semibold text-[#e11d48]">{lookupError}</p>}
        </form>

        <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <PackageSearch className="w-3.5 h-3.5 text-[#e11d48]" /> Your recent orders
            </h2>
            {refreshing && orders.length > 0 && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs font-semibold text-gray-500">No orders on this device yet.</p>
              <button onClick={() => navigate('/food')} className="mt-2 text-xs font-bold text-[#e11d48]">
                Order your first meal →
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="rounded-2xl border border-rose-100 p-3.5 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold text-gray-400">
                      #{o.id.slice(0, 13)}
                      {o.createdAt &&
                        ` · ${new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`}
                    </p>
                    <span className="text-sm font-black text-gray-900 shrink-0">₹{o.amount}</span>
                  </div>

                  <ul className="space-y-1">
                    {o.items.slice(0, 4).map((i, idx) => (
                      <li key={idx} className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-md bg-rose-50 text-[#e11d48] text-[10px] font-black">
                          {i.quantity}×
                        </span>
                        <span className="truncate">{i.name}</span>
                      </li>
                    ))}
                    {o.items.length > 4 && (
                      <li className="text-[11px] font-bold text-gray-400 pl-7">+ {o.items.length - 4} more</li>
                    )}
                    {o.items.length === 0 && <li className="text-xs font-semibold text-gray-500">Food order</li>}
                  </ul>

                  <StageBar stage={o.stage} />

                  <button
                    onClick={() => navigate(`/track/${encodeURIComponent(o.id)}`)}
                    className="w-full py-2.5 rounded-xl bg-[#e11d48] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {o.stage === 'delivered' || o.stage === 'cancelled' ? 'View order' : 'Track order'}
                  </button>

                  {o.stage === 'delivered' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => reorderAndGo(localOrder(o.id) || o, navigate, toast)}
                        className="py-2 rounded-xl border border-rose-200 text-[#e11d48] text-xs font-black"
                      >
                        Order again
                      </button>
                      <button
                        onClick={() => navigate(`/track/${encodeURIComponent(o.id)}`)}
                        disabled={o.rated || hasRatedLocally(o.id)}
                        className="py-2 rounded-xl border border-rose-200 text-gray-900 text-xs font-black disabled:opacity-50"
                      >
                        {o.rated || hasRatedLocally(o.id) ? 'Rated ✓' : 'Rate order'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
