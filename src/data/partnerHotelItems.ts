// Flattens every partner hotel's menu into one home-page list.
//
// The home page's own `menuItems` already IS Hotel Al Amin's menu (same 73
// dishes, ids `ff-*` instead of `alamin-*`), which is why Al Amin items carry
// no hotel badge -- they are the default. Everything below is the food that
// previously only existed behind /hotel-<name>.
//
// Cart ids, hotelId, description and image are built exactly the way each
// hotel menu page builds them, so adding "Paneer Handi" from the home page and
// adding it from /hotel-sankalpa land on the same cart line instead of two.

import { Product } from '../types';
import { HOTEL_SANKALPA_MENU } from './hotelSankalpaMenu';
import { SANKALPA_MENU_IMAGES, SANKALPA_FALLBACK_IMAGE } from './sankalpaMenuImages';
import { HOTEL_MUMTAZ_MENU } from './hotelMumtazMenu';
import { resolveMumtazDishImage, isNonVegItem } from './hotelMumtazMenuImages';
import { HOTEL_COASTAL_CROWN_MENU } from './hotelCoastalCrownMenu';
import { HOTEL_MALABAR_MENU } from './hotelMalabarMenu';

export interface PartnerHotelProduct extends Product {
  id: string;
  hotelId: string;
  /** Display name for the badge on the card. */
  hotelName: string;
  /** Route to that hotel's full menu. */
  hotelPath: string;
  /** Al Amin is the home page's own menu, so its items are not badged. */
  showHotelBadge: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const COASTAL_FALLBACK_IMAGE = '/hotel_coastal_crown_dining.webp';
const MALABAR_FALLBACK_IMAGE = '/hotel_malabar.webp';

function sankalpaItems(): PartnerHotelProduct[] {
  return HOTEL_SANKALPA_MENU.flatMap((category) =>
    category.items.map((item) => ({
      id: `sankalpa-${slug(item.name)}`,
      hotelId: 'sankalpa',
      hotelName: 'Hotel Sankalpa',
      hotelPath: '/hotel-sankalpa',
      showHotelBadge: true,
      name: item.name,
      price: item.price,
      image: item.image || SANKALPA_MENU_IMAGES[item.name] || SANKALPA_FALLBACK_IMAGE,
      category: category.title,
      type: 'food' as const,
      isVeg: true,
      description: item.note || `Hotel Sankalpa ${item.name}`,
    }))
  );
}

function mumtazItems(): PartnerHotelProduct[] {
  return HOTEL_MUMTAZ_MENU.flatMap((category) =>
    category.items
      // Mumtaz marks "ask at counter" dishes with a null price; those cannot be
      // ordered, and its own menu page refuses to add them too.
      .filter((item) => item.price !== null)
      .map((item) => ({
        id: `mumtaz-${slug(item.name)}`,
        hotelId: 'mumtaz',
        hotelName: 'Hotel Mumtaz',
        hotelPath: '/hotel-mumtaz',
        showHotelBadge: true,
        name: item.name,
        price: item.price as number,
        image: item.image || resolveMumtazDishImage(category.title, item.name),
        category: category.title,
        type: 'food' as const,
        isVeg: !isNonVegItem(category.title, item.name),
        description: `Authentic Hotel Mumtaz ${item.name}`,
      }))
  );
}

function coastalCrownItems(): PartnerHotelProduct[] {
  return HOTEL_COASTAL_CROWN_MENU.flatMap((category) =>
    category.items.map((item) => ({
      id: `coastal-${slug(item.name)}`,
      hotelId: 'coastal_crown',
      hotelName: 'Coastal Crown',
      hotelPath: '/hotel-coastal-crown',
      showHotelBadge: true,
      name: item.name,
      price: item.price,
      image: item.image || COASTAL_FALLBACK_IMAGE,
      category: category.title,
      type: 'food' as const,
      isVeg: !!item.isVeg,
      description: item.note || `Coastal Crown ${item.name}`,
    }))
  );
}

function malabarItems(): PartnerHotelProduct[] {
  return HOTEL_MALABAR_MENU.flatMap((category) =>
    category.items.map((item) => ({
      id: `malabar-${slug(item.name)}`,
      hotelId: 'malabar',
      hotelName: 'Hotel Malabar',
      hotelPath: '/hotel-malabar',
      showHotelBadge: true,
      name: item.name,
      price: item.price,
      image: item.image || MALABAR_FALLBACK_IMAGE,
      category: category.title,
      type: 'food' as const,
      isVeg: !!item.isVeg,
      description: item.note || `Hotel Malabar ${item.name}`,
    }))
  );
}

/**
 * Sankalpa first, then the remaining hotels -- the home page renders Al Amin's
 * own menu ahead of this list, giving the requested Al Amin -> Sankalpa -> rest
 * order. Built once at module load; these menus are static.
 */
export const PARTNER_HOTEL_PRODUCTS: PartnerHotelProduct[] = [
  ...sankalpaItems(),
  ...mumtazItems(),
  ...coastalCrownItems(),
  ...malabarItems(),
];
