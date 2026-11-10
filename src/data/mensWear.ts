// Mintoo Men's Wear: the clothing shop, Yellapur only.
//
// Photos are the shop's own (public/menswear/, cover first). Each product is
// one colour; its other photos are the back or a close-up of the same piece.
//
// PRICES ARE PROVISIONAL. The shop's banner says "starts from Rs 199" but no
// per-item prices were given, so each category has one price below. Change a
// category here, or give a product its own `price`, and rebuild.

export const MENSWEAR_SHOP_ID = 'mintoo_menswear';
export const MENSWEAR_SHOP_NAME = "Mintoo Men's Wear";
export const MENSWEAR_BANNER = '/menswear/banner-opening-soon.webp';
/** Item ids start with this, which is how an order line is traced to the shop. */
export const MENSWEAR_ID_PREFIX = 'mw-';

export const MENSWEAR_CATEGORIES = [
  'T-Shirts & Polos',
  'Casual Shirts',
  'Formal Shirts',
  'Hoodies & Sweatshirts',
  'Jeans & Cargos',
  'Trousers',
  'Jackets',
  'Jerseys',
] as const;
export type MenswearCategory = (typeof MENSWEAR_CATEGORIES)[number];

export const CATEGORY_PRICE: Record<MenswearCategory, number> = {
  'Jerseys': 199,
  'T-Shirts & Polos': 399,
  'Casual Shirts': 449,
  'Formal Shirts': 499,
  'Hoodies & Sweatshirts': 599,
  'Trousers': 599,
  'Jeans & Cargos': 699,
  'Jackets': 999,
};

export const MENSWEAR_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type MenswearSize = (typeof MENSWEAR_SIZES)[number];

interface ProductRow {
  slug: string;
  name: string;
  category: MenswearCategory;
  images: string[];
  /** Overrides the category price for this one product. */
  price?: number;
}

export interface MenswearProduct extends ProductRow {
  price: number;
}

