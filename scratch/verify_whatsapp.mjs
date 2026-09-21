import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4191,r));
const B='http://localhost:4191';
const b=await chromium.launch();

// 1. every wa.me / tel: link the app renders, across the pages that show contact details
console.log('=== contact links rendered by the app ===');
const found=new Set();
for (const route of ['/','/profile','/feedback','/celebration','/spin','/checkout','/bulk','/about']) {
  const page=await b.newPage({viewport:{width:390,height:844}});
  await page.goto(B+route+'?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1500);
  // open any modal/dialog buttons that may hide contact numbers
  for (const label of ['Help to Order','Help','Need Help','Contact']) {
    try { await page.getByText(label,{exact:false}).first().click({timeout:700}); await page.waitForTimeout(500); } catch {}
  }
  const links=await page.evaluate(()=>[...document.querySelectorAll('a[href]')]
    .map(a=>a.getAttribute('href')).filter(h=>/wa\.me|whatsapp|^tel:/.test(h)));
  for (const l of links) found.add(route+'  '+l.split('?')[0]);
  await page.close();
}
[...found].sort().forEach(l=>console.log('  ',l));

// 2. the actual order link the WhatsApp button builds, for a normal and a bulk order
console.log('\n=== order send target ===');
for (const bulk of [false,true]) {
  const page=await b.newPage({viewport:{width:390,height:844}});
  await page.goto(B+'/?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.dish-card-cv',{timeout:20000});
  await page.$eval('button[title="Add dish"]',x=>x.click());
  await page.waitForTimeout(500);
  if (bulk) {
    await page.evaluate(()=>{window.history.pushState({},'','/bulk');window.dispatchEvent(new PopStateEvent('popstate'));});
    await page.waitForTimeout(1500);
  }
  await page.evaluate(()=>{window.history.pushState({},'','/checkout');window.dispatchEvent(new PopStateEvent('popstate'));});
  await page.waitForTimeout(1800);
  // capture whatever URL the app tries to open
  const opened=[];
  await page.evaluate(()=>{window.__opened=[];window.open=(u)=>{window.__opened.push(u);return null;};
    document.querySelectorAll('a[target="_blank"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();window.__opened.push(a.href);}));});
  const btns=await page.$$('button, a');
  for (const el of btns) {
    const t=(await el.evaluate(n=>n.textContent||'')).toLowerCase();
    if (/whatsapp|place order|send order|confirm order/.test(t)) {
      try { await el.click({timeout:1200}); await page.waitForTimeout(900); } catch {}
    }
  }
  const urls=await page.evaluate(()=>window.__opened||[]);
  const wa=urls.filter(u=>/wa\.me|whatsapp/.test(u));
  console.log(`  ${bulk?'bulk ':'food '} order -> ${wa.length?wa.map(u=>u.split('?')[0]).join(', '):'(no wa.me opened; form likely incomplete)'}`);
  await page.close();
}

// 3. nothing in the shipped bundle still carries the old number
const files=fs.readdirSync(path.join(ROOT,'assets')).filter(f=>f.endsWith('.js'));
let hits=0;
for(const f of files){ const t=fs.readFileSync(path.join(ROOT,'assets',f),'utf8');
  if(t.includes('7483187572')){hits++;console.log('  OLD NUMBER STILL IN BUNDLE:',f);} }
console.log('\nbuilt bundle contains 7483187572:', hits? 'YES ('+hits+' files)':'no');
const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
console.log('index.html contains 7483187572:', idx.includes('7483187572')?'YES':'no');
await b.close(); srv.close();
