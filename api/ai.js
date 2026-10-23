// AI endpoint for the HTML page builder (index.html). The OpenRouter key stays on the server:
// set OPENROUTER_API_KEY in the hosting environment (Vercel → Settings → Environment Variables), or in
// .env.local for `npm start`. Optional: OPENROUTER_MODELS, a comma-separated list to try in order.
//
//   GET  /api/ai  → { configured }                        lets the editor know whether AI is available
//   POST /api/ai  { system, user, temperature }  → { content, model, name, ms, tokens }

// Free models, best first (tested 2026-10-21 with the page-builder prompt). A busy model makes us try the next one.
const DEFAULT_MODELS = [
  ['nvidia/nemotron-3-ultra-550b-a55b:free', 'NVIDIA Nemotron 3 Ultra'],
  ['cohere/north-mini-code:free', 'Cohere North Mini Code'],
  ['google/gemma-4-31b-it:free', 'Google Gemma 4 31B'],
  ['google/gemma-4-26b-a4b-it:free', 'Google Gemma 4 26B'],
  ['nvidia/nemotron-3.5-lightning:free', 'NVIDIA Nemotron 3.5 Lightning'],
  ['dots-studio/dots-3-note-preview:free', 'Dots3-Note Preview']
];
// these two spend their whole answer on "thinking" unless it is switched off
const NO_THINKING = new Set(['nvidia/nemotron-3.5-lightning:free', 'dots-studio/dots-3-note-preview:free']);
const MAX_TRIES = 3;              // every try uses the account's daily allowance
const MAX_CHARS = 20000;          // the page prompt is about 9,000 characters
const RATE = { windowMs: 10 * 60 * 1000, max: 30 }; // per visitor, per server instance
const hits = new Map();

// the key as pasted in the hosting settings may carry quotes, "Bearer ", "NAME=" or several copies on separate lines: use the first key
function cleanKey(v) {
  const parts = String(v || '').replace(/^\s*OPENROUTER_API_KEY\s*=/i, '').split(/[\s,;"'`]+/).filter(Boolean);
  return parts.find(p => /^sk-or-[\w-]{20,}$/.test(p)) || parts.find(p => p.length >= 20 && !/^bearer$/i.test(p)) || '';
}
// error details never reach the browser; in the server log, anything that looks like a key is hidden
const redact = s => String(s || '').replace(/sk-or-[\w-]+/g, 'sk-or-…').replace(/Bearer\s+\S+/gi, 'Bearer …').slice(0, 300);

const send = (res, status, data) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
};

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel parses JSON bodies
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > MAX_CHARS * 2) throw new Error('too large'); }
  return JSON.parse(raw || '{}');
}

// only the editor's own pages may use the endpoint, and each visitor gets a fair share
function allowed(req) {
  const origin = req.headers.origin, host = req.headers['x-forwarded-host'] || req.headers.host;
  let sameSite = true;
  try { if (origin && host) sameSite = new URL(origin).host === host; } catch (e) { sameSite = false; }
  if (!sameSite) return 'This page is not allowed to use the AI.';
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), recent = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  if (recent.length >= RATE.max) return 'Too many AI requests. Please wait a few minutes and try again.';
  hits.set(ip, [...recent, now]);
  return '';
}

async function askModel(key, model, body) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 120000);
  const t0 = Date.now();
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal: ctl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'HTML QR Builder' },
      body: JSON.stringify({
        model, temperature: body.temperature, max_tokens: 10000, response_format: { type: 'json_object' },
        reasoning: NO_THINKING.has(model) ? { enabled: false } : { effort: 'low', exclude: true },
        messages: [{ role: 'system', content: body.system }, { role: 'user', content: body.user }]
      })
    });
    const text = await r.text();
    let j = {}; try { j = JSON.parse(text); } catch (e) {}
    if (!r.ok || j.error) {
      const e = new Error(j.error?.message || text.slice(0, 160));
      e.status = r.ok ? j.error?.code : r.status;
      e.daily = /free-models-per-day/.test(text);
      throw e;
    }
    const content = j.choices?.[0]?.message?.content || '';
    if (!content.trim()) throw new Error('empty answer');
    return { content, model, ms: Date.now() - t0, tokens: j.usage?.total_tokens || 0 };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('took too long');
    throw e;
  } finally { clearTimeout(timer); }
}

export default async function handler(req, res) {
  const key = cleanKey(process.env.OPENROUTER_API_KEY);
  if (req.method === 'GET') return send(res, 200, { configured: !!key });
  if (req.method !== 'POST') return send(res, 405, { error: 'Use GET or POST.' });
  if (!key) return send(res, 503, { error: 'AI is not set up yet: add OPENROUTER_API_KEY to the server environment.' });
  const refusal = allowed(req);
  if (refusal) return send(res, 429, { error: refusal });

  let body;
  try { body = await readJson(req); } catch (e) { return send(res, 400, { error: 'The request could not be read.' }); }
  const { system, user } = body;
  if (typeof system !== 'string' || typeof user !== 'string' || !user.trim() || system.length + user.length > MAX_CHARS) {
    return send(res, 400, { error: 'The request is missing its text or is too long.' });
  }
  const temperature = Math.min(1.2, Math.max(0, Number(body.temperature) || 0.7));

  const names = Object.fromEntries(DEFAULT_MODELS);
  const models = (process.env.OPENROUTER_MODELS || DEFAULT_MODELS.map(m => m[0]).join(',')).split(',').map(s => s.trim()).filter(Boolean);
  for (const model of models.slice(0, MAX_TRIES)) {
    try {
      const out = await askModel(key, model, { system, user, temperature });
      return send(res, 200, { ...out, name: names[model] || model });
    } catch (e) {
      console.error(`AI model ${model} failed:`, e.status || '', redact(e.message));
      if (e.status === 401) return send(res, 500, { error: 'The OpenRouter key on the server was not accepted.' });
      if (e.daily) return send(res, 429, { error: "Today's free AI limit is used up (OpenRouter allows 50 free requests a day; adding $10 credit there raises it to 1,000). It resets at midnight UTC." });
    }
  }
  return send(res, 502, { error: 'No AI model answered right now. Please try again in a minute.' });
}
