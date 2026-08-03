// FILE LOCATION IN GITHUB: api/lib/gating.js
//
// Session 6 + Session 7 credit-gating rules.
//
// A credit_batches row represents a PURCHASE — it can grant more than one
// "run" (Explorer=1 run, Connector=3 runs, Closer=6 runs). A run is a full
// bundle: Warm List + Hidden Nuggets + Inbound + Outbound, plus Gold Nugget
// for tiers that include it. One credit is spent the moment a user starts a
// fresh run (generates the first report type in an empty run), not per
// individual report. Regenerating a report type already generated in the
// CURRENT open run is free, up to MAX_REGENS_PER_REPORT times — after that,
// it's blocked until the run completes and a new one starts.
//
// getCreditStatus(email) is read-only: finds the oldest non-expired batch
// that's either got fresh credits available OR has an in-progress run on it
// (even if credits_remaining is 0 for that specific batch, since the credit
// for an in-progress run was already committed when it started).
//
// consumeCredit(...) should only be called after a report has actually
// finished generating successfully. It returns { ok: false, reason: ... }
// for the expected "can't do this" cases (out of credits, regen cap hit)
// rather than throwing, so callers can respond cleanly instead of 500ing.

import { createClient } from "@supabase/supabase-js";
import { getPurchasableTiers, REQUIRED_REPORT_TYPES, MAX_REGENS_PER_REPORT } from "./pricing.js";

// Same service-role pattern as api/register.js — bypasses RLS.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Look up a user's id by email. Returns null if no user row exists yet.
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
 *   { canRun: true, batchId, tierName, includesGN, creditsRemainingInBatch, activeRunReports }
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
      "id, tier_name, credits_remaining, includes_gn, expiration_date, purchase_date, active_run_reports"
    )
    .eq("user_id", userId)
    .gte("expiration_date", today)
    .order("purchase_date", { ascending: true })
    .order("id", { ascending: true }); // stable tiebreaker for same-day purchases

  if (error) throw error;

  // A batch is usable if it has fresh credits available, OR it already has
  // an in-progress run on it (credits_remaining may be 0 for that batch
  // specifically, because the credit for the in-progress run was already
  // committed when the run started — it still needs to be finished).
  const usable = (batches || []).find((b) => {
    const activeRunReports = b.active_run_reports || {};
    return b.credits_remaining > 0 || Object.keys(activeRunReports).length > 0;
  });

  if (!usable) {
    return {
      canRun: false,
      reason: "no_credits",
      purchaseOptions: getPurchasableTiers(),
    };
  }

  return {
    canRun: true,
    batchId: usable.id,
    tierName: usable.tier_name,
    includesGN: usable.includes_gn,
    creditsRemainingInBatch: usable.credits_remaining,
    activeRunReports: usable.active_run_reports || {},
  };
}

/**
 * Call ONLY after a report has successfully generated. Handles:
 *   - starting a fresh run (spends 1 credit, first report type this run)
 *   - continuing an open run (free, new report type this run)
 *   - regenerating a report type already done this run (free, up to the cap)
 *   - completing a run (all required types done — resets for the next run)
 *
 * Returns { ok: true, creditsRemaining, activeRunReports, runCompleted }
 * or { ok: false, reason: "no_credits" | "regen_cap_reached" } for the
 * expected "can't do this" cases — does not throw for those.
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
    .select("credits_remaining, active_run_reports, tier_name")
    .eq("id", batchId)
    .single();

  if (fetchError) throw fetchError;
  if (!batch) throw new Error("Batch not found");

  const activeRunReports = batch.active_run_reports || {};
  const currentCount = activeRunReports[reportTypeMetadata] || 0;

  if (currentCount >= MAX_REGENS_PER_REPORT) {
    return { ok: false, reason: "regen_cap_reached" };
  }

  const isStartOfNewRun = Object.keys(activeRunReports).length === 0;

  if (isStartOfNewRun && batch.credits_remaining < 1) {
    return { ok: false, reason: "no_credits" };
  }

  const updatedActiveRunReports = {
    ...activeRunReports,
    [reportTypeMetadata]: currentCount + 1,
  };

  const requiredTypes = REQUIRED_REPORT_TYPES[batch.tier_name] || [];
  const runCompleted =
    requiredTypes.length > 0 &&
    requiredTypes.every((t) => updatedActiveRunReports[t]);

  const finalActiveRunReports = runCompleted ? {} : updatedActiveRunReports;
  const newCreditsRemaining = isStartOfNewRun
    ? batch.credits_remaining - 1
    : batch.credits_remaining;

  const { error: updateError } = await supabaseAdmin
    .from("credit_batches")
    .update({
      credits_remaining: newCreditsRemaining,
      active_run_reports: finalActiveRunReports,
    })
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

  return {
    ok: true,
    creditsRemaining: newCreditsRemaining,
    activeRunReports: finalActiveRunReports,
    runCompleted,
  };
}
