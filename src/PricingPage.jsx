const GOLD = "#C9A84C";
const GOLD_TEXT = "#f2c14e";
const MUTED = "#9fc4e8";
const BODY = "#c9dcf3";
const WHITE = "#e8f0fe";
const BORDER = "#1e4080";
const DARK_CARD = "#0f2040";

const TIERS = [
  {
    name: "EXPLORER",
    price: "$79",
    sub: "1 report credit",
    url: "https://buy.stripe.com/7sYbJ2bV38OO4yT8F36kg0c",
    button: "Get Explorer →",
    lines: [
      { mark: "✓", text: "1 full run of the 4-report bundle: Warm List, Hidden Nuggets, Inbound and Outbound." },
      { mark: "–", text: "Gold Nugget not included" },
    ],
  },
  {
    name: "CONNECTOR",
    price: "$207",
    sub: "3 report credits, $69 each",
    url: "https://buy.stripe.com/dRmdRa3ox5CC3uPbRf6kg0d",
    button: "Get Connector →",
    badge: "MOST POPULAR",
    lines: [
      { mark: "✓", text: "3 full runs of the 5-report bundle." },
      { mark: "✓", text: "Gold Nugget included on every run: your business development work, done for you." },
    ],
  },
  {
    name: "CLOSER",
    price: "$295",
    sub: "5 report credits, $59 each",
    url: "https://buy.stripe.com/4gM4gAbV3aWW7L57AZ6kg0e",
    button: "Get Closer →",
    lines: [
      { mark: "✓", text: "5 full runs of the 5-report bundle, plenty of room to rerun as your network changes." },
      { mark: "✓", text: "Gold Nugget included on every run: your business development work, done for you." },
    ],
  },
];

export default function PricingPage({ email, onBack }) {
  const checkoutUrl = (base) =>
    email ? base + "?prefilled_email=" + encodeURIComponent(email) : base;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 0 24px", display: "flex", flexDirection: "column", gap: 26 }}>
      <div>
        <button
          type="button"
          onClick={onBack}
          style={{ height: 40, padding: "0 16px", border: `1px solid ${BORDER}`, borderRadius: 10, background: "transparent", color: BODY, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          ← Back to my reports
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 30, lineHeight: 1.25, fontWeight: 700, color: WHITE }}>
          Unlock the Gold reports
        </h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: BODY }}>
          No subscription. Buy credits once, run them whenever you like.
        </p>
      </div>

      {email && (
        <div style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: WHITE }}>Signed in as {email}</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.55, color: BODY }}>
            Use this same email at checkout and your credits show up straight away. We will fill it in for you.
          </span>
        </div>
      )}

      {TIERS.map((t) => (
        <div
          key={t.name}
          style={{ background: "linear-gradient(160deg, #1a1200 0%, #0f2040 100%)", border: `1px solid ${t.badge ? GOLD : GOLD + "66"}`, borderRadius: 16, padding: "26px 28px", display: "flex", flexDirection: "column", gap: 12 }}
        >
          {t.badge && (
            <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#1a1406", background: "#f2b84b", padding: "3px 8px", borderRadius: 4 }}>
              {t.badge}
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: GOLD_TEXT }}>{t.name}</span>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 34, fontWeight: 700, lineHeight: 1, color: WHITE }}>{t.price} <span style={{ fontSize: 14, fontWeight: 600, color: MUTED, fontFamily: "DM Sans, system-ui, sans-serif" }}>USD</span></span>
          <span style={{ fontSize: 13.5, color: MUTED }}>{t.sub}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {t.lines.map((l) => (
              <div key={l.text} style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.55, color: BODY }}>
                <span style={{ color: l.mark === "✓" ? GOLD_TEXT : MUTED }}>{l.mark}</span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
          <a
            href={checkoutUrl(t.url)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 48, borderRadius: 10, background: "linear-gradient(135deg, #C9A84C, #f5c842)", color: "#1a1406", fontSize: 15.5, fontWeight: 700, textDecoration: "none" }}
          >
            {t.button}
          </a>
        </div>
      ))}

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: MUTED, textAlign: "center" }}>
        Credits expire 18 months from purchase. Each report generates once per run. It is saved in this browser, never on our servers. Save a PDF for a permanent copy.
      </p>
    </div>
  );
}
