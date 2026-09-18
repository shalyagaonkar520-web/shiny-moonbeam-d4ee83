import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT = path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
await new Promise(r=>srv.listen(4185,r));
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('http://localhost:4185/?preview=1',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.dish-card-cv',{timeout:20000});
// keep scrolling until the grid stops growing (incremental rendering)
let last=-1;
for(let i=0;i<80;i++){
  await page.mouse.wheel(0,4000); await page.waitForTimeout(120);
  const n=await page.evaluate(()=>document.querySelectorAll('.dish-card-cv').length);
  if(n===last && i>6) break; last=n;
}
await page.waitForTimeout(500);
await page.waitForTimeout(500);

const cards = await page.$$eval('.dish-card-cv', els => els.map(e => {
  const badgeEl = [...e.querySelectorAll('span')].find(n =>
    /^(Hotel Sankalpa|Hotel Mumtaz|Coastal Crown|Hotel Malabar)$/.test(n.textContent.trim()));
  const price = (e.textContent.match(/₹(\d+)/) || [])[1];
  return {
    name: e.querySelector('h4')?.textContent.trim() || null,
    price: price ? Number(price) : null,
    badge: badgeEl ? badgeEl.textContent.trim() : null,
  };
}));

const want = {'Gobi Manchurian':70,'Paneer Masala':170,'Masala Dosa':60,'Daal Fry':100,'Kaju Masala':200,
 'Roasted Papad':20,'Uttappa':70,'Buns':60,'Veg Kolhapuri':130,'Lemon Rice':90,'Aloo Gobi Masala':120};
let bad=0;
for(const [n,p] of Object.entries(want)){
  const c=cards.find(c=>c.badge==='Hotel Sankalpa' && c.name===n);
  const ok = c && c.price===p;
  if(!ok) bad++;
  console.log((ok?'  OK  ':'  FAIL'), n.padEnd(20), 'want ₹'+p, '->', c?('₹'+c.price):'CARD NOT FOUND');
}
console.log('\nsankalpa cards on home:', cards.filter(c=>c.badge==='Hotel Sankalpa').length);
console.log('unbadged (Al Amin) cards:', cards.filter(c=>!c.badge).length);
console.log(bad? `\n${bad} PRICE MISMATCHES`:'\nALL SPOT-CHECKED PRICES CORRECT');

// add-to-cart from the home page
const sank = await page.$$('.dish-card-cv');
for (const el of sank) {
  const txt = await el.evaluate(n=>n.textContent);
  if (txt.includes('Hotel Sankalpa') && txt.includes('Paneer Handi')) {
    await el.scrollIntoViewIfNeeded();
    await el.$eval('button[title="Add dish"]', b=>b.click());
    break;
  }
}
await page.waitForTimeout(800);
const keys = await page.evaluate(()=>Object.keys(localStorage).filter(k=>/cart/i.test(k)).map(k=>k+' => '+localStorage.getItem(k).slice(0,300)));
console.log('\ncart after adding Paneer Handi from home:\n', keys.join('\n') || '(nothing written)');
await browser.close(); srv.close();
