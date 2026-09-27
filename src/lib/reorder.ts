import { Product } from '../types';
import { useMenuStore } from '../store/menuStore';
import { useCartStore } from '../store/cartStore';
import { PARTNER_HOTEL_PRODUCTS } from '../data/partnerHotelItems';
import { HOTEL_AL_AMIN_MENU } from '../data/hotelAlAminMenu';

// Every product a customer can add, keyed the way the cart keys it. Al Amin's
// own page uses `alamin-*` ids that the home page does not, so it is built the
// same way HotelAlAminMenuPage builds its cart lines.
function catalog(): Product[] {
  const alAmin: Product[] = HOTEL_AL_AMIN_MENU.flatMap((cat) =>
    cat.items.map((item) => ({
      id: item.id,
      hotelId: 'al_amin',
      name: item.name,
      price: item.price,
      image: item.image,
      category: cat.title,
      type: 'food' as const,
      isVeg: item.isVeg,
      description: item.description || `Hotel Al Amin signature ${item.name}`,
    }))
  );
  return [...useMenuStore.getState().menuItems, ...PARTNER_HOTEL_PRODUCTS, ...alAmin];
}

const norm = (s: string | undefined) => (s || '').trim().toLowerCase();

export interface ReorderResult {
  added: number;
  missing: string[];
  priceChanged: boolean;
}

/**
 * Puts a past order's dishes back in the cart at TODAY's prices. A dish is
 * found by its cart id, or failing that by name within the same restaurant (for
 * menus whose ids changed). Dishes that no longer exist or are switched off are
 * skipped and reported, never re-added at an old price.
 */
export function reorder(order: { items?: any[] }): ReorderResult {
  const products = catalog();
  const byId = new Map(products.filter((p) => p.id).map((p) => [p.id as string, p]));
  const { addItem } = useCartStore.getState();

  const result: ReorderResult = { added: 0, missing: [], priceChanged: false };
  for (const item of order.items || []) {
    const qty = Math.max(1, Number(item.finalQuantity ?? item.quantity ?? 1));
    const match =
      (item.id && byId.get(item.id)) ||
      products.find(
        (p) => norm(p.name) === norm(item.name) && (!item.hotelId || !p.hotelId || p.hotelId === item.hotelId)
      );
    if (!match || match.isAvailable === false) {
      result.missing.push(item.name || 'An item');
      continue;
    }
    if (typeof item.price === 'number' && item.price !== match.price) result.priceChanged = true;
    addItem(match, null, qty);
    result.added += qty;
  }
  return result;
}

/** The full order saved on this device at checkout (it keeps each item's cart id). */
export function localOrder(orderId: string): any | null {
  try {
    const stored = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
    return stored.find((o: any) => o?.id === orderId) || null;
  } catch {
    return null;
  }
}

/** Reorder, tell the customer what happened, and open checkout if anything was added. */
export function reorderAndGo(
  order: { items?: any[] },
  navigate: (path: string) => void,
  notify: { success: (m: string) => void; error: (m: string) => void }
) {
  const { added, missing, priceChanged } = reorder(order);
  if (added === 0) {
    notify.error('These dishes are not available right now.');
    return;
  }
  const notes = [
    missing.length ? `${missing.length} unavailable item${missing.length > 1 ? 's' : ''} skipped` : '',
    priceChanged ? "prices updated to today's menu" : '',
  ].filter(Boolean);
  notify.success(`Added to cart${notes.length ? ` (${notes.join('; ')})` : ''}`);
  navigate('/checkout');
}
