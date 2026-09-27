// Firestore security rules checks, run against the local emulator:
//   npx firebase-tools emulators:exec --only firestore --project demo-momsmagic "node tests/rules.test.mjs"
// (needs Java; the emulator accepts unsigned test tokens, so no real project is touched)

const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8089';
const BASE = `http://${HOST}/v1/projects/demo-momsmagic/databases/(default)/documents`;

// Unsigned JWT the emulator accepts as a signed-in user.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (uid, claims = {}) =>
  `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: uid, user_id: uid, aud: 'demo-momsmagic', iss: 'https://securetoken.google.com/demo-momsmagic', iat: 1, exp: 9999999999, auth_time: 1, ...claims })}.`;

const toValue = (v) =>
  v === null ? { nullValue: null }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === 'string' ? { stringValue: v }
  : Array.isArray(v) ? { arrayValue: { values: v.map(toValue) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));

async function write(path, data, auth, { update = false } = {}) {
  const mask = update ? '?' + Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&') : '';
  const res = await fetch(`${BASE}/${path}${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: JSON.stringify({ fields: fields(data) }),
  });
  return res.status;
}
async function read(path, auth) {
  const res = await fetch(`${BASE}/${path}`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} });
  return res.status;
}
// Seed with rules bypassed (emulator "owner" credential).
const seed = (path, data) => write(path, data, 'owner');

let fail = 0;
const expect = (name, status, allowed) => {
  const ok = allowed ? status === 200 : status === 403;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} (HTTP ${status})`);
  if (!ok) fail++;
};

const order = (extra = {}) => ({
  orderGroupId: 'o1', userName: 'A', userPhone: '9876543210', status: 'pending', orderStatus: 'NEW',
  paymentStatus: 'pending', paymentMethod: 'cod', paymentId: null, items: [], payableAmount: 100, ...extra,
});

const admin = token('jis-admin', { admin: true });
const rider = token('rider1');
const otherRider = token('rider2');
const customer = token('cust1');

// ---- orders: browser fallback create
expect('guest can create a plain COD order', await write('orders/c1', order()), true);
expect('guest can create an unverified online order', await write('orders/c2', order({ paymentMethod: 'online', paymentStatus: 'unverified', clientPaymentId: 'pay_x' })), true);
expect('browser cannot create a paid order', await write('orders/c3', order({ paymentStatus: 'completed' })), false);
expect('browser cannot set a paymentId', await write('orders/c4', order({ paymentId: 'pay_x' })), false);
expect('browser cannot create a delivered order', await write('orders/c5', order({ orderStatus: 'DELIVERED' })), false);
expect('browser cannot assign itself as rider', await write('orders/c6', order({ riderId: 'rider1' })), false);
expect('browser cannot pose as server-priced', await write('orders/c7', order({ serverPriced: true })), false);
expect('browser cannot set a Razorpay order id', await write('orders/c8', order({ razorpayOrderId: 'order_x' })), false);
expect("browser cannot use paymentMethod 'free'", await write('orders/c9', order({ paymentMethod: 'free' })), false);
expect('guest cannot overwrite an existing order', await write('orders/c1', order({ payableAmount: 1 })), false);

// ---- orders: reading is private
expect('guest cannot read an order by id', await read('orders/c1'), false);
await seed('orders/mine', order({ userId: 'cust1' }));
expect('signed-in owner can read their order', await read('orders/mine', customer), true);
expect('admin can read any order', await read('orders/c1', admin), true);

// ---- orders: rider updates
await seed('orders/r1', order({ riderId: 'rider1', status: 'Confirmed' }));
expect('assigned rider can accept', await write('orders/r1', { status: 'Preparing', orderStatus: 'ACCEPTED', riderStatus: 'accepted' }, rider, { update: true }), true);
expect('assigned rider can deliver', await write('orders/r1', { status: 'delivered', orderStatus: 'DELIVERED', deliveredAt: '2026-09-27T10:00:00Z' }, rider, { update: true }), true);
await seed('orders/r2', order({ riderId: 'rider1', status: 'Confirmed' }));
expect('assigned rider can hand an order back', await write('orders/r2', { riderId: '', riderStatus: 'rejected' }, rider, { update: true }), true);
await seed('orders/r3', order({ riderId: 'rider1' }));
expect('rider cannot reassign to another rider', await write('orders/r3', { riderId: 'rider2' }, rider, { update: true }), false);
expect('rider cannot change prices', await write('orders/r3', { payableAmount: 1 }, rider, { update: true }), false);
expect('rider cannot invent a status', await write('orders/r3', { status: 'refunded' }, rider, { update: true }), false);
expect('another rider cannot touch it', await write('orders/r3', { status: 'delivered', orderStatus: 'DELIVERED' }, otherRider, { update: true }), false);
expect('admin can update any order', await write('orders/r3', { status: 'cancelled', orderStatus: 'CANCELLED' }, admin, { update: true }), true);

// ---- riders
await seed('riders/rider1', { name: 'R', phone: '1', earnings: 0, status: 'offline' });
expect('rider can go online', await write('riders/rider1', { status: 'online' }, rider, { update: true }), true);
expect('rider can report location', await write('riders/rider1', { currentLocation: { lat: 1, lng: 2 } }, rider, { update: true }), true);
expect('rider cannot set own earnings', await write('riders/rider1', { earnings: 9999 }, rider, { update: true }), false);
expect('rider cannot rename themselves', await write('riders/rider1', { name: '<img onerror=x>' }, rider, { update: true }), false);

// ---- users (wallet)
expect('customer can create profile with ₹0 wallet', await write('users/cust1', { name: 'C', walletBalance: 0, rewardPoints: 0 }, customer), true);
expect('customer can edit their name', await write('users/cust1', { name: 'C2' }, customer, { update: true }), true);
expect('customer cannot credit their wallet', await write('users/cust1', { walletBalance: 99999 }, customer, { update: true }), false);
expect('customer cannot create profile with money', await write('users/cust2', { name: 'X', walletBalance: 500 }, token('cust2')), false);
expect("customer cannot read someone else's profile", await read('users/cust1', token('cust3')), false);

// ---- server-only collections
expect('browser cannot write payments', await write('payments/order_x', { groupId: 'o1', amountPaise: 1 }, customer), false);
expect('browser cannot write ratings', await write('ratings/o1', { stars: 5 }, customer), false);

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
