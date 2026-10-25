// Per-dish availability, as the JIS Kitchen panel defines it.
//
// The menus themselves (name, price, photo) stay in src/data -- the panel's
// own publish-menu script copies them from there into the `menuItems`
// collection. What `menuItems` adds is the one thing the files cannot know:
// whether a dish can be ordered right now. These helpers mirror the panel's
// menuService.ts exactly, so a dish switched off there disappears here.

export interface DishAvailability {
  available: boolean;
  availableFrom: string | null;
  availableTo: string | null;
  soldOut: boolean;
}

/** Same slug the panel uses for document ids: `${hotelId}__${slug}`. */
export function slugifyDish(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function menuItemId(hotelId: string, name: string): string {
  return `${hotelId}__${slugifyDish(name)}`;
}

function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Is this dish orderable at `now`? A window that wraps midnight (22:00 to
 * 02:00) counts as one continuous period, as in the panel.
 */
export function isDishAvailableNow(item: DishAvailability, now: Date = new Date()): boolean {
  if (item.available === false || item.soldOut) return false;
  const from = toMinutes(item.availableFrom);
  const to = toMinutes(item.availableTo);
  if (from === null || to === null || from === to) return true;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

export function toDishAvailability(data: any): DishAvailability {
  return {
    available: data?.available !== false,
    availableFrom: data?.availableFrom || null,
    availableTo: data?.availableTo || null,
    soldOut: data?.soldOut === true,
  };
}
