import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import JSZip from "jszip";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BLUE_DEEP   = "#0d2d6b";
const BLUE_MID    = "#1149ac";
const BLUE_BRIGHT = "#41a1e8";
const BLUE_LIGHT  = "#7ec8f5";
const DARK        = "#0a1628";
const DARK_CARD   = "#0f2040";
const WHITE       = "#e8f0fe";
const MUTED       = "#9fc4e8";
const BORDER      = "#1e4080";

const LOGO_BASE64 = null;

// ── Report definitions ────────────────────────────────────────────────────────
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

// ── AI Prompts ──────────────────────────────────────────────────────────────
const PROMPTS = {
  field: `You are a senior LinkedIn BD strategist analyzing a founder's professional network. Generate "The Field Report" — a sharp, specific BD intelligence briefing.

Do not include a title or heading at the start of your response. Begin directly with the first section.

Format your response with these exact sections:

## Network Overview
State total connections and highlight what % and how many are founders/owners/CEOs (ICP). Include an observation about connection growth rate and trajectory — is it accelerating, steady, or stagnating? Be specific with numbers. Write 2-3 sentences.

## Network Strengths & Gaps  
Where is this network dense by industry/function? Where are the notable blind spots for BD purposes?

## Top 10 Untapped Connections
List 10 strategically valuable people not yet leveraged for BD. Use real names from the data. Format: **Name** | Title | Company | Why they matter for BD

## The Verdict
2-3 direct, honest sentences starting with "Your network is..." Give them the real picture — what it means for their BD potential right now.

## Next Steps
3 specific actions they can take this week based on what the data revealed. Make them concrete and immediately doable.

Speak directly to the founder. Use real names and specific numbers. No corporate language. No fluff.`,

  warm: `You are a relationship intelligence analyst. Generate "The Warm List" — a heat map of this founder's actual relationship strength.

Do not include a title or heading at the start of your response. Begin directly with the first section.

Use message frequency and recency to score relationships. Focus on BD relevance. Keep each section to top 5 people maximum.

## Hot Contacts — Engage This Week
Top 5 people with real, active relationship momentum. Format: **Name** | Why hot | Best opening move

## Warm Contacts — Activate Now
Top 5 people with existing relationship that just needs a nudge. Format: **Name** | When last active | Recommended reactivation angle

## Cool But Valuable — Worth Reviving  
Top 5 people who went quiet but still matter for BD. Format: **Name** | Why they still matter | How to re-open naturally

## Reality Check
One honest observation about their relationship patterns — something they probably haven't noticed. Keep it direct but kind.

## 3 Outreach Conversation Starters
Ready-to-use opening lines they can adapt and send today:
1. [Starter for reactivating a warm contact]
2. [Starter for reaching out to a cool contact]
3. [Starter for deepening a hot relationship]

## Next Steps
3 specific actions to take this week. Name real people where possible.

Use real names. Be direct. Make every recommendation immediately actionable.`,

  hidden: `You are an advocacy analyst. Generate "The Hidden Nuggets Report" — uncovering overlooked champions.

Do not include a title or heading at the start of your response. Begin directly with the first section.

Look for: people who wrote recommendations, consistent high-volume messagers, patterns of support and responsiveness. Limit to 5-10 advocates maximum with richer insight per person.

## Your Hidden Advocates
5-10 people ranked by likely willingness and strategic BD value:
**Name** | Title | Why they're already in your corner | Relationship depth | Best ask: (referral / intro / recommendation / collaboration)

## The Three You're Definitely Overlooking
Name 3 specific people the data shows are clearly supportive but almost certainly never asked for anything.

## Referral Ask Framework
**Who to ask:** [Profile of your strongest advocates based on the data]
**How to ask:** A natural, non-awkward way to make the ask — 2-3 sentences they can adapt
**What to ask for:** Rank these in order for this founder: referrals / intros / recommendations / collaboration

## Outreach Templates by Ask Type
For referrals: [2-sentence template]
For introductions: [2-sentence template]  
For recommendations: [2-sentence template]

## Next Steps
3 specific actions. Name real advocates from the data.

Be specific. Use names. Every line should be immediately usable.`,

  inbound: `You are a LinkedIn profile strategist specializing in founder BD readiness. Generate "The Inbound Report."

Do not include a title or heading at the start of your response. Begin directly with the first section.

Analyze the headline, summary, skills, and endorsements for BD effectiveness. Consider their diverse background as a potential credibility asset, not a liability.

## Profile Scorecard
Rate each dimension using only these text labels — no emojis or colored dots:

**Headline:** Critical Crack / Needs Attention / Locked In — [one sentence on why]
**About/Summary:** Critical Crack / Needs Attention / Locked In — [one sentence on why]
**Skills & Endorsements:** Critical Crack / Needs Attention / Locked In — [one sentence on why]
**Overall BD Readiness:** Critical Crack / Needs Attention / Locked In — [one sentence verdict]

## What a Perfect Prospect Sees
Walk through the first impression for their specific ICP. What does an ideal client feel when they land here? Do they stay or bounce? Why? Be honest.

## The 3 Fixes — Ranked by Impact
Specific, immediately actionable edits. No vague advice.

1. **[Highest impact]:** [exact recommended change and why]
2. **[Second]:** [exact recommended change and why]
3. **[Third]:** [exact recommended change and why]

## Keywords Assessment
What search terms would their ICP use? Are those words present? What's missing?

## Next Steps
3 specific profile updates to make this week, in order of priority.

Be direct. Specific edits only. No flattery.`,

  outbound: `You are a market signal analyst who understands personal branding. Generate "The Outbound Report" — what this founder's LinkedIn activity is broadcasting.

Do not include a title or heading at the start of your response. Begin directly with the first section.

Speak directly to the founder throughout — use "you" and "your" at all times. Never refer to them in the third person.

Key principle: honour their personal brand. Memorable quirks are competitive advantages, not liabilities. Human connection IS a content strategy. Evaluate everything through the lens of "does this attract my ICP?"

Analyze the comments and shares/posts to understand their market signal and social selling effectiveness.

## Signal Strength: X/10
What does their LinkedIn activity communicate to potential clients right now? Include a social selling assessment — are they showing up as a trusted advisor or just a broadcaster?

## What Potential Clients Actually See
Based on content themes and engagement patterns — what impression does a potential client form observing your LinkedIn behavior over 30 days? Be specific about what's working and what isn't.

## Topic Alignment Check
What topics dominate your engagement? Do they align with what you sell? Where's the disconnect? Does your content attract your ICP or a different audience?

## The 3 Shifts — Ranked by BD Impact
Specific, immediately actionable content changes:

1. **Most impactful:** [specific change and why it matters for BD]
2. **Second:** [specific change and why it matters for BD]  
3. **Third:** [specific change and why it matters for BD]

## This Week's 3 Posts
Content ideas tailored to your voice and ICP:
1. [Post idea with angle and why it attracts your ICP]
2. [Post idea with angle and why it attracts your ICP]
3. [Post idea with angle and why it attracts your ICP]

## Next Steps
3 specific actions this week. Make them concrete.

Speak directly to the founder. Honour what's uniquely theirs.`,

  gold: `You are Anna Ludwinowski, Business Foundation Strategist and LinkedIn BD expert. Generate "The Gold Nugget" — a complete, personalized BD action plan that feels like a blueprint, not a report.

Do not include a title or heading at the start of your response. Begin directly with the Welcome Note.

Anna's voice: warm, direct, witty. Zero fluff. Treat the founder like a smart adult who can handle the truth and act on it.

Format your response with these exact sections:

## Welcome Note
A warm, personal 2-3 sentence opening from Anna. Acknowledge what the data showed. Make them feel seen, not audited. End with something that makes them want to keep reading.

## Your Situation at a Glance
Honest summary of their biggest wins AND their biggest gaps. No corporate softening. Use all 5 free reports as your source.

**What's working:**
- [specific win from the data]
- [specific win from the data]
- [specific win from the data]

**Where the gaps are:**
- [specific gap from the data]
- [specific gap from the data]
- [specific gap from the data]

## Fix Your Front Door First
Their top 3 profile fixes, ranked by BD impact. Specific and immediately actionable — no vague advice.

1. **[Fix]:** [Exact recommended change and why it matters for their specific BD goals]
2. **[Fix]:** [Exact recommended change and why it matters for their specific BD goals]
3. **[Fix]:** [Exact recommended change and why it matters for their specific BD goals]

## Your Content Play
3 specific content shifts based on their actual posting patterns. Then 3 post ideas for this week tailored to their voice and ICP.

**The 3 Shifts:**
1. [Specific shift with reasoning]
2. [Specific shift with reasoning]
3. [Specific shift with reasoning]

**This Week's 3 Posts:**
1. [Post idea with angle — explain why this attracts their ICP]
2. [Post idea with angle — explain why this attracts their ICP]
3. [Post idea with angle — explain why this attracts their ICP]

## Your People — The Next 25
The 25 people they should be talking to right now. Pull from Warm List and Hidden Nuggets data. Use real names. For each: **Name** | Why now | Best opening move.

**Move Now — Hot (5 people)**
[5 people with highest relationship momentum and BD value]

**Activate This Month — Warm (10 people)**
[10 people with existing warmth that just needs a nudge]

**Worth Reviving — Still Valuable (10 people)**
[10 people who went quiet but still represent real BD opportunity]

## Conversations You Haven't Finished
Identify 5 people where a promising conversation went quiet — someone who expressed interest, asked a question, or engaged meaningfully but never converted to a real BD conversation. For each: **Name** | What was said | How to re-open it naturally

## Your Outreach Sequences
3 ready-to-send outreach sequences tailored to their actual relationships and voice. Not templates — real messages they can send today.

**Sequence 1 — Reactivating a warm contact:**
[Personalized opening message using real context from the data]

**Sequence 2 — Asking for a referral:**
[Personalized ask using a real advocate from the data]

**Sequence 3 — Starting a new BD conversation:**
[Personalized opener to someone from the Next 25 list]

## Your 30-Day Action Plan
A realistic, prioritized plan broken into three phases.

**Week 1 — Fix the foundation:**
- [Action]
- [Action]
- [Action]

**Weeks 2–3 — Activate your people:**
- [Action]
- [Action]
- [Action]

**Week 4 — Build the habit:**
- [Action]
- [Action]
- [Action]

## Next Steps
Their prioritized action list. No timeline — their cadence. Max 7 items, ranked by impact.

---

At the very end of your response, on its own line, output exactly this block and nothing after it:
<SCORES>
{"networkStrength": 0, "profileStrength": 0, "contentStrength": 0, "relationshipStrength": 0, "advocateStrength": 0}
</SCORES>

Replace the 0s with honest scores from 0-100 based on the data. Most founders score 45-72 overall. Score each: Network Strength = ICP match % and network quality. Profile Strength = profile BD readiness. Content Strength = posting consistency and ICP alignment. Relationship Strength = warm relationship depth and messaging activity. Advocate Strength = hidden nuggets count and referral potential.`,
};

