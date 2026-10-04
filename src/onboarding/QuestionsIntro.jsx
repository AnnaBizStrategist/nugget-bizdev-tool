import OnboardingShell, { ui } from "./OnboardingShell.jsx"

// waiting = true when the person just requested their LinkedIn export
// onDone() -> start the questions
export default function QuestionsIntro({ waiting, onDone }) {
  return (
    <OnboardingShell step={3}>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {waiting && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#7ec8f5" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7ec8f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <span>Export requested. LinkedIn is on it.</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 style={ui.h1}>
            {waiting
              ? "While we're waiting for your LinkedIn data to arrive..."
              : "Now, tell Nugget about your business"}
          </h1>
          <p style={ui.lead}>Tell Nugget about your business so your reports are built around you.</p>
        </div>

        <div
          style={{
            background: "#0a1628",
            border: "1px solid #1e4080",
            borderRadius: 14,
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700 }}>
            You'll also get your Foundation Scorecard
          </span>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "#c9dcf3" }}>
            Nugget finds the right people in your network. Whether those conversations turn into clients comes down to
            how solid your business foundation is – whether your clients, offers, pricing, positioning and messaging are
            all working together. Your scorecard shows what's working, what's not, and the one thing to fix before you
            reach out.
          </p>
        </div>

        <button type="button" style={ui.primaryButton} onClick={onDone}>
          Let's go
        </button>

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#9fc4e8", textAlign: "center" }}>
          Your answers are saved to your Nugget profile. Your LinkedIn data never is.
        </p>
      </div>
    </OnboardingShell>
  )
}
