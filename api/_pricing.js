// Server-side order pricing. Mirrors the rules Checkout.tsx shows the customer
// (keep the two in step), but uses prices from the menu instead of prices sent
// by the browser. Used by /api/place-order.
//
// Where the Super Admin manages something it wins, through `source` (see
// _live.js); where it does not, the original rules below apply unchanged:
//  - price: a dish priced in the panel (priceUpdatedAt set, or a dish that only
//    exists in the panel) is charged at the panel's price, sale price, variant
//    and add-ons; otherwise the `menu` override, then the bundled catalogue.
//  - delivery: the restaurant's city formula, distance from the restaurant,
//    plus a service-area surcharge; otherwise the fixed kitchen formula.
//  - packaging, tax: the restaurant's / business settings; otherwise Mumtaz ₹10
//    and tax included in prices.
//  - coupons: full terms from coupons/{CODE}; otherwise the settings list.
import { readFileSync } from 'node:fs';
import { adminDb } from './_firebaseAdmin.js';
import { dbSource, emptySource, matchArea } from './_live.js';
import { menuItemId, isDishAvailableNow } from './_dishAvailability.js';

const CATALOG = JSON.parse(readFileSync(new URL('./_catalog.json', import.meta.url), 'utf8'));

export const KITCHEN = { lat: 14.9643, lng: 74.7121 };
export const SERVICE_RADIUS_KM = 12;
export const COD_MAX_KM = 5;
const MUMTAZ_PACKAGING_FEE = 10;
const DEFAULT_DELIVERY = { baseFee: 20, freeKm: 2, perKm: 10, maxKm: SERVICE_RADIUS_KM, codMaxKm: COD_MAX_KM, minOrder: 0 };

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

// Same as calculateDeliveryCharge in src/types.ts, with the city's numbers.
function deliveryChargeFor(km, d = DEFAULT_DELIVERY) {
  const whole = Math.ceil(km);
  return d.baseFee + (whole > d.freeKm ? (whole - d.freeKm) * d.perKm : 0);
}

const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function cityDelivery(city) {
  const d = (city && city.delivery) || {};
  return {
    baseFee: num(d.baseFee, DEFAULT_DELIVERY.baseFee),
    freeKm: num(d.freeKm, DEFAULT_DELIVERY.freeKm),
    perKm: num(d.perKm, DEFAULT_DELIVERY.perKm),
    maxKm: num(d.maxKm, DEFAULT_DELIVERY.maxKm),
    codMaxKm: num(d.codMaxKm, DEFAULT_DELIVERY.codMaxKm),
    minOrder: num(d.minOrder, 0),
  };
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
  if (coupon.type === 'percent_discount') {
    const raw = Math.round((subtotal * (Number(coupon.value) || 0)) / 100);
    const cap = Number(coupon.maxDiscount) > 0 ? Number(coupon.maxDiscount) : Infinity;
    return Math.min(raw, cap, subtotal);
  }
  return 0;
}

/**
 * Why a full-terms coupon (coupons/{CODE}) cannot be used, or null.
 * `scope` is the part of the order it may apply to.
 */
export function couponProblem(c, { now, eligibleSubtotal, cityIds, history }) {
  if (!c.isActive) return 'not active';
  if (c.startAt && new Date(c.startAt).getTime() > now.getTime()) return 'not started yet';
  if (c.endAt && new Date(c.endAt).getTime() < now.getTime()) return 'expired';
  if (Number(c.usageLimit) > 0 && Number(c.usedCount || 0) >= Number(c.usageLimit)) return 'fully used';
  if (Array.isArray(c.cityIds) && c.cityIds.length && !cityIds.some((id) => c.cityIds.includes(id))) return 'not valid in this city';
  if (eligibleSubtotal <= 0) return 'not valid for these dishes or restaurants';
  if (eligibleSubtotal < Number(c.minOrderValue || 0)) return `needs a ₹${c.minOrderValue} order`;
  if (c.newCustomersOnly && history.priorOrders > 0) return 'first order only';
  if (Number(c.perCustomerLimit) > 0 && history.redemptions >= Number(c.perCustomerLimit)) return 'already used';
  return null;
}

