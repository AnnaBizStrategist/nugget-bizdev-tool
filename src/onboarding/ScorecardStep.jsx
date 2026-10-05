import { useEffect, useState } from "react"
import OnboardingShell, { ui } from "./OnboardingShell.jsx"

const GOLD = "#f2b84b"

async function completeOnboarding(email, token) {
  const res = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token, action: "complete" }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success || !data.scorecard) throw new Error(data.error || "Something went wrong.")
  return data.scorecard
}

const cardStyle = {
  background: "#0f2040",
  border: "1px solid #1e4080",
  borderRadius: 20,
  padding: "30px 36px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
}

function PillarRow({ pillar, isFixFirst }) {
  return (
    <div
      style={{
        border: `1px solid ${isFixFirst ? "#b8892a" : "#1e4080"}`,
        background: isFixFirst ? "#1c1a12" : "#0a1628",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 700 }}>
          {pillar.label}
          {isFixFirst && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#1a1406",
                background: GOLD,
                padding: "3px 7px",
                borderRadius: 4,
              }}
            >
              FIX FIRST
            </span>
          )}
        </span>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 700 }}>{pillar.score} / 20</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            style={{
              height: 8,
              borderRadius: 4,
              background: n <= pillar.level ? (isFixFirst ? GOLD : "#41a1e8") : "#1e4080",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "#c9dcf3" }}>{pillar.description}</span>
    </div>
  )
}

// waiting = true when the person has asked LinkedIn for their data and it hasn't arrived yet
// onDone() = they clicked the button at the bottom
export default function ScorecardStep({ email, token, name, waiting, onDone }) {
  const [scorecard, setScorecard] = useState(null)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError("")
    completeOnboarding(email, token)
      .then((s) => {
        if (!cancelled) setScorecard(s)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Something went wrong.")
      })
    return () => {
      cancelled = true
    }
  }, [email, token, attempt])

  const first = (name || "").split(" ")[0]

  if (error) {
    return (
      <OnboardingShell step={3}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h1 style={ui.h1}>We couldn't build your scorecard</h1>
          <p style={ui.error}>{error}</p>
          <button type="button" style={ui.primaryButton} onClick={() => setAttempt(attempt + 1)}>
            Try again
          </button>
        </div>
      </OnboardingShell>
    )
  }

  if (!scorecard) {
    return (
      <OnboardingShell step={3}>
        <p style={ui.lead}>Building your scorecard...</p>
      </OnboardingShell>
    )
  }

  const fixKey = scorecard.fixFirst ? scorecard.fixFirst.key : null

  return (
    <OnboardingShell step={3}>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#7ec8f5", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Your Foundation Scorecard
            </span>
            <h1 style={{ ...ui.h1, fontSize: 28, lineHeight: 1.3 }}>
              {first ? `${first}, here's what's working, and what's not` : "Here's what's working, and what's not"}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 20px", background: "#0a1628", borderRadius: 14 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
              {scorecard.overall}
              <span style={{ fontSize: 20, color: "#9fc4e8" }}>/100</span>
            </span>
            <span style={{ fontSize: 14.5, lineHeight: 1.55, color: "#c9dcf3" }}>{scorecard.summary}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {scorecard.pillars.map((p) => (
              <PillarRow key={p.key} pillar={p} isFixFirst={p.key === fixKey} />
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, border: "1px solid #b8892a" }}>
          <span style={{ fontSize: 13, color: "#f2c14e", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Your one action this week
          </span>
          <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 22, lineHeight: 1.35, fontWeight: 700 }}>
            {scorecard.fixFirst ? scorecard.fixFirst.title : scorecard.allFives.title}
          </h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#c9dcf3" }}>
            {scorecard.fixFirst ? scorecard.fixFirst.action : scorecard.allFives.body}
          </p>
        </div>

        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700 }}>What happens next</h2>
          {waiting ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#c9dcf3" }}>
              Watch your inbox for an email from LinkedIn. Your archive can take anywhere from a few minutes to 24
              hours. When it arrives, drop the file into Nugget.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#c9dcf3" }}>
              Your answers are saved to your Nugget profile. Next, let's build your reports.
            </p>
          )}
          <button type="button" style={ui.primaryButton} onClick={onDone}>
            {waiting ? "Take me to upload" : "Build my reports"}
          </button>
        </div>
      </div>
    </OnboardingShell>
  )
}
