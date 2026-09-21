// Opens a link that must leave the app: WhatsApp, a phone dialler, email.
//
// This is the difference between an order being sent and an order being lost
// once the site is wrapped as an Android app.
//
// In a normal browser `window.open(url, '_blank')` is enough. Inside an Android
// WebView it is not:
//   - `window.open` returns null unless setSupportMultipleWindows is on, so code
//     that checks the return value and falls back to `location.href` ends up
//     navigating the WebView itself.
//   - Navigating to https://wa.me/... then loads WhatsApp's *web page* inside
//     the WebView. The customer sees a "Continue to Chat" page, often a login
//     wall, and never reaches the WhatsApp app. The order is simply lost.
//
// So on Android we hand the OS an `intent://` URL naming the WhatsApp package,
// which the system resolves to the installed app and which falls back to Play
// Store if it is missing. Anywhere else we open normally. The WebView still
// needs shouldOverrideUrlLoading to forward intent:// to the OS -- see
// ANDROID.md -- but this is the half that has to live in the web app.

/** Android WebView, including Custom Tabs and TWA shells. */
function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

/**
 * Builds an Android intent URL for a wa.me link.
 * `https://wa.me/919606001790?text=Hi` becomes an intent that opens the
 * WhatsApp app directly with the message prefilled.
 */
function whatsAppIntent(url: string): string | null {
  const match = url.match(/^https?:\/\/(?:api\.whatsapp\.com\/send|wa\.me)\/?\??(.*)$/i);
  if (!match) return null;

  let phone = '';
  let text = '';
  try {
    const parsed = new URL(url);
    if (/wa\.me$/i.test(parsed.hostname)) {
      phone = parsed.pathname.replace(/\//g, '');
      text = parsed.searchParams.get('text') || '';
    } else {
      phone = parsed.searchParams.get('phone') || '';
      text = parsed.searchParams.get('text') || '';
    }
  } catch {
    return null;
  }
  if (!phone) return null;

  // S.browser_fallback_url sends anyone without WhatsApp to the normal web link
  // instead of showing an error page.
  const fallback = encodeURIComponent(url);
  const query = `send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
  return (
    `intent://${query}#Intent;scheme=whatsapp;package=com.whatsapp;` +
    `S.browser_fallback_url=${fallback};end`
  );
}

/**
 * Sends the user to `url` outside the app.
 *
 * Returns nothing and never throws: the caller has already told the customer
 * their order is placed, so a failure here must not surface as a crash.
 */
export function openExternal(url: string): void {
  const target = (isAndroid() && whatsAppIntent(url)) || url;

  // A synthesised anchor click is handled by every WebView configuration,
  // including ones where window.open is disabled.
  try {
    const link = document.createElement('a');
    link.href = target;
    link.rel = 'noopener noreferrer';
    // intent:// must stay in the same frame or the OS never sees it.
    if (target === url) link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  } catch {
    /* fall through */
  }

  try {
    const opened = window.open(target, '_blank');
    if (opened) return;
  } catch {
    /* fall through */
  }

  window.location.href = target;
}
