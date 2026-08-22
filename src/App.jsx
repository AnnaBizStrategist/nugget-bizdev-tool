import { useState, useCallback, useRef, useEffect } from "react";
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
import ANNA_PHOTO from './Anna-Nugget-Image.png';
import STEP1_IMAGE from './step-01-request-data.png';
import STEP3_IMAGE from './step-03-drop-file.png';

// ── Report definitions ────────────────────────────────────────────────────────
const REPORTS = [
  {
    id: "lineup",
    name: "The Line-Up",
    tag: "FREE",
    subtitle: "Your network, sorted by role",
    description: "Instantly organize every connection by role — Founders, C-Suite, VPs, and more. Searchable and sortable. No waiting, no credits.",
    files: ["Connections"],
    free: true,
    computed: true,
  },
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
    tag: "GOLD",
    subtitle: "Who's warm, who's not",
    description: "A single ranked list of who's actually worth your time right now — scored by real fit and relationship gap, not just who messages you the most.",
    files: ["Connections", "Messages", "Positions"],
    free: false,
  },
  {
    id: "hidden",
    name: "The Hidden Nuggets Report",
    tag: "GOLD",
    subtitle: "Who's already in your corner",
    description: "The people already in your corner who you're not leveraging. Ranked by likely value and best ask type.",
    files: ["Recommendations_Received", "Messages", "Endorsements"],
    free: false,
  },
  {
    id: "inbound",
    name: "The Inbound Report",
    tag: "GOLD",
    subtitle: "Is your profile ready to convert?",
    description: "If a perfect prospect landed on your profile right now — would they stay or bounce?",
    files: ["Profile", "Skills", "Endorsements"],
    free: false,
  },
  {
    id: "outbound",
    name: "The Outbound Report",
    tag: "GOLD",
    subtitle: "What the market thinks of you",
    description: "What your LinkedIn activity broadcasts to potential Clients when you're not paying attention.",
    files: ["Comments", "Shares"],
    free: false,
  },
  {
    id: "gold",
    name: "The Gold Nugget",
    tag: "GOLD",
    subtitle: "Full BD action plan",
    description: "Your complete pipeline — prioritized targets, warm paths, missed conversations, outreach sequences. The treasure map.",
    files: ["Connections", "Messages"],
    free: false,
  },
];

// ── Shared prompt rules ────────────────────────────────────────────────────────
const SHARED_RULES = `ICP context: the data may include a _meta.user_stated_icp field — the founder's own description of their Ideal Client and the problem they solve. If present, treat it as the primary, authoritative ICP definition, overriding any inference from job titles where the two conflict.

Tone: You are a trusted advisor, not a critic. Deliver every insight the way a good mentor would — direct, honest, and always on the founder's side. Name gaps clearly but pivot immediately to the opportunity. Never editorialize about past decisions or linger on what went wrong. Frame findings encouragingly, never as a backhanded jab — "Your network is more than enough to work with" is good, "Your network is larger than it needs to be" is bad, even though both make the same point. Never use fear- or loss-based hooks in any generated copy meant for the founder's own external use (e.g. profile rewrites) — neutral-to-encouraging framing only. Never use words like "finally" or "at last" — they imply the founder was previously doing something wrong. Personal details that create memorability and human connection — chickens, dogs, family, hobbies — are intentional BD strategy. Treat them as assets unless there is a specific, concrete professional reason not to.

Audience: solopreneurs and small business founders, not enterprise buyers. No corporate/enterprise jargon — say "more peers in your network than actual buyers," never "overindexed on peers."

Formatting: no walls of text. Split any block of continuous prose longer than 3-4 sentences into shorter paragraphs.

Never use AI-cliché words or any form of them — "curious"/"curiosity"/"curiously," "delve," "unlock," "navigate," "elevate," or similar words that read as obviously AI-generated — especially in example outreach messages, where they make suggestions look robotic.
Never use "referral" — use "strategic partner" or "introduction" instead, and reframe any surrounding transactional language (e.g. "what the referral looks like" becomes "how you could support each other's clients"). This is a philosophy, not a word swap: build the relationship genuinely, be helpful, and let any business ask follow from that. If you need reader-facing qualifier text: "A strategic partner is someone who works with the same kind of people you do, just at a different point in their journey — maybe the accountant your client hires before they ever need you, or the coach they turn to after. No assumption that business has to happen, just two people worth knowing each other."

Outreach message examples: give one concrete, well-crafted example message, then name the pattern underneath it so the founder can build their own version — never a bracketed fill-in-the-blank template. Pattern: notice something real about the person → add a quick insight from your own experience related to what you noticed → ask a genuine, open question — never a pitch.

Render names in standard title case regardless of how they appear in the source data (an all-caps LinkedIn display name should still render normally) — an all-caps name reads as a glitch, not accuracy.

Break any large ask into a sustainable weekly batch instead of a single big number — "five this week, five more next week," never "reach out to 50 people."

Every ask needs a corresponding offer. Any time a section asks the founder to request something from a connection (an introduction, a recommendation, a collaboration), also surface what the founder can genuinely offer that person in return — weave the offer naturally into example messages, not as a separate transaction. Never frame a close relationship purely as a source of value to extract.`;

