// Server copy of src/lib/mmkHours.ts: Moms Magic Kitchen takes orders only
// from 2:30 PM IST until midnight. tests/mmkHours.test.mjs checks both agree.

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MMK_OPENS_AT_MS = (14 * 60 + 30) * 60 * 1000;

export function isMmkOpenNow(now = new Date()) {
  const t = (((now.getTime() + IST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
  return t >= MMK_OPENS_AT_MS;
}

export function isMmkLine(line) {
  return !!line && typeof line.id === 'string' && line.id.startsWith('mmk-');
}
