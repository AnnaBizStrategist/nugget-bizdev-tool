import { createClient } from '@supabase/supabase-js'
import { generateAccessToken } from './lib/accessToken.js'

// Server-side only — uses the service role key, which bypasses RLS.
// Reusing VITE_SUPABASE_URL here is fine: that's just the project URL,
// and Vercel makes all env vars available to serverless functions
// regardless of the VITE_ prefix (that prefix rule only affects what
// gets bundled into frontend code).
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Product Hunt launch promo — "+1 bonus report credit" (Connector tier, so
// Gold Nugget is included, same as any real Connector purchase). NUGGETPH,
// expires Sept 23, 2026. Redemption is tracked via a sentinel
// stripe_payment_id on the credit_batches row so resubmitting the code
// never grants a second free credit.
const PROMO_CODE = 'NUGGETPH'
const PROMO_EXPIRES = '2026-09-23'
const PROMO_MARKER = 'promo_nuggetph'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email: rawEmail, promoCode } = req.body || {}

  if (!name || !rawEmail) {
    return res.status(400).json({ error: 'Name and email are required.' })
  }

  const email = rawEmail.trim().toLowerCase()

  try {
    // Upsert into the custom `users` table by email
    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) throw lookupError

    let userId

    if (existingUser) {
      userId = existingUser.id
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ name, last_active_date: new Date().toISOString().slice(0, 10) })
        .eq('id', existingUser.id)

      if (updateError) throw updateError
    } else {
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({ name, email })
        .select('id')
        .single()

      if (insertError) throw insertError
      userId = newUser.id
    }

    // Redeem the NUGGETPH promo code, if one was submitted and it's valid.
    // One grant per user, ever — enforced by the PROMO_MARKER check below.
    const submittedCode = (promoCode || '').trim().toUpperCase()
    const today = new Date().toISOString().slice(0, 10)

    if (submittedCode === PROMO_CODE && today <= PROMO_EXPIRES) {
      const { data: existingPromoGrant, error: promoLookupError } = await supabaseAdmin
        .from('credit_batches')
        .select('id')
        .eq('user_id', userId)
        .eq('stripe_payment_id', PROMO_MARKER)
        .maybeSingle()

      if (promoLookupError) throw promoLookupError

      if (!existingPromoGrant) {
        const expiration = new Date()
        expiration.setMonth(expiration.getMonth() + 18)

        const { error: promoGrantError } = await supabaseAdmin
          .from('credit_batches')
          .insert({
            user_id: userId,
            tier_name: 'connector',
            credits_granted: 1,
            credits_remaining: 1,
            includes_gn: true,
            price_paid: 0,
            purchase_date: today,
            expiration_date: expiration.toISOString().slice(0, 10),
            stripe_payment_id: PROMO_MARKER,
          })

        if (promoGrantError) throw promoGrantError
      }
    }

       // Send the actual magic-link email — best effort only. If this fails
    // (rate limit, bad address, provider hiccup), it must never block
    // issuing the access token, since the token is what actually lets
    // someone use the credit they just redeemed.
    try {
      const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: process.env.SITE_URL || 'https://www.getnugget.ca',
        },
      })
      if (otpError) console.error('Magic-link email error (non-fatal):', otpError)
    } catch (otpErr) {
      console.error('Magic-link email error (non-fatal):', otpErr)
    }

    const accessToken = generateAccessToken(email)

    return res.status(200).json({ success: true, accessToken })
  } catch (err) {
    console.error('Registration error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
