// Credentials come from the environment. They were previously hardcoded here
// and in three client components, which published the bot token in the browser
// bundle and in this public repo. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
// in the hosting provider's environment variables.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Without this the fetch below would hit /botundefined/ and fail obscurely.
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not configured');
    return res.status(500).json({ success: false, error: 'Notifications are not configured' });
  }

  try {
    let text;
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        text = parsed.text;
      } catch (e) {}
    } else if (req.body && typeof req.body === 'object') {
      text = req.body.text;
    }

    if (!text) {
      return res.status(400).json({ error: 'Missing message text' });
    }

    const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });

    const tgData = await tgResponse.json();

    if (!tgResponse.ok) {
      console.error('Telegram API error:', tgData);
      return res.status(502).json({ success: false, error: tgData.description || 'Telegram API error' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Telegram send failed:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
