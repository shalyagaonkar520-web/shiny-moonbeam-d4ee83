// Moms Magic Kitchen opens at 2:30 PM India time every day and takes orders
// from then until midnight. Before 2:30 PM it is closed, whatever the panel's
// switch says. Only this hotel has fixed hours; every other hotel is unchanged.
//
// Times are worked out in IST explicitly, not from the phone's time zone.
// The server applies the same rule (api/_mmkHours.js), so a wrong phone clock
// cannot get an order through early.

import { useEffect, useState } from 'react';

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 14:30 IST, in ms after IST midnight. */
export const MMK_OPENS_AT_MS = (14 * 60 + 30) * 60 * 1000;
export const MMK_OPENS_AT_LABEL = '2:30 PM';
export const MMK_CLOSED_MESSAGE = `Closed – Opens at ${MMK_OPENS_AT_LABEL}`;

function istMsOfDay(now: Date): number {
  return (((now.getTime() + IST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
}

export function isMmkOpenNow(now: Date = new Date()): boolean {
  return istMsOfDay(now) >= MMK_OPENS_AT_MS;
}

/** Ms until the open/closed state next flips: 2:30 PM, or midnight IST. */
export function msUntilMmkChange(now: Date = new Date()): number {
  const t = istMsOfDay(now);
  return t < MMK_OPENS_AT_MS ? MMK_OPENS_AT_MS - t : DAY_MS - t;
}

/** A cart line or product from Moms Magic Kitchen. */
export function isMmkItem(item: { id?: string | null; hotelId?: string | null } | null | undefined): boolean {
  return !!item && ((typeof item.id === 'string' && item.id.startsWith('mmk-')) || item.hotelId === 'moms_magic_kitchen');
}

/**
 * Open/closed that re-renders exactly at 2:30 PM and at midnight, and again
 * whenever the app comes back to the foreground (phones pause timers).
 */
export function useMmkOpen(): boolean {
  const [open, setOpen] = useState(() => isMmkOpenNow());
  useEffect(() => {
    let timer: number | undefined;
    const arm = () => {
      window.clearTimeout(timer);
      setOpen(isMmkOpenNow());
      timer = window.setTimeout(arm, msUntilMmkChange() + 250);
    };
    arm();
    const onVisible = () => { if (document.visibilityState === 'visible') arm(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return open;
}
