import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Check, Loader2, Phone, X } from 'lucide-react';
import { db } from '../firebase';
import {
  BookingDraft,
  CleanBranding,
  CleanService,
  TIME_SLOTS,
  bookingRef,
  buildBookingPayload,
  cleanImageUrl,
  formatDuration,
  nextSevenDays,
  validateBooking,
} from '../lib/mmClean';

// The booking sheet, and the confirmation that replaces it.
//
// Rendered through a portal: App wraps every route in a Framer Motion opacity
// animation, which creates a stacking context, so a z-index set inside the page
// is only ever compared with its siblings in that page and would sit under the
// bottom nav.
//
// Customers never sign in and never pay here, so a booking is just a document
// in cleanBookings. The Firestore rules accept exactly eleven fields and check
// the price against the live service, which means the write is also the
// price-tampering check — there is nothing to verify separately.

interface Props {
  service: CleanService;
  branding: CleanBranding;
  onClose: () => void;
}

type Stage = 'form' | 'sending' | 'done';

export default function MMCleanBookingSheet({ service, branding, onClose }: Props) {
  const navigate = useNavigate();
  const days = useMemo(() => nextSevenDays(), []);

  const [stage, setStage] = useState<Stage>('form');
  const [error, setError] = useState<string | null>(null);
  const [staleService, setStaleService] = useState(false);
  const [reference, setReference] = useState('');

  const [draft, setDraft] = useState<BookingDraft>(() => ({
    // The app already knows these from earlier food orders; no reason to make
    // the customer type them again.
    name: (() => {
      try { return localStorage.getItem('mintoo_user_name') || ''; } catch { return ''; }
    })(),
    phone: (() => {
      try { return localStorage.getItem('mintoo_user_phone') || ''; } catch { return ''; }
    })(),
    address: '',
    date: days[0].date,
    slot: TIME_SLOTS[0],
    notes: '',
  }));

  const set = <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const chosenDay = days.find((d) => d.date === draft.date);

  const submit = async () => {
    const problem = validateBooking(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStage('sending');

    try {
      const written = await addDoc(collection(db, 'cleanBookings'), {
        ...buildBookingPayload(service, draft),
        createdAt: serverTimestamp(),
      });
      setReference(bookingRef(written.id));
      setStage('done');
    } catch (err: any) {
      setStage('form');
      // The rules compare serviceName and price with the live service, so a
      // rejection here almost always means the admin edited it while this
      // sheet was open. The page's listener has already refreshed the prices
      // behind us, so sending them back to the list shows the new one.
      if (err?.code === 'permission-denied') {
        setStaleService(true);
        setError('This service was just updated, please check and book again.');
      } else {
        console.error('MM Clean: booking failed', err);
        setError(
          branding.supportPhone
            ? 'Could not book right now. Please try again, or call us.'
            : 'Could not book right now. Please try again.'
        );
      }
    }
  };

  const sheet =
    stage === 'done' ? (
      <div className="px-5 pb-8 pt-2 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
          <Check className="w-7 h-7 text-emerald-700" strokeWidth={3} />
        </div>
        <h2 className="mt-3 text-lg font-black text-gray-900">Booking received!</h2>

        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-1.5">
          <p className="text-sm font-black text-gray-900">{service.name}</p>
          <p className="text-xs text-gray-600">
            {chosenDay?.label} · {draft.slot}
          </p>
          <p className="text-xs text-gray-500">
            Booking ref <b className="text-gray-800 tracking-wider">{reference}</b>
          </p>
        </div>

        <p className="mt-4 text-sm text-gray-700 font-medium">We will call you to confirm.</p>

        {branding.supportPhone && (
          <a
            href={`tel:${branding.supportPhone}`}
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-5 py-2.5 rounded-full"
          >
            <Phone className="w-4 h-4" />
            {branding.supportPhone}
          </a>
        )}

        <button
          onClick={() => {
            onClose();
            navigate('/');
          }}
          className="mt-5 w-full py-3.5 rounded-full bg-emerald-600 text-white font-black text-sm active:scale-[0.98] transition-transform cursor-pointer"
        >
          Done
        </button>
      </div>
    ) : (
      <div className="px-5 pb-8 pt-1">
        {/* Service summary */}
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-2.5">
          {service.image && (
            <img
              src={cleanImageUrl(service.image)}
              alt=""
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gray-900 truncate">{service.name}</p>
            <p className="text-[11px] text-gray-500">
              {formatDuration(service.duration)} · ₹{service.price}
            </p>
          </div>
        </div>

        {/* Day */}
        <p className="mt-4 mb-2 text-xs font-black text-gray-900">Choose a day</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {days.map((d) => (
            <button
              key={d.date}
              onClick={() => set('date', d.date)}
              className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${
                draft.date === d.date
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Slot */}
        <p className="mt-4 mb-2 text-xs font-black text-gray-900">Choose a time</p>
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => set('slot', slot)}
              className={`py-2.5 rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${
                draft.slot === slot
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>

        {/* Details */}
        <div className="mt-4 space-y-2.5">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            maxLength={80}
            placeholder="Your name"
            autoComplete="name"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500"
          />
          <input
            type="tel"
            value={draft.phone}
            onChange={(e) => set('phone', e.target.value)}
            maxLength={16}
            placeholder="Phone number"
            autoComplete="tel"
            inputMode="tel"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500"
          />
          <textarea
            value={draft.address}
            onChange={(e) => set('address', e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Full address with landmark"
            autoComplete="street-address"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-emerald-500"
          />
          <textarea
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Anything we should know? (optional)"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-emerald-500"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3"
          >
            {error}
          </p>
        )}

        <button
          onClick={staleService ? onClose : submit}
          disabled={stage === 'sending'}
          className="mt-4 w-full py-3.5 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform cursor-pointer"
        >
          {stage === 'sending' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Booking…
            </>
          ) : staleService ? (
            'Back to services'
          ) : (
            `Book for ₹${service.price}`
          )}
        </button>

        <p className="mt-2 text-center text-[11px] text-gray-400 font-medium">
          No payment now — pay after the service is done.
        </p>
      </div>
    );

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/45"
        onClick={stage === 'sending' ? undefined : onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-xl bg-white rounded-t-[28px] max-h-[92vh] overflow-y-auto safe-bottom"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-black text-gray-900">
            {stage === 'done' ? 'Confirmed' : 'Book this service'}
          </h2>
          {stage !== 'sending' && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {sheet}
      </motion.div>
    </div>,
    document.body
  );
}
