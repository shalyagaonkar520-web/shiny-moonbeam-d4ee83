// Orders go straight to their restaurant; the track page sees the rider.
// Against the Firestore emulator:
//   npx -y firebase-tools@13 emulators:exec --only firestore --project demo-autodispatch "node tests/autodispatch.emulator.mjs"
import { generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.FIREBASE_PROJECT_ID = 'demo-autodispatch';
process.env.FIREBASE_CLIENT_EMAIL = 'test@demo-autodispatch.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
// No payment provider: markGroupPaid then relies on the signature check
// upstream, which is what lets the test call it directly.
delete process.env.RAZORPAY_KEY_ID;
delete process.env.RAZORPAY_KEY_SECRET;
process.env.PAYMENT_PROVIDER = 'razorpay';
delete process.env.TELEGRAM_BOT_TOKEN;

const base = new URL('../api/', import.meta.url).href;
const { adminDb } = await import(base + '_firebaseAdmin.js');
const place = (await import(base + 'place-order.js')).default;
const { markGroupPaid } = await import(base + '_payments.js');
const { resetAutoDispatchCache } = await import(base + '_autoDispatch.js');
const { riderView } = await import(base + 'track.js');
const track = (await import(base + 'track.js')).default;

let fail = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) fail++; };
let seq = 0;
const newId = () => `${Date.now()}`.slice(0, 13) + `ABCDEFGHJ${'KMNPQRSTUVWXYZ'[seq++ % 14]}`;

function call(handler, req) {
  return new Promise((resolve) => {
    const res = {
      code: 200, setHeader() {},
      status(c) { this.code = c; return this; },
      json(b) { resolve({ code: this.code, body: b }); },
      end() { resolve({ code: this.code }); },
    };
    handler(req, res).catch((e) => resolve({ code: 500, body: { error: String(e?.stack || e) } }));
  });
}
const order = (id, over = {}) => call(place, {
  method: 'POST', headers: { 'x-forwarded-for': `10.1.0.${++seq}` },
  body: {
    orderId: id, customer: { name: 'Asha', phone: '9876543210' },
    location: { lat: 14.9650, lng: 74.7130, address: 'Main Road, Yellapur' },
    paymentMethod: 'cod', items: [{ id: 'ff-1', name: 'Masala Papad', price: 69, quantity: 2 }], ...over,
  },
});

await adminDb.doc('hotels/moms-magic').set({ name: "Mom's Magic Kitchen", cityId: 'yellapur', status: 'ACTIVE', acceptingOrders: true, lat: 14.9643, lng: 74.7121 });
await adminDb.doc('system/settings').set({ websiteStatus: 'ON' });

// 1. A cash order is on the restaurant's screen at once.
let id = newId();
let r = await order(id);
let o = (await adminDb.doc(`orders/${id}`).get()).data();
check('cash order accepted', r.code === 200, `(${r.code} ${r.body?.error || ''})`);
check('sent straight to the restaurant', o?.dispatchStatus === 'SENT' && o.sentBy === 'auto' && o.orderStatus === 'NEW');
check('stamped with the restaurant city', o?.cityId === 'yellapur');
check('sent time recorded', !!o?.sentAt && typeof o.sentAt.toMillis === 'function');
check('history says it was sent', (o?.statusHistory || []).some((h) => h.status === 'SENT'));
check('has a tracking id', typeof o?.trackingId === 'string' && o.trackingId.length >= 20);
const card = o?.trackingId ? (await adminDb.doc(`tracking/${o.trackingId}`).get()).data() : null;
check('tracking card published', card?.orderId === id && card.status === 'NEW' && card.hotelLocation?.lat === 14.9643 && !!card.dropLocation);
const note = (await adminDb.doc(`notifications/${id}__ORDER_SENT_TO_HOTEL`).get()).data();
check('restaurant notified', note?.audience === 'HOTEL' && note.hotelId === 'moms-magic' && note.read === false);
check('browser copy carries plain values', r.body?.orders?.[0]?.dispatchStatus === 'SENT' && r.body.orders[0].sentAt === undefined || r.body?.orders?.[0]?.sentAt === null);
check('browser copy is JSON-clean', !JSON.stringify(r.body).includes('_methodName'));

