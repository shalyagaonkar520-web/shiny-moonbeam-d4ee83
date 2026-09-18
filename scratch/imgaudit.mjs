import { chromium, devices } from 'playwright';
const BASE='http://localhost:5190';
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13']});
const page=await ctx.newPage();
await page.goto(BASE+'/?preview=1',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(5000);
await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}window.scrollTo(0,0);});
await page.waitForTimeout(4000);
const rows = await page.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>i.naturalWidth).map(i=>({
  src:i.currentSrc.split('/').pop(), nw:i.naturalWidth, dw:Math.round(i.getBoundingClientRect().width*(window.devicePixelRatio||1))
})));
const over = rows.filter(r=>r.dw>0 && r.nw > r.dw*2).sort((a,b)=>b.nw/b.dw - a.nw/a.dw);
console.log(`images rendered: ${rows.length}`);
console.log(`oversized (natural > 2x needed): ${over.length}\n`);
console.log('  natural  needed  ratio  file');
for(const r of over.slice(0,18)) console.log(`  ${String(r.nw).padStart(7)}  ${String(r.dw).padStart(6)}  ${String((r.nw/r.dw).toFixed(1)).padStart(5)}x  ${r.src}`);
await b.close();
