import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ preview: true });
import http from 'http';
import fs from 'fs';
import path from 'path';
await server.close();

const ROOT = path.resolve('dist');
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT,'index.html');
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
});
await new Promise(r=>srv.listen(4178,r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type()==='error') errors.push('console: ' + m.text()); });

const t0 = Date.now();
await page.goto('http://localhost:4178/?preview=1', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.dish-card-cv', { timeout: 20000 }); console.log('home loaded in', Date.now()-t0, 'ms');

// scroll to the bottom so every lazy section renders
for (let i=0;i<30;i++) { await page.mouse.wheel(0, 3000); await page.waitForTimeout(80); }
await page.waitForTimeout(800);

const badges = await page.$$eval('span', els =>
  els.map(e=>e.textContent.trim()).filter(t=>/^(Hotel Sankalpa|Hotel Mumtaz|Coastal Crown|Hotel Malabar|Hotel Al Amin)$/.test(t)));
const counts = {};
for (const b of badges) counts[b]=(counts[b]||0)+1;
console.log('hotel badges rendered:', counts, 'total', badges.length);

// order of first appearance in the main grid
const order = [...new Set(badges)];
console.log('badge order on page:', order);

// spot-check a few corrected Sankalpa prices
const cards = await page.$$eval('.dish-card-cv', els => els.map(e => e.innerText.replace(/\n+/g,' | ')));
console.log('main-grid cards:', cards.length);
for (const dish of ['Gobi Manchurian','Paneer Masala','Masala Dosa','Daal Fry','Kaju Masala']) {
  const hit = cards.find(c => c.includes(dish + ' ') && c.includes('Hotel Sankalpa'));
  console.log('  ', dish, '->', hit ? hit.slice(0,120) : 'NOT FOUND');
}

// add a Sankalpa dish from the home page and confirm the cart id
await page.evaluate(() => window.scrollTo(0,0));
const searchBox = await page.$('input[type="text"], input[placeholder]');
if (searchBox) { await searchBox.fill('Paneer Handi'); await page.waitForTimeout(600); }
const addBtn = await page.$('button[title="Add dish"]');
if (addBtn) { await addBtn.click(); await page.waitForTimeout(600); }
const cart = await page.evaluate(() => {
  const raw = localStorage.getItem('cart-storage') || localStorage.getItem('moms-magic-cart');
  return raw || Object.keys(localStorage).filter(k=>k.includes('cart')).map(k=>k+'='+localStorage.getItem(k)).join('\n');
});
console.log('cart storage:', String(cart).slice(0,400));

console.log('\nJS errors:', errors.length ? errors.slice(0,10) : 'none');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('horizontal overflow at 390px:', overflow, 'px');

await browser.close(); srv.close();
