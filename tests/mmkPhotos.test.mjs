// Moms Magic Kitchen dish photos: they exist, no two dishes share one image,
// stock photos are credited, and the known-bad Pexels photo is not used.
import { build } from 'esbuild';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const out = await build({
  entryPoints: ['src/data/momsMagicKitchenMenu.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent',
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const credits = JSON.parse(readFileSync('public/menu/attributions.json', 'utf8')).photos;

let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`);
  if (!ok) failed++;
};

const dishes = lib.MOMS_MAGIC_KITCHEN_MENU.flatMap((c) => c.items);
const withHalves = lib.MOMS_MAGIC_KITCHEN_MENU_WITH_HALVES.flatMap((c) => c.items);
check('37 dishes', dishes.length === 37, String(dishes.length));

const missing = [...new Set(withHalves.map((d) => d.image).filter((i) => !i || !existsSync('public' + i) || statSync('public' + i).size < 4000))];
check('every dish (and half portion) has a photo on disk', missing.length === 0, missing.join(', '));

const hash = (img) => createHash('md5').update(readFileSync('public' + img)).digest('hex');
const byHash = {};
for (const d of dishes) (byHash[hash(d.image)] ||= []).push(d.name);
const clashes = Object.values(byHash).filter((v) => v.length > 1);
check('no two dishes share the same photo', clashes.length === 0, JSON.stringify(clashes));

const isStock = (img) => /-photo\d*\.webp$/.test(img);
const stock = dishes.filter((d) => isStock(d.image));
const creditedFiles = new Set(credits.map((c) => c.file));
const uncredited = stock.filter((d) => !creditedFiles.has(d.image.replace('/menu/', ''))).map((d) => d.name);
check('all 37 dishes use a credited stock photo', stock.length === 37, String(stock.length));
check('every stock photo has its credit recorded', uncredited.length === 0, uncredited.join(', '));
check('the banner photo is credited', creditedFiles.has('mmk/banner-photo.webp') && existsSync('public' + lib.MOMS_MAGIC_KITCHEN_IMAGE));

const mine = credits.filter((c) => c.file.startsWith('mmk/'));
check('the blocked Pexels photo 25440738 is not used', !mine.some((c) => c.pexelsId === 25440738));
const sourceIds = mine.map((c) => c.pexelsId ?? c.unsplashId);
// (the banner deliberately reuses one dish's photo, so it is left out)
const seen = {}; for (const c of mine.filter((c) => c.file !== 'mmk/banner-photo.webp')) (seen[c.pexelsId ?? c.unsplashId] ||= []).push(c.file);
const reused = Object.values(seen).filter((v) => v.length > 1);
check('no source photo is used for two dishes (even cropped differently)', reused.length === 0, JSON.stringify(reused));
check('every credit names its Pexels id or Unsplash photo', mine.every((c) => (Number.isInteger(c.pexelsId) && c.pexelsId > 0) || (c.source === 'unsplash' && c.unsplashId && c.pageUrl)));

// A vegetarian dish must not be given a photo whose credit says it shows meat or egg.
const bad = dishes.filter((d) => d.isVeg && isStock(d.image)).filter((d) => {
  const c = credits.find((x) => x.file === d.image.replace('/menu/', ''));
  // "no meat or egg seen" is good news, not a match: drop negated phrases first.
  const text = (c?.shows || '').replace(/\b(no|without|not|nor)\b[^;.,]*/gi, '');
  return c && /\b(chicken|meat|egg|prawn|shrimp|fish|pork|beef|mutton)\b/i.test(text);
}).map((d) => d.name);
check('no vegetarian dish has a photo described as showing meat or egg', bad.length === 0, bad.join(', '));

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
