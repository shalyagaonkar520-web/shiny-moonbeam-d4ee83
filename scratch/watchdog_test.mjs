import { chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4312,r));
const b=await chromium.launch();

// A) healthy app: watchdog must NOT reload
{
  const ctx=await b.newContext({...devices['Pixel 5']});
  const page=await ctx.newPage();
  let navs=0; page.on('framenavigated',f=>{if(f===page.mainFrame())navs++;});
  await page.goto('http://localhost:4312/?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.dish-card-cv',{timeout:25000});
  const ready=await page.evaluate(()=>document.getElementById('root').hasAttribute('data-app-ready'));
  await page.waitForTimeout(15000);   // past the 12s grace window
  const cards=await page.evaluate(()=>document.querySelectorAll('.dish-card-cv').length);
  console.log('=== A. healthy app ===');
  console.log('  data-app-ready set:', ready);
  console.log('  navigations after load:', navs-1, '(0 = watchdog correctly stayed quiet)');
  console.log('  menu still rendered:', cards>0, '| cards:', cards);
  await ctx.close();
}

// B) stuck app: block the main bundle so React never mounts, like a stale SW shell
{
  const ctx=await b.newContext({...devices['Pixel 5']});
  const page=await ctx.newPage();
  await ctx.route('**/assets/index-*.js', r=>r.abort());
  let reloads=0; page.on('framenavigated',f=>{if(f===page.mainFrame())reloads++;});
  await page.goto('http://localhost:4312/?preview=1',{waitUntil:'domcontentloaded'});
  const stuck=await page.evaluate(()=>document.body.innerText.includes('Preparing delicious food'));
  await page.waitForTimeout(16000);   // grace window + reload
  console.log('\n=== B. bundle unreachable (simulates a stale cached shell) ===');
  console.log('  showed boot screen:', stuck);
  console.log('  watchdog reloaded the page:', reloads-1>0 ? 'YES ('+(reloads-1)+')' : 'NO  <-- watchdog did not fire');
  const flag=await page.evaluate(()=>{try{return sessionStorage.getItem('mm_selfheal_done');}catch(e){return 'n/a';}});
  console.log('  self-heal flag set (so it runs once, not a loop):', flag);
  await page.waitForTimeout(14000);
  console.log('  total navigations after 30s:', reloads-1, '(1 = exactly one heal, no loop)');
  await ctx.close();
}
await b.close(); srv.close();
