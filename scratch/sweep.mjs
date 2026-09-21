import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4189,r));
const B='http://localhost:4189';
const ROUTES=['/','/food','/grocery','/checkout','/profile','/bulk','/hotel-mumtaz','/hotel-al-amin',
 '/hotel-coastal-crown','/hotel-malabar','/hotel-sankalpa','/celebration','/feedback','/about','/orders','/spin','/login','/admin'];
const SIZES=[{w:320,h:568,n:'iPhone SE'},{w:390,h:844,n:'iPhone 14'},{w:430,h:932,n:'iPhone Pro Max'},
 {w:768,h:1024,n:'iPad'},{w:1440,h:900,n:'Desktop'}];
const b=await chromium.launch();
let fails=0;
console.log('=== ROUTE SWEEP (390px) ===');
for(const route of ROUTES){
  const page=await b.newPage({viewport:{width:390,height:844}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  try{
    await page.goto(B+route+'?preview=1',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(1600);
    const txt=await page.evaluate(()=>document.body.innerText.trim());
    const ofl=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    const broken=await page.evaluate(()=>[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc||i.src));
    const bad = errs.length || txt.length<20 || ofl>1 || broken.length;
    if(bad) fails++;
    console.log(`${bad?'FAIL':' OK '} ${route.padEnd(22)} text=${String(txt.length).padStart(5)} overflow=${ofl}px brokenImgs=${broken.length}${errs.length?' ERR: '+errs[0].slice(0,90):''}${broken.length?' IMG: '+broken[0].slice(-45):''}`);
  }catch(e){ fails++; console.log('FAIL',route,e.message.slice(0,90)); }
  await page.close();
}
console.log('\n=== RESPONSIVE SWEEP (home + sankalpa) ===');
for(const s of SIZES){
  for(const route of ['/','/hotel-sankalpa','/checkout']){
    const page=await b.newPage({viewport:{width:s.w,height:s.h}});
    await page.goto(B+route+'?preview=1',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(1200);
    const ofl=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if(ofl>1) fails++;
    console.log(`${ofl>1?'FAIL':' OK '} ${s.n.padEnd(15)} ${String(s.w)+'px'} ${route.padEnd(17)} overflow=${ofl}px`);
    await page.close();
  }
}
console.log('\n=== BUTTON SWEEP (home, 390px) ===');
{
  const page=await b.newPage({viewport:{width:390,height:844}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(B+'/?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.dish-card-cv',{timeout:20000});
  const n=await page.evaluate(()=>document.querySelectorAll('button').length);
  let clicked=0;
  for(let i=0;i<n;i++){
    try{
      const btns=await page.$$('button');
      if(!btns[i]) continue;
      const vis=await btns[i].isVisible().catch(()=>false);
      if(!vis) continue;
      await btns[i].click({timeout:1200});
      clicked++;
      await page.waitForTimeout(90);
      if(page.url()!==B+'/?preview=1'){ await page.goBack(); await page.waitForTimeout(400); }
      await page.keyboard.press('Escape').catch(()=>{});
    }catch{}
  }
  console.log(`clicked ${clicked}/${n} visible buttons, JS errors: ${errs.length?errs.slice(0,3):'none'}`);
  if(errs.length) fails++;
  await page.close();
}
console.log(fails? `\n${fails} FAILURES` : '\nSWEEP CLEAN');
await b.close(); srv.close();
