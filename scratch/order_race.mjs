import { webkit, chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
// DELAY simulates a Vercel serverless cold start / slow mobile network.
const DELAY = Number(process.env.TG_DELAY || 2000);
let received = 0;
const srv=http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]);
  if(p==='/api/send-telegram'){
    let body=''; q.on('data',c=>body+=c);
    q.on('end',()=>{ received++;
      setTimeout(()=>{ try{ r.writeHead(200,{'Content-Type':'application/json'}); r.end('{"success":true}'); }catch(e){} }, DELAY); });
    return; }
  let f=path.join(ROOT,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4350,r));
const B='http://localhost:4350';
const LOC={state:{deliveryLocation:{lat:14.9637,lng:74.7089,address:'Test Address, Yellapur',distance:1.2,isDeliverable:true}},version:0};

for (const [label, engine, dev] of [
  ['Safari / iPhone 13', webkit, devices['iPhone 13']],
  ['Chrome / Pixel 5',   chromium, devices['Pixel 5']],
]) {
  received = 0;
  const b=await engine.launch();
  const ctx=await b.newContext({...dev});
  await ctx.addInitScript(loc=>{ try{ localStorage.setItem('delivery-location-storage', JSON.stringify(loc)); }catch(e){} }, LOC);
  await ctx.route('**wa.me**', r=>r.fulfill({status:200,contentType:'text/html',body:'<html><body>WHATSAPP</body></html>'}));
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push('CRASH: '+e.message));
  await page.goto(B+'/?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.dish-card-cv',{timeout:25000});
  await page.$eval('button[title="Add dish"]', b=>b.click());
  await page.waitForTimeout(500);
  await page.evaluate(()=>{window.history.pushState({},'','/checkout');window.dispatchEvent(new PopStateEvent('popstate'));});
  await page.waitForTimeout(2000);
  await (await page.$('input[placeholder="Enter your name"]'))?.fill('Test Customer');
  await (await page.$('input[type="tel"]'))?.fill('9606001790');
  await page.waitForTimeout(400);
  const btn=await page.$('button:has-text("Confirm Order")');
  await btn?.scrollIntoViewIfNeeded();
  await btn?.click().catch(()=>{});
  await page.waitForTimeout(9000);
  const body=await page.evaluate(()=>document.body.innerText).catch(()=>'(navigated away)');
  console.log(`\n=== ${label}  (proxy responds after ${DELAY}ms) ===`);
  console.log('  order submitted:', /WHATSAPP/.test(body)||page.url().includes('wa.me') ? 'YES (reached WhatsApp)' : 'blocked: '+body.replace(/\s+/g,' ').slice(0,90));
  console.log('  >>> Telegram POST reached the server:', received>0 ? 'YES' : 'NO   <-- ORDER LOST FROM TELEGRAM');
  console.log('  crashes:', errs.length?errs.slice(0,3):'none');
  await b.close();
}
srv.close();
