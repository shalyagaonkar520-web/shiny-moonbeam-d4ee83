import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4201,r));
const B='http://localhost:4201';
const ROUTES=['/','/food','/grocery','/checkout','/profile','/bulk','/hotel-mumtaz','/hotel-al-amin',
 '/hotel-coastal-crown','/hotel-malabar','/hotel-sankalpa','/celebration','/celebration/design','/feedback',
 '/about','/orders','/spin','/login','/admin','/delivery','/track/test123','/no-such-page'];
const b=await chromium.launch();
const issues=[];
for(const route of ROUTES){
  const page=await b.newPage({viewport:{width:390,height:844}});
  const log=[];
  page.on('pageerror',e=>log.push(['PAGEERROR',e.message]));
  page.on('console',m=>{const t=m.type(); if(t==='error'||t==='warning') log.push([t.toUpperCase(),m.text()]);});
  page.on('requestfailed',r=>log.push(['REQFAIL',r.url().replace(B,'')+' '+(r.failure()?.errorText||'')]));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('firestore')&&!r.url().includes('google')) log.push(['HTTP'+r.status(),r.url().replace(B,'')]);});
  await page.goto(B+route+'?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2200);
  for(let i=0;i<5;i++){await page.mouse.wheel(0,2500);await page.waitForTimeout(120);}
  const broken=await page.evaluate(()=>[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')));
  broken.forEach(s=>log.push(['BROKENIMG',s]));
  const noAlt=await page.evaluate(()=>[...document.images].filter(i=>!i.alt).length);
  const emptyBtn=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')&&!b.title).length);
  const filtered=log.filter(([k,v])=>!/insufficient permissions|Failed to load resource.*firestore|installations|FCM|messaging|notification permission/i.test(v));
  if(filtered.length) issues.push([route,filtered]);
  console.log(`${filtered.length?'!!':'ok'} ${route.padEnd(22)} issues=${filtered.length} imgNoAlt=${noAlt} btnNoLabel=${emptyBtn}`);
  await page.close();
}
console.log('\n================ DETAIL ================');
for(const [route,log] of issues){
  console.log('\n'+route);
  const seen=new Set();
  for(const [k,v] of log){ const key=k+v.slice(0,110); if(seen.has(key))continue; seen.add(key);
    console.log('   ',k,'|',v.slice(0,170)); }
}
console.log('\nroutes with issues:', issues.length, '/', ROUTES.length);
await b.close(); srv.close();
