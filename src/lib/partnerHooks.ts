import { useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { reportRiderLocation, sendRiderFix, type RiderFix } from './riderJobs';

// A fix every 3 s keeps the customer's bike moving like a vehicle (the map
// glides between fixes, see lib/smoothMove); more often costs database
// writes for no visible gain.
const MIN_SEND_MS = 3000; // at most one fix every 3 s per order
const MIN_MOVE_M = 5; // ...unless the rider has not moved
const HEARTBEAT_MS = 12000; // re-send the last fix so the customer sees "live"
const MAX_ACCURACY_M = 120; // a reading vaguer than this would make the bike jump about
const RIDER_DOC_MS = 30000; // the rider's own record, for the admin map

function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export type GpsState = 'off' | 'starting' | 'live' | 'denied' | 'unavailable';

/**
 * Real GPS while the rider has an order out for delivery: every fix goes to
 * that order's tracking document (the customer's map), throttled to keep
 * writes reasonable, and stops the moment no order is out any more.
 */
export function useRiderGps(uid: string | null, activeOrders: any[]) {
  const [state, setState] = useState<GpsState>('off');
  const [last, setLast] = useState<RiderFix | null>(null);
  const orders = useRef(activeOrders);
  orders.current = activeOrders;
  const sentAt = useRef<Record<string, { at: number; lat: number; lng: number }>>({});
  const lastFix = useRef<RiderFix | null>(null);
  const riderDocAt = useRef(0);
  const active = !!uid && activeOrders.length > 0;

  useEffect(() => {
    if (!active || !uid) {
      setState('off');
      return;
    }
    if (!navigator.geolocation) {
      setState('unavailable');
      return;
    }
    setState('starting');

    const push = (fix: RiderFix, force = false) => {
      const now = Date.now();
      for (const o of orders.current) {
        const prev = sentAt.current[o.id];
        const moved = prev ? metres(prev, fix) : Infinity;
        if (!force && prev && now - prev.at < MIN_SEND_MS) continue;
        if (!force && prev && moved < MIN_MOVE_M && now - prev.at < HEARTBEAT_MS) continue;
        sentAt.current[o.id] = { at: now, lat: fix.lat, lng: fix.lng };
        sendRiderFix(db, o, { ...fix, at: now }).catch((e) => console.warn('Location send failed (will retry):', e?.code || e));
      }
      if (now - riderDocAt.current > RIDER_DOC_MS) {
        riderDocAt.current = now;
        reportRiderLocation(db, uid, fix.lat, fix.lng).catch(() => {});
      }
    };

    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        // A very vague reading (a few hundred metres, as phones give before
        // GPS locks on) would make the bike leap; wait for a better one,
        // unless it is the only one there is.
        if (lastFix.current && (pos.coords.accuracy || 0) > MAX_ACCURACY_M) return;
        const fix: RiderFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          riderId: uid,
          at: Date.now(),
          accuracy: Math.round(pos.coords.accuracy || 0),
          heading: typeof pos.coords.heading === 'number' && !isNaN(pos.coords.heading) ? Math.round(pos.coords.heading) : null,
          speed: typeof pos.coords.speed === 'number' && !isNaN(pos.coords.speed) ? Math.round(pos.coords.speed * 10) / 10 : null,
        };
        lastFix.current = fix;
        setLast(fix);
        setState('live');
        push(fix);
      },
      (err) => setState(err.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    // A rider waiting at a gate still counts as live on the customer's map.
    const beat = window.setInterval(() => {
      if (lastFix.current) push({ ...lastFix.current, at: Date.now() }, false);
    }, HEARTBEAT_MS);

    return () => {
      navigator.geolocation.clearWatch(watch);
      window.clearInterval(beat);
      setState('off');
    };
  }, [active, uid]);

  // A newly picked-up order gets the current position straight away.
  const ids = activeOrders.map((o) => o.id).join(',');
  useEffect(() => {
    if (lastFix.current && active) {
      for (const o of orders.current) {
        if (!sentAt.current[o.id]) {
          sentAt.current[o.id] = { at: Date.now(), lat: lastFix.current.lat, lng: lastFix.current.lng };
          sendRiderFix(db, o, { ...lastFix.current, at: Date.now() }).catch(() => {});
        }
      }
    }
  }, [ids, active]);

  return { state, last };
}

/**
 * Keeps the screen on while the rider is online or on a job. A browser stops
 * GPS when the phone locks, so this is what keeps tracking alive in the web
 * app; it is re-taken whenever the page comes back to the front.
 */
export function useWakeLock(on: boolean) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) {
      setHeld(false);
      return;
    }
    let lock: any = null;
    let cancelled = false;
    const take = async () => {
      try {
        if (document.visibilityState !== 'visible') return;
        lock = await (navigator as any).wakeLock.request('screen');
        if (cancelled) {
          lock.release();
          return;
        }
        setHeld(true);
        lock.addEventListener?.('release', () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };
    void take();
    const onVis = () => {
      if (document.visibilityState === 'visible') void take();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      try {
        lock?.release();
      } catch {
        /* already released */
      }
    };
  }, [on]);
  return held;
}

/** Browser online/offline; Firestore itself reconnects and resyncs on its own. */
export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

/**
 * The rider's own position for their maps (not sent anywhere). Runs while
 * the rider is online or has a job, so the route to the customer is ready
 * before pickup.
 */
export function useMyPosition(active: boolean) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!active || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);
  return pos;
}
