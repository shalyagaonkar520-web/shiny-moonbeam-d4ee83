# Keep JavascriptInterface annotations for WebView bridge
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
# The page calls these by name through window.AndroidBridge
-keep class com.momsmagic.delivery.MainActivity$AndroidBridge { *; }

# FCM service is referenced from the manifest (AAPT keeps it); keep it explicit.
-keep class com.momsmagic.delivery.OrderMessagingService { *; }

# Credential Manager: the Play Services provider is loaded by reflection
# (https://developer.android.com/identity/sign-in/credential-manager#proguard)
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** {
  *;
}
