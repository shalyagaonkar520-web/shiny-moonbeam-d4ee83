import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { haversineDistance, reverseGeocode } from '../lib/location';

export interface NearbyRestaurant {
  id: number;
  name: string;
  lat: number;
  lng: number;
  cuisine?: string;
}

export interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
  distance: number; // in km
  isDeliverable: boolean;
}

interface LocationStore {
  deliveryLocation: DeliveryLocation | null;
  nearbyRestaurants: NearbyRestaurant[];
  isLocationPickerOpen: boolean;
  restaurantLocation: { lat: number; lng: number };
  maxDeliveryRange: number;
  setDeliveryLocation: (location: DeliveryLocation) => void;
  setNearbyRestaurants: (restaurants: NearbyRestaurant[]) => void;
  openLocationPicker: () => void;
  closeLocationPicker: () => void;
  clearLocation: () => void;
  detectLocation: () => Promise<void>;
  isLoading: boolean;
}

// Fixed restaurant location (Minto Kitchen - Yellapur area)
const RESTAURANT_LOCATION = { lat: 14.9643, lng: 74.7121 };
const MAX_DELIVERY_RANGE = 5; // km

// The outer edge of the area we serve: Yellapur town and the villages around it.
// Checkout refuses anything further, and the location gate uses the same number
// so a customer is never shown a menu they cannot order from. (MAX_DELIVERY_RANGE
// above is the tighter Cash-on-Delivery radius, not the service area.)
export const SERVICE_RADIUS_KM = 12;
export const SERVICE_AREA_NAME = 'Yellapur';

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      deliveryLocation: null,
      nearbyRestaurants: [],
      isLocationPickerOpen: false,
      restaurantLocation: RESTAURANT_LOCATION,
      maxDeliveryRange: MAX_DELIVERY_RANGE,
      setDeliveryLocation: (location) => set({ deliveryLocation: location }),
      setNearbyRestaurants: (restaurants) => set({ nearbyRestaurants: restaurants }),
      openLocationPicker: () => set({ isLocationPickerOpen: true }),
      closeLocationPicker: () => set({ isLocationPickerOpen: false }),
      clearLocation: () => set({ deliveryLocation: null, nearbyRestaurants: [] }),
      isLoading: false,
      detectLocation: async () => {
        if (!navigator.geolocation) {
          throw new Error('Geolocation not supported');
        }

        set({ isLoading: true });

        const getPosition = (options: PositionOptions) =>
          new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, options)
          );

        let pos: GeolocationPosition;
        try {
          // A fix up to a minute old is fine, and a cold GPS start gets 10 s
          // before falling back to network location; this used to wait up to
          // 20 s for a brand-new high-accuracy fix every time.
          pos = await getPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
        } catch (err) {
          const code = (err as GeolocationPositionError)?.code;
          if (code === 1) {
            set({ isLoading: false });
            throw err; // permission denied: nothing else to try
          }
          try {
            pos = await getPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
          } catch (err2) {
            set({ isLoading: false });
            throw err2;
          }
        }

        const { latitude, longitude } = pos.coords;
        const distance = haversineDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, latitude, longitude);
        const location = {
          lat: latitude,
          lng: longitude,
          address: 'Current location',
          distance: parseFloat(distance.toFixed(2)),
          isDeliverable: distance <= MAX_DELIVERY_RANGE,
        };
        // The service-area check needs only the coordinates, so the customer is
        // let in now and the street address fills in when the lookup returns.
        set({ deliveryLocation: location, isLoading: false });

        reverseGeocode(latitude, longitude).then((address) => {
          const current = get().deliveryLocation;
          if (current && current.lat === latitude && current.lng === longitude && address && address !== 'Unable to fetch address') {
            set({ deliveryLocation: { ...current, address } });
          }
        });
      }
    }),
    {
      name: 'delivery-location-storage',
      partialize: (state) => ({ deliveryLocation: state.deliveryLocation }),
    }
  )
);
