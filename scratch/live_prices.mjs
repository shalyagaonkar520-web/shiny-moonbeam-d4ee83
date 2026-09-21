import { chromium, devices } from 'playwright';
const b=await chromium.launch();
const ctx=await b.newContext({...devices['Pixel 5']});
const page=await ctx.newPage();
await page.goto('https://momsmagic.shop/',{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForSelector('.dish-card-cv',{timeout:30000});
let last=-1;
for(let i=0;i<60;i++){ await page.evaluate(()=>window.scrollBy(0,4000)); await page.waitForTimeout(200);
  const n=await page.evaluate(()=>document.querySelectorAll('.dish-card-cv').length); if(n===last&&i>6)break; last=n; }
await page.waitForTimeout(1000);
const cards=await page.$$eval('.dish-card-cv',els=>els.map(e=>{
  const badge=[...e.querySelectorAll('span')].find(n=>/^(Hotel Sankalpa|Hotel Mumtaz|Coastal Crown|Hotel Malabar)$/.test(n.textContent.trim()));
  const price=(e.textContent.match(/\u20b9(\d+)/)||[])[1];
  return {name:e.querySelector('h4')?.textContent.trim(), price:price?Number(price):null, badge:badge?badge.textContent.trim():null};
}));
const alamin=cards.filter(c=>!c.badge);
console.log('LIVE home-page (Al Amin) items:', alamin.length);
console.log(JSON.stringify(alamin.map(c=>[c.name,c.price])));
await b.close();
