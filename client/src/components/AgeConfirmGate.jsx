import { useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

// ── Existing-user, one-time age confirmation ────────────────────────────────
// Rendered by ProtectedRoute in place of the requested page whenever a
// logged-in user's profile has no age_verified_at yet — i.e. an account
// created before the age gate existed. Blocking: there is no skip, no
// dismiss, and no parental-consent path, same as the new-signup gate. The
// age check itself runs server-side via PATCH /api/auth/confirm-age, the
// same MIN_SIGNUP_AGE/calculateAge logic as POST /api/auth/check-age used
// at signup — not a second, parallel age system.
//
// `onBlocked(message)` is owned by ProtectedRoute, not this component: once
// an underage account is removed server-side, we call signOut(), which
// flips session/profile to null. If the "blocked" flag lived in this
// component's own state, ProtectedRoute's earlier `!profile` check would
// unmount this component and redirect to /login before the message ever
// rendered. Lifting the flag to ProtectedRoute (which doesn't unmount
// across that state change) keeps the message on screen.
export default function AgeConfirmGate({ onBlocked }) {
  const { updateProfile, signOut } = useAuth()
  const [dob, setDob] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const todayISO = new Date().toISOString().slice(0, 10)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!dob) { setError('Date of birth is required.'); return }
    setError('')
    setLoading(true)

    try {
      const res = await api.patch('/api/auth/confirm-age', { date_of_birth: dob })
      updateProfile({ ...res.data.profile })
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error === 'age_restricted') {
        onBlocked(err.response.data.message)
        signOut().catch(() => {})
        return
      }
      setError(err.response?.data?.error || 'Could not verify eligibility. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={styles.logo} />
        <h2 style={styles.heading}>One quick thing</h2>
        <p style={styles.subheading}>
          We need to confirm your date of birth before you continue. You'll only be asked this once.
        </p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="date"
            value={dob}
            max={todayISO}
            onChange={e => { setDob(e.target.value); setError('') }}
            autoComplete="bday"
          />
          <button style={styles.primaryBtn} type="submit" disabled={loading}>
            {loading ? 'Confirming…' : 'Confirm & Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0F0F0F',
    padding: '40px 20px',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: '32px 28px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  logo: {
    height: 40,
    display: 'block',
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text)',
    margin: '0 0 8px',
  },
  subheading: {
    fontSize: 14,
    color: 'var(--text-2)',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  errorBox: {
    width: '100%',
    background: 'rgba(199,56,32,0.12)',
    border: '1px solid rgba(199,56,32,0.3)',
    color: '#ff6b4a',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 15,
    borderRadius: 10,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    outline: 'none',
  },
  primaryBtn: {
    width: '100%',
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    background: '#F75709',
    letterSpacing: 0.2,
    boxShadow: '0 2px 12px rgba(0,0,0,0.20)',
  },
}
