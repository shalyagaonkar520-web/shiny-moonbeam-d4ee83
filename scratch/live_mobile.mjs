import { chromium, devices, webkit } from 'playwright';
const URL='https://momsmagic.shop/';
for (const [name, engine, dev] of [
  ['Chrome / Pixel 5', chromium, devices['Pixel 5']],
  ['Safari / iPhone 13', webkit, devices['iPhone 13']],
]) {
  let browser;
  try { browser = await engine.launch(); }
  catch(e){ console.log(`${name}: engine unavailable (${String(e).slice(0,60)})`); continue; }
  const ctx = await browser.newContext({ ...dev });
  const page = await ctx.newPage();
  const errs=[], failed=[];
  page.on('pageerror', e=>errs.push(e.message));
  page.on('console', m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  page.on('requestfailed', r=>failed.push(r.url().replace(URL,'/')+' :: '+(r.failure()?.errorText||'')));
  page.on('response', r=>{ if(r.status()>=400) failed.push('HTTP'+r.status()+' '+r.url().replace(URL,'/')); });
  try {
    await page.goto(URL, { waitUntil:'domcontentloaded', timeout:45000 });
    await page.waitForTimeout(7000);
    const text = (await page.evaluate(()=>document.body.innerText)).trim();
    const imgs = await page.evaluate(()=>document.images.length);
    const overflow = await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    console.log(`\n=== ${name} ===`);
    console.log('  visible text chars:', text.length, text.length<40 ? '  <-- BLANK / BROKEN' : '');
    console.log('  first text:', JSON.stringify(text.slice(0,120)));
    console.log('  images in DOM:', imgs, '| horizontal overflow:', overflow, 'px');
    console.log('  JS errors:', errs.length ? errs.slice(0,4) : 'none');
    console.log('  failed requests:', failed.length ? failed.slice(0,6) : 'none');
    await page.screenshot({ path:`scratch/live-${name.split(' ')[0].toLowerCase()}.png` });
  } catch(e) {
    console.log(`\n=== ${name} ===\n  NAVIGATION FAILED: ${String(e).slice(0,200)}`);
    console.log('  JS errors:', errs.slice(0,4));
    console.log('  failed:', failed.slice(0,6));
  }
  await browser.close();
}
