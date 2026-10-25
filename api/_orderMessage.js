// Team Telegram message for an order group, built on the server from the saved
// order documents. Nothing in it comes from free text a browser can choose.
import { adminDb } from './_firebaseAdmin.js';
import { priceOrder } from './_pricing.js';
import { fetchRazorpayPayment } from './_payments.js';

const SITE = 'https://momsmagic.shop';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rupees = (n) => `₹${Number(n || 0).toFixed(2)}`;

/**
 * @param {object} [check] for orders the browser wrote itself (not server-priced):
 *   { serverTotal: number|null, payment: string|null } from verifyAppOrder().
 */
export function buildTeamMessage(groupId, orders, check = null) {
  const first = orders[0];
  const hotels = orders.map((o) => o.hotelName).filter(Boolean);
  const partner = hotels.find((h) => h !== "Minto Kitchen");
  const loc = first.deliveryLocation || {};
  const sum = (k) => orders.reduce((s, o) => s + Number(o[k] || 0), 0);
  const paid = first.paymentStatus === 'completed';
  const unverified = first.paymentStatus === 'unverified';
  const onlineUnpaid = first.paymentMethod === 'online' && !paid && !unverified;
  const flags = [...new Set(orders.flatMap((o) => o.priceFlags || []))];

  const items = orders
    .flatMap((o) => (o.items || []).map((i) => `• ${i.quantity}x ${esc(i.name)}${o.hotelName && o.hotelName !== "Minto Kitchen" ? ` [${esc(o.hotelName)}]` : ''} (${rupees(i.price * i.quantity)})`))
    .join('\n');

  const appTotal = sum('payableAmount');
  const lines = [
    check ? '⚠️⚠️ <b>APP-PRICED ORDER — NOT VERIFIED BY THE SERVER</b>' : '',
    check && check.serverTotal !== null && Math.abs(check.serverTotal - appTotal) >= 1
      ? `⚠️ <b>Menu price total is ${rupees(check.serverTotal)}</b> (the app said ${rupees(appTotal)}) — collect the menu price`
      : '',
    partner ? `🏨 <b>NEW ORDER - ${esc(partner.toUpperCase())}</b>` : '📦 <b>NEW FOOD ORDER</b>',
    `🆔 <code>${esc(groupId)}</code>`,
    '',
    `👤 <b>Name:</b> ${esc(first.userName)}`,
    `📞 <b>Phone:</b> ${esc(first.userPhone)}`,
    `🏠 <b>Address:</b> ${esc(loc.address)}`,
    typeof loc.distance === 'number' ? `📏 <b>Distance:</b> ${loc.distance} km` : '',
    '',
    `🛒 <b>Items:</b>\n${items}`,
    '',
    `💰 <b>Subtotal:</b> ${rupees(sum('subtotal'))}`,
    sum('packagingFee') > 0 ? `📦 <b>Packaging:</b> ${rupees(sum('packagingFee'))}` : '',
    `🚚 <b>Delivery:</b> ${sum('deliveryCharge') > 0 ? rupees(sum('deliveryCharge')) : `FREE${first.freeDeliveryReason ? ` (${esc(first.freeDeliveryReason)})` : ''}`}`,
    sum('couponDiscount') > 0 ? `🎟️ <b>Coupon${first.couponCode ? ` ${esc(first.couponCode)}` : ''}:</b> -${rupees(sum('couponDiscount'))}` : '',
    `💵 <b>TOTAL:</b> ${rupees(sum('payableAmount'))}`,
    paid
      ? `✅ <b>Payment:</b> PAID ONLINE, verified with Razorpay (${esc(first.paymentId)})`
      : unverified
      ? `⚠️ <b>Payment:</b> ${check?.payment ? esc(check.payment) : `ONLINE, NOT VERIFIED — check ${esc(first.clientPaymentId || 'this payment')} in the Razorpay dashboard before cooking`}`
      : check
      ? '💵 <b>Payment:</b> Cash on Delivery (collect the menu price above)'
      : onlineUnpaid
      ? '⛔ <b>Payment:</b> ONLINE, NOT PAID — do not cook'
      : first.paymentMethod === 'free' && first.serverPriced
      ? '🎁 <b>Payment:</b> Nothing to pay (fully discounted)'
      : '💵 <b>Payment:</b> Cash on Delivery',
    first.instructions ? `📝 <b>Note:</b> ${esc(first.instructions)}` : '',
    first.needCutlery ? '🍴 Cutlery requested' : '',
    flags.length ? `\n⚠️ <b>Price check:</b>\n${flags.map((f) => `• ${esc(f)}`).join('\n')}` : '',
    '',
    typeof loc.lat === 'number' ? `🗺️ <a href="https://maps.google.com/?q=${loc.lat},${loc.lng}">View on map</a>` : '',
    `📍 <a href="${SITE}/track/${encodeURIComponent(groupId)}">Tracking page</a>`,
  ];
  return lines.filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0)).join('\n').slice(0, 4000);
}

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('Telegram send failed', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.error('Telegram send failed', err);
    return false;
  }
}

