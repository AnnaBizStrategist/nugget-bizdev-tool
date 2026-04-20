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
    subtitle: "Who's warm, who's not",
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
    subtitle: "What the market thinks of you",
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
        return <p key={i} style={{ fontSize: 15, margin: "6px 0", color: "#e8f0fe", lineHeight: 1.85 }} dangerouslySetInnerHTML={{ __html: boldParsed }} />;
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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [pendingReportId, setPendingReportId] = useState(null);
  const [emailName, setEmailName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback((fileList) => {
    Array.from(fileList).forEach((file) => {
      if (file.name.endsWith(".zip")) {
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

  const runReport = async (reportId) => {
    const report = REPORTS.find((r) => r.id === reportId);
    if (!report?.free || generating) return;
    setGenerating(reportId);
    setActiveReport(reportId);
    setStep("reports");
    setError(null);
    try {
      const data = prepareData(parsedData, report.files);
      const result = await callClaude(PROMPTS[reportId], data);
      setReports((prev) => ({ ...prev, [reportId]: result }));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  };

  const generateReport = (reportId) => {
    const report = REPORTS.find((r) => r.id === reportId);
    if (!report?.free || generating) return;
    if (!emailSubmitted) {
      setPendingReportId(reportId);
      setShowEmailModal(true);
      return;
    }
    runReport(reportId);
  };

  const submitEmail = async () => {
    if (!emailName.trim() || !emailAddress.trim()) return;
    setEmailSubmitted(true);
    setShowEmailModal(false);
    const pending = pendingReportId;
    setPendingReportId(null);
    // Call runReport directly — bypasses the email gate so no race condition
    if (pending) runReport(pending);
    fetch("https://hook.us2.make.com/xu7d06pva2t2hhyccr86ddar7msqm4zl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: emailName.trim(),
        email: emailAddress.trim(),
        source: "nugget-free-user",
      }),
    }).catch((err) => console.log("Webhook error:", err));
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
        setReports((prev) => ({ ...prev, [report.id]: `Error: ${err.message}` }));
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
        html, body { margin: 0; padding: 0; background: #0a1628; overflow-x: hidden; }
        input { outline: none !important; }
        input::placeholder { color: #4a6a8a; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a1628; }
        ::-webkit-scrollbar-thumb { background: #1e4080; border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DARK}; }
      `}</style>

            {/* Header */}
      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 40px", display: "flex", alignItems: "center", background: DARK_CARD }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <img src="data:image/png;base64,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" alt="Nugget" style={{ height: 48, width: "auto", display: "block" }} />
          <div>
            <div style={{ fontSize: 24, fontFamily: "Georgia, serif", fontWeight: 700, letterSpacing: "-0.5px", background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Nugget<span style={{fontSize: 13, verticalAlign: "super", marginLeft: 1}}>™</span></div>
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>The BizDev Tool for Founders</div>
          </div>
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

            {/* Onboarding Steps */}
            <div style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
              <p style={{ fontSize: 20, color: "#ffffff", fontWeight: 700, textAlign: "center", marginBottom: 28, fontFamily: "Georgia, serif", letterSpacing: "-0.3px" }}>
                Your Nuggets are waiting — Just 3 easy steps to find them...
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", gap: 0, alignItems: "start" }}>
                {[
                  { step: "01", title: "Request your data", desc: "On LinkedIn go to Me → Settings & Privacy → Data Privacy → Request a copy of your data. Select all and click Request archive." },
                  { step: "02", title: "Download the file", desc: "Next, wait for LinkedIn to email your data file — usually within 24 hours. Click the link in that email and download the file to your computer." },
                  { step: "03", title: "Drop it in below", desc: "Then drag and drop the file into Nugget below. That's it! Nugget works its magic and does the rest automatically. Let's get your Nuggets..." },
                ].reduce((acc, s, i) => {
                  acc.push(
                    <div key={s.step} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 20px" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: BLUE_BRIGHT, fontFamily: "Georgia, serif", opacity: 0.5, lineHeight: 1, marginBottom: 4 }}>Step {s.step}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, marginBottom: 4 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>{s.desc}</div>
                    </div>
                  );
                  if (i < 2) acc.push(<div key={`divider-${i}`} style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />);
                  return acc;
                }, [])}
              </div>
            </div>

            {/* Upload Zone */}
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
                Drop the file LinkedIn sent you here — Nugget takes it from there.<br />Or upload individual files if you prefer.
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
                        {generating === r.id ? "⏳ Mining..." : "Generate Report"}
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
                  <div style={{ color: MUTED, fontSize: 14 }}>{countdown > 0 ? `Next report in ${countdown}s...` : "Mining your data for gold..."}</div>
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

      {/* Email Capture Modal */}
      {showEmailModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(2, 8, 18, 0.97)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 24, color: "#e8f0fe"
        }}>
          <div style={{
            background: `linear-gradient(160deg, #0f2040 0%, #0a1628 100%)`,
            border: `1px solid ${BLUE_BRIGHT}66`,
            borderRadius: 20, padding: "40px 48px", maxWidth: 480, width: "100%",
            boxShadow: `0 0 80px rgba(65, 161, 232, 0.15), 0 24px 60px rgba(0,0,0,0.8)`,
            animation: "fadeIn 0.2s ease-out"
          }}>
            <img src="data:image/png;base64,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" alt="Nugget" style={{ height: 56, width: "auto", display: "block", margin: "0 auto 12px" }} />
            <h2 style={{ fontSize: 24, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, textAlign: "center", marginBottom: 8, lineHeight: 1.3 }}>
              Where should we send your personalized Nugget reports?
            </h2>
            <p style={{ fontSize: 14, color: MUTED, textAlign: "center", marginBottom: 28, lineHeight: 1.6 }}>
              Your reports are ready to generate. Enter your details and we'll deliver them straight to your inbox.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>First Name</label>
                <input
                  type="text"
                  placeholder="Your first name"
                  value={emailName}
                  onChange={(e) => setEmailName(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", background: "#0a1628", border: `1px solid ${BLUE_BRIGHT}44`, borderRadius: 8, color: WHITE, fontSize: 15, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Email Address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                  style={{ width: "100%", padding: "12px 16px", background: "#0a1628", border: `1px solid ${BLUE_BRIGHT}44`, borderRadius: 8, color: WHITE, fontSize: 15, outline: "none" }}
                />
              </div>
            </div>
            <button
              onClick={submitEmail}
              disabled={emailSubmitting || !emailName.trim() || !emailAddress.trim()}
              style={{ width: "100%", padding: "14px 24px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, border: "none", borderRadius: 10, color: WHITE, fontSize: 16, fontWeight: 700, cursor: emailSubmitting ? "not-allowed" : "pointer", fontFamily: "Georgia, serif", marginBottom: 12, opacity: emailSubmitting ? 0.6 : 1, transition: "opacity 0.2s" }}
            >
              {emailSubmitting ? "Getting your Nuggets ready..." : "Get My Reports →"}
            </button>
            <p style={{ fontSize: 11, color: MUTED, textAlign: "center", lineHeight: 1.5 }}>
              No spam. No sharing. Just your personalized Nugget reports.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
