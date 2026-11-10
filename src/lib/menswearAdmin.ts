import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { app, db } from '../firebase';
import { MENSWEAR_SHOP_ID, MenswearProduct } from '../data/mensWear';
import { productDocId, sizeDocId, sizeLineName } from '../store/menswearStore';
import { slugifyDish } from './dishAvailability';

/**
 * Writes for the men's wear admin page. Every write goes to the panel's
 * `menuItems` collection and is checked by the panel's security rules: the
 * signed-in account must be the HOTEL_ADMIN bound to this shop (or a super
 * admin). Creating a document also needs the shop's "Edit dishes" permission,
 * and changing a price needs "Change prices"; both are switched on in the
 * panel under Restaurants.
 *
 * Writes always carry hotelId and name unchanged, so for an existing document
 * the only fields that differ are the ones being changed, which is what the
 * rules allow a hotel admin to touch.
 */

export interface AdminAccess {
  ok: boolean;
  reason?: string;
}

/** Is this signed-in user allowed to manage the men's wear shop? */
export async function checkMenswearAdmin(uid: string): Promise<AdminAccess> {
  const snap = await getDoc(doc(db, 'users', uid));
  const u: any = snap.exists() ? snap.data() : null;
  if (!u) return { ok: false, reason: 'This account has no staff record.' };
  if (u.active === false) return { ok: false, reason: 'This account has been switched off in the panel.' };
  const role = String(u.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN') return { ok: true };
  if (role === 'HOTEL_ADMIN' && u.hotelId === MENSWEAR_SHOP_ID) return { ok: true };
  return { ok: false, reason: "This account is not the Mintoo Men's Wear admin." };
}

const base = (name: string) => ({ hotelId: MENSWEAR_SHOP_ID, name, updatedAt: serverTimestamp() });

export function setSizeSoldOut(product: MenswearProduct, size: string, soldOut: boolean) {
  return setDoc(doc(db, 'menuItems', sizeDocId(product.name, size)), { ...base(sizeLineName(product.name, size)), soldOut }, { merge: true });
}

export function setProductHidden(product: MenswearProduct, hidden: boolean) {
  return setDoc(doc(db, 'menuItems', productDocId(product.name)), { ...base(product.name), available: !hidden }, { merge: true });
}

export function setProductPrice(product: MenswearProduct, price: number) {
  return setDoc(
    doc(db, 'menuItems', productDocId(product.name)),
    { ...base(product.name), price, priceUpdatedAt: serverTimestamp() },
    { merge: true }
  );
}

export function setShopAcceptingOrders(acceptingOrders: boolean) {
  return updateDoc(doc(db, 'hotels', MENSWEAR_SHOP_ID), { acceptingOrders, updatedAt: serverTimestamp() });
}

/** A URL-safe slug not already used by another product. */
export function uniqueSlug(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugifyDish(name) || 'item';
  let slug = root;
  for (let n = 2; used.has(slug); n += 1) slug = `${root}-${n}`;
  return slug;
}

/** Shrinks a photo to at most 1200px on the long side and re-encodes it as WebP. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that photo'))), 'image/webp', 0.82)
  );
}

/** Uploads one product photo to the shop's own folder in Firebase Storage. */
export async function uploadProductPhoto(slug: string, file: File, index: number): Promise<string> {
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const blob = await compress(file);
  const r = ref(getStorage(app), `menu/${MENSWEAR_SHOP_ID}/${slug}-${Date.now()}-${index}.webp`);
  await uploadBytes(r, blob, { contentType: 'image/webp' });
  return getDownloadURL(r);
}

export interface NewProduct {
  name: string;
  category: string;
  price: number;
  sizes: string[];
  photos: string[];
}

export function addProduct(slug: string, p: NewProduct) {
  return setDoc(doc(db, 'menuItems', productDocId(p.name)), {
    ...base(p.name),
    price: p.price,
    category: p.category,
    image: p.photos[0],
    photos: p.photos,
    description: `Mintoo Men's Wear ${p.name}`,
    available: true,
    soldOut: false,
    menswear: { slug, sizes: p.sizes },
    createdAt: serverTimestamp(),
  });
}

/** Turns a Firebase error into something the shop owner can act on. */
export function friendlyError(err: any): string {
  const code = String(err?.code || '');
  if (code.includes('permission-denied') || code.includes('unauthorized')) {
    return 'Not allowed. In the panel, open Restaurants > Mintoo Men\'s Wear and switch on "Edit dishes" and "Change prices".';
  }
  if (code.includes('resource-exhausted')) return 'The database is over its daily limit. Try again later.';
  if (code.includes('unavailable') || code.includes('network')) return 'No connection. Check the internet and try again.';
  return err?.message || 'Something went wrong. Try again.';
}
