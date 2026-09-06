import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, MapPin, Send, Plus, Minus, CheckCircle2, ShieldCheck, Truck, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { useCityStore } from '../store/cityStore';
import { useAuthStore } from '../store/authStore';
import { useSystemStore } from '../store/systemStore';
import { calculateDeliveryCharge } from '../types';
import { playSound, SOUNDS } from '../utils/audio';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import DeliveryAnimation from './DeliveryAnimation';

const TELEGRAM_BOT_TOKEN = '8828362126:AAGbOzb8Q9Jhi29Bp6sQ_Q6hRo4Xj2SGfQg';
const TELEGRAM_CHAT_ID   = '-1003803637741';

const escHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function sendTelegramMessage(text: string): Promise<void> {
  const payload = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' });

  const direct = () =>
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).then(async (r) => {
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error((d as any).description || 'Telegram direct error');
      }
    });

  const proxyWithTimeout = (): Promise<boolean> =>
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 8000);
      fetch('/api/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        keepalive: true,
      })
        .then((r) => { clearTimeout(timer); resolve(r.ok); })
        .catch(() => { clearTimeout(timer); resolve(false); });
    });

  try {
    const proxyOk = await proxyWithTimeout();
    if (!proxyOk) {
      await direct();
    }
  } catch {
    try {
      await direct();
    } catch (e) {
      console.error('❌ Telegram message error:', e);
    }
  }
}

