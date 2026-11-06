// Moms Magic Kitchen opens at 2:30 PM IST. Checks the storefront and the
// server apply the same rule, in IST whatever the machine's time zone.
import { build } from 'esbuild';

const out = await build({
  entryPoints: ['src/lib/mmkHours.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const web = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const server = await import('../api/_mmkHours.js');

let failed = 0;
function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
// IST is UTC+5:30, so 14:30 IST is 09:00 UTC.
const ist = (h, m, s = 0) => new Date(Date.UTC(2026, 10, 7, h, m, s) - 330 * 60 * 1000);
const both = (d) => [web.isMmkOpenNow(d), server.isMmkOpenNow(d)];

const cases = [
  ['midnight IST is closed', ist(0, 0), false],
  ['morning 9:00 IST is closed', ist(9, 0), false],
  ['2:29:59 PM IST is closed', ist(14, 29, 59), false],
  ['2:30:00 PM IST opens', ist(14, 30, 0), true],
  ['6:00 PM IST is open', ist(18, 0), true],
  ['11:59 PM IST is open', ist(23, 59), true],
];
for (const [name, d, want] of cases) {
  const [w, s] = both(d);
  check(name, w === want && s === want);
}
check('closed until exactly 2:30 PM', web.msUntilMmkChange(ist(14, 0)) === 30 * 60 * 1000);
check('open until midnight', web.msUntilMmkChange(ist(23, 0)) === 60 * 60 * 1000);
check('message', web.MMK_CLOSED_MESSAGE === 'Closed – Opens at 2:30 PM');
check('cart line by id', web.isMmkItem({ id: 'mmk-veg-noodles-half-' }) && server.isMmkLine({ id: 'mmk-veg-noodles-half-' }));
check('cart line by hotel', web.isMmkItem({ id: 'x', hotelId: 'moms_magic_kitchen' }));
check('other hotels unaffected', !web.isMmkItem({ id: 'alamin-rn-4', hotelId: 'al_amin' }) && !server.isMmkLine({ id: 'ff-1' }));

if (failed) { console.log(`\n${failed} FAILED`); process.exit(1); }
console.log('\nALL PASSED');
