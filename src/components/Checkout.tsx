import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { openExternal } from '../lib/openExternal';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useBulkOrderStore } from '../store/bulkOrderStore';
import { useLocationStore, SERVICE_RADIUS_KM } from '../store/locationStore';
import CheckoutSavedAddresses from './CheckoutSavedAddresses';
import { getOrderPushToken, askForOrderUpdates } from '../lib/push';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MapPin, Ticket, Calendar, ShieldCheck, ChevronLeft, Loader2, Lock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCityStore } from '../store/cityStore';
import { calculateDeliveryCharge } from '../types';
import { useSystemStore } from '../store/systemStore';
import { playSound, SOUNDS } from '../utils/audio';
import { useSEO } from '../utils/seo';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getItemHotelTag, getItemHotel, getOrderHotelName, getOrderHotelId, groupItemsByHotel } from '../utils/orderHotels';
import DishImage from './DishImage';
import { notifyTelegram } from '../lib/notifyTelegram';
import { couponDiscountFor, couponGivesFreeDelivery, istHour, normaliseIndianMobile, CouponRule } from '../lib/pricing';
import {
  placeOrderOnServer,
  verifyPaymentOnServer,
  orderErrorMessage,
  loadRazorpay,
  preconnectRazorpay,
} from '../lib/checkoutApi';

// Publishable Razorpay key id (safe in the browser). The server returns the
// key that matches the order it created; this is the fallback path's key.
const RAZORPAY_KEY_ID = 'rzp_live_T1Y1yu09Jbjo6b';

// { orderId, at } of an online payment that was opened but not finished here.
const PENDING_PAYMENT_KEY = 'mintoo_pending_payment';

// Every order -- food and bulk alike -- goes to this one WhatsApp number.
const WHATSAPP_ORDER_NUMBER = '919606001790';

// Marker for a deliberate blank line in an order message. Conditional lines collapse
// to '' and get filtered out; without this sentinel the filter also ate every blank
// line and the message arrived as one unreadable block of text.
const GAP = '__GAP__';

const escHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomIdSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
}

