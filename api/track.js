import { adminDb, PROJECT_ID } from './_firebaseAdmin.js';
import { toStage, STAGE_LABEL } from './_orderStage.js';

// GET /api/track?id=<orderId>
//
// Public order-tracking endpoint for the /track pages (and anything else that
// needs an order's progress: a WhatsApp bot, an SMS link, a partner hotel).
//
// Knowing the order id is what authorises the read -- the same model as the
// /track/<orderId> link customers are sent -- so the response is deliberately
// cut down to what a tracking screen needs. It never returns the customer's
// phone number, full name, payment ids, coupon or wallet details, or any other
// order in the collection.

// Publishable web API key (the same value every browser receives); only used
// for the REST fallback when Admin SDK credentials are not configured.
const WEB_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDANM1MKe-aedlobMfOJFosQE4KP9sXDxc';

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{6,100}$/;

const db = adminDb;

// ---- Firestore REST fallback ----------------------------------------------
// Converts Firestore's typed REST values ({ stringValue: 'x' }) to plain JSON.
function fromRestValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return fromRestFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromRestValue);
  if ('geoPointValue' in v) return { lat: v.geoPointValue.latitude, lng: v.geoPointValue.longitude };
  return null;
}

function fromRestFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = fromRestValue(v);
  return out;
}

async function restGet(collection, id) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}?key=${WEB_API_KEY}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (res.status === 403) {
    // The security rules do not let anonymous callers read orders, which is
    // the right setting -- it just means this fallback cannot work. Give the
    // function real credentials instead (see NOT_CONFIGURED below).
    const err = new Error('Firestore denied the anonymous read');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }
  if (!res.ok) throw new Error(`Firestore REST ${res.status}`);
  const body = await res.json();
  return fromRestFields(body.fields || {});
}

async function getDocData(collection, id) {
  if (db) {
    const snap = await db.collection(collection).doc(id).get();
    return snap.exists ? snap.data() : null;
  }
  return restGet(collection, id);
}

// ---- shaping the response -------------------------------------------------

function toIso(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

function firstName(name) {
  return typeof name === 'string' ? name.trim().split(/\s+/)[0] || null : null;
}

// A position older than this is not shown: a rider whose phone went quiet
// is not where the map would say.
const FRESH_MS = 10 * 60 * 1000;

/**
 * The rider, from the moment one accepts the order. Their position is the
 * freshest of the two the rider app sends: the order's tracking card (every
 * 10 s while they hold the order) and their own record (every 30 s online).
 */
function riderView(order, rider, tracking, now = Date.now()) {
  if (!order.riderId) return null;
  const fixes = [];
  const t = tracking && tracking.riderLocation;
  if (t && t.riderId === order.riderId && typeof t.lat === 'number' && typeof t.lng === 'number') {
    fixes.push({ lat: t.lat, lng: t.lng, at: Number(t.at) || 0 });
  }
  const c = rider && rider.currentLocation;
  if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
    fixes.push({ lat: c.lat, lng: c.lng, at: new Date(c.lastUpdated || 0).getTime() || 0 });
  }
  const best = fixes.filter((f) => now - f.at <= FRESH_MS).sort((a, b) => b.at - a.at)[0] || null;
  return {
    name: (rider && rider.name) || order.riderName || 'Delivery partner',
    phone: (rider && rider.phone) || null,
    location: best ? { lat: best.lat, lng: best.lng } : null,
    locationAt: best ? new Date(best.at).toISOString() : null,
  };
}

export { riderView };

function shapeOrder(id, order, rider, tracking) {
  const stage = toStage(order);
  const loc = order.deliveryLocation || {};
  return {
    id,
    stage,
    stageLabel: STAGE_LABEL[stage],
    status: order.status || null,
    createdAt: toIso(order.createdAt),
    outForDeliveryAt: toIso(order.outForDeliveryAt),
    deliveredAt: toIso(order.deliveredAt),
    customerFirstName: firstName(order.userName),
    items: Array.isArray(order.items)
      ? order.items.map((i) => ({
          name: i?.name || 'Item',
          quantity: Number(i?.finalQuantity ?? i?.quantity ?? 1),
          hotelName: i?.hotelName || null,
        }))
      : [],
    amount: Number(order.payableAmount ?? order.grandTotal ?? 0),
    paymentMethod: order.paymentMethod || null,
    paymentStatus: order.paymentStatus || null,
    delivery: {
      address: loc.address || null,
      lat: typeof loc.lat === 'number' ? loc.lat : null,
      lng: typeof loc.lng === 'number' ? loc.lng : null,
      distanceKm: typeof loc.distance === 'number' ? loc.distance : null,
    },
    trackingLink: order.trackingLink || null,
    rated: !!order.customerRating,
    rider: riderView(order, rider, tracking),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Status changes minute to minute; never let a CDN or browser serve it stale.
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const id = String(req.query?.id || '').trim();
  if (!ORDER_ID_PATTERN.test(id)) {
    return res.status(400).json({ ok: false, error: 'invalid_order_id' });
  }

  try {
    const order = await getDocData('orders', id);
    if (!order) return res.status(404).json({ ok: false, error: 'order_not_found' });

    let rider = null;
    let tracking = null;
    if (order.riderId) {
      [rider, tracking] = await Promise.all([
        getDocData('riders', String(order.riderId)).catch(() => null),
        typeof order.trackingId === 'string' && /^[A-Za-z0-9_-]{10,64}$/.test(order.trackingId)
          ? getDocData('tracking', order.trackingId).catch(() => null)
          : null,
      ]);
    }

    return res.status(200).json({ ok: true, order: shapeOrder(id, order, rider, tracking) });
  } catch (error) {
    if (error.code === 'NOT_CONFIGURED') {
      console.error(
        'track: set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (a Firebase service account) ' +
        'in the hosting environment so this endpoint can read orders.'
      );
      return res.status(503).json({ ok: false, error: 'tracking_not_configured' });
    }
    console.error('track: lookup failed', error);
    return res.status(502).json({ ok: false, error: 'lookup_failed' });
  }
}
