// End-to-end test of Quick Order (the guided chat) against a running dev
// server: npm run dev, then npm run test:quickorder. Every external effect is
// mocked (/api, Firestore, WhatsApp), so no real order is ever created.
const { chromium } = require('playwright');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const LOC = { lat: 14.9651, lng: 74.7105, address: 'Main Road, Yellapur', distance: 0.19, isDeliverable: true };

let fail = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) fail++; };

async function context(browser, { savedDetails, location = LOC }) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await c.addInitScript(([loc, saved]) => {
    if (sessionStorage.getItem('seeded')) return;
    if (loc) localStorage.setItem('delivery-location-storage', JSON.stringify({ state: { deliveryLocation: loc }, version: 0 }));
    sessionStorage.setItem('mintoo_yellapur_choice', 'food'); // answer the Food / Men's Wear question
    if (saved) {
      localStorage.setItem('mintoo_user_name', 'Saved Customer');
      localStorage.setItem('mintoo_user_phone', '9876543210');
    }
    sessionStorage.setItem('mintoo_location_confirmed', '1');
    sessionStorage.setItem('seeded', '1');
  }, [location, savedDetails]);
  const calls = { place: [], wa: [] };
  await c.route(/firestore\.googleapis\.com/, (r) => r.abort());
  await c.route(/wa\.me|api\.whatsapp\.com/, (r) => { calls.wa.push(r.request().url()); r.fulfill({ status: 200, body: 'wa' }); });
  await c.route(/overpass-api|nominatim|router\.project-osrm/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await c.route('**/api/track**', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"ok":false}' }));
  await c.route('**/api/notify-order', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await c.route('**/api/send-telegram', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  await c.route('**/api/kitchen-status**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"closed":[]}' }));
  await c.route('**/api/place-order', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}');
    calls.place.push(body);
    r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        ok: true, orderId: body.orderId, amount: 129,
        pricing: { subtotal: 129, deliveryCharge: 0, packagingFee: 0, couponDiscount: 0, grandTotal: 129 },
        orders: [{ id: body.orderId, orderGroupId: body.orderId, items: body.items, payableAmount: 129, status: 'pending', createdAt: new Date().toISOString(), deliveryLocation: body.location }],
        razorpay: null,
      }),
    });
  });
  c.on('page', async (p) => { if (!(await p.opener())) return; await p.waitForLoadState('commit').catch(() => {}); calls.wa.push(p.url()); await p.close().catch(() => {}); });
  return { c, calls };
}

async function pickBiryani(p) {
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  await p.getByRole('button', { name: 'Quick Order' }).click();
  const dlg = p.getByRole('dialog');
  await dlg.getByRole('button', { name: 'English' }).click();
  await dlg.getByRole('button', { name: /^Food/ }).click();
  await dlg.getByRole('button', { name: /^Both/ }).click();
  await dlg.getByRole('button', { name: 'Biryani' }).click();
  await dlg.getByRole('button', { name: /^Chicken Biryani/ }).click();
  await dlg.getByRole('button', { name: 'Add' }).first().click();
  return dlg;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  // ---- A: new customer: asked for name and phone, then places a COD order
  {
    const { c, calls } = await context(browser, { savedDetails: false });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push('A: ' + e.message));
    const dlg = await pickBiryani(p);
    check('A title says Quick Order', (await dlg.getByRole('heading', { name: 'Quick Order' }).count()) === 1);
    check('A no "Go to cart" button any more', (await dlg.getByRole('button', { name: /Go to cart/ }).count()) === 0);
    await dlg.getByRole('button', { name: /^Next/ }).click();
    check('A asks for name and phone', (await dlg.getByLabel('Your name').count()) === 1);
    await dlg.getByRole('button', { name: /^Next/ }).click();
    check('A refuses an empty name', (await dlg.getByRole('alert').innerText()).includes('name'));
    await dlg.getByLabel('Your name').fill('Asha');
    await dlg.getByLabel('10-digit mobile number').fill('12345');
    await dlg.getByRole('button', { name: /^Next/ }).click();
    check('A refuses a bad phone', (await dlg.getByRole('alert').innerText()).includes('10-digit'));
    await dlg.getByLabel('10-digit mobile number').fill('+91 98765 43210');
    await dlg.getByRole('button', { name: /^Next/ }).click();
    check('A shows the saved location', (await dlg.innerText()).includes('Main Road, Yellapur'));
    await dlg.getByRole('button', { name: /Deliver here/ }).click();
    check('A review lists the dish', /Chicken Biri?y?a?ni/i.test(await dlg.innerText()));
    await dlg.getByRole('button', { name: /Place order/ }).click();
    await p.waitForURL(/\/track\//, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const sent = calls.place[0] || {};
    check('A order sent to the server once', calls.place.length === 1);
    check('A cash on delivery', sent.paymentMethod === 'cod');
    check('A name and normalised phone sent', sent.customer?.name === 'Asha' && sent.customer?.phone === '9876543210');
    check('A biryani in the order', (sent.items || []).some((i) => /biri?y?a?ni/i.test(i.name)));
    check('A lands on tracking', /\/track\//.test(p.url()), p.url().replace(BASE, ''));
    check('A WhatsApp opened with the order id', calls.wa.some((u) => decodeURIComponent(u).includes(sent.orderId || '@@')));
    await c.close();
  }

  // ---- B: returning customer: details already saved, no form shown
  {
    const { c, calls } = await context(browser, { savedDetails: true });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push('B: ' + e.message));
    const dlg = await pickBiryani(p);
    await dlg.getByRole('button', { name: /^Next/ }).click();
    check('B skips the details form', (await dlg.getByLabel('Your name').count()) === 0 && (await dlg.innerText()).includes('Main Road'));
    await dlg.getByRole('button', { name: /Deliver here/ }).click();
    await dlg.getByRole('button', { name: /Place order/ }).click();
    await p.waitForURL(/\/track\//, { timeout: 30000 }).catch(() => {});
    check('B order placed with saved details', calls.place[0]?.customer?.name === 'Saved Customer');
    await c.close();
  }

  // ---- C: more than 5 km: no cash on delivery, sent to checkout to pay online
  {
    const far = { ...LOC, address: 'Far Village', distance: 8.4 };
    const { c, calls } = await context(browser, { savedDetails: true, location: far });
    const p = await c.newPage();
    const dlg = await pickBiryani(p);
    await dlg.getByRole('button', { name: /^Next/ }).click();
    check('C explains cash on delivery is not available', (await dlg.innerText()).includes('more than 5 km'));
    check('C no Deliver-here (COD) button', (await dlg.getByRole('button', { name: /Deliver here/ }).count()) === 0);
    await dlg.getByRole('button', { name: /Pay online at checkout/ }).click();
    await p.waitForTimeout(1500);
    check('C goes to checkout without placing an order', p.url().endsWith('/checkout') && calls.place.length === 0);
    await c.close();
  }

  console.log('page errors:', errors.length ? errors.slice(0, 3) : 'none');
  console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
