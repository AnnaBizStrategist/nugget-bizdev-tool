// FILE LOCATION IN GITHUB: api/onboarding.js
//
// Load and save a person's onboarding progress. Every request needs the
// person's email and the access token from verify-code.
//
// POST body: { email, token, action, ... }
//   action "load"     -> returns name, saved answers, current step, scorecard (if done)
//   action "save"     -> any of: answer {id, value}, step, exportRequested, name
//   action "complete" -> scores the answers on the server, writes the retake log

import { createClient } from '@supabase/supabase-js'
import { verifyAccessToken } from './lib/accessToken.js'
import { QUESTIONS, QUESTIONS_VERSION, buildScorecard } from '../src/onboarding/questions.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const STEPS = ['profile', 'export', 'questions', 'upload', 'reports']
const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))

// Check one answer against its question. Returns { value } or { error }.
function cleanAnswer(id, raw) {
  const q = QUESTION_BY_ID[id]
  if (!q) return { error: 'Unknown question.' }

  if (q.type === 'typed') {
    const value = String(raw == null ? '' : raw).trim().slice(0, q.maxLength || 500)
    if (!value) return { error: 'Please type an answer.' }
    return { value }
  }
  if (q.type === 'tap') {
    if (!q.options.includes(raw)) return { error: 'Please pick one of the options.' }
    return { value: raw }
  }
  if (q.type === 'statement') {
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1 || n > 5) return { error: 'Please pick one of the statements.' }
    return { value: n }
  }
  return { error: 'Unknown question type.' }
}

function buildPayload(user, profile) {
  return {
    success: true,
    name: user.name || null,
    profile: {
      currentStep: profile ? profile.current_step : 'profile',
      answers: profile ? profile.answers : {},
      exportRequestedAt: profile ? profile.export_requested_at : null,
      completedAt: profile ? profile.completed_at : null,
    },
    scorecard: profile && profile.completed_at ? buildScorecard(profile.answers) : null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body || {}
  const email = String(body.email || '').trim().toLowerCase()

  if (!verifyAccessToken(body.token, email)) {
    return res.status(401).json({ error: 'Please log in again.' })
  }

  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('email', email)
      .maybeSingle()
    if (userError) throw userError
    if (!user) return res.status(404).json({ error: 'Account not found.' })

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('onboarding_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profileError) throw profileError

    // ---------------------------------------------------------------- load
    if (body.action === 'load') {
      return res.status(200).json(buildPayload(user, profile))
    }

    // ---------------------------------------------------------------- save
    if (body.action === 'save') {
      const patch = {}
      const answers = { ...(profile ? profile.answers : {}) }
      let updatedName = user.name

      if (body.name !== undefined) {
        const name = String(body.name || '').trim().slice(0, 60)
        if (!name) return res.status(400).json({ error: 'Please enter your first name.' })
        const { error: nameError } = await supabaseAdmin
          .from('users')
          .update({ name })
          .eq('id', user.id)
        if (nameError) throw nameError
        updatedName = name
      }

      if (body.answer) {
        const q = QUESTION_BY_ID[body.answer.id]
        // Scored statements are locked once the scorecard is done (a retake
        // will have its own reset step). Other answers can still be edited.
        if (q && q.type === 'statement' && profile && profile.completed_at) {
          return res.status(409).json({ error: 'Your scorecard is already complete.' })
        }
        const cleaned = cleanAnswer(body.answer.id, body.answer.value)
        if (cleaned.error) return res.status(400).json({ error: cleaned.error })
        answers[body.answer.id] = cleaned.value
        if (body.answer.id === 'ideal_client') patch.ideal_client = cleaned.value
        if (body.answer.id === 'client_problem') patch.client_problem = cleaned.value
      }

      if (body.step !== undefined) {
        if (!STEPS.includes(body.step)) return res.status(400).json({ error: 'Unknown step.' })
        patch.current_step = body.step
      }

      if (body.exportRequested && !(profile && profile.export_requested_at)) {
        patch.export_requested_at = new Date().toISOString()
      }

      patch.answers = answers
      patch.questions_version = profile ? profile.questions_version : QUESTIONS_VERSION

      const { data: saved, error: saveError } = await supabaseAdmin
        .from('onboarding_profiles')
        .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })
        .select('*')
        .single()
      if (saveError) throw saveError

      return res.status(200).json(buildPayload({ ...user, name: updatedName }, saved))
    }

    // ------------------------------------------------------------ complete
    if (body.action === 'complete') {
      if (!profile) return res.status(400).json({ error: 'Please answer the questions first.' })

      // Already scored: hand back the saved result, no duplicate log entry.
      if (profile.completed_at) {
        return res.status(200).json(buildPayload(user, profile))
      }

      const missing = QUESTIONS.filter((q) => profile.answers[q.id] === undefined)
      if (missing.length > 0) {
        return res.status(400).json({ error: `Please answer all the questions first (${missing.length} left).` })
      }

      const scorecard = buildScorecard(profile.answers)
      if (!scorecard) return res.status(400).json({ error: 'Please answer all the questions first.' })

      const { error: logError } = await supabaseAdmin
        .from('onboarding_submissions')
        .insert({
          user_id: user.id,
          questions_version: profile.questions_version,
          answers: profile.answers,
          ideal_client: profile.answers.ideal_client || null,
          client_problem: profile.answers.client_problem || null,
          pillar_scores: scorecard.pillarScores,
          overall_score: scorecard.overall,
          lowest_pillar: scorecard.lowestPillar,
        })
      if (logError) throw logError

      const { data: done, error: doneError } = await supabaseAdmin
        .from('onboarding_profiles')
        .update({
          pillar_scores: scorecard.pillarScores,
          overall_score: scorecard.overall,
          lowest_pillar: scorecard.lowestPillar,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select('*')
        .single()
      if (doneError) throw doneError

      return res.status(200).json(buildPayload(user, done))
    }

    return res.status(400).json({ error: 'Unknown action.' })
  } catch (err) {
    console.error('onboarding error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
