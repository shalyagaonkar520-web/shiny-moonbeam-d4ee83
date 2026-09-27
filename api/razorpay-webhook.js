import { adminDb } from './_firebaseAdmin.js';
import { validWebhookSignature, markGroupPaid } from './_payments.js';

// POST /api/razorpay-webhook   (Razorpay Dashboard -> Webhooks, events:
// payment.captured and order.paid, secret = RAZORPAY_WEBHOOK_SECRET)
//
// The safety net for online payments: if Android kills the app while the
// customer is in their UPI app, the browser never calls /api/verify-payment,
// but Razorpay still calls this and the order is marked paid and sent to the
// kitchen.
//
// Web-standard handler (Request -> Response): Razorpay signs the exact bytes
// it sent, and this form hands us those bytes. The Node (req, res) form can
// have the body already consumed and parsed by the runtime.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request) {
  if (!adminDb) return json({ ok: false, error: 'not_configured' }, 503);

  const raw = Buffer.from(await request.arrayBuffer());
  if (!validWebhookSignature(raw, request.headers.get('x-razorpay-signature'))) {
    return json({ ok: false, error: 'invalid_signature' }, 401);
  }

  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  const payment = event?.payload?.payment?.entity;
  if (!payment || !['payment.captured', 'order.paid'].includes(event.event)) {
    return json({ ok: true, ignored: event?.event || 'unknown' });
  }
  if (!payment.order_id) return json({ ok: false, error: 'no_order_id' });

  try {
    // The order group comes from the server's own record of this Razorpay
    // order (never from payment notes, which the payer controls), and the
    // amount actually paid must be the amount that order was created for.
    const result = await markGroupPaid(payment.order_id, payment.id, { amountPaise: Number(payment.amount) });
    // 200 either way for business errors: Razorpay retries non-2xx, and a
    // mismatch will not fix itself.
    return json(result);
  } catch (err) {
    console.error('razorpay-webhook failed', err);
    return json({ ok: false }, 500); // transient: let Razorpay retry
  }
}
