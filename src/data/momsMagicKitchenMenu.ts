// Moms Magic Kitchen - Chinese fried rice, noodles and starters.
// From the "Sai Fastfood" printed menu card; every price here is the card price
// plus Rs 10 (the card price is kept alongside so the margin stays visible).
//
// Photos: every dish uses its own crop of the kitchen's two posters
// (public/menu/mmk/, one per dish), each checked by eye against its name.
// The poster's Mushroom Schezwan Noodles bowl shows paneer, not mushroom.

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

const CARD: MomsMagicKitchenCategory[] = [
  {
    title: 'Veg Chinese Rice',
    items: [
      { name: 'Veg Fried Rice', cardPrice: 80, isVeg: true, image: '/menu/mmk/veg-fried-rice.webp' },
      { name: 'Half Fried Rice', cardPrice: 49, isVeg: true, image: '/menu/mmk/veg-fried-rice.webp' },
      { name: 'Veg Schezwan Fried Rice', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-schezwan-fried-rice.webp' },
      { name: 'Veg Garlic Rice', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-garlic-rice.webp' },
      { name: 'Veg Singapore Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/veg-singapore.webp' },
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
      { name: 'Veg Schezwan Noodles', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-schezwan-noodles.webp' },
      { name: 'Paneer Noodles', cardPrice: 140, isVeg: true, image: '/menu/mmk/paneer-noodles.webp' },
      { name: 'Paneer Schezwan Noodles', cardPrice: 120, isVeg: true, image: '/menu/mmk/paneer-schezwan-noodles.webp' },
      { name: 'Mushroom Noodles', cardPrice: 130, isVeg: true, image: '/menu/mmk/mushroom-noodles.webp' },
      { name: 'Mushroom Schezwan Noodles', cardPrice: 140, isVeg: true, image: '/menu/mmk/mushroom-schezwan-noodles.webp' },
    ],
  },
  {
    title: 'Non Veg Fried Rice',
    items: [
      { name: 'Egg Fried Rice', cardPrice: 80, isVeg: false, image: '/menu/mmk/egg-fried-rice.webp' },
      { name: 'Chicken Fried Rice', cardPrice: 100, isVeg: false, image: '/menu/mmk/chicken-fried-rice.webp' },
      { name: 'Chicken Schezwan Fried Rice', cardPrice: 120, isVeg: false, image: '/menu/mmk/chicken-schezwan-fried-rice.webp' },
      { name: 'Egg Schezwan Fried Rice', cardPrice: 100, isVeg: false, image: '/menu/mmk/egg-schezwan-fried-rice.webp' },
      { name: 'Egg Fried Rice with Noodles', cardPrice: 120, isVeg: false, image: '/menu/mmk/egg-fried-rice-with-noodles.webp' },
      { name: 'Non Veg Mix Fried Rice', cardPrice: 150, isVeg: false, image: '/menu/mmk/non-veg-mix-fried-rice.webp' },
    ],
  },
  {
    title: 'Non Veg Noodles',
    items: [
      { name: 'Egg Noodles', cardPrice: 80, isVeg: false, image: '/menu/mmk/egg-noodles.webp' },
      { name: 'Egg Schezwan Noodles', cardPrice: 100, isVeg: false, image: '/menu/mmk/egg-schezwan-noodles.webp' },
      { name: 'Chicken Noodles', cardPrice: 120, isVeg: false, image: '/menu/mmk/chicken-noodles.webp' },
      { name: 'Chicken Schezwan Noodles', cardPrice: 120, isVeg: false, image: '/menu/mmk/chicken-schezwan-noodles.webp' },
      { name: 'Chicken Garlic Noodles', cardPrice: 100, isVeg: false, image: '/menu/mmk/chicken-garlic-noodles.webp' },
    ],
  },
  {
    title: 'Chinese Special',
    items: [
      { name: 'Paneer Crispy', cardPrice: 120, isVeg: true, image: '/menu/mmk/paneer-crispy.webp' },
      { name: 'Veg Crispy', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-crispy.webp' },
      { name: 'Chicken Chilli', cardPrice: 120, isVeg: false, image: '/menu/mmk/chicken-chilli.webp' },
      { name: 'Gobi Manchurian', cardPrice: 100, isVeg: true, image: '/menu/mmk/gobi-manchurian.webp' },
      { name: 'Veg Manchurian', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-manchurian.webp' },
    ],
  },
  {
    title: 'Rice Special',
    items: [
      { name: 'Veg Tripura Rice', cardPrice: 150, isVeg: true, image: '/menu/mmk/veg-tripura-rice.webp' },
      { name: 'Chicken Tripura Rice', cardPrice: 180, isVeg: false, image: '/menu/mmk/chicken-tripura-rice.webp' },
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
