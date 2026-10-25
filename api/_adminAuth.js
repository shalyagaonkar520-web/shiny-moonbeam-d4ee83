// firebase-admin/auth, loaded on first use instead of at import time.
//
// (The original failure turned out to be firebase-admin 14 -> jwks-rsa 4 ->
// ESM-only jose 6, which Vercel could not require(); firebase-admin is now on
// 13. Loading lazily stays as a guard so an optional feature can never again
// stop the endpoint from loading.)
//
// place-order and admin-login used to import it at the top of the file. On
// Vercel that import failed, and because it ran while the function was
// loading, every request to those two endpoints died with
// FUNCTION_INVOCATION_FAILED -- a GET that should have been a 405 included.
// Admin login stopped working and the server checkout path went dark.
//
// Both callers only need auth for something optional: place-order to link an
// order to a signed-in customer (it already treats a failure as a guest
// order), admin-login to mint a Firebase admin session (it already returns
// null when that fails). Loading it lazily inside a try keeps a broken auth
// module from taking the whole endpoint down with it.

let loaded = null;

/**
 * Resolves to `{ getAuth, error }`. `getAuth` is null when the module could
 * not be loaded; `error` then says why, and the reason is logged once.
 */
export function loadAdminAuth() {
  if (!loaded) {
    loaded = import('firebase-admin/auth')
      .then((mod) => ({ getAuth: mod.getAuth, error: null }))
      .catch((error) => {
        console.error('firebase-admin/auth could not be loaded:', error);
        return { getAuth: null, error: String(error?.message || error).slice(0, 300) };
      });
  }
  return loaded;
}
