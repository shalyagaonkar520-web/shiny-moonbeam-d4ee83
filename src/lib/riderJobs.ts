import {
  arrayUnion,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';

/**
 * ID Partner's job steps for rider-direct orders.
 *
 * The guarantees are in the Firestore rules (panel firestore.rules):
 * isValidRiderAccept lets exactly one rider claim an open offer, and
 * isValidRiderUpdate / isValidRiderPayment allow only NEW -> OUT_FOR_DELIVERY
 * -> DELIVERED -> COMPLETED, by the assigned rider, without touching prices.
 * Each step here re-reads the order in a transaction so a double tap or a
 * stale screen moves the order once and the rider gets a plain answer.
 *
 * After every step the public tracking/{trackingId} document is refreshed;
 * it is what the customer's live map listens to.
 */

export interface RiderIdentity {
  uid: string;
  name: string;
}

export type StepResult = 'done' | 'already' | 'not_allowed';
export type AcceptResult = 'assigned' | 'already_yours' | 'taken';

const history = (status: string, rider: RiderIdentity, note = '') =>
  arrayUnion({ status, timestamp: new Date().toISOString(), updatedBy: rider.name || rider.uid, note });

export async function acceptOrder(db: Firestore, orderId: string, rider: RiderIdentity): Promise<AcceptResult> {
  const ref = doc(db, 'orders', orderId);
  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'taken' as const;
      const o: any = snap.data();
      if (o.riderId === rider.uid) return 'already_yours' as const;
      if (o.riderOffer !== 'OPEN' || o.riderId) return 'taken' as const;
      tx.update(ref, {
        riderOffer: 'TAKEN',
        riderId: rider.uid,
        riderName: rider.name || '',
        riderAssignedAt: serverTimestamp(),
        riderStatus: 'accepted',
        updatedAt: serverTimestamp(),
        statusHistory: history('RIDER_ASSIGNED', rider),
      });
      return 'assigned' as const;
    });
    return result;
  } catch (err: any) {
    // Once another rider holds it, this rider may no longer even read it.
    if (['permission-denied', 'failed-precondition', 'aborted'].includes(err?.code)) return 'taken';
    throw err;
  }
}

async function advance(
  db: Firestore,
  orderId: string,
  rider: RiderIdentity,
  from: string,
  to: 'OUT_FOR_DELIVERY' | 'DELIVERED'
): Promise<StepResult> {
  const ref = doc(db, 'orders', orderId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const o: any = snap.data();
    if (!snap.exists() || o.riderId !== rider.uid) return 'not_allowed';
    if (o.orderStatus === to) return 'already';
    if (o.orderStatus !== from) return 'not_allowed';
    tx.update(ref, {
      orderStatus: to,
      status: to === 'DELIVERED' ? 'delivered' : 'Out For Delivery',
      riderStatus: to === 'DELIVERED' ? 'delivered' : 'picked_up',
      ...(to === 'DELIVERED' ? { deliveredAt: serverTimestamp() } : { outForDeliveryAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
      statusHistory: history(to, rider),
    });
    return 'done';
  });
}

/** No kitchen step: the rider collects the food from the restaurant straight from NEW. */
export const markPickedUp = (db: Firestore, orderId: string, rider: RiderIdentity) =>
  advance(db, orderId, rider, 'NEW', 'OUT_FOR_DELIVERY');

export const markDelivered = (db: Firestore, orderId: string, rider: RiderIdentity) =>
  advance(db, orderId, rider, 'OUT_FOR_DELIVERY', 'DELIVERED');

export type PaymentResult = 'closed_paid_online' | 'cash_collected' | 'already' | 'not_allowed';

/**
 * COLLECT PAYMENT. An order the server verified as paid online is closed as
 * it is; anything else is recorded as cash received by this rider. The rules
 * refuse any attempt to mark an online payment received.
 */
export async function collectPayment(db: Firestore, orderId: string, rider: RiderIdentity): Promise<PaymentResult> {
  const ref = doc(db, 'orders', orderId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const o: any = snap.data();
    if (!snap.exists() || o.riderId !== rider.uid) return 'not_allowed';
    if (o.orderStatus === 'COMPLETED') return 'already';
    if (o.orderStatus !== 'DELIVERED' || o.paymentStatus === 'refunded') return 'not_allowed';
    const base = {
      orderStatus: 'COMPLETED',
      status: 'completed',
      riderStatus: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (o.paymentStatus === 'completed') {
      tx.update(ref, { ...base, statusHistory: history('COMPLETED', rider, 'paid online') });
      return 'closed_paid_online';
    }
    tx.update(ref, {
      ...base,
      paymentStatus: 'completed',
      paymentMethod: 'cod',
      cashCollected: true,
      cashCollectedAt: serverTimestamp(),
      statusHistory: history('COMPLETED', rider, `cash collected${o.paymentMethod === 'online' ? ' (online payment not confirmed)' : ''}`),
    });
    return 'cash_collected';
  });
}

/** The rider hands an accepted job back before pickup; it returns to the pool. */
export async function handBack(db: Firestore, orderId: string, rider: RiderIdentity): Promise<StepResult> {
  const ref = doc(db, 'orders', orderId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const o: any = snap.data();
    if (!snap.exists() || o.riderId !== rider.uid || o.orderStatus !== 'NEW') return 'not_allowed';
    tx.update(ref, {
      riderId: '',
      riderName: '',
      riderOffer: 'OPEN',
      riderStatus: 'released',
      updatedAt: serverTimestamp(),
      statusHistory: history('RIDER_RELEASED', rider),
    });
    return 'done';
  });
}

