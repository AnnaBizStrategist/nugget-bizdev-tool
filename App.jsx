import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";

const GOLD = "#C8960C";
const GOLD_LIGHT = "#E8B84B";
const DARK = "#13100A";
const DARK_CARD = "#1E1810";
const CREAM = "#F2E8D0";
const MUTED = "#9A8A6A";
const BORDER = "#3A2E1A";

const REPORTS = [
  {
    id: "field",
    name: "The Field Report",
    tag: "FREE",
    subtitle: "Network composition & ICP match",
    description: "Survey your land — who's actually in your network, how many match your ICP, and your top 10 untapped connections.",
    files: ["Connections"],
    free: true,
    icon: "🗺️",
  },
  {
    id: "warm",
    name: "The Warm List",
    tag: "FREE",
    subtitle: "Relationship heat mapping",
    description: "Hot, warm, cool, cold — every connection scored by actual interaction data. Find who to call first.",
    files: ["Connections", "Messages"],
    free: true,
    icon: "🌡️",
  },
  {
    id: "hidden",
    name: "The Hidden Nuggets Report",
    tag: "FREE",
    subtitle: "Hidden advocates finder",
    description: "The people already in your corner who you're not leveraging. Ranked by likely value and best ask type.",
    files: ["Recommendations", "Messages"],
    free: true,
    icon: "💎",
  },
  {
    id: "inbound",
    name: "The Inbound Report",
    tag: "FREE",
    subtitle: "Profile BD readiness",
    description: "If a perfect prospect landed on your profile right now — would they stay or bounce?",
    files: ["Profile", "Skills", "Endorsements"],
    free: true,
    icon: "🚪",
  },
  {
    id: "outbound",
    name: "The Outbound Report",
    tag: "FREE",
    subtitle: "Market signal analysis",
    description: "What your LinkedIn activity broadcasts to potential clients when you're not paying attention.",
    files: ["Comments", "Shares"],
    free: true,
    icon: "📡",
  },
  {
    id: "gold",
    name: "The Gold Nugget",
    tag: "PAID",
    subtitle: "Full BD action plan",
    description: "Your complete pipeline — prioritized targets, warm paths, missed conversations, outreach sequences. The treasure map.",
    files: ["Connections", "Messages"],
    free: false,
    icon: "🏆",
  },
];

const PROMPTS = {
  field: `You are a senior LinkedIn BD strategist analyzing a founder's professional network. Generate "The Field Report" — a sharp, specific BD intelligence briefing.

Format your response with these exact sections:

## Network Overview
State total connections. Calculate and highlight what % and how many are founders/owners/CEOs (ICP). Be specific with numbers.

## Network Strengths & Gaps  
Where is this network dense by industry/function? Where are the notable blind spots for BD purposes?

## Top 10 Untapped Connections
List 10 strategically valuable people not yet leveraged for BD. Use real names from the data. Format: **Name** | Title | Company | Why they matter for BD

## The Verdict
One direct, honest sentence starting with "Your network is..."

Speak directly to the founder. Use real names and specific numbers. No corporate language. No fluff.`,

  warm: `You are a relationship intelligence analyst. Generate "The Warm List" — a heat map of this founder's actual relationship strength.

Use message frequency and recency to score relationships. Focus on BD relevance.

## Hot Contacts — Engage This Week
10 people with real, active relationship momentum. Format: **Name** | Why hot | Best opening move

## Warm Contacts — Activate Now
10 people with existing relationship that just needs a nudge. Format: **Name** | When last active | Recommended reactivation angle

## Cool But Valuable — Worth Reviving  
5 people who went quiet but still matter for BD. Format: **Name** | Why they still matter | How to re-open naturally

## The Uncomfortable Truth
One honest observation about their relationship patterns — something they probably haven't noticed.

Use real names. Be direct. Make every recommendation immediately actionable.`,

  hidden: `You are an advocacy analyst. Generate "The Hidden Nuggets Report" — uncovering overlooked champions.

Look for: people who wrote recommendations, consistent high-volume messagers, patterns of support and responsiveness.

## Your Hidden Advocates — Top 15
Ranked by likely willingness and strategic BD value:
**Name** | Title | Why they're already in your corner | Best ask: (referral / intro / recommendation / collaboration)

## The Three You're Definitely Overlooking
Name 3 specific people the data shows are clearly supportive but almost certainly never asked for anything.

## Outreach Angles by Ask Type
For referrals: [2-sentence template]
For introductions: [2-sentence template]  
For recommendations: [2-sentence template]
For collaboration: [2-sentence template]

## One More Thing
Something specific about their advocate network that may surprise them.

Be specific. Use names. Every line should be immediately usable.`,

  inbound: `You are a LinkedIn profile strategist specializing in founder BD readiness. Generate "The Inbound Report."

Analyze the headline, summary, skills, and endorsements for BD effectiveness.

## BD Profile Score: X/10
Give a real score. Be honest — most profiles score 4-6 out of 10.

## What a Perfect Prospect Sees
Walk through the first impression — headline to summary to skills. What does an ideal client feel when they land here? Do they stay or bounce? Why?

## The 5 Fixes — Ranked by Impact
Specific, immediately actionable edits. Not vague advice.

1. **[Highest impact]:** [exact recommended change]
2. **[Second]:** [exact recommended change]
3. **[Third]:** [exact recommended change]
4. **[Fourth]:** [exact recommended change]
5. **[Fifth]:** [exact recommended change]

## Keywords Assessment
What search terms would their ICP use? Are those words present? What's missing?

Be brutally honest. Specific edits only. No flattery.`,

  outbound: `You are a market signal analyst. Generate "The Outbound Report" — what this founder's LinkedIn activity is broadcasting.

Analyze the comments and shares/posts to understand their market signal.

## Signal Strength: X/10
What does their LinkedIn activity communicate to potential clients right now?

## What Potential Clients Actually See
Based on content themes and engagement patterns — what impression does a potential client form observing this person's LinkedIn behavior over 30 days?

## Topic Alignment Check
What topics dominate their engagement? Do they align with what they sell? Where's the disconnect?

## Visibility Assessment
Are they showing up as a credible expert or as background noise? Who is noticing them?

## 5 Specific Shifts — Ranked by BD Impact
1. **[Most impactful]:** [specific change]
2-5: [additional specific changes]

Focus on what needs to change. Speak directly to the founder. No praise for what's working fine.`,
};