/** The price of one line from a panel dish: sale price, variant, add-ons. */
function panelUnitPrice(doc, raw) {
  const base = typeof doc.salePrice === 'number' && doc.salePrice >= 0 && doc.salePrice < doc.price ? doc.salePrice : doc.price;
  let unit = base;
  let variant = null;
  const wantVariant = typeof raw.variant === 'string' ? raw.variant.trim() : '';
  if (wantVariant) {
    variant = (doc.variants || []).find((v) => v && v.name === wantVariant);
    if (!variant) throw Object.assign(new Error('invalid variant'), { code: 'INVALID_ITEM' });
    unit = Number(variant.price);
  }
  const wanted = Array.isArray(raw.addOns) ? raw.addOns.map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean) : [];
  const addOns = wanted.map((n) => {
    const a = (doc.addOns || []).find((x) => x && x.name === n);
    if (!a) throw Object.assign(new Error('invalid add-on'), { code: 'INVALID_ITEM' });
    return { name: a.name, price: Number(a.price) || 0 };
  });
  unit += addOns.reduce((s, a) => s + a.price, 0);
  return { unit, variant: variant ? variant.name : null, addOns };
}

/**
 * Prices an order from trusted data.
 * @param {{ items: any[], couponCode?: string, location: {lat:number,lng:number,address?:string},
 *   now?: Date, allowUnknownItems?: boolean, customer?: {phone?:string,userId?:string|null},
 *   source?: typeof emptySource }} input
 */
