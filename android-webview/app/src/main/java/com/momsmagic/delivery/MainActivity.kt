package com.momsmagic.delivery

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.lifecycle.lifecycleScope
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch
import org.json.JSONObject
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import com.minto.food.R

/**
 * MainActivity - Loads the Mom's Magic web app (https://momsmagic.shop) inside a WebView.
 * Handles GPS permission, JavaScript bridge, external Intents (WhatsApp, tel, UPI, intent://),
 * Razorpay popups, the offline screen and renderer crashes.
 *
 * Which URLs stay in the app:
 *  - https://momsmagic.shop and https://www.momsmagic.shop (exact hosts). Only these pages
 *    get the AndroidBridge, geolocation and the Google ID token.
 *  - https *.razorpay.com, and while the main WebView is already showing a non-app https
 *    page (Razorpay -> bank / 3DS redirect chain), further https pages, so the payment
 *    returns to the checkout. Those pages never get the bridge.
 *  - Popups (window.open) whose first page is Razorpay or the app: they open over the app so
 *    checkout.js keeps its opener and its handler runs. Any other popup (target=_blank links
 *    such as wa.me, maps, play.google.com) is sent to the system and closed.
 *  - Everything else, and every non-http scheme (tel:, upi:, intent://, whatsapp:), goes out.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var container: FrameLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var webView: WebView
    private var popup: WebView? = null
    private var geoCallback: GeolocationPermissions.Callback? = null
    private var geoOrigin: String? = null
    private var locationDialog: AlertDialog? = null

    /** True while the main WebView shows an app page; read by the bridge on its own thread. */
    @Volatile private var bridgeAllowed = false

    /** The app page that failed to load (Retry reloads it); null when none or not an app page. */
    private var failedUrl: String? = null
    /** Set by Retry: once an app page loads, drop the failed entry and the offline page from history. */
    private var clearHistoryOnLoad = false

    companion object {
        private const val LOCATION_PERMISSION_CODE = 1001
        private const val NOTIFICATION_PERMISSION_CODE = 1002
        private const val START_URL = "https://momsmagic.shop/"
        private const val OFFLINE_URL = "file:///android_asset/offline.html"
        private const val RETRY_URL = "momsmagic://retry"
        private const val STATE_URL = "current_url"
        private val APP_HOSTS = setOf("momsmagic.shop", "www.momsmagic.shop")

        private fun isAppUrl(url: String?): Boolean {
            val uri = url?.let { Uri.parse(it) } ?: return false
            return uri.scheme == "https" && uri.host?.lowercase() in APP_HOSTS
        }

        private fun isRazorpayHost(host: String?): Boolean {
            val h = host?.lowercase() ?: return false
            return h == "razorpay.com" || h.endsWith(".razorpay.com")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Edge-to-edge on every version (forced from targetSdk 35); dark icons on the pink page.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.BLACK),
            navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.BLACK)
        )

        container = FrameLayout(this).apply { setBackgroundColor(0xFFFFF5F7.toInt()) }
        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progressTintList = android.content.res.ColorStateList.valueOf(0xFFE11D48.toInt())
            visibility = View.GONE
        }
        webView = createWebView()
        container.addView(webView, matchParent())
        container.addView(
            progressBar,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, (3 * resources.displayMetrics.density).toInt())
        )
        setContentView(container)

        // Keep the page clear of the status bar, notch, gesture bar and keyboard.
        ViewCompat.setOnApplyWindowInsetsListener(container) { v, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
            WindowInsetsCompat.CONSUMED
        }

        // Order-status notifications (see OrderMessagingService, /api/notify-order).
        OrderMessagingService.ensureChannel(this)
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            OrderMessagingService.saveToken(this, token)
        }

        // Modern OnBackPressedCallback handling
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val p = popup
                when {
                    p != null -> if (p.canGoBack()) p.goBack() else closePopup()
                    // Going back from the offline page lands on the failed entry, which fails
                    // again and reloads the offline page: leave instead.
                    webView.url == OFFLINE_URL -> finish()
                    webView.canGoBack() -> webView.goBack()
                    else -> finish()
                }
            }
        })

        // Load the order a tapped notification points at, else the page shown before the
        // system recreated the activity, else the entry point.
        val notificationUrl = urlFromIntent(intent)
        val savedUrl = savedInstanceState?.getString(STATE_URL)?.takeIf { isAppUrl(it) }
        webView.loadUrl(notificationUrl ?: savedUrl ?: START_URL)
    }

    // Only the current app URL: the whole back/forward list (WebView.saveState) can exceed
    // the Binder limit and crash with TransactionTooLargeException on Android 7+.
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.url?.takeIf { isAppUrl(it) }?.let { outState.putString(STATE_URL, it) }
    }

    override fun onDestroy() {
        geoCallback = null
        locationDialog?.dismiss()
        closePopup()
        webView.destroy()
        super.onDestroy()
    }

    private fun matchParent() = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
    )

    @SuppressLint("SetJavaScriptEnabled")
    private fun applySettings(view: WebView) {
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString = "$userAgentString MomsMagicApp"
        }
        // Razorpay's checkout iframe (api.razorpay.com inside the app page) needs its cookies.
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, true)
    }

    /** Builds the main WebView. Also used to replace it after its renderer dies. */
    private fun createWebView(): WebView {
        val view = WebView(this)
        applySettings(view)
        view.settings.apply {
            setGeolocationEnabled(true)
            // Razorpay opens bank / 3DS / wallet pages with window.open: see onCreateWindow.
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
        }

        // JavaScript interface bridge (each method checks bridgeAllowed)
        view.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        view.webChromeClient = object : WebChromeClient() {
            // Handle geolocation permission requests from WebView (app pages only)
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                if (!isAppUrl(origin)) {
                    callback?.invoke(origin, false, false)
                    return
                }
                geoOrigin = origin
                geoCallback = callback
                if (hasLocationPermission()) {
                    resolveGeo(true)
                } else {
                    showLocationDisclosure()
                }
            }

            override fun onGeolocationPermissionsHidePrompt() {
                locationDialog?.dismiss()
                locationDialog = null
                geoCallback = null
            }

            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
            }

            override fun onCreateWindow(
                view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message
            ): Boolean {
                if (!isAppUrl(view.url)) return false
                return openPopup(resultMsg)
            }

            override fun onCloseWindow(window: WebView) {
                if (window === popup) closePopup()
            }
        }

        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView, request: WebResourceRequest
            ): Boolean {
                val uri = request.url
                val scheme = uri.scheme?.lowercase()

                // The offline screen's Retry button
                if (uri.toString() == RETRY_URL) {
                    if (view.url == OFFLINE_URL) {
                        clearHistoryOnLoad = true
                        view.loadUrl(failedUrl ?: START_URL)
                    }
                    return true
                }
                if (scheme == "about") return false
                if (scheme == "http" || scheme == "https") {
                    // Iframes (e.g. Razorpay checkout inside the app page) load normally.
                    if (!request.isForMainFrame) return false
                    if (keepInMainWebView(view, uri)) return false
                }
                // External links (WhatsApp, Phone, UPI, Intent, Play Store) -> Open externally.
                // Always handled here so the WebView never shows ERR_UNKNOWN_URL_SCHEME.
                openExternally(uri)
                return true
            }

            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                bridgeAllowed = isAppUrl(url)
            }

            override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
                bridgeAllowed = isAppUrl(url)
            }

            override fun onPageFinished(view: WebView, url: String?) {
                // After a successful Retry, Back must not return to the offline page or the
                // failed entry behind it.
                if (clearHistoryOnLoad && isAppUrl(url)) {
                    clearHistoryOnLoad = false
                    failedUrl = null
                    view.clearHistory()
                }
            }

            // No network / DNS failure on the page itself: show the bundled offline screen
            // instead of Chrome's error page.
            override fun onReceivedError(
                view: WebView, request: WebResourceRequest, error: WebResourceError
            ) {
                if (request.isForMainFrame && request.url.toString() != OFFLINE_URL) {
                    failedUrl = request.url.toString().takeIf { isAppUrl(it) }
                    view.loadUrl(OFFLINE_URL)
                }
            }

            // Low-RAM phones kill the renderer; without this the whole app would crash.
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                if (view === popup) {
                    closePopup()
                    return true
                }
                if (view !== webView) return true
                closePopup()
                container.removeView(webView)
                webView.destroy()
                webView = createWebView()
                container.addView(webView, 0, matchParent())
                clearHistoryOnLoad = false
                webView.loadUrl(START_URL)
                return true
            }
        }
        return view
    }

    /** See the class comment for the rule. */
    private fun keepInMainWebView(view: WebView, uri: Uri): Boolean {
        if (uri.scheme != "https") return false
        val host = uri.host?.lowercase()
        if (host in APP_HOSTS || isRazorpayHost(host)) return true
        // Mid-payment: the page shown is Razorpay or a bank page, so keep its redirect chain.
        val current = view.url?.let { Uri.parse(it) } ?: return false
        return current.scheme == "https" && current.host?.lowercase() !in APP_HOSTS
    }

    /** A window.open from an app page (Razorpay bank / 3DS / wallet window) shown over the app. */
    private fun openPopup(resultMsg: Message): Boolean {
        closePopup()
        val child = WebView(this)
        applySettings(child)
        // Set once the popup has shown a Razorpay or app page; any https page may follow.
        var trusted = false

        fun leaveIfUntrusted(target: WebView, uri: Uri): Boolean {
            val scheme = uri.scheme?.lowercase()
            if (scheme == "about") return false
            if (scheme != "http" && scheme != "https") {
                openExternally(uri)
                // A popup opened straight onto tel:, upi:, intent://... has nothing to show:
                // close it like the untrusted-https case. A trusted (Razorpay) popup stays open.
                if (!trusted) {
                    target.stopLoading()
                    container.post { if (target === popup) closePopup() }
                }
                return true
            }
            val host = uri.host?.lowercase()
            if (trusted || (scheme == "https" && (host in APP_HOSTS || isRazorpayHost(host)))) {
                trusted = true
                return false
            }
            // A normal target=_blank link (wa.me, maps, play.google.com): send it out.
            target.stopLoading()
            openExternally(uri)
            // Not from inside the popup's own callback: destroy it on the next frame.
            container.post { if (target === popup) closePopup() }
            return true
        }

        child.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) {
                    val s = request.url.scheme?.lowercase()
                    if (s == "http" || s == "https") return false
                    openExternally(request.url)
                    return true
                }
                return leaveIfUntrusted(view, request.url)
            }

            // The popup's first load does not always pass through shouldOverrideUrlLoading.
            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                if (url != null && !trusted) leaveIfUntrusted(view, Uri.parse(url))
            }

            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                if (view === popup) closePopup()
                return true
            }
        }
        child.webChromeClient = object : WebChromeClient() {
            override fun onCloseWindow(window: WebView) {
                if (window === popup) closePopup()
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?, callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, false, false)
            }
        }

        popup = child
        container.addView(child, container.indexOfChild(progressBar), matchParent())
        val transport = resultMsg.obj as? WebView.WebViewTransport ?: run {
            closePopup()
            return false
        }
        transport.webView = child
        resultMsg.sendToTarget()
        return true
    }

    private fun closePopup() {
        val p = popup ?: return
        popup = null
        container.removeView(p)
        p.stopLoading()
        p.destroy()
    }

    // A notification tapped while the app is already open.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        urlFromIntent(intent)?.let {
            closePopup()
            webView.loadUrl(it)
        }
    }

    /** Only site-relative paths ("/track/123") are accepted, never another host. */
    private fun urlFromIntent(intent: Intent?): String? {
        val path = try {
            intent?.getStringExtra(OrderMessagingService.EXTRA_URL)
        } catch (e: Exception) {
            null // malformed extras from another app
        } ?: return null
        if (!path.startsWith("/") || path.startsWith("//")) return null
        return START_URL.trimEnd('/') + path
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_PERMISSION_CODE)
    }

    /** Answers the page's pending location request, once. */
    private fun resolveGeo(granted: Boolean) {
        geoCallback?.invoke(geoOrigin, granted, false)
        geoCallback = null
    }

    /**
     * Prominent disclosure dialog required by Google Play policy before requesting location.
     * Shown only when the page asks (the customer tapped "Use my current location").
     */
    private fun showLocationDisclosure() {
        if (locationDialog?.isShowing == true) return
        var allowed = false
        locationDialog = AlertDialog.Builder(this)
            .setTitle("Location Permission Needed")
            .setMessage("Mom's Magic collects location data to check that your delivery address is inside our Yellapur service area, calculate the delivery charge and guide your rider. Location is used only while you use the app.")
            .setPositiveButton("Allow") { _, _ ->
                allowed = true
                requestLocationPermission()
            }
            .setNegativeButton("Not Now") { _, _ -> resolveGeo(false) }
            .setOnCancelListener { resolveGeo(false) }
            .setOnDismissListener {
                locationDialog = null
                if (!allowed) resolveGeo(false)
            }
            .setCancelable(true)
            .show()
    }

    /**
     * Opens intent://, whatsapp://, tel:, mailto:, upi: and other external URLs in system apps.
     * Never throws: a bad link shows a toast instead of crashing the app.
     */
    private fun openExternally(uri: Uri) {
        try {
            if (uri.scheme.equals("intent", ignoreCase = true)) {
                val intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME).apply {
                    // Same restrictions Chrome applies: no explicit component, browsable targets only.
                    addCategory(Intent.CATEGORY_BROWSABLE)
                    component = null
                    selector = null
                }
                try {
                    startActivity(intent)
                } catch (e: ActivityNotFoundException) {
                    // Fallback URL if target app is not installed
                    val fallback = intent.getStringExtra("browser_fallback_url")?.let { Uri.parse(it) }
                    val fs = fallback?.scheme?.lowercase()
                    when {
                        fallback == null || (fs != "https" && fs != "http") -> noAppToast()
                        isAppUrl(fallback.toString()) -> webView.loadUrl(fallback.toString())
                        else -> startActivity(Intent(Intent.ACTION_VIEW, fallback).addCategory(Intent.CATEGORY_BROWSABLE))
                    }
                }
                return
            }
            if (uri.scheme.equals("file", ignoreCase = true)) return
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (e: ActivityNotFoundException) {
            noAppToast()
        } catch (e: Exception) {
            noAppToast()
        }
    }

    private fun noAppToast() {
        Toast.makeText(this, "No app available to open this link", Toast.LENGTH_SHORT).show()
    }

    /** Precise or approximate: either is enough for the delivery-area check. */
    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestLocationPermission() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ),
            LOCATION_PERMISSION_CODE
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_PERMISSION_CODE) {
            val granted = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
            resolveGeo(granted)
            if (!granted) {
                Toast.makeText(this, "Location permission is needed for delivery", Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * Google refuses OAuth inside a WebView (403 disallowed_useragent), so the web app's
     * signInWithPopup cannot work here. Sign in natively with Credential Manager and hand
     * the Google ID token back to the page, which signs into Firebase with it.
     *
     * The server client ID is the Web client ID of the SAME Firebase project the website
     * uses (momsmagic-d131a). It comes from google-services.json (default_web_client_id).
     */
    private fun signInWithGoogle() {
        val option = GetSignInWithGoogleOption.Builder(getString(R.string.default_web_client_id)).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()

        lifecycleScope.launch {
            try {
                val credential = CredentialManager.create(this@MainActivity)
                    .getCredential(this@MainActivity, request).credential
                if (credential is CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                    sendGoogleSignInResult(JSONObject().put("idToken", idToken))
                } else {
                    sendGoogleSignInResult(JSONObject().put("error", "Unexpected credential type"))
                }
            } catch (e: GetCredentialCancellationException) {
                sendGoogleSignInResult(JSONObject().put("error", "cancelled"))
            } catch (e: GetCredentialException) {
                sendGoogleSignInResult(JSONObject().put("error", e.message ?: "Google Sign-In failed"))
            } catch (e: Exception) {
                sendGoogleSignInResult(JSONObject().put("error", e.message ?: "Google Sign-In failed"))
            }
        }
    }

    /** The ID token only ever goes to an app page (the user may have navigated meanwhile). */
    private fun sendGoogleSignInResult(detail: JSONObject) {
        if (!isAppUrl(webView.url)) return
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('native-google-signin', { detail: $detail }));",
            null
        )
    }

    /**
     * JavaScript bridge - called by the web app. Serves only momsmagic.shop pages:
     * every method is a no-op while the main WebView shows any other page.
     */
    inner class AndroidBridge {
        /** FCM token for this install, stored on each order so its status updates reach this phone. */
        @JavascriptInterface
        fun getPushToken(): String =
            if (bridgeAllowed) OrderMessagingService.savedToken(this@MainActivity) ?: "" else ""

        /** Asked when the customer places an order, the moment updates are wanted. */
        @JavascriptInterface
        fun requestNotificationPermission() {
            if (!bridgeAllowed) return
            runOnUiThread { this@MainActivity.requestNotificationPermission() }
        }

        @JavascriptInterface
        fun signInWithGoogle() {
            if (!bridgeAllowed) return
            runOnUiThread { this@MainActivity.signInWithGoogle() }
        }

        @JavascriptInterface
        fun onLocationSelected(lat: Double, lng: Double, address: String, distance: Double, deliverable: Boolean) {
            if (!bridgeAllowed) return
            runOnUiThread {
                val status = if (deliverable) "Deliverable" else "Out of Range"
                Toast.makeText(
                    this@MainActivity,
                    "📍 $address\n📏 ${distance}km - $status",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }

        @JavascriptInterface
        fun onLocationConfirmed(lat: Double, lng: Double, address: String) {
            if (!bridgeAllowed) return
            runOnUiThread {
                Toast.makeText(
                    this@MainActivity,
                    "✅ Delivery location confirmed!\n$address",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }
}
