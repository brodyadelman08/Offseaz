import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import api from '../services/api'
import { BarChartIcon, UserIcon } from '../components/Icons'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteCode = searchParams.get('invite')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(inviteCode ? 'athlete' : '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const accentColor = role === 'athlete' ? '#308EBD' : '#F75709'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!role) {
      setError('Please select a role.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    try {
      await api.post('/api/auth/register', { userId: data.user.id, role, full_name: fullName })

      if (inviteCode && role === 'athlete') {
        await api.post('/api/teams/join', { invite_code: inviteCode })
      }

      navigate(role === 'coach' ? '/coach' : '/athlete')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <div style={styles.brand}>
          <Link to="/" style={{ display: 'block' }}>
            <img src="/Offseaz_logo__DARK_-removebg-preview.png" alt="Offseaz" style={styles.logoHero} />
          </Link>
          <p style={styles.tagline}>The coach-first offseason training platform</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.heading}>Create account</h2>
          <p style={styles.subheading}>Join Offseaz today</p>

          {inviteCode && (
            <div style={styles.inviteBanner}>
              🎯 You have a team invite — joining as an Athlete.
            </div>
          )}

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              style={styles.input}
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
            <input
              style={styles.input}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />

            {!inviteCode && (
              <div>
                <p style={styles.roleLabel}>I am a…</p>
                <div style={styles.roleRow}>
                  <button
                    type="button"
                    style={{
                      ...styles.roleCard,
                      ...(role === 'coach' ? { borderColor: '#F75709', background: 'rgba(247,87,9,0.08)' } : {}),
                    }}
                    onClick={() => setRole('coach')}
                  >
                    <BarChartIcon size={24} color={role === 'coach' ? '#F75709' : 'var(--text-3)'} />
                    <span style={{ ...styles.roleCardTitle, color: role === 'coach' ? '#F75709' : 'var(--text)' }}>
                      Coach
                    </span>
                    <span style={styles.roleCardDesc}>Build plans, track athletes</span>
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.roleCard,
                      ...(role === 'athlete' ? { borderColor: '#308EBD', background: 'rgba(48,142,189,0.08)' } : {}),
                    }}
                    onClick={() => setRole('athlete')}
                  >
                    <UserIcon size={24} color={role === 'athlete' ? '#308EBD' : 'var(--text-3)'} />
                    <span style={{ ...styles.roleCardTitle, color: role === 'athlete' ? '#308EBD' : 'var(--text)' }}>
                      Athlete
                    </span>
                    <span style={styles.roleCardDesc}>Follow your plan, log sessions</span>
                  </button>
                </div>
              </div>
            )}

            <button
              style={{ ...styles.primaryBtn, background: accentColor }}
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <p style={styles.switchLink}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#F75709', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
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
  content: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 40,
  },
  brand: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  logoHero: {
    width: 200,
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
  },
  tagline: {
    fontSize: 14,
    color: 'var(--text-3)',
    letterSpacing: 0.2,
  },
  card: {
    width: '100%',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: '32px 28px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: 'var(--text-2)',
    marginBottom: 24,
  },
  inviteBanner: {
    background: 'rgba(48,142,189,0.12)',
    border: '1px solid rgba(48,142,189,0.3)',
    color: '#308EBD',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
  },
  errorBox: {
    background: 'rgba(199,56,32,0.12)',
    border: '1px solid rgba(199,56,32,0.3)',
    color: '#ff6b4a',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  form: {
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
  roleLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-2)',
    marginBottom: 8,
  },
  roleRow: {
    display: 'flex',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '18px 10px',
    borderRadius: 14,
    border: '2px solid var(--border)',
    background: 'var(--card-inner)',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
    boxShadow: '0 1px 4px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 3,
  },
  roleCardDesc: {
    fontSize: 12,
    color: 'var(--text-3)',
    lineHeight: 1.3,
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
    marginTop: 4,
    letterSpacing: 0.2,
    boxShadow: '0 2px 12px rgba(0,0,0,0.20)',
  },
  switchLink: {
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-2)',
    marginTop: 20,
  },
}
