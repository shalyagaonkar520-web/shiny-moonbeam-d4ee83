import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Loader2, LogOut, MapPinned } from 'lucide-react';
import { auth, db, firebaseReady } from '../firebase';
import { useSEO } from '../utils/seo';
import { staffSignIn } from '../lib/staffSignIn';
import { friendlyAuthError } from '../lib/authErrors';
import { LPU_CITY_ID, LPU_DEFAULTS, useZoneStore, type LpuZone } from '../lib/zones';
import LiveMap from './LiveMap';

/**
 * /admin/lpu: JIS sets the LPU delivery zone. Writes cities/lpu, which the
 * Firestore rules read to accept or refuse every LPU order, so a change here
 * takes effect for the backend at once and for customers on their next visit.
 */
export default function LpuZoneAdmin() {
  useSEO('LPU zone settings', 'Mintoo LPU delivery zone.');
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
          <p className="font-black">Only the super admin can change the LPU zone.</p>
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
        <p className="text-lg font-black">LPU zone settings</p>
        <p className="text-xs text-gray-500">Super admin sign in</p>
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
        <button disabled={busy} className="w-full py-3.5 rounded-xl bg-[#e11d48] text-white font-black disabled:opacity-60">Sign in</button>
      </form>
    </div>
  );
}

function Editor() {
  const [z, setZ] = useState<LpuZone | null>(null);
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'cities', LPU_CITY_ID)).then((s) => {
      setExists(s.exists());
      const d: any = s.data() || {};
      setZ({
        active: d.active === true && d.riderDirect === true,
        name: d.name || LPU_DEFAULTS.name,
        bounds: d.deliveryBounds || LPU_DEFAULTS.bounds,
        pickup: d.pickupLocation ? { label: LPU_DEFAULTS.pickup.label, ...d.pickupLocation } : LPU_DEFAULTS.pickup,
        etaMinutes: d.etaMinutes || LPU_DEFAULTS.etaMinutes,
      });
    });
  }, []);

  if (!z) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#e11d48]" /></div>;

  const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
  const b = z.bounds;
  const valid =
    [b.minLat, b.maxLat, b.minLng, b.maxLng, z.pickup.lat, z.pickup.lng].every((n) => Number.isFinite(n)) &&
    b.minLat < b.maxLat && b.minLng < b.maxLng && z.etaMinutes > 0 && z.etaMinutes < 180 && z.name.trim().length > 0;

  const save = async () => {
    if (!valid) return toast.error('Check the numbers: each minimum must be below its maximum.');
    setBusy(true);
    try {
      await setDoc(doc(db, 'cities', LPU_CITY_ID), {
        name: z.name.trim(),
        active: z.active,
        riderDirect: true,
        deliveryBounds: { minLat: b.minLat, maxLat: b.maxLat, minLng: b.minLng, maxLng: b.maxLng },
        pickupLocation: { lat: z.pickup.lat, lng: z.pickup.lng, label: z.pickup.label.trim() || 'Pickup point' },
        etaMinutes: z.etaMinutes,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      useZoneStore.getState().setLpu({ ...z });
      setExists(true);
      toast.success(z.active ? 'Saved. LPU is taking orders.' : 'Saved. LPU is switched off.');
    } catch (e: any) {
      toast.error(e?.code === 'permission-denied' ? 'Refused by the database. Deploy the new panel rules first.' : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

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
          <MapPinned className="w-6 h-6 text-[#e11d48]" />
          <p className="flex-1 font-black">LPU delivery zone</p>
          <button onClick={() => signOut(auth)} className="p-2 rounded-xl bg-gray-100" aria-label="Sign out"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-3">
        {!exists && <p className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">The LPU zone has not been saved yet. Check the values below and press Save.</p>}

        <div className="bg-white rounded-2xl border border-rose-100 p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="font-black">{z.active ? 'Taking LPU orders' : 'LPU switched off'}</p>
            <p className="text-xs text-gray-500">Off: customers at LPU are told deliveries are paused, and the database refuses LPU orders.</p>
          </div>
          <button onClick={() => setZ({ ...z, active: !z.active })} className={`relative w-14 h-8 rounded-full ${z.active ? 'bg-emerald-500' : 'bg-gray-300'}`} aria-label="LPU on or off">
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${z.active ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <LiveMap pickup={z.pickup} drop={null} className="h-72 rounded-2xl overflow-hidden border border-rose-100" />

        <div className="bg-white rounded-2xl border border-rose-100 p-4 space-y-3">
          <p className="font-black text-sm">Delivery rectangle (orders outside it are refused)</p>
          <div className="grid grid-cols-2 gap-2">
            {field('South edge (min latitude)', b.minLat, (n) => setZ({ ...z, bounds: { ...b, minLat: n } }))}
            {field('North edge (max latitude)', b.maxLat, (n) => setZ({ ...z, bounds: { ...b, maxLat: n } }))}
            {field('West edge (min longitude)', b.minLng, (n) => setZ({ ...z, bounds: { ...b, minLng: n } }))}
            {field('East edge (max longitude)', b.maxLng, (n) => setZ({ ...z, bounds: { ...b, maxLng: n } }))}
          </div>
          <p className="font-black text-sm pt-2">Rider pickup point</p>
          <div className="grid grid-cols-2 gap-2">
            {field('Latitude', z.pickup.lat, (n) => setZ({ ...z, pickup: { ...z.pickup, lat: n } }))}
            {field('Longitude', z.pickup.lng, (n) => setZ({ ...z, pickup: { ...z.pickup, lng: n } }))}
          </div>
          <label className="block">
            <span className="text-[11px] font-bold text-gray-600">Pickup point name (shown to riders)</span>
            <input defaultValue={z.pickup.label} onChange={(e) => setZ({ ...z, pickup: { ...z.pickup, label: e.target.value } })} className="mt-0.5 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {field('Estimated delivery (minutes)', z.etaMinutes, (n) => setZ({ ...z, etaMinutes: n }))}
            <label className="block">
              <span className="text-[11px] font-bold text-gray-600">Zone name</span>
              <input defaultValue={z.name} onChange={(e) => setZ({ ...z, name: e.target.value })} className="mt-0.5 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
            </label>
          </div>
        </div>

        <button onClick={save} disabled={busy || !valid} className="w-full py-4 rounded-2xl bg-[#e11d48] text-white font-black disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-5 h-5 animate-spin" />} Save LPU zone
        </button>
      </main>
    </div>
  );
}
