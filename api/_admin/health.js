// POST /api/admin/health -- which integrations are configured, and whether
// they answer. For the Super Admin's Integrations screen.
//
// Never returns a key, token or secret: only "configured" and the outcome of
// a harmless read-only check. Super admins only.

import { adminDb, adminMessaging } from '../_firebaseAdmin.js';
import { PAYMENT_PROVIDER, razorpayConfigured, paymentsConfigured } from '../_payments.js';
import { panelCors, requireStaff } from '../_staffAuth.js';

async function check(fn) {
  try {
    return await fn();
  } catch (e) {
    return { configured: true, ok: false, detail: String(e?.message || e).slice(0, 160) };
  }
}

export default async function handler(req, res) {
  if (panelCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    await requireStaff(req, ['SUPER_ADMIN']);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const [payments, telegram] = await Promise.all([
    check(async () => {
      if (!paymentsConfigured()) return { configured: false, detail: `Provider "${PAYMENT_PROVIDER}" has no credentials set.` };
      if (PAYMENT_PROVIDER !== 'razorpay' || !razorpayConfigured()) return { configured: true, detail: `Provider: ${PAYMENT_PROVIDER}` };
      const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
      const r = await fetch('https://api.razorpay.com/v1/payments?count=1', { headers: { Authorization: `Basic ${auth}` } });
      const mode = String(process.env.RAZORPAY_KEY_ID).startsWith('rzp_live') ? 'live' : 'test';
      return { configured: true, ok: r.ok, detail: r.ok ? `Razorpay, ${mode} mode, credentials accepted` : `Razorpay rejected the credentials (${r.status})` };
    }),
    check(async () => {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token || !process.env.TELEGRAM_CHAT_ID) return { configured: false, detail: 'Bot token or chat id not set.' };
      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      return { configured: true, ok: r.ok, detail: r.ok ? 'Bot reachable' : `Telegram answered ${r.status}` };
    }),
  ]);

  res.status(200).json({
    payments,
    telegram,
    push: adminMessaging ? { configured: true, ok: true, detail: 'Firebase Cloud Messaging via the Admin SDK' } : { configured: false, detail: 'Firebase Admin credentials not set.' },
    sms: process.env.SMS_API_KEY ? { configured: true, detail: process.env.SMS_PROVIDER || 'SMS provider configured' } : { configured: false, detail: 'No SMS provider set (SMS_API_KEY).' },
    email: { configured: true, ok: true, detail: 'Firebase Auth sends sign-in and password emails' },
    database: adminDb ? { configured: true, ok: true, detail: 'Admin SDK connected' } : { configured: false, detail: 'Firebase Admin credentials not set.' },
  });
}
