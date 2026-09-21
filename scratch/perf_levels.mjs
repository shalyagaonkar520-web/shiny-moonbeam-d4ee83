import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4270,r));
const b=await chromium.launch();
const LEVELS=[
 {n:'Wi-Fi, desktop/flagship', cpu:1, lat:20,  down:30*1024*1024/8},
 {n:'4G, mid-range phone    ', cpu:2, lat:70,  down:8*1024*1024/8},
 {n:'Slow 4G, low-end phone ', cpu:4, lat:150, down:1.6*1024*1024/8},
];
for(const L of LEVELS){
  const runs=[];
  for(let i=0;i<3;i++){
    const ctx=await b.newContext({viewport:{width:390,height:844}});
    const page=await ctx.newPage(); const cdp=await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:L.lat,downloadThroughput:L.down,uploadThroughput:L.down/2});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:L.cpu});
    const t0=Date.now();
    await page.goto('http://localhost:4270/?preview=1',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.dish-card-cv',{timeout:60000});
    const fcp=await page.evaluate(()=>{const e=performance.getEntriesByType('paint').find(p=>p.name==='first-contentful-paint');return e?Math.round(e.startTime):null;});
    runs.push([fcp, Date.now()-t0]); await ctx.close();
  }
  const med=i=>[...runs].map(r=>r[i]).sort((a,b)=>a-b)[1];
  console.log(`  ${L.n}  FCP ${String(med(0)).padStart(5)} ms   menu usable ${String(med(1)).padStart(5)} ms`);
}
await b.close(); srv.close();
