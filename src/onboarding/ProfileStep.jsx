// FILE LOCATION IN GITHUB: src/onboarding/ProfileStep.jsx
//
// Step 1 of onboarding: email -> 6-digit code -> first name (new) or
// "Welcome back" with credits (returning).
//
// Usage:  <ProfileStep onDone={({ email, token, name, isNew }) => { ... }} />
// onDone fires once the person is logged in (and named, if they were new).

import { useState, useRef, useEffect } from "react"
import OnboardingShell, { COLORS, ui } from "./OnboardingShell.jsx"
import { saveSession, clearSession, readSession } from "./session.js"

const EMPTY_CODE = ["", "", "", "", "", ""]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function postJson(url, body) {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await r.json().catch(() => ({}))
    return { ok: r.ok, data }
  } catch {
    return { ok: false, data: { error: "We couldn't reach Nugget. Check your connection and try again." } }
  }
}

async function loadCredits(email, token) {
  try {
    const r = await fetch(
      `/api/check-credits?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
    )
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

// "2028-04-02" -> "April 2, 2028" (no timezone shifting)
function formatDate(iso) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return ""
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })
}

export default function ProfileStep({ onDone }) {
  const [phase, setPhase] = useState("email") // email | code | name | welcome
  const [email, setEmail] = useState("")
  const [digits, setDigits] = useState(EMPTY_CODE)
  const [firstName, setFirstName] = useState("")
  const [name, setName] = useState(null)
  const [token, setToken] = useState(null)
  const [credits, setCredits] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [resendIn, setResendIn] = useState(0)
  const boxes = useRef([])

useEffect(() => {
  const s = readSession()
  if (!s) return undefined
  let cancelled = false
  setPhase("checking")
  ;(async () => {
    const c = await loadCredits(s.email, s.token)
    if (cancelled) return
    if (!c) { clearSession(); setPhase("email"); return }
    setEmail(s.email); setToken(s.token); setName(s.name || null); setCredits(c)
    setPhase(s.name ? "welcome" : "name")
  })()
  return () => { cancelled = true }
}, [])

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const buttonStyle = { ...ui.primaryButton, opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer" }

  // ---------------------------------------------------------------- actions
  async function sendCode(isResend) {
    const clean = email.trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) {
      setError("Please enter a valid email address.")
      return
    }
    setBusy(true)
    setError("")
    setNotice("")
    const { ok, data } = await postJson("/api/send-code", { email: clean })
    setBusy(false)
    if (!ok) {
      setError(data.error || "We couldn't send your code. Please try again.")
      return
    }
    setEmail(clean)
    setDigits(EMPTY_CODE)
    setResendIn(60)
    if (isResend) setNotice("We sent you a new code.")
    setPhase("code")
  }

  async function verify(code) {
    if (busy) return
    setBusy(true)
    setError("")
    setNotice("")
    const { ok, data } = await postJson("/api/verify-code", { email, code })
    if (!ok) {
      setBusy(false)
      setError(data.error || "That code didn't work. Please try again.")
      setDigits(EMPTY_CODE)
      if (boxes.current[0]) boxes.current[0].focus()
      return
    }
    setToken(data.accessToken)
    setName(data.name || null)
    saveSession({ email, token: data.accessToken, name: data.name })

    if (!data.name) {
      setBusy(false)
      setPhase("name")
      return
    }
    setCredits(await loadCredits(email, data.accessToken))
    setBusy(false)
    setPhase("welcome")
  }

  async function saveName() {
    const n = firstName.trim()
    if (!n) {
      setError("Please enter your first name.")
      return
    }
    setBusy(true)
    setError("")
    const { ok, data } = await postJson("/api/onboarding", { email, token, action: "save", name: n })
    if (!ok) {
      setBusy(false)
      setError(data.error || "Something went wrong. Please try again.")
      return
    }
    saveSession({ email, token, name: n })
    setBusy(false)
    onDone({ email, token, name: n, isNew: true })
  }

  function useDifferentEmail() {
    clearSession()
    setEmail("")
    setDigits(EMPTY_CODE)
    setToken(null)
    setName(null)
    setCredits(null)
    setError("")
    setNotice("")
    setPhase("email")
  }

  // ------------------------------------------------------- code box helpers
  function fillFrom(start, rawDigits) {
    const next = [...digits]
    let i = start
    for (const ch of rawDigits) {
      if (i > 5) break
      next[i] = ch
      i += 1
    }
    setDigits(next)
    const nextEmpty = next.findIndex((d) => d === "")
    const focusAt = nextEmpty === -1 ? 5 : nextEmpty
    if (boxes.current[focusAt]) boxes.current[focusAt].focus()
    if (next.every((d) => d !== "")) verify(next.join(""))
  }

  function onDigitChange(i, value) {
    const only = value.replace(/\D/g, "")
    if (!only) {
      const next = [...digits]
      next[i] = ""
      setDigits(next)
      return
    }
    fillFrom(i, only)
  }

  function onDigitKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      const next = [...digits]
      next[i - 1] = ""
      setDigits(next)
      if (boxes.current[i - 1]) boxes.current[i - 1].focus()
    }
  }

  function onDigitPaste(e) {
    e.preventDefault()
    const only = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6)
    if (only) fillFrom(0, only)
  }

  // ----------------------------------------------------------------- views
  const errorLine = (
    <p role="alert" aria-live="polite" style={{ ...ui.error, display: error ? "block" : "none" }}>
      {error}
    </p>
  )

  if (phase === "checking") {
  return (
    <OnboardingShell step={1}>
      <p style={ui.lead}>One moment...</p>
    </OnboardingShell>
  )
}

if (phase === "code") {
    return (
      <OnboardingShell step={1} footer="Not seeing it? Check your spam or promotions folder for an email from Nugget.">
        <form
          onSubmit={(e) => { e.preventDefault(); verify(digits.join("")) }}
          style={{ display: "flex", flexDirection: "column", gap: 28 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={ui.h1}>Check your inbox</h1>
            <p style={ui.lead}>
              {"We sent a 6-digit code to "}
              <strong style={{ color: COLORS.text }}>{email}</strong>
              {". It's good for 10 minutes."}
            </p>
          </div>
          <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <legend style={{ ...ui.label, padding: 0, marginBottom: 10 }}>Your code</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { boxes.current[i] = el }}
                  aria-label={`Digit ${i + 1}`}
                  value={d}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  autoFocus={i === 0}
                  maxLength={6}
                  onChange={(e) => onDigitChange(i, e.target.value)}
                  onKeyDown={(e) => onDigitKeyDown(i, e)}
                  onPaste={onDigitPaste}
                  style={{
                    boxSizing: "border-box", width: "100%", height: 64, textAlign: "center",
                    background: COLORS.bg, border: `1px solid ${d ? COLORS.accent : COLORS.inputBorder}`,
                    borderRadius: 10, color: COLORS.text, fontSize: 26, fontFamily: "Georgia, serif",
                  }}
                />
              ))}
            </div>
          </fieldset>
          {errorLine}
          {notice ? <p style={{ ...ui.note, color: COLORS.link }}>{notice}</p> : null}
          <button type="submit" disabled={busy} style={buttonStyle}>
            {busy ? "Checking..." : "Continue"}
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            {resendIn > 0 ? (
              <span style={{ ...ui.note, fontSize: 14 }}>{`You can ask for a new code in ${resendIn}s`}</span>
            ) : (
              <button type="button" style={ui.linkButton} onClick={() => sendCode(true)}>
                {"Didn't get it? Send a new code"}
              </button>
            )}
            <button type="button" style={ui.linkButton} onClick={useDifferentEmail}>
              Use a different email
            </button>
          </div>
        </form>
      </OnboardingShell>
    )
  }

  if (phase === "name") {
    return (
      <OnboardingShell step={1}>
        <form
          onSubmit={(e) => { e.preventDefault(); saveName() }}
          style={{ display: "flex", flexDirection: "column", gap: 28 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: COLORS.link }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.link} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <span>Email confirmed</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={ui.h1}>Nice to meet you</h1>
            <p style={ui.lead}>{"What should Nugget call you? That's all we need to set up your profile."}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="nugget-fname" style={ui.label}>First name</label>
            <input
              id="nugget-fname" type="text" autoComplete="given-name" autoFocus
              placeholder="Your first name" maxLength={60}
              value={firstName} onChange={(e) => setFirstName(e.target.value)} style={ui.input}
            />
          </div>
          {errorLine}
          <button type="submit" disabled={busy} style={buttonStyle}>
            {busy ? "Creating..." : "Create my profile"}
          </button>
          <p style={ui.note}>
            No spam. No sharing. Just the occasional Nugget update. Your LinkedIn data is never stored on our servers.
          </p>
        </form>
      </OnboardingShell>
    )
  }

  if (phase === "welcome") {
    const total = credits && credits.totalCreditsRemaining > 0 ? credits.totalCreditsRemaining : 0
    const expires = credits && credits.expirationDate ? formatDate(credits.expirationDate) : ""
    const plural = total === 1 ? "report credit" : "report credits"
    return (
      <OnboardingShell step={1}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={ui.h1}>{`Welcome back, ${(name || "").split(" ")[0]}`}</h1>
            <p style={ui.lead}>
              {total > 0
                ? `Good news – you have ${total === 1 ? "a credit" : "credits"} waiting for you!`
                : "Good to see you again."}
            </p>
          </div>
          {total > 0 ? (
            <div style={{ border: "1px solid #b8892a", background: "#1a1a10", borderRadius: 14, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {credits.includesGN ? (
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#f2c14e", background: "#2a2210", padding: "4px 8px", borderRadius: 4 }}>
                    GOLD
                  </span>
                ) : null}
                <span style={{ fontSize: 17, fontWeight: 600, color: "#f6e7c1" }}>{`${total} ${plural}`}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#e3d6b4" }}>
                {"Runs The Warm List, Hidden Nuggets, Inbound and Outbound"}
                {credits.includesGN ? ", with The Gold Nugget included" : ""}
                {"."}
                {expires ? ` Good until ${expires}.` : ""}
              </p>
            </div>
          ) : null}
          <button
            type="button" style={ui.primaryButton}
            onClick={() => onDone({ email, token, name, isNew: false })}
          >
            Pick up where I left off
          </button>
          <p style={{ ...ui.note, fontSize: 14 }}>
            {`Not ${name}? `}
            <button type="button" style={ui.linkButton} onClick={useDifferentEmail}>Use a different email</button>
          </p>
        </div>
      </OnboardingShell>
    )
  }

  // phase === "email"
  return (
    <OnboardingShell step={1} footer="No password to remember. We'll email you a 6-digit login code instead.">
      <form
        onSubmit={(e) => { e.preventDefault(); sendCode(false) }}
        style={{ display: "flex", flexDirection: "column", gap: 28 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 style={ui.h1}>Create your Nugget profile</h1>
          <p style={ui.lead}>{"Already have one? Same step. Enter your email and we'll find you."}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label htmlFor="nugget-email" style={ui.label}>Email address</label>
          <input
            id="nugget-email" type="email" autoComplete="email" autoFocus
            placeholder="you@yourbusiness.com"
            value={email} onChange={(e) => setEmail(e.target.value)} style={ui.input}
          />
        </div>
        {errorLine}
        <button type="submit" disabled={busy} style={buttonStyle}>
          {busy ? "Sending..." : "Send my login code"}
        </button>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, background: COLORS.bg, borderRadius: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.link} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16.5v.01" />
          </svg>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: COLORS.body }}>
            {"Use the same email every time. It's how Nugget finds your profile, your credits and the reports you've already run."}
          </p>
        </div>
      </form>
    </OnboardingShell>
  )
}
