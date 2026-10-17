// End-to-end checkout tests (npm run test:e2e) against a running dev server. Every external
// effect is mocked: /api/*, Razorpay, Firestore and WhatsApp never get a real
// request, so no real order is created.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(require('os').tmpdir(), 'momsmagic-e2e-');
// Start the app first: npm run dev  (or set E2E_BASE_URL)
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const LOC = { lat: 14.9651, lng: 74.7105, address: 'Main Road, Yellapur, Karnataka', distance: 0.19, isDeliverable: true };

let fail = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) fail++; };

async function newCtx(browser, { server, razorpay } = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await c.addInitScript((loc) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('delivery-location-storage', JSON.stringify({ state: { deliveryLocation: loc }, version: 0 }));
      localStorage.setItem('moms_magic_user_name', 'Test Customer');
      localStorage.setItem('moms_magic_user_phone', '9876543210');
      sessionStorage.setItem('moms_magic_location_confirmed', '1');
      sessionStorage.setItem('seeded', '1');
    }
  }, LOC);
  const calls = { place: [], verify: [], wa: [], firestoreWrites: 0 };
  // Firestore is blocked: the app runs on its bundled menu, and a fallback write can never land.
  await c.route(/firestore\.googleapis\.com/, (r) => { if (r.request().url().includes('Firestore/Write/channel')) calls.firestoreWrites++; r.abort(); });
  await c.route(/wa\.me|api\.whatsapp\.com/, (r) => { calls.wa.push(r.request().url()); r.fulfill({ status: 200, body: 'wa' }); });
  await c.route(/overpass-api|nominatim|router\.project-osrm/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await c.route('**/api/track**', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"ok":false}' }));
  await c.route('**/api/notify-order', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await c.route('**/api/send-telegram', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  await c.route('**/api/place-order', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}');
    calls.place.push(body);
    await server(r, body);
  });
  await c.route('**/api/verify-payment', (r) => { calls.verify.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  if (razorpay) {
    await c.route(/checkout\.razorpay\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: `
      window.Razorpay = function (opts) {
        this.opts = opts; window.__rzpOpts = opts;
        this.on = function () {};
        this.open = function () {
          setTimeout(function () {
            opts.handler({ razorpay_payment_id: 'pay_TEST123', razorpay_order_id: opts.order_id || '', razorpay_signature: 'sig_TEST' });
          }, 300);
        };
      };` }));
  }
  // Pop-ups (WhatsApp) only: the test's own page is opened by the test itself.
  c.on('page', async (p) => { const opener = await p.opener(); if (!opener) return; await p.waitForLoadState('commit').catch(() => {}); calls.wa.push(p.url()); await p.close().catch(() => {}); });
  return { c, calls };
}

async function addDishAndOpenCheckout(p) {
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  const add = p.locator('button[aria-label^="Add "], button:has-text("ADD")').first();
  await add.scrollIntoViewIfNeeded();
  await add.click();
  await p.waitForTimeout(600);
}

