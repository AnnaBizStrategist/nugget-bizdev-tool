// FILE LOCATION IN GITHUB: api/check-credits.js
//
// GET /api/check-credits?email=someone@example.com
//
// Read-only. Tells you whether this user can run a report right now, and
// if not, why + what they could buy.
//
// Deliberately a GET endpoint with the email as a query param (rather than
// a POST with a JSON body) so it's testable by just pasting a URL into a
// browser tab — no CLI, no Postman needed. Once you've manually inserted a
// test credit_batches row (see the SQL snippet from this session), hit:
//
//   https://www.getnugget.ca/api/check-credits?email=YOUR_TEST_EMAIL
//
// and confirm the JSON response matches what you inserted.

import { getCreditStatus } from "./lib/gating.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Missing email query param" });
  }

  try {
    const status = await getCreditStatus(email);
    return res.status(200).json(status);
  } catch (err) {
    console.error("check-credits error:", err);
    return res.status(500).json({ error: "Internal error checking credits" });
  }
}
