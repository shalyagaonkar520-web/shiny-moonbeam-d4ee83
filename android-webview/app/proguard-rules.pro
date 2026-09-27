# Keep JavascriptInterface annotations for WebView bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
