// Moms Magic Kitchen half portions: off by default, generated from the full
// dishes when the admin switch is on, never duplicated, full prices untouched.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const out = await build({
  entryPoints: ['src/data/momsMagicKitchenMenu.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent',
});
const m = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const catalog = JSON.parse(readFileSync(new URL('../api/_catalog.json', import.meta.url), 'utf8'));
const { isHalfPortionLine } = await import('../api/_pricing.js');

let failed = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!ok) failed++;
}
const flat = (menu) => menu.flatMap((c) => c.items);

// Off (what customers get today): full dishes only.
const off = flat(m.MOMS_MAGIC_KITCHEN_MENU);
check('off: only full portions', off.length > 0 && off.every((i) => i.portion === 'Full'));
check('off: no half names', !off.some((i) => /half/i.test(i.name)));
check('off: same as building without halves', JSON.stringify(m.MOMS_MAGIC_KITCHEN_MENU) === JSON.stringify(m.buildMomsMagicKitchenMenu(false)));

// On: each full dish followed by its half, at the formula or its special price.
const on = flat(m.MOMS_MAGIC_KITCHEN_MENU_WITH_HALVES);
const fulls = on.filter((i) => i.portion === 'Full');
const halves = on.filter((i) => i.portion === 'Half');
check('on: full dishes unchanged', JSON.stringify(fulls) === JSON.stringify(off));
check('on: one half per full dish', halves.length === fulls.length, `(${halves.length}/${fulls.length})`);
const special = { 'Veg Fried Rice': 59, 'Chicken Kebab': 80 };
let priceOk = true;
on.forEach((i, idx) => {
  if (i.portion !== 'Half') return;
  const full = on[idx - 1];
  const want = special[full.name] ?? full.price / 2 + 20;
  if (i.price !== want) { priceOk = false; console.log(`   ${i.name}: ${i.price}, want ${want}`); }
});
check('on: half price = full / 2 + 20, or the special price', priceOk);
check('formula examples', [[90, 65], [110, 75], [130, 85], [150, 95], [200, 120]].every(([f, h]) => m.MOMS_MAGIC_KITCHEN_HALF_PRICE(f) === h));

// Never duplicates, however often it is built.
const ids = on.map((i) => m.mmkItemId(i.name));
check('on: no duplicate ids', new Set(ids).size === ids.length);
check('building again gives the same menu', JSON.stringify(m.buildMomsMagicKitchenMenu(true)) === JSON.stringify(m.MOMS_MAGIC_KITCHEN_MENU_WITH_HALVES));

// Cart and server know a half when they see one.
check('cart: half detected', m.isMmkHalfItem({ id: 'mmk-veg-noodles-half-' }) && m.isMmkHalfItem({ id: 'mmk-half-fried-rice' }));
check('cart: full not mistaken for half', !m.isMmkHalfItem({ id: 'mmk-veg-noodles' }) && !m.isMmkHalfItem({ id: 'mmk-veg-fried-rice' }));
check('catalog: halves priced and marked', halves.every((i) => catalog[m.mmkItemId(i.name)]?.price === i.price && catalog[m.mmkItemId(i.name)]?.half === true));
check('catalog: full dishes at menu price, not marked', fulls.every((i) => catalog[m.mmkItemId(i.name)]?.price === i.price && !catalog[m.mmkItemId(i.name)]?.half));
check('server: half line detected', isHalfPortionLine({ id: 'mmk-veg-noodles-half-' }) && !isHalfPortionLine({ id: 'mmk-veg-noodles' }) && !isHalfPortionLine({ id: 'br-4' }));

if (failed) { console.log(`\n${failed} FAILED`); process.exit(1); }
console.log('\nALL PASSED');
