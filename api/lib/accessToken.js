// FILE LOCATION IN GITHUB: api/lib/accessToken.js
//
// Short-lived signed access tokens, issued once a user completes the
// email-capture step (api/register.js) and required on every credit-related
// call (api/check-credits.js, api/consume-credit.js) instead of trusting a
// bare email query/body param. Not a real login session — just closes off
// the "anyone who knows/guesses an email can query it directly" gap.
//
// Token shape: base64url(email + "|" + expiryTimestamp) + "." + HMAC-SHA256
// signature of that same string, using ACCESS_TOKEN_SECRET.

import crypto from "crypto";

const TOKEN_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function sign(payload) {
  return crypto
    .createHmac("sha256", process.env.ACCESS_TOKEN_SECRET)
    .update(payload)
    .digest("base64url");
}

export function generateAccessToken(email) {
  const expires = Date.now() + TOKEN_LIFETIME_MS;
  const payload = `${email.trim().toLowerCase()}|${expires}`;
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token, email) {
  if (!token || typeof token !== "string" || !token.includes(".") || !email) return false;

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = sign(encodedPayload);

  // Constant-time comparison to avoid timing attacks
  const sigBuffer = Buffer.from(signature || "");
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false;

  const payload = Buffer.from(encodedPayload, "base64url").toString();
  const [tokenEmail, expiresStr] = payload.split("|");
  const expires = Number(expiresStr);

  if (!expires || Date.now() > expires) return false;
  if (tokenEmail !== email.trim().toLowerCase()) return false;

  return true;
}
