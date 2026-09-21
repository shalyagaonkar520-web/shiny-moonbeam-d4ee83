import { Handler } from '@netlify/functions';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountVar) {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is not defined.');
    }
  } catch (err) {
    console.error('Error initializing Firebase Admin SDK:', err);
  }
}

import crypto from 'crypto';

// Shared admin check. This used to accept any Authorization header containing
// the literal 'mock-jwt-admin-token-123456', a string committed to a public
// repo, so anyone who read the source could call this endpoint. It compares
// against ADMIN_API_TOKEN from the environment and refuses every request when
// that is not set, rather than falling back to something guessable.
function isAuthorisedAdmin(authHeader?: string | null): boolean {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected || !authHeader) return false;
  const supplied = authHeader.replace(/^Bearer\s+/i, '').trim();
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Validate admin token/access
  const authHeader = event.headers['authorization'];
  if (!isAuthorisedAdmin(authHeader)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized access' }),
    };
  }

  try {
    const { title, message, imageUrl, deepLink } = JSON.parse(event.body || '{}');
    if (!title || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title and message are required' }),
      };
    }

    if (!admin.apps.length) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Firebase Admin SDK is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT.',
        }),
      };
    }

    const db = admin.firestore();

    // Retrieve all registered device tokens from Firestore
    const snapshot = await db.collection('deviceTokens').get();
    const tokens: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data && data.token) {
        tokens.push(data.token);
      }
    });

    if (tokens.length === 0) {
      return {
        statusCode: 200,
        headers,
        // Return structured data for UI feedback
        body: JSON.stringify({
          success: true,
          message: 'No registered device tokens found.',
          successCount: 0,
          failureCount: 0,
        }),
      };
    }

    // Build the multicast payload
    const payload: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body: message,
      },
      webpush: {
        headers: {
          TTL: '86400',
        },
        notification: {
          title,
          body: message,
          icon: '/pwa-icon-192.png',
          badge: '/pwa-icon-192.png',
          tag: 'moms-magic-broadcast',
          requireInteraction: true,
          ...(imageUrl ? { image: imageUrl } : {}),
          data: {
            url: deepLink || '/',
          },
        },
      },
    };

    // Broadcast push notifications
    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`Multicast broadcast completed: ${response.successCount} successes, ${response.failureCount} failures.`);

    // Automatically remove invalid or expired tokens from Firestore to keep database clean
    if (response.failureCount > 0) {
      const batch = db.batch();
      let cleanupsCount = 0;

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (
            error &&
            (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered')
          ) {
            const expiredToken = tokens[idx];
            const expiredTokenRef = db.collection('deviceTokens').doc(expiredToken);
            batch.delete(expiredTokenRef);
            cleanupsCount++;
          }
        }
      });

      if (cleanupsCount > 0) {
        await batch.commit();
        console.log(`Successfully cleaned up ${cleanupsCount} expired/invalid device tokens from Firestore.`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      }),
    };
  } catch (err: any) {
    console.error('Error sending push notifications:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
