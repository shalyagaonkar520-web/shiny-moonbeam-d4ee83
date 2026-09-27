// Shared Firebase Admin setup for the Vercel functions. The leading underscore
// keeps Vercel from exposing this file as an endpoint.
//
// Uses the modular entry points. With firebase-admin v12+ loaded as an ES
// module, the default export has no `apps`, `credential`, `firestore()` or
// `messaging()`, so the old `import admin from 'firebase-admin'` pattern threw
// on `admin.apps.length` and every function silently ran without Firebase.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'momsmagic-d131a';

let app = null;
try {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (getApps().length) {
    app = getApps()[0];
  } else if (clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId: PROJECT_ID,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    console.warn('Firebase Admin: FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are not set.');
  }
} catch (error) {
  console.error('Firebase Admin init failed:', error);
}

/** Firestore with admin rights, or null when credentials are not configured. */
export const adminDb = app ? getFirestore(app) : null;
/** Cloud Messaging, or null when credentials are not configured. */
export const adminMessaging = app ? getMessaging(app) : null;
