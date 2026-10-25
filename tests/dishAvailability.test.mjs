// Checks the storefront reads panel availability the same way the panel writes it.
import { build } from 'esbuild';

const out = await build({
  entryPoints: ['src/lib/dishAvailability.ts'],
  bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent',
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

let failed = 0;
function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
const at = (h, m) => new Date(2026, 9, 25, h, m);
const dish = (o) => lib.toDishAvailability(o);

check('panel doc id matches', lib.menuItemId('al_amin', '2 Butter Roti') === 'al_amin__2-butter-roti');
check('slug trims punctuation', lib.slugifyDish('  Chicken 65 (Half)! ') === 'chicken-65-half');
check('missing fields mean available', lib.isDishAvailableNow(dish({}), at(3, 0)));
check('switched off', !lib.isDishAvailableNow(dish({ available: false }), at(12, 0)));
check('sold out', !lib.isDishAvailableNow(dish({ soldOut: true }), at(12, 0)));
const lunch = dish({ availableFrom: '12:00', availableTo: '15:30' });
check('inside window', lib.isDishAvailableNow(lunch, at(12, 0)));
check('window end is exclusive', !lib.isDishAvailableNow(lunch, at(15, 30)));
check('before window', !lib.isDishAvailableNow(lunch, at(11, 59)));
const late = dish({ availableFrom: '22:00', availableTo: '02:00' });
check('wrapping window, before midnight', lib.isDishAvailableNow(late, at(23, 0)));
check('wrapping window, after midnight', lib.isDishAvailableNow(late, at(1, 0)));
check('wrapping window, daytime', !lib.isDishAvailableNow(late, at(14, 0)));
check('bad time is ignored', lib.isDishAvailableNow(dish({ availableFrom: '25:00', availableTo: '02:00' }), at(14, 0)));

// The server reads the clock in India time whatever timezone it runs in.
const server = await import('../api/_dishAvailability.js');
const utc = (h, m) => new Date(Date.UTC(2026, 9, 25, h, m)); // IST = UTC + 5:30
check('server: lunch at 12:30 IST', server.isDishAvailableNow({ availableFrom: '12:00', availableTo: '15:30' }, utc(7, 0)));
check('server: lunch closed at 16:00 IST', !server.isDishAvailableNow({ availableFrom: '12:00', availableTo: '15:30' }, utc(10, 30)));
check('server: same slug as storefront', server.menuItemId('al_amin', '2 Butter Roti') === lib.menuItemId('al_amin', '2 Butter Roti'));
const fakeDb = {
  collection: () => ({ doc: (id) => id }),
  getAll: async (...ids) => ids.map((id) => ({ exists: id !== 'sankalpa__dosa', data: () => ({ available: id !== 'sankalpa__idli' }) })),
};
const off = await server.unavailableDishes(fakeDb, [{ hotelId: 'sankalpa', items: [{ name: 'Idli' }, { name: 'Dosa' }, { name: 'Vada' }] }]);
check('server: only the switched-off dish is refused', JSON.stringify(off) === '["Idli"]');

if (failed) { console.log(`\n${failed} FAILED`); process.exit(1); }
console.log('\nALL PASSED');
