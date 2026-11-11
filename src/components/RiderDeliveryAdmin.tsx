import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Bike, Loader2, LogOut } from 'lucide-react';
import { auth, db, firebaseReady } from '../firebase';
import { useSEO } from '../utils/seo';
import { staffSignIn } from '../lib/staffSignIn';
import { friendlyAuthError } from '../lib/authErrors';
import { DIRECT_CITY_ID, RIDER_ZONE_DEFAULTS, YELLAPUR_ZONE, riderZoneFromDoc, useZoneStore, type RiderZone } from '../lib/zones';
import LiveMap from './LiveMap';

/**
 * /admin/rider-delivery: JIS switches ID Partner rider delivery on or off
 * for Yellapur. Writes the rider fields on cities/yellapur, which the
 * Firestore rules read for every rider-direct order.
 *
 * On: new orders inside the rectangle ring on ID Partner straight away.
 * Off: orders go to JIS and the kitchens as before.
 */
export default function RiderDeliveryAdmin() {
  useSEO('Rider delivery settings', 'Mintoo ID Partner rider delivery.');
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => {
    if (!firebaseReady) return setUser(null);
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) return setIsSuper(false);
      const d: any = (await getDoc(doc(db, 'users', u.uid)).catch(() => null))?.data();
      setIsSuper(String(d?.role || '').toUpperCase() === 'SUPER_ADMIN' && d?.active !== false);
    });
  }, []);

  if (user === undefined) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#e11d48]" /></div>;
  if (!user) return <Login />;
  if (!isSuper) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <p className="font-black">Only the super admin can change rider delivery.</p>
          <button onClick={() => signOut(auth)} className="px-5 py-3 rounded-2xl bg-gray-900 text-white font-bold text-sm">Sign in with another account</button>
        </div>
      </div>
    );
  }
  return <Editor />;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff5f7] p-5">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try { await staffSignIn(auth, email, password); } catch (err) { toast.error(friendlyAuthError(err)); } finally { setBusy(false); }
        }}
        className="w-full max-w-sm bg-white rounded-3xl border border-rose-100 p-6 space-y-3"
      >
        <p className="text-lg font-black">Rider delivery settings</p>
        <p className="text-xs text-gray-500">Super admin sign in</p>
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
        <button disabled={busy} className="w-full py-3.5 rounded-xl bg-[#e11d48] text-white font-black disabled:opacity-60">Sign in</button>
      </form>
    </div>
  );
}

function Editor() {
  const [z, setZ] = useState<RiderZone | null>(null);
  const [city, setCity] = useState<{ name: string; active: boolean }>({ name: YELLAPUR_ZONE.name, active: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'cities', DIRECT_CITY_ID)).then((s) => {
      const d: any = s.data() || {};
      setCity({ name: typeof d.name === 'string' && d.name ? d.name : YELLAPUR_ZONE.name, active: d.active !== false });
      const zone = riderZoneFromDoc(d);
      setZ({ ...zone, active: d.riderDirect === true });
    }).catch(() => setZ(RIDER_ZONE_DEFAULTS));
  }, []);

  if (!z) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#e11d48]" /></div>;

  const b = z.bounds;
  const valid =
    [b.minLat, b.maxLat, b.minLng, b.maxLng].every((n) => Number.isFinite(n)) &&
    b.minLat < b.maxLat && b.minLng < b.maxLng && z.etaMinutes > 0 && z.etaMinutes < 180;

  const save = async () => {
    if (!valid) return toast.error('Check the numbers: each minimum must be below its maximum.');
    setBusy(true);
    try {
      // The city's own name and on/off are kept as they are: this page only
      // owns the rider-delivery fields.
      await setDoc(doc(db, 'cities', DIRECT_CITY_ID), {
        name: city.name,
        active: city.active,
        riderDirect: z.active,
        deliveryBounds: { minLat: b.minLat, maxLat: b.maxLat, minLng: b.minLng, maxLng: b.maxLng },
        etaMinutes: z.etaMinutes,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      useZoneStore.getState().setRider({ ...z, active: z.active && city.active });
      toast.success(z.active ? 'Saved. New orders now ring on ID Partner.' : 'Saved. Orders go to JIS as before.');
    } catch (e: any) {
      toast.error(e?.code === 'permission-denied' ? 'Refused by the database.' : 'Could not save. Check the internet and try again.');
    } finally {
      setBusy(false);
    }
  };

  const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
  const field = (label: string, value: number, set: (n: number) => void) => (
    <label className="block">
      <span className="text-[11px] font-bold text-gray-600">{label}</span>
      <input inputMode="decimal" defaultValue={String(value)} onChange={(e) => set(num(e.target.value))}
        className="mt-0.5 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
    </label>
  );

  return (
    <div className="min-h-screen bg-[#fff5f7] pb-16">
      <header className="bg-white border-b border-rose-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Bike className="w-6 h-6 text-[#e11d48]" />
          <p className="flex-1 font-black">Rider delivery · {city.name}</p>
          <button onClick={() => signOut(auth)} className="p-2 rounded-xl bg-gray-100" aria-label="Sign out"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-3">
        <div className="bg-white rounded-2xl border border-rose-100 p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="font-black">{z.active ? 'ID Partner delivery ON' : 'ID Partner delivery OFF'}</p>
            <p className="text-xs text-gray-500">
              On: every new order rings on the riders' ID Partner app at once, and the customer gets live tracking.
              Off: orders go to JIS and the kitchens as before.
            </p>
          </div>
          <button onClick={() => setZ({ ...z, active: !z.active })} className={`relative w-14 h-8 rounded-full shrink-0 ${z.active ? 'bg-emerald-500' : 'bg-gray-300'}`} aria-label="Rider delivery on or off">
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${z.active ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        {!city.active && <p className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">{city.name} is switched off in the panel, so rider delivery stays off until it is switched back on there.</p>}

        <LiveMap pickup={YELLAPUR_ZONE.origin} drop={null} className="h-64 rounded-2xl overflow-hidden border border-rose-100" />

        <div className="bg-white rounded-2xl border border-rose-100 p-4 space-y-3">
          <p className="font-black text-sm">Rider delivery area (orders outside it go to JIS as before)</p>
          <div className="grid grid-cols-2 gap-2">
            {field('South edge (min latitude)', b.minLat, (n) => setZ({ ...z, bounds: { ...b, minLat: n } }))}
            {field('North edge (max latitude)', b.maxLat, (n) => setZ({ ...z, bounds: { ...b, maxLat: n } }))}
            {field('West edge (min longitude)', b.minLng, (n) => setZ({ ...z, bounds: { ...b, minLng: n } }))}
            {field('East edge (max longitude)', b.maxLng, (n) => setZ({ ...z, bounds: { ...b, maxLng: n } }))}
          </div>
          <p className="text-[11px] text-gray-500">The default covers the whole {YELLAPUR_ZONE.radiusKm} km Yellapur delivery area.</p>
          {field('Estimated delivery shown to customers (minutes)', z.etaMinutes, (n) => setZ({ ...z, etaMinutes: n }))}
        </div>

        <button onClick={save} disabled={busy || !valid} className="w-full py-4 rounded-2xl bg-[#e11d48] text-white font-black disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-5 h-5 animate-spin" />} Save
        </button>
      </main>
    </div>
  );
}
