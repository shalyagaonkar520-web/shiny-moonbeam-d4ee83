import { chromium, devices } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve('dist');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
let MODE='configured';
const REAL_TOKEN='a'.repeat(64);
const srv=http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]);
  if(p==='/api/admin-login'){ let b=''; q.on('data',c=>b+=c); q.on('end',()=>{
    const j=(()=>{try{return JSON.parse(b);}catch{return {};}})();
    r.setHeader('Content-Type','application/json');
    if(MODE==='unconfigured'){ r.writeHead(501); r.end(JSON.stringify({ok:false,unconfigured:true})); return; }
    if(j.email==='owner@shop.com' && j.password==='CorrectHorse!42'){ r.writeHead(200); r.end(JSON.stringify({ok:true,token:REAL_TOKEN,email:j.email})); return; }
    r.writeHead(401); r.end(JSON.stringify({ok:false,error:'Invalid admin credentials'})); }); return; }
  let f=path.join(ROOT,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>srv.listen(4390,r));
const B='http://localhost:4390';
const b=await chromium.launch();

async function tryLogin(email,pw){
  const ctx=await b.newContext({...devices['Pixel 5']});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(B+'/admin?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  const inputs=await page.$$('input');
  if(inputs[0]) await inputs[0].fill(email);
  if(inputs[1]) await inputs[1].fill(pw);
  const btn=await page.$('button[type="submit"]') || (await page.$$('button')).slice(-1)[0];
  await btn?.click().catch(()=>{});
  await page.waitForTimeout(3000);
  const tok=await page.evaluate(()=>{try{return localStorage.getItem('moms_magic_admin_token');}catch(e){return null;}});
  const txt=(await page.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
  await ctx.close();
  return {tok, loggedIn: !!tok, txt, errs};
}

MODE='configured';
let r1=await tryLogin('owner@shop.com','CorrectHorse!42');
console.log('1. correct credentials      -> logged in:', r1.loggedIn, '| token is the server secret:', r1.tok===REAL_TOKEN);
let r2=await tryLogin('owner@shop.com','wrong-password');
console.log('2. wrong password           -> logged in:', r2.loggedIn, r2.loggedIn?' <-- BAD':' (correctly refused)');
let r3=await tryLogin('attacker@evil.com','anything');
console.log('3. wrong email              -> logged in:', r3.loggedIn, r3.loggedIn?' <-- BAD':' (correctly refused)');
MODE='unconfigured';
let r4=await tryLogin('owner@shop.com','CorrectHorse!42');
console.log('4. endpoint unconfigured    -> falls through to Firebase Auth, no crash:', r4.errs.length===0, '| logged in:', r4.loggedIn);
console.log('   (expected: not logged in here, because this test has no Firebase Auth user)');
console.log('\n5. can the old trick still unlock admin?');
{
  const ctx=await b.newContext({...devices['Pixel 5']});
  await ctx.addInitScript(()=>{try{localStorage.setItem('moms_magic_admin_token','mock-jwt-admin-token-123456');}catch(e){}});
  const page=await ctx.newPage();
  await page.goto(B+'/admin?preview=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(3000);
  const t=(await page.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
  const stillLogin=/sign in|login|password|email/i.test(t);
  console.log('   pasting the published token shows the login screen:', stillLogin ? 'YES (blocked)' : 'NO  <-- still bypassable');
  await ctx.close();
}
await b.close(); srv.close();
