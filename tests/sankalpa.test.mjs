// Hotel Sankalpa: customers pay the restaurant's price + Rs 15, on the menu
// page, the home page and the server's price list alike.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const out = await build({
  stdin: { contents: `export * from './src/data/hotelSankalpaMenu'; export { PARTNER_HOTEL_PRODUCTS } from './src/data/partnerHotelItems';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent',
  loader: { '.webp': 'empty', '.png': 'empty', '.jpg': 'empty', '.svg': 'empty', '.css': 'empty' },
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const catalog = JSON.parse(readFileSync('api/_catalog.json', 'utf8'));

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); if (!ok) failed++; };

const menu = lib.HOTEL_SANKALPA_MENU.flatMap((c) => c.items);
const find = (n) => menu.find((i) => i.name === n)?.price;
check('markup is Rs 15', lib.SANKALPA_MARKUP === 15);
check('84 dishes still on the menu', menu.length === 84, String(menu.length));
check('Paneer Handi was 200, now 215', find('Paneer Handi') === 215);
check('South Thali was 120, now 135', find('South Thali') === 135);
const home = lib.PARTNER_HOTEL_PRODUCTS.filter((p) => p.hotelId === 'sankalpa');
check('home page prices equal menu prices', home.length === menu.length && home.every((p) => menu.find((m) => m.name === p.name)?.price === p.price));
check('server price list equals the selling price', home.every((p) => catalog[p.id]?.price === p.price), home.filter((p) => catalog[p.id]?.price !== p.price).map((p) => p.id).join(','));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
