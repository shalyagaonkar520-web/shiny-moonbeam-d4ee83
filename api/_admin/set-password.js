// POST /api/admin/set-password -- the Super Admin sets a new password for a
// restaurant or rider login, from the panel.
//
// Body: { email, password }. Super admins only (checked from their own
// users/{uid} record, never from the request). Only accounts whose users
// record is a HOTEL_ADMIN or RIDER can be changed here: staff and customer
// passwords stay with their owners. The new password is never stored or
// logged; the old sessions on that login are signed out.

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../_firebaseAdmin.js';
import { loadAdminAuth } from '../_adminAuth.js';
import { panelCors, requireStaff, auditEntry } from '../_staffAuth.js';

const CHANGEABLE = new Set(['HOTEL_ADMIN', 'RIDER']);

export function passwordProblem(password) {
  if (typeof password !== 'string') return 'Give a password.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 64) return 'Use at most 64 characters.';
  if (/^\s|\s$/.test(password)) return 'The password cannot start or end with a space.';
  return null;
}

export default async function handler(req, res) {
  if (panelCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  let staff;
  try {
    staff = await requireStaff(req, ['SUPER_ADMIN']);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password;
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Give the login email.' });
  const problem = passwordProblem(password);
  if (problem) return res.status(400).json({ error: problem });

  const { getAuth, error } = await loadAdminAuth();
  if (!getAuth) return res.status(503).json({ error: `Sign-in service unavailable: ${error}` });

  let account;
  try {
    account = await getAuth().getUserByEmail(email);
  } catch {
    return res.status(404).json({ error: `No login exists for ${email}.` });
  }
  if (account.uid === staff.uid) return res.status(400).json({ error: 'Change your own password from your profile, not here.' });

  const profile = await adminDb.collection('users').doc(account.uid).get();
  const role = profile.exists ? profile.data().role : null;
  if (!CHANGEABLE.has(role)) {
    return res.status(403).json({ error: 'Only restaurant and rider passwords can be set here.' });
  }

  try {
    await getAuth().updateUser(account.uid, { password });
    // Anyone still signed in with the old password is signed out.
    await getAuth().revokeRefreshTokens(account.uid);
  } catch (e) {
    return res.status(400).json({ error: String(e?.message || 'Could not change the password.').slice(0, 200) });
  }

  await adminDb.collection('auditLogs').add({
    ...auditEntry(staff, {
      action: 'login.setPassword',
      entity: 'users',
      entityId: account.uid,
      summary: `Set a new password for ${email} (${role === 'RIDER' ? 'rider' : 'restaurant'})`,
      after: { hotelId: profile.data().hotelId || '' },
    }),
    at: FieldValue.serverTimestamp(),
  }).catch(() => {});

  return res.status(200).json({ ok: true, email, role });
}
