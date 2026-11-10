export interface Hotel {
  id: string;
  name: string;
  status: 'open' | 'closed';
  email: string;
  address: string;
  image?: string;
  autoOpenTime?: string; // e.g. "09:00"
  autoCloseTime?: string; // e.g. "22:00"
  phone: string;
  createdAt: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'hotel_admin';
  hotelId?: string; // For hotel admins
  name: string;
}

export interface Product {
  id?: string;
  hotelId?: string;
  name: string;
  price: number;
  gettingPrice?: number;
  hotelPrice?: number;
  profit?: number;
  image: string;
  category: string;
  subcategory?: string;
  type: 'food' | 'grocery' | 'milk' | 'fashion';
  description?: string;
  rating?: number;
  originalPrice?: number;
  isTopPick?: boolean;
  fires?: number;
  isVeg?: boolean;
  isAvailable?: boolean;
  stockCount?: number;
  royalHighlight?: boolean;
  items?: string[]; // For combo offers containing multiple items
}

export interface ComboOffer {
  id: string;
  name: string;
  regularPrice: number;
  offerPrice: number;
  savings: number;
  items: string[];
  badge: string;
  isActive: boolean;
  isFeatured: boolean;
  expiryDate?: string;
  image?: string;
}

export interface Coupon {
  code: string;
  type: 'free_delivery' | 'fixed_discount' | 'percent_discount';
  value: number; // e.g. 20 for fixed, 10 for 10%
  minOrderValue: number;
  isActive: boolean;
}

export interface Order {
  id?: string;
  hotelId: string;
  userName: string;
  userPhone: string;
  address: string;
  items: CartItem[];
  total: number;
  type: 'food' | 'grocery' | 'milk' | 'fashion';
  status: 'pending' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'completed' | 'cancelled';
  prepTime?: string; // e.g. "20 mins"
  createdAt: any;
}

export type SubscriptionPlan = 'daily' | 'weekly' | 'monthly' | null;

export interface CartItem extends Product {
  quantity: number;
  subscriptionPlan?: SubscriptionPlan;
}

// ═══════════════════════════════════════════════════════════════
// DELIVERY CHARGE CALCULATION
// 0-2 km  = ₹20 (base)
// 2-5 km  = +₹10 per km beyond 2km
// 5+ km   = +₹20 per km beyond 5km
// ═══════════════════════════════════════════════════════════════
export function calculateDeliveryCharge(distanceKm: number): number {
  // Free delivery till July 1st, 2026
  if (new Date() < new Date('2026-07-02T00:00:00')) {
    return 0;
  }

  const km = Math.ceil(distanceKm);
  let charge = 20; // base charge for 0-2 km
  if (km > 2) {
    charge += (km - 2) * 10;
  }
  return charge;
}
