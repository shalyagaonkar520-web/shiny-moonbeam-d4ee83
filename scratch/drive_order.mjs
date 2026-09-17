// Drive a real ordering interaction: add a dish from the Sankalpa menu,
// then confirm it reaches the cart and the checkout summary with its photo.
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5180';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const step = (ok, msg) => console.log(`${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
let failed = 0;
const check = (ok, msg) => { if (!ok) failed++; step(ok, msg); };

await page.goto(`${BASE}/hotel-sankalpa`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

// name of the first dish card, then add it
const firstDish = await page.locator('h4').first().innerText();
await page.getByRole('button', { name: /ADD/i }).first().click();
await page.waitForTimeout(1200);
check(!!firstDish, `added first dish: "${firstDish}"`);

// the card should now show a quantity stepper
const stepperVisible = await page.getByRole('button', { name: /Add one more/i }).first().isVisible().catch(() => false);
check(stepperVisible, 'quantity stepper replaced the ADD button');

// increment it
if (stepperVisible) {
  await page.getByRole('button', { name: /Add one more/i }).first().click();
  await page.waitForTimeout(800);
}

// floating cart bar should appear
const cartBar = await page.getByText(/View Cart/i).first().isVisible().catch(() => false);
check(cartBar, 'floating cart bar appeared');

// Navigate WITHIN the SPA. A full reload is not valid here: the cart store
// deliberately empties itself on refresh, so page.goto would wipe the order.
await page.locator('nav').getByText(/^Cart$/).first().click();
await page.waitForTimeout(3000);

const summary = await page.evaluate((dish) => {
  const body = document.body.innerText;
  const imgs = [...document.querySelectorAll('img')];
  return {
    hasDish: body.includes(dish),
    imgCount: imgs.length,
    broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
    placeholders: document.querySelectorAll('[role="img"]').length,
  };
}, firstDish);

check(summary.hasDish, `checkout summary lists "${firstDish}"`);
check(summary.broken === 0, `checkout images all decoded (${summary.imgCount} imgs, ${summary.broken} broken)`);

await page.screenshot({ path: 'scratch/shot-checkout.png' });
await browser.close();
console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nOrdering flow works end to end.');
process.exit(failed ? 1 : 0);
