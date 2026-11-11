// Chetana Masalapuri Center: the "Chats" menu is read off the shop's board.
// Prices are board price + Rs 10, the photos exist, and orders can be traced
// to the restaurant by the browser and by the server's price list.
import { build } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';

const bundle = async (code) => {
  const out = await build({
    stdin: { contents: code, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent',
    loader: { '.webp': 'empty', '.png': 'empty', '.jpg': 'empty', '.svg': 'empty', '.css': 'empty' },
  });
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
};

const lib = await bundle(`
  export * from './src/data/chetanaMenu';
  export { PARTNER_HOTEL_PRODUCTS } from './src/data/partnerHotelItems';
  export { getItemHotel } from './src/utils/orderHotels';
`);
const catalog = JSON.parse(readFileSync('api/_catalog.json', 'utf8'));

let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`);
  if (!ok) failed++;
};

const board = {
  'Bhel Puri': 40, 'Pani Puri': 30, 'Sev Puri': 40, 'Masala Puri': 40, 'Dahi Puri': 40,
  'Sukka Puri': 40, 'Veg Manchurian': 40, 'Masala Samosa (Regular)': 20, 'Masala Samosa (Large)': 30,
};
const menu = lib.CHETANA_MENU;

check('nine items on the menu', menu.length === 9, String(menu.length));
check('Bhel Samosa is not on the menu (owner removed it)', !menu.some((i) => /bhel samosa/i.test(i.name)));
check('every price is the board price plus Rs 10',
  menu.every((i) => board[i.name] !== undefined && i.cardPrice === board[i.name] && i.price === board[i.name] + 10),
  JSON.stringify(menu.map((i) => [i.name, i.price])));
check('markup is Rs 10', lib.CHETANA_MARKUP === 10);
check('every photo exists', menu.every((i) => existsSync('public' + i.image)), menu.filter((i) => !existsSync('public' + i.image)).map((i) => i.image).join(','));

const items = lib.PARTNER_HOTEL_PRODUCTS.filter((p) => p.hotelId === lib.CHETANA_HOTEL_ID);
check('all of them are on the home page', items.length === menu.length, String(items.length));
check('all of them are in the "Chats" category', items.every((p) => p.category === 'Chats' && lib.CHATS_CATEGORY === 'Chats'));
check('home page prices equal menu prices', items.every((p) => menu.find((m) => m.name === p.name)?.price === p.price));
check('every dish is vegetarian', items.every((p) => p.isVeg === true));
check('cart ids are unique and start with chetana-', new Set(items.map((p) => p.id)).size === items.length && items.every((p) => p.id.startsWith('chetana-')));

check('an order line is traced to the restaurant', items.every((p) => lib.getItemHotel(p)?.id === lib.CHETANA_HOTEL_ID && lib.getItemHotel(p)?.name === lib.CHETANA_HOTEL_NAME));
check('...even by id alone', lib.getItemHotel({ id: 'chetana-bhel-puri' })?.id === lib.CHETANA_HOTEL_ID);
check('other restaurants are not mistaken for it', lib.getItemHotel({ id: 'mumtaz-chicken-biryani' })?.id === 'mumtaz');

check('server price list has every item at the selling price',
  items.every((p) => catalog[p.id]?.price === p.price && catalog[p.id]?.hotelId === lib.CHETANA_HOTEL_ID),
  items.filter((p) => catalog[p.id]?.price !== p.price).map((p) => p.id).join(','));

// The server's own restaurant table (api/_pricing.js) must know the shop too:
// it is not exported, so read it as text.
const pricing = readFileSync('api/_pricing.js', 'utf8');
check('server restaurant table lists the shop', pricing.includes("id: 'chetana-masalapuri-center'") && pricing.includes("prefix: 'chetana-'"));

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
