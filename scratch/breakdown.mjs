import { chromium, devices } from 'playwright';
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13']});
const p=await ctx.newPage();
await p.goto('http://localhost:5192/?preview=1',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(6000);
const r=await p.evaluate(()=>{
  const by={};
  for(const e of performance.getEntriesByType('resource')){
    const t = /\.js(\?|$)/.test(e.name)?'JS' : /\.css/.test(e.name)?'CSS' : /\.(webp|jpg|jpeg|png|svg)/.test(e.name)?'images' : 'other';
    by[t]=(by[t]||0)+(e.transferSize||0);
  }
  const imgs=performance.getEntriesByType('resource').filter(e=>/\.(webp|jpg|jpeg|png)/.test(e.name));
  return {by, imgCount: imgs.length, biggest: imgs.sort((a,b)=>b.transferSize-a.transferSize).slice(0,6).map(e=>`${Math.round(e.transferSize/1024)}KB ${e.name.split('/').pop()}`)};
});
let tot=0; for(const k in r.by) tot+=r.by[k];
console.log(`total ${Math.round(tot/1024)} KB`);
for(const k of Object.keys(r.by).sort((a,b)=>r.by[b]-r.by[a])) console.log(`   ${k.padEnd(7)} ${String(Math.round(r.by[k]/1024)).padStart(5)} KB  (${Math.round(100*r.by[k]/tot)}%)`);
console.log(`\nimages loaded: ${r.imgCount}`);
console.log('biggest images:'); r.biggest.forEach(x=>console.log('   '+x));
await b.close();