// ── Score utilities ───────────────────────────────────────────────────────────
function parseScores(text) {
  const match = text.match(/<SCORES>([\s\S]*?)<\/SCORES>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
}

function stripScores(text) {
  return text.replace(/<SCORES>[\s\S]*?<\/SCORES>/g, "").trim();
}

// ── CSV / ZIP helpers ─────────────────────────────────────────────────────────
function parseLinkedInCSV(file, onComplete) {
  const isConnections = file.name.toLowerCase().includes("connection");
  if (isConnections) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split("\n");
      Papa.parse(lines.slice(3).join("\n"), { header: true, skipEmptyLines: true, complete: onComplete });
    };
    reader.readAsText(file);
  } else {
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: onComplete });
  }
}

function getFileKey(name) {
  const lower = name.toLowerCase().replace(/[-_ ]/g, "");
  if (lower.includes("connection"))  return "Connections";
  if (lower.includes("message"))     return "Messages";
  if (lower.includes("recommendation")) return "Recommendations";
  if (lower.includes("endorsement")) return "Endorsements";
  if (lower.includes("skill"))       return "Skills";
  if (lower.includes("profile") && !lower.includes("summary")) return "Profile";
  if (lower.includes("comment"))     return "Comments";
  if (lower.includes("reaction"))    return "Reactions";
  if (lower.includes("share"))       return "Shares";
  if (lower.includes("invitation"))  return "Invitations";
  return name.replace(".csv", "");
}