/**
 * All documents of an order group (one per kitchen), primary first. For a
 * group the server created, only server-created documents count: a browser
 * could otherwise add its own document with the same orderGroupId and have it
 * marked paid or announced along with the real one. (The rules stop browsers
 * setting serverPriced.)
 */
export async function loadGroup(groupId) {
  const snap = await adminDb.collection('orders').where('orderGroupId', '==', groupId).get();
  let docs = snap.docs.map((d) => ({ ref: d.ref, data: d.data() }));
  const primary = docs.find((d) => d.ref.id === groupId);
  if (primary?.data.serverPriced) docs = docs.filter((d) => d.data.serverPriced === true);
  return docs.sort((a, b) => (a.ref.id === groupId ? -1 : b.ref.id === groupId ? 1 : 0));
}

/**
 * Posts the team message for a group exactly once. The claim is a
 * transaction on the primary document, so retries, the webhook and the
 * browser callback can all call this safely.
 */
export async function announceOnce(groupId) {
  const primaryRef = adminDb.collection('orders').doc(groupId);
  const claimed = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(primaryRef);
    if (!snap.exists || snap.data().telegramSentAt) return false;
    // An online order is announced only once it is paid (markGroupPaid);
    // announcing it earlier would send the kitchen an unpaid order.
    if (snap.data().paymentStatus === 'awaiting_payment') return false;
    tx.update(primaryRef, { telegramSentAt: new Date().toISOString() });
    return true;
  });
  if (!claimed) return false;
  const group = await loadGroup(groupId);
  if (!group.length) {
    await primaryRef.update({ telegramSentAt: null });
    return false;
  }
  const docs = group.map((g) => g.data);
  const check = docs[0].serverPriced ? null : await verifyAppOrder(docs);
  const ok = await sendTelegram(buildTeamMessage(groupId, docs, check));
  if (!ok) await primaryRef.update({ telegramSentAt: null }); // let a retry try again
  return ok;
}

/**
 * For an order the browser wrote itself (the server was unreachable): price it
 * from the menu, and if it claims an online payment, ask Razorpay whether that
 * payment is real, captured, for that amount, and not already used by another
 * order.
 */
async function verifyAppOrder(docs) {
  const first = docs[0];
  let serverTotal = null;
  try {
    const loc = first.deliveryLocation || {};
    const priced = await priceOrder({
      items: docs.flatMap((d) => d.items || []),
      couponCode: first.couponCode,
      location: { lat: Number(loc.lat), lng: Number(loc.lng) },
    });
    serverTotal = priced.grandTotal;
  } catch {
    /* unknown or bad items: leave the menu total unknown */
  }

  let payment = null;
  if (first.paymentStatus === 'unverified' && first.clientPaymentId) {
    const p = await fetchRazorpayPayment(first.clientPaymentId);
    if (!p) {
      payment = `ONLINE, NOT VERIFIED — check ${first.clientPaymentId} in the Razorpay dashboard before cooking`;
    } else if (!['authorized', 'captured'].includes(p.status)) {
      payment = `⛔ Razorpay says payment ${p.id} is ${p.status}: NOT PAID, do not cook`;
    } else if (serverTotal !== null && Number(p.amount) < Math.round(serverTotal * 100)) {
      payment = `⛔ Razorpay payment ${p.id} is only ₹${(Number(p.amount) / 100).toFixed(2)}, less than the menu total`;
    } else {
      // One payment, one order: the create fails if this id was used before.
      try {
        await adminDb.collection('payments').doc(`app_${p.id}`).create({ groupId: first.orderGroupId || null, amountPaise: Number(p.amount), at: new Date().toISOString() });
        payment = `✅ Razorpay confirms ${p.id}: ₹${(Number(p.amount) / 100).toFixed(2)} ${p.status}`;
      } catch {
        payment = `⛔ Payment ${p.id} was ALREADY USED for another order — do not cook`;
      }
    }
  }
  return { serverTotal, payment };
}
