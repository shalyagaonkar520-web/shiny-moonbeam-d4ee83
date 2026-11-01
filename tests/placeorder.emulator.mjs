// /api/place-order end to end against the Firestore emulator, with the data
// the Super Admin manages. Run:
//   npx -y firebase-tools@13 emulators:exec --only firestore --project demo-placeorder "node tests/placeorder.emulator.mjs"
import { generateKeyPairSync } from 'node:crypto';

// The Admin SDK only starts with a service account; any well-formed key does
// for the emulator, which never checks it.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.FIREBASE_PROJECT_ID = 'demo-placeorder';
process.env.FIREBASE_CLIENT_EMAIL = 'test@demo-placeorder.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';

const base = new URL('../api/', import.meta.url).href;
const { adminDb } = await import(base + '_firebaseAdmin.js');
const place = (await import(base + 'place-order.js')).default;

let fail = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) fail++; };
let seq = 0;
const orderId = () => `${Date.now()}${String(++seq).padStart(0, '')}`.slice(0, 13) + `ABCDEFGHJK`.slice(0, 10 - String(seq).length) + String(seq).replace(/[01]/g, 'X');

async function call(body, ip = `10.0.0.${++seq % 250}`) {
  return new Promise((resolve) => {
    const res = {
      code: 200, setHeader() {},
      status(c) { this.code = c; return this; },
      json(b) { resolve({ code: this.code, body: b }); },
      end() { resolve({ code: this.code }); },
    };
    place({ method: 'POST', headers: { 'x-forwarded-for': ip }, body }, res).catch((e) => resolve({ code: 500, body: { error: String(e) } }));
  });
}

const near = { lat: 14.63, lng: 74.85, address: 'MG Road, Sirsi 581401' };
const order = (over = {}) => ({
  orderId: orderId(), customer: { name: 'Asha', phone: '9876543210' }, location: near, paymentMethod: 'cod',
  items: [{ id: 'sirsi-diner__chicken-biryani', name: 'Chicken Biryani', price: 150, quantity: 1, variant: 'Half' }], ...over,
});

async function seed(over = {}) {
  const b = adminDb.batch();
  b.set(adminDb.doc('system/settings'), { websiteStatus: 'ON', coupons: [], ...(over.settings || {}) });
  b.set(adminDb.doc('system/business'), { taxMode: 'exclusive', defaultTaxRate: 5, ...(over.business || {}) });
  b.set(adminDb.doc('cities/sirsi'), { name: 'Sirsi', active: true, paymentMethods: ['cod', 'online'], delivery: { baseFee: 30, freeKm: 3, perKm: 8, maxKm: 6, codMaxKm: 5, minOrder: 100 }, ...(over.city || {}) });
  b.set(adminDb.doc('hotels/sirsi-diner'), { name: 'Sirsi Diner', cityId: 'sirsi', status: 'ACTIVE', acceptingOrders: true, lat: 14.62, lng: 74.84, ...(over.hotel || {}) });
  b.set(adminDb.doc('menuItems/sirsi-diner__chicken-biryani'), {
    hotelId: 'sirsi-diner', name: 'Chicken Biryani', price: 220, priceUpdatedAt: new Date(), available: true, category: 'Biryani',
    variants: [{ name: 'Half', price: 150 }, { name: 'Full', price: 220 }], addOns: [{ name: 'Raita', price: 20 }],
  });
  b.set(adminDb.doc('coupons/SIRSI20'), { code: 'SIRSI20', type: 'percent_discount', value: 20, maxDiscount: 100, minOrderValue: 100, isActive: true, usedCount: 0, usageLimit: 1, ...(over.coupon || {}) });
  b.set(adminDb.doc('serviceAreas/a1'), { cityId: 'sirsi', name: 'Centre', type: 'pincode', pincodes: ['581401'], active: true, surcharge: 0 });
  await b.commit();
}

await seed();

// 1. A cash order for a panel dish, with its city, tax and variant recorded.
let r = await call(order());
const saved = r.body?.orderId ? (await adminDb.doc(`orders/${r.body.orderId}`).get()).data() : null;
check('cash order accepted', r.code === 200, `(${r.code} ${r.body?.error || ''})`);
check('order priced from the panel variant', saved?.items?.[0]?.price === 150 && saved?.items?.[0]?.variant === 'Half');
check('order carries its city', saved?.cityId === 'sirsi');
check('order carries exclusive tax', saved?.taxAmount === 8, `(got ${saved?.taxAmount})`);
check('charged = food + delivery + tax', saved?.totalAmount === 150 + saved?.deliveryCharge + 8);

