// Sends an order/booking notification to the Telegram order channel.
//
// This always goes through the server function at /api/send-telegram, which
// holds the bot token. Checkout, CelebrationHub and CelebrationDesign each used
// to keep a copy of the token and fall back to calling api.telegram.org from
// the browser -- which shipped the token to every visitor, letting anyone read
// it out of the bundle and take over the bot. The fallback is gone; a failed
// send is retried against the proxy instead.

const ENDPOINT = '/api/send-telegram';
const TIMEOUT_MS = 8000;
const ATTEMPTS = 2;

function postOnce(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    // AbortSignal.timeout is missing on older iOS Safari, so the timeout is a
    // plain timer that resolves false rather than aborting the request.
    const timer = setTimeout(() => resolve(false), TIMEOUT_MS);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      keepalive: true,
    })
      .then((response) => {
        clearTimeout(timer);
        resolve(response.ok);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

/**
 * Posts `text` (Telegram HTML) to the order channel.
 * Never throws: a failed notification must not block the customer's order,
 * which is also being sent over WhatsApp.
 */
export async function notifyTelegram(text: string): Promise<boolean> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (await postOnce(text)) return true;
  }
  console.error('Telegram notification failed after', ATTEMPTS, 'attempts');
  return false;
}
