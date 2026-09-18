import { chromium } from 'playwright';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844}});
const p=await ctx.newPage();
await p.goto('http://localhost:5191/?preview=1',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(4000);
const out=await p.evaluate(()=>{
  const vw=window.innerWidth, hits=[];
  document.querySelectorAll('*').forEach(el=>{
    const r=el.getBoundingClientRect();
    const right=r.left+r.width;
    if (right > vw+1) {
      const cs=getComputedStyle(el);
      hits.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,70),
        left:Math.round(r.left), width:Math.round(r.width), right:Math.round(right),
        overflowX:cs.overflowX, pos:cs.position});
    }
  });
  // report the outermost offenders (smallest DOM depth)
  return {vw, scrollW: document.documentElement.scrollWidth, hits: hits.slice(0,12)};
});
console.log(`viewport ${out.vw}px, document scrollWidth ${out.scrollW}px`);
console.log(`elements extending past the right edge: ${out.hits.length}\n`);
for (const h of out.hits) console.log(`  right=${String(h.right).padStart(4)} left=${String(h.left).padStart(4)} w=${String(h.width).padStart(4)} ovfX=${h.overflowX.padEnd(7)} ${h.tag} .${h.cls}`);
await b.close();
