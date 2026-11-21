import { useEffect, useRef } from 'react';

// One Google AdSense display unit ("ads"). The AdSense script itself is loaded
// from index.html. Rules:
//  - Only on the pages that render <AdUnit />: the bottom of the home page.
//    Never on the menu, cart, checkout or order-tracking screens.
//  - Never inside the Android app: it is this same site in a WebView, and
//    AdSense does not allow ads in an app's WebView.
//  - If Google's script is blocked (ad blocker, offline) nothing is shown and
//    nothing breaks.

const AD_CLIENT = 'ca-pub-7422477829341364';
const AD_SLOT = '9022833991';

/** Same test the sign-in code uses for the Android app's WebView. */
function inAndroidApp(): boolean {
  return typeof navigator !== 'undefined' && /MintoApp|MomsMagicApp|; wv\)/.test(navigator.userAgent);
}

export default function AdUnit() {
  const pushed = useRef(false);
  const hidden = inAndroidApp();

  useEffect(() => {
    if (hidden || pushed.current) return;
    pushed.current = true;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      /* blocked or not approved yet: the slot just stays empty */
    }
  }, [hidden]);

  if (hidden) return null;
  return (
    <aside aria-label="Advertisement" className="my-4 px-1 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
