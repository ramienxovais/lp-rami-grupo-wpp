/**
 * Vercel Serverless Function — Meta Conversions API
 * Endpoint: POST /api/conversion
 *
 * Recebe eventos do frontend e os encaminha para a
 * Meta Conversions API com o token seguro (env var).
 */

const PIXEL_ID     = '1319527588570699';
const GRAPH_URL    = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;
const ACCESS_TOKEN = process.env.META_API_TOKEN;

export default async function handler(req, res) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — permite chamadas da própria origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const {
    event_name = 'Lead',
    event_id,
    event_source_url,
    fbc,
    fbp,
  } = req.body || {};

  // IP real considerando proxies/Vercel
  const client_ip_address =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '';

  const client_user_agent = req.headers['user-agent'] || '';

  const payload = {
    data: [
      {
        event_name,
        event_time:       Math.floor(Date.now() / 1000),
        event_id:         event_id || undefined,
        action_source:    'website',
        event_source_url: event_source_url || '',
        user_data: {
          client_ip_address,
          client_user_agent,
          ...(fbc ? { fbc } : {}),
          ...(fbp ? { fbp } : {}),
        },
      },
    ],
    access_token: ACCESS_TOKEN,
  };

  try {
    const metaRes  = await fetch(GRAPH_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await metaRes.json();

    if (!metaRes.ok) {
      console.error('[Meta CAPI] Erro:', JSON.stringify(data));
      return res.status(metaRes.status).json({ error: data });
    }

    return res.status(200).json({ ok: true, meta: data });
  } catch (err) {
    console.error('[Meta CAPI] Exceção:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
