// MM Clean pure logic. Run: npm test (chained after the server tests).
// Needs no Firebase: these are the functions that decide what gets written.
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: [new URL('../src/lib/mmClean.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
});
const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
);
const {
  buildBookingPayload, validateBooking, formatDuration, resolveBranding,
  cleanImageUrl, nextSevenDays, normalisePhone, bookingRef, TIME_SLOTS,
} = mod;

let fail = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!cond) fail++;
};

const service = {
  id: 'svc_1', name: 'Bathroom deep clean', category: 'bathroom',
  price: 349, duration: 90, description: 'Tiles, fittings and floor.',
  image: 'clean/bathroom.webp', active: true, sortOrder: 2,
};
const draft = {
  name: '  Asha  ', phone: '+91 98765-43210', address: '12 Main Road, near the temple',
  date: '2026-10-21', slot: TIME_SLOTS[0], notes: '',
};

// 1. The rules accept exactly these fields and reject the write if any other
// key is present, so the payload shape is the single most important thing here.
const payload = buildBookingPayload(service, draft);
const allowed = ['serviceId', 'serviceName', 'price', 'name', 'phone', 'address', 'date', 'slot', 'notes', 'status'];
const keys = Object.keys(payload);
check('payload has no field the rules would reject',
  keys.every((k) => allowed.includes(k)), `(${keys.join(', ')})`);
check('notes omitted when blank', !('notes' in payload));
check('no userId or stray metadata', !keys.some((k) => /user|uid|app|source|createdAt/i.test(k)));
check('status is exactly NEW', payload.status === 'NEW');
check('serviceName and price copied from the service',
  payload.serviceName === service.name && payload.price === 349);
check('name trimmed', payload.name === 'Asha');
check('phone stripped of spaces and dashes', payload.phone === '+919876543210');
check('address trimmed', payload.address === '12 Main Road, near the temple');

const withNotes = buildBookingPayload(service, { ...draft, notes: '  ring the bell  ' });
check('notes included and trimmed when given', withNotes.notes === 'ring the bell');

// 2. Client validation mirrors the rules' limits.
check('valid draft passes', validateBooking(draft) === null);
check('1-character name rejected', validateBooking({ ...draft, name: 'A' }) !== null);
check('81-character name rejected', validateBooking({ ...draft, name: 'x'.repeat(81) }) !== null);
check('9-digit phone rejected', validateBooking({ ...draft, phone: '123456789' }) !== null);
check('14-digit phone rejected', validateBooking({ ...draft, phone: '1'.repeat(14) }) !== null);
check('10-digit phone accepted', validateBooking({ ...draft, phone: '9876543210' }) === null);
check('lettered phone rejected', validateBooking({ ...draft, phone: '98765abcde' }) !== null);
check('7-character address rejected', validateBooking({ ...draft, address: '1234567' }) !== null);
check('301-character address rejected', validateBooking({ ...draft, address: 'x'.repeat(301) }) !== null);
check('301-character notes rejected', validateBooking({ ...draft, notes: 'x'.repeat(301) }) !== null);
check('malformed date rejected', validateBooking({ ...draft, date: '21-10-2026' }) !== null);
check('empty slot rejected', validateBooking({ ...draft, slot: '' }) !== null);
check('every built-in slot is within the 30-character limit',
  TIME_SLOTS.every((s) => s.length >= 1 && s.length <= 30));
check('phone normaliser leaves a clean number alone', normalisePhone('9876543210') === '9876543210');

// 3. Durations read the way a customer would say them.
check('45 -> 45 min', formatDuration(45) === '45 min');
check('60 -> 1 hr', formatDuration(60) === '1 hr');
check('90 -> 1 hr 30 min', formatDuration(90) === '1 hr 30 min');
check('120 -> 2 hr', formatDuration(120) === '2 hr');

// 4. Branding: every field optional, {app} substituted, blanks fall back.
const d = resolveBranding(null);
check('branding defaults when the doc is missing',
  d.appCleanName === 'MM Clean' && d.appName === 'Minto' && d.supportPhone === '');
check('blank string falls back to the default',
  resolveBranding({ appCleanName: '   ' }).appCleanName === 'MM Clean');
check('{app} replaced with appName',
  resolveBranding({ appName: 'Minto', cleanHeroTitle: 'Welcome to {app}' }).cleanHeroTitle === 'Welcome to Minto');
check('overrides win', resolveBranding({ appCleanName: 'Sparkle' }).appCleanName === 'Sparkle');
check('support phone kept when set', resolveBranding({ supportPhone: '+919606001790' }).supportPhone === '+919606001790');

// 5. Images: a built-in path is hosted by the panel, a full URL is left alone.
check('built-in path gets the panel origin',
  cleanImageUrl('clean/bathroom.webp') === 'https://mintoo-panel.web.app/clean/bathroom.webp');
check('leading slash tolerated',
  cleanImageUrl('/clean/x.webp') === 'https://mintoo-panel.web.app/clean/x.webp');
check('https url passed through',
  cleanImageUrl('https://cdn.example.com/a.webp') === 'https://cdn.example.com/a.webp');
check('empty image gives empty string', cleanImageUrl('') === '');

// 6. The day picker, in local time so "Today" is the customer's today.
const days = nextSevenDays(new Date(2026, 9, 20));
check('seven days offered', days.length === 7);
check('first two are Today and Tomorrow', days[0].label === 'Today' && days[1].label === 'Tomorrow');
check('dates are YYYY-MM-DD', days.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date)));
check('first date is the given day, not UTC-shifted', days[0].date === '2026-10-20');
check('later days are labelled weekday + date', /^[A-Za-z]{3} \d{1,2}$/.test(days[3].label), `(${days[3].label})`);

// 7. Booking reference.
check('ref is the last 6 characters, upper-cased',
  bookingRef('abcdefghij12mn') === 'IJ12MN', `(got ${bookingRef('abcdefghij12mn')})`);
check('short id is returned whole', bookingRef('xyzab9') === 'XYZAB9');

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
