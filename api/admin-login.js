import crypto from 'crypto';

// Admin login, checked on the server.
//
// The credentials used to be compared inside AdminPage.tsx, which meant the
// email and password were literals in the JavaScript every visitor downloads --
// readable with "view source" on a public site, and committed to a public repo.
// They live in the hosting environment now and never reach the browser.
//
// Set ADMIN_EMAIL and ADMIN_PASSWORD in the hosting provider's environment
// variables. If they are not set this endpoint reports that it is unconfigured
// and the app falls back to Firebase Auth, so there is always a way in.
//
// Note what this does and does not buy you. The token returned here only
// unlocks the admin UI in the browser; it is not checked by Firestore. Admin
// changes are written to Firestore directly from the client, so the real access
// control is the Firestore security rules (see firestore.rules), which key off
// Firebase Auth. Treat this endpoint as a lock on the door of the room, not on
// the safe.

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/** Constant-time compare, so a wrong password cannot be found byte by byte. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // timingSafeEqual throws on a length mismatch; still burn a comparison.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    // Distinct from a bad password: the app uses this to fall back to Firebase
    // Auth instead of telling the user their credentials were wrong.
    return res.status(501).json({ ok: false, unconfigured: true });
  }

  let email = '';
  let password = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    email = String(body.email || '');
    password = String(body.password || '');
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid request body' });
  }

  const emailOk = safeEqual(email.trim().toLowerCase(), ADMIN_EMAIL.trim().toLowerCase());
  const passwordOk = safeEqual(password, ADMIN_PASSWORD);

  if (!emailOk || !passwordOk) {
    return res.status(401).json({ ok: false, error: 'Invalid admin credentials' });
  }

  // Hand back ADMIN_API_TOKEN, which the protected endpoints (send-push,
  // settings, drinks) compare against. Only someone who passed the password
  // check above ever receives it, and it is never written in the repo or the
  // client bundle. Without it configured, fall back to a random value that
  // still unlocks the admin UI but opens no endpoint -- those fail closed.
  return res.status(200).json({
    ok: true,
    token: process.env.ADMIN_API_TOKEN || crypto.randomBytes(32).toString('hex'),
    email: ADMIN_EMAIL,
  });
}
