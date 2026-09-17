import { create } from 'zustand';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { Product } from '../types';
import { MENU_ITEMS as FALLBACK_MENU } from '../data/menuItems';

interface MenuState {
  menuItems: Product[];
  isLoading: boolean;
  error: string | null;
  
  listenToMenu: () => () => void;
  seedMenuIfEmpty: () => Promise<boolean>;
  addMenuItem: (item: Product) => Promise<boolean>;
  updateMenuItem: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteMenuItem: (id: string) => Promise<boolean>;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menuItems: [...FALLBACK_MENU],
  isLoading: true,
  error: null,

  listenToMenu: () => {
    const colRef = collection(db, 'menu');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => {
          const data = doc.data() as Product;
          const fallback = FALLBACK_MENU.find(f => f.id === doc.id);
          return { id: doc.id, ...data, image: fallback?.image || data.image };
        });
        set({ menuItems: items, isLoading: false, error: null });
        localStorage.setItem('moms_magic_menu_cache', JSON.stringify(items));
      } else {
        // Collection is empty or doesn't exist
        const cached = localStorage.getItem('moms_magic_menu_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const updated = parsed.map((it: Product) => {
              const fallback = FALLBACK_MENU.find(f => f.id === it.id);
              return fallback ? { ...it, image: fallback.image } : it;
            });
            set({ menuItems: updated, isLoading: false });
          } catch (e) {
            set({ menuItems: [...FALLBACK_MENU], isLoading: false });
          }
        } else {
          set({ menuItems: [...FALLBACK_MENU], isLoading: false });
        }
      }
    }, (error) => {
      console.error("Error listening to menu:", error);
      set({ error: error.message, isLoading: false });
    });
    return unsubscribe;
  },

  seedMenuIfEmpty: async () => {
    try {
      const colRef = collection(db, 'menu');
      console.log("Seeding menu to Firestore...");
      for (const item of FALLBACK_MENU) {
        const docRef = doc(db, 'menu', item.id);
        await setDoc(docRef, item, { merge: true });
      }
      console.log("Menu seeded successfully.");
      return true;
    } catch (error) {
      console.error("Failed to seed menu:", error);
      return false;
    }
  },

  addMenuItem: async (item: Product) => {
    try {
      const docRef = doc(db, 'menu', item.id);
      await setDoc(docRef, item);
      return true;
    } catch (error) {
      console.error("Error adding menu item:", error);
      return false;
    }
  },

  updateMenuItem: async (id: string, updates: Partial<Product>) => {
    try {
      const docRef = doc(db, 'menu', id);
      await setDoc(docRef, updates, { merge: true });
      return true;
    } catch (error) {
      console.error("Error updating menu item:", error);
      return false;
    }
  },

  deleteMenuItem: async (id: string) => {
    try {
      const docRef = doc(db, 'menu', id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Error deleting menu item:", error);
      return false;
    }
  }
}));
