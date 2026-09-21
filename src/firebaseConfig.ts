// Firebase web config, with the real project values as defaults.
//
// These are NOT secrets. A Firebase web config is a public project identifier
// that every visitor's browser has to receive in order to talk to Firebase at
// all; the identical values are already committed in public/firebase-messaging-sw.js,
// because a service worker cannot read Vite env vars. Access is controlled by
// Firestore/Storage security rules and by API-key restrictions in the Google
// Cloud console, never by hiding this object.
//
// They live in code rather than only in env vars because when the config was
// env-only, a deploy whose environment was missing VITE_FIREBASE_API_KEY built
// `apiKey: undefined`. getAuth() then threw "auth/invalid-api-key" at module
// scope and the whole app stopped at the loading screen -- the site was down
// until someone noticed the hosting dashboard was out of sync. Env vars still
// win when set, so pointing a deploy at a different Firebase project needs no
// code change.

const fromEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const defaults = {
  apiKey: 'AIzaSyDANM1MKe-aedlobMfOJFosQE4KP9sXDxc',
  authDomain: 'momsmagic-d131a.firebaseapp.com',
  projectId: 'momsmagic-d131a',
  storageBucket: 'momsmagic-d131a.firebasestorage.app',
  messagingSenderId: '202524346441',
  appId: '1:202524346441:web:8e466c09c73e06fc9a9798',
  measurementId: 'G-FYRRLX5ZP4',
};

/** Env value if it is a non-empty string, otherwise the committed default. */
function pick(key: keyof typeof defaults): string {
  const value = fromEnv[key];
  return typeof value === 'string' && value.trim() !== '' ? value : defaults[key];
}

export const firebaseConfig = {
  apiKey: pick('apiKey'),
  authDomain: pick('authDomain'),
  projectId: pick('projectId'),
  storageBucket: pick('storageBucket'),
  messagingSenderId: pick('messagingSenderId'),
  appId: pick('appId'),
  measurementId: pick('measurementId'),
};
