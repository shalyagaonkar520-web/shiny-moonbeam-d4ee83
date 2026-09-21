import { webkit, chromium, devices } from 'playwright';
const URL='https://momsmagic.shop';
const ROUTES=['/','/hotel-sankalpa','/checkout','/track/abc123','/celebration/design','/profile'];
for (const [label, engine, dev] of [
  ['Safari / iPhone 13', webkit, devices['iPhone 13']],
  ['Chrome / Pixel 5',   chromium, devices['Pixel 5']],
]) {
  console.log(`\n================ ${label} ================`);
  const b=await engine.launch();
  for (const route of ROUTES) {
    const ctx=await b.newContext({...dev});
    const page=await ctx.newPage();
    const errs=[];
    page.on('pageerror',e=>errs.push('CRASH: '+e.message));
    page.on('console',m=>{if(m.type()==='error'&&!/insufficient permissions|installations|messaging|Notification|permission/i.test(m.text()))errs.push(m.text());});
    let text='';
    try{
      await page.goto(URL+route,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForTimeout(6000);
      text=(await page.evaluate(()=>document.body.innerText)).trim();
    }catch(e){ errs.push('NAV: '+String(e).slice(0,90)); }
    const stuck=/Preparing delicious food/.test(text)&&text.length<200;
    const bad=stuck||errs.length||text.length<40;
    console.log(`  ${bad?'FAIL':' ok '} ${route.padEnd(22)} text=${String(text.length).padStart(5)}${stuck?' STUCK ON LOADER':''}${errs.length?'  '+errs[0].slice(0,100):''}`);
    await ctx.close();
  }
  // blocked-storage check on the real site
  const ctx=await b.newContext({...dev});
  await ctx.addInitScript(`(function(){var boom=function(){throw new DOMException('QuotaExceededError');};
    try{Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return {getItem:boom,setItem:boom,removeItem:boom,clear:boom,key:boom,length:0};}});}catch(e){}})();`);
  const p=await ctx.newPage(); const e2=[]; p.on('pageerror',e=>e2.push(e.message));
  await p.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
  await p.waitForTimeout(7000);
  const t=(await p.evaluate(()=>document.body.innerText)).trim();
  console.log(`  ${t.length<200?'FAIL':' ok '} ${'/ with cookies BLOCKED'.padEnd(22)} text=${String(t.length).padStart(5)}${e2.length?'  '+e2[0].slice(0,90):''}`);
  await ctx.close();
  await b.close();
}
