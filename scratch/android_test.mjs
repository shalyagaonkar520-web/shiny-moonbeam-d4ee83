import { chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]);
  if(p==='/api/send-telegram'){ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{r.writeHead(200,{'Content-Type':'application/json'});r.end('{"success":true}');}); return; }
  let f=path.join(ROOT,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4410,r));
const B='http://localhost:4410';
const LOC={state:{deliveryLocation:{lat:14.9637,lng:74.7089,address:'Test Address, Yellapur',distance:1.2,isDeliverable:true}},version:0};
const b=await chromium.launch();

async function order(uaLabel, dev){
  const ctx=await b.newContext({...dev});
  await ctx.addInitScript(loc=>{try{localStorage.setItem('delivery-location-storage',JSON.stringify(loc));}catch(e){}},LOC);
  // capture what the app tries to navigate to, without actually leaving
  await ctx.addInitScript(()=>{
    window.__nav=[];
    const orig=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){ window.__nav.push(this.href||this.getAttribute('href')); };
    window.open=(u)=>{ window.__nav.push('open:'+u); return null; };
  });
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(B+'/?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.dish-card-cv',{timeout:25000});
  await page.$eval('button[title="Add dish"]',x=>x.click());
  await page.waitForTimeout(500);
  await page.evaluate(()=>{window.history.pushState({},'','/checkout');window.dispatchEvent(new PopStateEvent('popstate'));});
  await page.waitForTimeout(2000);
  await (await page.$('input[placeholder="Enter your name"]'))?.fill('Test Customer');
  await (await page.$('input[type="tel"]'))?.fill('9606001790');
  const btn=await page.$('button:has-text("Confirm Order")');
  await btn?.scrollIntoViewIfNeeded(); await btn?.click().catch(()=>{});
  await page.waitForTimeout(4000);
  const nav=await page.evaluate(()=>window.__nav||[]);
  console.log(`\n=== ${uaLabel} ===`);
  const wa=nav.filter(u=>u&&/wa\.me|whatsapp|intent:/i.test(u));
  if(!wa.length){ console.log('  FAIL no hand-off captured'); }
  wa.forEach(u=>console.log('  ->', u.slice(0,150)));
  console.log('  errors:', errs.length?errs.slice(0,2):'none');
  await ctx.close();
  return wa;
}

const androidNav = await order('Android (Pixel 5) - should emit intent:// for WhatsApp', devices['Pixel 5']);
const desktopNav = await order('Desktop Chrome - should emit a plain https wa.me link', {viewport:{width:1280,height:800}});

console.log('\n=== verdict ===');
const aOk = androidNav.some(u=>u.startsWith('intent://') && u.includes('package=com.whatsapp') && u.includes('browser_fallback_url'));
const dOk = desktopNav.some(u=>u.includes('wa.me') && !u.startsWith('intent://'));
console.log('  Android emits intent:// with package + fallback:', aOk?'YES':'NO');
console.log('  Desktop still emits a normal wa.me link      :', dOk?'YES':'NO');
await b.close(); srv.close();
