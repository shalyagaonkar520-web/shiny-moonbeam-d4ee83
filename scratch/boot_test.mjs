import { chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4302,r));
const b=await chromium.launch();
for (const [label, sabotage] of [
  ['normal boot', null],
  ['Firebase totally broken (offline + bad key)', 'break'],
]) {
  const ctx=await b.newContext({ ...devices['Pixel 5'] });
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  if (sabotage) {
    // Simulate the worst case: every Google/Firebase endpoint unreachable.
    await ctx.route('**://*.googleapis.com/**', r=>r.abort());
    await ctx.route('**://*.firebaseio.com/**', r=>r.abort());
    await ctx.route('**://*.google.com/**', r=>r.abort());
  }
  await page.goto('http://localhost:4302/?preview=1',{waitUntil:'domcontentloaded'});
  let ok=false;
  try { await page.waitForSelector('.dish-card-cv',{timeout:25000}); ok=true; } catch {}
  const text=(await page.evaluate(()=>document.body.innerText)).trim();
  const cards=await page.evaluate(()=>document.querySelectorAll('.dish-card-cv').length);
  const stuck=/Preparing delicious food/.test(text) && cards===0;
  console.log(`\n=== ${label} ===`);
  console.log('  menu rendered:', ok?'YES':'NO', '| cards:', cards);
  console.log('  stuck on loader:', stuck?'YES  <-- BROKEN':'no');
  console.log('  text chars:', text.length);
  console.log('  fatal JS errors:', errs.length?errs.slice(0,3):'none');
  await ctx.close();
}
await b.close(); srv.close();
