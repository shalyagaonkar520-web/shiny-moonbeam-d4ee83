import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { ChevronLeft, Phone, ShieldCheck, Sparkles, Wallet, Loader2 } from 'lucide-react';
import { db, firebaseReady } from '../firebase';
import { useSEO } from '../utils/seo';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CleanBranding,
  CleanCategory,
  CleanService,
  DEFAULT_BRANDING,
  HERO_IMAGE,
  cleanImageUrl,
  formatDuration,
  resolveBranding,
} from '../lib/mmClean';
import MMCleanBookingSheet from './MMCleanBookingSheet';

// MM Clean — home cleaning, booked without signing in and paid after the work.
//
// The catalogue is owned by the super admin panel; this screen only reads it.
// Prices shown here are copied into the booking, and the Firestore rules
// re-check them against the live service, so a stale price is refused rather
// than honoured. That rejection is what the "service was just updated" message
// in the booking sheet reports.

export default function MMCleanPage() {
  const navigate = useNavigate();
  const [branding, setBranding] = useState<CleanBranding>(DEFAULT_BRANDING);
  const [services, setServices] = useState<CleanService[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(true);
  const [category, setCategory] = useState<CleanCategory | 'all'>('all');
  const [booking, setBooking] = useState<CleanService | null>(null);

  useSEO(
    `${branding.appCleanName} — home cleaning`,
    'Book trained, verified home cleaning professionals. Pay after the service.'
  );

  // One listener on the catalogue, plus two one-off reads for the switches.
  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      setFailed(true);
      return;
    }

    let cancelled = false;

    // A missing doc or field means open, so only an explicit false closes it.
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'apps'));
        if (!cancelled && snap.exists() && snap.data()?.clean === false) setOpen(false);
      } catch {
        /* unreadable: stay open rather than hide a working service */
      }
      try {
        const snap = await getDoc(doc(db, 'system', 'branding'));
        if (!cancelled && snap.exists()) setBranding(resolveBranding(snap.data()));
      } catch {
        /* unreadable: the defaults are already in place */
      }
    })();

    // Filtering on `active` in the query (rather than in JS) keeps this working
    // whether the rules allow the whole collection or only the active rows.
    // Sorting is done below instead of in the query, because `where` plus
    // `orderBy` on a different field needs a composite index to exist.
    const unsubscribe = onSnapshot(
      query(collection(db, 'cleanServices'), where('active', '==', true)),
      (snap) => {
        if (cancelled) return;
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CleanService, 'id'>) }));
        rows.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
        setServices(rows);
        setLoading(false);
        setFailed(false);
      },
      (error) => {
        console.error('MM Clean: could not load services', error);
        if (cancelled) return;
        setLoading(false);
        setFailed(true);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Only categories that actually have something in them get a chip.
  const categories = useMemo(() => {
    const present = new Set(services.map((s) => s.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [services]);

  const visible = useMemo(
    () => (category === 'all' ? services : services.filter((s) => s.category === category)),
    [services, category]
  );

  // A chip can stop existing when the admin deactivates the last service in it.
  useEffect(() => {
    if (category !== 'all' && !categories.includes(category)) setCategory('all');
  }, [categories, category]);

  const header = (
    <header className="safe-top sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-xl mx-auto flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 active:scale-95 transition-transform cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-base font-black text-gray-900 tracking-tight truncate">
          {branding.appCleanName}
        </h1>
        {branding.supportPhone && (
          <a
            href={`tel:${branding.supportPhone}`}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-full active:scale-95 transition-transform"
          >
            <Phone className="w-3.5 h-3.5" />
            Call us
          </a>
        )}
      </div>
    </header>
  );

  if (!open) {
    return (
      <div className="min-h-screen bg-white">
        {header}
        <div className="max-w-xl mx-auto px-6 py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 mx-auto flex items-center justify-center text-3xl">
            🧹
          </div>
          <h2 className="mt-4 text-lg font-black text-gray-900">
            {branding.appCleanName} is coming soon
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            We're getting our cleaning team ready. Check back shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-28">
      {header}

      <div className="max-w-xl mx-auto px-4">
        {/* Hero. The only image on the page that competes with first paint. */}
        <div className="relative mt-3 rounded-3xl overflow-hidden bg-emerald-50">
          <img
            src={HERO_IMAGE}
            alt=""
            width={768}
            height={432}
            decoding="async"
            fetchPriority="high"
            className="w-full h-40 sm:h-48 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h2 className="text-white font-black text-lg leading-tight">{branding.cleanHeroTitle}</h2>
            <p className="text-white/85 text-xs font-medium mt-1">{branding.cleanHeroBody}</p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { icon: ShieldCheck, label: 'Verified pros' },
            { icon: Sparkles, label: 'Supplies included' },
            { icon: Wallet, label: 'Pay after service' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 text-center bg-emerald-50/60 border border-emerald-100 rounded-2xl px-2 py-3"
            >
              <Icon className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-900 leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-4 pb-1">
            <button
              onClick={() => setCategory('all')}
              className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer ${
                category === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer ${
                  category === c
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        )}

        {/* Services */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        ) : failed ? (
          <div className="text-center py-16 px-6">
            <p className="text-sm font-bold text-gray-800">We couldn't load our services</p>
            <p className="text-xs text-gray-500 mt-1">
              Please check your connection and try again
              {branding.supportPhone ? ', or call us.' : '.'}
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-sm font-bold text-gray-800">Nothing here just yet</p>
            <p className="text-xs text-gray-500 mt-1">New cleaning services are on the way.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {visible.map((service) => (
              <article
                key={service.id}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-gray-50">
                  {service.image && (
                    <img
                      src={cleanImageUrl(service.image)}
                      alt={service.name}
                      width={320}
                      height={240}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  )}
                </div>

                <div className="p-2.5 flex-1 flex flex-col">
                  <h3 className="text-[13px] font-black text-gray-900 leading-snug line-clamp-2">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                      {service.description}
                    </p>
                  )}

                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900">₹{service.price}</p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {formatDuration(service.duration)}
                      </p>
                    </div>
                    <button
                      onClick={() => setBooking(service)}
                      className="shrink-0 text-[11px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-full active:scale-95 transition-transform cursor-pointer"
                    >
                      Book
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {booking && (
        <MMCleanBookingSheet
          service={booking}
          branding={branding}
          onClose={() => setBooking(null)}
        />
      )}
    </div>
  );
}
