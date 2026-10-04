// FILE LOCATION IN GITHUB: src/onboarding/session.js
//
// Remembers who is logged in, in this browser only. Stores email, first name
// and the access token (30 days). Never stores LinkedIn data. Uses its own
// key, so saved reports (nugget:v1:user:...) are not touched.

const SESSION_KEY = "nugget:v1:session"

// The token is base64url("email|expiryMs") + "." + signature. We only read the
// expiry here so we can skip a login that has already run out. The server is
// what actually checks the token.
function tokenExpiresAt(token) {
  try {
    const payload = String(token).split(".")[0].replace(/-/g, "+").replace(/_/g, "/")
    const decoded = atob(payload + "=".repeat((4 - (payload.length % 4)) % 4))
    return Number(decoded.split("|")[1]) || 0
  } catch {
    return 0
  }
}

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s || !s.email || !s.token) return null
    if (tokenExpiresAt(s.token) <= Date.now()) {
      clearSession()
      return null
    }
    return s
  } catch {
    return null
  }
}

export function saveSession({ email, token, name }) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ email: String(email).trim().toLowerCase(), token, name: name || null })
    )
  } catch {
    /* storage blocked or full: they simply log in next time */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
