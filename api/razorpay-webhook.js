import { adminDb } from './_firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { validWebhookSignature, markGroupPaid } from './_payments.js';
import { logOpsEvent } from './_ops.js';

// POST /api/razorpay-webhook   (Razorpay Dashboard -> Webhooks, events:
// payment.captured, order.paid, refund.processed and refund.failed,
// secret = RAZORPAY_WEBHOOK_SECRET)
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
    await logOpsEvent('payment_webhook', 'warning', 'Razorpay webhook with an invalid signature was refused');
    return json({ ok: false, error: 'invalid_signature' }, 401);
  }

  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  if (event?.event === 'refund.processed' || event?.event === 'refund.failed') {
    try {
      return json(await settleRefund(event.payload?.refund?.entity, event.event === 'refund.processed'));
    } catch (err) {
      console.error('razorpay-webhook refund failed', err);
      await logOpsEvent('refund', 'error', `Refund webhook could not be recorded: ${err?.message || err}`);
      return json({ ok: false }, 500);
    }
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
    if (!result.ok) await logOpsEvent('payment_webhook', 'error', `Paid order not marked paid: ${result.error}`, payment.order_id);
    // 200 either way for business errors: Razorpay retries non-2xx, and a
    // mismatch will not fix itself.
    return json(result);
  } catch (err) {
    console.error('razorpay-webhook failed', err);
    await logOpsEvent('payment_webhook', 'error', `Razorpay webhook failed: ${err?.message || err}`, payment.order_id);
    return json({ ok: false }, 500); // transient: let Razorpay retry
  }
}

/**
 * Razorpay's final word on a refund started from the Super Admin
 * (api/_admin/refund.js). Finds the refunds/{requestId} record by the
 * provider's refund id and flips it and the order. Idempotent: a refund
 * already settled is left alone, and a failed refund gives its amount back to
 * the order's refundable balance exactly once.
 */
async function settleRefund(refund, processed) {
  if (!refund?.id) return { ok: false, error: 'no_refund' };
  const found = await adminDb.collection('refunds').where('providerRefundId', '==', refund.id).limit(1).get();
  if (found.empty) return { ok: true, ignored: 'unknown_refund' };
  const refundRef = found.docs[0].ref;

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(refundRef);
    const r = snap.data();
    if (r.status === 'processed' || r.status === 'failed') return { ok: true, already: r.status };
    const orderRef = adminDb.collection('orders').doc(r.orderId);
    if (processed) {
      tx.update(refundRef, { status: 'processed', providerStatus: refund.status, processedAt: FieldValue.serverTimestamp() });
      tx.update(orderRef, { refundStatus: 'processed' });
    } else {
      tx.update(refundRef, { status: 'failed', providerStatus: refund.status, failedAt: FieldValue.serverTimestamp() });
      tx.update(orderRef, { refundStatus: 'failed', refundAmount: FieldValue.increment(-Number(r.amount || 0)) });
    }
    return { ok: true, status: processed ? 'processed' : 'failed' };
  }).then(async (out) => {
    if (out.status === 'failed') {
      const r = (await refundRef.get()).data();
      await logOpsEvent('refund', 'error', `Razorpay reports refund ${refund.id} failed`, r?.orderId || '');
    }
    return out;
  });
}
