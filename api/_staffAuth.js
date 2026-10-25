// Staff authentication for the Super Admin's server calls.
//
// The panel sends the signed-in staff member's Firebase ID token. This
// verifies the token, then reads the account's own users/{uid} record -- the
// same record the Firestore rules read -- and checks the role and that the
// account is active. A request that fails any step is refused; nothing here
// trusts a role, an email or a uid sent in the request body.

import { adminDb } from './_firebaseAdmin.js';
import { loadAdminAuth } from './_adminAuth.js';

/** Origins the Super Admin is served from. */
const PANEL_ORIGINS = new Set([
  'https://mintoo-panel.web.app',
  'https://mintoo-panel.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:5180',
  ...(process.env.PANEL_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
]);

/**
 * CORS for the panel only: a credentialed admin request from any other site
 * is not answered with an allow header, so a browser blocks it.
 * Returns true when the request was a preflight and has been answered.
 */
export function panelCors(req, res) {
  const origin = req.headers.origin || '';
  if (PANEL_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(PANEL_ORIGINS.has(origin) ? 204 : 403).end();
    return true;
  }
  return false;
}

/**
 * Resolves to the staff member, or throws an Error with a `status`.
 * @param {string[]} roles roles allowed to make this call
 */
export async function requireStaff(req, roles) {
  const fail = (status, message) => Object.assign(new Error(message), { status });
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw fail(401, 'Sign in again to continue.');
  if (!adminDb) throw fail(503, 'The server is not connected to the database.');

  const { getAuth, error } = await loadAdminAuth();
  if (!getAuth) throw fail(503, `Sign-in checks are unavailable: ${error}`);

  let decoded;
  try {
    // checkRevoked: a deactivated or signed-out account's old token fails.
    decoded = await getAuth().verifyIdToken(token, true);
  } catch {
    throw fail(401, 'Your session has expired. Sign in again.');
  }

  const snap = await adminDb.collection('users').doc(decoded.uid).get();
  const user = snap.exists ? snap.data() : null;
  if (!user || user.active !== true || !roles.includes(user.role)) {
    throw fail(403, 'Your role may not do this.');
  }
  return { uid: decoded.uid, email: decoded.email || user.email || '', role: user.role, cityIds: user.cityIds || [] };
}

/** Writes an audit entry from the server, in the same shape the panel uses. */
export function auditEntry(staff, entry) {
  return {
    actorUid: staff.uid,
    actorEmail: staff.email,
    actorRole: staff.role,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    summary: String(entry.summary || '').slice(0, 300),
    reason: String(entry.reason || '').slice(0, 300),
    before: entry.before || null,
    after: entry.after || null,
    cityId: entry.cityId || '',
  };
}
