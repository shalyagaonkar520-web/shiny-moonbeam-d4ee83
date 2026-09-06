import { create } from 'zustand';
import { DbService, AdminSettings } from '../lib/dbService';

interface SystemState {
  settings: AdminSettings;
  isLoading: boolean;
  error: string | null;
  
  // Operations
  loadSettings: () => Promise<void>;
  listenSettings: () => () => void;
  updateSettings: (newSettings: Partial<AdminSettings>, token?: string) => Promise<boolean>;
  triggerEmergencyStop: (token?: string) => Promise<boolean>;
  resetEmergencyStop: (token?: string) => Promise<boolean>;
}

const DEFAULT_SETTINGS: AdminSettings = {
  websiteStatus: 'ON',
  maintenanceMessage: "Mom's Magic is Open! Welcome ❤️",
  openTime: '12:30',
  closeTime: '22:45',
  reopenMessage: 'Orders are accepted between 12:30 PM and 10:45 PM daily.',
  emergencyStop: false,
  festivalMode: false,
  deliveryPause: false,
  orderLimit: 50,
  lastUpdated: new Date().toISOString(),
  whatsappNumber: '+917483187572',
  whatsappAlertsEnabled: true,
  comboOffers: [
    {
      id: "combo-veg",
      name: "Veg Delight Combo",
      regularPrice: 379,
      offerPrice: 289,
      savings: 90,
      items: [
        "Veg Kadai",
        "4 Chapati",
        "Coke"
      ],
      badge: "POPULAR",
      isActive: true,
      isFeatured: true,
      expiryDate: "2026-06-30",
      image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&q=80"
    }
  ],
  taxRate: 5,
  deliveryFee: 40,
  minOrderValue: 150
};

import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const useSystemStore = create<SystemState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await DbService.fetchSettings();
      set({ settings, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load system settings', isLoading: false });
    }
  },

  listenSettings: () => {
    const docRef = doc(db, 'system/settings');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AdminSettings;
        data.websiteStatus = 'ON';
        data.emergencyStop = false;
        data.deliveryPause = false;
        if (!data.openTime || (data.openTime === '00:00' && data.closeTime === '23:59')) {
          data.openTime = '12:30';
          data.closeTime = '22:45';
        }
        set({ settings: data });
        localStorage.setItem('moms_magic_admin_settings', JSON.stringify(data));
      }
    }, (error) => {
      console.error("Error listening to settings:", error);
    });
    return unsubscribe;
  },

  updateSettings: async (newSettings) => {
    const updatedSettings = { ...get().settings, ...newSettings };
    
    // Optimistically update frontend UI first for instant changes
    set({ settings: updatedSettings });

    // Synchronize securely with backend
    const success = await DbService.saveSettings(updatedSettings);
    if (!success) {
      console.warn('System settings push failed (Likely missing Firestore rules). Falling back to Local Storage.');
      // Do NOT revert state. Allow local app testing to continue.
      // The settings are already saved in localStorage via dbService.saveSettings
      return false; // Return false so UI can show a warning toast, but UI state won't revert
    }
    return true;
  },

  triggerEmergencyStop: async () => {
    return get().updateSettings({
      emergencyStop: true,
      websiteStatus: 'OFF',
      deliveryPause: true,
      maintenanceMessage: "Mom's Magic order lines are currently locked down due to an emergency. We'll be back shortly! 🚨"
    });
  },

  resetEmergencyStop: async () => {
    return get().updateSettings({
      emergencyStop: false,
      websiteStatus: 'ON',
      deliveryPause: false,
      maintenanceMessage: "Mom's Magic is temporarily closed. We'll reopen soon ❤️"
    });
  }
}));
