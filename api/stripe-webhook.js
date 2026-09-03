// FILE LOCATION IN GITHUB: api/stripe-webhook.js
//
// Stripe calls this URL automatically whenever a checkout completes. On a
// successful one-time payment, this creates a credit_batches row (the
// gating logic from Session 6 reads from that table) and, if this is the
// user's first-ever purchase and it happened before the founder pricing
// cutoff, flags them as founder-priced forever.
//
// This isn't wired up to anything yet — Session 4 adds the Stripe keys to
// Vercel and registers this URL as a webhook endpoint inside Stripe. Until
// that's done, this file just sits here unused, which is safe.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { TIERS, FOUNDER_CUTOFF_DATE } from "./lib/pricing.js";

// Tells Vercel not to auto-parse the request body as JSON. Stripe's
// signature check needs the raw, untouched bytes of the request.
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reads the raw request body as a Buffer - needed for Stripe's signature
// check. Written by hand instead of pulling in another npm package.
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Given a Stripe Price ID (e.g. "price_1U04x..."), find which of our tiers
// (explorer/connector/closer) it belongs to.
function findTierByPriceId(priceId) {
  const entry = Object.entries(TIERS).find(
    ([, tier]) => tier.stripePriceId === priceId
  );
  return entry ? { key: entry[0], ...entry[1] } : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  // Only act on completed checkouts - ignore every other event type Stripe
  // might send to this same endpoint.
  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true, ignored: event.type });
  }

  const session = event.data.object;

  try {
        const rawEmail = session.customer_details?.email || session.customer_email;
    if (!rawEmail) {
      console.error("Checkout session has no email attached:", session.id);
      return res.status(400).json({ error: "No email on checkout session" });
    }
    const email = rawEmail.trim().toLowerCase();

    // Find which price was actually purchased.
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data?.[0]?.price?.id;
    const tier = findTierByPriceId(priceId);

    if (!tier) {
      console.error("Checkout used an unrecognized price:", priceId);
      return res.status(400).json({ error: "Unrecognized price ID" });
    }

    // Find or create the user. Should almost always already exist (everyone
    // registers before their first report - see Session 5), but handled
    // defensively in case someone reaches checkout without registering.
    let { data: user, error: userLookupError } = await supabaseAdmin
      .from("users")
      .select("id, founder_pricing_locked")
      .eq("email", email)
      .maybeSingle();

    if (userLookupError) throw userLookupError;

    if (!user) {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from("users")
        .insert({
          email,
          signup_date: new Date().toISOString().slice(0, 10),
          founder_pricing_locked: false,
        })
        .select("id, founder_pricing_locked")
        .single();

      if (createError) throw createError;
      user = newUser;
    }

    const purchaseDate = new Date();
    const expirationDate = new Date(purchaseDate);
    expirationDate.setMonth(expirationDate.getMonth() + 18);

    const { error: insertBatchError } = await supabaseAdmin
      .from("credit_batches")
      .insert({
        user_id: user.id,
        tier_name: tier.key,
        credits_granted: tier.credits,
        credits_remaining: tier.credits,
        includes_gn: tier.includesGN,
        price_paid: (session.amount_total ?? 0) / 100,
        purchase_date: purchaseDate.toISOString().slice(0, 10),
        expiration_date: expirationDate.toISOString().slice(0, 10),
        stripe_payment_id: session.id,
      });

    if (insertBatchError) throw insertBatchError;

    // Lock in founder pricing forever, but only the first time, and only if
    // this purchase happened before the cutoff.
    const today = purchaseDate.toISOString().slice(0, 10);
    if (!user.founder_pricing_locked && today < FOUNDER_CUTOFF_DATE) {
      const { error: lockError } = await supabaseAdmin
        .from("users")
        .update({ founder_pricing_locked: true })
        .eq("id", user.id);

      if (lockError) throw lockError;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Error processing checkout.session.completed:", err);
    return res.status(500).json({ error: "Internal error processing webhook" });
  }
}
