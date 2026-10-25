import crypto from 'crypto';
import { getApps } from 'firebase-admin/app';
import { loadAdminAuth } from './_adminAuth.js';
import { adminDb } from './_firebaseAdmin.js';

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
// Admin changes are written to Firestore directly from the client, so the real
// access control is the Firestore security rules, which key off Firebase Auth.
// When the Firebase Admin SDK is configured (see _firebaseAdmin.js) a correct
// password also gets a Firebase custom token for ADMIN_UID with the claim
// admin:true; the client signs in with it so the rules can see an admin. The
// separate ADMIN_API_TOKEN is still returned for send-push.
//
// Failed attempts are slowed down (a fixed delay) and counted per IP. The
// counter lives in this instance's memory, so on serverless it is best effort:
// a cold start or another instance starts from zero.

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const ADMIN_UID = 'jis-admin';
const FAILURE_DELAY_MS = 600;
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
/** ip -> { count, first } for recent failed logins in this instance. */
const failures = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function clientIp(req) {
  const fwd = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || String(req.headers?.['x-real-ip'] || '') || req.socket?.remoteAddress || 'unknown';
}

function isLockedOut(ip) {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > FAILURE_WINDOW_MS) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(ip) {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || now - entry.first > FAILURE_WINDOW_MS) failures.set(ip, { count: 1, first: now });
  else entry.count += 1;
  // Keep the map from growing without bound on a long-lived instance.
  if (failures.size > 5000) failures.clear();
}

/** Firebase Auth with admin rights, or null when the Admin SDK is unavailable. */
async function adminAuth() {
  if (!adminDb) return null;
  const apps = getApps();
  if (!apps.length) return null;
  const { getAuth } = await loadAdminAuth();
  return getAuth ? getAuth(apps[0]) : null;
}

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
    // TEMPORARY DIAGNOSTIC -- remove once firebase-admin/auth loads on Vercel.
    const { error: authLoadError } = await loadAdminAuth();
    return res.status(405).json({ ok: false, error: 'Method Not Allowed', authModule: authLoadError ? 'unavailable: ' + authLoadError : 'ok' });
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    // Distinct from a bad password: the app uses this to fall back to Firebase
    // Auth instead of telling the user their credentials were wrong.
    return res.status(501).json({ ok: false, unconfigured: true });
  }

  const ip = clientIp(req);
  if (isLockedOut(ip)) {
    await sleep(FAILURE_DELAY_MS);
    return res.status(429).json({ ok: false, error: 'Too many failed attempts. Try again later.' });
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
    recordFailure(ip);
    await sleep(FAILURE_DELAY_MS);
    return res.status(401).json({ ok: false, error: 'Invalid admin credentials' });
  }
  failures.delete(ip);

  // A Firebase session for the admin, so Firestore rules can tell it apart
  // from a customer. Null (and the admin UI warns) when the SDK is missing.
  let firebaseToken = null;
  const auth = await adminAuth();
  if (auth) {
    try {
      firebaseToken = await auth.createCustomToken(ADMIN_UID, { admin: true });
    } catch (error) {
      console.error('admin-login: could not create a Firebase custom token:', error);
    }
  }

  // Hand back ADMIN_API_TOKEN, which the protected endpoint (send-push)
  // compares against. Only someone who passed the password
  // check above ever receives it, and it is never written in the repo or the
  // client bundle. Without it configured, fall back to a random value that
  // still unlocks the admin UI but opens no endpoint -- send-push fails closed.
  return res.status(200).json({
    ok: true,
    token: process.env.ADMIN_API_TOKEN || crypto.randomBytes(32).toString('hex'),
    email: ADMIN_EMAIL,
    firebaseToken,
  });
}
