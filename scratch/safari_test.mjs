import { webkit, chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4331,r));
const ROUTES=['/','/checkout','/hotel-sankalpa','/hotel-mumtaz','/profile','/bulk','/celebration','/celebration/design','/spin','/orders','/track/abc','/feedback','/login'];
for (const [label, engine, dev] of [
  ['WebKit / iPhone 13 (Safari)', webkit, devices['iPhone 13']],
  ['WebKit / iPad',               webkit, devices['iPad (gen 7)']],
  ['Chromium / Galaxy S9+',       chromium, devices['Galaxy S9+']],
]) {
  const b=await engine.launch();
  console.log(`\n================ ${label} ================`);
  for (const route of ROUTES) {
    const ctx=await b.newContext({...dev});
    const page=await ctx.newPage();
    const errs=[];
    page.on('pageerror',e=>errs.push('CRASH: '+e.message));
    page.on('console',m=>{if(m.type()==='error'&&!/insufficient permissions|firestore|installations|messaging/i.test(m.text()))errs.push('err: '+m.text());});
    let text='';
    try{
      await page.goto('http://localhost:4331'+route+'?preview=1',{waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForTimeout(3000);
      for(let i=0;i<4;i++){await page.evaluate(()=>window.scrollBy(0,2500));await page.waitForTimeout(250);}
      text=(await page.evaluate(()=>document.body.innerText)).trim();
    }catch(e){ errs.push('NAV FAIL: '+String(e).slice(0,100)); }
    const blank=text.length<40;
    const bad = errs.length || blank;
    console.log(`  ${bad?'FAIL':' ok '} ${route.padEnd(20)} text=${String(text.length).padStart(5)}${blank?' BLANK':''}${errs.length?'  '+errs[0].slice(0,120):''}`);
    await ctx.close();
  }
  await b.close();
}
srv.close();
