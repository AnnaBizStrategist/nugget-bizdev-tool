// FILE LOCATION IN GITHUB: src/onboarding/questions.js
//
// Single source of truth for the Nugget onboarding questions, the scorecard
// copy, and the scoring rules. No UI in here. Bump QUESTIONS_VERSION whenever
// a question or statement is reworded; it is saved with every set of answers.

export const QUESTIONS_VERSION = 1

// CLEAR order. Also the tie-break order for "Fix first".
export const PILLARS = [
  { key: "clients", label: "Clients", questionId: "clients" },
  { key: "offers", label: "Offers", questionId: "offers" },
  { key: "pricing", label: "Pricing", questionId: "pricing" },
  { key: "positioning", label: "Positioning", questionId: "positioning" },
  { key: "messaging", label: "Messaging", questionId: "messaging" },
]

// ---------------------------------------------------------------------------
// The 13 questions, in order.
// type: "typed" (free text), "tap" (pick one option), "statement" (pick one of
// five statements; the value saved is the level, 1 to 5).
// group: label for the progress bar.
// ---------------------------------------------------------------------------
export const QUESTIONS = [
  { id: "what_you_do", group: "About you", type: "typed", maxLength: 200,
    prompt: `What do you do?`, hint: `One line is plenty.` },

  { id: "years", group: "About you", type: "tap",
    prompt: `How long have you been in business?`,
    options: [`Less than a year`, `1 to 3 years`, `3 to 5 years`, `5 to 10 years`, `10+ years`] },

  { id: "clients", group: "Clients", type: "statement", pillar: "clients",
    prompt: `Which of these sounds most like your business right now?` }, // TODO: swap in your FA stem

  { id: "ideal_client", group: "Clients", type: "typed", maxLength: 300,
    prompt: `Who's your ideal client?` },

  { id: "client_problem", group: "Clients", type: "typed", maxLength: 400,
    prompt: `What problem do you solve for them?` },

  { id: "offers", group: "Offers", type: "statement", pillar: "offers",
    prompt: `Which of these sounds most like your business right now?` }, // TODO: swap in your FA stem

  { id: "offers_trip", group: "Offers", type: "tap",
    prompt: `Where does it trip you up most?`,
    options: [`I'm constantly explaining what I offer`, `Everything is custom for every client`,
              `People don't know where to start`, `There's nothing next after they finish`] },

  { id: "pricing", group: "Pricing", type: "statement", pillar: "pricing",
    prompt: `Which of these sounds most like your business right now?` }, // TODO: swap in your FA stem

  { id: "price_pushback", group: "Pricing", type: "tap",
    prompt: `When a prospect pushes back on price, I usually...`,
    options: [`Hold my price`, `Discount or add extras`, `Avoid price until the last minute`,
              `Hold firm but second-guess myself`] },

  { id: "positioning", group: "Positioning", type: "statement", pillar: "positioning",
    prompt: `Which of these sounds most like your business right now?` }, // TODO: swap in your FA stem

  { id: "why_chose_you", group: "Positioning", type: "typed", maxLength: 500,
    prompt: `If I called one of your best clients and asked why they chose you over someone else who does exactly what you do, what would they say?` },

  { id: "messaging", group: "Messaging", type: "statement", pillar: "messaging",
    prompt: `Which of these sounds most like your business right now?` }, // TODO: swap in your FA stem

  { id: "hardest_part", group: "Messaging", type: "tap",
    prompt: `Where does it feel hardest? Pick the hardest one.`,
    options: [`LinkedIn posts`, `Pitching`, `Networking`, `My website or LinkedIn profile`] },
]

