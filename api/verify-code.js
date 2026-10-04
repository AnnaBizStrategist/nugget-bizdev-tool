import { createClient } from '@supabase/supabase-js'
import { generateAccessToken } from './lib/accessToken.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Used for all database reads/writes. Never used to verify codes.
const supabaseAdmin = createClient(url, serviceKey)

// A fresh, throwaway client per request just for checking the code.
// verifyOtp stores a session on whichever client calls it, and a client
// holding a session stops acting as service role, so keep it separate.
function makeAuthClient() {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body || {}
  const email = String(body.email || '').trim().toLowerCase()
  const code = String(body.code || '').trim()

  if (!email || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Please enter the 6-digit code from your email.' })
  }

  try {
    const { error: verifyError } = await makeAuthClient().auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    if (verifyError) {
      if (verifyError.status === 429) {
        return res.status(429).json({ error: 'Too many tries. Please wait a few minutes and try again.' })
      }
      return res.status(400).json({
        error: "That code didn't work. It may have expired. You can request a new one.",
      })
    }

    // Email is now proven. Find or create the user row.
    const today = new Date().toISOString().slice(0, 10)

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) throw lookupError

    let name = null

    if (existing) {
      name = existing.name || null
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ last_active_date: today })
        .eq('id', existing.id)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({ email, last_active_date: today })
      if (insertError) throw insertError
    }

    // name === null means "ask for their first name".
    return res.status(200).json({
      success: true,
      accessToken: generateAccessToken(email),
      email,
      name,
    })
  } catch (err) {
    console.error('verify-code error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