export default function HomeOrderConfirmation() {
  const navigate = useNavigate();
  const { items, total, updateQuantity, clearCart } = useCartStore();
  const { deliveryLocation, openLocationPicker } = useLocationStore();
  const { selectedCity } = useCityStore();
  const { user, profile } = useAuthStore();
  const settings = useSystemStore((s) => s.settings);

  const [formData, setFormData] = useState({
    name: localStorage.getItem('moms_magic_user_name') || profile?.name || '',
    phone: localStorage.getItem('moms_magic_user_phone') || profile?.phone || '',
    note: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (!formData.name && profile.name) setFormData(prev => ({ ...prev, name: profile.name }));
      if (!formData.phone && profile.phone) setFormData(prev => ({ ...prev, phone: profile.phone }));
    }
  }, [profile]);

  if (items.length === 0) return null;

  const distanceKm = deliveryLocation?.distance ?? 2.5;
  const deliveryCalc = calculateDeliveryCharge(distanceKm, false, selectedCity || undefined);
  const deliveryCharge = total >= 499 ? 0 : deliveryCalc.deliveryCharge;
  const rainyFee = settings.isRainySeason ? (settings.rainySeasonFee || 10) : 0;
  const grandTotal = total + deliveryCharge + rainyFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!deliveryLocation) {
      toast.error('Please choose a delivery location');
      openLocationPicker();
      return;
    }

    setIsSubmitting(true);
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();

    try {
      localStorage.setItem('moms_magic_user_name', formData.name.trim());
      localStorage.setItem('moms_magic_user_phone', formData.phone.trim());

      const orderData = {
        id: orderId,
        orderId: orderId,
        userId: user?.uid || null,
        userName: formData.name.trim(),
        userPhone: formData.phone.trim(),
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        subtotal: total,
        deliveryCharge,
        rainyFee,
        grandTotal,
        paymentMethod,
        status: 'pending',
        address: deliveryLocation.address,
        lat: deliveryLocation.lat,
        lng: deliveryLocation.lng,
        distanceKm,
        note: formData.note.trim(),
        createdAt: new Date().toISOString()
      };

      // 1. Save locally
      const existingOrders = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
      existingOrders.unshift(orderData);
      localStorage.setItem('moms_magic_orders', JSON.stringify(existingOrders));

      // 2. Save to Firestore
      await setDoc(doc(db, 'orders', orderId), orderData).catch((err) => {
        console.warn('Firestore write warning:', err);
      });

      // 3. Send Telegram Notification
      const mapsViewLink = `https://www.google.com/maps?q=${deliveryLocation.lat},${deliveryLocation.lng}`;
      const mapsNavLink  = `https://www.google.com/maps/dir/?api=1&destination=${deliveryLocation.lat},${deliveryLocation.lng}`;

      const tgText = [
        `🍽️ <b>NEW HOME ORDER PLACED!</b> 🍽️`,
        `🆔 <b>Order:</b> #${orderId}`,
        `👤 <b>Customer:</b> ${escHtml(formData.name.trim())}`,
        `📞 <b>Phone:</b> ${escHtml(formData.phone.trim())}`,
        `🏠 <b>Address:</b> ${escHtml(deliveryLocation.address)} (${distanceKm}km)`,
        ``,
        `🛒 <b>ITEMS:</b>`,
        items.map(i => `• ${i.quantity}x ${escHtml(i.name)} (₹${i.price * i.quantity})`).join('\n'),
        ``,
        `💰 <b>Subtotal:</b> ₹${total}`,
        `🚚 <b>Delivery:</b> ₹${deliveryCharge}`,
        rainyFee > 0 ? `🌧️ <b>Rain Fee:</b> ₹${rainyFee}` : '',
        `💵 <b>GRAND TOTAL:</b> ₹${grandTotal}`,
        `💳 <b>Payment:</b> ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}`,
        formData.note.trim() ? `📝 <b>Note:</b> ${escHtml(formData.note.trim())}` : '',
        ``,
        `🗺️ <b>Map View:</b> ${escHtml(mapsViewLink)}`,
        `🚗 <b>Navigate:</b> ${escHtml(mapsNavLink)}`,
      ].filter(Boolean).join('\n');

      sendTelegramMessage(tgText);

      // 4. Audio sound & Clear Cart
      playSound(SOUNDS.ORDER_SUCCESS);
      clearCart();
      setPlacedOrderId(orderId);
      toast.success('Order confirmed successfully! 🍳');
    } catch (err) {
      console.error('Order error:', err);
      toast.error('Failed to confirm order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="confirm-order" className="max-w-3xl mx-auto px-4 sm:px-6 my-12 relative z-20">
      {placedOrderId && (
        <DeliveryAnimation orderId={placedOrderId} onClose={() => navigate(`/track/${placedOrderId}`)} />
      )}

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0B0E14] border border-[#4CD964]/30 rounded-[35px] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden relative"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#4CD964]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
          <div className="space-y-1">
            <span className="text-[#4CD964] text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Direct Home Checkout
            </span>
            <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white">
              Confirm Your Order
            </h2>
          </div>
          <span className="bg-[#4CD964]/10 text-[#4CD964] border border-[#4CD964]/20 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-auto">
            {items.reduce((a, b) => a + b.quantity, 0)} Items Selected
          </span>
        </div>

        <form onSubmit={handlePlaceOrder} className="space-y-6">
          {/* 1. Ordered Items List */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white/50 mb-2">Selected Dishes</h3>
            <div className="space-y-2.5 divide-y divide-white/5">
              {items.map((item) => (
                <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-white/40 font-medium">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-2 py-1">
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="text-white/60 hover:text-white p-1"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black text-white px-2.5">{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="text-white/60 hover:text-white p-1"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-black text-[#4CD964] min-w-[50px] text-right">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Your Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-[#4CD964]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">WhatsApp Mobile Number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit mobile number"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-[#4CD964]"
              />
            </div>
          </div>

          {/* 3. Delivery Address */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Delivery Address</label>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-[#4CD964] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white truncate max-w-sm sm:max-w-md">
                    {deliveryLocation ? deliveryLocation.address : 'Select delivery location'}
                  </p>
                  <p className="text-[10px] text-white/40 font-medium">Distance: {distanceKm} km</p>
                </div>
              </div>
              <button
                type="button"
                onClick={openLocationPicker}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0"
              >
                Change Pin 📍
              </button>
            </div>
          </div>

          {/* 4. Payment Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider border text-center transition-all cursor-pointer ${
                  paymentMethod === 'cod'
                    ? 'bg-[#4CD964]/10 border-[#4CD964] text-[#4CD964]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                💵 Cash on Delivery
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('online')}
                className={`py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider border text-center transition-all cursor-pointer ${
                  paymentMethod === 'online'
                    ? 'bg-[#4CD964]/10 border-[#4CD964] text-[#4CD964]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                📱 UPI / Online Pay
              </button>
            </div>
          </div>

          {/* 5. Bill Summary */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex justify-between text-xs text-white/60 font-medium">
              <span>Dishes Subtotal</span>
              <span>₹{total}</span>
            </div>
            <div className="flex justify-between text-xs text-white/60 font-medium">
              <span>Delivery Charges</span>
              <span>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
            </div>
            {rainyFee > 0 && (
              <div className="flex justify-between text-xs text-white/60 font-medium">
                <span>Rain Fee</span>
                <span>₹{rainyFee}</span>
              </div>
            )}
            <div className="h-px bg-white/10 my-2" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-black uppercase tracking-wider text-white">Grand Total</span>
              <span className="text-2xl font-black italic text-[#4CD964]">₹{grandTotal}</span>
            </div>
          </div>

          {/* 6. Confirm Order CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ y: -4, scale: 1.04 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-[#4CD964] hover:bg-[#3AC152] text-black font-black text-xs uppercase tracking-widest shadow-xl shadow-[#4CD964]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Confirming Order...
              </>
            ) : (
              <>
                <span>Confirm & Place Order (₹{grandTotal})</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
