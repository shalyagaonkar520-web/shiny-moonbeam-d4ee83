// Generates api/_catalog.json: the price of every dish a customer can add to
// the cart, keyed by the same id the cart uses. /api/place-order checks each
// order against it, so a price edited in the browser cannot reach the kitchen
// or Razorpay unnoticed.
//
// The menus live in TypeScript under src/data, so this bundles them with
// esbuild (already installed as part of Vite) instead of duplicating them.
// Runs before every build (npm "prebuild"); the output is committed too, so
// the serverless functions have it even if the build step is skipped.

import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const entry = `
import { MENU_ITEMS } from './src/data/menuItems';
import { PARTNER_HOTEL_PRODUCTS } from './src/data/partnerHotelItems';
import { HOTEL_AL_AMIN_MENU } from './src/data/hotelAlAminMenu';
import { ICE_CAKES, NORMAL_CAKES, PARTY_ITEMS, SNACKS } from './src/data/partyItems';

const out = {};
const add = (id, name, price, hotelId) => {
  if (!id || typeof price !== 'number') return;
  out[id] = { name, price, hotelId: hotelId || null };
};
MENU_ITEMS.forEach((p) => add(p.id, p.name, p.price, p.hotelId));
PARTNER_HOTEL_PRODUCTS.forEach((p) => add(p.id, p.name, p.price, p.hotelId));
HOTEL_AL_AMIN_MENU.forEach((c) => c.items.forEach((i) => add(i.id, i.name, i.price, 'al_amin')));
[...ICE_CAKES, ...NORMAL_CAKES, ...PARTY_ITEMS, ...SNACKS].forEach((p) => add(p.id, p.name, p.price, p.hotelId));
export default out;
`;

const dir = mkdtempSync(join(tmpdir(), 'catalog-'));
const outfile = join(dir, 'catalog.mjs');
try {
  await build({
    stdin: { contents: entry, resolveDir: root, loader: 'ts' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'warning',
    // Image imports and CSS are irrelevant to prices.
    loader: { '.png': 'empty', '.jpg': 'empty', '.jpeg': 'empty', '.webp': 'empty', '.svg': 'empty', '.css': 'empty' },
  });
  const { default: catalog } = await import(pathToFileURL(outfile).href);
  const count = Object.keys(catalog).length;
  if (count < 50) throw new Error(`catalog suspiciously small (${count} items)`);
  writeFileSync(join(root, 'api', '_catalog.json'), JSON.stringify(catalog) + '\n');
  console.log(`api/_catalog.json: ${count} items`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
