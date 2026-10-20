// MM Clean — shared types, formatting and validation.
//
// The services catalogue and the bookings live in the same Firebase project as
// the rest of the app (momsmagic-d131a), but they are owned by the super admin
// panel at mintoo-panel.web.app. This app only reads cleanServices and creates
// cleanBookings; the Firestore rules that allow that are deployed from the
// panel repo, never from here.

export type CleanCategory =
  | 'quick'
  | 'bathroom'
  | 'kitchen'
  | 'deep'
  | 'furnishing'
  | 'laundry';

export interface CleanService {
  id: string;
  name: string;
  category: CleanCategory;
  /** Rupees. */
  price: number;
  /** Minutes. */
  duration: number;
  description: string;
  image: string;
  active: boolean;
  sortOrder: number;
}

export const CATEGORY_LABELS: Record<CleanCategory, string> = {
  quick: 'Quick help',
  bathroom: 'Bathroom',
  kitchen: 'Kitchen',
  deep: 'Deep cleaning',
  furnishing: 'Sofa & windows',
  laundry: 'Laundry',
};

/** Chip order. Only categories with at least one service are shown. */
export const CATEGORY_ORDER: CleanCategory[] = [
  'quick',
  'bathroom',
  'kitchen',
  'deep',
  'furnishing',
  'laundry',
];

export const TIME_SLOTS = [
  '8–10 AM',
  '10–12 PM',
  '12–2 PM',
  '2–4 PM',
  '4–6 PM',
  '6–8 PM',
] as const;

/** Where the panel hosts the built-in service photos. */
const PANEL_ORIGIN = 'https://mintoo-panel.web.app/';

export const HERO_IMAGE = `${PANEL_ORIGIN}clean/hero.webp`;

/**
 * `image` is either a full URL the admin pasted in, or a built-in path like
 * `clean/bathroom.webp` that lives on the panel's hosting.
 */
export function cleanImageUrl(image: string): string {
  const value = String(image || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return PANEL_ORIGIN + value.replace(/^\/+/, '');
}

/** 45 -> "45 min", 60 -> "1 hr", 90 -> "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins} min`;
  if (!mins) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

// ---- branding ---------------------------------------------------------------

export interface CleanBranding {
  appCleanName: string;
  cleanHeroTitle: string;
  cleanHeroBody: string;
  supportPhone: string;
  appName: string;
}

export const DEFAULT_BRANDING: CleanBranding = {
  appCleanName: 'MM Clean',
  cleanHeroTitle: 'Home cleaning, booked in a minute',
  cleanHeroBody: 'Trained, verified professionals. Pay after the work is done.',
  supportPhone: '',
  appName: 'Mintoo',
};

/**
 * Merges `system/branding` over the defaults. Every field is optional, and an
 * empty string counts as absent so an admin clearing a box gets the default
 * back rather than a blank heading.
 */
export function resolveBranding(raw: Record<string, unknown> | null | undefined): CleanBranding {
  const pick = (key: keyof CleanBranding): string => {
    const value = raw?.[key];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : DEFAULT_BRANDING[key];
  };
  const appName = pick('appName');
  // Admin copy may contain {app}; substitute after picking so a default that
  // mentions the app name works too.
  const withApp = (text: string) => text.replace(/\{app\}/g, appName);
  return {
    appName,
    appCleanName: withApp(pick('appCleanName')),
    cleanHeroTitle: withApp(pick('cleanHeroTitle')),
    cleanHeroBody: withApp(pick('cleanHeroBody')),
    supportPhone: pick('supportPhone') === DEFAULT_BRANDING.supportPhone ? '' : pick('supportPhone'),
  };
}

// ---- the next 7 days --------------------------------------------------------

export interface BookingDay {
  /** 'YYYY-MM-DD', which is the format the rules require. */
  date: string;
  /** 'Today', 'Tomorrow', or 'Mon 23'. */
  label: string;
}

/** Built from local time, not UTC, so "Today" is the customer's today. */
export function nextSevenDays(from: Date = new Date()): BookingDay[] {
  const days: BookingDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const label =
      i === 0
        ? 'Today'
        : i === 1
          ? 'Tomorrow'
          : `${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${d.getDate()}`;
    days.push({ date: iso, label });
  }
  return days;
}

// ---- validation -------------------------------------------------------------

/** Spaces and dashes are stripped before the rules' pattern is applied. */
export function normalisePhone(phone: string): string {
  return String(phone || '').replace(/[\s-]/g, '');
}

export const PHONE_PATTERN = /^[+]?[0-9]{10,13}$/;

export interface BookingDraft {
  name: string;
  phone: string;
  address: string;
  date: string;
  slot: string;
  notes: string;
}

/**
 * The same limits the Firestore rules enforce, checked here so a customer is
 * told what is wrong instead of watching the write bounce. The rules remain
 * the authority — this is a courtesy, not a security boundary.
 */
export function validateBooking(draft: BookingDraft): string | null {
  const name = draft.name.trim();
  if (name.length < 2 || name.length > 80) return 'Please enter your name (2–80 characters).';

  const phone = normalisePhone(draft.phone);
  if (!PHONE_PATTERN.test(phone)) return 'Please enter a valid phone number.';

  const address = draft.address.trim();
  if (address.length < 8 || address.length > 300) {
    return 'Please enter your full address with a landmark (at least 8 characters).';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return 'Please choose a day.';
  if (draft.slot.length < 1 || draft.slot.length > 30) return 'Please choose a time slot.';
  if (draft.notes.trim().length > 300) return 'Notes are too long (300 characters maximum).';

  return null;
}

/**
 * The booking document, with exactly the fields the rules allow and nothing
 * else — no userId, no app metadata. An extra key makes the whole write fail,
 * so this is deliberately the only place a booking is shaped.
 *
 * `createdAt` is left to the caller because it must be serverTimestamp(), and
 * keeping the Firestore import out of here keeps this file testable.
 */
export function buildBookingPayload(service: CleanService, draft: BookingDraft) {
  const notes = draft.notes.trim();
  return {
    serviceId: service.id,
    // Copied from the service as it is right now. If the admin changed either
    // while this sheet was open the rules reject the write, which is what
    // triggers the "service was just updated" message.
    serviceName: service.name,
    price: service.price,
    name: draft.name.trim(),
    phone: normalisePhone(draft.phone),
    address: draft.address.trim(),
    date: draft.date,
    slot: draft.slot,
    ...(notes ? { notes } : {}),
    status: 'NEW' as const,
  };
}

/** Last 6 characters of the document id, for the customer to quote on a call. */
export function bookingRef(docId: string): string {
  return String(docId || '').slice(-6).toUpperCase();
}
