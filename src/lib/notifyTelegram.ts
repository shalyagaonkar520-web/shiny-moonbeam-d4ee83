// Sends an order/booking notification to the Telegram order channel.
//
// This always goes through the server function at /api/send-telegram, which
// holds the bot token. Checkout, CelebrationHub and CelebrationDesign each used
// to keep a copy of the token and fall back to calling api.telegram.org from
// the browser -- which shipped the token to every visitor, letting anyone read
// it out of the bundle and take over the bot.
//
// A send can still fail for reasons that have nothing to do with the customer:
// a serverless cold start, a dropped mobile connection, or a deploy whose
// TELEGRAM_BOT_TOKEN is not set (which returns 500 for every request). Those
// used to lose the notification silently -- the customer saw "order confirmed"
// and the kitchen never heard about it. Failed messages are now kept in
// localStorage and retried on the next page load, so a temporary outage delays
// notifications instead of dropping orders.

const ENDPOINT = '/api/send-telegram';
const TIMEOUT_MS = 10000;
const ATTEMPTS = 2;
const QUEUE_KEY = 'mm_telegram_outbox';
const MAX_QUEUED = 50;
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

interface QueuedMessage {
  text: string;
  queuedAt: number;
}

function readQueue(): QueuedMessage[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Private-browsing modes and disabled storage both land here. The app must
    // keep working; it just loses the ability to retry.
    return [];
  }
}

function writeQueue(messages: QueuedMessage[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(messages.slice(-MAX_QUEUED)));
  } catch {
    /* storage unavailable or full; nothing else to do */
  }
}

function enqueue(text: string): void {
  const fresh = readQueue().filter((m) => Date.now() - m.queuedAt < MAX_AGE_MS);
  fresh.push({ text, queuedAt: Date.now() });
  writeQueue(fresh);
}

function postOnce(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    // AbortSignal.timeout is missing on older iOS Safari, so the timeout is a
    // plain timer that resolves false rather than aborting the request.
    const timer = setTimeout(() => resolve(false), TIMEOUT_MS);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      // Checkout navigates to WhatsApp about half a second after sending, so
      // the request has to be allowed to outlive the page.
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
 *
 * Never throws: a failed notification must not block the customer's order,
 * which is also being sent over WhatsApp. On failure the message is queued and
 * retried by `flushTelegramOutbox()` on a later page load.
 */
export async function notifyTelegram(text: string): Promise<boolean> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (await postOnce(text)) return true;
  }
  console.error('Telegram notification failed; queued for retry');
  enqueue(text);
  return false;
}

/**
 * Retries anything `notifyTelegram` could not deliver. Called once per app
 * start, while the browser is idle. Messages that still fail stay queued;
 * anything older than MAX_AGE_MS is dropped so the queue cannot grow forever.
 */
export async function flushTelegramOutbox(): Promise<void> {
  const pending = readQueue().filter((m) => Date.now() - m.queuedAt < MAX_AGE_MS);
  if (pending.length === 0) {
    writeQueue([]);
    return;
  }

  const stillFailing: QueuedMessage[] = [];
  for (const message of pending) {
    // One attempt each: if the endpoint is down, retrying here just delays the
    // page. The next page load will try again.
    const sent = await postOnce(message.text);
    if (!sent) stillFailing.push(message);
  }

  writeQueue(stillFailing);
  const delivered = pending.length - stillFailing.length;
  if (delivered > 0) {
    console.info(`Delivered ${delivered} queued Telegram notification(s)`);
  }
}