const ROWS: ProductRow[] = [
  { slug: 'grey-check-formal-shirt', name: "Grey Check Formal Shirt", category: 'Formal Shirts', images: ['/menswear/grey-check-formal-shirt-1.webp'] },
  { slug: 'peach-formal-shirt', name: "Peach Formal Shirt", category: 'Formal Shirts', images: ['/menswear/peach-formal-shirt-1.webp'] },
  { slug: 'pink-formal-shirt', name: "Pink Formal Shirt", category: 'Formal Shirts', images: ['/menswear/pink-formal-shirt-1.webp'] },
  { slug: 'cream-formal-shirt', name: "Cream Formal Shirt", category: 'Formal Shirts', images: ['/menswear/cream-formal-shirt-1.webp'] },
  { slug: 'grey-textured-formal-shirt', name: "Grey Textured Formal Shirt", category: 'Formal Shirts', images: ['/menswear/grey-textured-formal-shirt-1.webp'] },
  { slug: 'beige-formal-shirt', name: "Beige Formal Shirt", category: 'Formal Shirts', images: ['/menswear/beige-formal-shirt-1.webp'] },
  { slug: 'black-puffer-jacket', name: "Black Puffer Jacket", category: 'Jackets', images: ['/menswear/black-puffer-jacket-1.webp', '/menswear/black-puffer-jacket-2.webp', '/menswear/black-puffer-jacket-3.webp'] },
  { slug: 'white-zip-jacket', name: "White Zip Jacket", category: 'Jackets', images: ['/menswear/white-zip-jacket-1.webp', '/menswear/white-zip-jacket-2.webp'] },
  { slug: 'navy-formal-trousers', name: "Navy Formal Trousers", category: 'Trousers', images: ['/menswear/navy-formal-trousers-1.webp'] },
  { slug: 'beige-formal-trousers', name: "Beige Formal Trousers", category: 'Trousers', images: ['/menswear/beige-formal-trousers-1.webp'] },
  { slug: 'grey-formal-trousers', name: "Grey Formal Trousers", category: 'Trousers', images: ['/menswear/grey-formal-trousers-1.webp'] },
  { slug: 'light-grey-formal-trousers', name: "Light Grey Formal Trousers", category: 'Trousers', images: ['/menswear/light-grey-formal-trousers-1.webp'] },
  { slug: 'black-formal-trousers', name: "Black Formal Trousers", category: 'Trousers', images: ['/menswear/black-formal-trousers-1.webp'] },
  { slug: 'light-grey-cargo-jeans', name: "Light Grey Cargo Jeans", category: 'Jeans & Cargos', images: ['/menswear/light-grey-cargo-jeans-1.webp'] },
  { slug: 'grey-acid-wash-jeans', name: "Grey Acid Wash Jeans", category: 'Jeans & Cargos', images: ['/menswear/grey-acid-wash-jeans-1.webp'] },
  { slug: 'light-grey-jeans', name: "Light Grey Jeans", category: 'Jeans & Cargos', images: ['/menswear/light-grey-jeans-1.webp'] },
  { slug: 'black-faded-jeans', name: "Black Faded Jeans", category: 'Jeans & Cargos', images: ['/menswear/black-faded-jeans-1.webp', '/menswear/black-faded-jeans-2.webp'] },
  { slug: 'grey-acid-wash-cargo-jeans', name: "Grey Acid Wash Cargo Jeans", category: 'Jeans & Cargos', images: ['/menswear/grey-acid-wash-cargo-jeans-1.webp'] },
  { slug: 'maroon-jeans', name: "Maroon Jeans", category: 'Jeans & Cargos', images: ['/menswear/maroon-jeans-1.webp'] },
  { slug: 'grey-jeans', name: "Grey Jeans", category: 'Jeans & Cargos', images: ['/menswear/grey-jeans-1.webp'] },
  { slug: 'grey-cargo-jeans', name: "Grey Cargo Jeans", category: 'Jeans & Cargos', images: ['/menswear/grey-cargo-jeans-1.webp'] },
  { slug: 'light-blue-jeans', name: "Light Blue Jeans", category: 'Jeans & Cargos', images: ['/menswear/light-blue-jeans-1.webp'] },
  { slug: 'olive-cargo-pants', name: "Olive Cargo Pants", category: 'Jeans & Cargos', images: ['/menswear/olive-cargo-pants-1.webp'] },
  { slug: 'beige-cargo-pants', name: "Beige Cargo Pants", category: 'Jeans & Cargos', images: ['/menswear/beige-cargo-pants-1.webp'] },
  { slug: 'cream-jeans', name: "Cream Jeans", category: 'Jeans & Cargos', images: ['/menswear/cream-jeans-1.webp', '/menswear/cream-jeans-2.webp'] },
  { slug: 'blue-faded-jeans', name: "Blue Faded Jeans", category: 'Jeans & Cargos', images: ['/menswear/blue-faded-jeans-1.webp'] },
  { slug: 'mid-blue-faded-jeans', name: "Mid Blue Faded Jeans", category: 'Jeans & Cargos', images: ['/menswear/mid-blue-faded-jeans-1.webp'] },
  { slug: 'blue-jeans', name: "Blue Jeans", category: 'Jeans & Cargos', images: ['/menswear/blue-jeans-1.webp'] },
  { slug: 'dark-blue-faded-jeans', name: "Dark Blue Faded Jeans", category: 'Jeans & Cargos', images: ['/menswear/dark-blue-faded-jeans-1.webp'] },
  { slug: 'black-printed-jeans', name: "Black Printed Jeans", category: 'Jeans & Cargos', images: ['/menswear/black-printed-jeans-1.webp'] },
  { slug: 'blue-check-printed-shirt', name: "Blue Check Printed Shirt", category: 'Casual Shirts', images: ['/menswear/blue-check-printed-shirt-1.webp', '/menswear/blue-check-printed-shirt-2.webp'] },
  { slug: 'blue-check-shirt', name: "Blue Check Shirt", category: 'Casual Shirts', images: ['/menswear/blue-check-shirt-1.webp'] },
  { slug: 'red-check-printed-shirt', name: "Red Check Printed Shirt", category: 'Casual Shirts', images: ['/menswear/red-check-printed-shirt-1.webp'] },
  { slug: 'black-check-shirt', name: "Black Check Shirt", category: 'Casual Shirts', images: ['/menswear/black-check-shirt-1.webp'] },
  { slug: 'red-check-shirt', name: "Red Check Shirt", category: 'Casual Shirts', images: ['/menswear/red-check-shirt-1.webp'] },
  { slug: 'grey-graphic-hoodie', name: "Grey Graphic Hoodie", category: 'Hoodies & Sweatshirts', images: ['/menswear/grey-graphic-hoodie-1.webp', '/menswear/grey-graphic-hoodie-2.webp', '/menswear/grey-graphic-hoodie-3.webp', '/menswear/grey-graphic-hoodie-4.webp'] },
  { slug: 'navy-graphic-hoodie', name: "Navy Graphic Hoodie", category: 'Hoodies & Sweatshirts', images: ['/menswear/navy-graphic-hoodie-1.webp', '/menswear/navy-graphic-hoodie-2.webp', '/menswear/navy-graphic-hoodie-3.webp'] },
  { slug: 'brown-graphic-hoodie', name: "Brown Graphic Hoodie", category: 'Hoodies & Sweatshirts', images: ['/menswear/brown-graphic-hoodie-1.webp', '/menswear/brown-graphic-hoodie-2.webp', '/menswear/brown-graphic-hoodie-3.webp'] },
  { slug: 'olive-graphic-hoodie', name: "Olive Graphic Hoodie", category: 'Hoodies & Sweatshirts', images: ['/menswear/olive-graphic-hoodie-1.webp', '/menswear/olive-graphic-hoodie-2.webp', '/menswear/olive-graphic-hoodie-3.webp'] },
  { slug: 'maroon-graphic-hoodie', name: "Maroon Graphic Hoodie", category: 'Hoodies & Sweatshirts', images: ['/menswear/maroon-graphic-hoodie-1.webp'] },
  { slug: 'grey-collar-sweatshirt', name: "Grey Collar Sweatshirt", category: 'Hoodies & Sweatshirts', images: ['/menswear/grey-collar-sweatshirt-1.webp', '/menswear/grey-collar-sweatshirt-2.webp', '/menswear/grey-collar-sweatshirt-3.webp'] },
  { slug: 'olive-collar-sweatshirt', name: "Olive Collar Sweatshirt", category: 'Hoodies & Sweatshirts', images: ['/menswear/olive-collar-sweatshirt-1.webp', '/menswear/olive-collar-sweatshirt-2.webp'] },
  { slug: 'green-03-varsity-shirt', name: "Green \"03\" Varsity Shirt", category: 'T-Shirts & Polos', images: ['/menswear/green-03-varsity-shirt-1.webp', '/menswear/green-03-varsity-shirt-2.webp', '/menswear/green-03-varsity-shirt-3.webp'] },
  { slug: 'red-03-varsity-shirt', name: "Red \"03\" Varsity Shirt", category: 'T-Shirts & Polos', images: ['/menswear/red-03-varsity-shirt-1.webp', '/menswear/red-03-varsity-shirt-2.webp', '/menswear/red-03-varsity-shirt-3.webp'] },
  { slug: 'blue-03-varsity-shirt', name: "Blue \"03\" Varsity Shirt", category: 'T-Shirts & Polos', images: ['/menswear/blue-03-varsity-shirt-1.webp', '/menswear/blue-03-varsity-shirt-2.webp', '/menswear/blue-03-varsity-shirt-3.webp'] },
  { slug: 'cream-03-varsity-shirt', name: "Cream \"03\" Varsity Shirt", category: 'T-Shirts & Polos', images: ['/menswear/cream-03-varsity-shirt-1.webp', '/menswear/cream-03-varsity-shirt-2.webp', '/menswear/cream-03-varsity-shirt-3.webp', '/menswear/cream-03-varsity-shirt-4.webp'] },
  { slug: 'black-03-varsity-shirt', name: "Black \"03\" Varsity Shirt", category: 'T-Shirts & Polos', images: ['/menswear/black-03-varsity-shirt-1.webp', '/menswear/black-03-varsity-shirt-2.webp', '/menswear/black-03-varsity-shirt-3.webp', '/menswear/black-03-varsity-shirt-4.webp'] },
  { slug: 'orange-zip-polo', name: "Orange Zip Polo", category: 'T-Shirts & Polos', images: ['/menswear/orange-zip-polo-1.webp', '/menswear/orange-zip-polo-2.webp', '/menswear/orange-zip-polo-3.webp', '/menswear/orange-zip-polo-4.webp'] },
  { slug: 'green-zip-polo', name: "Green Zip Polo", category: 'T-Shirts & Polos', images: ['/menswear/green-zip-polo-1.webp', '/menswear/green-zip-polo-2.webp', '/menswear/green-zip-polo-3.webp', '/menswear/green-zip-polo-4.webp', '/menswear/green-zip-polo-5.webp'] },
  { slug: 'red-acid-wash-zip-polo', name: "Red Acid Wash Zip Polo", category: 'T-Shirts & Polos', images: ['/menswear/red-acid-wash-zip-polo-1.webp', '/menswear/red-acid-wash-zip-polo-2.webp', '/menswear/red-acid-wash-zip-polo-3.webp', '/menswear/red-acid-wash-zip-polo-4.webp'] },
  { slug: 'black-miami-jersey', name: "Black Miami Jersey", category: 'Jerseys', images: ['/menswear/black-miami-jersey-1.webp', '/menswear/black-miami-jersey-2.webp'] },
  { slug: 'red-green-football-jersey', name: "Red Green Football Jersey", category: 'Jerseys', images: ['/menswear/red-green-football-jersey-1.webp'] },
  { slug: 'red-number-19-football-jersey', name: "Red No. 19 Football Jersey", category: 'Jerseys', images: ['/menswear/red-number-19-football-jersey-1.webp'] },
];

export const MENSWEAR_PRODUCTS: MenswearProduct[] = ROWS.map((r) => ({ ...r, price: r.price ?? CATEGORY_PRICE[r.category] }));

/** Cart id for one product in one size, e.g. `mw-blue-jeans-l`. */
export function menswearItemId(slug: string, size: MenswearSize): string {
  return `${MENSWEAR_ID_PREFIX}${slug}-${size.toLowerCase()}`;
}

export function findMenswearProduct(slug: string | undefined): MenswearProduct | undefined {
  return MENSWEAR_PRODUCTS.find((p) => p.slug === slug);
}
