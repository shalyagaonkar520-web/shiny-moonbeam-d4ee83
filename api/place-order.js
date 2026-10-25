import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { adminDb } from './_firebaseAdmin.js';
import { priceOrder, SERVICE_RADIUS_KM, COD_MAX_KM } from './_pricing.js';
import { announceOnce } from './_orderMessage.js';
import { paymentsConfigured, createPaymentOrder, usingShalya } from './_payments.js';
import { upiIntentLink } from './_shalyaPay.js';

// POST /api/place-order
//
// Creates an order on the server, with prices from the menu rather than the
// ones the browser sent, so an edited price or a fake "paid" flag can never
// reach the kitchen. Cash orders are confirmed here; online orders get a
// Razorpay order for the server-computed amount and are marked paid only by
// /api/verify-payment or /api/razorpay-webhook after Razorpay's signature
// checks out.
//
// Body: { orderId, customer: {name, phone}, location: {lat, lng, address},
//         items: [{id, name, price, quantity, ...}], couponCode?,
//         paymentMethod: 'cod'|'online', needCutlery?, instructions?,
//         pushToken?, idToken? }

const ORDER_ID = /^[0-9]{13}[A-Z2-9]{10}$/;
const MAX_ITEMS = 60;

// Best-effort flood control per warm instance.
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function normalisePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function bad(res, code, error, extra = {}) {
  return res.status(code).json({ ok: false, error, ...extra });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', 'https://momsmagic.shop');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return bad(res, 405, 'method_not_allowed');
  if (!adminDb) return bad(res, 503, 'orders_not_configured');

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return bad(res, 429, 'too_many_requests');

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return bad(res, 400, 'invalid_json'); }
  }

  const orderId = str(body.orderId, 40);
  if (!ORDER_ID.test(orderId)) return bad(res, 400, 'invalid_order_id');

  const name = str(body.customer?.name, 80);
  const phone = normalisePhone(body.customer?.phone);
  if (!name) return bad(res, 400, 'invalid_name');
  if (!phone) return bad(res, 400, 'invalid_phone');

  const lat = Number(body.location?.lat);
  const lng = Number(body.location?.lng);
  const address = str(body.location?.address, 300);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address) return bad(res, 400, 'invalid_location');

  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
  if (!items.length) return bad(res, 400, 'empty_cart');

  const paymentMethod = body.paymentMethod === 'online' ? 'online' : 'cod';

  // Idempotent: a retry after a dropped response must not create a second order.
  const primaryRef = adminDb.collection('orders').doc(orderId);
  const existing = await primaryRef.get();
  if (existing.exists) {
    const o = existing.data();
    return res.status(200).json({
      ok: true,
      orderId,
      amount: o.groupPayable ?? o.payableAmount,
      razorpay: o.razorpayOrderId ? { orderId: o.razorpayOrderId, amount: Math.round((o.groupPayable ?? o.payableAmount) * 100), key: process.env.RAZORPAY_KEY_ID } : null,
      duplicate: true,
    });
  }

  let priced;
  try {
    priced = await priceOrder({
    items: items.map((i) => ({
      id: str(i.id, 120),
      name: str(i.name, 120),
      price: Number(i.price) || 0,
      quantity: Number(i.quantity ?? i.finalQuantity ?? 1),
      hotelId: str(i.hotelId, 40) || null,
      description: str(i.description, 200),
      image: str(i.image, 300),
      category: str(i.category, 60),
      // Optional fields are left out rather than set to undefined: the pricer
      // spreads each item into the order document, and Firestore refuses an
      // undefined value outright -- which failed every order whose dishes had
      // no isVeg flag or no combo list, i.e. almost all of them.
      ...(typeof i.isVeg === 'boolean' ? { isVeg: i.isVeg } : {}),
      // Combo contents, so the kitchen knows what goes in the box.
      ...(Array.isArray(i.items)
        ? { items: i.items.slice(0, 20).map((x) => str(x, 80)).filter(Boolean) }
        : {}),
    })),
    couponCode: str(body.couponCode, 40),
    location: { lat, lng },
    // Paying online for a dish that is on no menu would be "verified" at a
    // price the app chose; cash orders keep them, flagged for the team.
    allowUnknownItems: paymentMethod !== 'online',
    });
  } catch (err) {
    if (err.code === 'INVALID_ITEM') return bad(res, 400, 'invalid_item');
    throw err;
  }

  if (priced.distanceKm > SERVICE_RADIUS_KM) return bad(res, 422, 'outside_service_area', { distanceKm: priced.distanceKm });
  if (paymentMethod === 'cod' && priced.distanceKm > COD_MAX_KM && priced.grandTotal > 0) {
    return bad(res, 422, 'cod_not_available', { distanceKm: priced.distanceKm });
  }
  if (paymentMethod === 'online' && !paymentsConfigured()) return bad(res, 503, 'payments_not_configured');

  // Every kitchen in the cart must be open. This endpoint writes with the
  // Admin SDK, so the Firestore rule that refuses orders for a closed hotel
  // does not apply here -- without this check, switching a hotel off in JIS,
  // or a kitchen pressing STOP TAKING ORDERS, had no effect on server orders.
  // It runs before any Razorpay order exists, so nobody is charged for food a
  // closed kitchen will never cook. A hotel with no document is treated as
  // closed, matching the rule: such an order could never be dispatched.
  const hotelIds = [...new Set(priced.groups.map((g) => g.hotelId))];
  const hotelSnaps = await Promise.all(hotelIds.map((id) => adminDb.collection('hotels').doc(id).get()));
  const closedHotels = [];
  hotelSnaps.forEach((snap, idx) => {
    const h = snap.exists ? snap.data() : null;
    if (!h || h.acceptingOrders !== true || h.status === 'INACTIVE') {
      const group = priced.groups.find((g) => g.hotelId === hotelIds[idx]);
      closedHotels.push({ id: hotelIds[idx], name: h?.name || group?.hotelName || hotelIds[idx] });
    }
  });
  if (closedHotels.length) return bad(res, 409, 'hotel_closed', { hotels: closedHotels });

  // A signed-in customer's uid is recorded only when their ID token proves it.
  let userId = null;
  if (typeof body.idToken === 'string' && body.idToken && getApps().length) {
    try { userId = (await getAuth(getApps()[0]).verifyIdToken(body.idToken)).uid; } catch { /* guest order */ }
  }

  let razorpay = null;
  if (paymentMethod === 'online' && priced.grandTotal > 0) {
    try {
      razorpay = await createPaymentOrder(priced.grandTotal, orderId);
    } catch (err) {
      console.error('place-order: payment order failed', err);
      return bad(res, 422, 'payment_setup_failed');
    }
    // Shalya Pay returns null rather than throwing when the gateway is
    // unreachable — it runs on a PC behind a tunnel, so that is an expected
    // state. 503 is the code checkout already handles by offering Cash on
    // Delivery, instead of leaving the customer on a dead payment screen.
    if (!razorpay) return bad(res, 503, 'payments_not_configured');
  }

  const nowIso = new Date().toISOString();
  const cash = paymentMethod === 'cod' || priced.grandTotal === 0;
  const docs = priced.groups.map((g, i) => ({
    id: i === 0 ? orderId : `${orderId}-${g.hotelId}`,
    orderGroupId: orderId,
    userId,
    userName: name,
    userPhone: phone,
    orderType: 'regular',
    hotelId: g.hotelId,
    hotelName: g.hotelName,
    restaurantId: g.hotelId,
    items: g.items,
    subtotal: g.subtotal,
    deliveryCharge: g.deliveryCharge,
    packagingFee: g.packagingFee,
    couponCode: priced.couponCode,
    couponDiscount: g.couponDiscount,
    walletAmountUsed: 0,
    grandTotal: g.total,
    totalAmount: g.total,
    payableAmount: g.total,
    groupPayable: priced.grandTotal,
    freeDeliveryReason: priced.freeDeliveryReason,
    priceFlags: priced.flags,
    serverPriced: true,
    paymentMethod: priced.grandTotal === 0 ? 'free' : paymentMethod,
    paymentId: null,
    paymentStatus: cash ? 'pending' : 'awaiting_payment',
    razorpayOrderId: razorpay?.id || null,
    // An unpaid online order is not yet a kitchen order: the admin and rider
    // screens only list it once markGroupPaid turns it into pending / NEW.
    orderStatus: cash ? 'NEW' : 'AWAITING_PAYMENT',
    dispatchStatus: 'PENDING_DISPATCH',
    sentAt: null,
    sentBy: null,
    status: cash ? 'pending' : 'awaiting_payment',
    deliveryLocation: { lat, lng, address, distance: priced.distanceKm, isDeliverable: true },
    customerPushToken: str(body.pushToken, 300) || null,
    needCutlery: !!body.needCutlery,
    instructions: str(body.instructions, 500),
    createdAt: nowIso,
  }));

  const batch = adminDb.batch();
  // create(), not set(): if two identical requests race, the second fails
  // instead of overwriting the first order's Razorpay link.
  for (const d of docs) batch.create(adminDb.collection('orders').doc(d.id), d);
  if (razorpay) {
    // Server-only record of what this Razorpay order is for; verify-payment
    // and the webhook check payments against this, not the order document.
    batch.set(adminDb.collection('payments').doc(razorpay.id), {
      groupId: orderId,
      amountPaise: razorpay.amount,
      createdAt: nowIso,
    });
  }
  try {
    await batch.commit();
  } catch (err) {
    if (err?.code === 6 || /ALREADY_EXISTS/i.test(String(err?.message))) {
      const snap = await primaryRef.get();
      if (!snap.exists) return bad(res, 409, 'order_conflict');
      const o = snap.data();
      return res.status(200).json({
        ok: true,
        orderId,
        amount: o.groupPayable ?? o.payableAmount,
        razorpay: o.razorpayOrderId ? { orderId: o.razorpayOrderId, amount: Math.round((o.groupPayable ?? o.payableAmount) * 100), key: process.env.RAZORPAY_KEY_ID } : null,
        duplicate: true,
      });
    }
    throw err;
  }

  // Cash orders go to the kitchen now; online ones once the payment is verified.
  // Awaited (with a cap): Vercel may freeze the function once the response is sent.
  if (cash) {
    await Promise.race([
      announceOnce(orderId).catch((err) => console.error('place-order: announce failed', err)),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  }

  return res.status(200).json({
    ok: true,
    orderId,
    amount: priced.grandTotal,
    pricing: {
      subtotal: priced.subtotal,
      deliveryCharge: priced.deliveryCharge,
      packagingFee: priced.packagingFee,
      couponDiscount: priced.couponDiscount,
      grandTotal: priced.grandTotal,
    },
    orders: docs,
    // Razorpay's modal needs a key and an order; UPI needs a link to open and
    // an id to poll. Only the active provider's block is filled in, so checkout
    // can tell which screen to show without being told the provider separately.
    razorpay: razorpay && !usingShalya()
      ? { orderId: razorpay.id, amount: razorpay.amount, key: process.env.RAZORPAY_KEY_ID }
      : null,
    upi: razorpay && usingShalya()
      ? {
          paymentId: razorpay.id,
          amount: priced.grandTotal,
          // The gateway's own link wins when it returns one; otherwise build
          // the intent for the owner's VPA, which is where the money goes.
          link: razorpay.payLink || upiIntentLink(priced.grandTotal, orderId),
          qr: razorpay.qr || null,
          vpa: process.env.SHALYA_UPI_VPA || null,
        }
      : null,
  });
}
