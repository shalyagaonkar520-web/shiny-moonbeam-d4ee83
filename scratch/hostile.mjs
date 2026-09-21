import { webkit, chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4374,r));
const B='http://localhost:4374';

const SCENARIOS = [
  ['localStorage throws (private mode / blocked storage)', `
     const boom = () => { throw new DOMException('QuotaExceededError'); };
     try { Object.defineProperty(window,'localStorage',{configurable:true,get(){ return {getItem:boom,setItem:boom,removeItem:boom,clear:boom,key:boom,length:0}; }}); } catch(e){}
  `],
  ['sessionStorage throws', `
     const boom = () => { throw new DOMException('SecurityError'); };
     try { Object.defineProperty(window,'sessionStorage',{configurable:true,get(){ return {getItem:boom,setItem:boom,removeItem:boom,clear:boom,key:boom,length:0}; }}); } catch(e){}
  `],
  ['no service worker / no caches (older or restricted browser)', `
     try { Object.defineProperty(navigator,'serviceWorker',{configurable:true,get(){return undefined;}}); } catch(e){}
     try { delete window.caches; } catch(e){}
  `],
  ['no IntersectionObserver', `try { delete window.IntersectionObserver; } catch(e){}`],
  ['no requestIdleCallback (Safari < 16.4)', `try { delete window.requestIdleCallback; delete window.cancelIdleCallback; } catch(e){}`],
  ['fetch keepalive unsupported', `
     const of = window.fetch;
     window.fetch = (u,o) => { if(o&&o.keepalive) throw new TypeError('keepalive not supported'); return of(u,o); };
  `],
  ['no Notification / Push API (iOS Safari in-browser)', `
     try { delete window.Notification; } catch(e){}
     try { delete window.PushManager; } catch(e){}
  `],
];

for (const [engineName, engine, dev] of [['Safari/iPhone', webkit, devices['iPhone 13']], ['Chrome/Pixel', chromium, devices['Pixel 5']]]) {
  console.log(`\n================ ${engineName} ================`);
  const b=await engine.launch();
  for (const [label, script] of SCENARIOS) {
    const ctx=await b.newContext({...dev});
    await ctx.addInitScript(script);
    const page=await ctx.newPage();
    const errs=[];
    page.on('pageerror',e=>errs.push(e.message));
    let cards=0, text='';
    try{
      await page.goto(B+'/?preview=1',{waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForSelector(".dish-card-cv",{timeout:20000}).catch(()=>{}); await page.waitForTimeout(2000);
      await page.evaluate(()=>window.scrollBy(0,4000)).catch(()=>{});
      await page.waitForTimeout(1500);
      cards=await page.evaluate(()=>document.querySelectorAll('.dish-card-cv').length);
      text=(await page.evaluate(()=>document.body.innerText)).trim();
    }catch(e){ errs.push('NAV: '+String(e).slice(0,90)); }
    const broken = cards===0 || errs.length;
    console.log(`  ${broken?'FAIL':' ok '} ${label.padEnd(52)} cards=${String(cards).padStart(3)}${errs.length?'  '+errs[0].slice(0,110):''}`);
    await ctx.close();
  }
  await b.close();
}
srv.close();
