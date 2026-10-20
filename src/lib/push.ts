// Order-status push notifications, customer side and staff side.
//
// In a browser the token comes from web push (requestForToken in firebase.ts).
// Inside the Android app web push does not exist, so the native shell gets an
// FCM token itself and hands it over through AndroidBridge.

type PushBridge = {
  getPushToken?: () => string;
  requestNotificationPermission?: () => void;
};

const TOKEN_KEY = 'mintoo_push_token';

function bridge(): PushBridge | undefined {
  return (window as unknown as { AndroidBridge?: PushBridge }).AndroidBridge;
}

export function rememberWebPushToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

/** The token to store on an order so its status updates reach this device, or null. */
export function getOrderPushToken(): string | null {
  try {
    const native = bridge()?.getPushToken?.();
    if (native) return native;
  } catch {
    /* older app build without the method */
  }
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Ask for notification permission at the moment it makes sense: placing an order. */
export function askForOrderUpdates() {
  try {
    const b = bridge();
    if (b?.requestNotificationPermission) {
      b.requestNotificationPermission();
      return;
    }
  } catch {
    /* ignore */
  }
  import('../firebase').then(({ requestForToken }) => requestForToken()).catch(() => {});
}

/**
 * Tell the backend an order's status just changed. Fire-and-forget: a failed
 * notification must never block the admin or rider from updating the order.
 */
export function notifyOrderStatus(orderId: string) {
  fetch('/api/notify-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
    keepalive: true,
  }).catch(() => {});
}
