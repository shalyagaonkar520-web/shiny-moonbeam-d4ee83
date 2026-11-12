// Chats open at 4:00 PM IST. Checks the storefront and the server apply the
// same rule, in IST whatever the machine's time zone.
import { build } from 'esbuild';

const out = await build({
  entryPoints: ['src/lib/chatsHours.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const web = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const server = await import('../api/_chatsHours.js');

let failed = 0;
function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
// IST is UTC+5:30.
const ist = (h, m, s = 0) => new Date(Date.UTC(2026, 10, 7, h, m, s) - 330 * 60 * 1000);
const both = (d) => [web.isChatsOpenNow(d), server.isChatsOpenNow(d)];

const cases = [
  ['midnight IST is closed', ist(0, 0), false],
  ['2:30 PM IST is closed', ist(14, 30), false],
  ['3:59:59 PM IST is closed', ist(15, 59, 59), false],
  ['4:00:00 PM IST opens', ist(16, 0, 0), true],
  ['8:00 PM IST is open', ist(20, 0), true],
  ['11:59 PM IST is open', ist(23, 59), true],
];
for (const [name, d, want] of cases) {
  const [w, s] = both(d);
  check(name, w === want && s === want);
}
check('closed until exactly 4 PM', web.msUntilChatsChange(ist(15, 0)) === 60 * 60 * 1000);
check('open until midnight', web.msUntilChatsChange(ist(23, 0)) === 60 * 60 * 1000);
check('message', web.CHATS_CLOSED_MESSAGE === 'Closed – Opens at 4 PM');
check('cart line by id', web.isChatsItem({ id: 'chetana-bhel-puri' }) && server.isChatsLine({ id: 'chetana-bhel-puri' }));
check('cart line by hotel', web.isChatsItem({ id: 'x', hotelId: 'chetana-masalapuri-center' }) && server.isChatsLine({ id: 'x', hotelId: 'chetana-masalapuri-center' }));
check('other hotels unaffected', !web.isChatsItem({ id: 'mmk-veg-noodles' }) && !web.isChatsItem({ id: 'alamin-rn-4', hotelId: 'al_amin' }) && !server.isChatsLine({ id: 'ff-1' }));

if (failed) { console.log(`\n${failed} FAILED`); process.exit(1); }
console.log('\nALL PASSED');
