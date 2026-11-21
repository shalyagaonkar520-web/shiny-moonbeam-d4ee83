// Delivery is free every Saturday and Sunday (IST). The browser and the server
// apply the same rule, in IST whatever the machine's time zone.
import { build } from 'esbuild';

const out = await build({ entryPoints: ['src/lib/freeDeliveryDays.ts'], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const web = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const server = await import('../api/_freeDeliveryDays.js');

let failed = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failed++; };
// IST is UTC+5:30. 21 Nov 2026 is a Saturday, 22 Nov a Sunday.
const ist = (d, h = 12, m = 0, s = 0) => new Date(Date.UTC(2026, 10, d, h, m, s) - 330 * 60 * 1000);
const both = (d) => [web.isWeekendFreeDelivery(d), server.isWeekendFreeDelivery(d)];

const cases = [
  ['Fri 20 Nov midday is charged', ist(20), false],
  ['Fri 20 Nov 11:59:59 PM IST is charged', ist(20, 23, 59, 59), false],
  ['Sat 21 Nov 12:00:00 AM IST is free', ist(21, 0, 0, 0), true],
  ['Sat 21 Nov midday is free', ist(21), true],
  ['Sun 22 Nov midday is free', ist(22), true],
  ['Sun 22 Nov 11:59:59 PM IST is free', ist(22, 23, 59, 59), true],
  ['Mon 23 Nov 12:00:00 AM IST is charged', ist(23, 0, 0, 0), false],
  ['Wed 25 Nov is charged', ist(25), false],
  ['Sat 28 Nov (next weekend) is free', ist(28), true],
];
for (const [name, d, want] of cases) { const [w, s] = both(d); check(name, w === want && s === want); }
check('reason text matches', web.WEEKEND_FREE_DELIVERY_REASON === server.WEEKEND_FREE_DELIVERY_REASON);

// The server's real price calculation uses the same rule.
const { priceOrder } = await import('../api/_pricing.js');
const home = { lat: 14.9651, lng: 74.7105 };
const order = (now) => priceOrder({ items: [{ id: 'ff-1', name: 'Masala Papad', price: 1, quantity: 2 }], location: home, now });
const fri = await order(ist(20)); const sat = await order(ist(21)); const sun = await order(ist(22)); const mon = await order(ist(23));
check('Friday order pays delivery', fri.deliveryCharge === 20 && fri.freeDeliveryReason === '');
check('Saturday order has free delivery', sat.deliveryCharge === 0 && sat.freeDeliveryReason === 'Weekend Free Delivery');
check('Sunday order has free delivery', sun.deliveryCharge === 0 && sun.grandTotal === sun.subtotal);
check('Monday order pays delivery again', mon.deliveryCharge === 20);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
