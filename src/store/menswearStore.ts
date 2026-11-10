import { useCallback, useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { menuItemId } from '../lib/dishAvailability';
import {
  MENSWEAR_CATEGORIES,
  MENSWEAR_PRODUCTS,
  MENSWEAR_SHOP_ID,
  MenswearCategory,
  MenswearProduct,
} from '../data/mensWear';

/**
 * Live changes to the men's wear catalogue, made on /admin/menswear.
 *
 * The bundled list in src/data/mensWear.ts is the base. The admin's changes
 * live in the panel's `menuItems` collection under this shop's hotelId, in
 * the panel's own id scheme (`<hotelId>__<slug of name>`):
 *
 *  - "<Product> (Size L)" with soldOut: true   -> that size is sold out
 *  - "<Product>" with available: false         -> product hidden
 *  - "<Product>" with price                    -> price changed
 *  - "<Product>" with a `menswear` field       -> a product added by the admin
 *
 * Only docs the admin has touched exist, so a shop visit reads a handful of
 * documents rather than one per product and size. Until the first snapshot
 * arrives (or if Firestore is unreachable) the bundled list shows as-is.
 */

interface MenswearStore {
  docs: Record<string, any>;
  loaded: boolean;
  error: string | null;
  subscribe: () => () => void;
}

let listeners = 0;
let stop: (() => void) | null = null;

export const useMenswearStore = create<MenswearStore>((set) => ({
  docs: {},
  loaded: false,
  error: null,
  subscribe: () => {
    if (!firebaseReady) return () => {};
    listeners += 1;
    if (!stop) {
      stop = onSnapshot(
        query(collection(db, 'menuItems'), where('hotelId', '==', MENSWEAR_SHOP_ID)),
        (snap) => {
          const docs: Record<string, any> = {};
          snap.forEach((d) => {
            docs[d.id] = d.data();
          });
          set({ docs, loaded: true, error: null });
        },
        (err) => {
          console.error("Men's wear listener error:", err);
          set({ loaded: true, error: err?.message || 'Could not load changes' });
        }
      );
    }
    return () => {
      listeners -= 1;
      if (listeners <= 0 && stop) {
        stop();
        stop = null;
        listeners = 0;
      }
    };
  },
}));

export const productDocId = (name: string) => menuItemId(MENSWEAR_SHOP_ID, name);
export const sizeLineName = (productName: string, size: string) => `${productName} (Size ${size})`;
export const sizeDocId = (productName: string, size: string) => productDocId(sizeLineName(productName, size));

function addedProduct(d: any): MenswearProduct | null {
  const m = d?.menswear;
  if (!m || typeof m.slug !== 'string' || typeof d.name !== 'string' || typeof d.price !== 'number') return null;
  const images: string[] = Array.isArray(d.photos) && d.photos.length ? d.photos : d.image ? [d.image] : [];
  if (!images.length) return null;
  const category = (MENSWEAR_CATEGORIES as readonly string[]).includes(d.category) ? (d.category as MenswearCategory) : 'Casual Shirts';
  const sizes = Array.isArray(m.sizes) && m.sizes.length ? m.sizes.map(String) : ['S', 'M', 'L', 'XL', 'XXL'];
  return { slug: m.slug, name: d.name, category, images, price: d.price, sizes, added: true, hidden: d.available === false };
}

/**
 * The catalogue as customers should see it right now (or, with
 * `includeHidden`, as the admin manages it), plus a sold-out check per size.
 */
export function useMenswearCatalog(includeHidden = false) {
  const docs = useMenswearStore((s) => s.docs);
  const loaded = useMenswearStore((s) => s.loaded);
  const error = useMenswearStore((s) => s.error);
  const subscribe = useMenswearStore((s) => s.subscribe);
  useEffect(() => subscribe(), [subscribe]);

  const products = useMemo(() => {
    const builtIn = MENSWEAR_PRODUCTS.map((p): MenswearProduct => {
      const d = docs[productDocId(p.name)];
      return {
        ...p,
        price: typeof d?.price === 'number' && d.price > 0 ? d.price : p.price,
        hidden: d?.available === false,
      };
    });
    const builtInSlugs = new Set(builtIn.map((p) => p.slug));
    const added = Object.values(docs)
      .map(addedProduct)
      .filter((p): p is MenswearProduct => !!p && !builtInSlugs.has(p.slug));
    const all = [...added, ...builtIn];
    return includeHidden ? all : all.filter((p) => !p.hidden);
  }, [docs, includeHidden]);

  const isSoldOut = useCallback(
    (product: MenswearProduct, size: string) => docs[sizeDocId(product.name, size)]?.soldOut === true,
    [docs]
  );
  const allSoldOut = useCallback(
    (product: MenswearProduct) => product.sizes.length > 0 && product.sizes.every((s) => isSoldOut(product, s)),
    [isSoldOut]
  );
  const find = useCallback((slug: string | undefined) => products.find((p) => p.slug === slug), [products]);
  const minPrice = useMemo(() => (products.length ? Math.min(...products.map((p) => p.price)) : 0), [products]);

  return { products, isSoldOut, allSoldOut, find, minPrice, loaded, error };
}
