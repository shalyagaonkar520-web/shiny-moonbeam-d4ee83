import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { haversineDistance } from '../lib/location';
import { useLocationStore } from './locationStore';
import { useAuthStore } from './authStore';

export type AddressLabel = 'Home' | 'Work' | 'Other';

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  /** Flat / house number and building: the part a map pin cannot give a rider. */
  house: string;
  landmark: string;
  /** Street address from the map. */
  address: string;
  lat: number;
  lng: number;
  createdAt: string;
}

/** The one-line address a rider and the kitchen see on the order. */
export function fullAddress(a: Pick<SavedAddress, 'house' | 'landmark' | 'address'>): string {
  return [a.house.trim(), a.landmark.trim() && `Near ${a.landmark.trim()}`, a.address.trim()]
    .filter(Boolean)
    .join(', ');
}

/** Same point within ~25 m counts as the same place. */
export function samePlace(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return haversineDistance(a.lat, a.lng, b.lat, b.lng) < 0.025;
}

/** Deletes the profile copies of an address (same place, or same Home/Work slot). */
async function removeFromProfile(a: { id: string; label: string; lat: number; lng: number }) {
  const { user, profile, deleteAddress } = useAuthStore.getState();
  if (!user || !profile?.addresses) return;
  const matches = profile.addresses.filter(
    (p) => p.id === a.id || samePlace(p, a) || (a.label !== 'Other' && p.label === a.label)
  );
  for (const m of matches) await deleteAddress(m.id);
}

interface SavedAddressState {
  addresses: SavedAddress[];
  save: (input: Omit<SavedAddress, 'id' | 'createdAt'>) => SavedAddress;
  remove: (id: string) => void;
  /** Makes a saved address the current delivery location. */
  deliverTo: (a: SavedAddress) => void;
}

// Addresses live on the device for everyone (guests included), under a
// mintoo_ key so account deletion clears them. For a signed-in customer
// they are mirrored to profile.addresses in Firestore, so they follow the
// customer to a new phone; see useSavedAddresses for the merge.
export const useSavedAddressStore = create<SavedAddressState>()(
  persist(
    (set, get) => ({
      addresses: [],

      save: (input) => {
        const existing = get().addresses.find((a) => a.label === input.label && input.label !== 'Other');
        const saved: SavedAddress = {
          ...input,
          // Saving a second "Home" replaces the first, as Swiggy does.
          id: existing?.id || `addr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
        };
        set({ addresses: [saved, ...get().addresses.filter((a) => a.id !== saved.id)] });

        const { user, profile, addAddress } = useAuthStore.getState();
        if (user && profile) {
          const sync = async () => {
            // Profile copies get their own ids, so match them by place/label.
            await removeFromProfile(existing || saved);
            await addAddress(saved.label, fullAddress(saved), saved.lat, saved.lng);
          };
          sync().catch((err) => console.warn('Could not sync saved address to profile:', err));
        }
        return saved;
      },

      remove: (id) => {
        const target =
          get().addresses.find((a) => a.id === id) ||
          useAuthStore.getState().profile?.addresses?.find((a) => a.id === id);
        set({ addresses: get().addresses.filter((a) => a.id !== id) });
        if (target) {
          removeFromProfile(target).catch((err) => console.warn('Could not remove address from profile:', err));
        }
      },

      deliverTo: (a) => {
        const { restaurantLocation, maxDeliveryRange, setDeliveryLocation } = useLocationStore.getState();
        const distance = haversineDistance(restaurantLocation.lat, restaurantLocation.lng, a.lat, a.lng);
        setDeliveryLocation({
          lat: a.lat,
          lng: a.lng,
          address: fullAddress(a),
          distance: parseFloat(distance.toFixed(2)),
          isDeliverable: distance <= maxDeliveryRange,
        });
      },
    }),
    { name: 'mintoo_saved_addresses' }
  )
);

/**
 * Device addresses plus any on the signed-in profile that this device has not
 * seen yet (e.g. saved on another phone). Profile entries carry the full
 * address in one string, so they come back with empty house/landmark.
 */
export function useSavedAddresses(): SavedAddress[] {
  const local = useSavedAddressStore((s) => s.addresses);
  const profileAddresses = useAuthStore((s) => s.profile?.addresses);
  const fromProfile: SavedAddress[] = (profileAddresses || [])
    .filter((p) => typeof p.lat === 'number' && !local.some((l) => l.id === p.id || samePlace(l, p)))
    .map((p) => ({
      id: p.id,
      label: (['Home', 'Work'].includes(p.label) ? p.label : 'Other') as AddressLabel,
      house: '',
      landmark: '',
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      createdAt: '',
    }));
  return [...local, ...fromProfile];
}
