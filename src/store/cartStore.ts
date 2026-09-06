import { create } from 'zustand';
import { CartItem, Product, SubscriptionPlan } from '../types';

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

// Always empty cart and clean any leftover undo / removed item state on page refresh / reload
try {
  localStorage.removeItem('moms-magic-cart');
  localStorage.removeItem('moms_magic_cart');
  localStorage.removeItem('lastRemovedItem');
  localStorage.removeItem('moms_magic_last_removed');
  localStorage.removeItem('undoItem');
  sessionStorage.removeItem('moms-magic-cart');
} catch (e) {}

export const useCartStore = create<CartStore>((set, get) => {
  const calculateTotal = (items: CartItem[]) => 
    items.reduce((acc, i) => acc + (i.price * i.quantity * getMultiplier(i.subscriptionPlan)), 0);

  const updateCart = (newItems: CartItem[]) => {
    set({ items: newItems, total: calculateTotal(newItems) });
  };

  return {
    items: [],
    total: 0,
    addItem: (product, subscriptionPlan = null, quantity = 1) => {
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
});
