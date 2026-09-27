import { adminDb } from './_firebaseAdmin.js';
import { toStage } from './_orderStage.js';

// POST /api/rate-order  { orderId, stars: 1-5, comment?, tags?: string[] }
//
// One rating per delivered order. Knowing the order id is the authority (the
// same as tracking), and the server enforces the rest: the order must exist and
// be delivered, and a second rating for the same order is refused. The rating
// is stored in ratings/<orderId>, stamped on the order for the admin panel, and
// posted to the team's Telegram group.

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{6,100}$/;
const ALLOWED_TAGS = new Set([
  'Tasty food', 'Good portion', 'Well packed', 'On time', 'Polite rider',
  'Late delivery', 'Cold food', 'Wrong item', 'Poor packing', 'Less quantity',
]);

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function notifyTeam(orderId, order, rating) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const hotels = [...new Set((order.items || []).map((i) => i?.hotelName).filter(Boolean))].join(', ');
  const lines = [
    `${rating.stars <= 2 ? '⚠️' : '⭐'} <b>New rating: ${'★'.repeat(rating.stars)}${'☆'.repeat(5 - rating.stars)}</b>`,
    `🧾 Order <code>${escHtml(orderId)}</code>${hotels ? ` · ${escHtml(hotels)}` : ''}`,
    order.userName ? `👤 ${escHtml(order.userName)}${order.userPhone ? ` (${escHtml(order.userPhone)})` : ''}` : '',
    rating.tags.length ? `🏷 ${escHtml(rating.tags.join(', '))}` : '',
    rating.comment ? `💬 ${escHtml(rating.comment)}` : '',
  ].filter(Boolean);
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('rate-order: Telegram notify failed', err);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  if (!adminDb) return res.status(503).json({ ok: false, error: 'ratings_not_configured' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const orderId = String(body.orderId || '').trim();
  const stars = Number(body.stars);
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : '';
  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => ALLOWED_TAGS.has(t)).slice(0, 6) : [];

  if (!ORDER_ID_PATTERN.test(orderId)) return res.status(400).json({ ok: false, error: 'invalid_order_id' });
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ ok: false, error: 'invalid_stars' });

  try {
    const orderRef = adminDb.collection('orders').doc(orderId);
    const ratingRef = adminDb.collection('ratings').doc(orderId);
    const rating = { orderId, stars, comment, tags, createdAt: new Date().toISOString() };

    // Transaction: checking "not yet rated" and writing must be atomic, or two
    // quick taps could store two ratings.
    const order = await adminDb.runTransaction(async (tx) => {
      const [orderSnap, ratingSnap] = await Promise.all([tx.get(orderRef), tx.get(ratingRef)]);
      if (!orderSnap.exists) throw Object.assign(new Error('not found'), { http: 404, code: 'order_not_found' });
      const data = orderSnap.data();
      if (toStage(data) !== 'delivered') throw Object.assign(new Error('not delivered'), { http: 409, code: 'not_delivered_yet' });
      if (ratingSnap.exists || data.customerRating) throw Object.assign(new Error('rated'), { http: 409, code: 'already_rated' });

      const hotelIds = [...new Set((data.items || []).map((i) => i?.hotelId).filter(Boolean))];
      tx.set(ratingRef, { ...rating, hotelIds, riderId: data.riderId || null });
      tx.update(orderRef, { customerRating: { stars, comment, tags, createdAt: rating.createdAt } });
      return data;
    });

    await notifyTeam(orderId, order, rating);
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error.http) return res.status(error.http).json({ ok: false, error: error.code });
    console.error('rate-order failed', error);
    return res.status(502).json({ ok: false, error: 'rating_failed' });
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
