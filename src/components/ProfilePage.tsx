import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Phone, 
  Save, 
  ChevronLeft, 
  HelpCircle, 
  MessageCircle, 
  ShoppingBag, 
  Clock, 
  Cake, 
  HeartHandshake, 
  CheckCircle2,
  LogIn,
  LogOut,
  Gift,
  Sparkles,
  PackageSearch,
  ShieldCheck,
  Home as HomeIcon,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import AuthModal from './AuthModal';
import { toStage, Stage, STAGE_STEPS } from '../lib/orderStage';

const normalizePhone = (v: string | undefined | null) => String(v || '').replace(/\D/g, '').slice(-10);
const stageLabel = (stage: Stage) =>
  stage === 'cancelled' ? 'Cancelled' : STAGE_STEPS.find((s) => s.key === stage)?.label || 'Placed';
const STAGE_CHIP: Record<Stage, string> = {
  placed: 'text-blue-700 bg-blue-50',
  preparing: 'text-amber-700 bg-amber-50',
  out_for_delivery: 'text-[#e11d48] bg-rose-50',
  delivered: 'text-emerald-700 bg-emerald-50',
  cancelled: 'text-gray-600 bg-gray-100',
};

export default function ProfilePage() {
  useSEO("My Account - Minto", "Manage your profile, delivery address, and contact customer support.");
  const navigate = useNavigate();
  const { user, profile, logout } = useAuthStore();
  const { deliveryLocation } = useLocationStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  // Live stage per order id from /api/track; the local copy is only a fallback.
  const [liveStages, setLiveStages] = useState<Record<string, Stage>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Load user data on mount
  useEffect(() => {
    const savedName = localStorage.getItem('mintoo_user_name') || profile?.name || user?.displayName || '';
    const savedPhone = localStorage.getItem('mintoo_user_phone') || profile?.phone || user?.phoneNumber || '';
    const savedAddress = localStorage.getItem('mintoo_user_address') || deliveryLocation?.address || '';

    setName(savedName);
    setPhone(savedPhone);
    setAddress(savedAddress);

    // Recent orders saved on this device. When a phone is known, only that
    // number's orders are listed, so a shared family phone doesn't mix accounts.
    try {
      const storedOrders: any[] = JSON.parse(localStorage.getItem('mintoo_orders') || '[]');
      const myPhone = normalizePhone(savedPhone);
      const mine = storedOrders
        .filter((o) => o && o.id)
        .filter((o) => !myPhone || normalizePhone(o.userPhone) === myPhone)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(mine);
    } catch (e) {
      console.error('Failed to load orders', e);
    }
  }, [profile, user, deliveryLocation]);

  // Refresh the status of the orders actually shown.
  const shownIds = orders.slice(0, 5).map((o) => o.id).join(',');
  useEffect(() => {
    if (!shownIds) return;
    let cancelled = false;
    Promise.all(
      shownIds.split(',').map((id) =>
        fetch(`/api/track?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((body) => (body?.ok && body.order?.stage ? [id, body.order.stage as Stage] as const : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, Stage> = {};
      results.forEach((r) => { if (r) next[r[0]] = r[1]; });
      setLiveStages(next);
    });
    return () => {
      cancelled = true;
    };
  }, [shownIds]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    localStorage.setItem('mintoo_user_name', name.trim());
    localStorage.setItem('mintoo_user_phone', phone.trim());
    if (address.trim()) {
      localStorage.setItem('mintoo_user_address', address.trim());
    }

    setIsSaved(true);
    toast.success('Profile details saved successfully! ✅');
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4]/70 via-[#fff8fa]/60 to-[#ffffff] text-gray-900 pb-36 pt-3 px-3.5 sm:px-6">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center gap-3 py-2 px-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-700 hover:text-gray-900 active:scale-90 transition-all cursor-pointer shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-snug">
              My Account
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">
              Profile details & customer support
            </p>
          </div>
        </div>

        {/* Sign In / Account Status Card */}
        {user || profile ? (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200/80 rounded-[24px] p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#e11d48] text-white flex items-center justify-center text-base shadow-xs shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Logged In As
                </span>
                <span className="text-xs sm:text-sm font-black text-gray-900 line-clamp-1">
                  {profile?.name || user?.displayName || 'Active Account'}
                </span>
                {(profile?.walletBalance ?? 0) > 0 && (
                  <span className="text-[10px] font-bold text-[#e11d48] block mt-0.5">
                    Wallet: ₹{profile?.walletBalance}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  toast.success('Logged out successfully');
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
              >
                Log Out
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200/80 rounded-[24px] p-4 text-left flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#e11d48] text-white flex items-center justify-center text-lg shadow-xs shrink-0">
                🍲
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
                  Welcome to Minto
                </h3>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                  Sign in to track your orders & delivery addresses
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#ff4d6d] to-[#e11d48] text-white font-black text-[11px] uppercase tracking-wider shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              Sign In
            </button>
          </div>
        )}

        {/* 1. Profile Details Card (Editable & Workable) */}
        <form onSubmit={handleSave} className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-4 text-left">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#ff4d6d] to-[#ff758f] text-white flex items-center justify-center text-xl font-black shadow-md shadow-rose-500/20 shrink-0">
              {name ? name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 leading-snug">
                {name || 'Your Profile'}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {phone || 'No phone added yet'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full p-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                required
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full p-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                Delivery Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / Flat No, Street, Landmark, Yellapur"
                className="w-full p-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 resize-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff4d6d] to-[#e11d48] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Details</span>
              </>
            )}
          </button>
        </form>

        {/* 2. Customer Support & Help Section (Numbers: 9606001790, 9483235488) */}
        <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-3.5 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#e11d48] flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight leading-snug">
                Need Help or Have Questions?
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Contact our kitchen team directly for instant support
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Contact 1 */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-50/60 to-pink-50/40 border border-rose-100/80 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider block">
                  Kitchen Support 1
                </span>
                <span className="text-xs sm:text-sm font-black text-gray-900">
                  +91 9606001790
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="tel:+919606001790"
                  className="p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-xs flex items-center justify-center"
                  title="Call Now"
                  aria-label="Call Now"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href="https://wa.me/919606001790?text=Hi%2C%20I%20need%20help%20with%20Mom%27s%20Magic!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-xs flex items-center justify-center"
                  title="WhatsApp"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Contact 2 */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-50/60 to-pink-50/40 border border-rose-100/80 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider block">
                  Kitchen Support 2
                </span>
                <span className="text-xs sm:text-sm font-black text-gray-900">
                  +91 9483235488
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="tel:+919483235488"
                  className="p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-xs flex items-center justify-center"
                  title="Call Now"
                  aria-label="Call Now"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href="https://wa.me/919483235488?text=Hi%2C%20I%20need%20help%20with%20Mom%27s%20Magic!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-xs flex items-center justify-center"
                  title="WhatsApp"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Quick Links Card */}
        <div className="bg-white rounded-[26px] p-4 border border-rose-100/90 shadow-sm space-y-2 text-left">
          <button
            onClick={() => navigate('/bulk')}
            className="w-full p-2.5 rounded-xl hover:bg-rose-50/50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Cake className="w-4 h-4 text-[#e11d48]" />
              <span className="text-xs font-bold text-gray-800">Cakes & Birthday Specials</span>
            </div>
            <span className="text-gray-500 text-xs" aria-hidden="true">→</span>
          </button>

          <button
            onClick={() => navigate('/feedback')}
            className="w-full p-2.5 rounded-xl hover:bg-rose-50/50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <HeartHandshake className="w-4 h-4 text-[#e11d48]" />
              <span className="text-xs font-bold text-gray-800">Send Kitchen Feedback</span>
            </div>
            <span className="text-gray-500 text-xs" aria-hidden="true">→</span>
          </button>
        </div>

        {/* 4. Recent Orders History */}
        <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-3 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#e11d48]" /> Recent Orders
            </h3>
            {orders.length > 0 && (
              <span className="text-[10px] font-bold text-gray-500">
                {orders.length} orders
              </span>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-500">No orders placed yet</p>
              <button
                onClick={() => navigate('/food')}
                className="mt-2 text-xs font-bold text-[#e11d48] hover:underline cursor-pointer"
              >
                Order your first meal →
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 divide-y divide-gray-100">
              {orders.slice(0, 5).map((order) => {
                const stage = liveStages[order.id] || toStage(order);
                return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => navigate(`/track/${encodeURIComponent(order.id)}`)}
                  aria-label={`Track order, ${stageLabel(stage)}`}
                  className="w-full pt-2.5 first:pt-0 flex items-center justify-between gap-2 text-left cursor-pointer active:opacity-70"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 line-clamp-1">
                      {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ') || 'Food Order'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-gray-900">
                      ₹{order.payableAmount || order.grandTotal || 0}
                    </p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STAGE_CHIP[stage]}`}>
                      {stageLabel(stage)}
                    </span>
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Tracking, privacy and account deletion */}
        <div className="bg-white rounded-[26px] p-2.5 border border-rose-100/90 shadow-sm text-left">
          <button
            onClick={() => navigate('/addresses')}
            className="w-full p-2.5 rounded-xl hover:bg-rose-50/50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <HomeIcon className="w-4 h-4 text-[#e11d48]" />
              <span className="text-xs font-bold text-gray-800">Saved Addresses</span>
            </div>
            <span className="text-gray-500 text-xs" aria-hidden="true">→</span>
          </button>
          <button
            onClick={() => navigate('/track')}
            className="w-full p-2.5 rounded-xl hover:bg-rose-50/50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <PackageSearch className="w-4 h-4 text-[#e11d48]" />
              <span className="text-xs font-bold text-gray-800">Track an Order</span>
            </div>
            <span className="text-gray-500 text-xs" aria-hidden="true">→</span>
          </button>
          <button
            onClick={() => navigate('/privacy')}
            className="w-full p-2.5 rounded-xl hover:bg-rose-50/50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#e11d48]" />
              <span className="text-xs font-bold text-gray-800">Privacy Policy</span>
            </div>
            <span className="text-gray-500 text-xs" aria-hidden="true">→</span>
          </button>
          <button
            onClick={() => navigate('/delete-account')}
            className="w-full p-2.5 rounded-xl hover:bg-red-50/60 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-600">Delete Account</span>
            </div>
            <span className="text-gray-500 text-xs" aria-hidden="true">→</span>
          </button>
        </div>

      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
