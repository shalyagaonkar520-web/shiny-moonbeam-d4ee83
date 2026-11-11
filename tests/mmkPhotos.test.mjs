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

const stock = dishes.filter((d) => d.image.endsWith('-photo.webp'));
const creditedFiles = new Set(credits.map((c) => c.file));
const uncredited = stock.filter((d) => !creditedFiles.has(d.image.replace('/menu/', ''))).map((d) => d.name);
check('29 dishes use a stock photo', stock.length === 29, String(stock.length));
check('every stock photo has its credit recorded', uncredited.length === 0, uncredited.join(', '));
check('the banner photo is credited', creditedFiles.has('mmk/banner-photo.webp') && existsSync('public' + lib.MOMS_MAGIC_KITCHEN_IMAGE));

const mine = credits.filter((c) => c.file.startsWith('mmk/'));
check('the blocked Pexels photo 25440738 is not used', !mine.some((c) => c.pexelsId === 25440738));
check('every credit names a Pexels id', mine.every((c) => Number.isInteger(c.pexelsId) && c.pexelsId > 0));

// The eight that keep the kitchen's own poster crop (no honest stock match): a stock photo
// must not replace these without somebody looking at it.
const KEPT = ['Paneer Fried Rice', 'Paneer Schezwan Rice', 'Mushroom Fried Rice', 'Mushroom Schezwan Rice', 'Mushroom Garlic Rice',
  'Baby Corn Fried Rice', 'Triple Schezwan Rice', 'Egg Fried Rice with Noodles'];
const poster = dishes.filter((d) => !d.image.endsWith('-photo.webp')).map((d) => d.name).sort();
check('exactly the eight poster-photo dishes keep their own photo', JSON.stringify(poster) === JSON.stringify([...KEPT].sort()), poster.join(', '));

// A vegetarian dish must not be given a photo whose credit says it shows meat or egg.
const bad = dishes.filter((d) => d.isVeg && d.image.endsWith('-photo.webp')).filter((d) => {
  const c = credits.find((x) => x.file === d.image.replace('/menu/', ''));
  // "no meat or egg seen" is good news, not a match: drop negated phrases first.
  const text = (c?.shows || '').replace(/\b(no|without|not|nor)\b[^;.,]*/gi, '');
  return c && /\b(chicken|meat|egg|prawn|shrimp|fish|pork|beef|mutton)\b/i.test(text);
}).map((d) => d.name);
check('no vegetarian dish has a photo described as showing meat or egg', bad.length === 0, bad.join(', '));

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