const okServer = (payment) => async (r, body) => {
  const amount = 69;
  r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      ok: true, orderId: body.orderId, amount,
      pricing: { subtotal: 69, deliveryCharge: 0, packagingFee: 0, couponDiscount: 0, grandTotal: amount },
      orders: [{ id: body.orderId, orderGroupId: body.orderId, items: body.items, payableAmount: amount, status: 'pending', createdAt: new Date().toISOString(), deliveryLocation: body.location }],
      razorpay: payment === 'online' ? { orderId: 'order_TEST', amount: amount * 100, key: 'rzp_test_key' } : null,
    }),
  });
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  // ---- A: cart survives a reload; COD order through the server
  {
    const { c, calls } = await newCtx(browser, { server: okServer('cod') });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push('A: ' + e.message));
    await addDishAndOpenCheckout(p);
    const before = await p.evaluate(() => JSON.parse(localStorage.getItem('moms-magic-cart') || '{}')?.state?.items?.length || 0);
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500);
    const after = await p.evaluate(() => JSON.parse(localStorage.getItem('moms-magic-cart') || '{}')?.state?.items?.length || 0);
    check('A cart persisted across reload', before > 0 && after === before, `(${before} -> ${after})`);

    await p.goto(BASE + '/checkout', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
    check('A no fake x1.25 strike price in checkout', !/₹\d+ ₹\d+ each/.test(body));
    await p.screenshot({ path: OUT + 'e2e-checkout.png', fullPage: true });
    await p.getByRole('button', { name: /confirm order/i }).click();
    await p.waitForURL(/\/track\//, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const sent = calls.place[0] || {};
    check('A place-order called once', calls.place.length === 1);
    check('A order id matches server format', /^[0-9]{13}[A-Z2-9]{10}$/.test(sent.orderId || ''), sent.orderId);
    check('A phone normalised', sent.customer?.phone === '9876543210');
    check('A COD requested', sent.paymentMethod === 'cod');
    check('A navigated to tracking', /\/track\/[0-9]{13}/.test(p.url()), p.url().replace(BASE, ''));
    check('A WhatsApp opened with order id', calls.wa.some((u) => decodeURIComponent(u).includes(sent.orderId || '@@')), `(${calls.wa.length} opens)`);
    const cartAfter = await p.evaluate(() => JSON.parse(localStorage.getItem('moms-magic-cart') || '{}')?.state?.items?.length ?? -1);
    check('A cart cleared after order', cartAfter === 0);
    check('A no browser Firestore write (server path)', calls.firestoreWrites === 0);
    await c.close();
  }

  // ---- B: server rejects the order -> clear message, cart kept
  {
    const { c, calls } = await newCtx(browser, { server: (r) => r.fulfill({ status: 422, contentType: 'application/json', body: '{"ok":false,"error":"outside_service_area"}' }) });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push('B: ' + e.message));
    await addDishAndOpenCheckout(p);
    await p.goto(BASE + '/checkout', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    await p.getByRole('button', { name: /confirm order/i }).click();
    await p.waitForTimeout(2500);
    const txt = (await p.locator('body').innerText());
    check('B rejection message shown', /outside our delivery area/i.test(txt));
    check('B stayed on checkout', p.url().endsWith('/checkout'));
    check('B no WhatsApp', calls.wa.length === 0);
    const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('moms-magic-cart') || '{}')?.state?.items?.length || 0);
    check('B cart kept', kept > 0);
    await c.close();
  }

  // ---- C: online payment through the server: Razorpay gets the SERVER order id, then verify-payment
  {
    const { c, calls } = await newCtx(browser, { server: okServer('online'), razorpay: true });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push('C: ' + e.message));
    await addDishAndOpenCheckout(p);
    await p.goto(BASE + '/checkout', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    await p.getByRole('button', { name: /pay online/i }).click();
    await p.waitForTimeout(500);
    await p.getByRole('button', { name: /confirm order/i }).click();
    await p.waitForURL(/\/track\//, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const opts = await p.evaluate(() => (window).__rzpOpts ? { order_id: (window).__rzpOpts.order_id, amount: (window).__rzpOpts.amount, key: (window).__rzpOpts.key } : null).catch(() => null);
    check('C place-order asked for online', calls.place[0]?.paymentMethod === 'online');
    check('C verify-payment called with signature', calls.verify[0]?.razorpay_signature === 'sig_TEST' && calls.verify[0]?.razorpay_order_id === 'order_TEST');
    check('C navigated to tracking', /\/track\//.test(p.url()));
    check('C WhatsApp says paid', calls.wa.some((u) => decodeURIComponent(u).includes('pay_TEST123')));
    await c.close();
  }

  // ---- D: server unavailable and Firestore unreachable -> honest failure, cart kept, no WhatsApp
  {
    const { c, calls } = await newCtx(browser, { server: (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"error":"orders_not_configured"}' }) });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push('D: ' + e.message));
    await addDishAndOpenCheckout(p);
    await p.goto(BASE + '/checkout', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    await p.getByRole('button', { name: /confirm order/i }).click();
    await p.waitForSelector("text=Couldn't save your order", { timeout: 25000 }).catch(() => {});
    const txt = await p.locator('body').innerText();
    check('D failure message instead of fake confirmation', /Couldn't save your order/.test(txt));
    check('D no WhatsApp when nothing saved', calls.wa.length === 0);
    check('D still on checkout', p.url().endsWith('/checkout'));
    await c.close();
  }

  // ---- E: invalid phone blocked on the client
  {
    const { c, calls } = await newCtx(browser, { server: okServer('cod') });
    const p = await c.newPage();
    await addDishAndOpenCheckout(p);
    await p.goto(BASE + '/checkout', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    await p.fill('input[type="tel"]', '12345');
    await p.getByRole('button', { name: /confirm order/i }).click();
    await p.waitForTimeout(1200);
    check('E short phone rejected before any request', calls.place.length === 0 && /valid 10-digit/i.test(await p.locator('body').innerText()));
    await c.close();
  }

  // ---- F: UPI through Shalya Pay. The customer leaves for their bank app, so
  // the browser must wait on the server rather than deciding anything itself.
  {
    const upiServer = async (r, body) => {
      const amount = 69;
      r.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          ok: true, orderId: body.orderId, amount,
          pricing: { subtotal: 69, deliveryCharge: 0, packagingFee: 0, couponDiscount: 0, grandTotal: amount },
          orders: [{ id: body.orderId, orderGroupId: body.orderId, items: body.items, payableAmount: amount, status: 'awaiting_payment', createdAt: new Date().toISOString(), deliveryLocation: body.location }],
          razorpay: null,
          upi: {
            paymentId: 'sp_TEST', amount,
            link: 'upi://pay?pa=test@okicici&am=69.00&cu=INR',
            qr: null, vpa: 'test@okicici',
          },
        }),
      });
    };
    const { c, calls } = await newCtx(browser, { server: upiServer });
    // Unpaid for the first two polls, then paid — the real thing takes a moment
    // for the bank alert to arrive and the webhook to land.
    calls.status = [];
    await c.route('**/api/payment-status**', (r) => {
      calls.status.push(r.request().url());
      const paid = calls.status.length > 2;
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, paid, status: paid ? 'pending' : 'awaiting_payment' }) });
    });

    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push('F: ' + e.message));
    await addDishAndOpenCheckout(p);
    await p.goto(BASE + '/checkout', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    await p.getByRole('button', { name: /pay online/i }).click();
    await p.waitForTimeout(500);
    await p.getByRole('button', { name: /confirm order/i }).click();

    // The waiting screen must appear before anything is confirmed.
    await p.waitForTimeout(1500);
    const waitingText = await p.locator('body').innerText();
    check('F waiting-for-payment screen shown', /waiting for your payment/i.test(waitingText));
    check('F shows the amount to pay', /69/.test(waitingText));
    check('F offers the UPI id as a fallback', /test@okicici/.test(waitingText));
    check('F not confirmed while unpaid', !/\/track\//.test(p.url()));
    check('F no WhatsApp before payment', calls.wa.length === 0);

    // The waiting screen must cover the bottom nav. It did not at first: the
    // page is inside a Framer Motion opacity animation, which makes a stacking
    // context, so the overlay's z-index never competed with the nav outside it.
    // The nav stayed tappable and the cart still held the items, so a customer
    // tired of waiting could reach Cart -> Checkout and pay twice.
    const cartTab = p.getByRole('button', { name: /cart/i }).first();
    await cartTab.click({ timeout: 2000 }).catch(() => { /* covered: expected */ });
    await p.waitForTimeout(800);
    // The route legitimately stays /checkout — the overlay is rendered by that
    // page. What must not happen is the nav taking the customer elsewhere, so
    // the assertion is that the waiting screen is still what they are looking at.
    const stillWaiting = await p.locator('body').innerText();
    check('F bottom nav cannot be reached while paying',
      /waiting for your payment/i.test(stillWaiting));
    check('F still only one order placed', calls.place.length === 1, `(${calls.place.length})`);

    // Now let the polling see a paid order.
    await p.waitForURL(/\/track\//, { timeout: 25000 }).catch(() => {});
    await p.waitForTimeout(1500);
    check('F polled payment-status', calls.status.length >= 2, `(${calls.status.length} polls)`);
    check('F confirmed only after the server said paid', /\/track\//.test(p.url()));
    check('F WhatsApp sent after payment', calls.wa.length > 0);
    check('F no browser Firestore write', calls.firestoreWrites === 0);
    await c.close();
  }

  console.log('page errors:', errors.length ? errors.slice(0, 5) : 'none');
  console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
