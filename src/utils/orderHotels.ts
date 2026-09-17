// Single source of truth for working out which partner hotel an order item came from.
//
// This used to be copy-pasted three times inside Checkout (WhatsApp message, Telegram
// message, saved order), which is how Hotel Sankalpa ended up missing from all of them.
// Add a new hotel here once and every order template picks it up.

export interface PartnerHotel {
  id: string;
  name: string;
  /** Prefix used when building cart item ids, e.g. `malabar-paneer-kadai`. */
  idPrefix: string;
  /** Extra text that may appear in an item's description. */
  descriptionMatch: string[];
}

export const PARTNER_HOTELS: PartnerHotel[] = [
  { id: 'mumtaz',        name: 'Hotel Mumtaz',   idPrefix: 'mumtaz-',   descriptionMatch: ['Hotel Mumtaz'] },
  { id: 'al_amin',       name: 'Hotel Al Amin',  idPrefix: 'alamin-',   descriptionMatch: ['Hotel Al Amin'] },
  { id: 'coastal_crown', name: 'Coastal Crown',  idPrefix: 'coastal-',  descriptionMatch: ['Coastal Crown'] },
  { id: 'malabar',       name: 'Hotel Malabar',  idPrefix: 'malabar-',  descriptionMatch: ["Hotel Malabar", "Kaka's Hotel Malabar"] },
  { id: 'sankalpa',      name: 'Hotel Sankalpa', idPrefix: 'sankalpa-', descriptionMatch: ['Hotel Sankalpa'] },
];

type AnyItem = {
  id?: string;
  hotelId?: string | null;
  description?: string;
} | null | undefined;

/** Which partner hotel does this single cart item belong to? Null for Mom's Magic items. */
export function getItemHotel(item: AnyItem): PartnerHotel | null {
  if (!item) return null;
  return (
    PARTNER_HOTELS.find(
      (h) =>
        item.hotelId === h.id ||
        item.id?.startsWith(h.idPrefix) ||
        (!!item.description && h.descriptionMatch.some((m) => item.description!.includes(m)))
    ) || null
  );
}

/** `" [Hotel Malabar]"` for a hotel item, or `""` for a Mom's Magic item. */
export function getItemHotelTag(item: AnyItem): string {
  const hotel = getItemHotel(item);
  return hotel ? ` [${hotel.name}]` : '';
}

/**
 * Every distinct partner hotel represented in a list of items, in menu order.
 * A cart can legitimately hold items from more than one hotel, so this returns
 * all of them rather than only the first match.
 */
export function getOrderHotels(items: AnyItem[]): PartnerHotel[] {
  const found = new Map<string, PartnerHotel>();
  for (const item of items || []) {
    const hotel = getItemHotel(item);
    if (hotel) found.set(hotel.id, hotel);
  }
  return PARTNER_HOTELS.filter((h) => found.has(h.id));
}

/**
 * Label for the order as a whole: a single hotel name, several joined with " + ",
 * or null when nothing in the order came from a partner hotel.
 */
export function getOrderHotelName(items: AnyItem[]): string | null {
  const hotels = getOrderHotels(items);
  if (hotels.length === 0) return null;
  return hotels.map((h) => h.name).join(' + ');
}

/** Primary hotel id stored on the order. Null when the order has no hotel items. */
export function getOrderHotelId(items: AnyItem[]): string | null {
  const hotels = getOrderHotels(items);
  return hotels.length > 0 ? hotels[0].id : null;
}

/**
 * Mom's Magic's own kitchen, treated as a hotel so that every order names a
 * real hotel record. JIS Kitchen dispatches these exactly like partner orders,
 * which keeps one code path instead of a special case for "our own" food.
 */
export const OWN_KITCHEN = {
  id: 'moms-magic',
  name: "Mom's Magic Kitchen",
} as const;

export interface HotelOrderGroup {
  hotelId: string;
  hotelName: string;
  items: any[];
  /** Sum of this group's own line items, before any cart-wide fees. */
  subtotal: number;
}

/**
 * Splits a cart into one group per kitchen.
 *
 * A cart may legitimately mix hotels, and one order can only be dispatched to
 * one kitchen -- so checkout writes a separate order per group rather than
 * sending Mumtaz a ticket containing Sankalpa's food. Items with no partner
 * hotel fall into Mom's Magic's own kitchen.
 */
export function groupItemsByHotel(items: AnyItem[]): HotelOrderGroup[] {
  const groups = new Map<string, HotelOrderGroup>();

  for (const item of items || []) {
    if (!item) continue;
    const hotel = getItemHotel(item);
    const hotelId = hotel?.id ?? OWN_KITCHEN.id;
    const hotelName = hotel?.name ?? OWN_KITCHEN.name;

    if (!groups.has(hotelId)) {
      groups.set(hotelId, { hotelId, hotelName, items: [], subtotal: 0 });
    }
    const group = groups.get(hotelId)!;
    const anyItem = item as any;
    const qty = Number(anyItem.finalQuantity ?? anyItem.quantity ?? 1);
    group.items.push(item);
    group.subtotal += Number(anyItem.price || 0) * qty;
  }

  return Array.from(groups.values());
}
