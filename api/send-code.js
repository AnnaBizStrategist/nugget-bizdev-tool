import { createClient } from '@supabase/supabase-js'

// Server-side only. Asks Supabase to email a 6-digit login code.
// Writes nothing to our own tables: a user row is only created after
// the code is verified (see verify-code.js).
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = String((req.body && req.body.email) || '').trim().toLowerCase()

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  try {
    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    if (error) {
      console.error('send-code error:', error)
      if (error.status === 429) {
        return res.status(429).json({ error: 'Please wait a minute before asking for another code.' })
      }
      return res.status(500).json({ error: "We couldn't send your code. Please try again." })
    }

    // Same response whether or not this email already has an account.
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('send-code error:', err)
    return res.status(500).json({ error: "We couldn't send your code. Please try again." })
  }
}
