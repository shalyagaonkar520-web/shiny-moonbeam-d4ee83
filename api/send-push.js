import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let initialized = false;
let db = null;
let messaging = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'momsmagic-d131a';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!admin.apps.length) {
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        })
      });
      initialized = true;
    } else {
      // Local dev mode fallback - try using application default credentials or mock
      console.warn("FCM credentials missing. Running send-push API in simulated local dev mode.");
    }
  } else {
    initialized = true;
  }

  if (admin.apps.length > 0) {
    db = admin.firestore();
    messaging = admin.messaging();
    initialized = true;
  }
} catch (error) {
  console.error("Firebase admin init error:", error);
}

// Shared admin check.
//
// This used to accept any Authorization header containing the literal
// 'mock-jwt-admin-token-123456', a string committed to a public repo -- so
// anyone who read the source could call this endpoint. It now compares against
// ADMIN_API_TOKEN from the environment and refuses every request when that is
// not set, rather than falling back to something guessable.
function isAuthorisedAdmin(authHeader) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return false;
  if (!authHeader || typeof authHeader !== 'string') return false;
  const supplied = authHeader.replace(/^Bearer\s+/i, '').trim();
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return require('crypto').timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers['authorization'];
  if (!isAuthorisedAdmin(authHeader)) {
    return res.status(401).json({ success: false, error: 'Unauthorized access' });
  }

  const { title, message, imageUrl, deepLink } = req.body;

  if (!title || !message) {
    return res.status(400).json({ success: false, error: 'Title and message are required' });
  }

  // 1. Local Development Simulation Fallback Mode
  if (!initialized || !db || !messaging) {
    console.log(`[Mock FCM Broadcast] Title: "${title}" Message: "${message}"`);
    // Return mock success with 5 simulated devices
    return res.status(200).json({
      success: true,
      successCount: 5,
      failureCount: 0,
      mode: 'mocked'
    });
  }

  // 2. Real Production FCM Multicast Send Mode
  try {
    const tokensSnapshot = await db.collection('deviceTokens').get();
    const tokens = [];
    tokensSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });

    if (tokens.length === 0) {
      return res.status(200).json({
        success: true,
        successCount: 0,
        failureCount: 0,
        message: 'No registered device tokens found in Firestore.'
      });
    }

    const payload = {
      notification: {
        title: title,
        body: message,
      },
      data: {
        url: deepLink || '/',
      }
    };

    if (imageUrl) {
      payload.notification.imageUrl = imageUrl;
      payload.data.image = imageUrl; // Support custom sw data extraction
    }

    // Send to all registered devices in batches of up to 500
    const chunks = [];
    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      chunks.push(tokens.slice(i, i + chunkSize));
    }

    let successCount = 0;
    let failureCount = 0;

    for (const chunk of chunks) {
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: payload.notification,
        data: payload.data
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      // Clean up invalid or unregistered tokens from Firestore
      const tokensToDelete = [];
      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            tokensToDelete.push(chunk[index]);
          }
        }
      });

      if (tokensToDelete.length > 0) {
        const batch = db.batch();
        tokensToDelete.forEach(t => {
          const docRef = db.collection('deviceTokens').doc(t);
          batch.delete(docRef);
        });
        await batch.commit();
      }
    }

    return res.status(200).json({
      success: true,
      successCount,
      failureCount,
      mode: 'production'
    });

  } catch (err) {
    console.error("FCM broadcast error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error broadcasting push notifications.'
    });
  }
}