export default function Checkout() {
  useSEO('Cart & Checkout', 'Review your cart with zero hidden fees and finalize delivery at Mom\'s Magic.');
  const navigate = useNavigate();

  const { items: cartItems, total: cartTotal, clearCart, updateQuantity } = useCartStore();
  const bulkStore = useBulkOrderStore();
  const { bulkItems, getGrandTotal: getBulkTotal, cake, decoration, additionalServices, resetBulkOrder } = bulkStore;
  // Party mode comes from what is actually in the party list. It used to be a
  // localStorage flag set just by opening the Cakes tab, which then turned
  // every later normal order into an "event order" (no packaging fee, no
  // prices on the ticket, cart never cleared).
  const isBulkOrder = bulkItems.length > 0;

  const { selectedCity } = useCityStore();
  const { deliveryLocation, openLocationPicker } = useLocationStore();
  const [formData, setFormData] = useState({ name: '', phone: '', additionalMessage: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Set while a UPI payment is in flight; drives the waiting screen below. */
  const [upiPayment, setUpiPayment] = useState<{
    orderId: string;
    amount: number;
    link: string | null;
    qr: string | null;
    vpa: string | null;
    onPaid: (paymentId: string) => void;
  } | null>(null);
  const [upiElapsed, setUpiElapsed] = useState(0);

  // Poll the server while a UPI payment is outstanding.
  //
  // The customer is in GPay or PhonePe and may never return to this tab, so
  // there is no callback to wait for. The server learns the payment happened
  // from /api/shalya-webhook and this asks it, every few seconds, until it
  // says yes. The browser never decides this for itself: `paid` here comes
  // straight from the order document the webhook wrote.
  React.useEffect(() => {
    if (!upiPayment) return;

    let stopped = false;
    const startedAt = Date.now();
    const GIVE_UP_MS = 10 * 60 * 1000;

    const tick = async () => {
      if (stopped) return;
      setUpiElapsed(Math.floor((Date.now() - startedAt) / 1000));

      try {
        const res = await fetch(`/api/payment-status?id=${encodeURIComponent(upiPayment.orderId)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const body = await res.json();
          if (body?.paid && !stopped) {
            stopped = true;
            const paidOrder = upiPayment;
            setUpiPayment(null);
            paidOrder.onPaid(paidOrder.orderId);
            return;
          }
        }
      } catch {
        // Offline or the tunnel is down; keep trying, the order is already
        // placed server-side and the webhook can still land.
      }

      if (!stopped && Date.now() - startedAt < GIVE_UP_MS) {
        timer = window.setTimeout(tick, 4000);
      }
    };

    let timer = window.setTimeout(tick, 2500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [upiPayment]);
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

  // Free delivery logic (same rules as api/_pricing.js)
  const activeCoupons = (settings.coupons || []) as CouponRule[];
  const appliedCouponDetails = appliedCoupon ? activeCoupons.find(c => c.code.toUpperCase() === appliedCoupon) : null;
  const isBeforeTwo = istHour() < 14;
  const freeByCoupon = couponGivesFreeDelivery(appliedCouponDetails, subtotal);
  const isFreeDelivery = freeByCoupon || isBeforeTwo;
  const freeDeliveryReason = freeByCoupon
    ? `${appliedCouponDetails!.code} Promo`
    : isBeforeTwo
    ? 'Free Before 2 PM 🎉'
    : '';
  const deliveryCharge = isFreeDelivery ? 0 : baseDeliveryCharge;

  // Re-checked on every render: dropping below the minimum or the admin
  // switching the coupon off removes the discount instead of leaving a ₹0 order.
  const couponDiscount = couponDiscountFor(appliedCouponDetails, subtotal);
  const couponShortfall =
    appliedCouponDetails && appliedCouponDetails.isActive && subtotal < appliedCouponDetails.minOrderValue
      ? appliedCouponDetails.minOrderValue - subtotal
      : 0;

  // Packaging fee rule: Only Hotel Mumtaz has ₹10 packaging fee, all other hotels/orders have ₹0
  const hasMumtaz = !isBulkOrder && cartItems.some(
    (i) => i.hotelId === 'mumtaz' || i.id?.startsWith('mumtaz-') || (i.description && i.description.includes('Hotel Mumtaz'))
  );
  const packagingFee = hasMumtaz ? 10 : 0;

  // Pure logic: NO PLATFORM FEE, NO EXTRA FEES, NO TAX. Only food total + delivery + packaging - discounts.
  const grandTotal = Math.max(0, subtotal + deliveryCharge + packagingFee - couponDiscount);

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

  // What the bill shows as "You're saving". Only genuine savings: a delivery
  // charge that was waived, and any coupon. Wallet money is the customer's own.
  const orderSavings = (isFreeDelivery ? baseDeliveryCharge : 0) + couponDiscount;

  // Hotel shown in the on-screen order summary. Derived from the items so it stays
  // in step with the WhatsApp and Telegram messages and the saved order.
  const summaryHotelName = getOrderHotelName(activeItems);

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

  // If Android killed the app while the customer was paying in their UPI app,
  // the payment may have gone through (the Razorpay webhook marks it paid)
  // while the cart here is still full. Check before letting them pay again.
  React.useEffect(() => {
    let pending: { orderId: string; at: number } | null = null;
    try { pending = JSON.parse(localStorage.getItem(PENDING_PAYMENT_KEY) || 'null'); } catch { /* ignore */ }
    if (!pending?.orderId || Date.now() - pending.at > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      return;
    }
    fetch(`/api/track?id=${encodeURIComponent(pending.orderId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.order?.paymentStatus !== 'completed') return;
        localStorage.removeItem(PENDING_PAYMENT_KEY);
        clearCart();
        toast.success('Your payment went through. Here is your order.');
        navigate(`/track/${pending!.orderId}`, { replace: true });
      })
      .catch(() => {});
  }, []);

  // Clear the old party flag left on devices by previous versions.
  React.useEffect(() => {
    if (!isBulkOrder) localStorage.removeItem('mintoo_order_type');
  }, [isBulkOrder]);

  React.useEffect(() => {
    if (paymentMethod === 'online') {
      preconnectRazorpay();
      loadRazorpay();
    }
  }, [paymentMethod]);

  // Check store open & restore saved user info
  React.useEffect(() => {
    // Time lock / closure restrictions removed - always open
    const savedName    = localStorage.getItem('mintoo_user_name');
    const savedPhone   = localStorage.getItem('mintoo_user_phone');
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
  // Only forces a change when COD becomes impossible; picking another address
  // must not silently switch a customer's "Pay Online" back to COD.
  React.useEffect(() => {
    if ((deliveryLocation?.distance ?? 0) > 5) setPaymentMethod('online');
  }, [deliveryLocation?.distance]);

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
    const phone = normaliseIndianMobile(formData.phone);
    if (!phone) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!deliveryLocation) {
      toast.error('Please select a delivery location');
      openLocationPicker();
      return;
    }
    if (deliveryLocation.distance > SERVICE_RADIUS_KM) {
      toast.error(`Sorry, we deliver up to ${SERVICE_RADIUS_KM} km from our kitchen.`);
      return;
    }
    if (distanceKm > 5 && paymentMethod === 'cod') {
      toast.error('Cash on Delivery is unavailable for deliveries over 5 km. Please choose Pay Online.');
      return;
    }

    const customerName = formData.name.trim();
    localStorage.setItem('mintoo_user_name', customerName);
    localStorage.setItem('mintoo_user_phone', phone);

    const mapsViewLink = `https://maps.google.com/?q=${deliveryLocation.lat},${deliveryLocation.lng}`;
    const mapsNavLink  = `https://maps.google.com/maps?daddr=${deliveryLocation.lat},${deliveryLocation.lng}`;

    // The id is the only thing guarding /track/<id>, which shows the delivery
    // address, so a bare timestamp (guessable to the millisecond) is not enough.
    // The timestamp prefix keeps ids sortable; the random tail makes them
    // unguessable.
    const orderId = `${Date.now()}${randomIdSuffix(10)}`;
    const trackUrl = `https://momsmagic.shop/track/${orderId}`;
    const pushToken = getOrderPushToken();
    if (!pushToken) askForOrderUpdates();
    const wantsOnline = payableAmount > 0 && paymentMethod === 'online';

    type Totals = { subtotal: number; packagingFee: number; deliveryCharge: number; couponDiscount: number; payable: number };
    const clientTotals: Totals = { subtotal, packagingFee, deliveryCharge, couponDiscount, payable: payableAmount };

    const buildWaMessage = (totals: Totals, paymentId?: string) => {
      // activeItems so a party order that also has hotel dishes still names the hotel.
      const hotelName = getOrderHotelName(activeItems);

      let orderDetails = '';
      if (isBulkOrder) {
        const decos = [
          decoration.balloons > 0 && `${decoration.balloons}x Balloons`,
          decoration.spray    > 0 && `${decoration.spray}x Spray`,
          decoration.candles  > 0 && `${decoration.candles}x Candles`,
        ].filter(Boolean).join(', ');
        // activeItems, not bulkItems: a party order can also carry normal cart items,
        // and listing only bulkItems dropped those item names from the message.
        orderDetails = [
          `🛒 *FOOD ITEMS:*`,
          activeItems.map((i: any) => {
            const qty = i.finalQuantity ?? i.quantity ?? 1;
            const unit = i.finalQuantity != null ? ' units' : '';
            return `• ${i.name}${getItemHotelTag(i)} (${qty}${unit})`;
          }).join('\n'),
          cake.required ? `🎂 *Cake:* ${cake.size} - "${cake.text}"` : '',
          decos         ? `🎈 *Decorations:* ${decos}` : '',
          additionalServices.disposablePlates ? `🍽️ Disposable plates added` : '',
          additionalServices.setupServing     ? `👨‍🍳 Setup & Serving team added` : '',
        ].filter(Boolean).join('\n');
      } else {
        orderDetails = `🛒 *ITEMS:*\n` + cartItems.map((item) => {
          let line = `• ${item.quantity}x ${item.name}${getItemHotelTag(item)} - ₹${item.price * item.quantity}`;
          if (item.items?.length) line += `\n  (${item.items.join(', ')})`;
          return line;
        }).join('\n');
      }

      return [
        isBulkOrder
          ? `🎉 *NEW EVENT ORDER!* 🎉`
          : hotelName
          ? `🏨 *NEW ORDER - ${hotelName.toUpperCase()}!* 🏨`
          : `📦 *NEW ORDER - MINTOO!* 📦`,
        `🆔 *Order:* ${orderId}`,
        GAP,
        hotelName ? `🏨 *Hotel:* ${hotelName}` : '',
        `👤 *Name:* ${customerName}`,
        `📞 *Phone:* ${phone}`,
        `📍 *City:* ${selectedCity?.name || 'Yellapur'}`,
        `🏠 *Address:* ${deliveryLocation.address}`,
        `📏 *Distance:* ${distanceKm} km`,
        GAP,
        orderDetails,
        GAP,
        `💰 *Cart Total:* ₹${totals.subtotal.toFixed(2)}`,
        totals.packagingFee > 0 ? `📦 *Packaging Fee (Hotel Mumtaz):* ₹${totals.packagingFee.toFixed(2)}` : '',
        `🚚 *Delivery Fee:* ${totals.deliveryCharge === 0 ? `FREE${freeDeliveryReason ? ` (${freeDeliveryReason})` : ''}` : `₹${totals.deliveryCharge.toFixed(2)}`}`,
        totals.couponDiscount > 0 ? `🎟️ *Coupon Discount:* -₹${totals.couponDiscount.toFixed(2)}` : '',
        `💵 *TOTAL PAYABLE:* ₹${totals.payable.toFixed(2)}`,
        paymentId ? `✅ *PAYMENT:* Paid Online (${paymentId})` : `💵 *PAYMENT:* Cash on Delivery (COD)`,
        needCutlery ? `🍴 *Cutlery:* Requested` : `🌱 *Cutlery:* Not needed`,
        formData.additionalMessage.trim() ? `📝 *Cooking / Delivery Note:* ${formData.additionalMessage.trim()}` : '',
        GAP,
        `🗺️ *View Map:* ${mapsViewLink}`,
        `🚗 *Navigate:* ${mapsNavLink}`,
        `📍 *Track:* ${trackUrl}`,
        GAP,
        `━━━━━━━━━━━━━━━━`,
        hotelName ? `🏨 *${hotelName} Order via Mintoo*` : `🍽️ *Mintoo - All Orders*`,
        `👉 https://momsmagic.shop`,
        `━━━━━━━━━━━━━━━━`,
      ].filter((l) => l !== '').map((l) => (l === GAP ? '' : l)).join('\n');
    };

    // Only used when /api/place-order is unavailable; the server builds its own.
    const buildTgMessage = (paymentId?: string) => {
      const hotelName = getOrderHotelName(activeItems);
      const tgDetails = activeItems.map((item: any) => {
        const qty = item.finalQuantity ?? item.quantity ?? 1;
        return `• ${qty}x ${escHtml(item.name)}${escHtml(getItemHotelTag(item))} (₹${item.price * qty})`;
      }).join('\n');

      return [
        hotelName ? `🏨 <b>NEW ORDER - ${escHtml(hotelName.toUpperCase())}!</b> 🏨` : `📦 <b>NEW FOOD ORDER!</b>`,
        `🆔 <code>${orderId}</code>`,
        GAP,
        `👤 <b>Name:</b> ${escHtml(customerName)}`,
        `📞 <b>Phone:</b> ${escHtml(phone)}`,
        `🏠 <b>Address:</b> ${escHtml(deliveryLocation.address)}`,
        `📏 <b>Distance:</b> ${distanceKm} km`,
        GAP,
        `🛒 <b>Items:</b>\n${tgDetails}`,
        GAP,
        `💰 <b>Subtotal:</b> ₹${subtotal.toFixed(2)}`,
        packagingFee > 0 ? `📦 <b>Packaging Fee (Hotel Mumtaz):</b> ₹${packagingFee.toFixed(2)}` : '',
        `🚚 <b>Delivery Fee:</b> ${isFreeDelivery ? `₹0 (${freeDeliveryReason})` : `₹${deliveryCharge.toFixed(2)}`}`,
        couponDiscount > 0 ? `🎟️ <b>Coupon:</b> -₹${couponDiscount.toFixed(2)}` : '',
        `💵 <b>TOTAL PAYABLE:</b> ₹${payableAmount.toFixed(2)}`,
        paymentId
          ? `⚠️ <b>Payment:</b> Online, NOT VERIFIED by the server. Confirm ${escHtml(paymentId)} in the Razorpay dashboard before cooking`
          : `💵 <b>Payment:</b> Cash on Delivery (COD)`,
        formData.additionalMessage.trim() ? `📝 <b>Note:</b> ${escHtml(formData.additionalMessage.trim())}` : '',
        GAP,
        `🗺️ <a href="${mapsViewLink}">View Customer Location on Map</a>`,
        `🚗 <a href="${mapsNavLink}">Start Navigation</a>`,
        `📍 <a href="${trackUrl}">Tracking page</a>`,
      ].filter((l) => l !== '').map((l) => (l === GAP ? '' : l)).join('\n');
    };

    /** Hand-off once an order exists: save a copy, empty the cart, open tracking and WhatsApp. */
    const finish = (orders: any[], totals: Totals, paymentId?: string) => {
      try {
        const existing = JSON.parse(localStorage.getItem('mintoo_orders') || '[]');
        orders.forEach((o) => existing.unshift(o));
        localStorage.setItem('mintoo_orders', JSON.stringify(existing.slice(0, 50)));
      } catch {
        /* storage full: tracking still works from the server */
      }

      if (isBulkOrder) resetBulkOrder();
      clearCart();
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      setIsSubmitting(false);

      playSound(SOUNDS.ORDER_SUCCESS);
      toast.success('🎉 Order placed! Opening WhatsApp to send it to the kitchen...');

      // Tracking is what the customer sees when they come back from WhatsApp.
      navigate(`/track/${orderId}`, { replace: true });
      // One hand-off. Clicking an anchor and then also navigating loaded
      // WhatsApp's web page over the app inside the Android WebView.
      openExternal(`https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${encodeURIComponent(buildWaMessage(totals, paymentId))}`);
    };

    /**
     * Fallback when /api/place-order is not reachable or not configured yet:
     * write the order from the browser, as before. Such orders are never
     * marked paid; an online payment is recorded as "unverified" for the team
     * to check in the Razorpay dashboard.
     */
    const writeOrderFromBrowser = async (clientPaymentId?: string) => {
      const groups = groupItemsByHotel(activeItems);
      const nowIso = new Date().toISOString();
      let discountLeft = couponDiscount;

      const orders = groups.map((group, index) => {
        const isPrimary = index === 0;
        const isLast = index === groups.length - 1;
        // Packaging is Hotel Mumtaz's own charge, so it rides with Mumtaz.
        const groupPackagingFee = group.hotelId === 'mumtaz' ? packagingFee : 0;
        const groupDelivery = isPrimary ? deliveryCharge : 0;
        // The discount is spread by subtotal so the orders always add up to
        // exactly what the customer pays (the last one takes the rounding).
        const share = isLast ? discountLeft : Math.round((couponDiscount * group.subtotal) / (subtotal || 1));
        const groupDiscount = Math.min(share, discountLeft);
        discountLeft -= groupDiscount;
        const groupTotal = group.subtotal + groupDelivery + groupPackagingFee - groupDiscount;

        return {
          id: isPrimary ? orderId : `${orderId}-${group.hotelId}`,
          orderGroupId: orderId,
          userId: user?.uid || null,
          userName: customerName,
          userPhone: phone,
          orderType: isBulkOrder ? 'bulk' : 'regular',
          hotelId: group.hotelId,
          hotelName: group.hotelName,
          restaurantId: group.hotelId,
          items: group.items.map((item: any) => {
            const itemHotel = getItemHotel(item);
            return {
              ...item,
              name: item.name || 'Unnamed item',
              hotelId: itemHotel?.id ?? group.hotelId,
              hotelName: itemHotel?.name ?? group.hotelName,
            };
          }),
          subtotal: group.subtotal,
          deliveryCharge: groupDelivery,
          packagingFee: groupPackagingFee,
          couponCode: couponDiscount > 0 || freeByCoupon ? appliedCoupon : null,
          couponDiscount: groupDiscount,
          walletAmountUsed: 0,
          grandTotal: groupTotal,
          totalAmount: groupTotal,
          payableAmount: groupTotal,
          groupPayable: payableAmount,
          paymentMethod,
          paymentId: null,
          clientPaymentId: clientPaymentId || null,
          paymentStatus: clientPaymentId ? 'unverified' : 'pending',
          // Every order is born at JIS Kitchen: never dispatched, always NEW.
          orderStatus: 'NEW',
          dispatchStatus: 'PENDING_DISPATCH',
          sentAt: null,
          sentBy: null,
          // Legacy lowercase mirror, still read by the tracking screen.
          status: 'pending',
          deliveryLocation,
          // Lets /api/notify-order push status updates to this device.
          customerPushToken: pushToken,
          needCutlery,
          instructions: formData.additionalMessage.trim(),
          createdAt: nowIso,
        };
      });

      // Wait for Firestore to acknowledge. The old 2.5 s race reported
      // "confirmed" for orders that were never saved.
      const saved = await Promise.race([
        Promise.all(orders.map((o) => setDoc(doc(db, 'orders', o.id), o))).then(
          () => true,
          (err) => {
            console.error('Failed to store order:', err);
            return false;
          }
        ),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 15000)),
      ]);
      return { orders, saved };
    };

    const openRazorpay = async (opts: { amount: number; orderId?: string; key?: string }, onPaid: (r: any) => void) => {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Could not load online payment. Check your connection, or choose Cash on Delivery.');
        setIsSubmitting(false);
        return;
      }
      const rzp = new (window as any).Razorpay({
        key: opts.key || RAZORPAY_KEY_ID,
        amount: opts.amount,
        currency: 'INR',
        ...(opts.orderId ? { order_id: opts.orderId } : {}),
        name: "Mintoo",
        description: `Order ${orderId}`,
        handler: onPaid,
        prefill: { name: customerName, contact: phone },
        notes: { orderId },
        theme: { color: '#e11d48' },
        // Only a closed modal re-enables Confirm. After a failed attempt the
        // modal stays open for a retry, and a second tap underneath it used to
        // start a second payment.
        modal: { ondismiss: () => setIsSubmitting(false) },
      });
      rzp.on('payment.failed', (r: any) => toast.error('Payment failed: ' + (r?.error?.description || 'please try again')));
      rzp.open();
    };

    setIsSubmitting(true);

    let idToken: string | undefined;
    try { idToken = await user?.getIdToken(); } catch { /* guest order */ }

    const outcome = await placeOrderOnServer({
      orderId,
      customer: { name: customerName, phone },
      location: { lat: deliveryLocation.lat, lng: deliveryLocation.lng, address: deliveryLocation.address },
      items: activeItems.map((item: any) => ({
        ...item,
        quantity: item.finalQuantity ?? item.quantity ?? 1,
        hotelId: getItemHotel(item)?.id ?? item.hotelId ?? null,
      })),
      couponCode: appliedCoupon || undefined,
      paymentMethod: wantsOnline ? 'online' : 'cod',
      needCutlery,
      instructions: formData.additionalMessage.trim(),
      pushToken: pushToken || undefined,
      idToken,
    });

    if (outcome.kind === 'rejected') {
      toast.error(orderErrorMessage(outcome.error));
      setIsSubmitting(false);
      return;
    }

    if (outcome.kind === 'ok') {
      const { data } = outcome;
      const p = data.pricing;
      const serverTotals: Totals = p
        ? { subtotal: p.subtotal, packagingFee: p.packagingFee, deliveryCharge: p.deliveryCharge, couponDiscount: p.couponDiscount, payable: data.amount }
        : clientTotals;
      const orders = data.orders || [];

      // The server prices from the live menu; if that differs from what this
      // screen showed (a price changed while the cart sat for a while), say so
      // before the customer pays or the rider collects cash.
      if (Math.abs(data.amount - payableAmount) >= 1) {
        toast(`Prices were updated: your total is now ₹${data.amount.toFixed(2)}`, { icon: 'ℹ️', duration: 6000 });
      }

      // UPI: the customer leaves for their bank app and there is no callback
      // into this tab, so the server is the only authority on whether money
      // arrived. We open the intent, then poll /api/payment-status until it
      // says paid. Nothing here may mark the order paid by itself.
      if (wantsOnline && data.upi) {
        try {
          localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({ orderId, at: Date.now() }));
        } catch { /* storage full */ }

        if (data.upi.link) openExternal(data.upi.link);
        setUpiPayment({
          orderId,
          amount: data.upi.amount,
          link: data.upi.link,
          qr: data.upi.qr,
          vpa: data.upi.vpa,
          // Reuses the same completion path as every other payment route, so a
          // UPI order is saved, cleared and handed to WhatsApp identically.
          onPaid: (paymentId: string) =>
            finish(
              orders.map((o: any) => ({ ...o, paymentStatus: 'completed', paymentId })),
              serverTotals,
              paymentId
            ),
        });
        setIsSubmitting(false);
        return;
      }

      if (wantsOnline && data.razorpay) {
        try {
          localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({ orderId, at: Date.now() }));
        } catch { /* storage full */ }
        await openRazorpay({ amount: data.razorpay.amount, orderId: data.razorpay.orderId, key: data.razorpay.key }, async (r) => {
          // The server marks the order paid only after checking Razorpay's
          // signature. If this call is lost, the Razorpay webhook does it.
          const verified = await verifyPaymentOnServer({
            orderId,
            razorpay_order_id: r.razorpay_order_id,
            razorpay_payment_id: r.razorpay_payment_id,
            razorpay_signature: r.razorpay_signature,
          });
          finish(
            orders.map((o) => ({ ...o, paymentStatus: verified ? 'completed' : o.paymentStatus, paymentId: r.razorpay_payment_id })),
            serverTotals,
            r.razorpay_payment_id
          );
        });
        return;
      }
      finish(orders, serverTotals);
      return;
    }

    // ---- fallback: the order server is unavailable
    if (wantsOnline) {
      await openRazorpay({ amount: Math.round(payableAmount * 100) }, async (r) => {
        const { orders, saved } = await writeOrderFromBrowser(r.razorpay_payment_id);
        if (!saved) console.error('Paid order could not be saved; WhatsApp and Telegram carry it', orderId);
        notifyTelegram(buildTgMessage(r.razorpay_payment_id), orderId).catch(console.error);
        // Money has been taken, so always hand over, even if saving failed.
        finish(orders, clientTotals, r.razorpay_payment_id);
      });
      return;
    }

    const { orders, saved } = await writeOrderFromBrowser();
    if (!saved) {
      toast.error("Couldn't save your order. Check your internet connection and tap Confirm again.");
      setIsSubmitting(false);
      return;
    }
    notifyTelegram(buildTgMessage(), orderId).catch(console.error);
    finish(orders, clientTotals);
  };

  // Empty Cart State
  if (activeItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] text-gray-900 pb-32 pt-8 px-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-rose-100 space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-[#ff4d6d] flex items-center justify-center mx-auto shadow-inner">
            <Ticket className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Your Cart is Empty</h2>
          <p className="text-xs text-gray-500">
            Explore Mintoo menu and add your favorite dishes to place an order!
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

  // Waiting for a UPI payment. Shown instead of the form so the customer
  // cannot edit the order or pay a second time while money is in flight.
  if (upiPayment) {
    const waitedLong = upiElapsed > 90;
    // Rendered into document.body rather than in place.
    //
    // It has to cover the bottom nav and the cart bar: those stayed tappable
    // underneath, and the cart still held the items (it is only cleared once
    // payment completes), so a customer tired of waiting could reach Cart ->
    // Checkout and pay a second time for food they had already paid for.
    // place-order only dedupes a repeat of the same order id, and that second
    // trip makes a fresh one.
    //
    // A plain z-index could not do it: App wraps every route in a Framer Motion
    // opacity animation, and that creates a stacking context, so a z-index set
    // in here is only ever compared against its siblings inside the page. A
    // portal leaves that context entirely.
    return createPortal(
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-gradient-to-b from-[#fff1f4] to-white flex flex-col items-center justify-center p-6 text-center gap-5">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-[#e11d48] animate-spin" />
        </div>

        <div>
          <h1 className="text-lg font-black text-gray-900">Waiting for your payment</h1>
          <p className="text-sm text-gray-600 mt-1">
            Pay <b>₹{upiPayment.amount.toFixed(2)}</b> in your UPI app. This screen updates on its own.
          </p>
        </div>

        {upiPayment.qr && (
          <img
            src={upiPayment.qr.startsWith('data:') ? upiPayment.qr : `data:image/png;base64,${upiPayment.qr}`}
            alt="UPI QR code"
            className="w-48 h-48 rounded-2xl border border-gray-200 bg-white p-2"
          />
        )}

        {upiPayment.link && (
          <button
            onClick={() => openExternal(upiPayment.link!)}
            className="px-6 py-3 rounded-full bg-[#e11d48] text-white font-black text-sm active:scale-95 transition-transform cursor-pointer"
          >
            Open UPI app
          </button>
        )}

        {upiPayment.vpa && (
          <p className="text-xs text-gray-500">
            Or pay manually to <b className="text-gray-800">{upiPayment.vpa}</b>
          </p>
        )}

        {/* A UPI credit can take a minute to be noticed. Say so, rather than
            letting the customer decide it failed and pay a second time. */}
        {waitedLong && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 max-w-xs">
            Still checking. If you have already paid, keep this open — confirmation can take a
            minute. Please do not pay again.
          </p>
        )}

        <button
          onClick={() => {
            // Abandons the wait, never the order: it stays awaiting_payment on
            // the server, so a late credit is still matched and the kitchen is
            // told then.
            setUpiPayment(null);
            navigate(`/track/${upiPayment.orderId}`, { replace: true });
          }}
          className="text-xs font-bold text-gray-500 underline mt-2 cursor-pointer"
        >
          I'll check later
        </button>
      </div>,
      document.body
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-gray-900 pb-36 pt-3 px-3 sm:px-6">
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
                {deliveryLocation?.address || 'Set delivery location'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. RESTAURANT & ITEMS CARD (MATCHING SCREENSHOT) */}
        <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-4 text-left">
          
          {/* Restaurant Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-rose-100 shadow-xs shrink-0 bg-rose-50 p-1 flex items-center justify-center">
              <img
                src="/logo-sm.webp"
                alt="Mintoo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 leading-snug">
                {/* Name the hotel the food is actually from. This used to be hardcoded to
                    "Mintoo - All Orders", so a Hotel Sankalpa order showed the wrong
                    kitchen on screen even though the WhatsApp message named it correctly. */}
                {summaryHotelName
                  ? `${summaryHotelName} via Mintoo`
                  : "Mintoo - All Orders"}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                {deliveryLocation ? deliveryLocation.address.split(',')[0] : 'Yellapur'} • {activeItems.length} {activeItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {/* Items List with - 1 + Pill Stepper & Strikethrough Pricing */}
          <div className="space-y-3.5 divide-y divide-gray-50">
            {activeItems.map((item) => {
              const qty = isBulkOrder ? (item as any).finalQuantity : (item as any).quantity;
              // A struck-out price only when the dish really has one; the old
              // made-up "price x 1.25" was a fake discount.
              const originalPrice = Number((item as any).originalPrice) > item.price ? Number((item as any).originalPrice) : 0;

              return (
                <div key={item.id} className="pt-3 first:pt-0 flex items-start justify-between gap-2.5">
                  {/* Left: dish photo + Veg/Non-Veg icon + Item Details */}
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                      <DishImage src={(item as any).image} alt={item.name} />
                    </div>
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
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">₹{item.price} each</p>
                    </div>
                  </div>

                  {/* Center: Stepper Pill */}
                  <div className="flex items-center bg-rose-50/60 border border-rose-200 rounded-full shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, qty - 1)}
                      className="w-9 h-9 flex items-center justify-center text-[#e11d48] hover:text-rose-800 text-base font-black active:scale-75 transition-transform cursor-pointer"
                      aria-label={`Decrease ${item.name}`}
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-gray-800 min-w-[14px] text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, qty + 1)}
                      className="w-9 h-9 flex items-center justify-center text-[#e11d48] hover:text-rose-800 text-base font-black active:scale-75 transition-transform cursor-pointer"
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>
                  </div>

                  {/* Right: Prices */}
                  <div className="text-right shrink-0 min-w-[55px]">
                    {originalPrice > 0 && (
                      <p className="text-[10px] text-gray-400 line-through">₹{originalPrice * qty}</p>
                    )}
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

        {/* 4. BILL DETAILS. Laid out the way every major food app does it:
            line items, a dashed rule, then the amount to pay. Fees that are
            not charged are simply not listed, rather than struck through. */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm text-left">
          <h3 className="text-sm font-black text-gray-900 mb-3">Bill details</h3>

          <div className="space-y-2.5 text-[13px] text-gray-700">
            <div className="flex justify-between items-center">
              <span>Item total</span>
              <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                Delivery fee
                <button
                  type="button"
                  onClick={() =>
                    toast(
                      isFreeDelivery
                        ? `Delivery is free right now (${freeDeliveryReason.replace(' 🎉', '')}).`
                        : `₹20 for the first 2 km, then ₹10 per km. Your address is ${distanceKm} km away.`,
                      { id: 'why-delivery' }
                    )
                  }
                  className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  aria-label="How the delivery fee is worked out"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </span>
              {isFreeDelivery ? (
                <span className="flex items-center gap-1.5">
                  {baseDeliveryCharge > 0 && (
                    <span className="line-through text-gray-400 text-xs">₹{baseDeliveryCharge.toFixed(2)}</span>
                  )}
                  <span className="text-emerald-600 font-bold">FREE</span>
                </span>
              ) : (
                <span className="font-semibold text-gray-900">₹{deliveryCharge.toFixed(2)}</span>
              )}
            </div>

            {packagingFee > 0 && (
              <div className="flex justify-between items-center">
                <span>
                  Packaging <span className="text-gray-400 text-xs">· Hotel Mumtaz</span>
                </span>
                <span className="font-semibold text-gray-900">₹{packagingFee.toFixed(2)}</span>
              </div>
            )}

            {couponDiscount > 0 && (
              <div className="flex justify-between items-center text-emerald-700">
                <span>Coupon · {appliedCoupon}</span>
                <span className="font-semibold">−₹{couponDiscount.toFixed(2)}</span>
              </div>
            )}

            {walletDeduction > 0 && (
              <div className="flex justify-between items-center text-emerald-700">
                <span>Wallet</span>
                <span className="font-semibold">−₹{walletDeduction.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-300 my-3.5" />

          <div className="flex justify-between items-baseline">
            <span className="text-[15px] font-black text-gray-900">To pay</span>
            <span className="text-[17px] font-black text-gray-900">₹{payableAmount.toFixed(2)}</span>
          </div>

          {/* Savings, stated once and only when real: a waived delivery
              charge and any coupon. Wallet money is the customer's own, so it
              is not counted as a saving. */}
          {orderSavings > 0 && (
            <div className="mt-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold px-3 py-2.5">
              You&apos;re saving ₹{orderSavings.toFixed(2)} on this order
            </div>
          )}

          <p className="mt-3 text-[11px] text-gray-500 font-medium">
            No platform fee. No hidden charges.
          </p>
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
                autoComplete="tel"
                maxLength={14}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^\d+ ]/g, '') })}
                placeholder="10-digit mobile number"
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
          <CheckoutSavedAddresses />
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
          {appliedCoupon && couponShortfall > 0 ? (
            <p className="text-xs font-bold text-amber-700">
              Add ₹{couponShortfall} more to use {appliedCoupon}.
            </p>
          ) : appliedCoupon && appliedCouponDetails && !appliedCouponDetails.isActive ? (
            <p className="text-xs font-bold text-gray-500">{appliedCoupon} has expired.</p>
          ) : appliedCoupon ? (
            <p className="text-xs font-bold text-emerald-600">✅ Promo {appliedCoupon} applied!</p>
          ) : null}
        </div>

        {/* 9. SUBMIT / PLACE ORDER BUTTON */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || activeItems.length === 0}
          className="w-full py-4 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-black text-[15px] shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Placing order…</span>
            </>
          ) : (
            <>
              <span>Confirm order · ₹{payableAmount.toFixed(2)}</span>
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
