import { ComboOffer, Coupon } from '../types';

export interface AdminSettings {
  websiteStatus: 'ON' | 'OFF';
  maintenanceMessage: string;
  openTime: string; // e.g. "12:00" (24-hour HH:mm)
  closeTime: string; // e.g. "22:45" (24-hour HH:mm)
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
  websiteStatus: 'ON',
  maintenanceMessage: "Minto is Open! Welcome ❤️",
  openTime: '12:00',
  closeTime: '22:45',
  reopenMessage: 'Orders are accepted between 12:00 PM and 10:45 PM daily.',
  emergencyStop: false,
  festivalMode: false,
  deliveryPause: false,
  orderLimit: 50,
  lastUpdated: new Date().toISOString(),
  whatsappNumber: '+919606001790',
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
  private static STORAGE_KEY = 'mintoo_admin_settings';
  private static SETTINGS_DOC_REF = 'system/settings';

  /**
   * Fetch current system settings from Firestore with local storage fallback.
   */
  static async fetchSettings(): Promise<AdminSettings> {
    try {
      const docRef = doc(db, this.SETTINGS_DOC_REF);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        // Stored values win; defaults only fill fields the document lacks.
        const data: AdminSettings = { ...DEFAULT_SETTINGS, ...(docSnap.data() as Partial<AdminSettings>) };
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
        const parsed = JSON.parse(cached);
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {
        // Corrupted cache
      }
    }

    // Fallback to defaults
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings via Firestore, fallback to local cache.
   *
   * `changes` holds only the keys being edited and is all that is written, so
   * a save of one field cannot put back stale values of the others (such as
   * reopening the shop after an Emergency Stop). `fullSettings`, when given,
   * refreshes the offline cache.
   */
  static async saveSettings(changes: Partial<AdminSettings>, fullSettings?: AdminSettings): Promise<boolean> {
    const lastUpdated = new Date().toISOString();

    // 1. Update offline cache immediately
    if (fullSettings) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ ...fullSettings, lastUpdated }));
      } catch {
        /* storage unavailable */
      }
    }

    // 2. Push just the changed keys to Firestore
    try {
      const docRef = doc(db, this.SETTINGS_DOC_REF);
      await setDoc(docRef, { ...changes, lastUpdated }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error communicating settings update to backend:', error);
    }

    return false;
  }
}
