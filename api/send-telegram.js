import { adminDb } from './_firebaseAdmin.js';
import { logOpsEvent } from './_ops.js';
import { announceOnce } from './_orderMessage.js';

// POST /api/send-telegram  { orderId, text? }
//
// Tells the team group about an order. This used to relay any text anyone
// posted, which let strangers drop fake "PAID" orders or phishing links into
// the kitchen's chat. Now, whenever the server can read Firestore, the text
// in the request is ignored: the message is built from the saved order, and
// each order is announced once (repeat calls are harmless).
//
// Anything else (party bookings, feedback, lucky-wheel claims, or an order
// the browser could not save) is relayed as text: capped, rate limited, and
// marked as unverified.

const ORDER_ID = /^[0-9]{13}[A-Z2-9]{10}$/;
const hits = new Map();

function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

  // An order id that exists: announce the saved order (text ignored, once).
  if (adminDb && ORDER_ID.test(String(body.orderId || ''))) {
    if (tooMany(ip)) return res.status(429).json({ success: false, error: 'too_many_requests' });
    try {
      const snap = await adminDb.collection('orders').doc(String(body.orderId)).get();
      if (snap.exists) {
        await announceOnce(String(body.orderId));
        return res.status(200).json({ success: true });
      }
    } catch (err) {
      console.error('send-telegram failed', err);
      return res.status(500).json({ success: false });
    }
  }

  // ---- everything else: party bookings, feedback, lucky-wheel claims, and an
  // order the browser could not save. Relayed as text, capped, rate limited,
  // and labelled so the team knows the server did not verify it.
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ success: false, error: 'Notifications are not configured' });
  if (tooMany(ip)) return res.status(429).json({ success: false, error: 'too_many_requests' });

  const raw = typeof body.text === 'string' ? body.text.slice(0, 3800) : '';
  if (!raw) return res.status(400).json({ error: 'Missing message text' });
  const text = adminDb ? `⚠️ <i>Sent from the app, not verified by the server</i>

${raw}` : raw;

  try {
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!tg.ok) {
      await logOpsEvent('notification', 'error', `Telegram answered ${tg.status}`);
      return res.status(502).json({ success: false });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Telegram send failed:', err);
    await logOpsEvent('notification', 'error', `Telegram send failed: ${err?.message || err}`);
    return res.status(500).json({ success: false });
  }
}