// 2. Switched off: the order waits for JIS, exactly as before.
await adminDb.doc('system/settings').set({ websiteStatus: 'ON', autoDispatch: false });
resetAutoDispatchCache();
id = newId();
r = await order(id);
o = (await adminDb.doc(`orders/${id}`).get()).data();
check('switched off: order waits for Send', r.code === 200 && o?.dispatchStatus === 'PENDING_DISPATCH' && !o.trackingId);
await adminDb.doc('system/settings').set({ websiteStatus: 'ON', autoDispatch: true });
resetAutoDispatchCache();

// 3. An online order waits for its payment, then goes.
const gid = newId();
await adminDb.doc(`orders/${gid}`).set({
  orderGroupId: gid, hotelId: 'moms-magic', hotelName: "Mom's Magic Kitchen", serverPriced: true,
  paymentStatus: 'awaiting_payment', status: 'awaiting_payment', orderStatus: 'AWAITING_PAYMENT',
  dispatchStatus: 'PENDING_DISPATCH', sentAt: null, sentBy: null, razorpayOrderId: 'order_T1',
  subtotal: 138, deliveryLocation: { lat: 14.965, lng: 74.713, address: 'x' }, createdAt: new Date().toISOString(),
});
await adminDb.doc('payments/order_T1').set({ groupId: gid, amountPaise: 20000 });
const paid = await markGroupPaid('order_T1', 'pay_T1', { groupId: gid });
o = (await adminDb.doc(`orders/${gid}`).get()).data();
check('payment verified', paid.ok && paid.outcome === 'paid', JSON.stringify(paid));
check('paid order sent to the restaurant', o.paymentStatus === 'completed' && o.orderStatus === 'NEW' && o.dispatchStatus === 'SENT' && o.cityId === 'yellapur');
check('paid order trackable', !!o.trackingId && (await adminDb.doc(`tracking/${o.trackingId}`).get()).exists);
const again = await markGroupPaid('order_T1', 'pay_T1', { groupId: gid });
check('a repeated payment event changes nothing', again.ok && again.outcome === 'already');

// 4. The track page: the rider from the moment they accept.
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
check('no rider yet, none shown', riderView({ riderId: '' }, null, null) === null);
let v = riderView({ riderId: 'r1', riderName: 'Ravi' }, null, null, now);
check('accepted rider shown by name before any GPS', v.name === 'Ravi' && v.location === null);
v = riderView({ riderId: 'r1' }, { name: 'Ravi K', phone: '98', currentLocation: { lat: 1, lng: 1, lastUpdated: iso(now - 25000) } },
  { riderLocation: { lat: 2, lng: 2, riderId: 'r1', at: now - 5000 } }, now);
check('freshest position wins', v.location?.lat === 2 && v.name === 'Ravi K');
v = riderView({ riderId: 'r1' }, { currentLocation: { lat: 1, lng: 1, lastUpdated: iso(now - 3600e3) } },
  { riderLocation: { lat: 2, lng: 2, riderId: 'r1', at: now - 3600e3 } }, now);
check('stale positions hidden', v.location === null);
v = riderView({ riderId: 'r2' }, null, { riderLocation: { lat: 2, lng: 2, riderId: 'r1', at: now } }, now);
check('a previous rider position is ignored', v.location === null);

// End to end through /api/track: a rider accepts and pings.
const tid = o.trackingId;
await adminDb.doc(`orders/${gid}`).update({ orderStatus: 'RECEIVED', riderId: 'rider-1', riderName: 'Ravi', riderOffer: 'TAKEN' });
await adminDb.doc('riders/rider-1').set({ name: 'Ravi Kumar', phone: '9000000000', status: 'online' });
await adminDb.doc(`tracking/${tid}`).set({ riderLocation: { lat: 14.966, lng: 74.714, riderId: 'rider-1', at: Date.now() } }, { merge: true });
r = await call(track, { method: 'GET', query: { id: gid }, headers: {} });
check('track API shows the accepted rider and live position', r.code === 200 && r.body.order.rider?.name === 'Ravi Kumar' && r.body.order.rider.location?.lat === 14.966, JSON.stringify(r.body?.order?.rider));
check('accepted order shows as being prepared', r.body.order.stage === 'preparing');

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
