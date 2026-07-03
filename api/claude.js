// ── Abuse protection ────────────────────────────────────────────────────────
// This endpoint proxies to Anthropic using our server-side API key. Anyone who
// finds this URL could otherwise use our key for unlimited, unrelated requests.
// These checks don't make it unbreakable, but they stop casual/scripted abuse
// and cap the worst case to "generate one of our own 6 reports."

const ALLOWED_ORIGINS = [
  "https://www.getnugget.ca",
  "https://getnugget.ca",
  "http://localhost:5173",
];

// Fixed opening line of each of the 6 real report prompts (from src/App.jsx),
// before any per-user text is inserted. A request's `system` prompt must start
// with one of these, or it isn't one of our real reports.
const ALLOWED_SYSTEM_PREFIXES = [
  `You are a senior LinkedIn BD strategist analyzing a founder's professional network. Generate "The Field Report"`,
  `You are a relationship intelligence analyst. Generate "The Warm List"`,
  `You are an advocacy analyst. Generate "The Hidden Nuggets Report"`,
  `You are a LinkedIn profile strategist specializing in founder BD readiness. Generate "The Inbound Report."`,
  `You are a market signal analyst who understands personal branding. Generate "The Outbound Report"`,
  `You are Anna Ludwinowski, Business Foundation Strategist and LinkedIn BD expert. Generate "The Gold Nugget"`,
];

const MAX_TOKENS_ALLOWED = 4500;
const MAX_CONTENT_CHARS = 200000; // generous ceiling for a LinkedIn data payload

// Best-effort per-visitor speed limit. Resets whenever this serverless
// function cold-starts, so it's not a hard guarantee, but combined with the
// checks above it meaningfully raises the bar against repeat abuse.
const requestLog = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || "";
  if (origin.includes("vercel.app") && origin.includes("nugget-bizdev-tool")) return true;
  return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
}

function isValidReportRequest(body) {
  if (!body || typeof body !== "object") return false;
  if (body.model !== "claude-sonnet-4-6") return false;
  if (typeof body.max_tokens !== "number" || body.max_tokens < 1 || body.max_tokens > MAX_TOKENS_ALLOWED) return false;
  if (typeof body.system !== "string") return false;
  if (!ALLOWED_SYSTEM_PREFIXES.some((prefix) => body.system.startsWith(prefix))) return false;
  if (!Array.isArray(body.messages) || body.messages.length !== 1) return false;
  const [msg] = body.messages;
  if (!msg || msg.role !== "user" || typeof msg.content !== "string") return false;
  if (msg.content.length > MAX_CONTENT_CHARS) return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.headers["x-app-token"] !== process.env.APP_PROXY_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests — please slow down." });
  }

  if (!isValidReportRequest(req.body)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Proxy error", details: error.message });
  }
}