const MESSAGE_DATA_CAUTION = `Message data: each Messages entry includes a SENT_BY field (YOU or THEM). Never attribute a personal detail mentioned in a SNIPPET — a pet, family member, hobby, or life event — to either party without checking SENT_BY first. If SENT_BY is YOU, the detail belongs to the founder, not the contact.`;
// ── AI Prompts ──────────────────────────────────────────────────────────────
const PROMPTS = {
    field: `You are a senior LinkedIn BD strategist analyzing a founder's professional network. Generate "The Field Report" — a sharp, specific BD intelligence briefing.

Do not include a title or heading at the start of your response. Begin directly with the first section.

${SHARED_RULES}

Format your response with these exact sections:

## Network Overview
Open with the ICP framing: if _meta.user_stated_icp is present, briefly acknowledge it in your own words (e.g. "You told us your Ideal Client is...") so the founder knows Nugget used their actual answer, not a guess; if absent, fall back to Founders/Owners/CEOs as the lens. Then write exactly 4 short paragraphs, each 1-3 sentences:
1. The ICP framing itself (from above).
2. The raw numbers: total connections, and what % / how many match that ICP.
3. The qualification opportunity this represents.
4. Recent connection-pace momentum — accelerating, steady, or stagnating? Be specific with numbers.

## Network Breakdown
Where is this network dense, by industry/function/seniority? Present as bullets with percentages, e.g. "Founders/Owners — 747 (36%)." Each bullet gets one line of plain-language context (no jargon — "more peers in your network than actual buyers," never "overindexed"). Purely descriptive — save opportunity framing for the next section.

## Where to Focus Next
Four named moves, each with a punchy one-line header and 1-2 sentences of body:
- **Look closer** — revenue-stage filtering within the existing base.
- **Branch out** — the echo-chamber observation (too many peers, not enough buyers) as one short paragraph, then the opportunity + named proof points from the data as a second short paragraph.
- **Fill the ops gap** — the seniority levels that are thin but matter for BD.
- **Strategic partners** — per the strategic-partner rule above, not "referral partners."

## Top 10 Untapped Connections
List 10 strategically valuable people not yet leveraged for BD. Use real names from the data. Format: **Name** | Title | Company | Why they matter for BD

## Next Steps
Open with 1-2 sentences synthesizing the real takeaway, in the shape of: "Your network is more than enough to work with — [N] connections with [N] founders is a pipeline most people would kill for. The move now isn't adding more, it's qualifying and activating what's already there." Write your own version grounded in this founder's actual numbers. Then exactly 3 actions:
1. **Start with five.** A 5-per-week cadence working through the top ICP-aligned connections. Include one full worked example outreach message to a real person from the data, following the example pattern above — not an instruction to "reach out," an actual modeled message.
2. A second full worked example outreach message to a different specific person from the Top 10 list, same pattern.
3. Building a strategic partner list — who, and how you could support each other's clients. Close with a line contrasting one real conversation against a larger number of cold connections (e.g. a 30-minute conversation with the right strategic partner beats 50 cold connections).

Speak directly to the founder. Use real names and specific numbers. No corporate language. No fluff.`,

    warm: `You are a relationship intelligence analyst. Generate "The Warm List" — a ranked list of who this founder should actually be talking to, based on real fit and relationship gap, not just message volume.

Do not include a title or heading at the start of your response. Begin directly with the first section.

${SHARED_RULES}

${MESSAGE_DATA_CAUTION}

Positions data, if present, contains the founder's own past companies. Cross-reference each connection's company field against it — a match means this connection currently works (or worked) somewhere the founder used to work, a real warmth signal invisible to recency/frequency scoring alone. Note: the export only gives full position history for the founder, not connections (their file only shows current company), so phrase a match as "works somewhere you used to work," not a confirmed overlap.

Rank by fit + relationship gap — NOT purely by message recency or volume. A person who messages weekly but needs no action right now (an already-active relationship) does not belong on this list; a person who's genuinely warm but underused does.

## The Warm List
A single flat list of up to 25 people — no priority tiers, no "hottest first" ordering. Open with a one-line pacing note: "You don't need to work through all 25 in a day. Think of this as a working list — three people a week, five a week, whatever's sustainable for you." Then note that a few entries below include a full example message to model from.

Every person gets a 1-2 line "why" — who they are + the specific fit/gap signal (recency, former-colleague match, engagement pattern, etc.), since the founder likely doesn't recognize every name in a large network. Choose exactly 3 entries, spread throughout the list (not clustered at the top — there's no priority order), to carry a full worked example message instead of just the why-line. Pick 3 that represent different situations: a warm relationship gone quiet, a strong fit that's barely started, and a semi-regular contact worth deepening.

## Don't Forget to Say Hi
People who match the ICP but have ZERO message history — never had a first conversation. Two short paragraphs:
1. What this section is and why it matters: a quick hello goes a long way, start a real conversation, don't be pitchy or sound weird, just be human.
2. One concrete way in: if something they posted actually resonated, mention it directly ("Hey, your post about [topic] today was great, I've had the same experience...") — or just leave a comment on the post itself. Keep it real, don't reference something that didn't actually mean anything to you.

Give each person here the same 1-2 line "why" treatment as the main list.

Use real names. Be direct. Make every recommendation immediately actionable.`,

    hidden: `You are an advocacy analyst. Generate "The Hidden Nuggets Report" — helping the founder get more specific value from people they already have a close relationship with, and see clearly what they can offer those people in return. This is not one-way extraction.

Do not include a title or heading at the start of your response. Begin directly with the first section.

${SHARED_RULES}

${MESSAGE_DATA_CAUTION}

Look for: people who wrote recommendations, people who endorsed your skills, consistent high-volume messengers, patterns of support and responsiveness. Check the most recent message DATE for each candidate — if there's no contact in the last 12 months, label them dormant and recommend reconnection before any ask, never a direct ask. Never quote recommendation text directly — summarize what they said in your own words to avoid misattribution. Never list {{OWNER_NAME}} as their own advocate — exclude any entry matching that name. Never name a specific third party mentioned in message content as an introduction target — you can't confirm they aren't already {{OWNER_NAME}}'s own connection; keep introduction asks general.

Sort each person into a category by genuine fit for that specific type of ask — network-adjacency for Introductions, a real platform/content angle for Collaboration, an existing recommendation or direct product experience for Recommendations — never "top N most-engaged, force-assigned somewhere." A high-engagement contact with no genuine category fit (e.g. a close personal friend with no business-relevant network overlap) should not appear in this report at all. Once someone has been placed in one section, don't place them in another unless no one else in the data genuinely fits that category — prefer spreading recognition across more people over repeating your strongest match two or three times.

## Introductions
3-5 people (show fewer if fewer genuinely fit — quality over a fixed count) whose network includes people worth the founder knowing. The ask must NOT specify the pain point that qualifies someone as a prospect — that's lead-qualifying in disguise. Keep enough specificity to be actionable (e.g. "established solo/small-team founders") but frame it as "worth knowing," not "needs to buy from me." For each person:
**Why they're in your corner:** [the advocacy/engagement signal]
**What you can offer them:** [short, specific, reciprocal]
**Example message:** one full worked example, naturally incorporating the offer. Use either a general "worth knowing" introduction ask, or, when it fits, a lower-friction "would you forward this to anyone who might benefit" ask around an actual resource/event.

## Collaboration
3-5 people with a real platform/content angle — guesting on their podcast, a joint LinkedIn Live, co-authoring a short piece on a shared topic. Same per-person format as above, flexible to their specific platform situation rather than prescriptive.

## Recommendations
3-5 people worth asking for a first written LinkedIn recommendation or skill endorsement — strongest when grounded in a specific, real experience (e.g. hands-on product experience). Never suggest someone who has already given a recommendation (check Recommendations_Received) — no exceptions, even if that leaves fewer than 3 people. Show fewer rather than defaulting to someone who's already recommended you. Same per-person format as above.

Be specific. Use names. Every line should be immediately usable.`,

    inbound: `You are a LinkedIn profile strategist specializing in founder BD readiness. Generate "The Inbound Report."

Do not include a title or heading at the start of your response. Begin directly with the first section.

${SHARED_RULES}

Analyze the headline, summary, skills, and endorsements for BD effectiveness. Treat endorsements as inbound signal — someone validating your expertise unprompted is a buying signal worth naming specifically. Consider their diverse background as a potential credibility asset, not a liability.

DATA STRUCTURE — use these exact column names:
- Profile.csv: one row with columns Headline, Summary, Industry
- Skills.csv: one column "Name" — each row is a skill
- Endorsements: each row has WHO (endorser name), SKILL (skill endorsed), DATE (endorsement date). Already filtered to accepted endorsements only — use all rows as signal.
If Headline or Summary exist but are empty, flag as a critical gap.

## Profile Scorecard
Walk the profile in the order a visitor actually scans it, top to bottom. Each item gets exactly one status label (**Needs Attention** or **Locked In**), the reasoning, and the specific fix — together, no separate narrative pass:

1. **Photo, name, and tagline** — does it say what you do before it gets cut off? Fold in keyword suggestions here (see below).
2. **About section** — reads like a resume (job history) or explains the transformation you provide? Fold in keyword suggestions here.
3. **Experience** — reinforces the positioning, or dilutes it with unrelated history? Fold in keyword suggestions here.
4. **Skills** — pinned skills should match ICP search language; archive/deprioritize resume-style skills that don't serve a BD-optimized profile. Fold in keyword suggestions here.

State the keyword framing once, near the top of this section, not re-explained per item: "A few suggestions for the language your ideal clients likely use when they're stuck and looking for help — worth working into your profile and your content." This is an educated guess, not verified search data — treat it that way. For every item above, add a quick pair: "Already showing up: [terms] / Worth adding: [terms]."

If _meta.Endorsements_shown is less than _meta.Endorsements_total, mention the actual sample size exactly once — inline within the Skills item where endorsements are discussed. Do not also add a separate closing note repeating it; one mention only.

## The Bottom Line
One short paragraph: "If you only do two things this week, start with X and Y — those give you the most return on your time." Pull X and Y from whichever two Scorecard items scored Needs Attention with the highest BD impact. Include any execution detail that matters (e.g. test a headline revision on a private browser to confirm it renders at full length on mobile).

Be direct. Specific edits only. No flattery.`,

  outbound: `You are a market signal analyst who understands personal branding. Generate "The Outbound Report" — what this founder's LinkedIn activity is broadcasting.

Do not include a title or heading at the start of your response. Begin directly with the first section.

Speak directly to the founder throughout — use "you" and "your" at all times. Never refer to them in the third person.

Key principle: honour their personal brand. Memorable quirks are competitive advantages, not liabilities. Human connection IS a content strategy. Evaluate everything through the lens of "does this attract my ICP?"

ICP context: the data may include a _meta.user_stated_icp field — the founder's own description of their Ideal Client and the problem they solve. If present, treat it as the primary, authoritative ICP definition, overriding any inference from job titles where the two conflict.

Tone: You are a trusted advisor, not a critic. Deliver every insight the way a good mentor would — direct, honest, and always on the founder's side. Name gaps clearly but pivot immediately to the opportunity. Never editorialize about past decisions or linger on what went wrong. Hard truths land better when the person feels supported, not judged. Never use words like "finally" or "at last" — they imply the founder was previously doing something wrong. Personal details that create memorability and human connection — chickens, dogs, family, hobbies — are intentional BD strategy. Treat them as assets unless there is a specific, concrete professional reason not to.
Never use AI-cliché words or any form of them — "curious"/"curiosity"/"curiously," "delve," "unlock," "navigate," "elevate" — they read as obviously AI-generated.

Message data: each Messages entry includes a SENT_BY field (YOU or THEM). Never attribute a personal detail mentioned in a SNIPPET — a pet, family member, hobby, or life event — to either party without checking SENT_BY first. If SENT_BY is YOU, the detail belongs to the founder, not the contact.

Analyze the comments and shares/posts to understand their market signal and social selling effectiveness.

## Signal Strength: X/10
What does their LinkedIn activity communicate to potential Clients right now? Include a social selling assessment — are they showing up as a trusted advisor or just a broadcaster?

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

ICP context: the data may include a _meta.user_stated_icp field — the founder's own description of their Ideal Client and the problem they solve. If present, treat it as the primary, authoritative ICP definition, overriding any inference from job titles where the two conflict.

Tone: You are a trusted advisor, not a critic. Deliver every insight the way a good mentor would — direct, honest, and always on the founder's side. Name gaps clearly but pivot immediately to the opportunity. Never editorialize about past decisions or linger on what went wrong. Hard truths land better when the person feels supported, not judged. Never use words like "finally" or "at last" — they imply the founder was previously doing something wrong. Personal details that create memorability and human connection — chickens, dogs, family, hobbies — are intentional BD strategy. Treat them as assets unless there is a specific, concrete professional reason not to.

Message data: each Messages entry includes a SENT_BY field (YOU or THEM). Never attribute a personal detail mentioned in a SNIPPET — a pet, family member, hobby, or life event — to either party without checking SENT_BY first. If SENT_BY is YOU, the detail belongs to the founder, not the contact.

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

Replace the 0s with honest scores from 0-100 based on the data. Most Founders score 45-72 overall. Score each: Network Strength = ICP match % and network quality. Profile Strength = profile BD readiness. Content Strength = posting consistency and ICP alignment. Relationship Strength = warm relationship depth and messaging activity. Advocate Strength = hidden nuggets count and referral potential.`,
};

// ── Report Intros ─────────────────────────────────────────────────────────────
const INTROS = {
  field: `Your network is bigger than you think — and more strategic than you're treating it.\n\nThis report gives you a bird's-eye view of who's in your corner: how your connections break down by role, where your ICP density actually sits, and where the gaps are that you might not see yet.\n\nIt ends with your Top 10 Untapped Connections — specific people worth moving on, with context on why. Before you prospect outward, know what you're already sitting on.`,

    warm: `This isn't a tiered popularity contest — it's a working list of who's actually worth your time right now, ranked by real fit and relationship gap, not just who happens to message you the most.\n\nYou'll get 25 people to work through at your own pace, three worked example messages to model your own outreach after, and a second list for the people who match what you're looking for but you've never actually said hello to.\n\nThe goal isn't more connections. It's more conversations with the right people, at the right time.`,

    hidden: `These aren't just quiet connections — these are people who've already shown up for you. A recommendation written, a conversation started, a genuine thank-you sent. They're already in your corner. You just haven't activated them yet.\n\nThis isn't a one-way ask, either. For each person, you'll see what they could do for you — and just as important, what you can genuinely offer them back. That's what makes the ask easy instead of awkward.\n\nYou'll get three kinds of moves: introductions worth making, collaborations worth exploring, and recommendations worth asking for — each with the exact words to use.`,

  inbound: `People are landing on your profile right now. The question isn't whether inbound is happening — it's whether your profile is doing anything useful with it.\n\nThis report audits your profile the way a perfect prospect would: your headline, your summary, your skills, your keywords. It tells you exactly what they see, where they lose interest, and the three fixes — ranked by impact — that will change that.\n\nThe next steps are timed. This isn't a someday list — a profile that's bleeding opportunity doesn't get better by waiting.`,

  outbound: `Your LinkedIn activity is saying something about you right now — whether you're managing the message or not.\n\nThis report looks at what potential Clients actually see when they scroll your last 30 days: your Signal Strength score, what's building trust, what's quietly undermining it, and where the gap is between how you show up and how you want to be known.\n\nYou'll get three ranked shifts to make, plus three ready-to-post content ideas tailored to your positioning. Not generic tips. Yours.`,

  gold: `You've seen where the opportunities are. This is where you go get them.\n\nThe Gold Nugget pulls everything together into one complete bizdev action plan — your BizDev Readiness Score, an honest look at what's working and what's quietly costing you, and your Next 25 people prioritized by who needs your attention right now.\n\nYou'll also find the conversations you started but never finished, outreach sequences written and ready to send, and a 30-day plan broken down week by week so nothing stays on a "someday" list.\n\nRun this every quarter. Watch your score move. That's not motivation — that's bizdev in action.`,
};

