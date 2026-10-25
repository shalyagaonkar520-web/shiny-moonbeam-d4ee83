// Server-side order pricing. Mirrors the rules Checkout.tsx shows the customer
// (keep the two in step), but uses prices from the menu instead of prices sent
// by the browser. Used by /api/place-order.
import { readFileSync } from 'node:fs';
import { adminDb } from './_firebaseAdmin.js';

const CATALOG = JSON.parse(readFileSync(new URL('./_catalog.json', import.meta.url), 'utf8'));

export const KITCHEN = { lat: 14.9643, lng: 74.7121 };
export const SERVICE_RADIUS_KM = 12;
export const COD_MAX_KM = 5;
const MUMTAZ_PACKAGING_FEE = 10;

// Same table as src/utils/orderHotels.ts PARTNER_HOTELS.
const HOTELS = [
  { id: 'mumtaz', name: 'Hotel Mumtaz', prefix: 'mumtaz-', match: ['Hotel Mumtaz'] },
  { id: 'al_amin', name: 'Hotel Al Amin', prefix: 'alamin-', match: ['Hotel Al Amin'] },
  { id: 'coastal_crown', name: 'Coastal Crown', prefix: 'coastal-', match: ['Coastal Crown'] },
  { id: 'malabar', name: 'Hotel Malabar', prefix: 'malabar-', match: ['Hotel Malabar', "Kaka's Hotel Malabar"] },
  { id: 'sankalpa', name: 'Hotel Sankalpa', prefix: 'sankalpa-', match: ['Hotel Sankalpa'] },
];
// `id` is deliberately not renamed with the rest of the rebrand: it is written
// onto every order line as `hotelId` and read by the super admin panel, and
// every order placed so far carries 'moms-magic'. Must match
// src/utils/orderHotels.ts. The name is the part anyone sees.
const OWN_KITCHEN = { id: 'moms-magic', name: 'Minto Kitchen' };

function hotelOf(item) {
  return (
    HOTELS.find(
      (h) =>
        item.hotelId === h.id ||
        String(item.id || '').startsWith(h.prefix) ||
        (typeof item.description === 'string' && h.match.some((m) => item.description.includes(m)))
    ) || null
  );
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Same as calculateDeliveryCharge in src/types.ts.
function deliveryChargeFor(km) {
  const whole = Math.ceil(km);
  return 20 + (whole > 2 ? (whole - 2) * 10 : 0);
}

/** Hour of day in India, whatever timezone the server runs in. */
function istHour(now) {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(now));
}

// Admin price edits live in the Firestore `menu` collection and win over the
// bundled catalog. Cached briefly so a burst of orders costs one read.
let menuCache = { at: 0, byId: {} };
async function liveMenu() {
  if (!adminDb) return {};
  if (Date.now() - menuCache.at < 5 * 60 * 1000) return menuCache.byId;
  try {
    const snap = await adminDb.collection('menu').select('price', 'isAvailable', 'name').get();
    const byId = {};
    snap.forEach((d) => { byId[d.id] = d.data(); });
    menuCache = { at: Date.now(), byId };
  } catch (err) {
    console.error('pricing: menu read failed, using catalog only', err);
  }
  return menuCache.byId;
}

let settingsCache = { at: 0, data: {} };
async function liveSettings() {
  if (!adminDb) return {};
  if (Date.now() - settingsCache.at < 60 * 1000) return settingsCache.data;
  try {
    const snap = await adminDb.collection('system').doc('settings').get();
    settingsCache = { at: Date.now(), data: snap.exists ? snap.data() : {} };
  } catch (err) {
    console.error('pricing: settings read failed', err);
  }
  return settingsCache.data;
}

/**
 * The coupon discount the customer is entitled to, or 0. Shared rule with
 * Checkout: the coupon must be active and the subtotal must still meet its
 * minimum, and a discount never exceeds the food subtotal.
 */
export function couponDiscountFor(coupon, subtotal) {
  if (!coupon || !coupon.isActive || subtotal < Number(coupon.minOrderValue || 0)) return 0;
  if (coupon.type === 'fixed_discount') return Math.min(Number(coupon.value) || 0, subtotal);
  if (coupon.type === 'percent_discount') return Math.min(Math.round((subtotal * (Number(coupon.value) || 0)) / 100), subtotal);
  return 0;
}

/**
 * Prices an order from trusted data.
 * @param {{ items: any[], couponCode?: string, location: {lat:number,lng:number}, now?: Date }} input
 */
