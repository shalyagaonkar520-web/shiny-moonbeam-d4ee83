import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';

/**
 * The JIS Kitchen kill switch.
 *
 * JIS writes `system/settings`, and this closes the whole storefront when it
 * does. Kept separate from OperatingHoursGate on purpose: that one is about
 * opening hours, this is a deliberate "we are shut" that has to work whatever
 * the clock says.
 *
 * Checkout already refuses to submit while the site is off, so this is the
 * visible half of a rule the backend enforces regardless.
 */
export default function SiteClosedGate({ children }: { children: React.ReactNode }) {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!firebaseReady) return;
    const unsub = onSnapshot(
      doc(db, 'system', 'settings'),
      (snap) => {
        const d: any = snap.data() || {};
        setClosed(d.websiteStatus === 'OFF' || d.emergencyStop === true);
      },
      // A read failure must never close a working shop.
      () => setClosed(false)
    );
    return () => unsub();
  }, []);

  if (!closed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5 text-center">
      <div className="max-w-sm space-y-4">
        <div className="text-6xl">🍽️</div>
        <h1 className="text-2xl font-black text-on-background">
          We're closed right now
        </h1>
        <p className="text-on-surface-variant">
          Mom's Magic is not taking orders at the moment. Please check back a
          little later — we'll be right here.
        </p>
        <a
          href="tel:+919606001790"
          className="inline-block px-6 py-3 rounded-2xl bg-primary text-white font-bold"
        >
          Call us
        </a>
      </div>
    </div>
  );
}
