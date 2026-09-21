import { webkit, chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
let MODE='ok', got=[];
const srv=http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]);
  if(p==='/api/send-telegram'){ let body=''; q.on('data',c=>body+=c); q.on('end',()=>{
      if(MODE==='down'){ r.writeHead(500,{'Content-Type':'application/json'}); r.end('{"success":false,"error":"Notifications are not configured"}'); return; }
      try{ got.push(JSON.parse(body).text); }catch{ got.push(body); }
      r.writeHead(200,{'Content-Type':'application/json'}); r.end('{"success":true}'); }); return; }
  let f=path.join(ROOT,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4368,r));
const B='http://localhost:4368';
const LOC={state:{deliveryLocation:{lat:14.9637,lng:74.7089,address:'Test Address, Yellapur',distance:1.2,isDeliverable:true}},version:0};

async function newCtx(b){
  const ctx=await b.newContext({...devices['iPhone 13']});
  await ctx.addInitScript(loc=>{try{localStorage.setItem('delivery-location-storage',JSON.stringify(loc));}catch(e){}},LOC);
  await ctx.route('**wa.me**', r=>r.fulfill({status:200,contentType:'text/html',body:'<html><body>WHATSAPP</body></html>'}));
  return ctx;
}
async function placeOrder(page){
  await page.goto(B+'/?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.dish-card-cv',{timeout:25000});
  await page.$eval('button[title="Add dish"]',b=>b.click());
  await page.waitForTimeout(500);
  await page.evaluate(()=>{window.history.pushState({},'','/checkout');window.dispatchEvent(new PopStateEvent('popstate'));});
  await page.waitForTimeout(2000);
  await (await page.$('input[placeholder="Enter your name"]'))?.fill('Test Customer');
  await (await page.$('input[type="tel"]'))?.fill('9606001790');
  const btn=await page.$('button:has-text("Confirm Order")');
  await btn?.scrollIntoViewIfNeeded(); await btn?.click().catch(()=>{});
  await page.waitForTimeout(5000);
}

const b=await webkit.launch();
console.log('\n=== 1. FOOD ORDER (Safari) ===');
{ got=[]; MODE='ok'; const ctx=await newCtx(b); const p=await ctx.newPage(); await placeOrder(p);
  console.log('   telegram messages received:', got.length, got.length?('| "'+got[0].split('\n')[0].slice(0,45)+'"'):'  <-- LOST'); await ctx.close(); }

console.log('\n=== 2. FEEDBACK (Safari) ===');
{ got=[]; MODE='ok'; const ctx=await newCtx(b); const p=await ctx.newPage();
  await p.goto(B+'/feedback?preview=1',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
  const stars=await p.$$('button svg'); if(stars[4]) await stars[4].click().catch(()=>{});
  await p.waitForTimeout(400);
  const ta=await p.$('textarea'); if(ta) await ta.fill('Great food, very fast!');
  const sub=await p.$('button[type="submit"]'); await sub?.click().catch(()=>{});
  await p.waitForTimeout(4000);
  console.log('   telegram messages received:', got.length, got.length?('| "'+got[0].split('\n')[0].slice(0,45)+'"'):'  <-- LOST'); await ctx.close(); }

console.log('\n=== 3. RETRY QUEUE: endpoint down during order, back up on next visit ===');
{ got=[]; MODE='down'; const ctx=await newCtx(b); const p=await ctx.newPage(); await placeOrder(p);
  const queued=await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('mm_telegram_outbox')||'[]').length;}catch(e){return -1;}}).catch(()=>-1);
  console.log('   endpoint returned 500; messages delivered:', got.length, '| queued for retry:', queued);
  MODE='ok';
  const p2=await ctx.newPage();
  await p2.goto(B+'/?preview=1',{waitUntil:'domcontentloaded'});
  await p2.waitForSelector('.dish-card-cv',{timeout:25000});
  await p2.waitForTimeout(9000);   // idle callback + flush
  const left=await p2.evaluate(()=>{try{return JSON.parse(localStorage.getItem('mm_telegram_outbox')||'[]').length;}catch(e){return -1;}});
  console.log('   after next visit -> delivered:', got.length, '| still queued:', left, got.length>0&&left===0?' RECOVERED':' NOT RECOVERED');
  await ctx.close(); }
await b.close(); srv.close();