// ── API calls ─────────────────────────────────────────────────────────────────
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
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || `API error ${response.status}`); }
  return (await response.json()).content[0].text;
}

async function callClaudeGN(systemPrompt, data, reportsContext) {
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
      max_tokens: 3500,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Here is the LinkedIn export data:\n\n${JSON.stringify(data, null, 2)}\n\n---\n\nHere are the 5 free reports already generated for this founder:\n\n${reportsContext}\n\nGenerate the Gold Nugget report now. Use these reports as your primary source. Use real names and make every recommendation immediately actionable.`,
      }],
    }),
  });
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || `API error ${response.status}`); }
  return (await response.json()).content[0].text;
}

function prepareData(parsedData, fileKeys) {
  const out = {};
  fileKeys.forEach((k) => {
    if (parsedData[k]) {
      const limit = k === "Messages" ? 100 : k === "Connections" ? 150 : 75;
      out[k] = parsedData[k].slice(0, limit);
    }
  });
  if (Object.keys(out).length === 0) out["_note"] = "No matching files uploaded. Provide analysis based on typical founder LinkedIn patterns.";
  return out;
}

// ── Report content renderer ───────────────────────────────────────────────────
function ReportContent({ text }) {
  return (
    <div style={{ lineHeight: 1.85 }}>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} style={{ color: BLUE_BRIGHT, fontSize: 13, fontWeight: 700, marginTop: 28, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase", borderLeft: "3px solid #41a1e8", paddingLeft: 10, paddingBottom: 4 }}>{line.replace("## ", "")}</h3>;
        const bold = line.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${BLUE_LIGHT}">$1</strong>`);
        if (line.match(/^\d+\./)) return <div key={i} style={{ display: "flex", gap: 12, margin: "8px 0", paddingLeft: 8 }}><span style={{ color: BLUE_BRIGHT, fontWeight: 700, minWidth: 20, fontSize: 13 }}>{line.match(/^\d+/)[0]}.</span><p style={{ color: WHITE, margin: 0, fontSize: 14, flex: 1 }} dangerouslySetInnerHTML={{ __html: bold.replace(/^\d+\./, "") }} /></div>;
        if (line.startsWith("- ") || line.startsWith("• ")) return <div key={i} style={{ display: "flex", gap: 10, margin: "6px 0", paddingLeft: 8 }}><span style={{ color: BLUE_BRIGHT, marginTop: 8, width: 5, height: 5, borderRadius: "50%", background: BLUE_BRIGHT, flexShrink: 0, display: "block" }} /><p style={{ color: WHITE, margin: 0, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: bold.replace(/^[-•]\s/, "") }} /></div>;
        if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ fontSize: 15, margin: "6px 0", color: WHITE, lineHeight: 1.85 }} dangerouslySetInnerHTML={{ __html: bold }} />;
      })}
    </div>
  );
}