// ---------------------------------------------------------------------------
// Scorecard copy, straight from the "Nugget Foundation Scorecard Copy" doc.
// levels[n-1]  = the statement they pick + the description under the bar.
// actions[n-1] = the "one action this week" (levels 1 to 4 only).
// ---------------------------------------------------------------------------
export const PILLAR_CONTENT = {
  clients: {
    levels: [
      { pick: `I take anyone who will pay me`, description: `You're saying yes to everyone, which means no one knows you're the go-to for them.` },
      { pick: `General niche, still saying yes to poor fits`, description: `You know your lane, but the poor-fit projects are eating the time your best clients deserve.` },
      { pick: `Know who I serve, can't name their hair-on-fire problem`, description: `You know who you serve. The next step is naming the problem that keeps them up at night.` },
      { pick: `Clear ideal client, marketing directly to them`, description: `Strong. You know who you serve and you're talking straight to them.` },
      { pick: `Category of One`, description: `You own your space. Clients find you because there's no one quite like you.` },
    ],
    actions: [
      { title: `Find your best three`, action: `List your three favourite clients ever. Write down what they had in common: their situation, their problem, how they found you. That's the start of your ideal client.` },
      { title: `Write your "not for me" list`, action: `Write down three signs a project isn't a fit. The next time one shows up, refer it out instead of saying yes.` },
      { title: `Name the hair-on-fire problem`, action: `Look back at your last three sales calls or DMs. Write down the exact words clients used to describe their problem before they hired you. Use their words, not yours.` },
      { title: `Sharpen it to one sentence`, action: `Finish this sentence: "I help [who] who are struggling with [problem] so they can [result]." Read it out loud. If it takes more than one breath, cut it.` },
    ],
  },

  offers: {
    levels: [
      { pick: `No set offers, custom work for everyone`, description: `You're reinventing the wheel for every client, and that's exhausting to sell and to deliver.` },
      { pick: `Lots of offers, cluttered and messy`, description: `You've got plenty to offer, but too many choices can leave people choosing nothing.` },
      { pick: `Signature offer, no easy way to start small or go big`, description: `Solid core offer. What's missing is an easy way in and a clear next step up.` },
      { pick: `Tiers, but confusing to explain`, description: `Your tiers are there. They just need to explain themselves without you in the room.` },
      { pick: `Clear Offer Ladder`, description: `Your offers flow. People can see exactly where to start and where to go next.` },
    ],
    actions: [
      { title: `Spot your repeat request`, action: `Look at your last five projects. Find the thing you did in almost all of them. That's the seed of your first set offer. Give it a name and a price.` },
      { title: `Pick your hero`, action: `Choose the one offer you'd happily sell every day. Make it the star everywhere you talk about your work, and move the rest to "ask me about".` },
      { title: `Build the front door`, action: `Create one small, low-risk way to work with you: a session, an audit or a workshop. It should lead naturally into your signature offer.` },
      { title: `The one-line test`, action: `Write each tier as one line: who it's for and what they walk away with. If two tiers sound the same, merge them.` },
    ],
  },

  pricing: {
    levels: [
      { pick: `Pricing feels like a guessing game`, description: `Every quote feels like a gamble, and that uncertainty shows up in the conversation.` },
      { pick: `Hourly or value, but undercharging`, description: `Your biggest opportunity. You're leaving money on the table.` },
      { pick: `Charge what everyone else does`, description: `Your price matches the market, not the value you deliver.` },
      { pick: `Confident, occasional bargain hunter`, description: `You're confident in your rates. A few tweaks will keep the bargain hunters away.` },
      { pick: `Value-based, premium signal`, description: `Your pricing works for you. It tells people you're the premium choice before you say a word.` },
    ],
    actions: [
      { title: `Find your floor`, action: `Work out the lowest price you can take on a project and still be glad you said yes. Count your hours, costs and the value of your time. Never quote below it.` },
      { title: `Write your "price, then outcomes" line`, action: `Write down the price of your main offer and the three outcomes it delivers. Next time someone pushes back, walk them through the outcomes before you even think about a discount.` },
      { title: `Price the result, not the hours`, action: `Pick one offer. Write down what it's worth to your client in money saved, earned or stress removed. Set your next quote against that, not against your competitors.` },
      { title: `Qualify before you quote`, action: `Add one question before you share pricing, like "What's this problem costing you right now?" Bargain hunters tend to filter themselves out.` },
    ],
  },

  positioning: {
    levels: [
      { pick: `Sound like everyone else`, description: `Right now you blend in, so clients compare you on price instead of on you.` },
      { pick: `Know what's different, not getting attention`, description: `You know what makes you different. It just isn't landing loudly enough yet.` },
      { pick: `Known for what I do, haven't owned a lane`, description: `Known for what you do, but not owning a lane yet.` },
      { pick: `Strong, still justifying price vs. competitors`, description: `Strong positioning. Make the difference obvious and the price conversations get shorter.` },
      { pick: `Completely own my lane`, description: `You own your lane. People come to you for you, not for a service.` },
    ],
    actions: [
      { title: `Ask your favourite client`, action: `Ask one great client: "Why did you pick me over anyone else?" Write down their exact words. That's your difference, and it's probably not what you'd guess.` },
      { title: `Say it with a spine`, action: `Take what makes you different and turn it into a point of view you'd defend, like "Most people do X. I think that's backwards, here's why."` },
      { title: `Claim one lane`, action: `Pick the one client type or problem you'd most like to be known for. For the next month, make every post and intro point to it.` },
      { title: `Show the difference`, action: `Write down three things clients get with you that they won't get elsewhere. Put them in front of every proposal, before the price.` },
    ],
  },

  messaging: {
    levels: [
      { pick: `People ask "So what do you actually do?"`, description: `People are working too hard to understand what you do, and confused people don't buy.` },
      { pick: `Professional but vague and safe`, description: `Your messaging is polished, but playing it safe makes it easy to forget.` },
      { pick: `Clear, but about me not them`, description: `Clear, but still more about you than about them.` },
      { pick: `Good on problem and result, path to work with me unclear`, description: `You nail the problem and the result. Now show people the path to working with you.` },
      { pick: `Silent salesperson`, description: `Your message pre-sells you before you ever get on a call.` },
    ],
    actions: [
      { title: `The 10-second test`, action: `Write what you do in one simple sentence. Try it on a friend outside your industry. If they ask a follow-up question, keep going until they don't.` },
      { title: `Trade safe for specific`, action: `Find one "safe" phrase on your profile, like "helping businesses grow". Replace it with something specific: who, what problem, what result.` },
      { title: `Flip the "I" to "you"`, action: `Read your LinkedIn About section and count the sentences starting with "I". Rewrite three of them to start with your client's problem instead.` },
      { title: `Map the path`, action: `Write the three steps someone takes to work with you, from first chat to signed client. Add them to your profile and your proposals.` },
    ],
  },
}