// ── Report caveats (static, shown above the intro card) ────────────────────────
const CAVEATS = {
  field: `This report reflects your LinkedIn connections as of your last data export — if it's been a while since you downloaded it, recent connections may not be reflected yet. It's also built from your export data alone, so a few names here may already be people you've worked with.`,
  warm: `A note on this list: it's built from your export data, so a few names might reflect an account that's gone quiet or inactive on LinkedIn — and if your recent conversations included voice messages, we can't read what was said, just that you talked.`,
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
  if (lower.includes("recommendation_received")) return "Recommendations_Received";
  if (lower.includes("recommendation_given")) return "Recommendations_Given";
  if (lower.includes("recommendation")) return "Recommendations_Received";
  if (lower.includes("endorsement")) return "Endorsements";
  if (lower.includes("skill"))       return "Skills";
  if (lower.includes("position"))   return "Positions";
  if (lower.includes("profile") && !lower.includes("summary")) return "Profile";
  if (lower.includes("comment"))     return "Comments";
  if (lower.includes("reaction"))    return "Reactions";
  if (lower.includes("share"))       return "Shares";
  if (lower.includes("invitation"))  return "Invitations";
  return name.replace(".csv", "");
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function callClaude(systemPrompt, data, retries = 3, onRetry = null, testMode = false) {
  const body = JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: testMode ? 400 : 5000,
    system: systemPrompt,
    messages: [{ role: "user", content: `Here is the LinkedIn export data to analyze:\n\n${JSON.stringify(data, null, 2)}\n\nGenerate the report now. Be specific, use real names from the data, and make every insight immediately actionable.` }],
  });
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
      },
      body,
    });
    if (response.ok) return (await response.json()).content[0].text;
    const err = await response.json();
    if (response.status === 429 && attempt < retries - 1) {
      const waitMs = Math.pow(2, attempt + 1) * 10000;
      if (onRetry) onRetry(waitMs / 1000);
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }
    throw new Error(err.error?.message || `API error ${response.status}`);
  }
}

async function callClaudeGN(systemPrompt, data, reportsContext, retries = 3, onRetry = null, testMode = false) {
  const body = JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: testMode ? 600 : 4500,
    system: systemPrompt,
    messages: [{
      role: "user",
      content: `Here is the LinkedIn export data:\n\n${JSON.stringify(data, null, 2)}\n\n---\n\nHere are the 5 free reports already generated for this founder:\n\n${reportsContext}\n\nGenerate the Gold Nugget report now. Use these reports as your primary source. Use real names and make every recommendation immediately actionable.`,
    }],
  });
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
      },
      body,
    });
    if (response.ok) return (await response.json()).content[0].text;
    const err = await response.json();
    if (response.status === 429 && attempt < retries - 1) {
      const waitMs = Math.pow(2, attempt + 1) * 10000;
      if (onRetry) onRetry(waitMs / 1000);
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }
    throw new Error(err.error?.message || `API error ${response.status}`);
  }
}

function categorizeRole(title = "") {
  const t = title.toLowerCase();
  if (/founder|co-founder|owner|solopreneur|entrepreneur/.test(t)) return "Founder/Owner";
  if (/ceo|chief executive|president|managing director/.test(t))   return "CEO/Executive";
  if (/coo|cfo|cto|cmo|cso|chief/.test(t))                        return "C-Suite";
  if (/vp|vice president|svp|evp/.test(t))                        return "VP";
  if (/director|head of/.test(t))                                  return "Director";
  if (/consultant|advisor|strategist|coach/.test(t))               return "Consultant/Advisor";
  if (/manager|lead/.test(t))                                      return "Manager";
  return "Other";
}
// ── The Line-Up: role-bucket matching (separate from categorizeRole above —
// different bucket set, kept isolated so it can't affect Field Report) ────────
const LINEUP_BUCKETS = [
  "Founders/Owners",
  "C-Suite",
  "VP/Director",
  "Coach/Consultant",
  "Manager",
  "Individual Contributor",
  "Unclassified",
];

function categorizeRoleForLineUp(title = "") {
  const t = (title || "").trim();
  if (!t) return "Unclassified";
  const low = t.toLowerCase();
  if (/founder|co-founder|owner|proprietor|principal/.test(low)) return "Founders/Owners";
  if (/\bceo\b|\bcfo\b|\bcoo\b|\bcto\b|\bcmo\b|\bcpo\b|chief[a-z\s]*officer|\bpresident\b/.test(low)) return "C-Suite";
  if (/\bvp\b|vice president|\bdirector\b|head of/.test(low)) return "VP/Director";
  if (/coach|consultant|advisor|strategist|freelance/.test(low)) return "Coach/Consultant";
  if (/manager|team lead|\blead\b/.test(low)) return "Manager";
  return "Individual Contributor";
}

function slimConnection(c) {
  return {
    name: `${c["First Name"] || ""} ${c["Last Name"] || ""}`.trim(),
    company: c["Company"] || "",
    position: c["Position"] || "",
    connected: c["Connected On"] || "",
  };
}
function prepareData(parsedData, fileKeys, ownName = "", icpData = null) {
  const out  = {};
  const meta = {};
  const ICP_RE = /founder|owner|co-founder|ceo|president|partner|principal|entrepreneur|solopreneur/i;

  fileKeys.forEach((k) => {
    if (!parsedData[k]) {
      const criticalFiles = ["Comments", "Shares", "Connections", "Messages", "Recommendations"];
      if (criticalFiles.includes(k)) {
        meta[`${k}_missing`] =
          `${k} data was not found. User likely uploaded Basic export instead of Complete. Do not fabricate analysis — acknowledge this gap.`;
      }
      return;
    }

    const total = parsedData[k].length;
    meta[`${k}_total`] = total;

    if (k === "Connections") {
      const roleDist = {};
      parsedData[k].forEach((c) => {
        const role = categorizeRole(c["Position"] || "");
        roleDist[role] = (roleDist[role] || 0) + 1;
      });
      const icpConns   = parsedData[k].filter((c) => ICP_RE.test(c["Position"] || "")).slice(0, 60).map(slimConnection);
      const otherConns = parsedData[k].filter((c) => !ICP_RE.test(c["Position"] || "")).slice(0, 15).map(slimConnection);
      out[k] = {
        _summary: { total, icp_count: icpConns.length, role_distribution: roleDist },
        icp_connections: icpConns,
        other_sample: otherConns,
      };
     } else if (k === "Messages") {
      const ownLower = ownName.trim().toLowerCase();
      const byPerson = {};
      parsedData[k].forEach((m) => {
        const from = (m.FROM || m.From || "").trim();
        const to   = (m.TO   || m.To   || "").trim();
        if (!from && !to) return;
        const other = from.toLowerCase() === ownLower ? to : from;
        if (!other) return;
        const dateStr = m.DATE || m.Date || "";
        const ts = Date.parse(dateStr);
        const content = (m.CONTENT || m.Content || "").substring(0, 180);
        const sentBy = from.toLowerCase() === ownLower ? "YOU" : "THEM";
        if (!byPerson[other]) {
          byPerson[other] = { count: 0, lastTs: -Infinity, lastDate: dateStr, snippet: content, sentBy };
        }
        byPerson[other].count += 1;
        if (!isNaN(ts) && ts > byPerson[other].lastTs) {
          byPerson[other].lastTs = ts;
          byPerson[other].lastDate = dateStr;
          byPerson[other].snippet = content;
          byPerson[other].sentBy = sentBy;
        }
      });
      out[k] = Object.entries(byPerson)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 60)
        .map(([who, v]) => ({
          WHO: who,
          MESSAGE_COUNT: v.count,
          LAST_CONTACT: v.lastDate,
          SNIPPET: v.snippet,
          SENT_BY: v.sentBy,
        }));
      meta[`${k}_shown`] = Math.min(60, out[k].length);
      meta[`${k}_unique_people`] = Object.keys(byPerson).length;
    } else if (k === "Comments") {
      out[k] = parsedData[k].slice(0, 40).map((c) => ({
        Date:    c.Date    || c.date    || "",
        Message: (c.Message || c.message || c.Comment || "").substring(0, 200),
        Link:    c.Link    || c.link    || "",
      }));
      meta[`${k}_shown`] = Math.min(40, total);
    } else if (k === "Recommendations_Received") {
  out[k] = parsedData[k].slice(0, 20).map((r) => ({
    WROTE_FOR_YOU: `${r["First Name"] || ""} ${r["Last Name"] || ""}`.trim(),
    THEIR_TITLE: r["Job Title"] || "",
    THEIR_COMPANY: r["Company"] || "",
    WHAT_THEY_SAID: (r["Text"] || "").substring(0, 300),
  }));
  meta[`${k}_shown`] = Math.min(20, total);
    } else if (k === "Endorsements") {
      const accepted = parsedData[k].filter((e) => (e["Endorsement Status"] || "").toUpperCase() === "ACCEPTED");
      out[k] = accepted.slice(0, 30).map((e) => ({
        WHO:   `${e["Endorser First Name"] || ""} ${e["Endorser Last Name"] || ""}`.trim(),
        SKILL: e["Skill Name"] || "",
        DATE:  e["Endorsement Date"] || "",
      }));
      meta[`${k}_shown`] = Math.min(30, accepted.length);
    } else {
      out[k] = parsedData[k].slice(0, 50);
      meta[`${k}_shown`] = Math.min(50, total);
    }
  });

  if (icpData && (icpData.client || icpData.problem)) {
    meta.user_stated_icp = { ideal_client: icpData.client || "", problem_solved: icpData.problem || "" };
  }

  if (Object.keys(out).length === 0) out["_note"] = "No matching files found. User may have uploaded Basic export.";
  if (Object.keys(meta).length > 0)  out["_meta"] = meta;
  return out;
}

