// Server pricing, coupon and payment-signature checks. Run: npm test
// Needs no Firebase or Razorpay credentials.
const base = new URL('../api/', import.meta.url).href;
const { priceOrder, couponDiscountFor } = await import(base + '_pricing.js');
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
const { validCheckoutSignature } = await import(base + '_payments.js');
const { createHmac } = await import('node:crypto');
const { Readable } = await import('node:stream');
const place = (await import(base + 'place-order.js')).default;

let fail = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) fail++; };

// 1. Tampered price is replaced by the catalog price and flagged
const home = { lat: 14.9651, lng: 74.7105 };
const afternoon = new Date('2026-09-27T10:30:00Z'); // 16:00 IST
const r1 = await priceOrder({ items: [{ id: 'ff-1', name: 'Masala Papad', price: 1, quantity: 2 }], location: home, now: afternoon });
check('catalog price wins over tampered price', r1.lines[0].price === 69, `(got ${r1.lines[0].price})`);
check('tamper flagged', r1.flags.some((f) => f.includes('menu says ₹69')));
check('delivery charged in the afternoon', r1.deliveryCharge === 20, `(got ${r1.deliveryCharge})`);

// 2. No free delivery before 2 PM any more: mornings are charged too
const morningIST = new Date('2026-09-27T05:00:00Z'); // 10:30 IST
const r2 = await priceOrder({ items: [{ id: 'ff-1', name: 'Masala Papad', price: 69, quantity: 1 }], location: home, now: morningIST });
check('delivery charged in the morning', r2.deliveryCharge === 20 && r2.freeDeliveryReason === '', `(got ${r2.deliveryCharge})`);

// 3. Mumtaz packaging fee + multi-hotel split sums exactly
const mumtazId = Object.keys(JSON.parse((await import('node:fs')).readFileSync(new URL('_catalog.json', base), 'utf8'))).find((k) => k.startsWith('mumtaz-'));
const r3 = await priceOrder({
  items: [
    { id: 'ff-1', name: 'Masala Papad', price: 69, quantity: 1 },
    { id: mumtazId, name: 'Mumtaz dish', price: 0, quantity: 1 },
  ],
  location: home, now: afternoon,
});
const sumGroups = r3.groups.reduce((s, g) => s + g.total, 0);
check('packaging fee for Mumtaz', r3.packagingFee === 10);
check('groups sum to grand total', sumGroups === r3.grandTotal, `(${sumGroups} vs ${r3.grandTotal})`);
check('two kitchens -> two groups', r3.groups.length === 2);

// 4. Coupon rules
const c = { code: 'X', type: 'fixed_discount', value: 100, minOrderValue: 300, isActive: true };
check('coupon below minimum gives 0', couponDiscountFor(c, 60) === 0);
check('coupon capped at subtotal', couponDiscountFor({ ...c, minOrderValue: 0 }, 60) === 60);
check('inactive coupon gives 0', couponDiscountFor({ ...c, isActive: false }, 500) === 0);
check('percent coupon rounds', couponDiscountFor({ ...c, type: 'percent_discount', value: 15, minOrderValue: 0 }, 199) === 30);

// 5. Razorpay signature
const sig = createHmac('sha256', 'test_secret').update('order_1|pay_1').digest('hex');
check('valid signature accepted', validCheckoutSignature('order_1', 'pay_1', sig));
check('forged signature rejected', !validCheckoutSignature('order_1', 'pay_1', sig.replace(/.$/, '0')));
check('signature for another order rejected', !validCheckoutSignature('order_2', 'pay_1', sig));

// 6. place-order without Firebase credentials -> 503 so the app falls back
const res = await new Promise((resolve) => {
  const r = { code: 200, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, b }); }, end() { resolve({ code: this.code }); } };
  place({ method: 'POST', headers: {}, body: {} }, r);
});
check('place-order unconfigured -> 503', res.code === 503 && res.b.error === 'orders_not_configured');

// 7. Unknown items cannot carry a zero, negative or infinite price
for (const bad of [-200, 0, Infinity, 'abc']) {
  let code = null;
  try { await priceOrder({ items: [{ id: 'not-on-menu', name: 'X', price: bad, quantity: 1 }], location: home, now: afternoon }); }
  catch (e) { code = e.code; }
  check(`unknown item priced ${String(bad)} rejected`, code === 'INVALID_ITEM');
}
const okUnknown = await priceOrder({ items: [{ id: 'not-on-menu', name: 'Special', price: 120, quantity: 1 }], location: home, now: afternoon });
check('unknown item with a sane price is accepted but flagged', okUnknown.subtotal === 120 && okUnknown.flags.length > 0);

