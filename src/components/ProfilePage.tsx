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
  CheckCircle2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';

export default function ProfilePage() {
  useSEO("My Account - Mom's Magic", "Manage your profile, delivery address, and contact customer support.");
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { deliveryLocation } = useLocationStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // Load user data on mount
  useEffect(() => {
    const savedName = localStorage.getItem('moms_magic_user_name') || profile?.name || user?.displayName || '';
    const savedPhone = localStorage.getItem('moms_magic_user_phone') || profile?.phone || user?.phoneNumber || '';
    const savedAddress = localStorage.getItem('moms_magic_user_address') || deliveryLocation?.address || '';

    setName(savedName);
    setPhone(savedPhone);
    setAddress(savedAddress);

    // Load recent orders from localStorage
    try {
      const storedOrders = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
      setOrders(storedOrders);
    } catch (e) {
      console.error('Failed to load orders', e);
    }
  }, [profile, user, deliveryLocation]);

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

    localStorage.setItem('moms_magic_user_name', name.trim());
    localStorage.setItem('moms_magic_user_phone', phone.trim());
    if (address.trim()) {
      localStorage.setItem('moms_magic_user_address', address.trim());
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

        {/* 2. Customer Support & Help Section (Numbers: 7483187572, 9483235488) */}
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
                  +91 7483187572
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="tel:+917483187572"
                  className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-xs flex items-center justify-center"
                  title="Call Now"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://wa.me/917483187572?text=Hi%2C%20I%20need%20help%20with%20Mom%27s%20Magic!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-xs flex items-center justify-center"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
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
                  className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-xs flex items-center justify-center"
                  title="Call Now"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://wa.me/919483235488?text=Hi%2C%20I%20need%20help%20with%20Mom%27s%20Magic!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-xs flex items-center justify-center"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
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
            <span className="text-gray-400 text-xs">→</span>
          </button>

          <button
            onClick={() => navigate('/feedback')}
            className="w-full p-2.5 rounded-xl hover:bg-rose-50/50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <HeartHandshake className="w-4 h-4 text-[#e11d48]" />
              <span className="text-xs font-bold text-gray-800">Send Kitchen Feedback</span>
            </div>
            <span className="text-gray-400 text-xs">→</span>
          </button>
        </div>

        {/* 4. Recent Orders History */}
        <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-3 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#e11d48]" /> Recent Orders
            </h3>
            {orders.length > 0 && (
              <span className="text-[10px] font-bold text-gray-400">
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
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-gray-900 line-clamp-1">
                      {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ') || 'Food Order'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
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
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Confirmed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
