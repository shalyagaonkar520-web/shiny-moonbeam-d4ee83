import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4181,r));
const b=await chromium.launch(); const page=await b.newPage({viewport:{width:390,height:844}});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4181/?preview=1',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.dish-card-cv',{timeout:20000});

async function addByName(name, badge) {
  const idx = await page.evaluate(([name,badge])=>{
    const cards=[...document.querySelectorAll('.dish-card-cv')];
    return cards.findIndex(c=>c.querySelector('h4')?.textContent.trim()===name &&
      (badge===null ? !/Hotel Sankalpa|Hotel Mumtaz|Coastal Crown|Hotel Malabar/.test(c.textContent)
                    : c.textContent.includes(badge)));
  },[name,badge]);
  if(idx<0) { console.log('  card not found:',name); return false; }
  const el=(await page.$$('.dish-card-cv'))[idx];
  await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
  await el.$eval('button[title="Add dish"]', x=>x.click());
  await page.waitForTimeout(400);
  return true;
}

await addByName('Paneer Handi','Hotel Sankalpa');   // 200
await addByName('Chicken Sizzler','Hotel Mumtaz');  // mumtaz item
// the add should have replaced the "+" with a quantity stepper on that card
const steppers = await page.evaluate(()=>[...document.querySelectorAll('.dish-card-cv')]
  .filter(c=>!c.querySelector('button[title="Add dish"]'))
  .map(c=>c.querySelector('h4')?.textContent.trim()));
console.log('cards now showing a stepper:', steppers);

// navigate through the app (the cart is in-memory, a hard reload would clear it)
await page.evaluate(()=>{
  const el=[...document.querySelectorAll('a,button')].find(e=>/cart|checkout|view cart|proceed/i.test(e.textContent||''));
  if(el) el.click();
});
await page.waitForTimeout(1500);
if (!/checkout/i.test(page.url())) {
  await page.evaluate(()=>window.history.pushState({}, '', '/checkout'));
  await page.evaluate(()=>window.dispatchEvent(new PopStateEvent('popstate')));
  await page.waitForTimeout(1500);
}
console.log('url:', page.url());
const txt = await page.evaluate(()=>document.body.innerText);
console.log('--- checkout mentions ---');
for (const h of ['Hotel Sankalpa','Hotel Mumtaz','Paneer Handi','Chicken Sizzler']) {
  console.log('  ', h, txt.includes(h) ? 'PRESENT' : 'missing');
}
console.log('page errors:', errs.length?errs:'none');
await b.close(); srv.close();