// ── Live tracking ────────────────────────────────────────────────────

function millis(v: any): number | null {
  if (!v) return null;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'object' && 'seconds' in v) return Number(v.seconds) * 1000;
  const t = new Date(v).getTime();
  return isNaN(t) ? null : t;
}

export interface RiderFix {
  lat: number;
  lng: number;
  riderId: string;
  at: number;
  /** Metres, from the phone's GPS. */
  accuracy?: number;
  /** Degrees from north, when the phone knows it. */
  heading?: number | null;
  /** Metres per second, when the phone knows it. */
  speed?: number | null;
}

/**
 * Publishes tracking/{trackingId} from the order as it is now. Called after
 * every step; the rules require its status and rider to match the order.
 */
export async function publishTracking(db: Firestore, order: any, riderLocation?: RiderFix | null): Promise<void> {
  if (!order?.trackingId) return;
  const t: Record<string, number> = {};
  const add = (k: string, v: any) => {
    const m = millis(v);
    if (m) t[k] = m;
  };
  add('placed', order.createdAt);
  add('accepted', order.riderAssignedAt);
  add('pickedUp', order.outForDeliveryAt);
  add('delivered', order.deliveredAt);
  add('completed', order.completedAt);
  const drop = order.deliveryLocation;
  await setDoc(
    doc(db, 'tracking', order.trackingId),
    {
      orderId: order.id,
      orderNumber: String(order.id).slice(-6).toUpperCase(),
      status: order.orderStatus,
      hotelName: order.hotelName || '',
      // The map joins the rider to the customer; no restaurant point needed.
      hotelLocation: null,
      dropLocation: drop && typeof drop.lat === 'number' ? { lat: drop.lat, lng: drop.lng } : null,
      riderId: order.riderId || '',
      riderName: order.riderName || '',
      ...(riderLocation !== undefined ? { riderLocation } : {}),
      times: t,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** One GPS fix to the customer's map (tracking doc) only; cheap and frequent. */
export function sendRiderFix(db: Firestore, order: any, fix: RiderFix) {
  if (!order?.trackingId) return Promise.resolve();
  return publishTracking(db, order, fix);
}

/** The rider's own record, for the admin map; written less often. */
export function reportRiderLocation(db: Firestore, uid: string, lat: number, lng: number) {
  return updateDoc(doc(db, 'riders', uid), {
    currentLocation: { lat, lng, lastUpdated: new Date().toISOString() },
    updatedAt: serverTimestamp(),
  });
}

export function setRiderOnline(db: Firestore, uid: string, online: boolean) {
  return updateDoc(doc(db, 'riders', uid), { status: online ? 'online' : 'offline', updatedAt: serverTimestamp() });
}
