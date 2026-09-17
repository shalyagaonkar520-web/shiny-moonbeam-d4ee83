// Import and configure the Firebase SDK inside the service worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the Firebase config
// Note: If you change your Firebase project, please update these values accordingly.
firebase.initializeApp({
  apiKey: "AIzaSyDANM1MKe-aedlobMfOJFosQE4KP9sXDxc",
  authDomain: "momsmagic-d131a.firebaseapp.com",
  projectId: "momsmagic-d131a",
  storageBucket: "momsmagic-d131a.firebasestorage.app",
  messagingSenderId: "202524346441",
  appId: "1:202524346441:web:8e466c09c73e06fc9a9798",
  measurementId: "G-FYRRLX5ZP4"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Mom\'s Magic';
  
  // Resolve image from either standard notification or custom data payloads
  const imageUrl = payload.notification?.image || payload.notification?.imageUrl || payload.data?.image || payload.data?.imageUrl || payload.data?.image_url;
  
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    image: imageUrl || undefined,
    data: {
      url: payload.data?.url || payload.data?.click_action || '/'
    },
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events (focus existing window client or open deep-link URL)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Retrieve deep-link URL from payload metadata (defaults to root page)
  const deepLinkUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If a window client is already open matching target URL, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === deepLinkUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 2. Otherwise open a new tab/window targeting deepLinkUrl
      if (clients.openWindow) {
        return clients.openWindow(deepLinkUrl);
      }
    })
  );
});
