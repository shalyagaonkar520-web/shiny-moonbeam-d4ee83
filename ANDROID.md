# Shipping Mom's Magic as an Android app

Two ways to do this. **Pick TWA unless you need something it cannot do.**

| | Trusted Web Activity | WebView |
|---|---|---|
| Rendering | Real Chrome | Android System WebView (older, varies by device) |
| WhatsApp / `tel:` links | Work automatically | Break unless you write the code below |
| Push notifications | Your existing web push works | Needs native FCM |
| Address bar | None | None |
| Play Store | Accepted | Rejected if it is "just a website" |
| Work to maintain | Almost none | The file below, forever |

---

## Option A — Trusted Web Activity (recommended)

The app is a thin shell around Chrome. Orders, WhatsApp hand-off, the service
worker and the install prompt all keep working exactly as they do on the web,
because it *is* the web app.

### 1. Generate the project

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://momsmagic.shop/manifest.webmanifest
bubblewrap build
```

Open the generated folder in Android Studio when you want to change anything.

### 2. Prove you own the domain

Without this the app opens with a Chrome address bar showing, which looks
broken. Get your signing key's fingerprint:

```bash
keytool -list -v -keystore android.keystore -alias android | grep SHA256
```

Put it in `public/.well-known/assetlinks.json` (already in this repo as a
template — replace the placeholder), then deploy. Verify it is live:

```
https://momsmagic.shop/.well-known/assetlinks.json
```

Check it with <https://developers.google.com/digital-asset-links/tools/generator>.

> Vercel serves `public/.well-known/` as-is. Do not let a rewrite rule swallow
> it — if `/.well-known/assetlinks.json` returns your `index.html`, verification
> fails silently and the address bar comes back.

---

## Option B — WebView

If you go this route, the WebView **must** be configured as below. Without
`shouldOverrideUrlLoading`, tapping "Confirm Order" loads WhatsApp's *web page*
inside your app instead of opening WhatsApp, and the order is never sent. The
web app already emits an Android `intent://` URL for WhatsApp (see
`src/lib/openExternal.ts`); this is the other half of the handshake.

### `MainActivity.kt`

```kotlin
package com.momsmagic.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val startUrl = "https://momsmagic.shop/"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            // Without this localStorage throws. The site survives that (it falls
            // back to in-memory storage) but the cart is lost on every reload.
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            // Some sites serve a stripped-down page to WebView user agents.
            userAgentString = "$userAgentString MomsMagicApp"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView, request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()

                // Anything on our own domain stays inside the app.
                if (url.startsWith(startUrl) || request.url.host == "momsmagic.shop") {
                    return false
                }

                // Everything else is for another app: WhatsApp, the dialler,
                // email, the Play Store. Hand it to the system.
                return openExternally(url)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // The delivery address picker needs location.
            override fun onGeolocationPermissionsShowPrompt(
                origin: String, callback: GeolocationPermissions.Callback
            ) {
                callback.invoke(origin, true, false)
            }
        }

        // Hardware back should walk the app's history, not close the app.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        webView.loadUrl(startUrl)
    }

    /** Opens intent://, whatsapp://, tel:, mailto: and any other external link. */
    private fun openExternally(url: String): Boolean {
        try {
            if (url.startsWith("intent://")) {
                val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                if (intent.resolveActivity(packageManager) != null) {
                    startActivity(intent)
                    return true
                }
                // No WhatsApp installed: openExternal.ts put a normal https link
                // in S.browser_fallback_url, so use that.
                intent.getStringExtra("browser_fallback_url")?.let {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(it)))
                    return true
                }
                return true
            }
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            return true
        } catch (e: ActivityNotFoundException) {
            return false   // let the WebView try
        }
    }
}
```

### `AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Android 11+ hides other apps unless you declare them. Without this,
     resolveActivity() returns null and WhatsApp never opens. -->
<queries>
    <package android:name="com.whatsapp" />
    <package android:name="com.whatsapp.w4b" />
    <intent>
        <action android:name="android.intent.action.VIEW" />
        <data android:scheme="https" />
    </intent>
</queries>

<application
    android:usesCleartextTraffic="false"
    android:hardwareAccelerated="true">
    <activity
        android:name=".MainActivity"
        android:exported="true"
        android:configChanges="orientation|screenSize|keyboardHidden"
        android:windowSoftInputMode="adjustResize"
        android:theme="@style/Theme.AppCompat.NoActionBar">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity>
</application>
```

`adjustResize` matters: without it the keyboard covers the name and phone
fields on the checkout form and the customer cannot see what they are typing.

---

## What the web app already does for you

- **`src/lib/openExternal.ts`** turns `https://wa.me/...` into an Android
  `intent://` URL naming `com.whatsapp`, with the plain https link as
  `S.browser_fallback_url`. Every WhatsApp hand-off in the app goes through it:
  checkout, bulk orders, celebration bookings and enquiries, lucky wheel claims,
  feedback and the admin reply button.
- **Safe areas.** `viewport-fit=cover` plus `env(safe-area-inset-*)` on the
  bottom nav and cart bar, so nothing hides under the notch or the gesture bar.
  These are 0 in a browser tab, so the same build is correct everywhere.
- **Storage guard** in `index.html`. If `localStorage` throws — which it does on
  a WebView without `domStorageEnabled` — the app swaps in an in-memory store
  and keeps working instead of showing a blank page.
- **Self-heal watchdog.** If the page has not mounted 12s after load it clears
  the service worker and caches and reloads once, so a stale shell cannot leave
  the app permanently broken.

## Test before you publish

1. Place a real order. WhatsApp must **open as an app**, with the message
   prefilled. If you land on a "Continue to Chat" web page, `shouldOverrideUrlLoading`
   is not wired up.
2. Order once with WhatsApp uninstalled — you should get the web fallback, not
   an error page.
3. Add to cart, background the app, reopen. The cart should survive
   (`domStorageEnabled`).
4. Open `/track/<orderId>` from a notification or link.
5. Check the bottom nav is not under the gesture bar on a phone with gesture
   navigation.
6. Rotate to landscape and back on the checkout form.
