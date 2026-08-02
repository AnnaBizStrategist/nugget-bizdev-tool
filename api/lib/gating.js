// FILE LOCATION IN GITHUB: api/lib/gating.js
//
// Session 6: the credit-gating rules.
//
// Given a user (identified by email, since that's the key the frontend
// already has from the registration modal), figures out:
//   - can they run a report right now?
//   - if yes, which credit_batches row should the run draw from
//     (oldest non-expired batch with credits_remaining > 0 — FIFO)?
//   - does that batch include a Gold Nugget?
//   - if no, what can they buy?
//
// This module is READ-ONLY for the check (getCreditStatus). Decrementing a
// batch and logging the run happens in consumeCredit(), which should only
// be called after a report has actually finished generating successfully.
// Wiring consumeCredit() into the real report-generation flow (wherever
// runReport() in App.jsx currently lives) is Session 7's job, once that
// flow is being touched for the new paywall UI anyway — don't wire it in
// yet, just have it ready.

import { createClient } from "@supabase/supabase-js";
import { getPurchasableTiers } from "./pricing.js";

// Same service-role pattern as api/register.js — bypasses RLS.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Look up a user's id by email. Returns null if no user row exists yet.
 * Shouldn't normally happen — registration runs before any report — but
 * callers must handle it (e.g. someone hitting the API directly).
 */
export async function getUserIdByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

/**
 * The core rule. Returns one of:
 *   { canRun: true, batchId, tierName, includesGN, creditsRemainingInBatch }
 *   { canRun: false, reason: "no_such_user" }
 *   { canRun: false, reason: "no_credits", purchaseOptions: [...] }
 */
export async function getCreditStatus(email) {
  const userId = await getUserIdByEmail(email);

  if (!userId) {
    return { canRun: false, reason: "no_such_user" };
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: batches, error } = await supabaseAdmin
    .from("credit_batches")
    .select(
      "id, tier_name, credits_remaining, includes_gn, expiration_date, purchase_date"
    )
    .eq("user_id", userId)
    .gt("credits_remaining", 0)
    .gte("expiration_date", today)
    .order("purchase_date", { ascending: true }) // FIFO — oldest purchase first
    .limit(1);

  if (error) throw error;

  const batch = batches?.[0];

  if (!batch) {
    return {
      canRun: false,
      reason: "no_credits",
      purchaseOptions: getPurchasableTiers(),
    };
  }

  return {
    canRun: true,
    batchId: batch.id,
    tierName: batch.tier_name,
    includesGN: batch.includes_gn,
    creditsRemainingInBatch: batch.credits_remaining,
  };
}

/**
 * Call ONLY after a report has successfully generated. Decrements the
 * batch by 1 and writes the report_runs row (the "My Reports" history
 * source). Not wired into the app yet — see note above.
 *
 * NOTE: reportTitle / reportTypeMetadata param names are a best guess at
 * the report_runs columns per the master doc's schema notation
 * ("report_title / report_type_metadata"), which was ambiguous about
 * whether that's one column or two. Check your actual report_runs columns
 * in Supabase's Table editor and adjust the .insert() call below to match
 * before using this in Session 7.
 */
export async function consumeCredit({
  userId,
  batchId,
  includesGN,
  reportTitle,
  reportTypeMetadata,
}) {
  const { data: batch, error: fetchError } = await supabaseAdmin
    .from("credit_batches")
    .select("credits_remaining")
    .eq("id", batchId)
    .single();

  if (fetchError) throw fetchError;
  if (!batch || batch.credits_remaining < 1) {
    throw new Error(
      "Batch has no credits remaining — stale batchId or race condition"
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("credit_batches")
    .update({ credits_remaining: batch.credits_remaining - 1 })
    .eq("id", batchId);

  if (updateError) throw updateError;

  const { error: insertError } = await supabaseAdmin.from("report_runs").insert({
    user_id: userId,
    batch_id: batchId,
    run_date: new Date().toISOString(),
    included_gn: includesGN,
    report_title: reportTitle ?? null,
    report_type_metadata: reportTypeMetadata ?? null,
  });

  if (insertError) throw insertError;
}
