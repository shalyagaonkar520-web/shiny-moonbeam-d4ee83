import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, signOut, updatePassword, type User,
} from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  Banknote, Bike, CheckCircle2, ChevronRight, Eye, EyeOff, History, KeyRound, Loader2, LogOut, MapPin, Navigation,
  Package, Phone, Power, ShieldCheck, WifiOff, X,
} from 'lucide-react';
import { auth, db, firebaseReady } from '../firebase';
import { useSEO } from '../utils/seo';
import { staffSignIn } from '../lib/staffSignIn';
import { friendlyAuthError } from '../lib/authErrors';
import { useZoneStore } from '../lib/zones';
import {
  acceptOrder, collectPayment, handBack, markDelivered, markPickedUp, publishTracking, setRiderOnline, type RiderIdentity,
} from '../lib/riderJobs';
import { askNotificationPermission, notifyNewOrder, startAlarm, stopAlarm, unlockAlarm } from '../lib/alarm';
import { useMyPosition, useOnline, useRiderGps, useWakeLock } from '../lib/partnerHooks';
import RouteMap from './RouteMap';

/** Usernames without a domain map to this, so "partner" signs in as partner@idpartner.momsmagic.shop. */
const RIDER_EMAIL_DOMAIN = 'idpartner.momsmagic.shop';

const toEmail = (u: string) => {
  const v = u.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${RIDER_EMAIL_DOMAIN}`;
};

type Gate = { s: 'loading' } | { s: 'out' } | { s: 'denied'; reason: string } | { s: 'in'; user: User; name: string };

/**
 * ID Partner: the rider app for rider-direct orders, at /partner.
 *
 * Riders are the panel's RIDER accounts (Firebase Authentication keeps the
 * passwords, hashed; nothing is stored here). Every action is checked by the
 * Firestore rules, so this screen cannot do anything the rider is not allowed
 * to, whatever state it is in.
 */
export default function PartnerApp() {
  useSEO('ID Partner - Mintoo delivery partner', 'Delivery partner app for Mintoo orders.');
  const [gate, setGate] = useState<Gate>({ s: 'loading' });

  useEffect(() => {
    if (!firebaseReady) return setGate({ s: 'denied', reason: 'Service unavailable.' });
    void useZoneStore.getState().load();
    return onAuthStateChanged(auth, async (user) => {
      if (!user || user.isAnonymous) return setGate({ s: 'out' });
      setGate({ s: 'loading' });
      try {
        const u: any = (await getDoc(doc(db, 'users', user.uid))).data();
        if (String(u?.role || '').toUpperCase() !== 'RIDER') return setGate({ s: 'denied', reason: 'This account is not a delivery partner.' });
        if (u?.active === false) return setGate({ s: 'denied', reason: 'This partner account is switched off. Contact the Mintoo team.' });
        const r: any = (await getDoc(doc(db, 'riders', user.uid))).data();
        if (!r) return setGate({ s: 'denied', reason: 'Your partner profile is not set up yet. Contact the Mintoo team.' });
        if (r.active === false) return setGate({ s: 'denied', reason: 'This partner account is switched off. Contact the Mintoo team.' });
        setGate({ s: 'in', user, name: r.name || u?.name || 'Partner' });
      } catch (e: any) {
        setGate({ s: 'denied', reason: e?.code === 'unavailable' ? 'No internet connection.' : 'Could not load your partner account.' });
      }
    });
  }, []);

  if (gate.s === 'loading') {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#e11d48] animate-spin" /></div>
      </Shell>
    );
  }
  if (gate.s === 'out') return <PartnerLogin />;
  if (gate.s === 'denied') {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-rose-100 p-6 text-center space-y-3">
            <p className="font-black text-gray-900">No access</p>
            <p className="text-sm text-gray-600">{gate.reason}</p>
            <button onClick={() => signOut(auth)} className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-sm">Sign in again</button>
          </div>
        </div>
      </Shell>
    );
  }
  return <Dashboard rider={{ uid: gate.user.uid, name: gate.name }} email={gate.user.email || ''} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#fff5f7] flex flex-col">{children}</div>;
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`${small ? 'w-9 h-9' : 'w-14 h-14'} rounded-2xl bg-gradient-to-tr from-[#ff4d6d] to-[#e11d48] text-white flex items-center justify-center shadow-md shadow-rose-300/40`}>
        <Bike className={small ? 'w-5 h-5' : 'w-7 h-7'} />
      </div>
      <div className="leading-tight">
        <p className={`${small ? 'text-base' : 'text-2xl'} font-black text-gray-900`}>ID Partner</p>
        <p className="text-[10px] font-bold text-[#e11d48] uppercase tracking-wider">by Mintoo</p>
      </div>
    </div>
  );
}

function PartnerLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockAlarm(); // this tap is what lets the alarm make sound later
    setBusy(true);
    setError(null);
    try {
      await staffSignIn(auth, toEmail(username), password);
      void askNotificationPermission();
    } catch (err: any) {
      const code = String(err?.code || '');
      setError(code.includes('invalid-credential') || code.includes('user-not-found') || code.includes('wrong-password')
        ? 'Wrong username or password.'
        : friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="flex-1 flex items-center justify-center p-5">
        <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-[28px] border border-rose-100 shadow-xl shadow-rose-200/40 p-6 space-y-4">
          <div className="flex justify-center"><Brand /></div>
          <p className="text-center text-xs text-gray-500">Delivery partner sign in</p>
          <label className="block">
            <span className="text-xs font-bold text-gray-700">Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required
              className="mt-1 w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-base outline-none focus:border-[#e11d48]" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-700">Password</span>
            <div className="relative mt-1">
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required
                className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-gray-200 text-base outline-none focus:border-[#e11d48]" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
          </label>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <button disabled={busy} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff4d6d] to-[#e11d48] text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 className="w-5 h-5 animate-spin" />} Sign in
          </button>
        </form>
      </div>
    </Shell>
  );
}

type Tab = 'new' | 'accepted' | 'picked' | 'delivered' | 'history';

const amountOf = (o: any) => Number(o.payableAmount ?? o.grandTotal ?? o.totalAmount ?? 0);
const shortId = (id: string) => String(id).slice(-6).toUpperCase();
const navUrl = (p: { lat: number; lng: number }) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=two-wheeler`;
const paymentLabel = (o: any) =>
  o.paymentStatus === 'completed' ? (o.cashCollected ? 'Cash collected' : 'Paid online') : o.paymentMethod === 'online' ? 'Online (not confirmed)' : 'Cash on delivery';

function Dashboard({ rider, email }: { rider: RiderIdentity; email: string }) {
  const netOnline = useOnline();
  const [riderDoc, setRiderDoc] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [tab, setTab] = useState<Tab>('new');
  const [popup, setPopup] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const rejectedKey = `idp_rejected_${rider.uid}`;
  const [rejected, setRejected] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(rejectedKey) || '[]'); } catch { return []; }
  });
  const seen = useRef<Set<string>>(new Set());
  const published = useRef<Record<string, string>>({});
  const isOnline = riderDoc?.status === 'online';
  // Offers are only readable once the server has the rider as online; asking
  // before that (while the "online" write is still in flight) is refused.
  const [onlineConfirmed, setOnlineConfirmed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'riders', rider.uid),
        { includeMetadataChanges: true },
        (s) => {
          setRiderDoc(s.data() || null);
          setOnlineConfirmed(s.data()?.status === 'online' && !s.metadata.hasPendingWrites && !s.metadata.fromCache);
        },
        () => {}
      ),
    [rider.uid]
  );

  // Open offers: only while online (the rules show offers to online riders only).
  useEffect(() => {
    if (!onlineConfirmed) {
      if (!isOnline) setOffers([]);
      return;
    }
    const q = query(collection(db, 'orders'), where('dispatchStatus', '==', 'RIDER_DIRECT'), where('riderOffer', '==', 'OPEN'), where('riderId', '==', ''));
    let timer: number | undefined;
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        setFromCache(snap.metadata.fromCache);
        setOffers(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })).filter((o: any) => o.orderStatus === 'NEW'));
      },
      (err) => {
        // A listener that errors is dead; start a new one shortly.
        console.warn('Offers listener:', err?.code);
        timer = window.setTimeout(() => setRetry((n) => n + 1), 3000);
      }
    );
    return () => {
      unsub();
      if (timer) window.clearTimeout(timer);
    };
  }, [onlineConfirmed, isOnline, retry]);

  // My jobs, in every state.
  useEffect(() => {
    const q = query(collection(db, 'orders'), where('riderId', '==', rider.uid));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, _pending: d.metadata.hasPendingWrites, ...d.data({ serverTimestamps: 'estimate' }) }))
          .filter((o: any) => o.dispatchStatus === 'RIDER_DIRECT');
        setMine(list);
        // Refresh each order's public tracking document once the step is saved.
        for (const o of list as any[]) {
          if (o._pending) continue;
          const key = `${o.orderStatus}|${o.riderId}`;
          if (published.current[o.id] === key) continue;
          published.current[o.id] = key;
          publishTracking(db, o).catch((e) => {
            delete published.current[o.id];
            console.warn('Tracking publish failed:', e?.code);
          });
        }
      },
      (err) => console.warn('My orders listener:', err?.code)
    );
  }, [rider.uid]);

  const newOffers = useMemo(() => offers.filter((o) => !rejected.includes(o.id)), [offers, rejected]);
  const accepted = mine.filter((o) => o.orderStatus === 'NEW');
  const picked = mine.filter((o) => o.orderStatus === 'OUT_FOR_DELIVERY');
  const delivered = mine.filter((o) => o.orderStatus === 'DELIVERED');
  const history = mine.filter((o) => o.orderStatus === 'COMPLETED').sort((a, b) => String(b.completedAt?.seconds ?? '').localeCompare(String(a.completedAt?.seconds ?? '')));

  const gps = useRiderGps(rider.uid, picked);
  const awake = useWakeLock(isOnline || picked.length > 0);
  // The rider's own position, for the route to each customer.
  const myPos = useMyPosition(isOnline || mine.some((o) => o.orderStatus === 'NEW' || o.orderStatus === 'OUT_FOR_DELIVERY'));
  const here = gps.last ? { lat: gps.last.lat, lng: gps.last.lng } : myPos;

  // New offer -> popup + alarm until the rider answers.
  useEffect(() => {
    const fresh = newOffers.filter((o) => !seen.current.has(o.id));
    fresh.forEach((o) => seen.current.add(o.id));
    if (fresh.length) {
      if (!popup) setPopup(fresh[0]);
      startAlarm();
      void notifyNewOrder('New Mintoo order', `₹${amountOf(fresh[0])} · ${fresh[0].deliveryLocation?.address || ''}`, `order-${fresh[0].id}`);
    }
    // The popped-up order went to someone else.
    if (popup && !newOffers.some((o) => o.id === popup.id)) {
      toast('That order was taken by another partner.', { icon: 'ℹ️' });
      setPopup(newOffers.find((o) => o.id !== popup.id) || null);
    }
    if (!newOffers.length) stopAlarm();
  }, [newOffers]);

  useEffect(() => () => stopAlarm(), []);

  const reject = (o: any) => {
    const next = [...rejected, o.id].slice(-200);
    setRejected(next);
    try { localStorage.setItem(rejectedKey, JSON.stringify(next)); } catch { /* ignore */ }
    const rest = newOffers.filter((x) => x.id !== o.id);
    setPopup(rest[0] || null);
    if (!rest.length) stopAlarm();
  };

  const run = async (key: string, fn: () => Promise<string>, messages: Record<string, string>) => {
    setBusy(key);
    try {
      const r = await fn();
      const m = messages[r];
      if (r === 'taken' || r === 'not_allowed') toast.error(m || 'That step is no longer possible.');
      else if (m) toast.success(m);
      return r;
    } catch (e: any) {
      toast.error(e?.code === 'unavailable' ? 'No internet. Try again when connected.' : e?.code === 'permission-denied' ? 'Not allowed for this order.' : 'Something went wrong. Try again.');
      return 'error';
    } finally {
      setBusy(null);
    }
  };

  const accept = async (o: any) => {
    stopAlarm();
    const r = await run(`accept-${o.id}`, () => acceptOrder(db, o.id, rider), {
      assigned: 'Order accepted. Go to the pickup point.',
      already_yours: 'You already have this order.',
      taken: 'Another partner accepted it first.',
    });
    setPopup(newOffers.filter((x) => x.id !== o.id)[0] || null);
    if (r === 'assigned' || r === 'already_yours') setTab('accepted');
  };

  const toggleOnline = async () => {
    unlockAlarm();
    void askNotificationPermission();
    try {
      await setRiderOnline(db, rider.uid, !isOnline);
      toast.success(isOnline ? 'You are offline' : 'You are online. New orders will ring.');
    } catch (e: any) {
      toast.error(e?.code === 'unavailable' ? 'No internet connection.' : 'Could not change your status.');
    }
  };

  const today = new Date().toDateString();
  const todayDone = history.filter((o) => (o.completedAt?.seconds ? new Date(o.completedAt.seconds * 1000).toDateString() : '') === today);
  const cashToday = todayDone.filter((o) => o.cashCollected).reduce((s, o) => s + amountOf(o), 0);

  const tabs: Array<[Tab, string, number]> = [
    ['new', 'New', newOffers.length],
    ['accepted', 'Accepted', accepted.length],
    ['picked', 'Picked up', picked.length],
    ['delivered', 'Delivered', delivered.length],
    ['history', 'History', history.length],
  ];

  return (
    <Shell>
      <header className="sticky top-0 z-30 bg-white border-b border-rose-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Brand small />
          <div className="flex-1" />
          <button onClick={() => setShowPw(true)} className="p-2.5 rounded-xl bg-gray-100" aria-label="Change password"><KeyRound className="w-5 h-5 text-gray-700" /></button>
          <button
            onClick={async () => { if (isOnline) await setRiderOnline(db, rider.uid, false).catch(() => {}); stopAlarm(); await signOut(auth); }}
            className="p-2.5 rounded-xl bg-gray-100" aria-label="Sign out"><LogOut className="w-5 h-5 text-gray-700" /></button>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <button onClick={toggleOnline}
            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-colors ${isOnline ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white'}`}>
            <Power className="w-5 h-5" /> {isOnline ? `Online · ${rider.name}` : 'Go online to get orders'}
          </button>
          {(!netOnline || fromCache) && (
            <p className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <WifiOff className="w-4 h-4" /> {netOnline ? 'Reconnecting…' : 'No internet. Changes will sync when you are back online.'}
            </p>
          )}
          {gps.state === 'denied' && (
            <p className="mt-2 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              Location is blocked. Allow location for this app/browser, otherwise the customer cannot see you on the map.
            </p>
          )}
          {picked.length > 0 && gps.state === 'live' && (
            <p className="mt-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <Navigation className="w-4 h-4" /> Live location on{awake ? ' · screen kept on' : ''}. Keep this screen open while delivering.
            </p>
          )}
        </div>
        <nav className="max-w-2xl mx-auto px-2 flex overflow-x-auto no-scrollbar">
          {tabs.map(([k, label, n]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`shrink-0 px-3.5 py-3 text-sm font-black border-b-[3px] ${tab === k ? 'border-[#e11d48] text-[#e11d48]' : 'border-transparent text-gray-500'}`}>
              {label}{n > 0 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${tab === k ? 'bg-[#e11d48] text-white' : 'bg-gray-200 text-gray-700'}`}>{n}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-2xl w-full mx-auto px-4 py-4 space-y-3 pb-24">
        {tab === 'new' && (
          !isOnline ? <Empty icon={<Power className="w-10 h-10" />} text="You are offline. Go online to receive new orders." />
          : newOffers.length === 0 ? <Empty icon={<Package className="w-10 h-10" />} text="Waiting for orders… This screen will ring when one arrives." />
          : newOffers.map((o) => (
            <OrderCard key={o.id} o={o}>
              <div className="grid grid-cols-2 gap-2.5">
                <BigButton tone="ghost" onClick={() => reject(o)}>Reject</BigButton>
                <BigButton busy={busy === `accept-${o.id}`} onClick={() => accept(o)}>Accept order</BigButton>
              </div>
            </OrderCard>
          ))
        )}

        {tab === 'accepted' && (accepted.length === 0 ? <Empty icon={<CheckCircle2 className="w-10 h-10" />} text="No accepted orders." /> : accepted.map((o) => (
          <OrderCard key={o.id} o={o} showMap here={here}>
            <BigButton busy={busy === `pick-${o.id}`} onClick={() => run(`pick-${o.id}`, () => markPickedUp(db, o.id, rider), {
              done: 'Picked up. Live tracking is on.', already: 'Already picked up.', not_allowed: 'This order can no longer be picked up.',
            }).then((r) => { if (r === 'done' || r === 'already') setTab('picked'); })}>Picked up order</BigButton>
            <button onClick={() => run(`back-${o.id}`, () => handBack(db, o.id, rider), { done: 'Order handed back to other partners.', not_allowed: 'This order can no longer be handed back.' })}
              className="w-full text-center text-xs font-bold text-gray-500 py-1">Can't do this one? Hand it back</button>
          </OrderCard>
        )))}

        {tab === 'picked' && (picked.length === 0 ? <Empty icon={<Bike className="w-10 h-10" />} text="Nothing out for delivery." /> : picked.map((o) => (
          <OrderCard key={o.id} o={o} showMap here={here}>
            <a href={navUrl(o.deliveryLocation)} target="_blank" rel="noreferrer" className="block w-full text-center py-3 rounded-2xl border-2 border-gray-900 font-black text-sm">
              <Navigation className="w-4 h-4 inline -mt-0.5 mr-1" /> Navigate to customer
            </a>
            <BigButton busy={busy === `del-${o.id}`} onClick={() => run(`del-${o.id}`, () => markDelivered(db, o.id, rider), {
              done: 'Delivered. Now collect payment.', already: 'Already delivered.', not_allowed: 'This order cannot be marked delivered.',
            }).then((r) => { if (r === 'done' || r === 'already') setTab('delivered'); })}>Delivered</BigButton>
          </OrderCard>
        )))}

        {tab === 'delivered' && (delivered.length === 0 ? <Empty icon={<Banknote className="w-10 h-10" />} text="No payments to collect." /> : delivered.map((o) => (
          <OrderCard key={o.id} o={o}>
            <PaymentBox o={o} busy={busy === `pay-${o.id}`} onCollect={() => run(`pay-${o.id}`, () => collectPayment(db, o.id, rider), {
              cash_collected: `₹${amountOf(o)} cash collected. Delivery closed.`,
              closed_paid_online: 'Paid online. Delivery closed.',
              already: 'Already closed.',
              not_allowed: 'This payment cannot be recorded. Contact the Mintoo team.',
            }).then((r) => { if (r !== 'error' && r !== 'not_allowed') setTab('history'); })} />
          </OrderCard>
        )))}

        {tab === 'history' && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="Delivered today" value={String(todayDone.length)} />
              <Stat label="Cash collected today" value={`₹${cashToday}`} />
            </div>
            {history.length === 0 ? <Empty icon={<History className="w-10 h-10" />} text="Completed deliveries will appear here." /> : history.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-rose-100 p-3.5 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-gray-900">#{shortId(o.id)} · ₹{amountOf(o)}</p>
                  <p className="text-xs text-gray-500 truncate">{o.userName} · {o.deliveryLocation?.address}</p>
                </div>
                <span className="text-[10px] font-bold text-gray-500">{paymentLabel(o)}</span>
              </div>
            ))}
          </>
        )}
      </main>

      {popup && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center" role="alertdialog" aria-label="New order">
          <div className="w-full sm:max-w-md max-h-[94vh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] space-y-3 animate-[pulse_1s_ease-in-out_2]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-[#e11d48]" /></span>
              <p className="flex-1 text-lg font-black text-[#e11d48]">New order!</p>
              <button onClick={() => { stopAlarm(); setPopup(null); setTab('new'); }} className="p-1.5 rounded-full bg-gray-100" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <OrderDetails o={popup} />
            <RouteMap from={here} to={popup.deliveryLocation} className="h-44 rounded-2xl overflow-hidden" />
            <div className="grid grid-cols-2 gap-2.5">
              <BigButton tone="ghost" onClick={() => reject(popup)}>Reject order</BigButton>
              <BigButton busy={busy === `accept-${popup.id}`} onClick={() => accept(popup)}>Accept order</BigButton>
            </div>
          </div>
        </div>
      )}

      {showPw && <ChangePassword email={email} onClose={() => setShowPw(false)} />}
    </Shell>
  );
}

function OrderDetails({ o }: { o: any }) {
  const items: any[] = Array.isArray(o.items) ? o.items : [];
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-gray-900">Order #{shortId(o.id)}</p>
        <p className="text-xl font-black text-gray-900">₹{amountOf(o)}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{o.userName || 'Customer'}</p>
          <a href={`tel:+91${String(o.userPhone || '').replace(/\D/g, '').slice(-10)}`} className="text-sm font-bold text-[#e11d48] flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" /> {o.userPhone}
          </a>
        </div>
        <span className={`shrink-0 text-[11px] font-black px-2.5 py-1 rounded-full ${o.paymentStatus === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{paymentLabel(o)}</span>
      </div>
      <ul className="bg-gray-50 rounded-xl p-2.5 space-y-1">
        {items.map((i, k) => (
          <li key={k} className="flex justify-between text-sm"><span className="text-gray-800"><b>{i.quantity ?? i.finalQuantity ?? 1}×</b> {i.name}</span></li>
        ))}
      </ul>
      {o.instructions && <p className="text-xs text-gray-600 bg-amber-50 rounded-xl px-2.5 py-2"><b>Note:</b> {o.instructions}</p>}
      <p className="text-xs text-gray-600"><b>Pick up from:</b> {o.hotelName || 'Restaurant'}</p>
      <p className="text-sm text-gray-900 flex gap-1.5"><MapPin className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" /> {o.deliveryLocation?.address}</p>
    </div>
  );
}

function OrderCard({ o, children, showMap, here }: {
  o: any; children: React.ReactNode; showMap?: boolean; here?: { lat: number; lng: number } | null;
}) {
  return (
    <div className="bg-white rounded-[24px] border border-rose-100 shadow-sm p-4 space-y-3">
      <OrderDetails o={o} />
      {showMap && <RouteMap from={here || null} to={o.deliveryLocation} className="h-48 rounded-2xl overflow-hidden" />}
      {children}
    </div>
  );
}

function PaymentBox({ o, busy, onCollect }: { o: any; busy: boolean; onCollect: () => void }) {
  if (o.paymentStatus === 'completed') {
    return (
      <div className="space-y-2.5">
        <p className="text-sm font-bold text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2.5 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Paid online, confirmed by the payment system.</p>
        <BigButton busy={busy} onClick={onCollect}>Close delivery</BigButton>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {o.paymentMethod === 'online' && (
        <p className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          The online payment is not confirmed. Do not trust a payment screenshot: collect ₹{amountOf(o)} in cash, or contact the Mintoo team.
        </p>
      )}
      <BigButton busy={busy} onClick={onCollect}><Banknote className="w-5 h-5 inline -mt-0.5 mr-1" /> Collect payment · ₹{amountOf(o)} cash</BigButton>
    </div>
  );
}

function BigButton({ children, onClick, busy, tone = 'primary' }: { children: React.ReactNode; onClick: () => void; busy?: boolean; tone?: 'primary' | 'ghost' }) {
  return (
    <button onClick={onClick} disabled={busy}
      className={`w-full min-h-[56px] rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 ${
        tone === 'primary' ? 'bg-gradient-to-r from-[#ff4d6d] to-[#e11d48] text-white shadow-md shadow-rose-300/40' : 'bg-white border-2 border-gray-300 text-gray-800'
      }`}>
      {busy && <Loader2 className="w-5 h-5 animate-spin" />} {children}
    </button>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-white rounded-[24px] border border-rose-100 p-8 text-center text-gray-400 flex flex-col items-center gap-3">
      {icon}
      <p className="text-sm font-semibold text-gray-600">{text}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-rose-100 p-3.5">
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-[11px] font-bold text-gray-500">{label}</p>
    </div>
  );
}

function ChangePassword({ email, onClose }: { email: string; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (next.length < 8) return toast.error('Use at least 8 characters.');
    const u = auth.currentUser;
    if (!u) return;
    setBusy(true);
    try {
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(email, current));
      await updatePassword(u, next);
      toast.success('Password changed.');
      onClose();
    } catch (e: any) {
      toast.error(String(e?.code || '').includes('invalid-credential') ? 'Current password is wrong.' : friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[210] bg-black/50 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-sm bg-white rounded-t-[28px] sm:rounded-[28px] p-5 space-y-3">
        <div className="flex items-center"><p className="flex-1 text-lg font-black">Change password</p><button onClick={onClose} className="p-1.5" aria-label="Close"><X className="w-5 h-5" /></button></div>
        <input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200" />
        <input type="password" placeholder="New password (8+ characters)" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200" />
        <BigButton busy={busy} onClick={save}>Save new password</BigButton>
        <p className="text-[11px] text-gray-500 flex items-center gap-1"><ChevronRight className="w-3 h-3" /> Passwords are stored only by Firebase Authentication, hashed.</p>
      </div>
    </div>
  );
}
