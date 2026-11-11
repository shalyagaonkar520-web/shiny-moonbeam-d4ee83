/**
 * Smooth vehicle motion from sparse GPS fixes.
 *
 * A GPS fix arrives every few seconds. Drawing the bike straight onto each
 * fix makes it hop; gliding to each fix and waiting for the next makes it
 * stop-and-go. A vehicle keeps moving, so:
 *
 *  - each fix starts a segment from where the bike is DRAWN right now (never
 *    a snap), at a constant speed, timed to arrive about when the next fix is
 *    expected (a running average of the gaps seen so far);
 *  - if the next fix is late, the bike keeps going at the same speed, slowing
 *    to a stop over a couple of seconds (dead reckoning), instead of freezing
 *    and then lurching;
 *  - the heading comes from the direction of travel.
 *
 * Pure functions of time, so it can be tested without a browser.
 */

export interface Pos {
  lat: number;
  lng: number;
}

/** Bike is never extrapolated further than this past its last fix. */
export const EXTRAPOLATE_MS = 2500;
const MIN_GAP_MS = 1200;
const MAX_GAP_MS = 6000;
/** A jump this big is a new fix after a long gap, not motion: show it at once. */
const TELEPORT_M = 1500;

const M_PER_DEG = 111_320;

export function metresBetween(a: Pos, b: Pos): number {
  const dLat = (b.lat - a.lat) * M_PER_DEG;
  const dLng = (b.lng - a.lng) * M_PER_DEG * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/** Compass bearing in degrees (0 = north, clockwise) from a to b. */
export function bearingDeg(a: Pos, b: Pos): number {
  const dLat = b.lat - a.lat;
  const dLng = (b.lng - a.lng) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return (((Math.atan2(dLng, dLat) * 180) / Math.PI) + 360) % 360;
}

/** Shortest signed angle from `from` to `to`, in degrees (-180..180). */
export function angleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class Smoother {
  private from: Pos | null = null;
  private to: Pos | null = null;
  private startT = 0;
  private dur = 3000;
  private lastPushT = 0;
  private gap = 3000;
  private vLat = 0; // degrees per ms along the current segment
  private vLng = 0;
  private head: number | null = null;

  /** Feed a new fix. `now` is a monotonic clock in ms (performance.now()). */
  push(p: Pos, now: number): void {
    if (!this.to || !this.from) {
      this.from = this.to = p;
      this.startT = this.lastPushT = now;
      this.vLat = this.vLng = 0;
      return;
    }
    const cur = this.at(now)!;
    const moved = metresBetween(cur, p);
    const observed = clamp(now - this.lastPushT, MIN_GAP_MS, MAX_GAP_MS);
    this.gap = this.gap * 0.6 + observed * 0.4;
    this.lastPushT = now;

    if (moved > TELEPORT_M) {
      this.from = this.to = p;
      this.startT = now;
      this.vLat = this.vLng = 0;
      return;
    }
    this.from = cur;
    this.to = p;
    this.startT = now;
    this.dur = this.gap;
    if (moved < 1) {
      this.vLat = this.vLng = 0; // standing still: do not creep
    } else {
      this.vLat = (p.lat - cur.lat) / this.dur;
      this.vLng = (p.lng - cur.lng) / this.dur;
      if (moved > 2) this.head = bearingDeg(cur, p);
    }
  }

  /** Where to draw the bike at time `now`. */
  at(now: number): Pos | null {
    if (!this.from || !this.to) return null;
    const t = now - this.startT;
    if (t <= 0) return this.from;
    if (t <= this.dur) {
      const k = t / this.dur; // linear: no slowing down at each fix
      return { lat: this.from.lat + (this.to.lat - this.from.lat) * k, lng: this.from.lng + (this.to.lng - this.from.lng) * k };
    }
    // Past the expected arrival: keep going, slowing to a stop (velocity
    // falls linearly to zero over EXTRAPOLATE_MS).
    const e = Math.min(t - this.dur, EXTRAPOLATE_MS);
    const travelled = e - (e * e) / (2 * EXTRAPOLATE_MS);
    return { lat: this.to.lat + this.vLat * travelled, lng: this.to.lng + this.vLng * travelled };
  }

  /** Direction of travel in degrees, or null before the bike has moved. */
  heading(): number | null {
    return this.head;
  }

  /** Does the picture still need redrawing at `now`? False once it has settled. */
  active(now: number): boolean {
    if (!this.to || !this.from) return false;
    const t = now - this.startT;
    const travelling = this.from.lat !== this.to.lat || this.from.lng !== this.to.lng;
    if (t <= this.dur) return travelling;
    return (this.vLat !== 0 || this.vLng !== 0) && t - this.dur < EXTRAPOLATE_MS + 50;
  }

  reset(): void {
    this.from = this.to = null;
    this.head = null;
    this.vLat = this.vLng = 0;
    this.gap = 3000;
  }
}
