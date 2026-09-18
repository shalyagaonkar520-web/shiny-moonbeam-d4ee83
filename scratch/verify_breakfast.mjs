import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4190,r));
const b=await chromium.launch(); const page=await b.newPage({viewport:{width:390,height:844}});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));

// Hotel Sankalpa's own page
await page.goto('http://localhost:4190/hotel-sankalpa?preview=1',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2000);
let last=-1;
for(let i=0;i<60;i++){await page.mouse.wheel(0,4000);await page.waitForTimeout(110);
  const n=await page.evaluate(()=>document.body.textContent.length); if(n===last&&i>5)break; last=n;}
const txt=await page.evaluate(()=>document.body.textContent);
console.log('=== /hotel-sankalpa breakfast ===');
for(const [name,want] of [['Buns (2 pcs)',60],['Puri',60],['Vada (2 pcs)',70],['Idli (2 pcs)',40],['Idli Vada (2+1)',60],['Upma',30]])
  console.log('  ', txt.includes(name)?'PRESENT':'MISSING ', name.padEnd(18), 'expect \u20b9'+want);
console.log('  Idli + Vada (1+1) removed:', txt.includes('Idli + Vada (1+1)') ? 'STILL THERE (bad)' : 'yes');
console.log('  "Singal Puri" gone:', txt.includes('Singal Puri') ? 'STILL THERE (bad)' : 'yes');
const broken=await page.evaluate(()=>[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length);
console.log('  broken images:', broken);

// home page: same dishes, badged, correct prices
await page.goto('http://localhost:4190/?preview=1',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.dish-card-cv',{timeout:20000});
last=-1;
for(let i=0;i<80;i++){await page.mouse.wheel(0,4000);await page.waitForTimeout(110);
  const n=await page.evaluate(()=>document.querySelectorAll('.dish-card-cv').length); if(n===last&&i>6)break; last=n;}
const cards=await page.$$eval('.dish-card-cv',els=>els.map(e=>{
  const badgeEl=[...e.querySelectorAll('span')].find(n=>/^(Hotel Sankalpa|Hotel Mumtaz|Coastal Crown|Hotel Malabar)$/.test(n.textContent.trim()));
  const price=(e.textContent.match(/\u20b9(\d+)/)||[])[1];
  return {name:e.querySelector('h4')?.textContent.trim()||null, price:price?Number(price):null, badge:badgeEl?badgeEl.textContent.trim():null};
}));
console.log('\n=== home page ===');
console.log('  total cards:', cards.length, '| Sankalpa:', cards.filter(c=>c.badge==='Hotel Sankalpa').length);
for(const [name,want] of [['Buns (2 pcs)',60],['Puri',60],['Vada (2 pcs)',70]]){
  const c=cards.find(c=>c.badge==='Hotel Sankalpa'&&c.name===name);
  console.log('  ', c&&c.price===want?'OK  ':'FAIL', name.padEnd(16), 'want \u20b9'+want, '->', c?'\u20b9'+c.price:'NOT FOUND');
}
console.log('  1+1 gone from home:', cards.some(c=>c.name==='Idli + Vada (1+1)')?'STILL THERE (bad)':'yes');
console.log('\njs errors:', errs.length?errs.slice(0,3):'none');
await b.close(); srv.close();
