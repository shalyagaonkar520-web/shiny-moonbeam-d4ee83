/**
 * The ID Partner new-order alarm: a loud two-tone siren that repeats until
 * the rider answers, plus vibration and a system notification.
 *
 * Browsers only allow sound after the user has touched the page, so
 * unlockAlarm() must run inside a tap (signing in, or going online). After
 * that the siren can start by itself when an order arrives.
 */

let ctx: AudioContext | null = null;
let timer: number | null = null;
let master: GainNode | null = null;

export function unlockAlarm() {
  try {
    if (!ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* no audio on this device */
  }
}

function beep(freq: number, start: number, dur: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(1, start + 0.02);
  g.gain.setValueAtTime(1, start + dur - 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function cycle() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  // Hi-lo siren, three times, then a short pause.
  for (let i = 0; i < 3; i++) {
    beep(1046, t + i * 0.5, 0.24);
    beep(784, t + i * 0.5 + 0.25, 0.24);
  }
  try {
    navigator.vibrate?.([400, 150, 400, 150, 400]);
  } catch {
    /* no vibration */
  }
}

export function startAlarm() {
  unlockAlarm();
  if (timer !== null || !ctx) return;
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  cycle();
  timer = window.setInterval(cycle, 2000);
}

export function stopAlarm() {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  try {
    master?.disconnect();
  } catch {
    /* already gone */
  }
  master = null;
  try {
    navigator.vibrate?.(0);
  } catch {
    /* no vibration */
  }
}

export function isAlarmOn() {
  return timer !== null;
}

/** Asks once for notification permission (needs a tap on most browsers). */
export async function askNotificationPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  } catch {
    /* unsupported */
  }
}

/** A system notification, so the alarm is seen when the tab is in the background. */
export async function notifyNewOrder(title: string, body: string, tag: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration?.();
    const opts: NotificationOptions & { renotify?: boolean; requireInteraction?: boolean; vibrate?: number[] } = {
      body,
      tag,
      renotify: true,
      requireInteraction: true,
      icon: '/logo-sm.webp',
      vibrate: [400, 150, 400, 150, 400],
    };
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {
    /* ignore */
  }
}
