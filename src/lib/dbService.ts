import { ComboOffer, Coupon } from '../types';

export interface AdminSettings {
  websiteStatus: 'ON' | 'OFF';
  maintenanceMessage: string;
  openTime: string; // e.g. "12:30"
  closeTime: string; // e.g. "22:30"
  reopenMessage: string;
  emergencyStop: boolean;
  festivalMode: boolean;
  deliveryPause: boolean;
  orderLimit: number;
  lastUpdated: string;
  whatsappNumber: string;
  whatsappAlertsEnabled: boolean;
  comboOffers: ComboOffer[];
  coupons: Coupon[];
  taxRate: number;
  deliveryFee: number;
  minOrderValue: number;
}

const DEFAULT_SETTINGS: AdminSettings = {
  websiteStatus: 'OFF',
  maintenanceMessage: "Mom's Magic is closed for today. We will reopen tomorrow! ❤️",
  openTime: '12:30',
  closeTime: '22:30',
  reopenMessage: 'We will reopen tomorrow, July 24, 2026.',
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
  coupons: [
    { code: 'WINNER', type: 'free_delivery', value: 0, minOrderValue: 0, isActive: true },
    { code: 'APPUSER', type: 'fixed_discount', value: 22, minOrderValue: 100, isActive: true },
    { code: 'CODE-APPUSER', type: 'fixed_discount', value: 25, minOrderValue: 100, isActive: true }
  ],
  taxRate: 5,
  deliveryFee: 40,
  minOrderValue: 150
};

import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export class DbService {
  private static STORAGE_KEY = 'moms_magic_admin_settings';
  private static SETTINGS_DOC_REF = 'system/settings';

  /**
   * Fetch current system settings from Firestore with local storage fallback.
   */
  static async fetchSettings(): Promise<AdminSettings> {
    try {
      const docRef = doc(db, this.SETTINGS_DOC_REF);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as AdminSettings;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch (error) {
      console.warn('Firestore settings fetch failed, pulling from offline storage cache:', error);
    }

    // Fallback to localStorage cache
    const cached = localStorage.getItem(this.STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Corrupted cache
      }
    }

    // Fallback to defaults
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings securely via Firestore, fallback to local cache.
   */
  static async saveSettings(settings: AdminSettings): Promise<boolean> {
    // 1. Update offline cache immediately
    settings.lastUpdated = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));

    // 2. Perform backend secure push to Firestore
    try {
      const docRef = doc(db, this.SETTINGS_DOC_REF);
      await setDoc(docRef, settings, { merge: true });
      return true;
    } catch (error) {
      console.error('Error communicating settings update to backend:', error);
    }

    return false;
  }
}
