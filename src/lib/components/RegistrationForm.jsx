import { useState } from 'react'

export default function RegistrationForm({ onRegistered }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | sent | error
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      setStatus('sent')
      if (onRegistered) onRegistered({ name, email })
    } catch (err) {
      setStatus('error')
      setErrorMessage(err.message)
    }
  }

  if (status === 'sent') {
    return (
      <div>
        <h2>Check your email</h2>
        <p>We sent a magic link to {email}. Click it to continue to your report.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Almost there — one quick step</h2>
      <p>Enter your name and email so we can save your report and send you a link to access it.</p>

      <label htmlFor="name">Name</label>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {status === 'error' && <p style={{ color: 'red' }}>{errorMessage}</p>}

      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending...' : 'Continue'}
      </button>
    </form>
  )
}
