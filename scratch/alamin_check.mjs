import { chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4402,r));
const WANT={'Fish Fry':250,'Mutton Sukka':249,'Triple Schezwan Rice':220,'Kushka':99,'Egg Biryani':149,'Chicken Biryani Half':129,'Chicken Biryani Full':179};
const b=await chromium.launch();

async function scrape(page, sel){
  let last=-1;
  for(let i=0;i<70;i++){ await page.evaluate(()=>window.scrollBy(0,4000)); await page.waitForTimeout(160);
    const n=await page.evaluate(s=>document.querySelectorAll(s).length, sel); if(n===last&&i>6)break; last=n; }
  await page.waitForTimeout(600);
  return page.$$eval(sel, els=>els.map(e=>{
    const price=(e.textContent.match(/\u20b9(\d+)/)||[])[1];
    const h=e.querySelector('h4')||e.querySelector('h3');
    return {name:h?h.textContent.trim():null, price:price?Number(price):null, txt:e.textContent};
  }));
}

console.log('=== HOME PAGE ===');
{ const ctx=await b.newContext({...devices['Pixel 5']}); const p=await ctx.newPage();
  await p.goto('http://localhost:4402/?preview=1',{waitUntil:'domcontentloaded'});
  await p.waitForSelector('.dish-card-cv',{timeout:25000});
  const cards=await scrape(p,'.dish-card-cv');
  for(const [n,want] of Object.entries(WANT)){
    const c=cards.find(c=>c.name===n);
    console.log(`  ${c&&c.price===want?'OK  ':'FAIL'} ${n.padEnd(22)} want \u20b9${want} -> ${c?'\u20b9'+c.price:'NOT FOUND'}`);
  }
  await ctx.close(); }

console.log('\n=== /hotel-al-amin ===');
{ const ctx=await b.newContext({...devices['Pixel 5']}); const p=await ctx.newPage();
  await p.goto('http://localhost:4402/hotel-al-amin?preview=1',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  let last=-1; for(let i=0;i<70;i++){await p.evaluate(()=>window.scrollBy(0,4000));await p.waitForTimeout(160);
    const n=await p.evaluate(()=>document.body.textContent.length); if(n===last&&i>6)break; last=n;}
  const body=await p.evaluate(()=>document.body.textContent.replace(/\s+/g,' '));
  for(const [n,want] of Object.entries(WANT)){
    const i=body.indexOf(n);
    const seg=i>=0?body.slice(i,i+120):'';
    const m=seg.match(/\u20b9(\d+)/);
    const got=m?Number(m[1]):null;
    console.log(`  ${got===want?'OK  ':'FAIL'} ${n.padEnd(22)} want \u20b9${want} -> ${got?'\u20b9'+got:'NOT FOUND'}`);
  }
  await ctx.close(); }
await b.close(); srv.close();
