import { webkit, devices } from 'playwright';
const URL='https://momsmagic.shop/';
const b=await webkit.launch();
for (let i=1;i<=4;i++){
  const ctx=await b.newContext({...devices['iPhone 13']});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  const t0=Date.now();
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
  let painted=null;
  try{ await page.waitForFunction(()=>document.body.innerText.length>400,{timeout:25000}); painted=Date.now()-t0; }catch{}
  const t=(await page.evaluate(()=>document.body.innerText)).trim();
  console.log(`  run ${i}: text=${String(t.length).padStart(5)}  renderedAt=${painted??'NEVER'}${painted?'ms':''}  ${t.length<300?'STUCK':'ok'}${errs.length?'  '+errs[0].slice(0,80):''}`);
  await ctx.close();
}
await b.close();
