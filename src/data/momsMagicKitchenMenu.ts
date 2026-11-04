// Moms Magic Kitchen - Chinese fried rice, noodles and starters.
// From the "Sai Fastfood" printed menu card; every price here is the card price
// plus Rs 10 (the card price is kept alongside so the margin stays visible).
//
// Photos: the veg rice dishes and Veg Noodles use crops of the kitchen's own
// poster (public/menu/mmk/, one per dish). The rest were each opened and
// checked by eye before being used (file names in public/ are not reliable).
// Veg dishes only use photos with no meat in them; where no matching photo
// exists the dish uses the closest vegetarian rice/noodle photo or the
// kitchen's fallback image.

export interface MomsMagicKitchenItem {
  name: string;
  /** Price on the printed card; the selling price adds MARKUP. */
  cardPrice: number;
  isVeg: boolean;
  image?: string;
}

export interface MomsMagicKitchenCategory {
  title: string;
  items: MomsMagicKitchenItem[];
}

export const MOMS_MAGIC_KITCHEN_MARKUP = 10;
export const MOMS_MAGIC_KITCHEN_IMAGE = '/triple_schezwan_rice.webp';

const VEG_RICE = '/veg_fried_rice.webp';
const VEG_SCHEZWAN = '/veg_schezwan_rice.webp';
const EGG_RICE = '/egg_fried_rice.webp';
const EGG_SCHEZWAN = '/schezwan_egg_rice.webp';
const CHICKEN_RICE = '/chicken_fried_rice.webp';
const NOODLES = '/veg_noodles_real.webp';

const CARD: MomsMagicKitchenCategory[] = [
  {
    title: 'Veg Chinese Rice',
    items: [
      { name: 'Veg Fried Rice', cardPrice: 80, isVeg: true, image: '/menu/mmk/veg-fried-rice.webp' },
      { name: 'Veg Schezwan Fried Rice', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-schezwan-fried-rice.webp' },
      { name: 'Veg Garlic Rice', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-garlic-rice.webp' },
      { name: 'Veg Singapore Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/singapore-rice.webp' },
      { name: 'Paneer Fried Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/paneer-fried-rice.webp' },
      { name: 'Paneer Schezwan Rice', cardPrice: 140, isVeg: true, image: '/menu/mmk/paneer-schezwan-rice.webp' },
      { name: 'Mushroom Fried Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/mushroom-fried-rice.webp' },
      { name: 'Mushroom Schezwan Rice', cardPrice: 140, isVeg: true, image: '/menu/mmk/mushroom-schezwan-rice.webp' },
      { name: 'Mushroom Garlic Rice', cardPrice: 140, isVeg: true, image: '/menu/mmk/mushroom-garlic-rice.webp' },
      { name: 'Baby Corn Fried Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/baby-corn-fried-rice.webp' },
      { name: 'Mixed Veg Fried Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/mixed-veg-fried-rice.webp' },
      { name: 'Triple Schezwan Rice', cardPrice: 150, isVeg: true, image: '/menu/mmk/triple-schezwan-rice.webp' },
    ],
  },
  {
    title: 'Veg Noodles',
    items: [
      { name: 'Veg Noodles', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-noodles.webp' },
      { name: 'Veg Schezwan Noodles', cardPrice: 100, isVeg: true, image: NOODLES },
      { name: 'Paneer Noodles', cardPrice: 140, isVeg: true, image: NOODLES },
      { name: 'Paneer Schezwan Noodles', cardPrice: 120, isVeg: true, image: NOODLES },
      { name: 'Mushroom Noodles', cardPrice: 130, isVeg: true, image: NOODLES },
      { name: 'Mushroom Schezwan Noodles', cardPrice: 140, isVeg: true, image: NOODLES },
    ],
  },
  {
    title: 'Non Veg Fried Rice',
    items: [
      { name: 'Egg Fried Rice', cardPrice: 80, isVeg: false, image: EGG_RICE },
      { name: 'Chicken Fried Rice', cardPrice: 100, isVeg: false, image: CHICKEN_RICE },
      { name: 'Chicken Schezwan Fried Rice', cardPrice: 120, isVeg: false, image: CHICKEN_RICE },
      { name: 'Egg Schezwan Fried Rice', cardPrice: 100, isVeg: false, image: EGG_SCHEZWAN },
      { name: 'Egg Fried Rice with Noodles', cardPrice: 120, isVeg: false, image: EGG_RICE },
      { name: 'Non Veg Mix Fried Rice', cardPrice: 150, isVeg: false, image: CHICKEN_RICE },
    ],
  },
  {
    title: 'Non Veg Noodles',
    items: [
      { name: 'Egg Noodles', cardPrice: 80, isVeg: false, image: NOODLES },
      { name: 'Egg Schezwan Noodles', cardPrice: 100, isVeg: false, image: NOODLES },
      { name: 'Chicken Noodles', cardPrice: 120, isVeg: false, image: NOODLES },
      { name: 'Chicken Schezwan Noodles', cardPrice: 120, isVeg: false, image: NOODLES },
      { name: 'Chicken Garlic Noodles', cardPrice: 100, isVeg: false, image: NOODLES },
    ],
  },
  {
    title: 'Chinese Special',
    items: [
      { name: 'Paneer Crispy', cardPrice: 120, isVeg: true },
      { name: 'Veg Crispy', cardPrice: 100, isVeg: true, image: '/gobi_chilli.webp' },
      { name: 'Chicken Chilli', cardPrice: 120, isVeg: false, image: '/chicken_chilli.webp' },
      { name: 'Gobi Manchurian', cardPrice: 100, isVeg: true, image: '/gobi_manchurian.webp' },
      { name: 'Veg Manchurian', cardPrice: 100, isVeg: true, image: '/gobi_manchurian.webp' },
    ],
  },
  {
    title: 'Rice Special',
    items: [
      { name: 'Veg Tripura Rice', cardPrice: 150, isVeg: true, image: VEG_SCHEZWAN },
      { name: 'Chicken Tripura Rice', cardPrice: 180, isVeg: false, image: CHICKEN_RICE },
    ],
  },
];

export interface MomsMagicKitchenMenuItem {
  name: string;
  price: number;
  cardPrice: number;
  isVeg: boolean;
  image?: string;
}

/** The menu at selling prices (card price + Rs 10). */
export const MOMS_MAGIC_KITCHEN_MENU: Array<{ title: string; items: MomsMagicKitchenMenuItem[] }> = CARD.map((c) => ({
  title: c.title,
  items: c.items.map((i) => ({ ...i, price: i.cardPrice + MOMS_MAGIC_KITCHEN_MARKUP })),
}));
