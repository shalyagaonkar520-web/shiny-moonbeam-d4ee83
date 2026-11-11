import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Bike, ChevronRight, LayoutDashboard, LogOut, Shirt, Store } from 'lucide-react';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { useSEO } from '../utils/seo';
import { DIRECT_CITY_ID } from '../lib/zones';

/**
 * /admin/home: where the super admin lands after signing in on the normal
 * Mintoo login. One sign-in for everything: each button opens a page that
 * uses this same session, so nothing asks for the password again.
 */
export default function StaffHome() {
  useSEO('Admin home - Mintoo', 'Mintoo admin.');
  const navigate = useNavigate();
  const profile: any = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const [riderOn, setRiderOn] = useState<boolean | null>(null);
  const isSuper = String(profile?.role || '').toUpperCase() === 'SUPER_ADMIN';

  // Seen once this visit: the profile page will not send the owner back here.
  useEffect(() => {
    if (!isSuper || !user) return;
    try {
      sessionStorage.setItem('mm_admin_home_shown', user.uid);
    } catch {
      /* storage blocked */
    }
  }, [isSuper, user]);

  useEffect(() => {
    if (!isSuper) return;
    return onSnapshot(doc(db, 'cities', DIRECT_CITY_ID), (s) => setRiderOn(s.data()?.riderDirect === true && s.data()?.active !== false), () => setRiderOn(null));
  }, [isSuper]);

  if (!user || !isSuper) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-[#fff5f7]">
        <div className="space-y-3 max-w-xs">
          <p className="font-black text-gray-900">Admin home</p>
          <p className="text-sm text-gray-600">Sign in on the normal Mintoo login with your super admin account to open this page.</p>
          <button onClick={() => navigate('/login')} className="w-full py-3 rounded-2xl bg-[#e11d48] text-white font-bold text-sm">Sign in</button>
        </div>
      </div>
    );
  }

  const Tile = ({ icon, title, sub, to }: { icon: React.ReactNode; title: string; sub: string; to: string }) => (
    <button onClick={() => navigate(to)} className="w-full bg-white rounded-3xl border border-rose-100 p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#e11d48] flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#fff5f7] pb-16">
      <header className="bg-white border-b border-rose-100">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-[#e11d48]" />
          <div className="flex-1 min-w-0">
            <p className="font-black">Admin home</p>
            <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
          </div>
          <button onClick={() => signOut(auth).then(() => navigate('/'))} className="p-2 rounded-xl bg-gray-100" aria-label="Sign out"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-3">
        <Tile
          icon={<Bike className="w-6 h-6" />}
          title="Rider delivery (ID Partner)"
          sub={riderOn === null ? 'Switch on or off' : riderOn ? 'ON · new orders ring on ID Partner' : 'OFF · orders go to the panel as usual'}
          to="/admin/rider-delivery"
        />
        <Tile icon={<Shirt className="w-6 h-6" />} title="Men's wear shop" sub="Stock, sizes, prices, open or close" to="/admin/menswear" />
        <Tile icon={<Store className="w-6 h-6" />} title="Owner dashboard" sub="Shop timings, settings, orders" to="/admin" />
        <button onClick={() => navigate('/')} className="w-full text-center text-sm font-bold text-gray-500 py-3">Go to the shop</button>
      </main>
    </div>
  );
}
