import { webkit, chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4382,r));
const B='http://localhost:4382';
const SAVED={state:null};
for (const [label, engine, dev] of [['Safari/iPhone',webkit,devices['iPhone 13']],['Chrome/Pixel',chromium,devices['Pixel 5']]]) {
  console.log(`\n=== ${label} ===`);
  const b=await engine.launch();
  // a) unknown order, Firestore unreachable  -> must show "Order not found", never hang
  {
    const ctx=await b.newContext({...dev});
    await ctx.route('**googleapis.com**', r=>r.abort());
    await ctx.route('**firestore**', r=>r.abort());
    const p=await ctx.newPage();
    await p.goto(B+'/track/does-not-exist?preview=1',{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(9000);
    const t=(await p.evaluate(()=>document.body.innerText)).trim();
    const stuck=/Preparing delicious food/.test(t);
    console.log(`  ${stuck?'FAIL':' ok '} unknown order + Firestore down -> ${stuck?'STUCK ON LOADER':JSON.stringify(t.replace(/\s+/g,' ').slice(0,60))}`);
    await ctx.close();
  }
  // b) order saved locally at checkout -> must render the tracking screen offline
  {
    const ctx=await b.newContext({...dev});
    await ctx.route('**googleapis.com**', r=>r.abort());
    await ctx.addInitScript(()=>{ try{ localStorage.setItem('moms_magic_orders', JSON.stringify([{id:'local-1',status:'preparing',items:[{name:'Paneer Handi',quantity:1,price:200}],total:200}])); }catch(e){} });
    const p=await ctx.newPage();
    await p.goto(B+'/track/local-1?preview=1',{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(9000);
    const t=(await p.evaluate(()=>document.body.innerText)).trim();
    const stuck=/Preparing delicious food/.test(t);
    console.log(`  ${stuck?'FAIL':' ok '} locally-saved order, offline   -> ${stuck?'STUCK':'rendered, '+t.length+' chars'}`);
    await ctx.close();
  }
  await b.close();
}
srv.close();
