import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import api from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    try {
      const res = await api.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${authData.session.access_token}` },
      })
      const role = res.data.profile?.role
      navigate(role === 'coach' ? '/coach' : '/athlete')
    } catch (err) {
      console.error('Login error:', err)
      const msg = err.response?.data?.error || err.message || 'Could not load profile. Please try again.'
      setError(msg)
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
          <h2 style={styles.heading}>Welcome back</h2>
          <p style={styles.subheading}>Sign in to your account</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
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
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button style={styles.primaryBtn} type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p style={styles.switchLink}>
            No account?{' '}
            <Link to="/register" style={styles.link}>Create one</Link>
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
    maxWidth: 400,
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
  primaryBtn: {
    width: '100%',
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: '#F75709',
    color: '#fff',
    cursor: 'pointer',
    marginTop: 4,
    letterSpacing: 0.2,
    boxShadow: '0 2px 12px rgba(247,87,9,0.35)',
  },
  switchLink: {
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-2)',
    marginTop: 20,
  },
  link: {
    color: '#F75709',
    fontWeight: 600,
    textDecoration: 'none',
  },
}
