import { createClient } from '@supabase/supabase-js'

// Server-side only — uses the service role key, which bypasses RLS.
// Reusing VITE_SUPABASE_URL here is fine: that's just the project URL,
// and Vercel makes all env vars available to serverless functions
// regardless of the VITE_ prefix (that prefix rule only affects what
// gets bundled into frontend code).
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

    const { name, email: rawEmail } = req.body || {}

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

    if (existingUser) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ name, last_active_date: new Date().toISOString().slice(0, 10) })
        .eq('id', existingUser.id)

      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({ name, email })

      if (insertError) throw insertError
    }

    // Send the actual magic-link email
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.SITE_URL || 'https://www.getnugget.ca',
      },
    })

    if (otpError) throw otpError

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Registration error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
