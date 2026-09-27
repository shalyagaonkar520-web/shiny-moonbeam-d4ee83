// Server pricing, coupon and payment-signature checks. Run: npm test
// Needs no Firebase or Razorpay credentials.
const base = new URL('../api/', import.meta.url).href;
const { priceOrder, couponDiscountFor } = await import(base + '_pricing.js');
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
const { validCheckoutSignature } = await import(base + '_payments.js');
const { createHmac } = await import('node:crypto');
const place = (await import(base + 'place-order.js')).default;

let fail = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) fail++; };

// 1. Tampered price is replaced by the catalog price and flagged
const home = { lat: 14.9651, lng: 74.7105 };
const afternoon = new Date('2026-09-27T10:30:00Z'); // 16:00 IST
const r1 = await priceOrder({ items: [{ id: 'ff-1', name: 'Masala Papad', price: 1, quantity: 2 }], location: home, now: afternoon });
check('catalog price wins over tampered price', r1.lines[0].price === 69, `(got ${r1.lines[0].price})`);
check('tamper flagged', r1.flags.some((f) => f.includes('menu says ₹69')));
check('delivery charged after 2 PM IST', r1.deliveryCharge === 20, `(got ${r1.deliveryCharge})`);

// 2. Free before 2 PM uses India time, not server UTC
const morningIST = new Date('2026-09-27T05:00:00Z'); // 10:30 IST
const r2 = await priceOrder({ items: [{ id: 'ff-1', name: 'Masala Papad', price: 69, quantity: 1 }], location: home, now: morningIST });
check('free delivery before 2 PM IST', r2.deliveryCharge === 0 && r2.freeDeliveryReason === 'Free Before 2 PM');

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

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
