import { chromium, devices } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:5180';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
let bad = 0;
for (const [label, path] of [['Home','/'],['Sankalpa','/hotel-sankalpa']]) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.evaluate(async () => { for (let y=0;y<2500;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,80));} window.scrollTo(0,0); });
  await page.waitForTimeout(2000);
  const s = await page.evaluate(() => {
    const imgs=[...document.querySelectorAll('img')];
    return {
      total: imgs.length,
      broken: imgs.filter(i=>i.complete&&i.naturalWidth===0).length,
      // any image whose rendered box is wildly non-square where the card expects square
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollW: document.documentElement.scrollWidth, winW: window.innerWidth,
    };
  });
  if (s.broken || s.overflowX) bad++;
  console.log(`${s.broken||s.overflowX?'FAIL':'ok  '}  ${label.padEnd(10)} imgs:${s.total} broken:${s.broken} horizontal-overflow:${s.overflowX} (${s.scrollW}px vs ${s.winW}px viewport)`);
  await page.screenshot({ path: `scratch/mobile-${label}.png` });
}
await browser.close();
console.log(bad ? `\n${bad} mobile issue(s)` : '\nMobile layout clean: no broken images, no horizontal overflow.');
