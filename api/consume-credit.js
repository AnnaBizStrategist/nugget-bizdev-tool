// FILE LOCATION IN GITHUB: api/consume-credit.js
//
// POST /api/consume-credit
// Body: { email, reportId, reportTitle }
//
// Called from the frontend right after a paid report finishes generating
// successfully. Re-derives the correct batch server-side via getCreditStatus
// (never trusts anything from the client except the email) and records the
// generation — spending a credit only if this starts a fresh run, logging a
// report_runs row either way. Session 7.

import { getUserIdByEmail, getCreditStatus, consumeCredit } from "./lib/gating.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, reportId, reportTitle } = req.body || {};

  if (!email || !reportId) {
    return res.status(400).json({ error: "Missing email or reportId" });
  }

  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) {
      return res.status(404).json({ error: "No such user" });
    }

    const status = await getCreditStatus(email);
    if (!status.canRun) {
      return res.status(402).json({ error: "No credits available", reason: status.reason });
    }

    const result = await consumeCredit({
      userId,
      batchId: status.batchId,
      includesGN: status.includesGN,
      reportTitle: reportTitle || null,
      reportTypeMetadata: reportId,
    });

    if (!result.ok) {
      const code = result.reason === "regen_cap_reached" ? 429 : 402;
      return res.status(code).json({ error: "Cannot record this generation", reason: result.reason });
    }

    const updatedStatus = await getCreditStatus(email);
    return res.status(200).json({ success: true, runCompleted: result.runCompleted, creditStatus: updatedStatus });
  } catch (err) {
    console.error("consume-credit error:", err);
    return res.status(500).json({ error: "Internal error consuming credit" });
  }
}