// ── Score Reveal screen ───────────────────────────────────────────────────────
function ScoreReveal({ scores, onContinue }) {
  const dims = [
    { key: "networkStrength",      label: "Network Strength" },
    { key: "profileStrength",      label: "Profile Strength" },
    { key: "contentStrength",      label: "Content Strength" },
    { key: "relationshipStrength", label: "Relationship Strength" },
    { key: "advocateStrength",     label: "Advocate Strength" },
  ].map(d => ({ ...d, score: scores[d.key] || 0 }));

  const avg    = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);
  const lowest = dims.reduce((a, b) => a.score < b.score ? a : b);

  const getTier = s => {
    if (s >= 86) return { label: "BD Ready 🎯",          color: "#4ade80" };
    if (s >= 66) return { label: "Getting Warm 🔥",       color: BLUE_BRIGHT };
    if (s >= 41) return { label: "Building Momentum ⚡",  color: "#E8A000" };
    return         { label: "Just Getting Started 🌱",    color: MUTED };
  };

  const getBar = s => {
    if (s >= 75) return { label: "Strong",        color: "#4ade80" };
    if (s >= 50) return { label: "Building",       color: BLUE_BRIGHT };
    return         { label: "Needs Attention",     color: "#f87171" };
  };

  const tier = getTier(avg);

  return (
    <div style={{ maxWidth: 580, margin: "0 auto", padding: "48px 24px", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 13, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Your BizDev Readiness Score</div>
        <div style={{ fontSize: 96, fontWeight: 700, fontFamily: "Georgia, serif", background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1, marginBottom: 14 }}>{avg}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: tier.color, marginBottom: 10 }}>{tier.label}</div>
        <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.65 }}>Your LinkedIn foundation is taking shape. Here's where you stand.</div>
      </div>
      <div style={{ background: DARK, borderRadius: 14, padding: "28px 32px", marginBottom: 24, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 11, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 24 }}>Your Foundation Breakdown</div>
        {dims.map(d => {
          const bar = getBar(d.score);
          return (
            <div key={d.key} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: WHITE, fontWeight: 600 }}>{d.label}</span>
                <span style={{ fontSize: 12, color: bar.color, fontWeight: 700 }}>{bar.label}</span>
              </div>
              <div style={{ height: 7, background: BORDER, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.score}%`, background: `linear-gradient(90deg, ${bar.color}88, ${bar.color})`, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background: BLUE_MID + "22", border: `1px solid ${BLUE_BRIGHT}33`, borderRadius: 12, padding: "18px 24px", marginBottom: 36 }}>
        <div style={{ fontSize: 11, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Your Biggest Opportunity</div>
        <div style={{ fontSize: 14, color: WHITE, lineHeight: 1.65 }}>
          <strong style={{ color: BLUE_BRIGHT }}>{lowest.label}</strong> is where your foundation needs the most attention — and it's the fastest to move.
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <button onClick={onContinue} style={{ padding: "14px 36px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif", marginBottom: 10 }}>
          Read Your Full Reports →
        </button>
        <div style={{ fontSize: 12, color: MUTED }}>Your detailed insights are ready. Five reports, zero guesswork.</div>
      </div>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${BORDER}, transparent)`, margin: "48px 0" }} />;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const isBeta = new URLSearchParams(window.location.search).get("beta") === "true";

  const [step,            setStep]           = useState("upload");
  const [uploadedFiles,   setUploadedFiles]  = useState({});
  const [parsedData,      setParsedData]     = useState({});
  const [reports,         setReports]        = useState({});
  const [scores,          setScores]         = useState(null);
  const [generating,      setGenerating]     = useState(null);
  const [activeReport,    setActiveReport]   = useState("field");
  const [dragOver,        setDragOver]       = useState(false);
  const [countdown,       setCountdown]      = useState(0);
  const [error,           setError]          = useState(null);
  const [showEmailModal,  setShowEmailModal] = useState(false);
  const [emailSubmitted,  setEmailSubmitted] = useState(false);
  const [pendingReportId, setPendingReportId]= useState(null);
  const [emailName,       setEmailName]      = useState("");
  const [emailAddress,    setEmailAddress]   = useState("");
  const [emailSubmitting, setEmailSubmitting]= useState(false);
  const fileInputRef = useRef(null);
  const uploadRef    = useRef(null);

  const hasFiles            = Object.keys(uploadedFiles).length > 0;
  const connCount           = parsedData["Connections"]?.length || 0;
  const msgCount            = parsedData["Messages"]?.length || 0;
  const reportsReady        = Object.keys(reports).length;
  const activeReportMeta    = REPORTS.find(r => r.id === activeReport);
  const freeReportsComplete = REPORTS.filter(r => r.free).every(r => reports[r.id]);

  const handleFiles = useCallback((fileList) => {
    Array.from(fileList).forEach((file) => {
      if (file.name.endsWith(".zip")) {
        JSZip.loadAsync(file).then(zip => {
          zip.forEach((relativePath, zipEntry) => {
            const fileName = relativePath.split("/").pop();
            if (!fileName.endsWith(".csv")) return;
            const key = getFileKey(fileName);
            zipEntry.async("string").then(csvText => {
              const isConn = fileName.toLowerCase().includes("connection");
              const text   = isConn ? csvText.split("\n").slice(3).join("\n") : csvText;
              Papa.parse(text, { header: true, skipEmptyLines: true, complete: results => {
                if (results.data.length > 0) {
                  setUploadedFiles(prev => ({ ...prev, [key]: fileName }));
                  setParsedData(prev => ({ ...prev, [key]: results.data }));
                }
              }});
            });
          });
        });
      } else if (file.name.endsWith(".csv")) {
        const key = getFileKey(file.name);
        setUploadedFiles(prev => ({ ...prev, [key]: file.name }));
        parseLinkedInCSV(file, results => setParsedData(prev => ({ ...prev, [key]: results.data })));
      }
    });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const runReport = async (reportId) => {
    const report = REPORTS.find(r => r.id === reportId);
    if (!report?.free || generating) return;
    setGenerating(reportId); setActiveReport(reportId); setStep("reports"); setError(null);
    try {
      const result = await callClaude(PROMPTS[reportId], prepareData(parsedData, report.files));
      setReports(prev => ({ ...prev, [reportId]: result }));
    } catch (err) { setError(err.message); }
    finally { setGenerating(null); }
  };

  const generateReport = (reportId) => {
    const report = REPORTS.find(r => r.id === reportId);
    if (!report?.free || generating) return;
    if (!emailSubmitted) { setPendingReportId(reportId); setShowEmailModal(true); return; }
    runReport(reportId);
  };

  const generateGoldNugget = async () => {
    if (generating) return;
    setGenerating("gold"); setActiveReport("gold"); setStep("reports"); setError(null);
    try {
      const data = prepareData(parsedData, ["Connections", "Messages"]);
      const reportsContext = Object.entries(reports)
        .map(([id, text]) => `=== ${REPORTS.find(r => r.id === id)?.name?.toUpperCase() || id.toUpperCase()} ===\n${text}`)
        .join("\n\n---\n\n");
      const fullText     = await callClaudeGN(PROMPTS.gold, data, reportsContext);
      const parsedScores = parseScores(fullText);
      const cleanText    = stripScores(fullText);
      setReports(prev => ({ ...prev, gold: cleanText }));
      if (parsedScores) { setScores(parsedScores); setStep("score"); }
    } catch (err) { setError(err.message); }
    finally { setGenerating(null); }
  };

  const submitEmail = async () => {
    if (!emailName.trim() || !emailAddress.trim()) return;
    setEmailSubmitted(true); setShowEmailModal(false);
    const pending = pendingReportId; setPendingReportId(null);
    if (pending) runReport(pending);
    fetch("https://hook.us2.make.com/xu7d06pva2t2hhyccr86ddar7msqm4zl", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: emailName.trim(), email: emailAddress.trim(), source: "nugget-free-user" }),
    }).catch(err => console.log("Webhook error:", err));
  };

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Shared button styles ──
  const primaryBtn = {
    padding: "13px 32px",
    background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`,
    color: WHITE,
    border: "none",
    borderRadius: 9,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    letterSpacing: "0.02em",
  };

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
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 40px", display: "flex", alignItems: "center", background: DARK_CARD, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div>
            <div style={{ fontSize: 24, fontFamily: "Georgia, serif", fontWeight: 700, letterSpacing: "-0.5px", background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Nugget<span style={{ fontSize: 13, verticalAlign: "super", marginLeft: 1 }}>™</span></div>
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>The BizDev Tool for Founders</div>
          </div>
        </div>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {step === "upload" ? (
            <button style={{ ...primaryBtn, padding: "8px 20px", fontSize: 13 }} onClick={scrollToUpload}>Get My Free Reports →</button>
          ) : (
            <>
              <button style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, cursor: "pointer", fontSize: 13 }} onClick={() => setStep("upload")}>Home</button>
              <button style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${step === "reports" ? BLUE_BRIGHT : BORDER}`, background: step === "reports" ? BLUE_MID + "44" : "transparent", color: step === "reports" ? BLUE_BRIGHT : MUTED, cursor: "pointer", fontSize: 13 }} onClick={() => reportsReady > 0 && setStep("reports")}>
                Reports {reportsReady > 0 && `(${reportsReady})`}
              </button>
            </>
          )}
        </nav>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* ══════════════════════════════════════════════════════════════════
            UPLOAD / HOME STEP
        ══════════════════════════════════════════════════════════════════ */}
        {step === "upload" && (
          <>
            {/* ── Hero ── */}
            <div style={{ background: `linear-gradient(160deg, #061022 0%, #0d2d6b 40%, #1149ac 70%, #41a1e8 100%)`, padding: "72px 24px 64px", borderRadius: "0 0 24px 24px", textAlign: "center", marginBottom: 0 }}>
              <h1 style={{ fontSize: 48, fontFamily: "Georgia, serif", fontWeight: 700, color: "#ffffff", marginBottom: 20, lineHeight: 1.1 }}>
                Your next client is already<br />
                <span style={{ background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in your network.</span>
              </h1>
              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.85)", maxWidth: 540, margin: "0 auto 12px", lineHeight: 1.65 }}>
                You just don't know who they are yet. NUGGET does.
              </p>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.65 }}>
                Find out who to call, what to say, and where your next opportunity is hiding — free.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
                <button style={{ ...primaryBtn, fontSize: 16, padding: "14px 36px" }} onClick={scrollToUpload}>Get My Free Reports →</button>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                NO scraping.&nbsp;&nbsp;NO cold outreach.&nbsp;&nbsp;NO guessing.
              </p>
            </div>

            {/* ── Who It's For ── */}
            <div style={{ background: BLUE_MID, padding: "18px 32px", textAlign: "center" }}>
              <p style={{ fontSize: 15, color: WHITE, fontWeight: 600, letterSpacing: "0.02em" }}>
                Built for founders, owners, and solopreneurs who are their own best salesperson.
              </p>
            </div>

            <div style={{ padding: "56px 0 0" }}>

              {/* ── The Problem ── */}
              <div style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "40px 48px", marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 20 }}>Sound familiar?</div>
                <p style={{ fontSize: 19, color: WHITE, lineHeight: 1.8, maxWidth: 660, margin: "0 auto", fontFamily: "Georgia, serif" }}>
                  Your LinkedIn network is full of people who could refer you, hire you, or open a door. But LinkedIn doesn't show you who they are, how warm they are, or what to say. So you either throw spaghetti and hope something sticks — or you do nothing and wonder why business development feels so hard. Either way you're leaving money behind.
                </p>
              </div>

              {/* ── The Solution ── */}
              <div style={{ background: `linear-gradient(135deg, ${BLUE_DEEP}, ${DARK_CARD})`, border: `1px solid ${BLUE_BRIGHT}44`, borderRadius: 16, padding: "40px 48px", marginBottom: 40, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: BLUE_BRIGHT, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 20 }}>Enter Nugget™</div>
                <p style={{ fontSize: 19, color: WHITE, lineHeight: 1.8, maxWidth: 660, margin: "0 auto", fontFamily: "Georgia, serif" }}>
                  NUGGET changes that. Upload your LinkedIn data once and we'll show you exactly what's hiding in your network — who's warm, who's ready, and where your next client is most likely coming from.
                </p>
              </div>

              <Divider />

              {/* ── How It Works ── */}
              <div style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "36px 40px", marginBottom: 40 }}>
                <p style={{ fontSize: 22, color: WHITE, fontWeight: 700, textAlign: "center", marginBottom: 32, fontFamily: "Georgia, serif", letterSpacing: "-0.3px" }}>
                  Your Nuggets are waiting — Just 3 easy steps to find them...
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", gap: 0, alignItems: "start" }}>
                  {[
                    { step: "01", title: "Request your data", desc: "On LinkedIn go to Me → Settings & Privacy → Data Privacy → Request a copy of your data. Select all and click Request archive." },
                    { step: "02", title: "Download the file", desc: "Wait for LinkedIn to email your data file — usually within 24 hours. Click the link in that email and download the file to your computer." },
                    { step: "03", title: "Drop it in below", desc: "Drag and drop the file into Nugget below. That's it! Nugget works its magic and does the rest automatically. Let's get your Nuggets..." },
                  ].reduce((acc, s, i) => {
                    acc.push(
                      <div key={s.step} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 24px" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: BLUE_BRIGHT, fontFamily: "Georgia, serif", opacity: 0.5, lineHeight: 1, marginBottom: 4 }}>Step {s.step}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, marginBottom: 4 }}>{s.title}</div>
                        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>{s.desc}</div>
                      </div>
                    );
                    if (i < 2) acc.push(<div key={`div-${i}`} style={{ width: 1, background: BORDER, alignSelf: "stretch" }} />);
                    return acc;
                  }, [])}
                </div>
              </div>

              {/* ── Upload Zone ── */}
              <div ref={uploadRef}>
                <div
                  style={{ border: `2px dashed ${dragOver ? BLUE_BRIGHT : BORDER}`, borderRadius: 16, padding: "44px 32px", textAlign: "center", cursor: "pointer", background: dragOver ? BLUE_MID + "11" : DARK_CARD, transition: "all 0.2s", marginBottom: 28 }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ fontSize: 36, marginBottom: 14 }}>📂</div>
                  <div style={{ fontSize: 17, color: WHITE, fontWeight: 600, marginBottom: 8 }}>Drop your LinkedIn file here</div>
                  <div style={{ fontSize: 13, color: MUTED, marginBottom: 18, lineHeight: 1.5 }}>
                    Drop the file LinkedIn sent you here — Nugget takes it from there.<br />Or upload individual files if you prefer.
                  </div>
                  <button style={{ padding: "10px 28px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>Choose Files</button>
                  <input ref={fileInputRef} type="file" multiple accept=".csv,.zip" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
                  {hasFiles && (
                    <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                      {Object.keys(uploadedFiles).map(k => (
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
                      { num: msgCount.toLocaleString(),  label: "Messages loaded" },
                      { num: Object.keys(uploadedFiles).length, label: "Files ready" },
                    ].map((s, i) => (
                      <div key={i} style={{ flex: 1, background: `linear-gradient(135deg, ${BLUE_DEEP}, ${DARK_CARD})`, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: BLUE_BRIGHT, fontFamily: "Georgia, serif" }}>{s.num}</div>
                        <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div style={{ background: "#1a0a0a", border: "1px solid #8B0000", borderRadius: 8, padding: "12px 16px", color: "#ff8080", fontSize: 13, marginBottom: 16 }}>{error}</div>}

              <Divider />

              {/* ── BizDev Readiness Score ── */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                  <div style={{ fontSize: 11, color: BLUE_BRIGHT, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>Nugget's Signature Metric</div>
                  <h2 style={{ fontSize: 34, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 16, lineHeight: 1.2 }}>Meet Your BizDev Readiness Score.</h2>
                  <p style={{ fontSize: 16, color: MUTED, maxWidth: 600, margin: "0 auto 24px", lineHeight: 1.75 }}>
                    Most founders have no idea where they actually stand when it comes to business development. Not a gut feeling — an actual number. NUGGET changes that.
                  </p>
                  <p style={{ fontSize: 15, color: WHITE, maxWidth: 640, margin: "0 auto 32px", lineHeight: 1.75 }}>
                    Every time you run NUGGET, you get a score out of 100 across five dimensions. Each one tied directly to a report. Each one telling you exactly where to focus.
                  </p>
                </div>

                {/* Five dimensions */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 36 }}>
                  {[
                    { label: "The Right People", icon: "🎯", desc: "Who's in your network and how ICP-aligned they are" },
                    { label: "Your Front Door", icon: "🚪", desc: "How ready your profile is to convert a visitor into a client" },
                    { label: "Showing Up", icon: "📣", desc: "What your content says about you when you're not in the room" },
                    { label: "Your Pulse", icon: "💬", desc: "The warmth and depth of your active relationships" },
                    { label: "Your Referral Engine", icon: "🤝", desc: "How many advocates are ready to go to bat for you" },
                  ].map((d, i) => (
                    <div key={i} style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>{d.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 8, lineHeight: 1.3 }}>{d.label}</div>
                      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>{d.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Tiers */}
                <div style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "28px 36px", marginBottom: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 20 }}>Your Milestones</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                    {[
                      { label: "Just Getting Started", color: MUTED },
                      { label: "Building Momentum ⚡", color: "#E8A000" },
                      { label: "Getting Warm 🔥", color: BLUE_BRIGHT },
                      { label: "BD Ready 🎯", color: "#4ade80" },
                    ].map((t, i) => (
                      <span key={i} style={{ padding: "6px 16px", borderRadius: 20, background: t.color + "22", border: `1px solid ${t.color}44`, color: t.color, fontSize: 13, fontWeight: 600 }}>{t.label}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 14, color: MUTED, fontStyle: "italic" }}>
                    BD Ready. You have everything in place to go get it. Now go. 🎯
                  </p>
                </div>

                <div style={{ background: BLUE_MID + "22", border: `1px solid ${BLUE_BRIGHT}33`, borderRadius: 12, padding: "20px 28px", textAlign: "center" }}>
                  <p style={{ fontSize: 15, color: WHITE, lineHeight: 1.7 }}>
                    Watch your score climb every quarter. Share your milestone. Show your work.<br />
                    <span style={{ color: MUTED, fontSize: 13, fontStyle: "italic" }}>"My score went from 42 to 78 in 90 days." — that's not a coincidence. That's NUGGET working.</span>
                  </p>
                </div>
              </div>

              <Divider />

              {/* ── Report cards ── */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div style={{ fontSize: 11, color: BLUE_BRIGHT, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>What You Get</div>
                  <h2 style={{ fontSize: 32, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 12 }}>Five free reports. One Gold Nugget.</h2>
                  <p style={{ fontSize: 14, color: MUTED, maxWidth: 500, margin: "0 auto" }}>
                    Every insight, every name, and every next step is unique to you.<br />This is your data. These are your people. This is your plan.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                  {REPORTS.map(r => (
                    <div key={r.id} style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, opacity: (r.free || isBeta) ? 1 : 0.5, position: "relative", borderTop: "3px solid transparent", backgroundImage: `linear-gradient(${DARK_CARD}, ${DARK_CARD}), linear-gradient(90deg, ${(r.free || isBeta) ? BLUE_BRIGHT : BORDER}, ${(r.free || isBeta) ? BLUE_MID : BORDER})`, backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box", display: "flex", flexDirection: "column" }}>
                      {!r.free && !isBeta && <span style={{ position: "absolute", top: 14, right: 14, fontSize: 15, color: MUTED }}>🔒</span>}
                      <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: r.free ? BLUE_MID + "33" : isBeta ? BLUE_MID + "33" : "#2a1a00", color: r.free ? BLUE_BRIGHT : isBeta ? BLUE_BRIGHT : "#E8A000", marginBottom: 8 }}>
                        {isBeta && !r.free ? "BETA" : r.tag}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, marginBottom: 3, fontFamily: "Georgia, serif" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: MUTED, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{r.subtitle}</div>
                      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginBottom: 14, flex: 1 }}>{r.description}</div>
                      {r.free ? (
                        reports[r.id]
                          ? <button style={{ padding: "8px 16px", background: BLUE_MID + "33", border: `1px solid ${BLUE_BRIGHT}`, color: BLUE_BRIGHT, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }} onClick={() => { setActiveReport(r.id); setStep("reports"); }}>✓ View Report</button>
                          : <button style={{ padding: "8px 16px", background: generating === r.id ? BLUE_MID + "44" : `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, border: "none", color: WHITE, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", width: "100%" }} onClick={() => generateReport(r.id)} disabled={!!generating}>
                              {generating === r.id ? "⏳ Mining..." : "Generate Report"}
                            </button>
                      ) : isBeta ? (
                        <button style={{ padding: "8px 16px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, border: "none", color: WHITE, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }} onClick={() => { setActiveReport("gold"); setStep("reports"); }}>
                          {reports.gold ? "✓ View Gold Nugget" : "View Gold Nugget →"}
                        </button>
                      ) : (
                        <button style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "default", width: "100%" }}>🔒 Upgrade to unlock</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Divider />

              {/* ── Anna section ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 48, alignItems: "center", marginBottom: 40 }}>
                <div style={{ background: `linear-gradient(135deg, ${BLUE_DEEP}, ${DARK_CARD})`, border: `1px solid ${BORDER}`, borderRadius: 16, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 56 }}>🐔</div>
                  <div style={{ fontSize: 12, color: MUTED, textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase" }}>Anna Ludwinowski<br />Founder, Nugget™</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: BLUE_BRIGHT, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>The human behind it</div>
                  <h2 style={{ fontSize: 28, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 20, lineHeight: 1.2 }}>Hi, I'm Anna.</h2>
                  <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.8, marginBottom: 16 }}>
                    I'm a founder with 33 years of business experience — and I've lived every bizdev challenge in this tool personally. The cold leads. The missed opportunities. The warm network sitting right there, completely untouched.
                  </p>
                  <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.8, marginBottom: 16 }}>
                    I still see it today with my clients as a Business Strategist. Smart, capable founders leaving money behind not because they don't know how to sell — but because they don't know how to use the data they already have.
                  </p>
                  <p style={{ fontSize: 15, color: WHITE, lineHeight: 1.8, fontWeight: 600 }}>
                    NUGGET is your unfair advantage on LinkedIn. No fluff, no jargon — just a clear picture of what's in your network and exactly what to do with it.
                  </p>
                </div>
              </div>

              <Divider />

              {/* ── Final CTA ── */}
              <div style={{ textAlign: "center", padding: "40px 24px" }}>
                <h2 style={{ fontSize: 36, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 16, lineHeight: 1.2 }}>
                  Your next client is already<br />in your network.
                </h2>
                <p style={{ fontSize: 17, color: MUTED, marginBottom: 32, fontStyle: "italic" }}>
                  You just don't know who they are yet. NUGGET does.
                </p>
                <button style={{ ...primaryBtn, fontSize: 17, padding: "16px 44px" }} onClick={scrollToUpload}>
                  Get My Free Reports →
                </button>
              </div>

            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCORE REVEAL STEP
        ══════════════════════════════════════════════════════════════════ */}
        {step === "score" && scores && (
          <div style={{ paddingTop: 48 }}>
            <ScoreReveal scores={scores} onContinue={() => { setActiveReport("gold"); setStep("reports"); }} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            REPORTS STEP
        ══════════════════════════════════════════════════════════════════ */}
        {step === "reports" && (
          <div style={{ paddingTop: 32, display: "grid", gridTemplateColumns: "210px 1fr", gap: 22, alignItems: "start" }}>

            {/* Sidebar */}
            <div style={{ background: DARK_CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden", position: "sticky", top: 80 }}>
              {REPORTS.map(r => {
                let statusText;
                if (!r.free && !isBeta) {
                  statusText = "🔒 Upgrade to unlock";
                } else if (r.id === "gold" && isBeta) {
                  if (generating === "gold")   statusText = "⏳ Generating...";
                  else if (reports.gold)        statusText = "✓ Complete";
                  else if (freeReportsComplete) statusText = "Ready to generate";
                  else                          statusText = "Complete your reports first";
                } else {
                  if (generating === r.id)  statusText = `⏳ ${countdown > 0 ? `Next in ${countdown}s...` : "Generating..."}`;
                  else if (reports[r.id])   statusText = "✓ Complete";
                  else                      statusText = "Unmined";
                }
                return (
                  <div key={r.id} style={{ padding: "13px 16px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: activeReport === r.id ? BLUE_MID + "33" : "transparent", borderLeft: `3px solid ${activeReport === r.id ? BLUE_BRIGHT : "transparent"}`, transition: "all 0.15s" }} onClick={() => setActiveReport(r.id)}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: activeReport === r.id ? BLUE_BRIGHT : WHITE, marginBottom: 2 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: reports[r.id] ? BLUE_BRIGHT : MUTED }}>{statusText}</div>
                  </div>
                );
              })}
              <div style={{ padding: "14px 16px" }}>
                <button style={{ width: "100%", padding: "10px 16px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => setStep("upload")}>← Back to Home</button>
              </div>
            </div>

            {/* Report panel */}
            <div style={{ background: DARK_CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 32, minHeight: 420 }}>
              {error && <div style={{ background: "#1a0a0a", border: "1px solid #8B0000", borderRadius: 8, padding: "12px 16px", color: "#ff8080", fontSize: 13, marginBottom: 16 }}>{error}</div>}

              <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 22, fontFamily: "Georgia, serif", fontWeight: 700, background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>{activeReportMeta?.name}</div>
                <div style={{ fontSize: 12, color: MUTED }}>{activeReportMeta?.subtitle}</div>
              </div>

              {/* Gold Nugget panel */}
              {activeReport === "gold" && (
                <>
                  {!isBeta ? (
                    <div style={{ textAlign: "center", padding: "48px 32px" }}>
                      <div style={{ fontSize: 44, marginBottom: 16 }}>🏆</div>
                      <div style={{ fontSize: 22, fontFamily: "Georgia, serif", background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10 }}>The Gold Nugget</div>
                      <p style={{ fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.7, maxWidth: 400, margin: "0 auto 28px" }}>
                        Your complete BD action plan — prioritized targets, warm paths into companies, missed conversations that are still warm, and outreach sequences ready to go.<br /><br />
                        The free reports show you where the opportunity is. The Gold Nugget hands you a map to go get it.
                      </p>
                      <button style={{ padding: "12px 32px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>Upgrade to Gold Nugget →</button>
                    </div>
                  ) : generating === "gold" ? (
                    <div style={{ textAlign: "center", padding: "60px 32px" }}>
                      <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTop: `3px solid ${BLUE_BRIGHT}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                      <div style={{ color: MUTED, fontSize: 14 }}>Mining your data for gold...</div>
                    </div>
                  ) : reports.gold ? (
                    <ReportContent text={reports.gold} />
                  ) : freeReportsComplete ? (
                    <div style={{ textAlign: "center", padding: "48px 32px" }}>
                      <div style={{ fontSize: 44, marginBottom: 16 }}>🪙</div>
                      <div style={{ fontSize: 22, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 10 }}>You've mined all 5 reports.</div>
                      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 28px" }}>Ready to see how it all adds up?</p>
                      <button style={{ padding: "12px 32px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }} onClick={generateGoldNugget}>
                        Unlock Your BizDev Readiness Score →
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "60px 32px" }}>
                      <div style={{ fontSize: 38, marginBottom: 14 }}>🪙</div>
                      <div style={{ fontSize: 16, color: WHITE, fontWeight: 600, marginBottom: 8 }}>Complete your 5 free reports first</div>
                      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>Generate all 5 reports to unlock your BizDev Readiness Score.</p>
                    </div>
                  )}
                </>
              )}

              {/* Free report panels */}
              {activeReport !== "gold" && (
                <>
                  {generating === activeReport ? (
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
                      <button style={{ padding: "10px 24px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer" }} onClick={() => generateReport(activeReport)} disabled={!!generating}>
                        Generate {activeReportMeta?.name}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Email capture modal ── */}
      {showEmailModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(2,8,18,0.97)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: `linear-gradient(160deg, #0f2040 0%, #0a1628 100%)`, border: `1px solid ${BLUE_BRIGHT}66`, borderRadius: 20, padding: "40px 48px", maxWidth: 480, width: "100%", boxShadow: `0 0 80px rgba(65,161,232,0.15), 0 24px 60px rgba(0,0,0,0.8)`, animation: "fadeIn 0.2s ease-out" }}>
            <h2 style={{ fontSize: 24, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, textAlign: "center", marginBottom: 8, lineHeight: 1.3 }}>Where should we send your personalized Nugget reports?</h2>
            <p style={{ fontSize: 14, color: MUTED, textAlign: "center", marginBottom: 28, lineHeight: 1.6 }}>Your reports are ready to generate. Enter your details and we'll deliver them straight to your inbox.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>First Name</label>
                <input type="text" placeholder="Your first name" value={emailName} onChange={e => setEmailName(e.target.value)} style={{ width: "100%", padding: "12px 16px", background: "#0a1628", border: `1px solid ${BLUE_BRIGHT}44`, borderRadius: 8, color: WHITE, fontSize: 15 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Email Address</label>
                <input type="email" placeholder="your@email.com" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} onKeyDown={e => e.key === "Enter" && submitEmail()} style={{ width: "100%", padding: "12px 16px", background: "#0a1628", border: `1px solid ${BLUE_BRIGHT}44`, borderRadius: 8, color: WHITE, fontSize: 15 }} />
              </div>
            </div>
            <button onClick={submitEmail} disabled={emailSubmitting || !emailName.trim() || !emailAddress.trim()} style={{ width: "100%", padding: "14px 24px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, border: "none", borderRadius: 10, color: WHITE, fontSize: 16, fontWeight: 700, cursor: emailSubmitting ? "not-allowed" : "pointer", fontFamily: "Georgia, serif", marginBottom: 12, opacity: emailSubmitting ? 0.6 : 1 }}>
              {emailSubmitting ? "Getting your Nuggets ready..." : "Get My Reports →"}
            </button>
            <p style={{ fontSize: 11, color: MUTED, textAlign: "center" }}>No spam. No sharing. Just your personalized Nugget reports.</p>
          </div>
        </div>
      )}
    </div>
  );
}
