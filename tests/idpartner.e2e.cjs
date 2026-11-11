/**
 * ID Partner end to end, against the local emulators with the panel's real
 * firestore.rules. Never touches production.
 *
 * Run from the panel folder (so its rules and emulator ports are used):
 *   cd "<panel>" && firebase emulators:exec --only auth,firestore --project momsmagic-d131a \
 *     "node <this repo>/tests/idpartner.e2e.cjs"
 *
 * With rider delivery switched on for Yellapur, a customer orders (cash), the rider's app rings, the rider accepts,
 * picks up, moves (real geolocation updates), delivers and collects cash;
 * the customer's tracking page must follow every step live.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const { chromium } = require(path.join(REPO, 'node_modules/playwright'));
const PROJECT = 'momsmagic-d131a';
const FS = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const PORT = 5181;
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS || '';
// Emulator-only account: a throwaway password, never the real one.
const TEST_PASSWORD = 'emulator-only-test-pass';

const ZONE = { minLat: 14.856, maxLat: 15.073, minLng: 74.6, maxLng: 74.824 };
// Hotel Mumtaz's position as the panel would hold it (the rider's pickup).
const PICKUP = { lat: 14.9662, lng: 74.7135 };
const DROP = { lat: 14.9601, lng: 74.7079, address: 'Ganesh Nagar, Yellapur' };

let passed = 0;
let failed = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
};

// ── Firestore REST helpers (Bearer owner bypasses the rules in the emulator) ──
const val = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
};
const unval = (v) => {
  if (!v) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(unval);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, unval(x)]));
};
const docUrl = (p) => `http://${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`;
async function put(p, data) {
  const r = await fetch(docUrl(p), {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, val(v)])) }),
  });
  if (!r.ok) throw new Error(`seed ${p}: ${r.status} ${await r.text()}`);
}
async function get(p) {
  const r = await fetch(docUrl(p), { headers: { Authorization: 'Bearer owner' } });
  if (!r.ok) return null;
  const j = await r.json();
  return Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, unval(v)]));
}
async function listOrders() {
  const r = await fetch(`http://${FS}/v1/projects/${PROJECT}/databases/(default)/documents/orders`, { headers: { Authorization: 'Bearer owner' } });
  const j = await r.json();
  return (j.documents || []).map((d) => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, unval(v)])) }));
}

async function seed() {
  await fetch(`http://${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  const signUp = await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'partner@idpartner.momsmagic.shop', password: TEST_PASSWORD, returnSecureToken: true }),
  }).then((r) => r.json());
  const uid = signUp.localId;
  if (!uid) throw new Error('could not create rider: ' + JSON.stringify(signUp));
  await put(`users/${uid}`, { uid, email: 'partner@idpartner.momsmagic.shop', name: 'Ravi', role: 'RIDER', active: true });
  await put(`riders/${uid}`, { uid, name: 'Ravi', phone: '9000000001', status: 'offline', active: true, earnings: 0, deliveredCount: 0 });
  await put('cities/yellapur', { name: 'Yellapur', active: true, riderDirect: true, deliveryBounds: ZONE, etaMinutes: 10 });
  for (const id of ['mumtaz', 'moms-magic', 'al_amin', 'coastal_crown', 'malabar', 'sankalpa']) {
    await put(`hotels/${id}`, { name: id, cityId: 'yellapur', status: 'ACTIVE', acceptingOrders: true, ...(id === 'mumtaz' ? PICKUP : {}) });
  }
  return uid;
}

function startDev() {
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: REPO,
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      VITE_USE_FIREBASE_EMULATOR: 'true',
      VITE_FIRESTORE_EMULATOR_PORT: FS.split(':')[1],
      VITE_AUTH_EMULATOR_PORT: AUTH.split(':')[1],
    },
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  return child;
}

async function waitFor(url, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Database checks wait for the write to land (up to 10 s).
async function until(fn) { for (let i = 0; i < 20; i++) { const v = await fn(); if (v) return v; await sleep(500); } return false; }

(async () => {
  const uid = await seed();
  const dev = startDev();
  let browser;
  try {
    await waitFor(BASE + '/');
    browser = await chromium.launch();

    // ── Customer in Yellapur ─────────────────────────────────────────
    const cctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: DROP.lat, longitude: DROP.lng }, permissions: ['geolocation'] });
    await cctx.route(/wa\.me|api\.whatsapp\.com|api\.telegram\.org/, (r) => r.abort());
    await cctx.addInitScript(({ drop }) => {
      localStorage.setItem('delivery-location-storage', JSON.stringify({
        state: { deliveryLocation: { lat: drop.lat, lng: drop.lng, address: drop.address, distance: 0.6, isDeliverable: true, zoneId: 'yellapur' } }, version: 0,
      }));
      localStorage.setItem('mintoo_location_confirmed', String(Date.now()));
      sessionStorage.setItem('mintoo_yellapur_choice', 'food');
      window.open = () => null; // the WhatsApp hand-off
    }, { drop: DROP });
    const cust = await cctx.newPage();
    global.__pages = { cust };
    cust.on('pageerror', (e) => console.log('    [customer error]', e.message));

    // ── Rider ────────────────────────────────────────────────────────
    let pos = { latitude: PICKUP.lat, longitude: PICKUP.lng };
    const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: pos, permissions: ['geolocation', 'notifications'] });
    const rider = await rctx.newPage();
    global.__pages.rider = rider;
    rider.on('console', (m) => { if (m.type() === 'error' || /listener|refused|denied/i.test(m.text())) console.log('    [rider console]', m.text().slice(0, 200)); });
    cust.on('console', (m) => { if (m.type() === 'error') console.log('    [customer console]', m.text().slice(0, 200)); });
    rider.on('pageerror', (e) => console.log('    [rider error]', e.message));
    await rider.goto(BASE + '/partner');
    await rider.getByLabel('Username').fill('partner');
    await rider.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await rider.getByRole('button', { name: 'Sign in' }).click();
    await rider.getByRole('button', { name: /Go online/ }).waitFor({ timeout: 15000 });
    ok('rider signs in with username "partner"', true);
    await rider.getByRole('button', { name: /Go online/ }).click();
    await rider.getByText('Waiting for orders').first().waitFor({ timeout: 10000 });
    let st;
    for (let i = 0; i < 20 && st !== 'online'; i++) { st = (await get(`riders/${uid}`))?.status; if (st !== 'online') await sleep(500); }
    ok('rider goes online (saved in the database)', st === 'online', String(st));

    // Customer orders from a menu, cash on delivery.
    await cust.goto(BASE + '/hotel-mumtaz?preview=1');
    await cust.getByRole('button', { name: /Continue/ }).click({ timeout: 15000 });
    ok('Yellapur customer reaches the menu', true);
    await cust.getByText('ADD', { exact: true }).first().click({ timeout: 20000 });
    await sleep(600);
    await cust.goto(BASE + '/checkout?preview=1');
    await cust.getByPlaceholder(/name/i).first().fill('Asha');
    await cust.getByPlaceholder(/mobile/i).first().fill('9876543210');
    if (SHOTS) await cust.screenshot({ path: `${SHOTS}/e2e-checkout.png`, fullPage: true });
    await cust.getByRole('button', { name: /Confirm order/ }).click();
    await cust.waitForURL(/\/track\//, { timeout: 25000 });
    const orderId = new URL(cust.url()).pathname.split('/').pop();
    const order = (await listOrders()).find((o) => o.id === orderId);
    ok('order saved as a rider-direct order', order?.dispatchStatus === 'RIDER_DIRECT' && order?.riderOffer === 'OPEN' && order?.cityId === 'yellapur' && !!order?.trackingId,
      JSON.stringify({ d: order?.dispatchStatus, o: order?.riderOffer, c: order?.cityId }));
    await cust.getByText('Finding a delivery partner').first().waitFor({ timeout: 15000 });
    ok('customer sees "Order placed"', true);

    // Rider is alerted.
    await rider.getByText('New order!').first().waitFor({ timeout: 15000 });
    const alarmOn = await rider.evaluate(() => true);
    ok('rider gets the new-order popup', alarmOn);
    const popup = rider.getByRole('alertdialog');
    ok('popup shows customer, phone, item, total and address',
      (await popup.getByText('Asha').count()) > 0 && (await popup.getByText('9876543210').count()) > 0 &&
      (await popup.getByText(/Ganesh Nagar/).count()) > 0 && (await popup.getByText(/₹\d+/).count()) > 0 &&
      (await popup.getByText(/Pick up from/).count()) > 0);
    if (SHOTS) await rider.screenshot({ path: `${SHOTS}/e2e-rider-popup.png` });
    await popup.getByRole('button', { name: 'Accept order' }).click();
    await rider.getByRole('button', { name: 'Picked up order' }).waitFor({ timeout: 15000 });
    const accepted = await until(async () => { const o = await get(`orders/${orderId}`); return o?.riderId ? o : null; });
    ok('order assigned to this rider', accepted?.riderId === uid && accepted?.riderOffer === 'TAKEN');
    ok('rider map joins rider to customer (distance and minutes shown)', await rider.getByText(/(km|m) · [0-9]+ min/).first().waitFor({ timeout: 15000 }).then(() => true, () => false));

    await cust.getByText('Your order has been accepted!').first().waitFor({ timeout: 15000 });
    ok('customer sees "accepted" live, with approximate ETA', (await cust.getByText(/about 10 min/).count()) > 0);
    if (SHOTS) await cust.screenshot({ path: `${SHOTS}/e2e-cust-accepted.png`, fullPage: true });

    // Pickup -> GPS starts.
    await rider.getByRole('button', { name: 'Picked up order' }).click();
    await rider.getByRole('button', { name: 'Delivered', exact: true }).last().waitFor({ timeout: 15000 });
    ok('rider marks picked up (no kitchen step)', await until(async () => (await get(`orders/${orderId}`))?.orderStatus === 'OUT_FOR_DELIVERY'));

    const track = (await get(`orders/${orderId}`)).trackingId;
    const fixes = [];
    for (let i = 1; i <= 4; i++) {
      pos = { latitude: PICKUP.lat - 0.001 * i, longitude: PICKUP.lng - 0.001 * i };
      await rctx.setGeolocation(pos);
      await sleep(5000);
      const t = await get(`tracking/${track}`);
      if (t?.riderLocation) fixes.push(`${t.riderLocation.lat.toFixed(4)},${t.riderLocation.lng.toFixed(4)}`);
    }
    ok('rider GPS reaches the tracking record as it moves', new Set(fixes).size >= 3, fixes.join(' '));

    await cust.getByText('Your order is on the way').first().waitFor({ timeout: 15000 });
    ok('customer sees "on the way" with ETA and distance', (await cust.getByText('estimated arrival').count()) > 0 && (await cust.getByText('distance remaining').count()) > 0);
    const markerAt = () => cust.evaluate(() => {
      const icons = [...document.querySelectorAll('.leaflet-marker-icon')];
      const bike = icons.find((e) => e.textContent.includes('🛵'));
      return bike ? bike.style.transform : null;
    });
    const before = await markerAt();
    pos = { latitude: PICKUP.lat - 0.0055, longitude: PICKUP.lng - 0.0045 };
    await rctx.setGeolocation(pos);
    await sleep(6000);
    const after = await markerAt();
    ok('rider marker is on the customer map and moves', !!before && !!after && before !== after, `${before} -> ${after}`);
    if (SHOTS) await cust.screenshot({ path: `${SHOTS}/e2e-cust-live.png`, fullPage: true });

    // Delivered -> payment.
    await rider.getByRole('button', { name: 'Delivered', exact: true }).last().click();
    await rider.getByRole('button', { name: /Collect payment/ }).waitFor({ timeout: 15000 });
    await cust.getByText('Your order has been delivered successfully!').first().waitFor({ timeout: 15000 });
    ok('customer sees "delivered successfully"', true);
    await rider.getByRole('button', { name: /Collect payment/ }).click();
    await rider.getByText('Delivered today').first().waitFor({ timeout: 15000 });
    const done = await until(async () => { const o = await get(`orders/${orderId}`); return o?.orderStatus === 'COMPLETED' ? o : null; });
    ok('cash recorded and delivery closed', done?.orderStatus === 'COMPLETED' && done?.paymentStatus === 'completed' && done?.cashCollected === true);
    await cust.getByText('Delivery completed').first().waitFor({ timeout: 15000 });
    ok('customer sees "Payment completed" step', (await cust.getByText('Payment completed').count()) > 0);
    if (SHOTS) {
      await cust.screenshot({ path: `${SHOTS}/e2e-cust-done.png`, fullPage: true });
      await rider.screenshot({ path: `${SHOTS}/e2e-rider-history.png` });
    }
    await sleep(6000);
    const t1 = (await get(`tracking/${track}`))?.riderLocation?.at;
    await rctx.setGeolocation({ latitude: 31.26, longitude: 75.71 });
    await sleep(6000);
    const t2 = (await get(`tracking/${track}`))?.riderLocation?.at;
    ok('GPS stops after delivery is closed', t1 === t2);

    // Rider delivery switched OFF: orders go to JIS as before.
    await put('cities/yellapur', { name: 'Yellapur', active: true, riderDirect: false, deliveryBounds: ZONE, etaMinutes: 10 });
    const yctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await yctx.route(/wa\.me|api\.whatsapp\.com|api\.telegram\.org/, (r) => r.abort());
    await yctx.addInitScript(() => {
      localStorage.setItem('delivery-location-storage', JSON.stringify({
        state: { deliveryLocation: { lat: 14.9637, lng: 74.7093, address: 'Main Road, Yellapur', distance: 0.3, isDeliverable: true, zoneId: 'yellapur' } }, version: 0,
      }));
      localStorage.setItem('mintoo_location_confirmed', String(Date.now()));
      sessionStorage.setItem('mintoo_yellapur_choice', 'food');
      localStorage.removeItem('mintoo_rider_zone');
      window.open = () => null;
    });
    const y = await yctx.newPage();
    await y.goto(BASE + '/hotel-mumtaz?preview=1');
    await y.getByRole('button', { name: /Continue/ }).click({ timeout: 15000 });
    await y.getByText('ADD', { exact: true }).first().click({ timeout: 20000 });
    await sleep(600);
    await y.goto(BASE + '/checkout?preview=1');
    await y.getByPlaceholder(/name/i).first().fill('Ravi Y');
    await y.getByPlaceholder(/mobile/i).first().fill('9876500000');
    await y.getByRole('button', { name: /Confirm order/ }).click();
    await y.waitForURL(/\/track\//, { timeout: 25000 });
    const yid = new URL(y.url()).pathname.split('/').pop();
    const yo = await get(`orders/${yid}`);
    ok('rider delivery OFF: order goes to JIS (PENDING_DISPATCH, no rider offer)', yo?.dispatchStatus === 'PENDING_DISPATCH' && yo?.riderOffer === undefined && !yo?.trackingId);
    ok('rider delivery OFF: customer sees the usual "coming soon" tracking', await y.getByText('Coming soon').first().waitFor({ timeout: 15000 }).then(() => true, () => false));
  } catch (e) {
    failed++;
    console.log('  FAIL  run aborted:', e.message.split(String.fromCharCode(10))[0]);
    if (SHOTS) {
      for (const [n, pg] of Object.entries(global.__pages || {})) await pg.screenshot({ path: `${SHOTS}/e2e-fail-${n}.png`, fullPage: true }).catch(() => {});
    }
  } finally {
    await browser?.close();
    dev.kill();
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(dev.pid), '/T', '/F']);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