export async function priceOrder({ items, couponCode, location, now = new Date(), allowUnknownItems = true, customer = {}, source }) {
  const src = source || (adminDb ? dbSource(adminDb) : emptySource);
  const [menu, settings] = await Promise.all(source ? [{}, source.settings ? source.settings() : {}] : [liveMenu(), liveSettings()]);
  const flags = [];

  // Panel dishes, by their own id or by restaurant + name for catalogue dishes.
  const panelKey = (raw) => {
    if (String(raw.id || '').includes('__')) return raw.id;
    const known = CATALOG[raw.id];
    const hotel = known ? hotelOf({ id: raw.id, hotelId: known.hotelId }) : hotelOf(raw);
    return menuItemId(hotel?.id ?? OWN_KITCHEN.id, known?.name || raw.name);
  };
  const panel = await src.menuItems(items.map(panelKey)).catch(() => ({}));
  const unavailable = [];

  const lines = items.map((raw) => {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(raw.quantity ?? raw.finalQuantity ?? 1)) || 1));
    const key = panelKey(raw);
    const doc = panel[key];
    const panelOnly = String(raw.id || '').includes('__');
    if (panelOnly && !doc) throw Object.assign(new Error('invalid item'), { code: 'INVALID_ITEM' });
    if (doc && !isDishAvailableNow(doc, now)) unavailable.push(doc.name || raw.name);

    const known = CATALOG[raw.id];
    const override = menu[raw.id];
    const sent = Number(raw.price);
    let price;
    let variant = null;
    let addOns = [];
    const panelPriced = doc && typeof doc.price === 'number' && (panelOnly || doc.priceUpdatedAt);
    if (panelPriced) {
      ({ unit: price, variant, addOns } = panelUnitPrice(doc, raw));
    } else if (override && typeof override.price === 'number') price = override.price;
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
    const menuName = (panelOnly && doc?.name) || (override && typeof override.name === 'string' && override.name) || known?.name;
    if (menuName && raw.name && String(raw.name).trim() !== menuName) {
      flags.push(`app sent name "${String(raw.name).slice(0, 60)}" for "${menuName}"`);
    }
    const hotel = panelOnly ? { id: doc.hotelId, name: null } : known ? hotelOf({ id: raw.id, hotelId: known.hotelId }) : hotelOf(raw);
    return {
      ...raw,
      name: menuName || raw.name,
      price,
      quantity: qty,
      hotelId: hotel?.id ?? OWN_KITCHEN.id,
      hotelName: hotel?.name ?? OWN_KITCHEN.name,
      ...(variant ? { variant } : {}),
      ...(addOns.length ? { addOns } : {}),
      ...(doc ? { menuItemId: key, taxRate: typeof doc.taxRate === 'number' ? doc.taxRate : null, category: doc.category || raw.category || '' } : {}),
    };
  });

  // Restaurants, their cities and the business rules, from the panel.
  const hotelIds = [...new Set(lines.map((l) => l.hotelId))];
  const hotels = await src.hotels(hotelIds).catch(() => ({}));
  for (const l of lines) if (hotels[l.hotelId]?.name && (l.hotelName === null || String(l.id || '').includes('__'))) l.hotelName = hotels[l.hotelId].name;
  for (const l of lines) if (!l.hotelName) l.hotelName = l.hotelId;
  const cityIds = [...new Set(hotelIds.map((id) => hotels[id]?.cityId).filter(Boolean))];
  const [cities, business] = await Promise.all([src.cities(cityIds).catch(() => ({})), src.business().catch(() => ({}))]);

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  // Delivery: from the first restaurant (where the rider starts), by its city.
  const lead = hotels[lines[0]?.hotelId] || null;
  const leadCity = lead?.cityId ? cities[lead.cityId] : null;
  const d = cityDelivery(leadCity);
  const origin = lead && typeof lead.lat === 'number' && typeof lead.lng === 'number' ? { lat: lead.lat, lng: lead.lng } : KITCHEN;
  const distanceKm = Math.round(haversineKm(origin.lat, origin.lng, location.lat, location.lng) * 100) / 100;

  // Service areas: a restaurant that lists areas serves only those.
  let area = null;
  let outsideArea = false;
  const servedAreaIds = Array.isArray(lead?.serviceAreaIds) ? lead.serviceAreaIds : [];
  if (servedAreaIds.length) {
    const areas = (await src.areas(cityIds).catch(() => [])).filter((a) => servedAreaIds.includes(a.id));
    area = matchArea(areas, location, location.address, haversineKm);
    outsideArea = !area;
  }

  // Coupon: full terms when the panel has the coupon, else the settings list.
  const code = String(couponCode || '').trim().toUpperCase();
  let coupon = null;
  let fullTerms = false;
  let eligibleSubtotal = subtotal;
  let eligibleByHotel = null;
  if (code) {
    const doc = await src.coupon(code).catch(() => null);
    if (doc) {
      fullTerms = true;
      const inScope = (l) =>
        (!doc.hotelIds?.length || doc.hotelIds.includes(l.hotelId)) &&
        (!doc.categoryNames?.length || doc.categoryNames.map((x) => String(x).toLowerCase()).includes(String(l.category || '').toLowerCase()));
      eligibleByHotel = new Map();
      lines.filter(inScope).forEach((l) => eligibleByHotel.set(l.hotelId, (eligibleByHotel.get(l.hotelId) || 0) + l.price * l.quantity));
      eligibleSubtotal = [...eligibleByHotel.values()].reduce((s, v) => s + v, 0);
      const history = doc.newCustomersOnly || Number(doc.perCustomerLimit) > 0
        ? await src.customerHistory({ phone: customer.phone, userId: customer.userId }, code).catch(() => ({ priorOrders: 0, redemptions: 0 }))
        : { priorOrders: 0, redemptions: 0 };
      const problem = couponProblem({ ...doc, code }, { now, eligibleSubtotal, cityIds, history });
      if (problem) flags.push(`coupon ${code} ${problem}`);
      else coupon = { ...doc, code, isActive: true };
    } else {
      const coupons = Array.isArray(settings.coupons) ? settings.coupons : [];
      coupon = coupons.find((c) => String(c.code).toUpperCase() === code) || null;
      if (!coupon) flags.push(`coupon ${code} does not exist`);
    }
  }
  const couponDiscount = couponDiscountFor(coupon, eligibleSubtotal);
  if (code && coupon && coupon.type !== 'free_delivery' && couponDiscount === 0) flags.push(`coupon ${code} not valid for this order`);

  const freeByCoupon = !!coupon && coupon.isActive && coupon.type === 'free_delivery' && eligibleSubtotal >= Number(coupon.minOrderValue || 0);
  const surcharge = area ? Number(area.surcharge) || 0 : 0;
  const deliveryCharge = freeByCoupon ? 0 : deliveryChargeFor(distanceKm, d) + surcharge;
  const freeDeliveryReason = freeByCoupon ? `${coupon.code} Promo` : '';

  // Packaging: the restaurant's own fee, else Mumtaz's ₹10, else the default.
  const packagingFor = (hotelId) => {
    const h = hotels[hotelId];
    if (h && typeof h.packagingFee === 'number') return h.packagingFee;
    if (hotelId === 'mumtaz') return MUMTAZ_PACKAGING_FEE;
    return Number(business.defaultPackagingFee) || 0;
  };
  // Tax is added only when the business shows prices without it.
  const exclusiveTax = business.taxMode === 'exclusive';
  const lineTax = (l) => (exclusiveTax ? (l.price * l.quantity * (l.taxRate ?? (Number(business.defaultTaxRate) || 0))) / 100 : 0);

  // One order per kitchen. Delivery rides with the first group, packaging with
  // each kitchen, and the discount is spread over the coupon's eligible food
  // so the groups always add up to exactly what the customer pays (the last
  // group takes the rounding).
  const byHotel = new Map();
  for (const l of lines) {
    if (!byHotel.has(l.hotelId)) byHotel.set(l.hotelId, { hotelId: l.hotelId, hotelName: l.hotelName, cityId: hotels[l.hotelId]?.cityId || '', items: [], subtotal: 0, tax: 0 });
    const g = byHotel.get(l.hotelId);
    g.items.push(l);
    g.subtotal += l.price * l.quantity;
    g.tax += lineTax(l);
  }
  const groups = [...byHotel.values()];
  const weightOf = (g) => (eligibleByHotel ? eligibleByHotel.get(g.hotelId) || 0 : g.subtotal);
  const weightTotal = groups.reduce((s, g) => s + weightOf(g), 0) || 1;
  let discountLeft = couponDiscount;
  groups.forEach((g, i) => {
    const share = i === groups.length - 1 ? discountLeft : Math.round((couponDiscount * weightOf(g)) / weightTotal);
    g.couponDiscount = Math.min(share, discountLeft);
    discountLeft -= g.couponDiscount;
    g.deliveryCharge = i === 0 ? deliveryCharge : 0;
    g.packagingFee = packagingFor(g.hotelId);
    g.taxAmount = Math.round(g.tax);
    delete g.tax;
    g.total = Math.max(0, g.subtotal + g.deliveryCharge + g.packagingFee + g.taxAmount - g.couponDiscount);
  });
  const packagingFee = groups.reduce((s, g) => s + g.packagingFee, 0);
  const taxAmount = groups.reduce((s, g) => s + g.taxAmount, 0);
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  // Cash on delivery: the city may not offer it, and the business may have it off.
  const codOffered =
    (!leadCity || !Array.isArray(leadCity.paymentMethods) || leadCity.paymentMethods.includes('cod')) &&
    business?.features?.codEnabled !== false;
  const minOrder = Math.max(d.minOrder, ...groups.map((g) => Number(hotels[g.hotelId]?.minOrderAmount) || 0));

  return {
    lines,
    groups,
    subtotal,
    deliveryCharge,
    packagingFee,
    taxAmount,
    couponCode: coupon && (couponDiscount > 0 || freeByCoupon) ? coupon.code : null,
    couponFullTerms: fullTerms && !!coupon && (couponDiscount > 0 || freeByCoupon),
    couponDiscount,
    freeDeliveryReason,
    grandTotal,
    distanceKm,
    maxKm: d.maxKm,
    codMaxKm: d.codMaxKm,
    codOffered,
    minOrder,
    outsideArea,
    areaId: area?.id || null,
    unavailable,
    hotels,
    cities,
    flags,
  };
}
