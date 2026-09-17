import { useEffect, useState } from 'react';

/**
 * Daily opening hours for the store.
 *
 * Times come from admin settings (`openTime` / `closeTime`, "HH:mm", 24-hour), so the
 * owner can change them without a deploy. Everything here works in the visitor's own
 * local time, which is what a single-city delivery service wants.
 */

export interface StoreHours {
  /** True when the current time is inside the opening window. */
  isOpen: boolean;
  /** Milliseconds until the store next opens. 0 when it is already open. */
  msUntilOpen: number;
  /** Milliseconds until the store closes. 0 when it is already closed. */
  msUntilClose: number;
  /** "12:00 PM" style label for the opening time. */
  opensAtLabel: string;
  /** "10:45 PM" style label for the closing time. */
  closesAtLabel: string;
  /** Countdown to the next state change, e.g. "3h 12m 40s". */
  countdown: string;
  /** True when open but within the last hour of service. */
  closingSoon: boolean;
}

/** "22:45" -> minutes since midnight. Falls back sensibly on malformed input. */
function toMinutes(hhmm: string, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return fallback;
  return h * 60 + min;
}

function toLabel(hhmm: string, fallback: number): string {
  const total = toMinutes(hhmm, fallback);
  const h24 = Math.floor(total / 60);
  const min = total % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${suffix}`;
}

function formatGap(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Pure calculation, exported so it can be unit-checked without React.
 * `now` is injectable for the same reason.
 */
export function computeStoreHours(
  openTime: string,
  closeTime: string,
  now: Date = new Date()
): StoreHours {
  const openMin = toMinutes(openTime, 12 * 60);      // default 12:00
  const closeMin = toMinutes(closeTime, 22 * 60 + 45); // default 22:45
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  // A window that wraps past midnight (e.g. 18:00 -> 02:00) is still handled.
  const wraps = closeMin <= openMin;
  const isOpen = wraps
    ? nowMin >= openMin || nowMin < closeMin
    : nowMin >= openMin && nowMin < closeMin;

  const at = (minutes: number, dayOffset = 0) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    d.setMinutes(minutes);
    return d.getTime();
  };

  let msUntilOpen = 0;
  let msUntilClose = 0;
  if (isOpen) {
    const closeAt = wraps && nowMin >= openMin ? at(closeMin, 1) : at(closeMin);
    msUntilClose = Math.max(0, closeAt - now.getTime());
  } else {
    const openAt = nowMin < openMin ? at(openMin) : at(openMin, 1);
    msUntilOpen = Math.max(0, openAt - now.getTime());
  }

  return {
    isOpen,
    msUntilOpen,
    msUntilClose,
    opensAtLabel: toLabel(openTime, 12 * 60),
    closesAtLabel: toLabel(closeTime, 22 * 60 + 45),
    countdown: formatGap(isOpen ? msUntilClose : msUntilOpen),
    closingSoon: isOpen && msUntilClose > 0 && msUntilClose <= 60 * 60 * 1000,
  };
}

/** Live version: re-renders once a second so the countdown actually ticks. */
export function useStoreHours(openTime: string, closeTime: string): StoreHours {
  const [state, setState] = useState(() => computeStoreHours(openTime, closeTime));

  useEffect(() => {
    setState(computeStoreHours(openTime, closeTime));
    const id = setInterval(() => setState(computeStoreHours(openTime, closeTime)), 1000);
    return () => clearInterval(id);
  }, [openTime, closeTime]);

  return state;
}
