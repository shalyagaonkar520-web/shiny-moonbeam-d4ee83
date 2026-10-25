// Calls to the order and payment endpoints, plus the Razorpay loader.

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type PlaceOrderOutcome =
  | { kind: 'ok'; data: PlaceOrderResponse }
  /** Server not configured or unreachable: Checkout falls back to writing the order itself. */
  | { kind: 'unavailable' }
  /** Server refused the order (bad phone, outside the area...): tell the customer. */
  | { kind: 'rejected'; error: string; hotels?: string[] };

export interface PlaceOrderResponse {
  orderId: string;
  amount: number;
  pricing?: { subtotal: number; deliveryCharge: number; packagingFee: number; couponDiscount: number; grandTotal: number };
  orders?: any[];
  // Exactly one of these is filled in, by whichever gateway PAYMENT_PROVIDER
  // selected: Razorpay's modal needs a key and an order id, UPI needs a link
  // to open and an id to poll.
  razorpay: { orderId: string; amount: number; key?: string } | null;
  upi?: {
    paymentId: string;
    amount: number;
    link: string | null;
    qr: string | null;
    vpa: string | null;
  } | null;
  duplicate?: boolean;
}

async function postJson(url: string, body: unknown, timeoutMs: number): Promise<Response> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = window.setTimeout(() => controller?.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function placeOnce(payload: Record<string, unknown>): Promise<PlaceOrderOutcome | { kind: 'retry' }> {
  let res: Response;
  try {
    res = await postJson('/api/place-order', payload, 15000);
  } catch {
    return { kind: 'retry' }; // timeout or network: the order may or may not exist
  }
  // The dev server and old deployments answer /api/* with index.html.
  if (!(res.headers.get('content-type') || '').includes('json')) return { kind: 'unavailable' };
  const body = await res.json().catch(() => ({}));
  if (res.ok && body?.ok) return { kind: 'ok', data: body };
  // Not configured: nothing was written, so the browser fallback is safe.
  if (res.status === 503) return { kind: 'unavailable' };
  if (res.status >= 500) return { kind: 'retry' };
  return {
    kind: 'rejected',
    error: body?.error || 'order_failed',
    // Names of the kitchens that refused, when the refusal is about them.
    hotels: Array.isArray(body?.hotels)
      ? body.hotels.map((h: any) => String(h?.name || h?.id || '')).filter(Boolean)
      : undefined,
  };
}

/**
 * Places the order on the server. A timeout or 5xx is retried once with the
 * same order id: the endpoint is idempotent, so if the first attempt did save
 * the order the retry returns it instead of the app writing a second copy.
 */
export async function placeOrderOnServer(payload: Record<string, unknown>): Promise<PlaceOrderOutcome> {
  const first = await placeOnce(payload);
  if (first.kind !== 'retry') return first;
  const second = await placeOnce(payload);
  return second.kind === 'retry' ? { kind: 'unavailable' } : second;
}

/** True when the server confirmed the payment. False is not fatal: the webhook finishes the job. */
export async function verifyPaymentOnServer(body: Record<string, string>): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await postJson('/api/verify-payment', body, 12000);
      if (res.ok) return true;
      if (res.status >= 400 && res.status < 500) return false;
    } catch {
      /* retry */
    }
  }
  return false;
}

export function orderErrorMessage(code: string, hotels?: string[]): string {
  switch (code) {
    case 'hotel_closed': {
      if (!hotels || hotels.length === 0) {
        return 'One of the kitchens in your cart has stopped taking orders right now. Remove its items and try again.';
      }
      const verb = hotels.length > 1 ? 'have' : 'has';
      return `${hotels.join(' and ')} ${verb} stopped taking orders right now. Remove those items and try again.`;
    }
    case 'invalid_phone': return 'Please enter a valid 10-digit mobile number.';
    case 'invalid_name': return 'Please enter your name.';
    case 'invalid_location': return 'Please choose your delivery location again.';
    case 'outside_service_area': return 'Sorry, this address is outside our delivery area.';
    case 'cod_not_available': return 'Cash on Delivery is not available beyond 5 km. Please choose Pay Online.';
    case 'empty_cart': return 'Your cart is empty.';
    case 'too_many_requests': return 'Too many attempts. Please wait a minute and try again.';
    case 'payment_setup_failed': return 'Online payment is unavailable right now. Please try again or choose Cash on Delivery.';
    default: return 'Could not place your order. Please try again.';
  }
}

// Loaded once and reused; a stalled mobile connection gives up after 15 s
// instead of leaving "Placing order..." on screen for a minute.
let razorpayLoading: Promise<boolean> | null = null;
export function loadRazorpay(): Promise<boolean> {
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (razorpayLoading) return razorpayLoading;
  razorpayLoading = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const timer = window.setTimeout(() => resolve(false), 15000);
    script.onload = () => { window.clearTimeout(timer); resolve(!!(window as any).Razorpay); };
    script.onerror = () => { window.clearTimeout(timer); resolve(false); };
    document.body.appendChild(script);
  }).then((ok) => {
    if (!ok) razorpayLoading = null; // allow a retry on the next tap
    return ok;
  });
  return razorpayLoading;
}

/** Warm up the Razorpay connection while the customer is still filling the form. */
export function preconnectRazorpay() {
  if (document.querySelector('link[data-rzp-preconnect]')) return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://checkout.razorpay.com';
  link.setAttribute('data-rzp-preconnect', '');
  document.head.appendChild(link);
}

/**
 * Names of the kitchens among `hotelIds` that are not taking orders.
 *
 * Used on the browser fallback before an online payment is opened: without it
 * a customer could pay for a kitchen that is closed, and only then have the
 * order refused. Returns null when availability could not be read, so the
 * caller can decline to take money it cannot account for.
 */
export async function findClosedHotels(
  hotelIds: string[]
): Promise<string[] | null> {
  try {
    const snaps = await Promise.all(
      [...new Set(hotelIds)].map((id) => getDoc(doc(db, 'hotels', id)))
    );
    return snaps
      .filter((s) => {
        const h: any = s.exists() ? s.data() : null;
        return !h || h.acceptingOrders !== true || h.status === 'INACTIVE';
      })
      .map((s) => String((s.data() as any)?.name || s.id));
  } catch {
    return null;
  }
}
