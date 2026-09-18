import { chromium, devices } from 'playwright';
const BASE = 'http://localhost:5192';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 100)));
let bad = 0;
const check = (ok, m) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${m}`); };
const home = async () => { await p.goto(BASE + '/?preview=1', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2800); };

// 1. bottom navigation
await home();
for (const [label, expect] of [["Cakes & B'day", '/bulk'], ['Cart', '/checkout'], ['Account', null], ['Food', '/']]) {
  try {
    await p.locator('nav').getByText(label, { exact: true }).first().click({ timeout: 8000 });
    await p.waitForTimeout(1500);
    const url = new URL(p.url()).pathname;
    check(expect === null ? true : url === expect, `bottom nav "${label}" -> ${url}`);
  } catch (e) { check(false, `bottom nav "${label}" (${String(e).slice(0, 45)})`); }
}

// 2. partner hotel cards
for (const [name, expect] of [['Hotel Sankalpa', '/hotel-sankalpa'], ['Hotel Malabar', '/hotel-malabar'],
                              ['Coastal Crown', '/hotel-coastal-crown'], ['Hotel Al Amin', '/hotel-al-amin'],
                              ['Hotel Mumtaz', '/hotel-mumtaz']]) {
  try {
    await home();
    await p.getByText(name, { exact: true }).first().click({ timeout: 8000 });
    await p.waitForTimeout(1800);
    check(new URL(p.url()).pathname === expect, `hotel card "${name}" -> ${new URL(p.url()).pathname}`);
  } catch (e) { check(false, `hotel card "${name}" (${String(e).slice(0, 45)})`); }
}

// 3. ordering controls on a menu page
await p.goto(BASE + '/hotel-sankalpa?preview=1', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);
const dish = await p.locator('h4').first().innerText();
await p.getByRole('button', { name: /ADD/i }).first().click();
await p.waitForTimeout(1200);
check(await p.getByRole('button', { name: /Add one more/i }).first().isVisible().catch(() => false), `ADD "${dish}" turns into a stepper`);
await p.getByRole('button', { name: /Add one more/i }).first().click();
await p.waitForTimeout(900);
check(await p.getByText(/View Cart/i).first().isVisible().catch(() => false), 'floating cart bar appears');

// search on the menu page
await p.locator('input[type="text"]').first().fill('dosa');
await p.waitForTimeout(1300);
const hits = await p.locator('h4').count();
check(hits > 0, `menu search "dosa" returns ${hits} results`);
await p.locator('input[type="text"]').first().fill('');
await p.waitForTimeout(800);

// back button on the menu page
await p.getByLabel('Back to home').first().click();
await p.waitForTimeout(1600);
check(new URL(p.url()).pathname === '/', 'menu back button returns home');

// 4. cart survives in-app navigation to checkout
await p.locator('nav').getByText('Cart', { exact: true }).first().click();
await p.waitForTimeout(2500);
check(/checkout/.test(p.url()), 'Cart nav reaches checkout');
const body = await p.evaluate(() => document.body.innerText);
check(body.includes(dish), `checkout still lists "${dish}"`);
check(/Total Payable/i.test(body), 'checkout shows a payable total');

console.log(errs.length ? `\nJS errors: ${errs.slice(0, 3).join(' | ')}` : '\nNo JavaScript errors during the run.');
await b.close();
console.log(bad ? `\n${bad} FAILED` : '\nAll buttons and navigation work.');
