import { useState } from "react"
import OnboardingShell, { ui } from "./OnboardingShell.jsx"

const LINKEDIN_EXPORT_URL = "https://www.linkedin.com/mypreferences/d/download-my-data"

async function saveExportRequested(email, token) {
  const res = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token, action: "save", exportRequested: true }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong.")
}

const stepNumberStyle = {
  flexShrink: 0,
  width: 28,
  height: 28,
  borderRadius: 14,
  background: "#1e4080",
  color: "#e8f0fe",
  fontSize: 14,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const outlineButton = {
  height: 54,
  border: "1px solid #41a1e8",
  borderRadius: 10,
  background: "transparent",
  color: "#e8f0fe",
  fontSize: 16,
  fontWeight: 700,
  fontFamily: "Georgia, serif",
  cursor: "pointer",
}

// onDone("requested") -> go to the questions (About you)
// onDone("haveFiles") -> go straight to Upload
export default function ExportStep({ email, token, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function requested() {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      await saveExportRequested(email, token)
      onDone("requested")
    } catch (e) {
      setError("We couldn't save that. Please try again.")
      setBusy(false)
    }
  }

  return (
    <OnboardingShell step={2}>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 style={ui.h1}>First, ask LinkedIn for your data</h1>
          <p style={ui.lead}>
            LinkedIn takes a little while to pack it up, so let's get started. It's two clicks.
          </p>
        </div>

        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
          <li style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={stepNumberStyle}>1</span>
            <span style={{ fontSize: 15.5, lineHeight: 1.6, paddingTop: 2 }}>
              Open LinkedIn's export page with the button below. It opens in a new tab.
            </span>
          </li>
          <li style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={stepNumberStyle}>2</span>
            <span style={{ fontSize: 15.5, lineHeight: 1.6, paddingTop: 2 }}>
              Choose <strong>Download larger data archive</strong> (the first option), then click <strong>Request archive</strong>.
            </span>
          </li>
        </ol>

        <a
          href={LINKEDIN_EXPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...ui.primaryButton,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
          }}
        >
          Open LinkedIn's export page
        </a>

        <div style={{ height: 1, background: "#1e4080" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#9fc4e8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Then choose one
          </p>
          {error && <p style={ui.error}>{error}</p>}
          <button type="button" style={outlineButton} onClick={requested} disabled={busy}>
            {busy ? "Saving..." : "Done, I've requested it →"}
          </button>
          <button type="button" style={outlineButton} onClick={() => onDone("haveFiles")} disabled={busy}>
            I already have my files. Take me to upload →
          </button>
        </div>
      </div>
    </OnboardingShell>
  )
}
