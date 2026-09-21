import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4262,r));
const b=await chromium.launch(); const page=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const got=new Map();
page.on('response',async r=>{const u=r.url(); if(!/\.(webp|jpg|jpeg|png)$/i.test(u))return;
  try{got.set(u.split('/').pop(),(await r.body()).length);}catch{}});
await page.goto('http://localhost:4262/?preview=1',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.dish-card-cv',{timeout:20000});
await page.waitForTimeout(2500);
const info=await page.evaluate(()=>[...document.images].filter(i=>i.naturalWidth>0).map(i=>({
  file:(i.currentSrc||i.src).split('/').pop(), nat:i.naturalWidth+'x'+i.naturalHeight,
  css:Math.round(i.getBoundingClientRect().width)+'x'+Math.round(i.getBoundingClientRect().height)})));
console.log('=== images decoded on first view (390px @2x => need 2x CSS px) ===');
let waste=0;
for(const i of info){
  const kb=Math.round((got.get(i.file)||0)/1024);
  const [nw]=i.nat.split('x').map(Number); const [cw]=i.css.split('x').map(Number);
  const over = cw>0 ? (nw/(cw*2)) : 0;
  if(over>1.4) waste+=kb;
  console.log(`  ${String(kb).padStart(4)} KB  ${i.nat.padEnd(11)} shown ${i.css.padEnd(9)} ${over>1.4?('x'+over.toFixed(1)).padEnd(5):'     '} ${i.file}`);
}
console.log('  ---'); console.log('  KB in oversized images:', waste);
await b.close(); srv.close();
