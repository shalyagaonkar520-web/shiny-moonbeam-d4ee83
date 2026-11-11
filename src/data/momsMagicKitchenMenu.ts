// Moms Magic Kitchen - Chinese fried rice, noodles and starters.
// From the "Sai Fastfood" printed menu card; every price here is the card price
// plus Rs 10 (the card price is kept alongside so the margin stays visible).
//
// Photos (public/menu/mmk/, one per dish, each checked by eye against its name):
//  - Most dishes use a free-licence Pexels photo (<slug>-photo.webp; credits in
//    public/menu/attributions.json).
//  - Eight dishes keep their crop of the kitchen's own poster, because no stock photo
//    matched them honestly: the paneer and mushroom rice dishes, baby corn fried
//    rice, triple schezwan rice and egg fried rice with noodles. Do not swap those
//    for a look-alike without looking at the result.
// The poster's Mushroom Schezwan Noodles bowl shows paneer, not mushroom.

export interface MomsMagicKitchenItem {
  name: string;
  /** Price on the printed card; the selling price adds MARKUP. */
  cardPrice: number;
  isVeg: boolean;
  image?: string;
  /**
   * Special terms for this dish's half portion, used only while half portions
   * are switched on (see buildMomsMagicKitchenMenu). Without it the half is
   * "<name> (Half)" at HALF_PRICE(full selling price).
   */
  half?: { name?: string; price?: number; image?: string };
}

export interface MomsMagicKitchenCategory {
  title: string;
  items: MomsMagicKitchenItem[];
}

export const MOMS_MAGIC_KITCHEN_MARKUP = 10;
export const MOMS_MAGIC_KITCHEN_IMAGE = '/menu/mmk/banner-photo.webp';

