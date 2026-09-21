import { webkit, chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]);
  if(p==='/api/send-telegram'){ let body=''; q.on('data',c=>body+=c); q.on('end',()=>{
      console.log('        >> server received Telegram POST, bytes=', body.length);
      r.writeHead(200,{'Content-Type':'application/json'}); r.end('{"success":true}'); }); return; }
  let f=path.join(ROOT,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4341,r));
const B='http://localhost:4341';

for (const [label, engine, dev] of [
  ['Safari / iPhone 13', webkit, devices['iPhone 13']],
  ['Chrome / Pixel 5',   chromium, devices['Pixel 5']],
]) {
  console.log(`\n================ ${label} ================`);
  const b=await engine.launch();
  const ctx=await b.newContext({...dev});
  const page=await ctx.newPage();
  const errs=[];
  page.on('pageerror',e=>errs.push('CRASH: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/insufficient permissions|firestore|installations|messaging|invalid-api-key/i.test(m.text()))errs.push('err: '+m.text());});
  // stop the WhatsApp navigation from leaving the test, but record it
  await ctx.route('**wa.me**', r=>r.fulfill({status:200,contentType:'text/html',body:'<html><body>whatsapp</body></html>'}));

  await page.goto(B+'/?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.dish-card-cv',{timeout:25000});
  await page.$eval('button[title="Add dish"]', b=>b.click());
  await page.waitForTimeout(600);
  await page.evaluate(()=>{window.history.pushState({},'','/checkout');window.dispatchEvent(new PopStateEvent('popstate'));});
  await page.waitForTimeout(2000);

  const name=await page.$('input[placeholder="Enter your name"]');
  const phone=await page.$('input[type="tel"]');
  console.log('  name field:', !!name, '| phone field:', !!phone);
  if(name) await name.fill('Test Customer');
  if(phone) await phone.fill('9606001790');
  await page.waitForTimeout(400);

  const btn=await page.$('button:has-text("Confirm Order")');
  console.log('  confirm button found:', !!btn);
  if(btn){
    await btn.scrollIntoViewIfNeeded();
    const posts=[];
    page.on('request',r=>{ if(r.url().includes('send-telegram')) posts.push(r.method()+' '+r.url()); });
    await btn.click().catch(e=>errs.push('click failed: '+String(e).slice(0,90)));
    await page.waitForTimeout(7000);
    const body=await page.evaluate(()=>document.body.innerText).catch(()=>'(page gone)');
    console.log('  telegram requests seen by browser:', posts.length?posts:'NONE');
    console.log('  toast/validation text:', JSON.stringify(body.replace(/\s+/g,' ').slice(0,220)));
    console.log('  url now:', page.url());
  }
  console.log('  errors:', errs.length?errs.slice(0,5):'none');
  await b.close();
}
srv.close();
