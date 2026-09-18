import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

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
