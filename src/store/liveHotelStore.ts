import { create } from 'zustand';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Live hotel availability, straight from the JIS Kitchen panel.
 *
 * The storefront's hotel cards are hardcoded, so until now a hotel switched
 * off in JIS carried on taking orders here. This subscribes to the `hotels`
 * collection so deactivating a hotel, or a kitchen turning its own switch off,
 * closes it on the customer site within a second.
 */

export interface LiveHotelStatus {
  acceptingOrders: boolean;
  active: boolean;
}

/**
 * The storefront and the panel spell one id differently. Everything else
 * already matches, so this is the single place that needs to know.
 */
const ID_ALIASES: Record<string, string> = {
  moms_magic: 'moms-magic',
};

function panelId(storefrontId: string): string {
  return ID_ALIASES[storefrontId] || storefrontId;
}

interface LiveHotelStore {
  statuses: Record<string, LiveHotelStatus>;
  loaded: boolean;
  subscribe: () => () => void;
  /** Whether customers may order from this hotel right now. */
  isOpen: (storefrontId: string) => boolean;
}

export const useLiveHotelStore = create<LiveHotelStore>((set, get) => ({
  statuses: {},
  loaded: false,

  subscribe: () =>
    onSnapshot(
      collection(db, 'hotels'),
      (snap) => {
        const statuses: Record<string, LiveHotelStatus> = {};
        snap.forEach((d) => {
          const data: any = d.data();
          statuses[d.id] = {
            acceptingOrders: data.acceptingOrders === true,
            active: data.status !== 'INACTIVE',
          };
        });
        set({ statuses, loaded: true });
      },
      (err) => {
        console.error('Hotel availability listener error:', err);
        // Leave `loaded` false so the UI keeps its optimistic default rather
        // than closing every hotel because of a transient network failure.
      }
    ),

  isOpen: (storefrontId) => {
    const { statuses, loaded } = get();
    // Before the first snapshot arrives, assume open: a brief optimistic card
    // is better than telling every customer the shop is shut. The order itself
    // is still refused by the backend if the hotel really is closed.
    if (!loaded) return true;
    const status = statuses[panelId(storefrontId)];
    if (!status) return true;
    return status.active && status.acceptingOrders;
  },
}));
