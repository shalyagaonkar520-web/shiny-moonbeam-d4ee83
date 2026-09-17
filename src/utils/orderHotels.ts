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
