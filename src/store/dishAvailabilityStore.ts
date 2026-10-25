import { useCallback } from 'react';
import { create } from 'zustand';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { DishAvailability, isDishAvailableNow, menuItemId, toDishAvailability } from '../lib/dishAvailability';

/**
 * Live dish availability from the panel's `menuItems` collection.
 *
 * A dish the panel has never heard of, or any dish before the first snapshot
 * arrives (or if Firestore is unreachable), counts as available: the bundled
 * menu keeps working exactly as it did, and the kitchen can still reject an
 * order. Only an explicit "off", "sold out" or a serving window that has
 * closed takes a dish away.
 */

interface DishAvailabilityStore {
  dishes: Record<string, DishAvailability>;
  loaded: boolean;
  /** Bumped every minute so serving windows re-evaluate on screen. */
  tick: number;
  subscribe: () => () => void;
  isOrderable: (hotelId: string | null | undefined, name: string) => boolean;
}

let listeners = 0;
let stop: (() => void) | null = null;

export const useDishAvailabilityStore = create<DishAvailabilityStore>((set, get) => ({
  dishes: {},
  loaded: false,
  tick: 0,

  // Several screens subscribe; share one Firestore listener between them.
  subscribe: () => {
    if (!firebaseReady) return () => {};
    listeners += 1;
    if (!stop) {
      const unsubscribe = onSnapshot(
        collection(db, 'menuItems'),
        (snap) => {
          const dishes: Record<string, DishAvailability> = {};
          snap.forEach((d) => {
            dishes[d.id] = toDishAvailability(d.data());
          });
          set({ dishes, loaded: true });
        },
        (err) => console.error('Dish availability listener error:', err)
      );
      const timer = window.setInterval(() => set({ tick: Date.now() }), 60_000);
      stop = () => {
        unsubscribe();
        window.clearInterval(timer);
      };
    }
    return () => {
      listeners -= 1;
      if (listeners <= 0 && stop) {
        stop();
        stop = null;
        listeners = 0;
      }
    };
  },

  isOrderable: (hotelId, name) => {
    if (!hotelId) return true;
    const dish = get().dishes[menuItemId(hotelId, name)];
    return dish ? isDishAvailableNow(dish) : true;
  },
}));

/**
 * Availability check that re-renders the component, and changes identity (so
 * memoised lists recompute), whenever the panel data or the clock moves.
 */
export function useDishOrderable() {
  const dishes = useDishAvailabilityStore((s) => s.dishes);
  const tick = useDishAvailabilityStore((s) => s.tick);
  return useCallback(
    (hotelId: string | null | undefined, name: string) => useDishAvailabilityStore.getState().isOrderable(hotelId, name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dishes, tick]
  );
}
