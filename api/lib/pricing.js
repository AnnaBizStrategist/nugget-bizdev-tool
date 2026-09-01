// FILE LOCATION IN GITHUB: api/lib/pricing.js
//
// Central definition of Nugget's credit-pack tiers.
// Reused by the gating logic now (Session 6), and by the Stripe integration
// (Sessions 2-4) when that gets built.
//
// Founder pricing is the ONLY pricing that exists right now — there is no
// "standard" price yet. When Anna eventually raises prices, add a
// `standardPricePerReport` / `standardTotalPrice` field per tier here, and
// branch on the user's `founder_pricing_locked` flag (or, for a brand-new
// user, on whether today is before FOUNDER_CUTOFF_DATE) to decide which
// price to show/charge. Nothing below assumes that work is done yet.

export const FOUNDER_CUTOFF_DATE = "2026-10-09";

export const TIERS = {
  explorer: {
    name: "Explorer",
    credits: 1,
    pricePerReport: 79,
    totalPrice: 79,
    includesGN: false,
    stripePriceId: "price_1U04xCJs9mPzeO99JSccQkmc",
  },
  connector: {
    name: "Connector",
    credits: 3,
    pricePerReport: 69,
    totalPrice: 207,
    includesGN: true,
    stripePriceId: "price_1U05G3Js9mPzeO99KTnfBHtt",
  },
  closer: {
    name: "Closer",
    credits: 5,
    pricePerReport: 59,
    totalPrice: 295,
    includesGN: true,
    stripePriceId: "price_1U05I3Js9mPzeO99nztrtHKL",
  },
  rainmaker: {
    name: "Rainmaker",
    credits: 12,
    pricePerReport: null, // TBD - not sold yet, reserved name only
    totalPrice: null,
    includesGN: true,
    notSoldYet: true,
  },
};

// Tiers a user can actually buy today (Rainmaker is reserved for later).
export function getPurchasableTiers() {
  return Object.entries(TIERS)
    .filter(([, tier]) => !tier.notSoldYet)
    .map(([key, tier]) => ({ key, ...tier }));
}

// Report types that make up one complete "run." A run is done once all of
// these have been generated at least once against a given batch — at which
// point the next generate starts a fresh run and spends the next credit.
// Explorer excludes "gold" since it doesn't include GN; every other tier
// includes it.
export const REQUIRED_REPORT_TYPES = {
  explorer: ["warm", "hidden", "inbound", "outbound"],
  connector: ["warm", "hidden", "inbound", "outbound", "gold"],
  closer: ["warm", "hidden", "inbound", "outbound", "gold"],
  rainmaker: ["warm", "hidden", "inbound", "outbound", "gold"],
};

// Max total generations of the same report type within one open run.
// Set to 1 (Aug 2026): no free regenerations — once a report type has
// been generated, that's the only copy. Getting it again means starting
// a new run and spending another credit. (Not 0 — the check in
// consumeCredit() is pre-increment, so 0 would block the very first
// generation too.)
export const MAX_REGENS_PER_REPORT = 1;
