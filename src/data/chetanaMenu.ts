// Chetana Masalapuri Center - chaats and snacks, Yellapur (Mob: 9116062898).
// From the shop's printed board, whose prices are hand-written on it. Every
// price a customer pays is the board price plus Rs 10 (the board price is kept
// next to it so the margin stays visible).
//
// Read off the board on 11 Nov 2026:
//  - "Masala Samosa 20/30" has two prices and no labels. They are listed here
//    as Regular (board 20) and Large (board 30): CONFIRM WITH THE SHOP what
//    the two sizes really are and rename them.
//  - "1 bhel samosa => 60" is written by hand under the printed list. The
//    owner chose to leave it out, so it is NOT on the menu.
//  - "Veg Manchrian" and "Shev Puri" are spelled as the usual "Manchurian" and
//    "Sev" so customers can find them by search.

export const CHETANA_HOTEL_ID = 'chetana-masalapuri-center';
export const CHETANA_HOTEL_NAME = 'Chetana Masalapuri Center';
/** The home page category all of these appear under (and its first tab). */
export const CHATS_CATEGORY = 'Chats';
export const CHETANA_MARKUP = 10;

export interface ChetanaItem {
  name: string;
  /** Price written on the board; the selling price adds CHETANA_MARKUP. */
  cardPrice: number;
  image: string;
}

const CARD: ChetanaItem[] = [
  { name: 'Bhel Puri', cardPrice: 40, image: '/menu/chetana/bhel-puri.webp' },
  { name: 'Pani Puri', cardPrice: 30, image: '/menu/chetana/pani-puri.webp' },
  { name: 'Sev Puri', cardPrice: 40, image: '/menu/chetana/sev-puri.webp' },
  { name: 'Masala Puri', cardPrice: 40, image: '/menu/chetana/masala-puri.webp' },
  { name: 'Dahi Puri', cardPrice: 40, image: '/menu/chetana/dahi-puri.webp' },
  { name: 'Sukka Puri', cardPrice: 40, image: '/menu/chetana/sukka-puri.webp' },
  { name: 'Veg Manchurian', cardPrice: 40, image: '/menu/chetana/veg-manchurian.webp' },
  { name: 'Masala Samosa (Regular)', cardPrice: 20, image: '/menu/chetana/masala-samosa.webp' },
  { name: 'Masala Samosa (Large)', cardPrice: 30, image: '/menu/chetana/masala-samosa.webp' },
];

export interface ChetanaMenuItem extends ChetanaItem {
  /** What the customer pays. */
  price: number;
}

/** The menu at selling prices (board price + Rs 10). */
export const CHETANA_MENU: ChetanaMenuItem[] = CARD.map((i) => ({ ...i, price: i.cardPrice + CHETANA_MARKUP }));
