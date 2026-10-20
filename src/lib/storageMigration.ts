// Moves every `moms_magic_*` / `moms-magic-*` browser-storage key to its
// `mintoo_*` / `mintoo-*` name, once, on the first load after the rename.
//
// Without this the rename would read as data loss to every existing customer:
// the app would start looking up keys that have never been written, so carts,
// saved addresses, phone numbers, saved orders and admin sessions would all
// appear to have vanished. The values are copied rather than moved, so a
// customer who somehow loads an older build still finds their data where it
// was.
//
// This must run before any store reads storage. It is imported first in
// main.tsx, and ES modules evaluate in import order, so it completes before
// the Zustand stores initialise.

const PREFIXES: Array<[string, string]> = [
  ['moms_magic_', 'mintoo_'],
  ['moms-magic-', 'mintoo-'],
];

/** Exact keys that carry no prefix of their own. */
const EXACT: Array<[string, string]> = [['moms_magic', 'mintoo']];

function migrateStore(store: Storage): number {
  let moved = 0;

  // Snapshot the names first: writing while iterating Storage is undefined
  // behaviour in some browsers.
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key) keys.push(key);
  }

  for (const key of keys) {
    let renamed: string | null = null;

    for (const [from, to] of PREFIXES) {
      if (key.startsWith(from)) {
        renamed = to + key.slice(from.length);
        break;
      }
    }
    if (!renamed) {
      const exact = EXACT.find(([from]) => from === key);
      if (exact) renamed = exact[1];
    }
    if (!renamed) continue;

    // Never overwrite: a newer value under the new name always wins, which
    // also makes running this twice harmless.
    if (store.getItem(renamed) !== null) continue;

    const value = store.getItem(key);
    if (value === null) continue;
    try {
      store.setItem(renamed, value);
      moved++;
    } catch {
      // Quota or a private-browsing mode. The app still works; this customer
      // just starts fresh.
    }
  }

  return moved;
}

export function migrateLegacyStorage(): void {
  for (const store of [localStorage, sessionStorage]) {
    try {
      migrateStore(store);
    } catch {
      // Storage blocked entirely. index.html has already swapped in an
      // in-memory stand-in, so there is nothing to carry over.
    }
  }
}

// Run on import, not from a call in main.tsx: `import` statements are hoisted
// and evaluated before any statement in the importing module, so a call there
// would happen only after the stores had already read storage. Importing this
// module first is what makes the ordering work.
migrateLegacyStorage();