const CARD: MomsMagicKitchenCategory[] = [
  {
    title: 'Veg Chinese Rice',
    items: [
      // Its half keeps the name and Rs 59 price it was first launched with.
      { name: 'Veg Fried Rice', cardPrice: 80, isVeg: true, image: '/menu/mmk/veg-fried-rice-photo.webp', half: { name: 'Half Fried Rice', price: 59 } },
      { name: 'Veg Schezwan Fried Rice', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-schezwan-fried-rice-photo.webp' },
      { name: 'Veg Garlic Rice', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-garlic-rice-photo.webp' },
      { name: 'Veg Singapore Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/veg-singapore-rice-photo.webp' },
      { name: 'Paneer Fried Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/paneer-fried-rice.webp' },
      { name: 'Paneer Schezwan Rice', cardPrice: 140, isVeg: true, image: '/menu/mmk/paneer-schezwan-rice.webp' },
      { name: 'Mushroom Fried Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/mushroom-fried-rice.webp' },
      { name: 'Mushroom Schezwan Rice', cardPrice: 140, isVeg: true, image: '/menu/mmk/mushroom-schezwan-rice.webp' },
      { name: 'Mushroom Garlic Rice', cardPrice: 140, isVeg: true, image: '/menu/mmk/mushroom-garlic-rice.webp' },
      { name: 'Baby Corn Fried Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/baby-corn-fried-rice.webp' },
      { name: 'Mixed Veg Fried Rice', cardPrice: 120, isVeg: true, image: '/menu/mmk/mixed-veg-fried-rice-photo.webp' },
      { name: 'Triple Schezwan Rice', cardPrice: 150, isVeg: true, image: '/menu/mmk/triple-schezwan-rice.webp' },
    ],
  },
  {
    title: 'Veg Noodles',
    items: [
      { name: 'Veg Noodles', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-noodles-photo.webp' },
      { name: 'Veg Schezwan Noodles', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-schezwan-noodles-photo.webp' },
      { name: 'Paneer Noodles', cardPrice: 140, isVeg: true, image: '/menu/mmk/paneer-noodles-photo.webp' },
      { name: 'Paneer Schezwan Noodles', cardPrice: 120, isVeg: true, image: '/menu/mmk/paneer-schezwan-noodles-photo.webp' },
      { name: 'Mushroom Noodles', cardPrice: 130, isVeg: true, image: '/menu/mmk/mushroom-noodles-photo.webp' },
      { name: 'Mushroom Schezwan Noodles', cardPrice: 140, isVeg: true, image: '/menu/mmk/mushroom-schezwan-noodles-photo.webp' },
    ],
  },
  {
    title: 'Non Veg Fried Rice',
    items: [
      { name: 'Egg Fried Rice', cardPrice: 80, isVeg: false, image: '/menu/mmk/egg-fried-rice-photo.webp' },
      { name: 'Chicken Fried Rice', cardPrice: 100, isVeg: false, image: '/menu/mmk/chicken-fried-rice-photo.webp' },
      { name: 'Chicken Schezwan Fried Rice', cardPrice: 120, isVeg: false, image: '/menu/mmk/chicken-schezwan-fried-rice-photo.webp' },
      { name: 'Egg Schezwan Fried Rice', cardPrice: 100, isVeg: false, image: '/menu/mmk/egg-schezwan-fried-rice-photo.webp' },
      { name: 'Egg Fried Rice with Noodles', cardPrice: 120, isVeg: false, image: '/menu/mmk/egg-fried-rice-with-noodles.webp' },
      { name: 'Non Veg Mix Fried Rice', cardPrice: 150, isVeg: false, image: '/menu/mmk/non-veg-mix-fried-rice-photo.webp' },
    ],
  },
  {
    title: 'Non Veg Noodles',
    items: [
      { name: 'Egg Noodles', cardPrice: 80, isVeg: false, image: '/menu/mmk/egg-noodles-photo.webp' },
      { name: 'Egg Schezwan Noodles', cardPrice: 100, isVeg: false, image: '/menu/mmk/egg-schezwan-noodles-photo.webp' },
      { name: 'Chicken Noodles', cardPrice: 120, isVeg: false, image: '/menu/mmk/chicken-noodles-photo.webp' },
      { name: 'Chicken Schezwan Noodles', cardPrice: 120, isVeg: false, image: '/menu/mmk/chicken-schezwan-noodles-photo.webp' },
      { name: 'Chicken Garlic Noodles', cardPrice: 100, isVeg: false, image: '/menu/mmk/chicken-garlic-noodles-photo.webp' },
    ],
  },
  {
    title: 'Chinese Special',
    items: [
      { name: 'Paneer Crispy', cardPrice: 120, isVeg: true, image: '/menu/mmk/paneer-crispy-photo.webp' },
      { name: 'Veg Crispy', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-crispy-photo.webp' },
      { name: 'Chicken Chilli', cardPrice: 120, isVeg: false, image: '/menu/mmk/chicken-chilli-photo.webp' },
      { name: 'Gobi Manchurian', cardPrice: 100, isVeg: true, image: '/menu/mmk/gobi-manchurian-photo.webp' },
      { name: 'Veg Manchurian', cardPrice: 100, isVeg: true, image: '/menu/mmk/veg-manchurian-photo.webp' },
      // Rs 130 full / Rs 80 half, agreed separately from the half-price formula.
      { name: 'Chicken Kebab', cardPrice: 120, isVeg: false, image: '/menu/mmk/chicken-kebab-photo.webp', half: { price: 80 } },
    ],
  },
  {
    title: 'Rice Special',
    items: [
      { name: 'Veg Tripura Rice', cardPrice: 150, isVeg: true, image: '/menu/mmk/veg-tripura-rice-photo.webp' },
      { name: 'Chicken Tripura Rice', cardPrice: 180, isVeg: false, image: '/menu/mmk/chicken-tripura-rice-photo.webp' },
    ],
  },
];

export interface MomsMagicKitchenMenuItem {
  name: string;
  price: number;
  isVeg: boolean;
  image?: string;
  portion: 'Full' | 'Half';
}

export type MomsMagicKitchenMenu = Array<{ title: string; items: MomsMagicKitchenMenuItem[] }>;

/** Half portion price: half the full selling price, plus Rs 20. */
export const MOMS_MAGIC_KITCHEN_HALF_PRICE = (fullPrice: number) => Math.round(fullPrice / 2) + 20;

/** Cart / catalog id of a dish, e.g. "Veg Noodles (Half)" -> "mmk-veg-noodles-half-". */
export const mmkItemId = (name: string) => `mmk-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/**
 * The menu at selling prices (card price + Rs 10).
 *
 * Half portions: with `withHalves`, every full dish is followed by its half,
 * priced by HALF_PRICE unless the dish sets its own `half` terms. They are
 * derived from the full dishes every time rather than stored, so switching
 * them on again (or building twice) can never create duplicates, and a half
 * whose id would clash with a dish already listed is skipped.
 *
 * Whether customers get halves is the admin switch `mmkHalfPortions` in
 * system/settings (off by default); the server refuses half portions while
 * it is off. Full dishes keep their names, ids and prices either way.
 */
export function buildMomsMagicKitchenMenu(withHalves: boolean): MomsMagicKitchenMenu {
  const taken = new Set(CARD.flatMap((c) => c.items.map((i) => mmkItemId(i.name))));
  return CARD.map((c) => ({
    title: c.title,
    items: c.items.flatMap((i): MomsMagicKitchenMenuItem[] => {
      const price = i.cardPrice + MOMS_MAGIC_KITCHEN_MARKUP;
      const full: MomsMagicKitchenMenuItem = { name: i.name, price, isVeg: i.isVeg, image: i.image, portion: 'Full' };
      if (!withHalves) return [full];
      const half: MomsMagicKitchenMenuItem = {
        name: i.half?.name ?? `${i.name} (Half)`,
        price: i.half?.price ?? MOMS_MAGIC_KITCHEN_HALF_PRICE(price),
        isVeg: i.isVeg,
        image: i.half?.image ?? i.image,
        portion: 'Half',
      };
      const id = mmkItemId(half.name);
      if (taken.has(id)) return [full];
      taken.add(id);
      return [full, half];
    }),
  }));
}

/** Full portions only: what customers see while half portions are off. */
export const MOMS_MAGIC_KITCHEN_MENU = buildMomsMagicKitchenMenu(false);

/** Full portions each followed by its half: shown while half portions are on. */
export const MOMS_MAGIC_KITCHEN_MENU_WITH_HALVES = buildMomsMagicKitchenMenu(true);

const HALF_IDS = new Set(
  MOMS_MAGIC_KITCHEN_MENU_WITH_HALVES.flatMap((c) => c.items.filter((i) => i.portion === 'Half').map((i) => mmkItemId(i.name)))
);

/** A cart line that is a Moms Magic Kitchen half portion. */
export const isMmkHalfItem = (item: { id?: string | null } | null | undefined) => !!item?.id && HALF_IDS.has(item.id);
