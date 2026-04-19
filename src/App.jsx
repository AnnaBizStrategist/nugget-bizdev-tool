import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import JSZip from "jszip";

const BLUE_DEEP = "#0d2d6b";
const BLUE_MID = "#1149ac";
const BLUE_BRIGHT = "#41a1e8";
const BLUE_LIGHT = "#7ec8f5";
const DARK = "#0a1628";
const DARK_CARD = "#0f2040";
const WHITE = "#e8f0fe";
const MUTED = "#9fc4e8";
const BORDER = "#1e4080";

const REPORTS = [
  {
    id: "field",
    name: "The Field Report",
    tag: "FREE",
    subtitle: "What your network is really made of",
    description: "Survey your land — who's actually in your network, how many match your ICP, and your top 10 untapped connections.",
    files: ["Connections"],
    free: true,
  },
  {
    id: "warm",
    name: "The Warm List",
    tag: "FREE",
    subtitle: "Who's warm, who's not — and what to do about it",
    description: "Hot, warm, cool, cold — every connection scored by actual interaction data. Find who to call first.",
    files: ["Connections", "Messages"],
    free: true,
  },
  {
    id: "hidden",
    name: "The Hidden Nuggets Report",
    tag: "FREE",
    subtitle: "Who's already in your corner",
    description: "The people already in your corner who you're not leveraging. Ranked by likely value and best ask type.",
    files: ["Recommendations", "Messages"],
    free: true,
  },
  {
    id: "inbound",
    name: "The Inbound Report",
    tag: "FREE",
    subtitle: "Is your profile ready to convert?",
    description: "If a perfect prospect landed on your profile right now — would they stay or bounce?",
    files: ["Profile", "Skills", "Endorsements"],
    free: true,
  },
  {
    id: "outbound",
    name: "The Outbound Report",
    tag: "FREE",
    subtitle: "What the market thinks of you right now",
    description: "What your LinkedIn activity broadcasts to potential clients when you're not paying attention.",
    files: ["Comments", "Shares"],
    free: true,
  },
  {
    id: "gold",
    name: "The Gold Nugget",
    tag: "PAID",
    subtitle: "Full BD action plan",
    description: "Your complete pipeline — prioritized targets, warm paths, missed conversations, outreach sequences. The treasure map.",
    files: ["Connections", "Messages"],
    free: false,
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

function parseLinkedInCSV(file, onComplete) {
  const isConnections = file.name.toLowerCase().includes("connection");
  if (isConnections) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n");
      const csvText = lines.slice(3).join("\n");
      Papa.parse(csvText, { header: true, skipEmptyLines: true, complete: onComplete });
    };
    reader.readAsText(file);
  } else {
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: onComplete });
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
      messages: [{ role: "user", content: `Here is the LinkedIn export data to analyze:\n\n${JSON.stringify(data, null, 2)}\n\nGenerate the report now. Be specific, use real names from the data, and make every insight immediately actionable.` }],
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
      const limit = k === "Messages" ? 100 : k === "Connections" ? 150 : 75;
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
    <div style={{ lineHeight: 1.85 }}>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <h3 key={i} style={{ color: BLUE_BRIGHT, fontSize: 13, fontWeight: 700, marginTop: 28, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase", borderLeft: "3px solid #41a1e8", paddingLeft: 10, paddingBottom: 4 }}>{line.replace("## ", "")}</h3>;
        }
        const boldParsed = line.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${BLUE_LIGHT}">${"$1"}</strong>`);
        if (line.match(/^\d+\./)) {
          return (
            <div key={i} style={{ display: "flex", gap: 12, margin: "8px 0", paddingLeft: 8 }}>
              <span style={{ color: BLUE_BRIGHT, fontWeight: 700, minWidth: 20, fontSize: 13 }}>{line.match(/^\d+/)[0]}.</span>
              <p style={{ color: WHITE, margin: 0, fontSize: 14, flex: 1 }} dangerouslySetInnerHTML={{ __html: boldParsed.replace(/^\d+\./, "") }} />
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} style={{ display: "flex", gap: 10, margin: "6px 0", paddingLeft: 8 }}>
              <span style={{ color: BLUE_BRIGHT, marginTop: 8, width: 5, height: 5, borderRadius: "50%", background: BLUE_BRIGHT, flexShrink: 0, display: "block" }} />
              <p style={{ color: WHITE, margin: 0, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: boldParsed.replace(/^[-•]\s/, "") }} />
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ color: WHITE, margin: "5px 0", fontSize: 14 }} dangerouslySetInnerHTML={{ __html: boldParsed }} style={{ fontSize: 15, margin: "6px 0", color: "#e8f0fe", lineHeight: 1.85 }} />;
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
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback((fileList) => {
    Array.from(fileList).forEach((file) => {
      if (file.name.endsWith(".zip")) {
        // Auto-unzip LinkedIn export
        JSZip.loadAsync(file).then((zip) => {
          zip.forEach((relativePath, zipEntry) => {
            const fileName = relativePath.split("/").pop();
            if (!fileName.endsWith(".csv")) return;
            const key = getFileKey(fileName);
            zipEntry.async("string").then((csvText) => {
              const isConnections = fileName.toLowerCase().includes("connection");
              const processText = isConnections
                ? csvText.split("\n").slice(3).join("\n")
                : csvText;
              Papa.parse(processText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                  if (results.data.length > 0) {
                    setUploadedFiles((prev) => ({ ...prev, [key]: fileName }));
                    setParsedData((prev) => ({ ...prev, [key]: results.data }));
                  }
                },
              });
            });
          });
        });
      } else if (file.name.endsWith(".csv")) {
        const key = getFileKey(file.name);
        setUploadedFiles((prev) => ({ ...prev, [key]: file.name }));
        parseLinkedInCSV(file, (results) => {
          setParsedData((prev) => ({ ...prev, [key]: results.data }));
        });
      }
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
    const freeReports = REPORTS.filter((r) => r.free);
    for (let i = 0; i < freeReports.length; i++) {
      const report = freeReports[i];
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
      if (i < freeReports.length - 1) {
        for (let s = 15; s > 0; s--) {
          setCountdown(s);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setCountdown(0);
      }
    }
  };

  const hasFiles = Object.keys(uploadedFiles).length > 0;
  const connCount = parsedData["Connections"]?.length || 0;
  const msgCount = parsedData["Messages"]?.length || 0;
  const reportsReady = Object.keys(reports).length;
  const activeReportMeta = REPORTS.find((r) => r.id === activeReport);

  return (
    <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'DM Sans', -apple-system, sans-serif", color: WHITE }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DARK}; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 40px", display: "flex", alignItems: "center", background: DARK_CARD }}>
        <div>
          <div style={{ fontSize: 24, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, letterSpacing: "-0.5px" }}>
            🐔 <span style={{ background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Nugget™</span>
          </div>
          <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>The BizDev Tool for Founders</div>
        </div>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${step === "upload" ? BLUE_BRIGHT : BORDER}`, background: step === "upload" ? BLUE_MID + "44" : "transparent", color: step === "upload" ? BLUE_BRIGHT : MUTED, cursor: "pointer", fontSize: 13 }} onClick={() => setStep("upload")}>Upload</button>
          <button style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${step === "reports" ? BLUE_BRIGHT : BORDER}`, background: step === "reports" ? BLUE_MID + "44" : "transparent", color: step === "reports" ? BLUE_BRIGHT : MUTED, cursor: "pointer", fontSize: 13 }} onClick={() => reportsReady > 0 && setStep("reports")}>
            Reports {reportsReady > 0 && `(${reportsReady})`}
          </button>
        </nav>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px" }}>
        {step === "upload" && (
          <>
            {/* Hero */}
            <div style={{ textAlign: "center", marginBottom: 44, background: `linear-gradient(160deg, #061022 0%, #0d2d6b 40%, #1149ac 70%, #41a1e8 100%)`, margin: "0 0 44px 0", padding: "56px 24px 48px", borderRadius: 16 }}>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", maxWidth: 520, margin: "0 auto 20px", lineHeight: 1.65, letterSpacing: "0.01em" }}>
                Nugget is a powerful Business Development tool that reads your own LinkedIn data and shows you the gold hiding inside it.
              </p>
              <h1 style={{ fontSize: 44, fontFamily: "Georgia, serif", fontWeight: 700, color: "#ffffff", marginBottom: 24, lineHeight: 1.15 }}>
                Your next client is already<br />
                <span style={{ background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in your network.</span>
              </h1>
              <p style={{ fontSize: 19, color: "#ffffff", fontWeight: 800, marginBottom: 20, letterSpacing: "0.04em" }}>
                NO scraping.&nbsp;&nbsp;&nbsp;NO cold outreach.&nbsp;&nbsp;&nbsp;NO guessing.
              </p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", maxWidth: 380, margin: "0 auto 0", lineHeight: 1.65 }}>
                Just intelligence from data you already own.
              </p>
            </div>

            {/* Upload Zone */}
            {/* Onboarding Steps */}
            <div style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
              <p style={{ fontSize: 20, color: "#ffffff", fontWeight: 700, textAlign: "center", marginBottom: 28, fontFamily: "Georgia, serif", letterSpacing: "-0.3px" }}>
                Your Nuggets are waiting — Just 3 easy steps to find them...
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", gap: 0, alignItems: "start" }}>
                {[
                  { step: "01", title: "Request your data", desc: "On LinkedIn go to Me → Settings & Privacy → Data Privacy → Request a copy of your data. Select all and click Request archive." },
                  { step: "02", title: "Download the file", desc: "LinkedIn will email you within 24 hours. Click the link in that email and download the file to your computer." },
                  { step: "03", title: "Drop it in below", desc: "Drag and drop the file directly into Nugget. That's it — Nugget does the rest automatically." },
                ].reduce((acc, s, i) => {
                  acc.push(
                    <div key={s.step} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 20px" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: BLUE_BRIGHT, fontFamily: "Georgia, serif", opacity: 0.5, lineHeight: 1, marginBottom: 4 }}>{s.step}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, marginBottom: 4 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>{s.desc}</div>
                    </div>
                  );
                  if (i < 2) acc.push(<div key={`divider-${i}`} style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />);
                  return acc;
                }, [])}
              </div>
            </div>

            <div
              style={{ border: `2px dashed ${dragOver ? BLUE_BRIGHT : BORDER}`, borderRadius: 16, padding: "44px 32px", textAlign: "center", cursor: "pointer", background: dragOver ? BLUE_MID + "11" : DARK_CARD, transition: "all 0.2s", marginBottom: 28 }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: 36, marginBottom: 14 }}>📂</div>
              <div style={{ fontSize: 17, color: WHITE, fontWeight: 600, marginBottom: 8 }}>Drop your LinkedIn file here</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 18, lineHeight: 1.5 }}>
                Drop the file LinkedIn emailed you — Nugget unzips and reads it automatically.<br />Or drag individual CSV files if you prefer.
              </div>
              <button style={{ padding: "10px 28px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Choose Files
              </button>
              <input ref={fileInputRef} type="file" multiple accept=".csv,.zip" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
              {hasFiles && (
                <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {Object.keys(uploadedFiles).map((k) => (
                    <span key={k} style={{ padding: "4px 12px", background: BLUE_MID + "33", border: `1px solid ${BLUE_BRIGHT}44`, borderRadius: 20, fontSize: 12, color: BLUE_BRIGHT }}>✓ {k}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            {connCount > 0 && (
              <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
                {[
                  { num: connCount.toLocaleString(), label: "Connections loaded" },
                  { num: msgCount.toLocaleString(), label: "Messages loaded" },
                  { num: Object.keys(uploadedFiles).length, label: "Files ready" },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, background: `linear-gradient(135deg, ${BLUE_DEEP}, ${DARK_CARD})`, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: BLUE_BRIGHT, fontFamily: "Georgia, serif" }}>{s.num}</div>
                    <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {error && <div style={{ background: "#1a0a0a", border: "1px solid #8B0000", borderRadius: 8, padding: "12px 16px", color: "#ff8080", fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${BORDER}, transparent)`, margin: "0 0 24px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {REPORTS.map((r) => (
                <div key={r.id} style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, opacity: r.free ? 1 : 0.5, position: "relative", borderTop: `3px solid transparent`, backgroundImage: `linear-gradient(${DARK_CARD}, ${DARK_CARD}), linear-gradient(90deg, ${r.free ? BLUE_BRIGHT : BORDER}, ${r.free ? BLUE_MID : BORDER})`, backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box", display: "flex", flexDirection: "column" }}>
                  {!r.free && <span style={{ position: "absolute", top: 14, right: 14, fontSize: 15, color: MUTED }}>🔒</span>}
                  <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: r.free ? BLUE_MID + "33" : "#2a1a00", color: r.free ? BLUE_BRIGHT : "#E8A000", marginBottom: 8 }}>{r.tag}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, marginBottom: 3, fontFamily: "Georgia, serif" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{r.subtitle}</div>
                  <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginBottom: 14, flex: 1 }}>{r.description}</div>
                  {r.free ? (
                    reports[r.id] ? (
                      <button style={{ padding: "8px 16px", background: BLUE_MID + "33", border: `1px solid ${BLUE_BRIGHT}`, color: BLUE_BRIGHT, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }}
                        onClick={() => { setActiveReport(r.id); setStep("reports"); }}>✓ View Report</button>
                    ) : (
                      <button style={{ padding: "8px 16px", background: generating === r.id ? BLUE_MID + "44" : `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, border: "none", color: WHITE, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", width: "100%" }}
                        onClick={() => generateReport(r.id)} disabled={!!generating}>
                        {generating === r.id ? "⏳ Mining..." : "🪙 Generate Report"}
                      </button>
                    )
                  ) : (
                    <button style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "default", width: "100%" }}>🔒 Upgrade to unlock</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {step === "reports" && (
          <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 22, alignItems: "start" }}>
            {/* Sidebar */}
            <div style={{ background: DARK_CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden", position: "sticky", top: 24 }}>
              {REPORTS.map((r) => (
                <div
                  key={r.id}
                  style={{ padding: "13px 16px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: activeReport === r.id ? BLUE_MID + "33" : "transparent", borderLeft: `3px solid ${activeReport === r.id ? BLUE_BRIGHT : "transparent"}`, transition: "all 0.15s" }}
                  onClick={() => setActiveReport(r.id)}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: activeReport === r.id ? BLUE_BRIGHT : WHITE, marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: !r.free ? MUTED : reports[r.id] ? BLUE_BRIGHT : generating === r.id ? BLUE_LIGHT : MUTED }}>
                    {!r.free ? "🔒 Upgrade to unlock" : generating === r.id ? `⏳ ${countdown > 0 ? `Next in ${countdown}s...` : "Generating..."}` : reports[r.id] ? "✓ Complete" : "Not yet generated"}
                  </div>
                </div>
              ))}
              <div style={{ padding: "14px 16px" }}>
                <button style={{ width: "100%", padding: "10px 16px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => setStep("upload")}>← Back to Upload</button>
              </div>
            </div>

            {/* Report Panel */}
            <div style={{ background: DARK_CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 32, minHeight: 420 }}>
              {error && <div style={{ background: "#1a0a0a", border: "1px solid #8B0000", borderRadius: 8, padding: "12px 16px", color: "#ff8080", fontSize: 13, marginBottom: 16 }}>{error}</div>}

              <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 22, fontFamily: "Georgia, serif", fontWeight: 700, background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>{activeReportMeta?.name}</div>
                <div style={{ fontSize: 12, color: MUTED, letterSpacing: "0.02em" }}>{activeReportMeta?.subtitle}</div>
              </div>

              {!activeReportMeta?.free ? (
                <div style={{ textAlign: "center", padding: "48px 32px" }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>🏆</div>
                  <div style={{ fontSize: 22, fontFamily: "Georgia, serif", background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10 }}>The Gold Nugget</div>
                  <p style={{ fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.7, maxWidth: 400, margin: "0 auto 28px" }}>
                    Your complete BD action plan — prioritized targets, warm paths into companies, missed conversations that are still warm, and outreach sequences ready to go.<br /><br />
                    The free reports show you where the opportunity is. The Gold Nugget hands you a map to go get it.
                  </p>
                  <button style={{ padding: "12px 32px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>Upgrade to Gold Nugget →</button>
                </div>
              ) : generating === activeReport ? (
                <div style={{ textAlign: "center", padding: "60px 32px" }}>
                  <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTop: `3px solid ${BLUE_BRIGHT}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                  <div style={{ color: MUTED, fontSize: 14 }}>{countdown > 0 ? `⏱️ Next report in ${countdown}s...` : "Mining your data for gold..."}</div>
                </div>
              ) : reports[activeReport] ? (
                <ReportContent text={reports[activeReport]} />
              ) : (
                <div style={{ textAlign: "center", padding: "60px 32px" }}>
                  <div style={{ fontSize: 38, marginBottom: 14 }}>🪙</div>
                  <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>This report hasn't been generated yet.</div>
                  <button
                    style={{ padding: "10px 24px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer" }}
                    onClick={() => generateReport(activeReport)}
                    disabled={!!generating}
                  >
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
