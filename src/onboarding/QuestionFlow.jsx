import { useState } from "react"
import OnboardingShell, { ui } from "./OnboardingShell.jsx"
import { QUESTIONS, PILLAR_CONTENT } from "./questions.js"

const TOTAL = QUESTIONS.length

function isAnswered(v) {
  return v !== undefined && v !== null && v !== ""
}

function firstUnanswered(answers) {
  const i = QUESTIONS.findIndex((q) => !isAnswered(answers[q.id]))
  return i === -1 ? TOTAL - 1 : i
}

async function saveAnswer(email, token, id, value) {
  const res = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token, action: "save", answer: { id, value } }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong.")
}

function optionsFor(q) {
  if (q.type === "statement") {
    return PILLAR_CONTENT[q.pillar].levels.map((l, i) => ({ value: i + 1, label: l.pick }))
  }
  return (q.options || []).map((o) => ({ value: o, label: o }))
}

function optionStyle(selected) {
  return {
    textAlign: "left",
    padding: "14px 16px",
    background: selected ? "#16346a" : "#0a1628",
    border: `2px solid ${selected ? "#7ec8f5" : "#2f5fa8"}`,
    borderRadius: 12,
    color: selected ? "#ffffff" : "#e8f0fe",
    fontSize: 15,
    lineHeight: 1.5,
    fontFamily: "inherit",
    cursor: "pointer",
  }
}

// initialAnswers: answers already saved (object keyed by question id)
// onDone(answers): called after the last answer is saved
export default function QuestionFlow({ email, token, initialAnswers, onDone }) {
  const [answers, setAnswers] = useState(initialAnswers || {})
  const [index, setIndex] = useState(() => firstUnanswered(initialAnswers || {}))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const q = QUESTIONS[index]
  const value = answers[q.id]
  const isLast = index === TOTAL - 1
  const canNext = q.type === "typed" ? typeof value === "string" && value.trim().length > 0 : isAnswered(value)

  function setValue(v) {
    setAnswers((a) => ({ ...a, [q.id]: v }))
    setError("")
  }

  async function next() {
    if (!canNext || busy) return
    setBusy(true)
    setError("")
    try {
      const toSave = q.type === "typed" ? value.trim() : value
      await saveAnswer(email, token, q.id, toSave)
      const updated = { ...answers, [q.id]: toSave }
      setAnswers(updated)
      if (isLast) {
        onDone(updated)
      } else {
        setIndex(index + 1)
        setBusy(false)
      }
    } catch (e) {
      setError("We couldn't save that. Please try again.")
      setBusy(false)
    }
  }

  function back() {
    if (index > 0 && !busy) {
      setError("")
      setIndex(index - 1)
    }
  }

  const gridLayout = q.id === "hardest_part"

  return (
    <OnboardingShell step={3}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
            <span style={{ color: "#7ec8f5", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {q.group}
            </span>
            <span style={{ color: "#9fc4e8" }}>{index + 1} of {TOTAL}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#1e4080" }}>
            <div
              style={{
                width: `${((index + 1) / TOTAL) * 100}%`,
                height: 6,
                borderRadius: 3,
                background: "#41a1e8",
              }}
            />
          </div>
        </div>

        <h1 style={{ ...ui.h1, fontSize: 24, lineHeight: 1.35 }}>{q.prompt}</h1>
        {q.hint && <p style={{ ...ui.lead, fontSize: 15, marginTop: -12 }}>{q.hint}</p>}

        {q.type === "typed" ? (
          <textarea
            rows={4}
            maxLength={q.maxLength}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(e.target.value)}
            style={{ ...ui.input, height: "auto", padding: "14px 16px", lineHeight: 1.55, resize: "vertical", fontFamily: "inherit" }}
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridLayout ? "repeat(2, minmax(0, 1fr))" : "1fr",
              gap: 10,
            }}
          >
            {optionsFor(q).map((o) => (
              <button
                key={String(o.value)}
                type="button"
                style={optionStyle(value === o.value)}
                onClick={() => setValue(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {error && <p style={ui.error}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {index > 0 ? (
            <button type="button" style={ui.linkButton} onClick={back}>← Back</button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={next}
            disabled={!canNext || busy}
            style={{ ...ui.primaryButton, width: "auto", padding: "0 32px", opacity: !canNext || busy ? 0.5 : 1 }}
          >
            {busy ? "Saving..." : isLast ? "See my scorecard" : "Next"}
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#9fc4e8", textAlign: "center" }}>
          Go with your gut. There are no wrong answers, just honest ones.
        </p>
      </div>
    </OnboardingShell>
  )
}
