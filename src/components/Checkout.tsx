import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useBulkOrderStore } from '../store/bulkOrderStore';
import { useLocationStore } from '../store/locationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MapPin, Ticket, Calendar, ShieldCheck, ChevronLeft, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCityStore } from '../store/cityStore';
import { calculateDeliveryCharge } from '../types';
import { useSystemStore } from '../store/systemStore';
import { playSound, SOUNDS } from '../utils/audio';
import { useSEO } from '../utils/seo';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const TELEGRAM_BOT_TOKEN = '8828362126:AAGbOzb8Q9Jhi29Bp6sQ_Q6hRo4Xj2SGfQg';
const TELEGRAM_CHAT_ID   = '-1003803637741';
const WHATSAPP_BULK_NUMBER = '917483187572';
const WHATSAPP_FOOD_NUMBER = '919606001790';

const escHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Sends a Telegram message. Tries server proxy first, falls back to direct API call.
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
      console.error('Telegram notification error:', e);
    }
  }
}

export default function Checkout() {
  useSEO('Cart & Checkout', 'Review your cart with zero hidden fees and finalize delivery at Mom\'s Magic.');
  const navigate = useNavigate();
  const isBulkOrder = localStorage.getItem('moms_magic_order_type') === 'bulk';

  const { items: cartItems, total: cartTotal, clearCart, updateQuantity } = useCartStore();
  const bulkStore = useBulkOrderStore();
  const { bulkItems, getGrandTotal: getBulkTotal, cake, decoration, additionalServices, resetBulkOrder } = bulkStore;

  const { selectedCity } = useCityStore();
  const { deliveryLocation, openLocationPicker } = useLocationStore();
  const [formData, setFormData] = useState({ name: '', phone: '', additionalMessage: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const settings = useSystemStore((s) => s.settings);

  const { user, profile, deductWalletBalance } = useAuthStore();
  const [useWallet, setUseWallet] = useState(false);
  const [customWalletAmount, setCustomWalletAmount] = useState('');

  // Payment method: defaults to COD; locked if distance > 5km
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('cod');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');

  // User preferences matching screenshot
  const [needCutlery, setNeedCutlery] = useState(false);
  const [showCookingRequest, setShowCookingRequest] = useState(false);

  const activeItems = isBulkOrder
    ? [...bulkItems, ...cartItems.map((item) => ({ ...item, finalQuantity: item.quantity } as any))]
    : cartItems;
  const subtotal = isBulkOrder ? getBulkTotal() + cartTotal : cartTotal;

  const distanceKm = deliveryLocation?.distance ?? 0;
  const baseDeliveryCharge = calculateDeliveryCharge(distanceKm);

  // Free delivery logic
  const now = new Date();
  const isBeforeTwo = now.getHours() < 14;
  const activeCoupons = settings.coupons || [];
  const appliedCouponDetails = appliedCoupon ? activeCoupons.find(c => c.code.toUpperCase() === appliedCoupon) : null;

  const isTillJuly1st = new Date() < new Date('2026-07-02T00:00:00');
  const isFreeDelivery = (appliedCouponDetails?.type === 'free_delivery') || isBeforeTwo || isTillJuly1st;
  const freeDeliveryReason = appliedCouponDetails?.type === 'free_delivery' 
    ? `${appliedCouponDetails.code} Promo` 
    : isTillJuly1st 
    ? 'Free Delivery till July 1st 🎉' 
    : isBeforeTwo 
    ? 'Free Before 2 PM 🎉' 
    : '';
  const deliveryCharge = isFreeDelivery ? 0 : baseDeliveryCharge;

  let couponDiscount = 0;
  if (appliedCouponDetails) {
    if (appliedCouponDetails.type === 'fixed_discount') {
      couponDiscount = appliedCouponDetails.value;
    } else if (appliedCouponDetails.type === 'percent_discount') {
      couponDiscount = (subtotal * appliedCouponDetails.value) / 100;
    }
  }

  // Pure logic: NO PLATFORM FEE, NO HOTEL FEE, NO EXTRA FEES, NO TAX. Only food total + delivery - discounts.
  const grandTotal = Math.max(0, subtotal + deliveryCharge - couponDiscount);

  const maxWalletDeduction = user && profile ? Math.min(profile.walletBalance, grandTotal) : 0;
  
  let walletDeduction = 0;
  if (user && profile && useWallet) {
    const inputAmount = parseFloat(customWalletAmount);
    if (!isNaN(inputAmount) && inputAmount > 0) {
      walletDeduction = Math.min(inputAmount, maxWalletDeduction);
    } else if (customWalletAmount === '') {
      walletDeduction = maxWalletDeduction;
    }
  }

  const payableAmount = Math.max(0, grandTotal - walletDeduction);

  const handleApplyCoupon = () => {
    const inputUpper = couponInput.trim().toUpperCase();
    const matchedCoupon = activeCoupons.find(c => c.code.toUpperCase() === inputUpper && c.isActive);

    if (matchedCoupon) {
      if (subtotal >= matchedCoupon.minOrderValue) {
        setAppliedCoupon(matchedCoupon.code.toUpperCase());
        let msg = `${matchedCoupon.code} applied! `;
        if (matchedCoupon.type === 'free_delivery') msg += 'Free Delivery!';
        else if (matchedCoupon.type === 'fixed_discount') msg += `₹${matchedCoupon.value} off!`;
        else if (matchedCoupon.type === 'percent_discount') msg += `${matchedCoupon.value}% off!`;
        toast.success(msg);
      } else {
        toast.error(`${matchedCoupon.code} is valid only for orders above ₹${matchedCoupon.minOrderValue}`);
      }
    } else {
      setAppliedCoupon('');
      toast.error('Invalid or expired promo code');
    }
  };

  React.useEffect(() => { window.scrollTo(0, 0); }, []);

  // Check store open & restore saved user info
  React.useEffect(() => {
    const adminToken = localStorage.getItem('moms_magic_admin_token');
    const userPhone  = localStorage.getItem('moms_magic_user_phone');
    const isAdmin =
      adminToken === 'mock-jwt-admin-token-123456' ||
      userPhone === '+917483187572' ||
      userPhone === '+919606001790' ||
      userPhone === '7483187572' ||
      userPhone === '9606001790';

    // Time lock / closure restrictions removed - always open
    const savedName    = localStorage.getItem('moms_magic_user_name');
    const savedPhone   = localStorage.getItem('moms_magic_user_phone');
    if (savedName || savedPhone) {
      setFormData((prev) => ({ 
        ...prev, 
        name: savedName || '', 
        phone: savedPhone || '' 
      }));
    }
  }, [settings, navigate]);

  // Payment Method Rule:
  // Default is COD. If distance > 5km, lock COD and select Online.
  React.useEffect(() => {
    const dist = deliveryLocation?.distance ?? 0;
    if (dist > 5) {
      setPaymentMethod('online');
    } else {
      // Keep COD as default
      setPaymentMethod('cod');
    }
  }, [deliveryLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (activeItems.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!deliveryLocation) {
      toast.error('Please select a delivery location');
      openLocationPicker();
      return;
    }
    if (deliveryLocation.distance > 12) {
      toast.error('Sorry, we deliver up to 12 km from our kitchen.');
      return;
    }
    if (distanceKm > 5 && paymentMethod === 'cod') {
      toast.error('Cash on Delivery is unavailable for deliveries over 5 km. Please choose Pay Online.');
      return;
    }

    localStorage.setItem('moms_magic_user_name',  formData.name.trim());
    localStorage.setItem('moms_magic_user_phone', formData.phone.trim());

    const mapsViewLink = `https://www.google.com/maps?q=${deliveryLocation.lat},${deliveryLocation.lng}`;
    const mapsNavLink  = `https://www.google.com/maps/dir/?api=1&destination=${deliveryLocation.lat},${deliveryLocation.lng}`;

    const buildWaMessage = (paymentId?: string) => {
      let orderDetails = '';
      if (isBulkOrder) {
        const decos = [
          decoration.balloons > 0 && `${decoration.balloons}x Balloons`,
          decoration.spray    > 0 && `${decoration.spray}x Spray`,
          decoration.candles  > 0 && `${decoration.candles}x Candles`,
        ].filter(Boolean).join(', ');
        orderDetails = [
          `🛒 *FOOD ITEMS:*`,
          bulkItems.map((i) => `• ${i.name} (${i.finalQuantity} units)`).join('\n'),
          cake.required ? `🎂 *Cake:* ${cake.size} - "${cake.text}"` : '',
          decos         ? `🎈 *Decorations:* ${decos}` : '',
          additionalServices.disposablePlates ? `🍽️ Disposable plates added` : '',
          additionalServices.setupServing     ? `👨‍🍳 Setup & Serving team added` : '',
        ].filter(Boolean).join('\n');
      } else {
        orderDetails = `🛒 *ITEMS:*\n` + cartItems.map((item) => {
          let line = `• ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`;
          if (item.items?.length) line += `\n  (${item.items.join(', ')})`;
          return line;
        }).join('\n');
      }

      return [
        isBulkOrder ? `🎉 *NEW EVENT ORDER!* 🎉` : `📦 *NEW ORDER - MOM'S MAGIC!* 📦`,
        ``,
        `👤 *Name:* ${formData.name.trim()}`,
        `📞 *Phone:* ${formData.phone.trim()}`,
        `📍 *City:* ${selectedCity?.name || 'Yellapur'}`,
        `🏠 *Address:* ${deliveryLocation.address}`,
        `📏 *Distance:* ${distanceKm} km`,
        ``,
        orderDetails,
        ``,
        `💰 *Cart Total:* ₹${subtotal.toFixed(2)}`,
        `🚚 *Delivery Fee:* ${isFreeDelivery ? `FREE (${freeDeliveryReason})` : `₹${deliveryCharge.toFixed(2)}`}`,
        couponDiscount > 0 ? `🎟️ *Coupon Discount:* -₹${couponDiscount.toFixed(2)}` : '',
        walletDeduction > 0 ? `🎁 *Wallet Used:* -₹${walletDeduction.toFixed(2)}` : '',
        `💵 *TOTAL PAYABLE:* ₹${payableAmount.toFixed(2)}`,
        paymentId ? `✅ *PAYMENT:* Paid Online (${paymentId})` : `💵 *PAYMENT:* Cash on Delivery (COD)`,
        needCutlery ? `🍴 *Cutlery:* Requested` : `🌱 *Cutlery:* Not needed`,
        formData.additionalMessage.trim() ? `📝 *Cooking / Delivery Note:* ${formData.additionalMessage.trim()}` : '',
        ``,
        `🗺️ *View Map:* ${mapsViewLink}`,
        `🚗 *Navigate:* ${mapsNavLink}`,
        ``,
        `━━━━━━━━━━━━━━━━`,
        `🍽️ *Mom's Magic - All Orders*`,
        `👉 https://momsmagic.shop`,
        `━━━━━━━━━━━━━━━━`,
      ].filter((l) => l !== '').join('\n');
    };

    const buildTgMessage = (paymentId?: string) => {
      let tgDetails = '';
      if (isBulkOrder) {
        tgDetails = bulkItems.map((i) => `• ${escHtml(i.name)} (${i.finalQuantity} units)`).join('\n');
      } else {
        tgDetails = cartItems.map((item) => `• ${item.quantity}x ${escHtml(item.name)} (₹${item.price * item.quantity})`).join('\n');
      }

      return [
        isBulkOrder ? `🎉 <b>NEW EVENT ORDER!</b>` : `📦 <b>NEW FOOD ORDER!</b>`,
        ``,
        `👤 <b>Name:</b> ${escHtml(formData.name.trim())}`,
        `📞 <b>Phone:</b> ${escHtml(formData.phone.trim())}`,
        `🏠 <b>Address:</b> ${escHtml(deliveryLocation.address)}`,
        `📏 <b>Distance:</b> ${distanceKm} km`,
        ``,
        `🛒 <b>Items:</b>\n${tgDetails}`,
        ``,
        `💰 <b>Subtotal:</b> ₹${subtotal.toFixed(2)}`,
        `🚚 <b>Delivery Fee:</b> ${isFreeDelivery ? `₹0 (${freeDeliveryReason})` : `₹${deliveryCharge.toFixed(2)}`}`,
        couponDiscount > 0 ? `🎟️ <b>Coupon:</b> -₹${couponDiscount.toFixed(2)}` : '',
        walletDeduction > 0 ? `🎁 <b>Wallet:</b> -₹${walletDeduction.toFixed(2)}` : '',
        `💵 <b>TOTAL PAYABLE:</b> ₹${payableAmount.toFixed(2)}`,
        paymentId ? `✅ <b>Payment:</b> Online (${escHtml(paymentId)})` : `💵 <b>Payment:</b> Cash on Delivery (COD)`,
        formData.additionalMessage.trim() ? `📝 <b>Note:</b> ${escHtml(formData.additionalMessage.trim())}` : '',
        ``,
        `🗺️ <a href="${mapsViewLink}">View Customer Location on Map</a>`,
      ].filter((l) => l !== '').join('\n');
    };

    const completeOrder = async (paymentId?: string) => {
      const orderId = Date.now().toString();
      
      if (user && walletDeduction > 0) {
        await deductWalletBalance(walletDeduction, orderId);
      }

      const waMsg    = buildWaMessage(paymentId);
      const tgMsg    = buildTgMessage(paymentId);
      const waNumber = isBulkOrder ? WHATSAPP_BULK_NUMBER : WHATSAPP_FOOD_NUMBER;
      const waUrl    = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`;

      try {
        const order = {
          id: orderId,
          userId: user?.uid || null,
          userName: formData.name.trim(),
          userPhone: formData.phone.trim(),
          orderType: isBulkOrder ? 'bulk' : 'regular',
          items: activeItems,
          subtotal,
          deliveryCharge,
          grandTotal,
          payableAmount,
          paymentMethod: payableAmount === 0 ? 'wallet' : paymentMethod,
          paymentId: paymentId || null,
          deliveryLocation,
          status: 'pending',
          needCutlery,
          instructions: formData.additionalMessage.trim(),
          createdAt: new Date().toISOString(),
        };

        await Promise.race([
          setDoc(doc(db, 'orders', orderId), order),
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);

        const existing = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
        existing.unshift(order);
        localStorage.setItem('moms_magic_orders', JSON.stringify(existing));
      } catch (err) {
        console.error('Failed to store order:', err);
      }

      sendTelegramMessage(tgMsg).catch(console.error);

      if (isBulkOrder) {
        resetBulkOrder();
        localStorage.removeItem('moms_magic_order_type');
      } else {
        clearCart();
      }

      playSound(SOUNDS.ORDER_SUCCESS);
      toast.success('🎉 Order confirmed! Opening WhatsApp to send order...');

      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.location.href = waUrl;
      }, 500);
    };

    if (payableAmount > 0 && paymentMethod === 'online') {
      const loadRazorpay = () =>
        new Promise<boolean>((resolve) => {
          const script  = document.createElement('script');
          script.src    = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

      setIsSubmitting(true);
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Failed to load online payment gateway. Please check connection.');
        setIsSubmitting(false);
        return;
      }

      const options = {
        key: 'rzp_live_T1Y1yu09Jbjo6b',
        amount: Math.round(payableAmount * 100),
        currency: 'INR',
        name: "Mom's Magic",
        description: 'Delicious Homestyle Food Order',
        handler: async (response: any) => {
          await completeOrder(response.razorpay_payment_id);
          setIsSubmitting(false);
        },
        prefill: { name: formData.name, contact: formData.phone },
        theme: { color: '#ff4d6d' },
        modal: { ondismiss: () => setIsSubmitting(false) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (r: any) => {
        toast.error('Payment Failed: ' + r.error.description);
        setIsSubmitting(false);
      });
      rzp.open();
    } else {
      setIsSubmitting(true);
      try {
        await completeOrder(undefined);
      } catch (err) {
        console.error(err);
        toast.error('Failed to complete order. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  // Empty Cart State
  if (activeItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff1f4]/70 via-[#fff8fa]/60 to-[#ffffff] text-gray-900 pb-32 pt-8 px-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-rose-100 space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-[#ff4d6d] flex items-center justify-center mx-auto shadow-inner">
            <Ticket className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Your Cart is Empty</h2>
          <p className="text-xs text-gray-500">
            Explore Mom's Magic menu and add your favorite dishes to place an order!
          </p>
          <button
            onClick={() => navigate('/food')}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#ff4d6d] to-[#e11d48] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Browse Food Menu →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4]/70 via-[#fff8fa]/60 to-[#ffffff] text-gray-900 pb-36 pt-3 px-3 sm:px-6">
      <div className="max-w-md mx-auto space-y-3.5">
        
        {/* 1. TOP HEADER (MATCHING SCREENSHOT) */}
        <div className="flex items-center justify-between py-1.5 px-1">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-700 hover:text-gray-900 active:scale-90 transition-all cursor-pointer shrink-0"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div 
              onClick={openLocationPicker} 
              className="cursor-pointer group select-none text-left"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-[13px] font-black text-gray-900 tracking-tight">
                  Current Location
                </span>
                <span className="text-[#ff4d6d] text-[10px]">▼</span>
                <span className="text-gray-300 text-xs">•</span>
                <span className="text-[11px] font-bold text-gray-600">30-40 mins</span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium truncate max-w-[210px] sm:max-w-xs mt-0.5 group-hover:text-rose-600 transition-colors">
                {deliveryLocation?.address || '471, 10th Cross Road, Neeladri Nagar, Yellapur'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. PINK BANNER: NO CONFUSING FEES. NO HIDDEN CHARGES (MATCHING SCREENSHOT) */}
        <div className="bg-[#ff2e74] text-white py-2.5 px-4 rounded-2xl shadow-sm text-center">
          <p className="text-xs sm:text-[13px] font-black tracking-wide">
            No confusing fees. No hidden charges.
          </p>
        </div>

        {/* 3. RESTAURANT & ITEMS CARD (MATCHING SCREENSHOT) */}
        <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-4 text-left">
          
          {/* Restaurant Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-rose-100 shadow-xs shrink-0 bg-rose-50 p-1 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Mom's Magic"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 leading-snug">
                Mom's Magic - All Orders
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                {deliveryLocation ? deliveryLocation.address.split(',')[0] : 'Yellapur'} • {activeItems.length} items
              </p>
            </div>
          </div>

          {/* Items List with - 1 + Pill Stepper & Strikethrough Pricing */}
          <div className="space-y-3.5 divide-y divide-gray-50">
            {activeItems.map((item) => {
              const qty = isBulkOrder ? (item as any).finalQuantity : (item as any).quantity;
              const originalPrice = Math.round(item.price * 1.25);

              return (
                <div key={item.id} className="pt-3 first:pt-0 flex items-start justify-between gap-2.5">
                  {/* Left: Veg/Non-Veg icon + Item Details */}
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span
                      className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 mt-0.5 ${
                        item.isVeg ? 'border-emerald-600' : 'border-rose-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                    </span>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-[13px] font-bold text-gray-900 leading-snug truncate">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                        Add customization <span className="text-[8px]">▼</span>
                      </p>
                    </div>
                  </div>

                  {/* Center: Stepper Pill */}
                  <div className="flex items-center gap-2 px-2.5 py-0.5 bg-rose-50/60 border border-rose-150 rounded-full shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, qty - 1)}
                      className="text-[#e11d48] hover:text-rose-800 text-sm font-black active:scale-75 transition-transform cursor-pointer px-1"
                      aria-label="Decrease"
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-gray-800 min-w-[14px] text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, qty + 1)}
                      className="text-[#e11d48] hover:text-rose-800 text-sm font-black active:scale-75 transition-transform cursor-pointer px-1"
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>

                  {/* Right: Prices */}
                  <div className="text-right shrink-0 min-w-[55px]">
                    <p className="text-[10px] text-gray-400 line-through">
                      ₹{originalPrice * qty}
                    </p>
                    <p className="text-xs sm:text-sm font-black text-gray-900">
                      ₹{item.price * qty}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add More Items Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/food')}
              className="px-4 py-1.5 rounded-full border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>+ Add more items</span>
            </button>
          </div>
        </div>

        {/* 4. BILL DETAILS CARD (MATCHING SCREENSHOT WITH NO CONFUSING FEES) */}
        <div className="bg-gradient-to-br from-[#ffdbe6]/35 via-[#ffeef3]/25 to-white rounded-[26px] p-4 sm:p-5 border border-rose-200/70 shadow-sm space-y-3 text-left">
          <div className="flex justify-between items-center text-xs sm:text-[13px] font-medium text-gray-700 bg-rose-50/70 p-2.5 rounded-xl border border-rose-300 ring-1 ring-rose-200/50 shadow-2xs">
            <span className="font-bold text-gray-700">Cart Total</span>
            <span className="font-black text-gray-900 text-sm">₹{subtotal.toFixed(2)}</span>
          </div>

          {/* Delivery Fees (Why this?) */}
          <div className="flex justify-between items-center text-xs sm:text-[13px] font-medium text-gray-700">
            <div className="flex items-center gap-1">
              <span>Delivery Fees</span>
              <span 
                className="text-[#ff2e74] text-[11px] font-bold cursor-pointer underline"
                title={`Delivery charge calculated based on actual distance: ${distanceKm} km`}
              >
                (Why this?)
              </span>
            </div>
            <div className="text-right">
              {isFreeDelivery ? (
                <div className="flex items-center gap-1.5">
                  <span className="line-through text-gray-400 text-[11px]">
                    ₹{baseDeliveryCharge > 0 ? baseDeliveryCharge.toFixed(2) : '25.00'}
                  </span>
                  <span className="text-emerald-600 font-black text-xs uppercase">FREE</span>
                </div>
              ) : (
                <span className="font-bold text-gray-900">₹{deliveryCharge.toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Platform fees */}
          <div className="flex justify-between items-center text-xs sm:text-[13px] font-medium text-gray-400">
            <span className="line-through">Platform fees</span>
            <span className="text-[11px] font-bold text-gray-600">We're not those guys</span>
          </div>

          {/* Packaging Fees */}
          <div className="flex justify-between items-center text-xs sm:text-[13px] font-medium text-gray-400">
            <span className="line-through">Packaging Fees</span>
            <span className="text-[11px] font-bold text-gray-600">Seriously? Nope</span>
          </div>

          {/* Coupon Discount */}
          {couponDiscount > 0 && (
            <div className="flex justify-between items-center text-xs sm:text-[13px] font-medium text-emerald-600">
              <span>Coupon Discount ({appliedCoupon})</span>
              <span className="font-black">-₹{couponDiscount.toFixed(2)}</span>
            </div>
          )}

          {/* Wallet Deduction */}
          {walletDeduction > 0 && (
            <div className="flex justify-between items-center text-xs sm:text-[13px] font-medium text-emerald-600">
              <span>Wallet Discount</span>
              <span className="font-black">-₹{walletDeduction.toFixed(2)}</span>
            </div>
          )}

          {/* Total Payable */}
          <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
            <span className="text-sm sm:text-base font-black text-gray-900">Total Payable</span>
            <span className="text-xl sm:text-2xl font-black text-[#e11d48]">
              ₹{payableAmount.toFixed(2)}
            </span>
          </div>

          {/* CERTIFIED NO NONSENSE Pink Badge (EXACT FROM SCREENSHOT) */}
          <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50/70 to-rose-50 border border-rose-200/80 flex items-center justify-between gap-2.5">
            <p className="text-xs font-bold text-gray-700 leading-snug">
              Somewhere, an app just invented a new fee. <span className="text-[#e11d48] font-black">Not us.</span>
            </p>

            {/* Pink Certified Stamp Badge */}
            <div className="shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-[#e11d48] bg-white flex flex-col items-center justify-center p-1 text-center shadow-xs rotate-[-5deg]">
              <span className="text-[6.5px] font-black text-[#e11d48] tracking-widest uppercase leading-none">
                CERTIFIED
              </span>
              <span className="text-sm font-black text-[#e11d48] my-0.5 leading-none">
                ✔
              </span>
              <span className="text-[6px] font-black text-[#e11d48] tracking-tight uppercase leading-none">
                NO NONSENSE
              </span>
            </div>
          </div>
        </div>

        {/* 5. CHECKBOXES (NEED CUTLERY & COOKING REQUEST) */}
        <div className="bg-white rounded-[24px] p-4 border border-rose-100/90 shadow-sm space-y-3 text-left">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={needCutlery}
              onChange={(e) => setNeedCutlery(e.target.checked)}
              className="w-4 h-4 rounded accent-[#e11d48] cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-800">
              Need cutlery (Help keep our planet green)
            </span>
          </label>

          <div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCookingRequest}
                onChange={(e) => setShowCookingRequest(e.target.checked)}
                className="w-4 h-4 rounded accent-[#e11d48] cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-800">
                Cooking request (e.g. less spicy, extra gravy)
              </span>
            </label>

            {showCookingRequest && (
              <textarea
                rows={2}
                value={formData.additionalMessage}
                onChange={(e) => setFormData({ ...formData, additionalMessage: e.target.value })}
                placeholder="Write instructions for the chef..."
                className="mt-2.5 w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 resize-none font-medium"
              />
            )}
          </div>
        </div>

        {/* 6. USER DETAILS FORM */}
        <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-3.5 text-left">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Delivery Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Your Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your name"
                className="w-full p-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">WhatsApp Phone</label>
              <input
                type="tel"
                required
                inputMode="numeric"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 XXXXXXXXXX"
                className="w-full p-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
              />
            </div>
          </div>

          {/* Delivery Location Summary */}
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                  {deliveryLocation?.address || 'Please select your delivery location'}
                </p>
                <p className="text-[10px] font-semibold text-gray-500 mt-0.5">
                  Distance: {distanceKm} km
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openLocationPicker}
              className="text-xs font-black text-[#e11d48] hover:underline shrink-0 cursor-pointer"
            >
              Change
            </button>
          </div>
        </div>

        {/* 7. PAYMENT METHOD: DEFAULT COD, LOCKED IF > 5KM */}
        <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-3 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Payment Method
            </h3>
            {distanceKm > 5 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                <Lock className="w-3 h-3" /> COD Locked (&gt;5km)
              </span>
            )}
          </div>

          {distanceKm > 5 && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-semibold leading-relaxed">
              ⚠️ Delivery distance is {distanceKm} km (more than 5 km). Cash on Delivery is locked. Please pay online via UPI, GPay or Card.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* COD Option (Default for <= 5km) */}
            <button
              type="button"
              disabled={distanceKm > 5}
              onClick={() => {
                if (distanceKm > 5) {
                  toast.error('COD is not available for deliveries beyond 5 km.');
                  return;
                }
                setPaymentMethod('cod');
              }}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                distanceKm > 5
                  ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400'
                  : paymentMethod === 'cod'
                  ? 'bg-rose-50 border-[#e11d48] text-[#e11d48] ring-2 ring-rose-300/40 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-xs font-black">Cash on Delivery</div>
              <div className="text-[10px] font-medium mt-0.5">
                {distanceKm > 5 ? '🔒 Locked' : 'Default (Pay on delivery)'}
              </div>
            </button>

            {/* Online Payment Option */}
            <button
              type="button"
              onClick={() => setPaymentMethod('online')}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                paymentMethod === 'online'
                  ? 'bg-rose-50 border-[#e11d48] text-[#e11d48] ring-2 ring-rose-300/40 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-xs font-black">Pay Online</div>
              <div className="text-[10px] font-medium mt-0.5">UPI, GPay, Cards</div>
            </button>
          </div>
        </div>

        {/* 8. PROMO CODE ACCORDION */}
        <div className="bg-white rounded-[24px] p-4 border border-rose-100/90 shadow-sm space-y-2 text-left">
          <label className="block text-[10px] font-bold text-gray-500 uppercase">Apply Promo Code</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="ENTER PROMO CODE"
              className="flex-1 p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-wider hover:bg-black transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
          {appliedCoupon && (
            <p className="text-xs font-bold text-emerald-600">
              ✅ Promo {appliedCoupon} applied!
            </p>
          )}
        </div>

        {/* 9. SUBMIT / PLACE ORDER BUTTON */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || activeItems.length === 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff4d6d] via-[#f43f5e] to-[#e11d48] text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Placing Order...</span>
            </>
          ) : (
            <>
              <span>Confirm Order • ₹{payableAmount.toFixed(2)}</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-gray-400 text-[10px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>100% Safe & Secure Order Guarantee</span>
        </div>

      </div>
    </div>
  );
}
