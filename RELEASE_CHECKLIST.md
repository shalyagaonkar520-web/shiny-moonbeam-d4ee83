# Play Store release checklist

Steps that need a person with access to Vercel, Firebase, Razorpay and Play Console. Do them in this order. The app keeps working if any are skipped (it falls back to the old behaviour), but those protections stay off until each step is done.

## 1. Secrets (do first)

- [ ] **Rotate the Razorpay key secret.** The old live secret is in this public repo's git history, so treat it as leaked. Razorpay Dashboard → Settings → API Keys → Regenerate.
- [ ] **Rotate `ADMIN_API_TOKEN`** (any long random value).

## 2. Vercel → Project → Settings → Environment Variables

| Variable | Where it comes from | Needed for |
|---|---|---|
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase console → Project settings → Service accounts → Generate new private key | server-priced orders, payment verification, live tracking, order alerts, ratings, admin login |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay → API Keys (the **new** secret) | online payments created and verified on the server |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you type in step 3 | payments completing when Android kills the app during UPI |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | your existing bot | kitchen order messages, ratings |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_API_TOKEN` | you choose | admin panel login |

Redeploy after saving them.

## 3. Razorpay webhook

- [ ] Razorpay Dashboard → Settings → Webhooks → Add: URL `https://momsmagic.shop/api/razorpay-webhook`, events **payment.captured** and **order.paid**, secret = `RAZORPAY_WEBHOOK_SECRET`.

## 4. Firestore rules

- [ ] In `firestore.rules`, replace `PUT-YOUR-ADMIN-UID-HERE` only if you also sign in to the admin panel with a normal Firebase account; the admin login now signs in with an `admin` claim, which the rules accept.
- [ ] Run `npm run test:rules` (32 checks against the local emulator; needs Java), then publish with `npx firebase-tools deploy --only firestore:rules --project momsmagic-d131a`. The deployed rules differ from this file today, so compare them in the Firebase console first.
- [ ] After publishing, guests can no longer read orders straight from Firestore. Tracking already goes through `/api/track`, so step 2 (Firebase credentials on Vercel) must be done first.

## 5. Google sign-in in the Play Store app

- [ ] Play Console → your app → Test and release → App integrity → App signing: copy the **App signing key** SHA-1 and SHA-256.
- [ ] Firebase console → momsmagic-d131a → Project settings → Android app `com.minto.food` → Add fingerprint (both). Without this, Google sign-in fails for everyone who installs from Play.

## 6. Play Console listing

- [ ] Privacy policy URL: `https://momsmagic.shop/privacy`
- [ ] Delete account URL: `https://momsmagic.shop/delete-account`
- [ ] Data safety: the app collects name, phone, email (if signed in), precise location (while using the app), order history, and a push token. No advertising ID is collected (it was removed), and no data is sold.
- [ ] Upload `android-webview/app/build/outputs/bundle/release/app-release.aab` (build with Android Studio's JDK: `export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"` then `./gradlew :app:bundleRelease` in `android-webview/`).

## 7. Test on a real phone before going live

Use an internal testing track. On the release build, check:

- [ ] Location: Allow, Not Now, Approximate, and "Select location manually"
- [ ] Order with Cash on Delivery → kitchen gets the Telegram message and WhatsApp opens
- [ ] Pay online with UPI (GPay/PhonePe), a card with OTP, and netbanking → order shows as PAID
- [ ] Airplane mode → offline screen → Retry
- [ ] Google sign-in, order status notifications, and tapping a notification opens tracking
- [ ] Rider app: Accept → Start → Complete; the customer's map shows the rider; the rider's earnings go up by ₹40 once (credited by the server for deliveries from 27 Sep 2026 on)

## Checks you can run any time

```bash
npm test            # server pricing, coupons, payment signatures
npm run test:rules  # Firestore security rules in the emulator (needs Java)
npm run dev         # then, in another terminal:
npm run test:e2e    # checkout end to end, everything external mocked
```
