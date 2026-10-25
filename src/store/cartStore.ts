import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, SubscriptionPlan } from '../types';
import { useDishAvailabilityStore } from './dishAvailabilityStore';
import { getItemHotel } from '../utils/orderHotels';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, subscriptionPlan?: SubscriptionPlan, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateSubscriptionPlan: (productId: string, plan: SubscriptionPlan) => void;
  clearCart: () => void;
  total: number;
}

const getMultiplier = (plan: SubscriptionPlan) => {
  if (plan === 'weekly') return 7;
  if (plan === 'monthly') return 30;
  return 1;
};

// The cart is kept for a few hours. It used to live only in memory and be
// wiped on every load, so Android killing the app while the customer was in
// their UPI app, WhatsApp or location settings emptied the cart.
const CART_KEY = 'mintoo-cart';
const CART_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Leftovers from the old undo feature, and from when the cart lived in
// sessionStorage. These are cleanups of names that are already dead, so they
// keep their pre-rename spelling; the mintoo_* twins are listed too because
// the storage migration copies anything it finds under the old names.
try {
  localStorage.removeItem('moms_magic_cart');
  localStorage.removeItem('mintoo_cart');
  localStorage.removeItem('lastRemovedItem');
  localStorage.removeItem('moms_magic_last_removed');
  localStorage.removeItem('mintoo_last_removed');
  localStorage.removeItem('undoItem');
  sessionStorage.removeItem('moms-magic-cart');
  sessionStorage.removeItem('mintoo-cart');
} catch (e) {}

export const useCartStore = create<CartStore>()(persist((set, get) => {
  const calculateTotal = (items: CartItem[]) => 
    items.reduce((acc, i) => acc + (i.price * i.quantity * getMultiplier(i.subscriptionPlan)), 0);

  const updateCart = (newItems: CartItem[]) => {
    set({ items: newItems, total: calculateTotal(newItems) });
  };

  return {
    items: [],
    total: 0,
    addItem: (product, subscriptionPlan = null, quantity = 1) => {
      // Menus already hide dishes switched off in the panel; this catches a
      // screen that was open when the switch flipped.
      if (!useDishAvailabilityStore.getState().isOrderable(getItemHotel(product)?.id, product.name)) return;
      const items = get().items;
      const existingIndex = items.findIndex(i => i.id === product.id);
      let newItems;
      if (existingIndex > -1) {
        newItems = items.map((item, idx) => 
          idx === existingIndex ? { ...item, quantity: item.quantity + quantity, subscriptionPlan } : item
        );
      } else {
        newItems = [...items, { ...product, quantity, subscriptionPlan }];
      }
      updateCart(newItems);
    },
    removeItem: (productId) => {
      const items = get().items;
      const newItems = items.filter(i => i.id !== productId);
      set({ 
        items: newItems,
        total: calculateTotal(newItems)
      });
    },
    updateQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        get().removeItem(productId);
        return;
      }
      const newItems = get().items.map(i => i.id === productId ? { ...i, quantity } : i);
      updateCart(newItems);
    },
    updateSubscriptionPlan: (productId, plan) => {
      const newItems = get().items.map(i => i.id === productId ? { ...i, subscriptionPlan: plan } : i);
      updateCart(newItems);
    },
    clearCart: () => set({ items: [], total: 0 }),
  };
}, {
  name: CART_KEY,
  version: 1,
  partialize: (state) => ({ items: state.items, total: state.total, savedAt: Date.now() }) as any,
  // Drop a cart abandoned hours ago instead of surprising the customer with it.
  merge: (persisted: any, current) => {
    if (!persisted || !Array.isArray(persisted.items) || Date.now() - (persisted.savedAt || 0) > CART_MAX_AGE_MS) {
      return current;
    }
    return { ...current, items: persisted.items, total: persisted.total || 0 };
  },
}));
