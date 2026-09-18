import { build } from 'esbuild';
const r = await build({
  entryPoints: ['src/data/partnerHotelItems.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral',
  loader: { '.ts': 'ts' },
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
const items = mod.PARTNER_HOTEL_PRODUCTS;
const by = {};
for (const i of items) by[i.hotelName] = (by[i.hotelName] || 0) + 1;
console.log('total partner items:', items.length);
console.log(by);
console.log('order:', [...new Set(items.map(i => i.hotelName))]);
const ids = new Set(items.map(i => i.id));
console.log('duplicate ids:', items.length - ids.size);
console.log('missing image:', items.filter(i => !i.image).length);
console.log('non-veg flagged:', items.filter(i => !i.isVeg).length);
console.log('sample:', items[0], items.find(i=>i.hotelId==='mumtaz'));