// ── Intro Block ──────────────────────────────────────────────────────────────
function IntroBlock({ reportId }) {
  const text = INTROS[reportId];
  const caveat = CAVEATS[reportId];
  if (!text) return null;
  return (
    <>
      {caveat && (
        <p style={{ fontSize: 12, color: MUTED, opacity: 0.75, lineHeight: 1.6, marginBottom: 14, fontStyle: "italic" }}>{caveat}</p>
      )}
      <div style={{ background: `linear-gradient(135deg, ${BLUE_DEEP}88, ${DARK_CARD})`, border: `1px solid ${BLUE_BRIGHT}33`, borderRadius: 10, padding: "20px 24px", marginBottom: 28 }}>
        {text.split("\n\n").map((para, i) => (
          <p key={i} style={{ fontSize: 14, color: MUTED, lineHeight: 1.8, margin: i > 0 ? "12px 0 0" : 0 }}>{para}</p>
        ))}
      </div>
    </>
  );
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
// ── Upgrade CTA card (shown at the bottom of free reports) ────────────────────
function UpgradeCTA({ text }) {
  return (
    <div style={{ background: `linear-gradient(135deg, #1a1200, ${DARK_CARD})`, border: "1px solid #C9A84C66", borderRadius: 12, padding: "24px 28px", marginTop: 28, textAlign: "center" }}>
      <p style={{ fontSize: 14, color: WHITE, lineHeight: 1.7, marginBottom: 18 }}>{text}</p>
      <a href="https://buy.stripe.com/3cIcN64sBd54d5pf3r6kg0b" target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "12px 28px", background: "linear-gradient(135deg, #C9A84C, #f5c842)", color: "#0a1628", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Unlock Gold — $29/month →</a>
    </div>
  );
}

// ── The Line-Up report ─────────────────────────────────────────────────────────
function LineUpReport({ connections }) {
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [revealed, setRevealed] = useState({});

  if (!connections || connections.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 32px", color: MUTED, fontSize: 14 }}>
        No connections loaded yet — upload your LinkedIn data to see The Line-Up.
      </div>
    );
  }

  const grouped = {};
  LINEUP_BUCKETS.forEach(b => { grouped[b] = []; });
  connections.forEach(c => {
    grouped[categorizeRoleForLineUp(c["Position"])].push(c);
  });

  const toggleBucket = (id) => {
    setExpanded(prev => (prev === id ? null : id));
    setSearch("");
  };

  const activeList = expanded ? grouped[expanded] : [];
  const q = search.trim().toLowerCase();
  let filtered = activeList.filter(c => {
    if (!q) return true;
    const name = `${c["First Name"] || ""} ${c["Last Name"] || ""}`.toLowerCase();
    const company = (c["Company"] || "").toLowerCase();
    const title = (c["Position"] || "").toLowerCase();
    return name.includes(q) || company.includes(q) || title.includes(q);
  });
  filtered = filtered.slice().sort((a, b) => {
    const ta = Date.parse(a["Connected On"] || "") || 0;
    const tb = Date.parse(b["Connected On"] || "") || 0;
    return sortDesc ? tb - ta : ta - tb;
  });
  const revealedThis = expanded ? !!revealed[expanded] : false;
  const visibleCount = revealedThis ? filtered.length : Math.min(8, filtered.length);
  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
        {LINEUP_BUCKETS.map(b => {
          const count = grouped[b].length;
          const active = expanded === b;
          return (
            <div key={b} onClick={() => toggleBucket(b)} style={{ padding: "8px 16px", borderRadius: 20, cursor: "pointer", background: active ? BLUE_MID + "33" : "#0a1628", border: `1px solid ${active ? BLUE_BRIGHT : BORDER}`, color: active ? BLUE_BRIGHT : MUTED, fontSize: 13, fontWeight: 600 }}>
              {b} · {count}
            </div>
          );
        })}
      </div>

      {!expanded && (
        <div style={{ padding: "40px 20px", textAlign: "center", color: MUTED, fontSize: 13, border: `1px dashed ${BORDER}`, borderRadius: 10 }}>
          Click a bucket above to see who's in it.
        </div>
      )}

      {expanded && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <input type="text" placeholder="Search by name, role, or company..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220, padding: "10px 14px", background: "#0a1628", border: `1px solid ${BLUE_BRIGHT}44`, borderRadius: 8, color: WHITE, fontSize: 14 }} />
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <div onClick={() => setSortDesc(true)} style={{ padding: "8px 14px", borderRadius: 6, cursor: "pointer", border: `1px solid ${sortDesc ? BLUE_BRIGHT : BORDER}`, background: sortDesc ? BLUE_MID + "44" : "transparent", color: sortDesc ? BLUE_BRIGHT : MUTED, fontSize: 12, fontWeight: 600 }}>Most recent</div>
              <div onClick={() => setSortDesc(false)} style={{ padding: "8px 14px", borderRadius: 6, cursor: "pointer", border: `1px solid ${!sortDesc ? BLUE_BRIGHT : BORDER}`, background: !sortDesc ? BLUE_MID + "44" : "transparent", color: !sortDesc ? BLUE_BRIGHT : MUTED, fontSize: 12, fontWeight: 600 }}>Oldest first</div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 10 }}>
            {expanded} · {grouped[expanded].length} total
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 13 }}>No matches — try a different search.</div>
          )}

          {visible.map((c, i) => {
            const name = `${c["First Name"] || ""} ${c["Last Name"] || ""}`.trim() || "—";
            const title = c["Position"] || "—";
            const company = c["Company"] || "—";
            const dateRaw = c["Connected On"] || "";
            const ts = Date.parse(dateRaw);
            const dateDisplay = !isNaN(ts) ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : (dateRaw || "—");
            const url = c["URL"] || "";
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1.4fr) minmax(160px, 1.1fr) minmax(160px, 1.1fr) 110px", alignItems: "center", gap: 16, background: "#0a1628", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: BLUE_BRIGHT }}>
                  {url ? <a href={url} target="_blank" rel="noreferrer" style={{ color: BLUE_BRIGHT, textDecoration: "none" }}>{name} ↗</a> : name}
                </div>
                <div style={{ fontSize: 12, color: WHITE }}>{title}</div>
                <div style={{ fontSize: 12, color: MUTED }}>{company}</div>
                <div style={{ fontSize: 11, color: MUTED, textAlign: "right" }}>{dateDisplay}</div>
              </div>
            );
          })}

          {remaining > 0 && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <div onClick={() => setRevealed(prev => ({ ...prev, [expanded]: true }))} style={{ display: "inline-block", padding: "8px 18px", background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Show {remaining} more
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Score Reveal screen ───────────────────────────────────────────────────────
function ScoreReveal({ scores, onContinue }) {
  // Confetti on mount
  useEffect(() => {
    const colors = ["#41a1e8", "#7ec8f5", "#4ade80", "#E8A000", "#f5c842", "#e8f0fe"];
    const pieces = Array.from({ length: 180 }, () => {
      const el = document.createElement("div");
      el.style.cssText = `
        position: fixed; top: -10px; z-index: 9999; pointer-events: none;
        width: ${Math.random() * 8 + 4}px; height: ${Math.random() * 8 + 4}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}vw;
        border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
        animation: confettiFall ${Math.random() * 2 + 2}s ease-in ${Math.random() * 1}s forwards;
      `;
      document.body.appendChild(el);
      return el;
    });
    const style = document.createElement("style");
    style.textContent = "@keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }";
    document.head.appendChild(style);
    const cleanup = setTimeout(() => { pieces.forEach(el => el.remove()); style.remove(); }, 5000);
    return () => { clearTimeout(cleanup); pieces.forEach(el => el.remove()); style.remove(); };
  }, []);

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

// ── Laptop Frame ─────────────────────────────────────────────────────────────
function LaptopFrame({ children }) {
  return (
    <div className="scroll-reveal" style={{ marginBottom: 20 }}>
      <div style={{ background: "#1a1a2e", borderRadius: "12px 12px 0 0", padding: "10px 10px 0", border: "2px solid #2a2a4a", borderBottom: "none" }}>
        <div style={{ background: "#0f0f1e", borderRadius: "8px 8px 0 0", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
          </div>
          <div style={{ flex: 1, background: "#1a1a2e", borderRadius: 4, padding: "3px 10px", fontSize: 10, color: "#4a6a8a", textAlign: "center" }}>getnugget.ca</div>
        </div>
        <div style={{ borderRadius: "0 0 4px 4px", overflow: "hidden", maxHeight: 480, overflowY: "hidden" }}>
          {children}
        </div>
      </div>
      <div style={{ background: "#2a2a4a", height: 14, borderRadius: "0 0 4px 4px", border: "2px solid #2a2a4a", borderTop: "none" }} />
      <div style={{ background: "#1e1e3a", height: 8, width: "60%", margin: "0 auto", borderRadius: "0 0 8px 8px" }} />
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${BORDER}, transparent)`, margin: "56px 0" }} />;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const isBeta   = new URLSearchParams(window.location.search).get("beta") === "true";
  const isTest   = new URLSearchParams(window.location.search).get("test") === "true";

  const [step,            setStep]           = useState("upload");
  const [uploadedFiles,   setUploadedFiles]  = useState({});
  const [parsedData,      setParsedData]     = useState({});
  const [reports,         setReports]        = useState({});
  const [scores,          setScores]         = useState(null);
  const [generating,      setGenerating]     = useState(null);
  const [activeReport,    setActiveReport]   = useState("lineup");
  const [dragOver,        setDragOver]       = useState(false);
  const [error,           setError]          = useState(null);
  const [retryMessage,    setRetryMessage]   = useState(null);
  const [showEmailModal,  setShowEmailModal] = useState(false);
  const [emailSubmitted,  setEmailSubmitted] = useState(false);
  const [pendingReportId, setPendingReportId]= useState(null);
  const [emailName,       setEmailName]      = useState("");
  const [emailAddress,    setEmailAddress]   = useState("");
  const [emailSubmitting, setEmailSubmitting]= useState(false);
  const [showICPModal,    setShowICPModal]   = useState(false);
  const [icpSubmitted,    setICPSubmitted]   = useState(false);
  const [icpClient,       setICPClient]      = useState("");
  const [icpProblem,      setICPProblem]     = useState("");
  const [creditStatus,    setCreditStatus]   = useState(null);
  const fileInputRef = useRef(null);
  const uploadRef    = useRef(null);

  const hasFiles            = Object.keys(uploadedFiles).length > 0;
  const connCount           = parsedData["Connections"]?.length || 0;
  const msgCount            = parsedData["Messages"]?.length || 0;
  const reportsReady        = Object.keys(reports).length;
  const activeReportMeta    = REPORTS.find(r => r.id === activeReport);
    const freeReportsComplete = REPORTS.filter(r => r.free && !r.computed).every(r => reports[r.id]);
  const isMissingCriticalFiles = hasFiles && !parsedData["Connections"];

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

  const slimDataForTest = (data) => {
    const out = {};
    Object.entries(data).forEach(([k, v]) => {
      out[k] = Array.isArray(v) ? v.slice(0, 10) : v;
    });
    return out;
  };

 const runReport = async (reportId) => {
  const report = REPORTS.find(r => r.id === reportId);
  const needsCredit = !report?.free && !isBeta;
  const regenCount = creditStatus?.activeRunReports?.[reportId] || 0;
  if (needsCredit && !creditStatus?.canRun) return;
  if (needsCredit && regenCount >= 3) {
    setError("You've used your 3 regenerations for this report in the current run. Generate your other reports to complete this run — the next one will start fresh.");
    return;
  }
  if (generating) return;
  if (!emailSubmitted) { setPendingReportId(reportId); setShowEmailModal(true); return; }
  setGenerating(reportId); setActiveReport(reportId); setStep("reports"); setError(null); setRetryMessage(null);
  try {
    const ownName = `${parsedData["Profile"]?.[0]?.["First Name"] || ""} ${parsedData["Profile"]?.[0]?.["Last Name"] || ""}`.trim();
      const prepared = prepareData(parsedData, report.files, ownName, { client: icpClient, problem: icpProblem });
      const promptText = PROMPTS[reportId].replace(/{{OWNER_NAME}}/g, ownName);
      const result = await callClaude(
        promptText,
      isTest ? slimDataForTest(prepared) : prepared,
      3,
      (secs) => setRetryMessage(`The hamster's catching its breath — back in ~${Math.round(secs)}s! 🐹`),
      isTest
    );
    setReports(prev => ({ ...prev, [reportId]: result }));
    if (needsCredit) {
      fetch("/api/consume-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress.trim(), reportId, reportTitle: report?.name }),
      })
        .then(res => res.json())
        .then(data => { if (data?.creditStatus) setCreditStatus(data.creditStatus); })
        .catch(err => console.log("consume-credit error:", err));
    }
  } catch (err) { setError(err.message); }
  finally { setGenerating(null); setRetryMessage(null); }
};

  const generateGoldNugget = async () => {
    if (generating) return;
    setGenerating("gold"); setActiveReport("gold"); setStep("reports"); setError(null); setRetryMessage(null);
    try {
      const ownName = `${parsedData["Profile"]?.[0]?.["First Name"] || ""} ${parsedData["Profile"]?.[0]?.["Last Name"] || ""}`.trim();
      const data = prepareData(parsedData, ["Connections", "Messages"], ownName, { client: icpClient, problem: icpProblem });
      const reportsContext = Object.entries(reports)
        .map(([id, text]) => `=== ${REPORTS.find(r => r.id === id)?.name?.toUpperCase() || id.toUpperCase()} ===\n${text}`)
        .join("\n\n---\n\n");
      const fullText = await callClaudeGN(
  PROMPTS.gold,
  data,
  reportsContext,
  3,
  (secs) => setRetryMessage(`The hamster's catching its breath — back in ~${Math.round(secs)}s! 🐹`),
  isTest
);
      const parsedScores = parseScores(fullText);
      const cleanText    = stripScores(fullText);
      setReports(prev => ({ ...prev, gold: cleanText }));
      if (parsedScores) { setScores(parsedScores); setStep("score"); }
    } catch (err) { setError(err.message); }
    finally { setGenerating(null); setRetryMessage(null); }
  };

  const submitEmail = async () => {
  if (!emailName.trim() || !emailAddress.trim()) return;
  setEmailSubmitting(true);
  const pending = pendingReportId; setPendingReportId(null);

  // Existing: feeds your Kit newsletter list — unchanged
  fetch("https://hook.us2.make.com/xu7d06pva2t2hhyccr86ddar7msqm4zl", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: emailName.trim(), email: emailAddress.trim(), source: "nugget-free-user" }),
  }).catch(err => console.log("Webhook error:", err));

  // New: registers the user in Supabase and sends their magic link
  fetch("/api/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: emailName.trim(), email: emailAddress.trim() }),
  }).catch(err => console.log("Registration error:", err));

  setEmailSubmitted(true);
  setEmailSubmitting(false);
  setShowEmailModal(false);
  fetch(`/api/check-credits?email=${encodeURIComponent(emailAddress.trim())}`)
    .then(res => res.json())
    .then(data => setCreditStatus(data))
    .catch(err => console.log("check-credits error:", err));
  if (pending) { setPendingReportId(pending); setShowICPModal(true); }
};
  