export async function priceOrder({ items, couponCode, location, now = new Date(), allowUnknownItems = true }) {
  const [menu, settings] = await Promise.all([liveMenu(), liveSettings()]);
  const flags = [];

  const lines = items.map((raw) => {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(raw.quantity ?? raw.finalQuantity ?? 1)) || 1));
    const known = CATALOG[raw.id];
    const override = menu[raw.id];
    const sent = Number(raw.price);
    let price;
    if (override && typeof override.price === 'number') price = override.price;
    else if (known) price = known.price;
    else {
      // Not on any menu: accept the app's price only if it is a sane positive
      // number, and flag it. A zero, negative or infinite price is refused.
      if (!allowUnknownItems || !Number.isInteger(sent) || sent < 1 || sent > 20000) {
        throw Object.assign(new Error('invalid item'), { code: 'INVALID_ITEM' });
      }
      price = sent;
      flags.push(`unknown item "${String(raw.name || raw.id).slice(0, 60)}" priced by the app at ₹${price}`);
    }
    if (override && override.isAvailable === false) flags.push(`"${raw.name}" is marked unavailable`);
    if (Math.abs(price - (Number.isFinite(sent) ? sent : 0)) >= 1) {
      flags.push(`"${String(raw.name).slice(0, 60)}": app said ₹${raw.price}, menu says ₹${price}`);
    }
    // For a dish on the menu, the name and kitchen come from the menu too:
    // otherwise a ₹69 id could be sent with the name of a ₹900 dish, and the
    // kitchen would cook what the ticket says.
    const menuName = (override && typeof override.name === 'string' && override.name) || known?.name;
    if (menuName && raw.name && String(raw.name).trim() !== menuName) {
      flags.push(`app sent name "${String(raw.name).slice(0, 60)}" for "${menuName}"`);
    }
    const hotel = known ? hotelOf({ id: raw.id, hotelId: known.hotelId }) : hotelOf(raw);
    return {
      ...raw,
      name: menuName || raw.name,
      price,
      quantity: qty,
      hotelId: hotel?.id ?? OWN_KITCHEN.id,
      hotelName: hotel?.name ?? OWN_KITCHEN.name,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const distanceKm = Math.round(haversineKm(KITCHEN.lat, KITCHEN.lng, location.lat, location.lng) * 100) / 100;

  const coupons = Array.isArray(settings.coupons) ? settings.coupons : [];
  const code = String(couponCode || '').trim().toUpperCase();
  const coupon = code ? coupons.find((c) => String(c.code).toUpperCase() === code) : null;
  if (code && !coupon) flags.push(`coupon ${code} does not exist`);
  const couponDiscount = couponDiscountFor(coupon, subtotal);
  if (code && coupon && coupon.type !== 'free_delivery' && couponDiscount === 0) flags.push(`coupon ${code} not valid for this order`);

  const freeByCoupon = !!coupon && coupon.isActive && coupon.type === 'free_delivery' && subtotal >= Number(coupon.minOrderValue || 0);
  const freeBeforeTwo = istHour(now) < 14;
  const deliveryCharge = freeByCoupon || freeBeforeTwo ? 0 : deliveryChargeFor(distanceKm);
  const freeDeliveryReason = freeByCoupon ? `${coupon.code} Promo` : freeBeforeTwo ? 'Free Before 2 PM' : '';

  const hasMumtaz = lines.some((l) => l.hotelId === 'mumtaz');
  const packagingFee = hasMumtaz ? MUMTAZ_PACKAGING_FEE : 0;
  const grandTotal = Math.max(0, subtotal + deliveryCharge + packagingFee - couponDiscount);

  // One order per kitchen. Delivery rides with the first group, packaging with
  // Mumtaz, and the discount is spread by subtotal so the groups always add up
  // to exactly what the customer pays (the last group takes the rounding).
  const byHotel = new Map();
  for (const l of lines) {
    if (!byHotel.has(l.hotelId)) byHotel.set(l.hotelId, { hotelId: l.hotelId, hotelName: l.hotelName, items: [], subtotal: 0 });
    const g = byHotel.get(l.hotelId);
    g.items.push(l);
    g.subtotal += l.price * l.quantity;
  }
  const groups = [...byHotel.values()];
  let discountLeft = couponDiscount;
  groups.forEach((g, i) => {
    const share = i === groups.length - 1 ? discountLeft : Math.round((couponDiscount * g.subtotal) / (subtotal || 1));
    g.couponDiscount = Math.min(share, discountLeft);
    discountLeft -= g.couponDiscount;
    g.deliveryCharge = i === 0 ? deliveryCharge : 0;
    g.packagingFee = g.hotelId === 'mumtaz' ? packagingFee : 0;
    g.total = g.subtotal + g.deliveryCharge + g.packagingFee - g.couponDiscount;
  });

  return {
    lines,
    groups,
    subtotal,
    deliveryCharge,
    packagingFee,
    couponCode: coupon && (couponDiscount > 0 || freeByCoupon) ? coupon.code : null,
    couponDiscount,
    freeDeliveryReason,
    grandTotal,
    distanceKm,
    flags,
  };
}