export const SUMMARY_LINES = [
  { min: 20, max: 39, text: `You've got the expertise. The foundation underneath it needs some work, and that's good news, because it's the most fixable thing in your business. Start with the one gap below.` },
  { min: 40, max: 59, text: `Some pieces are working, others are making you work harder than you should. Close the biggest gap first and the rest gets easier.` },
  { min: 60, max: 79, text: `A solid base with one clear gap. Close it and every conversation Nugget finds gets easier to turn into a client.` },
  { min: 80, max: 99, text: `Your foundation is strong. One small tune-up and you'll be walking into every conversation ready to close.` },
  { min: 100, max: 100, text: `Rock solid. Your foundation is doing the heavy lifting, so now it's all about having the right conversations.` },
]

export const ALL_FIVES = {
  title: `Your foundation is rock solid`,
  body: `Not much to fix here, and that's rare so savour the moment! Your one action this week is the fun one: pick five people from your Nugget reports and start the conversation. Your foundation will do the rest.`,
}

// ---------------------------------------------------------------------------
// Scoring. answers = { clients: 4, offers: 2, ... } (statement levels, 1 to 5).
// Pillar = level x 4 (out of 20). Overall = sum (out of 100).
// Fix first = lowest pillar; ties go in CLEAR order. All 5s = no Fix first.
// Returns null if any of the five statements is missing or invalid.
// ---------------------------------------------------------------------------
export function scoreAnswers(answers) {
  const pillarScores = {}
  let overall = 0

  for (const p of PILLARS) {
    const level = Number(answers && answers[p.questionId])
    if (!Number.isInteger(level) || level < 1 || level > 5) return null
    pillarScores[p.key] = level * 4
    overall += level * 4
  }

  const allFives = PILLARS.every((p) => pillarScores[p.key] === 20)

  let lowestPillar = null
  if (!allFives) {
    // Strict "<" means the first pillar in CLEAR order wins a tie.
    lowestPillar = PILLARS.reduce(
      (low, p) => (pillarScores[p.key] < pillarScores[low.key] ? p : low),
      PILLARS[0]
    ).key
  }

  return { pillarScores, overall, lowestPillar, allFives }
}

// Everything the scorecard screen (and the signup email) needs, in one object.
export function buildScorecard(answers) {
  const scored = scoreAnswers(answers)
  if (!scored) return null

  const pillars = PILLARS.map((p) => {
    const level = Number(answers[p.questionId])
    const content = PILLAR_CONTENT[p.key].levels[level - 1]
    return {
      key: p.key,
      label: p.label,
      level,
      score: scored.pillarScores[p.key],
      pick: content.pick,
      description: content.description,
    }
  })

  let fixFirst = null
  if (scored.lowestPillar) {
    const p = pillars.find((x) => x.key === scored.lowestPillar)
    const action = PILLAR_CONTENT[p.key].actions[p.level - 1]
    fixFirst = { key: p.key, label: p.label, level: p.level, title: action.title, action: action.action }
  }

  const summary = SUMMARY_LINES.find((s) => scored.overall >= s.min && scored.overall <= s.max)

  return {
    overall: scored.overall,
    summary: summary ? summary.text : "",
    pillars,
    fixFirst,
    allFives: scored.allFives ? ALL_FIVES : null,
    lowestPillar: scored.lowestPillar,
    pillarScores: scored.pillarScores,
  }
}
