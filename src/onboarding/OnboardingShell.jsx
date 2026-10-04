// FILE LOCATION IN GITHUB: src/onboarding/OnboardingShell.jsx
//
// The shared frame for every onboarding screen: header, progress bar, card.
// Also exports the colours and common styles so each step looks the same.
// Matches the "Nugget Onboarding" mockups.

export const COLORS = {
  bg: "#0a1628",
  card: "#0f2040",
  border: "#1e4080",
  text: "#e8f0fe",
  body: "#c9dcf3",
  muted: "#9fc4e8",
  accent: "#41a1e8",
  link: "#7ec8f5",
  inputBorder: "#2f5fa8",
  error: "#f5a3a3",
}

const BODY_FONT = "'DM Sans', system-ui, sans-serif"
const HEAD_FONT = "Georgia, serif"

export const ui = {
  h1: { margin: 0, fontFamily: HEAD_FONT, fontSize: 30, lineHeight: 1.25, fontWeight: 700, color: COLORS.text },
  lead: { margin: 0, fontSize: 16, lineHeight: 1.6, color: COLORS.body },
  note: { margin: 0, fontSize: 13, lineHeight: 1.6, color: COLORS.muted },
  error: { margin: 0, fontSize: 14, lineHeight: 1.5, color: COLORS.error },
  label: {
    fontSize: 12.5, color: COLORS.muted, letterSpacing: "0.06em", textTransform: "uppercase",
  },
  input: {
    boxSizing: "border-box", width: "100%", height: 52, padding: "0 16px",
    background: COLORS.bg, border: `1px solid ${COLORS.inputBorder}`, borderRadius: 10,
    color: COLORS.text, fontSize: 16, fontFamily: "inherit",
  },
  primaryButton: {
    height: 54, border: "none", borderRadius: 10,
    background: "linear-gradient(135deg, #1149ac, #2f84d4)", color: "#ffffff",
    fontSize: 16, fontWeight: 700, fontFamily: HEAD_FONT, cursor: "pointer",
  },
  linkButton: {
    background: "none", border: "none", padding: 0, cursor: "pointer",
    color: COLORS.link, fontSize: 14, fontFamily: "inherit", textDecoration: "underline",
  },
}

const STEP_LABELS = ["Profile", "Export", "About you", "Upload", "Reports"]

export default function OnboardingShell({ step = 1, children, footer }) {
  return (
    <div
      style={{
        minHeight: "100vh", background: COLORS.bg, color: COLORS.text,
        fontFamily: BODY_FONT, display: "flex", justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 640, boxSizing: "border-box",
          padding: "clamp(20px, 5vw, 40px) clamp(16px, 5vw, 48px)",
          display: "flex", flexDirection: "column", gap: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: HEAD_FONT, fontSize: 22, fontWeight: 700, letterSpacing: "0.01em" }}>
            Nugget
          </div>
          <div style={{ fontSize: 13, color: COLORS.muted }}>
            Step {step} of {STEP_LABELS.length}
          </div>
        </div>

        <div
          role="list"
          aria-label="Progress"
          style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}
        >
          {STEP_LABELS.map((label, i) => {
            const reached = i + 1 <= step
            const current = i + 1 === step
            return (
              <div
                key={label}
                role="listitem"
                aria-current={current ? "step" : undefined}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div style={{ height: 4, borderRadius: 2, background: reached ? COLORS.accent : COLORS.border }} />
                <div
                  style={{
                    fontSize: 12, color: current ? COLORS.text : COLORS.muted,
                    fontWeight: current ? 600 : 400,
                  }}
                >
                  {label}
                </div>
              </div>
            )
          })}
        </div>

        <div
          style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20,
            padding: "clamp(24px, 6vw, 44px)", display: "flex", flexDirection: "column", gap: 28,
          }}
        >
          {children}
        </div>

        {footer ? (
          <p style={{ ...ui.note, textAlign: "center" }}>{footer}</p>
        ) : null}
      </div>
    </div>
  )
}