// 8. Webhook refuses to act without credentials or a valid signature
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
const { POST: webhook } = await import(base + 'razorpay-webhook.js');
const forged = await webhook(new Request('https://x/api/razorpay-webhook', {
  method: 'POST',
  headers: { 'x-razorpay-signature': 'deadbeef', 'content-type': 'application/json' },
  body: JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_x', order_id: 'order_x', amount: 100 } } } }),
}));
check('forged webhook refused', forged.status === 503 || forged.status === 401, `(status ${forged.status})`);

// 9. Shalya Pay — the self-hosted UPI gateway.
// Its notifications are what mark an order paid, and upstream a "payment" is a
// bank SMS parsed on a home PC, so these checks matter more than usual.
process.env.SHALYA_WEBHOOK_SECRET = 'shalya_whsec_test';
const { validShalyaWebhook, normalisePayment, isPaidStatus } = await import(base + '_shalyaPay.js');

const nowS = () => String(Math.floor(Date.now() / 1000));
const shalyaSign = (ts, raw, secret = 'shalya_whsec_test') =>
  createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');

const bodyPaid = JSON.stringify({ id: 'sp_1', orderId: 'ord_1', amount: 19900, status: 'paid', utr: '4299' });

const ts = nowS();
check('shalya: correctly signed webhook accepted',
  validShalyaWebhook(bodyPaid, { 'x-timestamp': ts, 'x-signature': shalyaSign(ts, bodyPaid) }).ok);

check('shalya: wrong signature refused',
  !validShalyaWebhook(bodyPaid, { 'x-timestamp': ts, 'x-signature': 'deadbeef' }).ok);

check('shalya: signature from another secret refused',
  !validShalyaWebhook(bodyPaid, { 'x-timestamp': ts, 'x-signature': shalyaSign(ts, bodyPaid, 'attacker') }).ok);

// A body edited after signing must not verify, or the amount could be raised
// or the order id swapped in transit.
const tampered = bodyPaid.replace('19900', '100');
check('shalya: tampered body refused',
  !validShalyaWebhook(tampered, { 'x-timestamp': ts, 'x-signature': shalyaSign(ts, bodyPaid) }).ok);

// Replay: a request captured an hour ago, still perfectly signed.
const oldTs = String(Math.floor(Date.now() / 1000) - 3600);
check('shalya: replayed old request refused',
  validShalyaWebhook(bodyPaid, { 'x-timestamp': oldTs, 'x-signature': shalyaSign(oldTs, bodyPaid) }).error === 'stale_timestamp');

check('shalya: missing signature header refused',
  !validShalyaWebhook(bodyPaid, { 'x-timestamp': ts }).ok);

// Fails closed: no secret configured must never mean "anything goes".
const savedSecret = process.env.SHALYA_WEBHOOK_SECRET;
delete process.env.SHALYA_WEBHOOK_SECRET;
check('shalya: unconfigured secret fails closed',
  validShalyaWebhook(bodyPaid, { 'x-timestamp': ts, 'x-signature': shalyaSign(ts, bodyPaid) }).error === 'webhook_secret_not_configured');
process.env.SHALYA_WEBHOOK_SECRET = savedSecret;

// Field normalisation, so a small difference in the real spec does not read
// undefined and quietly compare equal to nothing.
const n1 = normalisePayment({ id: 'sp_2', order_id: 'ord_2', amount: 5000, state: 'SUCCESS', rrn: '9931' });
check('shalya: snake_case and alternate names normalise',
  n1.orderId === 'ord_2' && n1.amountPaise === 5000 && n1.utr === '9931' && n1.status === 'success');

const n2 = normalisePayment({ payment: { id: 'sp_3', merchantOrderId: 'ord_3', amountRupees: 199, status: 'paid', utr: '7' } });
check('shalya: nested payment and rupee amounts normalise',
  n2.orderId === 'ord_3' && n2.amountPaise === 19900);

check('shalya: paid synonyms recognised',
  isPaidStatus('paid') && isPaidStatus('SUCCESS') && isPaidStatus('captured'));
check('shalya: pending and failed are not paid',
  !isPaidStatus('pending') && !isPaidStatus('failed') && !isPaidStatus(''));

// The provider switch must default to Razorpay, so a deployment that sets
// nothing keeps using the licensed aggregator.
const { PAYMENT_PROVIDER, usingShalya } = await import(base + '_payments.js');
check('payment provider defaults to razorpay', PAYMENT_PROVIDER === 'razorpay' && !usingShalya());

// The webhook endpoint stays inert while Razorpay is the live gateway.
const shalyaHook = (await import(base + 'shalya-webhook.js')).default;
let hookStatus = 0;
await shalyaHook(
  Object.assign(Readable.from([bodyPaid]), {
    method: 'POST',
    headers: { 'x-timestamp': ts, 'x-signature': shalyaSign(ts, bodyPaid) },
  }),
  { status(code) { hookStatus = code; return { json: () => {} }; } }
);
check('shalya webhook inert while razorpay is active', hookStatus === 503, `(status ${hookStatus})`);

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
