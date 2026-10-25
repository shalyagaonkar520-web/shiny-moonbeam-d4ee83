// Per-dish availability from the panel's `menuItems` collection, checked on
// the server. Same rules as src/lib/dishAvailability.ts (and the panel's
// menuService.ts), except the clock is read in India time: serving windows
// are kitchen hours, and the function may run in any timezone.

export function slugifyDish(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const menuItemId = (hotelId, name) => `${hotelId}__${slugifyDish(name)}`;

function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function istMinutes(now) {
  const parts = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).formatToParts(now);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
  return get('hour') * 60 + get('minute');
}

export function isDishAvailableNow(data, now = new Date()) {
  if (!data) return true;
  if (data.available === false || data.soldOut === true) return false;
  const from = toMinutes(data.availableFrom);
  const to = toMinutes(data.availableTo);
  if (from === null || to === null || from === to) return true;
  const minutes = istMinutes(now);
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

/**
 * Names of the dishes in these priced groups that the panel says cannot be
 * ordered now. A dish with no `menuItems` document is orderable.
 */
export async function unavailableDishes(db, groups, now = new Date()) {
  const lines = groups.flatMap((g) => g.items.map((l) => ({ id: menuItemId(g.hotelId, l.name), name: l.name })));
  if (!lines.length) return [];
  const snaps = await db.getAll(...lines.map((l) => db.collection('menuItems').doc(l.id)));
  return lines.filter((l, i) => snaps[i].exists && !isDishAvailableNow(snaps[i].data(), now)).map((l) => l.name);
}
