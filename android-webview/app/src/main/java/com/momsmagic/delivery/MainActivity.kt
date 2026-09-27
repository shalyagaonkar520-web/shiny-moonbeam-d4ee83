package com.momsmagic.delivery

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
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
 * MainActivity - Loads the delivery location HTML map / web app inside a WebView.
 * Handles GPS permission, JavaScript bridge, external Intents (WhatsApp, tel, mailto),
 * and geolocation for WebView.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var geoCallback: GeolocationPermissions.Callback? = null
    private var geoOrigin: String? = null

    companion object {
        private const val LOCATION_PERMISSION_CODE = 1001
        private const val NOTIFICATION_PERMISSION_CODE = 1002
        private const val START_URL = "https://momsmagic.shop/"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Status bar theme
        window.statusBarColor = 0xFF0B0E14.toInt()

        webView = WebView(this)
        setContentView(webView)

        // Order-status notifications (see OrderMessagingService, /api/notify-order).
        OrderMessagingService.ensureChannel(this)
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            OrderMessagingService.saveToken(this, token)
        }

        // WebView settings
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            setGeolocationEnabled(true)
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString = "$userAgentString MomsMagicApp"
        }

        // JavaScript interface bridge
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        // Handle geolocation permission requests from WebView
        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                geoOrigin = origin
                geoCallback = callback
                if (hasLocationPermission()) {
                    callback?.invoke(origin, true, false)
                } else {
                    showLocationDisclosure()
                }
            }
        }

        // Handle external URLs (WhatsApp, tel:, mailto:, intent://)
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView, request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()

                // Local assets or app domain stay inside WebView
                if (url.startsWith("file://") || url.contains("momsmagic.shop")) {
                    return false
                }

                // External links (WhatsApp, Phone, Intent, Play Store) -> Open externally
                return openExternally(url)
            }
        }

        // Modern OnBackPressedCallback handling
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // Request location permission upfront with prominent disclosure if needed
        if (!hasLocationPermission()) {
            showLocationDisclosure()
        }

        // Load entry point, or the order a tapped notification points at
        webView.loadUrl(urlFromIntent(intent) ?: START_URL)
    }

    // A notification tapped while the app is already open.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        urlFromIntent(intent)?.let { webView.loadUrl(it) }
    }

    /** Only site-relative paths ("/track/123") are accepted, never another host. */
    private fun urlFromIntent(intent: Intent?): String? {
        val path = intent?.getStringExtra(OrderMessagingService.EXTRA_URL) ?: return null
        if (!path.startsWith("/") || path.startsWith("//")) return null
        return START_URL.trimEnd('/') + path
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_PERMISSION_CODE)
    }

    /**
     * Prominent disclosure dialog required by Google Play policy before requesting location.
     */
    private fun showLocationDisclosure() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Location Permission Needed")
            .setMessage("Mom's Magic collects location data to check that your delivery address is inside our Yellapur service area, calculate the delivery charge and guide your rider. Location is used only while you use the app.")
            .setPositiveButton("Allow") { _, _ ->
                requestLocationPermission()
            }
            .setNegativeButton("Not Now") { dialog, _ ->
                dialog.dismiss()
            }
            .setCancelable(true)
            .show()
    }

    /**
     * Opens intent://, whatsapp://, tel:, mailto: and other external URLs in system apps.
     */
    private fun openExternally(url: String): Boolean {
        try {
            if (url.startsWith("intent://")) {
                val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                if (intent.resolveActivity(packageManager) != null) {
                    startActivity(intent)
                    return true
                }
                // Fallback URL if target app is not installed
                val fallback = intent.getStringExtra("browser_fallback_url")
                if (fallback != null) {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(fallback)))
                    return true
                }
                return true
            }
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            return true
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(this, "No app available to open this link", Toast.LENGTH_SHORT).show()
            return false
        }
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
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
            val granted = grantResults.isNotEmpty() &&
                    grantResults[0] == PackageManager.PERMISSION_GRANTED
            geoCallback?.invoke(geoOrigin, granted, false)
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

    private fun sendGoogleSignInResult(detail: JSONObject) {
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('native-google-signin', { detail: $detail }));",
            null
        )
    }

    /**
     * JavaScript bridge - receives data from the HTML/JS map.
     */
    inner class AndroidBridge {
        /** FCM token for this install, stored on each order so its status updates reach this phone. */
        @JavascriptInterface
        fun getPushToken(): String = OrderMessagingService.savedToken(this@MainActivity) ?: ""

        /** Asked when the customer places an order, the moment updates are wanted. */
        @JavascriptInterface
        fun requestNotificationPermission() {
            runOnUiThread { this@MainActivity.requestNotificationPermission() }
        }

        @JavascriptInterface
        fun signInWithGoogle() {
            runOnUiThread { this@MainActivity.signInWithGoogle() }
        }

        @JavascriptInterface
        fun onLocationSelected(lat: Double, lng: Double, address: String, distance: Double, deliverable: Boolean) {
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