const submitICP = () => {
  setICPSubmitted(true);
  setShowICPModal(false);
  const pending = pendingReportId; setPendingReportId(null);
  if (pending) runReport(pending);
};

  // Scroll reveal observer
  const observerRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12 }
    );
    observerRef.current = observer;
    setTimeout(() => {
      document.querySelectorAll(".scroll-reveal").forEach(el => observer.observe(el));
    }, 100);
    return () => observer.disconnect();
  });

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
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes fadeIn      { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse       { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseCTA    { 0%,100% { box-shadow: 0 0 0 0 rgba(65,161,232,0.4); } 70% { box-shadow: 0 0 0 14px rgba(65,161,232,0); } }
@media print {
  body { background: #fff !important; color: #000 !important; }
header, footer, nav, .no-print, .print-hide-sidebar { display: none !important; }
  .print-report-panel { grid-column: 1 / -1 !important; width: 100% !important; }
  .print-header { display: block !important; }
  .print-report-panel { box-shadow: none !important; border: none !important; background: #fff !important; color: #000 !important; padding: 0 !important; }
  .print-report-panel h3 { color: #0d2d6b !important; border-left-color: #0d2d6b !important; }
  .print-report-panel p, .print-report-panel div { color: #000 !important; background: transparent !important; }
  .print-report-panel strong { color: #0d2d6b !important; }
  .print-intro { background: #f0f4ff !important; border: 1px solid #c0d0f0 !important; color: #222 !important; }
  .print-intro p { color: #222 !important; }
  @page { margin: 18mm 16mm; }
        /* end print */
}
        .scroll-reveal         { opacity: 0; transform: translateY(32px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .scroll-reveal.visible { opacity: 1; transform: translateY(0); }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 40px", display: "flex", alignItems: "center", background: DARK_CARD, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 24, fontFamily: "Georgia, serif", fontWeight: 700, letterSpacing: "-0.5px", background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", whiteSpace: "nowrap" }}>Nugget<span style={{ fontSize: 13, verticalAlign: "super", marginLeft: 1 }}>™</span></div>
          <div style={{ width: 1, height: 28, background: BORDER, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: MUTED, letterSpacing: "0.03em", lineHeight: 1.4 }}>Turn your network into your pipeline. No cold outreach required.</div>
          {isTest && <div style={{ padding: "3px 10px", background: "#2a1a00", border: "1px solid #E8A000", borderRadius: 4, fontSize: 11, color: "#E8A000", fontWeight: 700, letterSpacing: "0.06em" }}>TEST MODE</div>}
        </div>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {step === "upload" ? (
            <button style={{ ...primaryBtn, padding: "8px 20px", fontSize: 13 }} onClick={scrollToUpload}>Get My Free Reports →</button>
          ) : (
            <>
              <button style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, cursor: "pointer", fontSize: 13 }} onClick={() => setStep("upload")}>Home</button>
              <button style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${step === "reports" ? BLUE_BRIGHT : BORDER}`, background: step === "reports" ? BLUE_MID + "44" : "transparent", color: step === "reports" ? BLUE_BRIGHT : MUTED, cursor: "pointer", fontSize: 13 }} onClick={() => connCount > 0 && setStep("reports")}>
                Reports {reportsReady > 0 && `(${reportsReady})`}
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
            <div style={{ background: `linear-gradient(160deg, #061022 0%, #0d2d6b 40%, #1149ac 70%, #41a1e8 100%)`, padding: "80px 24px 72px", borderRadius: "0 0 24px 24px", textAlign: "center", marginBottom: 0 }}>
              
              <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 16, animation: "fadeSlideUp 0.7s ease-out 0s both" }}>For Founders and Solopreneurs who hate cold outreach</p>
        <h1 style={{ fontSize: 48, fontFamily: "Georgia, serif", fontWeight: 700, color: "#ffffff", marginBottom: 28, lineHeight: 1.1, animation: "fadeSlideUp 0.7s ease-out 0.1s both" }}>
                Your next client is already<br />
                <span style={{ background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in your network.</span>
              </h1>
              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.85)", maxWidth: 580, margin: "0 auto 44px", lineHeight: 1.75, animation: "fadeSlideUp 0.7s ease-out 0.2s both" }}>
                You've built a solid LinkedIn network. Nugget shows you exactly who to talk to, what to say, and where your next opportunity is hiding.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 44, animation: "fadeSlideUp 0.7s ease-out 0.4s both" }}>
                <button style={{ ...primaryBtn, fontSize: 16, padding: "14px 36px" }} onClick={scrollToUpload}>Get My Free Reports →</button>
              </div>
              <p style={{ fontSize: 30, fontFamily: "Georgia, serif", fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.3px", marginTop: 20, animation: "fadeSlideUp 0.7s ease-out 0.5s both" }}>
                NO scraping.&nbsp;&nbsp;NO cold outreach.&nbsp;&nbsp;NO guessing.
              </p>
            </div>

            <div style={{ padding: "56px 0 0" }}>

              {/* ── The Problem ── */}
              <div className="scroll-reveal" style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "64px 48px", marginBottom: 0, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, marginBottom: 20 }}>Sound familiar?</div>
                <p style={{ fontSize: 19, color: WHITE, lineHeight: 1.8, maxWidth: 660, margin: "0 auto 20px", fontFamily: "Georgia, serif" }}>
                  Your LinkedIn network is full of connections who could refer you, hire you, or open a door. But LinkedIn doesn't show you who they are, how warm they are, or what to say.
                </p>
                <p style={{ fontSize: 19, color: WHITE, lineHeight: 1.8, maxWidth: 660, margin: "0 auto 24px", fontFamily: "Georgia, serif" }}>
                  So you either throw spaghetti hoping something sticks — or you do nothing and wonder why business development feels so hard.
                </p>
                <p style={{ fontSize: 24, fontFamily: "Georgia, serif", fontWeight: 700, maxWidth: 660, margin: "0 auto", background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Either way you're leaving money behind.
                </p>
              </div>
                        
              <Divider />

              {/* ── Report Mockups ── */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                  <div style={{ fontSize: 14, color: BLUE_BRIGHT, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>See It In Action</div>
                  <h2 style={{ fontSize: 32, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 12 }}>Real intelligence. Real names. Real next steps.</h2>
                  <p style={{ fontSize: 15, color: MUTED, maxWidth: 500, margin: "0 auto" }}>Upload your LinkedIn data once — here's exactly what comes back.</p>
                </div>

                {/* Mockup 1 — Field Report */}
<LaptopFrame>
<div style={{ display: "flex", height: 420, overflow: "hidden" }}>
  {/* Sidebar */}
  <div style={{ width: 180, borderRight: `1px solid ${BORDER}`, padding: "16px 0", flexShrink: 0 }}>
    {[
      { name: "The Field Report", sub: "✓ Complete", active: true },
      { name: "The Warm List", sub: "✓ Complete", active: false },
      { name: "The Hidden Nuggets Report", sub: "✓ Complete", active: false },
      { name: "The Inbound Report", sub: "Unmined", active: false },
      { name: "The Outbound Report", sub: "Unmined", active: false },
      { name: "The Gold Nugget", sub: "🔒 Upgrade to unlock", active: false },
    ].map((r, i) => (
      <div key={i} style={{ padding: "10px 16px", borderLeft: r.active ? `3px solid ${BLUE_BRIGHT}` : "3px solid transparent", marginBottom: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: r.active ? BLUE_BRIGHT : WHITE }}>{r.name}</div>
        <div style={{ fontSize: 11, color: MUTED }}>{r.sub}</div>
      </div>
    ))}
  </div>
  {/* Report Panel */}
  <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
    <div style={{ borderLeft: `3px solid ${BLUE_BRIGHT}`, paddingLeft: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: BLUE_BRIGHT, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Top 10 Untapped Connections</div>
    </div>
    {[
      { name: "David Mercer", title: "CEO", company: "Mercer Growth Partners", reason: "Built 3 companies from $0 to exit — prime referral source for Founders needing financial infrastructure" },
      { name: "Lisa Thornton", title: "Founder & MD", company: "Thornton Capital Advisory", reason: "Runs a boutique M&A firm — her Clients are exactly who needs a Fractional CFO pre-transaction" },
      { name: "Ray Okonkwo", title: "Managing Partner", company: "Okonkwo Ventures", reason: "Invests in early-stage SaaS — portfolio companies consistently underserved on financial ops" },
      { name: "Priya Nair", title: "Co-Founder", company: "Scalepath Inc.", reason: "Scaling from $2M to $10M ARR — the exact moment Fractional CFO engagement becomes critical" },
      { name: "Tom Castellano", title: "President", company: "Castellano Business Group", reason: "SMB advisory practice with 40+ active business Owner Clients — strong referral multiplier" },
      { name: "Sandra Kwon", title: "VP Finance", company: "Northgate Ventures", reason: "Oversees financial operations for 12 portfolio companies — high-value referral network" },
      { name: "Marcus Webb", title: "CEO", company: "Webb Advisory Group", reason: "Serial entrepreneur with 3 exits — actively mentors Founders in growth stages" },
      { name: "Elena Vasquez", title: "Director of Operations", company: "Clearpath Consulting", reason: "Manages finance function for 20+ SMB clients — direct line to CFO-ready companies" },
      { name: "James Oduya", title: "Managing Director", company: "Bridgepoint Capital", reason: "Funds early-stage B2B SaaS — portfolio consistently needs fractional finance support" },
      { name: "Rachel Fong", title: "Founder", company: "Fong Strategic Advisors", reason: "Boutique strategy firm serving scale-up CEOs — natural co-referral partner" },
    ].map((p, i) => (
      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < 9 ? `1px solid ${BORDER}` : "none" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: BLUE_BRIGHT }}>{p.name}</span>
            <span style={{ fontSize: 11, color: MUTED }}>| {p.title} | {p.company}</span>
          </div>
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>{p.reason}</div>
        </div>
      </div>
    ))}
  </div>
</div>
                </LaptopFrame>

                {/* Mockup 2 — Your BizDev Readiness Score */}
                <div className="scroll-reveal" style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "36px 40px", marginBottom: 20 }}>
                  <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ fontSize: 11, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>BizDev Readiness Score</div>
                    <div style={{ fontSize: 88, fontWeight: 700, fontFamily: "Georgia, serif", background: `linear-gradient(90deg, ${BLUE_BRIGHT}, ${BLUE_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1, marginBottom: 10 }}>74</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: BLUE_BRIGHT, marginBottom: 8 }}>Getting Warm 🔥</div>
                    <div style={{ fontSize: 13, color: MUTED }}>Your LinkedIn foundation is taking shape. Here's where you stand.</div>
                  </div>
                  <div style={{ background: DARK, borderRadius: 12, padding: "24px 28px", marginBottom: 20, border: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 11, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 20 }}>Your Foundation Breakdown</div>
                    {[
                      { label: "Network Strength",      score: 82, status: "Strong",         color: "#4ade80" },
                      { label: "Profile Strength",      score: 58, status: "Building",        color: BLUE_BRIGHT },
                      { label: "Content Strength",      score: 71, status: "Strong",          color: "#4ade80" },
                      { label: "Relationship Strength", score: 79, status: "Strong",          color: "#4ade80" },
                      { label: "Advocate Strength",     score: 44, status: "Needs Attention", color: "#f87171" },
                    ].map((d, i) => (
                      <div key={i} style={{ marginBottom: 18 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: WHITE, fontWeight: 600 }}>{d.label}</span>
                          <span style={{ fontSize: 12, color: d.color, fontWeight: 700 }}>{d.status}</span>
                        </div>
                        <div style={{ height: 7, background: BORDER, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${d.score}%`, background: `linear-gradient(90deg, ${d.color}88, ${d.color})`, borderRadius: 4 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: BLUE_MID + "22", border: `1px solid ${BLUE_BRIGHT}33`, borderRadius: 10, padding: "14px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: WHITE }}>
                      <strong style={{ color: BLUE_BRIGHT }}>Advocate Strength</strong> is where your foundation needs the most attention — and it's the fastest to move.
                    </div>
                  </div>
                </div>

                {/* Mockup 3 — Gold Nugget */}
<LaptopFrame>
<div style={{ display: "flex", height: 420, overflow: "hidden" }}>
  {/* Sidebar */}
  <div style={{ width: 180, borderRight: `1px solid ${BORDER}`, padding: "16px 0", flexShrink: 0 }}>
    {[
      { name: "The Field Report", sub: "✓ Complete", active: false },
      { name: "The Warm List", sub: "✓ Complete", active: false },
      { name: "The Hidden Nuggets Report", sub: "✓ Complete", active: false },
      { name: "The Inbound Report", sub: "✓ Complete", active: false },
      { name: "The Outbound Report", sub: "✓ Complete", active: false },
      { name: "The Gold Nugget", sub: "✓ Complete", active: true },
    ].map((r, i) => (
      <div key={i} style={{ padding: "10px 16px", borderLeft: r.active ? `3px solid #E8A000` : "3px solid transparent", marginBottom: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: r.active ? "#E8A000" : WHITE }}>{r.name}</div>
        <div style={{ fontSize: 11, color: MUTED }}>{r.sub}</div>
      </div>
    ))}
  </div>
  {/* Report Panel */}
  <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
    <div style={{ borderLeft: `3px solid #E8A000`, paddingLeft: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "#E8A000", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Your People — Move Now (Hot)</div>
    </div>
    {[
      { name: "Lisa Thornton", why: "Connected 3 months ago, exchanged 6 messages about exit planning challenges — she went quiet after you shared your CFO framework", move: "Reply to her last message: 'Lisa — I've been working with two Founders navigating exactly the kind of pre-exit complexity you mentioned. Worth a 15-minute call?'" },
      { name: "David Mercer", why: "Most engaged connection — reacted to 4 posts this month, replied to your comment on his scaling article last week", move: "DM him today: 'David — your point about financial ops being the silent killer in scaling resonated. That's exactly what I help Founders fix. Coffee chat?'" },
      { name: "Priya Nair", why: "Liked your last 3 posts, asked a question in comments about runway modeling — never got a private follow-up", move: "Send a voice note: 'Priya — loved your question about runway modeling. I have a framework for this. Want me to share it?'" },
    ].map((p, i) => (
      <div key={i} style={{ background: DARK, borderRadius: 10, padding: "16px 18px", marginBottom: 12, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: BLUE_BRIGHT, marginBottom: 6 }}>{p.name}</div>
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.65, marginBottom: 10 }}>{p.why}</div>
        <div style={{ fontSize: 12, color: WHITE, lineHeight: 1.65, background: BLUE_MID + "22", padding: "10px 14px", borderRadius: 8, borderLeft: `3px solid ${BLUE_BRIGHT}` }}>
          <span style={{ color: BLUE_BRIGHT, fontWeight: 700 }}>Best move: </span>{p.move}
        </div>
      </div>
    ))}
  </div>
</div>
                </LaptopFrame>
              </div>

              {/* ── BizDev Readiness Score ── */}
              <div style={{ marginBottom: 0 }}>
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                  <div style={{ fontSize: 14, color: BLUE_BRIGHT, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>Nugget's Signature Metric</div>
                  <h2 style={{ fontSize: 34, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 28, lineHeight: 1.2 }}>Meet Your BizDev Readiness Score.</h2>
                  <p style={{ fontSize: 16, color: MUTED, maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.75 }}>
                    Most people have no idea where they actually stand when it comes to business development. Not a gut feeling — an actual number. NUGGET changes that.
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
                  <p style={{ fontSize: 15, color: WHITE, lineHeight: 1.7, marginBottom: 16 }}>
                    Watch your score climb every quarter. Share your milestone. Show your work.
                  </p>
                  <p style={{ fontSize: 13, color: MUTED, fontStyle: "italic", lineHeight: 1.8 }}>
                    "It takes what most people overcomplicate and makes it obvious and simple." — Meredith Brewer
                  </p>
                  <p style={{ fontSize: 13, color: MUTED, fontStyle: "italic", lineHeight: 1.8 }}>
                    "The Nugget is amazing. It's incredibly valuable info." — Noelle Labrie
                  </p>
                </div>
              </div>

              <Divider />

              {/* ── How It Works ── */}
              <div style={{ marginBottom: 0 }}>
                <p style={{ fontSize: 22, color: WHITE, fontWeight: 700, textAlign: "center", marginBottom: 32, fontFamily: "Georgia, serif", letterSpacing: "-0.3px" }}>
                  Your Nuggets are waiting — Just 3 easy steps to find them...
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  {[
                    { step: "01", title: "Request your data", desc: "On LinkedIn: Me → Settings & Privacy → Data Privacy → Request a copy of your data. Select Complete — not Basic — and click Request archive.", image: STEP1_IMAGE },
                    { step: "02", title: "Download the file", desc: "Wait for LinkedIn to email your data file — usually within 24 hours. Click the link in that email and download the file to your computer.", image: null },
                    { step: "03", title: "Drop it in below", desc: "Drag and drop the file into Nugget below — no need to unzip it. Nugget opens it automatically and does the rest.", image: STEP3_IMAGE },
                  ].map((s) => (
                    <div key={s.step} style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                      <div style={{ width: "100%", height: 180, background: BLUE_MID + "44", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${BORDER}`, overflow: "hidden" }}>
{s.image ? (
<img src={s.image} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
) : (
<span style={{ fontSize: 13, color: MUTED, fontStyle: "italic" }}>Image coming soon</span>
)}
</div>
                      <div style={{ padding: "20px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: BLUE_BRIGHT, opacity: 0.6, marginBottom: 6, letterSpacing: "0.06em" }}>STEP {s.step}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, marginBottom: 8 }}>{s.title}</div>
                        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Upload Zone ── */}
             <div id="upload-zone" ref={uploadRef} style={{ background: `linear-gradient(160deg, #061022 0%, #0d2d6b 40%, #1149ac 70%, #41a1e8 100%)`, borderRadius: 24, padding: "48px 32px", marginBottom: 0, marginTop: 32 }}>
                <div
                  style={{ borderRadius: 16, padding: "44px 32px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(255,255,255,0.1)" : "transparent", transition: "all 0.2s" }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Georgia, serif", color: WHITE, marginBottom: 10 }}>Drop your LinkedIn file here</div>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 36, lineHeight: 1.5 }}>
                    <div style={{ marginBottom: 6 }}>Drop the zip file LinkedIn sent you here — don't unzip it. Nugget handles everything inside automatically.</div>
                    <div>Or upload individual files if you prefer.</div>
                  </div>
                  <button style={{ padding: "10px 28px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>Choose Files</button>
                  <input ref={fileInputRef} type="file" multiple accept=".csv,.zip" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
                  {hasFiles && (
                    <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                      {Object.keys(uploadedFiles).map(k => (
                        <span key={k} style={{ padding: "4px 12px", background: BLUE_MID + "33", border: "1px solid #41a1e844", borderRadius: 20, fontSize: 12, color: BLUE_BRIGHT }}>✓ {k}</span>
                      ))}
                    </div>
                  )}
                </div>
              
                {isMissingCriticalFiles && (
  <div style={{ background: "#1a0e00", border: "1px solid #E8A000", borderRadius: 10, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
    <div style={{ fontSize: 20, flexShrink: 0 }}>⚠️</div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#E8A000", marginBottom: 6 }}>Looks like you uploaded the Basic export</div>
      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>Nugget needs your <strong style={{ color: WHITE }}>Complete</strong> LinkedIn export. On LinkedIn: <strong style={{ color: WHITE }}>Me → Settings & Privacy → Data Privacy → Request a copy → select Complete → Request archive.</strong> LinkedIn emails it within 24 hours.</div>
    </div>
  </div>
)}
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
                {connCount > 0 && (
                  <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
                                        <p style={{ fontSize: 15, color: WHITE, marginBottom: 12 }}>✅ Your data is loaded and ready. Check out The Line-Up instantly — no waiting — or scroll down to generate your other reports.</p>
                  </div>
                )}
               
               </div>

              {error && <div style={{ background: "#1a0a0a", border: "1px solid #8B0000", borderRadius: 8, padding: "12px 16px", color: "#ff8080", fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <Divider />
{/* ── Report cards ── */}
              <div style={{ marginBottom: 0 }}>
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                  <div style={{ fontSize: 14, color: BLUE_BRIGHT, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>What You Get</div>
                          <h2 style={{ fontSize: 32, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 24 }}>2 free reports.<br />Unlock the other 5 to find your next client.</h2>
                  <p style={{ fontSize: 14, color: MUTED, maxWidth: 500, margin: "0 auto" }}>
                    Every insight, every name, and every next step is unique to you.<br />This is <span style={{ color: WHITE, fontWeight: 700 }}>YOUR</span> data. These are <span style={{ color: WHITE, fontWeight: 700 }}>YOUR</span> people. This is <span style={{ color: WHITE, fontWeight: 700 }}>YOUR</span> pipeline.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
                                    {REPORTS.filter(r => r.id !== "gold").map(r => {
                    const unlocked = r.free || isBeta || !!creditStatus?.canRun;
                    return (
                    <div key={r.id} style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, opacity: unlocked ? 1 : 0.5, position: "relative", borderTop: "3px solid transparent", backgroundImage: `linear-gradient(${DARK_CARD}, ${DARK_CARD}), linear-gradient(90deg, ${unlocked ? BLUE_BRIGHT : BORDER}, ${unlocked ? BLUE_MID : BORDER})`, backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box", display: "flex", flexDirection: "column" }}>
                      {!unlocked && <span style={{ position: "absolute", top: 14, right: 14, fontSize: 15, color: MUTED }}>🔒</span>}
                      <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: r.free ? BLUE_MID + "33" : isBeta ? BLUE_MID + "33" : "#2a1a00", color: r.free ? BLUE_BRIGHT : isBeta ? BLUE_BRIGHT : "#E8A000", marginBottom: 8 }}>
                        {isBeta && !r.free ? "BETA" : r.tag}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, marginBottom: 3, fontFamily: "Georgia, serif" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: MUTED, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{r.subtitle}</div>
                      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginBottom: 14, flex: 1 }}>{r.description}</div>
                                            {unlocked ? (
                                                (r.computed || reports[r.id])
                          ? <button style={{ padding: "8px 16px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, border: "none", color: WHITE, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }} onClick={() => { setActiveReport(r.id); setStep("reports"); }}>✓ View Report</button>
                          : <button style={{ padding: "8px 16px", background: generating === r.id ? BLUE_MID + "44" : `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, border: "none", color: WHITE, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", width: "100%" }} onClick={() => runReport(r.id)} disabled={!!generating}>
                              {generating === r.id ? "⏳ Mining..." : "Generate Report"}
                            </button>
                      ) : (
                        <button style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }} onClick={() => { const el = document.getElementById("pricing-section"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}>🔒 Buy credits to unlock</button>
                      )}
                    </div>
                    );
                  })}
                </div>

               {/* ── Pricing section ── */}
               <div id="pricing-section" style={{ marginTop: 60, textAlign: "center" }}>
                  <div style={{ fontSize: 14, color: BLUE_BRIGHT, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>Pricing</div>
                  <h2 style={{ fontSize: 32, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 16 }}>
                    Start free. Then unlock the <span style={{ color: "#C9A84C" }}>Gold.</span>
                  </h2>
                  <p style={{ fontSize: 13, color: "#E8A000", fontWeight: 700, marginBottom: 48 }}>Founder pricing — lock it in before Oct 9.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, maxWidth: 1040, margin: "0 auto" }}>

                    {/* Free card */}
                    <div style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, textAlign: "left", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: BLUE_MID + "33", color: BLUE_BRIGHT, marginBottom: 16 }}>FREE</div>
                      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif", color: WHITE, marginBottom: 4 }}>$0</div>
                      <div style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>No credit card required</div>
                      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ color: BLUE_BRIGHT, fontWeight: 700, marginTop: 1 }}>✓</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>The Field Report</div>
                            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>Your network landscape — who's in it and what it's worth.</div>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { const el = document.getElementById("upload-zone"); if (el) el.scrollIntoView({ behavior: "smooth" }); }} style={{ marginTop: "auto", padding: "12px 24px", background: "transparent", border: `1px solid ${BLUE_BRIGHT}`, color: BLUE_BRIGHT, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                        Start Free →
                      </button>
                    </div>

                    {/* Explorer card */}
                    <div style={{ background: `linear-gradient(160deg, #1a1200 0%, ${DARK_CARD} 100%)`, border: `1px solid #C9A84C66`, borderRadius: 16, padding: 28, textAlign: "left", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "#C9A84C33", color: "#C9A84C", marginBottom: 16 }}>EXPLORER</div>
                      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif", color: WHITE, marginBottom: 4 }}>$79</div>
                      <div style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>1 report credit</div>
                      <div style={{ borderTop: `1px solid #C9A84C33`, paddingTop: 20, marginBottom: 24, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ color: "#C9A84C", fontWeight: 700, marginTop: 1 }}>✓</span>
                          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>1 full run of the 4-report bundle — Warm List, Hidden Nuggets, Inbound, and Outbound.</div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ color: MUTED, fontWeight: 700, marginTop: 1 }}>–</span>
                          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>Gold Nugget not included</div>
                        </div>
                      </div>
                      <a href="https://buy.stripe.com/test_4gM5kE9MV6GG0iD3kJ6kg00" target="_blank" rel="noopener noreferrer" style={{ marginTop: "auto", padding: "12px 24px", background: `linear-gradient(135deg, #C9A84C, #E8C97A)`, border: "none", color: "#0d2d6b", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "center", textDecoration: "none", display: "block" }}>
                        Get Explorer →
                      </a>
                    </div>

                    {/* Connector card */}
                    <div style={{ background: `linear-gradient(160deg, #1a1200 0%, ${DARK_CARD} 100%)`, border: `1px solid #C9A84C`, borderRadius: 16, padding: 28, textAlign: "left", display: "flex", flexDirection: "column", position: "relative" }}>
                      <div style={{ position: "absolute", top: -12, right: 20, background: "#C9A84C", color: "#0d2d6b", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "4px 10px", borderRadius: 4 }}>MOST POPULAR</div>
                      <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "#C9A84C33", color: "#C9A84C", marginBottom: 16 }}>CONNECTOR</div>
                      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif", color: WHITE, marginBottom: 4 }}>$207</div>
                      <div style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>3 report credits — $69 each</div>
                      <div style={{ borderTop: `1px solid #C9A84C33`, paddingTop: 20, marginBottom: 24, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ color: "#C9A84C", fontWeight: 700, marginTop: 1 }}>✓</span>
                          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>3 full runs of the 5-report bundle.</div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ color: "#C9A84C", fontWeight: 700, marginTop: 1 }}>✓</span>
                          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>Gold Nugget included on every run — your business development work, done for you.</div>
                        </div>
                      </div>
                      <a href="https://buy.stripe.com/test_cNi4gA5wFe982qLcVj6kg01" target="_blank" rel="noopener noreferrer" style={{ marginTop: "auto", padding: "12px 24px", background: `linear-gradient(135deg, #C9A84C, #E8C97A)`, border: "none", color: "#0d2d6b", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "center", textDecoration: "none", display: "block" }}>
                        Get Connector →
                      </a>
                    </div>

                    {/* Closer card */}
                    <div style={{ background: `linear-gradient(160deg, #1a1200 0%, ${DARK_CARD} 100%)`, border: `1px solid #C9A84C66`, borderRadius: 16, padding: 28, textAlign: "left", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "#C9A84C33", color: "#C9A84C", marginBottom: 16 }}>CLOSER</div>
                      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif", color: WHITE, marginBottom: 4 }}>$294</div>
                      <div style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>6 report credits — $49 each</div>
                      <div style={{ borderTop: `1px solid #C9A84C33`, paddingTop: 20, marginBottom: 24, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ color: "#C9A84C", fontWeight: 700, marginTop: 1 }}>✓</span>
                          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>6 full runs of the 5-report bundle — plenty of room to rerun as your network changes.</div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ color: "#C9A84C", fontWeight: 700, marginTop: 1 }}>✓</span>
                          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>Gold Nugget included on every run — your business development work, done for you.</div>
                        </div>
                      </div>
                      <a href="https://buy.stripe.com/test_9B67sMf7f0iid5p8F36kg02" target="_blank" rel="noopener noreferrer" style={{ marginTop: "auto", padding: "12px 24px", background: `linear-gradient(135deg, #C9A84C, #E8C97A)`, border: "none", color: "#0d2d6b", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "center", textDecoration: "none", display: "block" }}>
                        Get Closer →
                      </a>
                    </div>

                  </div>
                  <p style={{ fontSize: 12, color: MUTED, marginTop: 20 }}>Credits expire 18 months from purchase. No subscription, no auto-renewal.</p>
                  <p style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>Each report can be regenerated up to 3 times per run.</p>
                </div>
              </div>
              
              <Divider />

              {/* ── Anna section ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 48, alignItems: "start", marginBottom: 40 }}>
                <div style={{ borderRadius: 16, overflow: "hidden", position: "relative", border: `1px solid ${BORDER}` }}>
                  <img src={ANNA_PHOTO} alt="Anna Ludwinowski" style={{ width: "100%", display: "block" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(10,22,40,0.92))", padding: "32px 16px 18px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: WHITE, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Anna Ludwinowski</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>Founder, Nugget™</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: BLUE_BRIGHT, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>The human behind it</div>
                  <h2 style={{ fontSize: 28, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 20, lineHeight: 1.2 }}>Hi, I'm Anna.</h2>
                  <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.8, marginBottom: 16 }}>
                    I'm a founder with 33 years of business experience — and I've lived every bizdev challenge in my career personally. The cold leads. The missed opportunities. The warm network sitting right there, completely untouched.
                  </p>
                  <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.8, marginBottom: 16 }}>
                    I still see it today with my Clients as a Business Strategist. Smart, capable Founders leaving money behind not because they don't know how to sell — but because they don't know how to use the data they already have.
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
                
                <button style={{ ...primaryBtn, fontSize: 17, padding: "16px 44px", animation: "pulseCTA 2.5s ease-in-out infinite", marginTop: 24 }} onClick={scrollToUpload}>
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
            <div className="print-hide-sidebar" style={{ background: DARK_CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden", position: "sticky", top: 80 }}>
              {REPORTS.map(r => {
                                let statusText;
                if (r.computed) {
                  statusText = "⚡ Ready";
                } else if (!r.free && !isBeta) {
                  statusText = "🔒 Upgrade to unlock";
                } else if (r.id === "gold" && isBeta) {
                  if (generating === "gold")   statusText = "⏳ Generating...";
                  else if (reports.gold)        statusText = "✓ Complete";
                  else if (freeReportsComplete) statusText = "✦ Ready to generate";
                  else                          statusText = "Complete your reports first";
                } else {
                  if (generating === r.id)  statusText = `⏳ Generating...`;
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
            <div className="print-report-panel" style={{ background: DARK_CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 32, minHeight: 420 }}>

              {/* Print-only header */}
              <div className="print-header" style={{ display: "none", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #0d2d6b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#0d2d6b", fontFamily: "Georgia, serif" }}>Nugget™</div>
                  <div style={{ fontSize: 11, color: "#666", letterSpacing: "0.06em" }}>getnugget.ca</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0d2d6b", marginTop: 8, fontFamily: "Georgia, serif" }}>{activeReportMeta?.name}</div>
                <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{activeReportMeta?.subtitle}</div>
              </div>
              {error && <div style={{ background: "#1a0a0a", border: "1px solid #8B0000", borderRadius: 8, padding: "12px 16px", color: "#ff8080", fontSize: 13, marginBottom: 16 }}>{error}</div>}

              {reports[activeReport] && activeReport !== "gold" || (activeReport === "gold" && reports.gold) ? (
                <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <button onClick={() => window.print()} style={{ padding: "7px 18px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, border: "none", color: WHITE, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>↓</span> Save as PDF
                  </button>
                </div>
              ) : null}

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
                      <div style={{ color: MUTED, fontSize: 14 }}>
    {retryMessage || "Mining your data for gold..."}
</div>
                    </div>
                  ) : reports.gold ? (
                    <><IntroBlock reportId="gold" /><ReportContent text={reports.gold} /></>
                  ) : freeReportsComplete ? (
                    <div style={{ textAlign: "center", padding: "48px 32px" }}>
                      <div style={{ fontSize: 44, marginBottom: 16, fontFamily: "Georgia, serif", background: `linear-gradient(90deg, #E8A000, #f5c842)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>GN</div>
                      <div style={{ fontSize: 22, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, marginBottom: 10 }}>You've mined all 5 reports.</div>
                      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 28px" }}>Ready to see how it all adds up?</p>
                      <button style={{ padding: "12px 32px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }} onClick={generateGoldNugget}>
                        Unlock Your BizDev Readiness Score →
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "60px 32px" }}>
                      <div style={{ fontSize: 38, marginBottom: 14, fontFamily: "Georgia, serif", background: `linear-gradient(90deg, #E8A000, #f5c842)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>GN</div>
                      <div style={{ fontSize: 16, color: WHITE, fontWeight: 600, marginBottom: 8 }}>Complete your 5 free reports first</div>
                      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>Generate all 5 reports to unlock your BizDev Readiness Score.</p>
                    </div>
                  )}
                </>
              )}

                            {/* Free report panels */}
              {activeReport === "lineup" ? (
                <>
                  <LineUpReport connections={parsedData["Connections"] || []} />
                  {!isBeta && (
                    <UpgradeCTA text="You've sorted your network by role. The Warm List sorts it by opportunity." />
                  )}
                </>
              ) : activeReport !== "gold" && (
                <>
                  {generating === activeReport ? (
                    <div style={{ textAlign: "center", padding: "60px 32px" }}>
                      <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTop: `3px solid ${BLUE_BRIGHT}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                      <div style={{ color: MUTED, fontSize: 14 }}>
    {retryMessage || "Mining your data for gold..."}
</div>
                    </div>
                  ) : reports[activeReport] ? (
                    <>
                      <IntroBlock reportId={activeReport} />
                      {activeReport === "warm" && !isBeta ? (
                        <div style={{ position: "relative" }}>
                          <div style={{ maxHeight: 420, overflow: "hidden", position: "relative" }}>
                            <ReportContent text={reports[activeReport]} />
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 180, background: `linear-gradient(to bottom, transparent, ${DARK_CARD})` }} />
                          </div>
                          <div style={{ textAlign: "center", padding: "28px 24px", background: DARK_CARD, borderTop: `1px solid ${BORDER}`, borderRadius: "0 0 12px 12px" }}>
                            <div style={{ fontSize: 18, marginBottom: 8 }}>🔒</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, fontFamily: "Georgia, serif", marginBottom: 6 }}>Your full Warm List is waiting.</div>
                            <p style={{ fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 1.6 }}>Unlock Gold to see every warm contact — ranked, ready, and worth reaching out to.</p>
                            <a href="https://buy.stripe.com/3cIcN64sBd54d5pf3r6kg0b" target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "12px 28px", background: `linear-gradient(135deg, #C9A84C, #f5c842)`, color: "#0a1628", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Unlock Gold — $29/month →</a>
                          </div>
                        </div>
                                            ) : (
                        <>
                          <ReportContent text={reports[activeReport]} />
                          {activeReport === "field" && !isBeta && (
                            <UpgradeCTA text="This shows you what's in your network. The Warm List tells you who to reach out to first, and why." />
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "60px 32px" }}>
                      <div style={{ fontSize: 38, marginBottom: 14 }}>📊</div>
                      <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>This report hasn't been generated yet.</div>
                      <button style={{ padding: "10px 24px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer" }} onClick={() => runReport(activeReport)} disabled={!!generating}>
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

      {/* ── ICP Capture modal ── */}
      {showICPModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(2,8,18,0.97)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: `linear-gradient(160deg, #0f2040 0%, #0a1628 100%)`, border: `1px solid ${BLUE_BRIGHT}66`, borderRadius: 20, padding: "44px 52px", maxWidth: 580, width: "100%", boxShadow: `0 0 80px rgba(65,161,232,0.15), 0 24px 60px rgba(0,0,0,0.8)`, animation: "fadeIn 0.2s ease-out" }}>
            <h2 style={{ fontSize: 22, fontFamily: "Georgia, serif", fontWeight: 700, color: WHITE, textAlign: "center", marginBottom: 14, lineHeight: 1.4 }}>One quick thing before I mine your <span style={{ whiteSpace: "nowrap" }}>data.</span></h2>
            <p style={{ fontSize: 14, color: MUTED, textAlign: "center", marginBottom: 36, lineHeight: 1.6 }}>Tell us who you actually sell to — it sharpens every report that follows.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 26, marginBottom: 30 }}>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Who's your Ideal Client?</label>
                <textarea
                  placeholder="e.g. Series A SaaS founders with 10-50 employees"
                  value={icpClient}
                  onChange={e => setICPClient(e.target.value)}
                  maxLength={300}
                  rows={2}
                  style={{ width: "100%", padding: "12px 16px", background: "#0a1628", border: `1px solid ${BLUE_BRIGHT}44`, borderRadius: 8, color: WHITE, fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
                />
                <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>A sentence or two is plenty — specific beats exhaustive.</div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>What problem do you solve for them?</label>
                <textarea
                  placeholder="e.g. They're scaling fast and their finance function hasn't caught up"
                  value={icpProblem}
                  onChange={e => setICPProblem(e.target.value)}
                  maxLength={300}
                  rows={2}
                  style={{ width: "100%", padding: "12px 16px", background: "#0a1628", border: `1px solid ${BLUE_BRIGHT}44`, borderRadius: 8, color: WHITE, fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
                />
                <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>A sentence or two is plenty — specific beats exhaustive.</div>
              </div>
            </div>
 <button onClick={submitICP} disabled={!icpClient.trim() || !icpProblem.trim()} style={{ width: "100%", padding: "15px 24px", background: `linear-gradient(135deg, ${BLUE_MID}, ${BLUE_BRIGHT})`, border: "none", borderRadius: 10, color: WHITE, fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", cursor: (!icpClient.trim() || !icpProblem.trim()) ? "not-allowed" : "pointer", fontFamily: "Georgia, serif", marginBottom: 20, opacity: (!icpClient.trim() || !icpProblem.trim()) ? 0.5 : 1 }}>
              Mine My Reports →
            </button>
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 18 }}>
              <p style={{ fontSize: 11, color: MUTED, textAlign: "center", lineHeight: 1.6 }}>
                One more thing: Nugget reads your LinkedIn <strong style={{ color: WHITE }}>Connections</strong> — not your Followers. Those are two different numbers on LinkedIn, and Connections is the one that matters here.
              </p>
            </div>
          </div>
        </div>
      )}

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
      <footer style={{ borderTop: `1px solid ${BORDER}`, background: DARK_CARD, padding: "20px 40px", textAlign: "center", marginTop: 40 }}>
  <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
    © 2025 Nugget™ &nbsp;·&nbsp;
    <a href="/privacy.html" style={{ color: BLUE_BRIGHT, textDecoration: "none" }}>Privacy Policy</a> &nbsp;·&nbsp;
<a href="/terms.html" style={{ color: BLUE_BRIGHT, textDecoration: "none" }}>Terms of Service</a> &nbsp;·&nbsp;
<a href="mailto:hello@annaludwinowski.com" style={{ color: BLUE_BRIGHT, textDecoration: "none" }}>hello@annaludwinowski.com</a>
  </p>
</footer>
    </div>
  );
}
