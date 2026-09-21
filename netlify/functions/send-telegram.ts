import { Handler } from '@netlify/functions';

// Credentials come from the environment. They were previously hardcoded here
// and in three client components, which published the bot token in the browser
// bundle and in this public repo. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
// in the hosting provider's environment variables.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Without this the fetch below would hit /botundefined/ and fail obscurely.
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Notifications are not configured' })
    };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing message text' })
      };
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
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ success: false, error: tgData.description || 'Telegram API error' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (err: any) {
    console.error('Telegram send failed:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};