// 2. A full-terms coupon is redeemed with the order, exactly once.
r = await call(order({ couponCode: 'SIRSI20', customer: { name: 'Ravi', phone: '9123456780' } }));
const c1 = (await adminDb.doc('coupons/SIRSI20').get()).data();
const red = r.body?.orderId ? (await adminDb.doc(`couponRedemptions/${r.body.orderId}`).get()) : null;
check('coupon order accepted with discount', r.code === 200 && r.body.pricing.couponDiscount === 30, `(${r.code} ${JSON.stringify(r.body?.pricing || r.body)})`);
check('coupon use counted', c1.usedCount === 1);
check('redemption recorded', red?.exists && red.data().phone === '9123456780');

// 3. The last use cannot be taken twice, even at the same instant.
await adminDb.doc('coupons/SIRSI20').update({ usedCount: 0, usageLimit: 1 });
const [a, b] = await Promise.all([
  call(order({ couponCode: 'SIRSI20', customer: { name: 'A', phone: '9000000001' } })),
  call(order({ couponCode: 'SIRSI20', customer: { name: 'B', phone: '9000000002' } })),
]);
const discounted = [a, b].filter((x) => x.code === 200 && x.body.pricing.couponDiscount > 0).length;
const refused = [a, b].filter((x) => x.code === 409 && x.body.error === 'coupon_unavailable').length;
const fullPrice = [a, b].filter((x) => x.code === 200 && x.body.pricing.couponDiscount === 0).length;
check('last coupon use goes to exactly one order', discounted === 1 && discounted + refused + fullPrice === 2, `(discounted ${discounted}, refused ${refused}, full ${fullPrice})`);
check('usage never exceeds the limit', (await adminDb.doc('coupons/SIRSI20').get()).data().usedCount === 1);

// 4. The website switch.
await adminDb.doc('system/settings').update({ websiteStatus: 'OFF' });
r = await call(order());
check('store switched off refuses orders (not 503)', r.code === 409 && r.body.error === 'store_closed');
await adminDb.doc('system/settings').update({ websiteStatus: 'ON' });

// 5. Restaurant paused / city off.
await adminDb.doc('hotels/sirsi-diner').update({ pausedUntil: new Date(Date.now() + 3600e3).toISOString() });
r = await call(order());
check('paused restaurant refused', r.code === 409 && r.body.error === 'hotel_closed' && r.body.hotels?.[0]?.reason === 'paused');
await adminDb.doc('hotels/sirsi-diner').update({ pausedUntil: null });
await adminDb.doc('cities/sirsi').update({ active: false });
r = await call(order());
check('inactive city refused', r.code === 409 && r.body.hotels?.[0]?.reason === 'city_inactive');
await adminDb.doc('cities/sirsi').update({ active: true });

// 6. Service area, minimum order, cash on delivery.
await adminDb.doc('hotels/sirsi-diner').update({ serviceAreaIds: ['a1'] });
r = await call(order({ location: { ...near, address: 'Somewhere 581999' } }));
check('address outside the served areas refused', r.code === 422 && r.body.error === 'outside_service_area');
r = await call(order());
check('address inside the served area accepted', r.code === 200, `(${r.code} ${r.body?.error || ''})`);
r = await call(order({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1, variant: 'Half' }], couponCode: '' , location: near }));
await adminDb.doc('cities/sirsi').update({ 'delivery.minOrder': 500 });
r = await call(order());
check('below the city minimum refused', r.code === 422 && r.body.error === 'below_minimum_order');
await adminDb.doc('cities/sirsi').update({ 'delivery.minOrder': 100, paymentMethods: ['online'] });
r = await call(order());
check('cash on delivery refused where the city does not offer it', r.code === 422 && r.body.error === 'cod_not_available');
await adminDb.doc('cities/sirsi').update({ paymentMethods: ['cod', 'online'] });

// 7. A dish switched off in the panel.
await adminDb.doc('menuItems/sirsi-diner__chicken-biryani').update({ soldOut: true });
r = await call(order());
check('sold-out panel dish refused', r.code === 409 && r.body.error === 'dish_unavailable');

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
