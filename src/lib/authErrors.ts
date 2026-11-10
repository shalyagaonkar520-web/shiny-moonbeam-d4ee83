/**
 * Sign-in errors in words a customer can act on.
 *
 * Unknown codes used to fall through to Firebase's own text ("Firebase:
 * Error (auth/...)"), which reads as a crash. Every code below has its own
 * message; anything else gets a plain message with the short code on the end,
 * so a screenshot is still enough to tell what went wrong.
 */
const MESSAGES: Array<[string[], string]> = [
  [['invalid-credential', 'wrong-password', 'user-not-found', 'invalid-login-credentials'],
    'Incorrect email or password. Please try again or sign in with Google.'],
  [['email-already-in-use'], 'An account already exists with this email. Please switch to Sign In above!'],
  [['weak-password'], 'Password must be at least 6 characters long.'],
  [['invalid-email', 'missing-email'], 'Please enter a valid email address.'],
  [['missing-password'], 'Please enter your password.'],
  [['popup-closed-by-user', 'cancelled-popup-request', 'user-cancelled'], 'Google Sign-In was cancelled.'],
  [['popup-blocked'], 'Your browser blocked the Google window. Allow pop-ups for this site, or sign in with email.'],
  [['unauthorized-domain'], 'Google Sign-In is unavailable on this address. Please open momsmagic.shop or sign in with email.'],
  [['operation-not-allowed', 'admin-restricted-operation'], 'This way of signing in is switched off right now. Please use another option.'],
  [['user-disabled'], 'This account has been switched off. Please contact Minto support.'],
  [['network-request-failed', 'timeout'], 'Network connection issue. Please check your internet connection.'],
  [['too-many-requests'], 'Too many attempts. Please wait a moment and try again.'],
  [['quota-exceeded'], 'Sign-in is busy right now. Please try again in a few minutes.'],
  [['requires-recent-login', 'user-token-expired', 'invalid-user-token'], 'Please sign out and sign in again, then retry.'],
  [['web-storage-unsupported'], 'This browser is blocking sign-in storage. Turn off private mode or allow cookies, then retry.'],
  [['internal-error'], 'Sign-in hit a temporary problem. Please try again.'],
];

export function friendlyAuthError(err: any): string {
  const code = String(err?.code || '');
  for (const [codes, text] of MESSAGES) {
    if (codes.some((c) => code.includes(c))) return text;
  }
  // Our own errors (native Google sign-in, app update needed) carry a
  // readable message already.
  const msg = String(err?.message || '');
  if (msg && !msg.startsWith('Firebase:')) return msg;
  const short = code.replace(/^auth\//, '') || (msg.match(/auth\/([a-z-]+)/)?.[1] ?? '');
  return `Sign-in did not work. Please try again${short ? ` (${short})` : ''}.`;
}
