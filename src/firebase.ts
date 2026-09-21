import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import { firebaseConfig } from './firebaseConfig';

// Initialising Firebase must never be able to take the app down.
//
// `getAuth()` throws synchronously on a bad config (e.g. auth/invalid-api-key
// when an env var is missing), and a throw at module scope aborts the whole
// bundle: React never mounts and every visitor sees the loading screen for
// ever. Ordering, the menu and the hotel pages do not need Firebase to render,
// so a failure here degrades those features instead of blanking the site.
let _app: ReturnType<typeof initializeApp> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;
let _auth: ReturnType<typeof getAuth> | null = null;

export let firebaseReady = false;

try {
  _app = initializeApp(firebaseConfig);
  _db = getFirestore(_app);
  _auth = getAuth(_app);
  firebaseReady = true;
} catch (error) {
  console.error(
    'Firebase failed to initialise; the app will run without cloud sync.',
    error
  );
}

// Callers are written against the SDK types. Keeping the casts here means a
// failed init surfaces as a rejected Firebase call at the point of use, which
// each caller already handles, rather than as a crash during import.
export const app = _app as ReturnType<typeof initializeApp>;
export const db = _db as ReturnType<typeof getFirestore>;
export const auth = _auth as ReturnType<typeof getAuth>;

/**
 * Firebase Cloud Messaging is loaded lazily and defensively.
 *
 * This module used to run `getMessaging(app)` at import time. That call throws on
 * any browser without the Push API, which includes Safari on iOS unless the app is
 * installed to the home screen. A throw at module scope takes the whole bundle
 * down, so the app rendered a blank page on those devices instead of just losing
 * notifications. Loading it on demand also keeps firebase/messaging out of the
 * first paint.
 */
async function getMessagingIfSupported() {
  try {
    if (typeof window === 'undefined') return null;
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return null;

    const { getMessaging, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return null;
    return getMessaging(app);
  } catch (err) {
    console.warn('Push messaging is unavailable on this browser:', err);
    return null;
  }
}

/**
 * Requests browser notification permission, registers the service worker,
 * retrieves the FCM registration token, and saves it to Firestore.
 *
 * Safe to call anywhere: it resolves to null rather than throwing when the
 * browser cannot do push at all.
 */
export const requestForToken = async (): Promise<string | null> => {
  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission was not granted (status:', permission, ').');
      return null;
    }

    const { getToken } = await import('firebase/messaging');
    const registration = await navigator.serviceWorker.ready;

    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: 'BEGabbTzNBXMxN2aid3HvFe6ehKGSJnS7JrwVaE79ySe9HhgLQ6UkmdfZpumQzeMRC3lGq5pdTJzgSfOFshxRSI',
    });

    if (!currentToken) {
      console.warn('No registration token available.');
      return null;
    }

    // Save token to Firestore deviceTokens collection.
    // Using the token as the document ID prevents duplicate entries.
    await setDoc(
      doc(db, 'deviceTokens', currentToken),
      {
        token: currentToken,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
      { merge: true }
    );

    return currentToken;
  } catch (error) {
    console.error('An error occurred while getting the FCM token:', error);
    return null;
  }
};

/**
 * Subscribes to foreground push notification events.
 * Returns an unsubscribe function (a no-op where push is unsupported).
 */
export const onMessageListener = (callback: (payload: any) => void) => {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const messaging = await getMessagingIfSupported();
    if (!messaging || cancelled) return;
    const { onMessage } = await import('firebase/messaging');
    unsubscribe = onMessage(messaging, (payload) => callback(payload));
  })();

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
};
