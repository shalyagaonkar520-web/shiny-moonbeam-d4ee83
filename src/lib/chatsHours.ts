// Chats (Chetana Masalapuri Center) take orders from 4:00 PM India time every
// day until midnight. Before 4 PM they are closed, whatever the panel's switch
// says. Same idea as Moms Magic Kitchen's 2:30 PM rule (src/lib/mmkHours.ts).
//
// Times are worked out in IST explicitly, not from the phone's time zone. The
// server applies the same rule (api/_chatsHours.js), so a wrong phone clock
// cannot get an order through early.

import { useEffect, useState } from 'react';

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 16:00 IST, in ms after IST midnight. */
export const CHATS_OPENS_AT_MS = 16 * 60 * 60 * 1000;
export const CHATS_OPENS_AT_LABEL = '4 PM';
export const CHATS_CLOSED_MESSAGE = `Closed – Opens at ${CHATS_OPENS_AT_LABEL}`;

function istMsOfDay(now: Date): number {
  return (((now.getTime() + IST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
}

export function isChatsOpenNow(now: Date = new Date()): boolean {
  return istMsOfDay(now) >= CHATS_OPENS_AT_MS;
}

/** Ms until the open/closed state next flips: 4 PM, or midnight IST. */
export function msUntilChatsChange(now: Date = new Date()): number {
  const t = istMsOfDay(now);
  return t < CHATS_OPENS_AT_MS ? CHATS_OPENS_AT_MS - t : DAY_MS - t;
}

/** A cart line or product from the Chats menu (Chetana Masalapuri Center). */
export function isChatsItem(item: { id?: string | null; hotelId?: string | null } | null | undefined): boolean {
  return !!item && ((typeof item.id === 'string' && item.id.startsWith('chetana-')) || item.hotelId === 'chetana-masalapuri-center');
}

/**
 * Open/closed that re-renders exactly at 4 PM and at midnight, and again
 * whenever the app comes back to the foreground (phones pause timers).
 */
export function useChatsOpen(): boolean {
  const [open, setOpen] = useState(() => isChatsOpenNow());
  useEffect(() => {
    let timer: number | undefined;
    const arm = () => {
      window.clearTimeout(timer);
      setOpen(isChatsOpenNow());
      timer = window.setTimeout(arm, msUntilChatsChange() + 250);
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