// Parse LinkedIn CSV files — handles Connections.csv which has 3 skip rows
function parseLinkedInCSV(file, onComplete) {
  const isConnections = file.name.toLowerCase().includes("connection");
  if (isConnections) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n");
      // LinkedIn Connections.csv has 3 header lines before the real CSV
      const csvText = lines.slice(3).join("\n");
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: onComplete,
      });
    };
    reader.readAsText(file);
  } else {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      error: () => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          error: console.error,
          complete: onComplete,
        });
      },
      complete: onComplete,
    });
  }
}

function getFileKey(name) {
  const lower = name.toLowerCase().replace(/[-_ ]/g, "");
  if (lower.includes("connection")) return "Connections";
  if (lower.includes("message")) return "Messages";
  if (lower.includes("recommendation")) return "Recommendations";
  if (lower.includes("endorsement")) return "Endorsements";
  if (lower.includes("skill")) return "Skills";
  if (lower.includes("profile") && !lower.includes("summary")) return "Profile";
  if (lower.includes("comment")) return "Comments";
  if (lower.includes("reaction")) return "Reactions";
  if (lower.includes("share")) return "Shares";
  if (lower.includes("invitation")) return "Invitations";
  return name.replace(".csv", "");
}

async function callClaude(systemPrompt, data) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here is the LinkedIn export data to analyze:\n\n${JSON.stringify(data, null, 2)}\n\nGenerate the report now. Be specific, use real names from the data, and make every insight immediately actionable.`,
        },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `API error ${response.status}`);
  }
  const result = await response.json();
  return result.content[0].text;
}

function prepareData(parsedData, fileKeys) {
  const out = {};
  fileKeys.forEach((k) => {
    if (parsedData[k]) {
      // Send up to 200 rows for connections/messages, 100 for others
      const limit = ["Connections", "Messages"].includes(k) ? 200 : 100;
      out[k] = parsedData[k].slice(0, limit);
    }
  });
  if (Object.keys(out).length === 0) {
    out["_note"] = "No matching files uploaded. Provide analysis based on typical founder LinkedIn patterns.";
  }
  return out;
}

function ReportContent({ text }) {
  const lines = text.split("\n");
  return (
    <div style={{ lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} style={{ color: GOLD_LIGHT, fontSize: 14, fontWeight: 600, marginTop: 28, marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {line.replace("## ", "")}
            </h3>
          );
        }
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
          return (
            <p key={i} style={{ color: CREAM, fontWeight: 600, fontSize: 14, margin: "12px 0 4px" }}>
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }
        const boldParsed = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#E8B84B">$1</strong>');
        if (line.match(/^\d+\./)) {
          return (
            <div key={i} style={{ display: "flex", gap: 12, margin: "8px 0", paddingLeft: 8 }}>
              <span style={{ color: GOLD, fontWeight: 700, minWidth: 20, fontSize: 13 }}>{line.match(/^\d+/)[0]}.</span>
              <p style={{ color: CREAM, margin: 0, fontSize: 14, flex: 1 }} dangerouslySetInnerHTML={{ __html: boldParsed.replace(/^\d+\./, "") }} />
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} style={{ display: "flex", gap: 10, margin: "6px 0", paddingLeft: 8 }}>
              <span style={{ color: GOLD, marginTop: 6, width: 6, height: 6, borderRadius: "50%", background: GOLD, flexShrink: 0, display: "block" }} />
              <p style={{ color: CREAM, margin: 0, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: boldParsed.replace(/^[-•]\s/, "") }} />
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ color: CREAM, margin: "5px 0", fontSize: 14 }} dangerouslySetInnerHTML={{ __html: boldParsed }} />;
      })}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState("upload");
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [parsedData, setParsedData] = useState({});
  const [reports, setReports] = useState({});
  const [generating, setGenerating] = useState(null);
  const [activeReport, setActiveReport] = useState("field");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback((fileList) => {
    Array.from(fileList).forEach((file) => {
      if (!file.name.endsWith(".csv")) return;
      const key = getFileKey(file.name);
      setUploadedFiles((prev) => ({ ...prev, [key]: file.name }));
      parseLinkedInCSV(file, (results) => {
        setParsedData((prev) => ({ ...prev, [key]: results.data }));
      });
    });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const generateReport = async (reportId) => {
    const report = REPORTS.find((r) => r.id === reportId);
    if (!report?.free || generating) return;
    setGenerating(reportId);
    setActiveReport(reportId);
    setError(null);
    try {
      const data = prepareData(parsedData, report.files);
      const result = await callClaude(PROMPTS[reportId], data);
      setReports((prev) => ({ ...prev, [reportId]: result }));
      setStep("reports");
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  };

  const generateAll = async () => {
    setStep("reports");
    setActiveReport("field");
    for (const report of REPORTS.filter((r) => r.free)) {
      setGenerating(report.id);
      setActiveReport(report.id);
      setError(null);
      try {
        const data = prepareData(parsedData, report.files);
        const result = await callClaude(PROMPTS[report.id], data);
        setReports((prev) => ({ ...prev, [report.id]: result }));
      } catch (err) {
        setReports((prev) => ({ ...prev, [report.id]: `⚠️ Error: ${err.message}` }));
      }
      setGenerating(null);
    }
  };

  const hasFiles = Object.keys(uploadedFiles).length > 0;
  const connCount = parsedData["Connections"]?.length || 0;
  const msgCount = parsedData["Messages"]?.length || 0;
  const reportsReady = Object.keys(reports).length;
  const activeReportMeta = REPORTS.find((r) => r.id === activeReport);

  const s = {
    app: { minHeight: "100vh", background: DARK, fontFamily: "'DM Sans', -apple-system, sans-serif", color: CREAM },
    header: { borderBottom: `1px solid ${BORDER}`, padding: "18px 40px", display: "flex", alignItems: "center", gap: 16, background: DARK_CARD },
    logo: { fontSize: 26, fontFamily: "Georgia, serif", fontWeight: 700, color: GOLD_LIGHT, letterSpacing: "-0.5px" },
    tagline: { fontSize: 11, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 },
    navBtn: (a) => ({ padding: "6px 16px", borderRadius: 6, border: `1px solid ${a ? GOLD : BORDER}`, background: a ? GOLD + "22" : "transparent", color: a ? GOLD_LIGHT : MUTED, cursor: "pointer", fontSize: 13, fontWeight: 500 }),
    main: { maxWidth: 980, margin: "0 auto", padding: "44px 24px" },
    heroTitle: { fontSize: 40, fontFamily: "Georgia, serif", fontWeight: 700, color: CREAM, marginBottom: 12, lineHeight: 1.2, textAlign: "center" },
    heroSub: { fontSize: 15, color: MUTED, maxWidth: 460, margin: "0 auto 36px", lineHeight: 1.65, textAlign: "center" },
    uploadZone: (over) => ({ border: `2px dashed ${over ? GOLD : BORDER}`, borderRadius: 16, padding: "44px 32px", textAlign: "center", cursor: "pointer", background: over ? GOLD + "08" : DARK_CARD, transition: "all 0.2s", marginBottom: 28 }),
    fileTag: { padding: "4px 12px", background: GOLD + "22", border: `1px solid ${GOLD}44`, borderRadius: 20, fontSize: 12, color: GOLD_LIGHT, display: "inline-block" },
    statCard: { flex: 1, background: GOLD + "0f", border: `1px solid ${GOLD}33`, borderRadius: 10, padding: "14px 20px", textAlign: "center" },
    statNum: { fontSize: 26, fontWeight: 700, color: GOLD_LIGHT, fontFamily: "Georgia, serif" },
    statLabel: { fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 },
    primaryBtn: (dis) => ({ width: "100%", padding: "14px 32px", background: dis ? GOLD + "44" : GOLD, color: dis ? GOLD_LIGHT : DARK, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: dis ? "not-allowed" : "pointer", fontFamily: "Georgia, serif", transition: "all 0.2s" }),
    reportCard: (active) => ({ background: active ? GOLD + "12" : DARK_CARD, border: `1px solid ${active ? GOLD : BORDER}`, borderRadius: 12, padding: 18, cursor: "pointer", transition: "all 0.2s", position: "relative" }),
    sidebar: { background: DARK_CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden", position: "sticky", top: 24 },
    sidebarItem: (a) => ({ padding: "13px 16px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: a ? GOLD + "12" : "transparent", borderLeft: `3px solid ${a ? GOLD : "transparent"}`, transition: "all 0.15s" }),
    panel: { background: DARK_CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 32, minHeight: 420 },
    spinner: { width: 36, height: 36, border: `3px solid ${BORDER}`, borderTop: `3px solid ${GOLD}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" },
  };

  return (
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DARK}; }
        button:hover { opacity: 0.9; }
      `}</style>

      <header style={s.header}>
        <div>
          <div style={s.logo}>🐔 Nugget</div>
          <div style={s.tagline}>The BizDev Tool for Founders</div>
        </div>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button style={s.navBtn(step === "upload")} onClick={() => setStep("upload")}>Upload</button>
          <button style={s.navBtn(step === "reports")} onClick={() => reportsReady > 0 && setStep("reports")}>Reports {reportsReady > 0 && `(${reportsReady})`}</button>
        </nav>
      </header>

      <main style={s.main}>
        {step === "upload" && (
          <>
            <div style={{ marginBottom: 40 }}>
              <h1 style={s.heroTitle}>Your next client is already<br /><span style={{ color: GOLD_LIGHT }}>in your network.</span></h1>
              <p style={s.heroSub}>Upload your LinkedIn data export and Nugget finds the BD gold hiding in your own backyard. No scraping. No cold outreach. Just insight from data you already own.</p>
            </div>

            <div style={s.uploadZone(dragOver)} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>📂</div>
              <div style={{ fontSize: 17, color: CREAM, fontWeight: 600, marginBottom: 8 }}>Drop your LinkedIn CSV files here</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 18, lineHeight: 1.5 }}>Upload Connections.csv, messages.csv, Recommendations_Received.csv,<br />Profile.csv, Skills.csv, Comments.csv, and Shares.csv</div>
              <button style={{ padding: "10px 24px", background: GOLD, color: DARK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Choose Files</button>
              <input ref={fileInputRef} type="file" multiple accept=".csv" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
              {hasFiles && (
                <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {Object.keys(uploadedFiles).map((k) => <span key={k} style={s.fileTag}>✓ {k}</span>)}
                </div>
              )}
            </div>

            {connCount > 0 && (
              <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
                <div style={s.statCard}><div style={s.statNum}>{connCount.toLocaleString()}</div><div style={s.statLabel}>Connections loaded</div></div>
                <div style={s.statCard}><div style={s.statNum}>{msgCount.toLocaleString()}</div><div style={s.statLabel}>Messages loaded</div></div>
                <div style={s.statCard}><div style={s.statNum}>{Object.keys(uploadedFiles).length}</div><div style={s.statLabel}>Files ready</div></div>
              </div>
            )}

            {error && <div style={{ background: "#3a0a0a", border: "1px solid #8B0000", borderRadius: 8, padding: "12px 16px", color: "#ff8080", fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <div style={{ marginBottom: 28 }}>
              <button style={s.primaryBtn(!!generating)} onClick={generateAll} disabled={!!generating}>
                {generating ? `⏳ Mining ${REPORTS.find(r => r.id === generating)?.name || ""}...` : "🪙 Mine All 5 Free Reports"}
              </button>
            </div>

            <div style={{ height: 1, background: BORDER, margin: "28px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {REPORTS.map((r) => (
                <div key={r.id} style={{ ...s.reportCard(false), opacity: r.free ? 1 : 0.55, cursor: r.free ? "pointer" : "default" }} onClick={() => r.free && generateReport(r.id)}>
                  {!r.free && <span style={{ position: "absolute", top: 14, right: 14, fontSize: 15, color: MUTED }}>🔒</span>}
                  <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: r.free ? GOLD + "22" : "#3a1a00", color: r.free ? GOLD_LIGHT : "#E8A000", marginBottom: 8 }}>{r.tag}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: CREAM, marginBottom: 3, fontFamily: "Georgia, serif" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{r.subtitle}</div>
                  <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{r.description}</div>
                  {reports[r.id] && <div style={{ marginTop: 10, fontSize: 11, color: GOLD, fontWeight: 600 }}>✓ Ready to view</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {step === "reports" && (
          <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 22, alignItems: "start" }}>
            <div style={s.sidebar}>
              {REPORTS.map((r) => (
                <div key={r.id} style={s.sidebarItem(activeReport === r.id)} onClick={() => setActiveReport(r.id)}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: activeReport === r.id ? GOLD_LIGHT : CREAM, marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: !r.free ? MUTED : reports[r.id] ? GOLD : generating === r.id ? GOLD_LIGHT : MUTED }}>
                    {!r.free ? "🔒 Upgrade to unlock" : generating === r.id ? "⏳ Generating..." : reports[r.id] ? "✓ Complete" : "Not yet generated"}
                  </div>
                </div>
              ))}
              <div style={{ padding: "14px 16px" }}>
                <button style={{ ...s.primaryBtn(false), fontSize: 13, padding: "10px 16px" }} onClick={() => setStep("upload")}>← Back to Upload</button>
              </div>
            </div>

            <div style={s.panel}>
              {error && <div style={{ background: "#3a0a0a", border: "1px solid #8B0000", borderRadius: 8, padding: "12px 16px", color: "#ff8080", fontSize: 13, marginBottom: 16 }}>{error}</div>}

              <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 22, fontFamily: "Georgia, serif", fontWeight: 700, color: GOLD_LIGHT, marginBottom: 4 }}>{activeReportMeta?.name}</div>
                <div style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{activeReportMeta?.subtitle}</div>
              </div>

              {!activeReportMeta?.free ? (
                <div style={{ textAlign: "center", padding: "48px 32px" }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>🏆</div>
                  <div style={{ fontSize: 22, fontFamily: "Georgia, serif", color: GOLD_LIGHT, marginBottom: 10 }}>The Gold Nugget</div>
                  <p style={{ fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.7, maxWidth: 400, margin: "0 auto 28px" }}>
                    Your complete BD action plan — prioritized targets, warm paths into companies, missed conversations that are still warm, and outreach sequences ready to go.<br /><br />
                    The free reports show you where the opportunity is. The Gold Nugget hands you a map to go get it.
                  </p>
                  <button style={{ padding: "12px 32px", background: "transparent", border: `2px solid ${GOLD}`, color: GOLD_LIGHT, borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>Upgrade to Gold Nugget →</button>
                </div>
              ) : generating === activeReport ? (
                <div style={{ textAlign: "center", padding: "60px 32px" }}>
                  <div style={s.spinner} />
                  <div style={{ color: MUTED, fontSize: 14 }}>Mining your data for gold...</div>
                </div>
              ) : reports[activeReport] ? (
                <ReportContent text={reports[activeReport]} />
              ) : (
                <div style={{ textAlign: "center", padding: "60px 32px" }}>
                  <div style={{ fontSize: 38, marginBottom: 14 }}>🪙</div>
                  <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>This report hasn't been generated yet.</div>
                  <button style={{ ...s.primaryBtn(!!generating), width: "auto", padding: "10px 24px", fontSize: 14 }} onClick={() => generateReport(activeReport)} disabled={!!generating}>
                    Generate {activeReportMeta?.name}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
