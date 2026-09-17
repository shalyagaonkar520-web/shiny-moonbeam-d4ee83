// Drive the running app and check that dish photos actually paint.
// Reports, per page: how many <img> rendered, how many failed to decode
// (naturalWidth === 0), and any console/network errors.
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5180';
const PAGES = [
  ['Home',           '/'],
  ['Hotel Sankalpa', '/hotel-sankalpa'],
  ['Hotel Mumtaz',   '/hotel-mumtaz'],
  ['Coastal Crown',  '/hotel-coastal-crown'],
  ['Hotel Malabar',  '/hotel-malabar'],
  ['Hotel Al Amin',  '/hotel-al-amin'],
];

const browser = await chromium.launch();
let failures = 0;

for (const [label, path] of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const badResponses = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 120)); });
  page.on('response', r => {
    if (r.status() >= 400 && /\.(jpg|jpeg|png|webp|svg)$/i.test(new URL(r.url()).pathname)) {
      badResponses.push(`${r.status()} ${new URL(r.url()).pathname}`);
    }
  });

  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // scroll the whole page so lazy images below the fold actually load
  await page.waitForTimeout(3000);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2500);

  const stats = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    const broken = imgs.filter(i => i.complete && i.naturalWidth === 0)
                       .map(i => i.getAttribute('src'));
    const lazy = imgs.filter(i => i.getAttribute('loading') === 'lazy').length;
    const noAlt = imgs.filter(i => !i.getAttribute('alt')).length;
    // the CSS placeholder DishImage falls back to
    const placeholders = document.querySelectorAll('[role="img"]').length;
    return { total: imgs.length, broken, lazy, noAlt, placeholders };
  });

  const bad = stats.broken.length + badResponses.length;
  if (bad) failures += bad;
  console.log(
    `${bad ? 'FAIL' : 'ok  '}  ${label.padEnd(16)} imgs:${String(stats.total).padStart(3)} ` +
    `lazy:${String(stats.lazy).padStart(3)} broken:${stats.broken.length} ` +
    `placeholder:${stats.placeholders} missingAlt:${stats.noAlt}` +
    (badResponses.length ? `  http-errors:${badResponses.slice(0, 3).join(', ')}` : '')
  );
  if (stats.broken.length) console.log('        broken srcs:', stats.broken.slice(0, 5));
  if (consoleErrors.length) console.log('        console:', consoleErrors.slice(0, 2));

  await page.screenshot({ path: `scratch/shot-${path.replace(/\W+/g, '_') || 'home'}.png`, fullPage: false });
  await ctx.close();
}

await browser.close();
console.log(failures ? `\nTOTAL IMAGE FAILURES: ${failures}` : '\nAll pages rendered every image successfully.');
process.exit(failures ? 1 : 0);
