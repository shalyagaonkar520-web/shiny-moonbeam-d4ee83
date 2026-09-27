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

// Fixed restaurant location (Mom's Magic Kitchen - Yellapur area)
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
    (set) => ({
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
        
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const { latitude, longitude } = pos.coords;
                const address = await reverseGeocode(latitude, longitude);
                const distance = haversineDistance(
                  RESTAURANT_LOCATION.lat, 
                  RESTAURANT_LOCATION.lng, 
                  latitude, 
                  longitude
                );

                set({
                  deliveryLocation: {
                    lat: latitude,
                    lng: longitude,
                    address,
                    distance: parseFloat(distance.toFixed(2)),
                    isDeliverable: distance <= MAX_DELIVERY_RANGE
                  },
                  isLoading: false
                });
                resolve();
              } catch (err) {
                set({ isLoading: false });
                reject(err);
              }
            },
            (err) => {
              set({ isLoading: false });
              reject(err);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
          );
        });
      }
    }),
    {
      name: 'delivery-location-storage',
      partialize: (state) => ({ deliveryLocation: state.deliveryLocation }),
    }
  )
);
