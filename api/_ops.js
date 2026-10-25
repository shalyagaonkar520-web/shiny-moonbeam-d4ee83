// Operational problems the Super Admin's Monitoring screen shows: payment
// webhook failures, notification errors, failed jobs. Best effort by design --
// recording a failure must never itself fail the request that hit it.

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './_firebaseAdmin.js';

/**
 * @param {'payment_webhook'|'notification'|'job'|'order'|'refund'} type
 * @param {'error'|'warning'|'info'} severity
 * @param {string} message  what happened, without secrets or card data
 * @param {string} [ref]    the order, payment or job it concerns
 */
export async function logOpsEvent(type, severity, message, ref = '') {
  if (!adminDb) return;
  try {
    await adminDb.collection('opsEvents').add({
      type,
      severity,
      message: String(message || '').slice(0, 500),
      ref: String(ref || '').slice(0, 120),
      resolved: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error('opsEvents write failed:', e?.message || e);
  }
}
