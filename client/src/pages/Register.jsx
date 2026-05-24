import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import api from '../services/api'

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
    <div style={styles.container}>
      <h1 style={styles.title}>Offseaz</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.heading}>Create account</h2>
        {inviteCode && (
          <p style={styles.inviteBanner}>You have an invite — joining as Athlete.</p>
        )}
        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {!inviteCode && (
          <div style={styles.roleRow}>
            <button
              type="button"
              style={{ ...styles.roleBtn, ...(role === 'coach' ? styles.roleBtnActive : {}) }}
              onClick={() => setRole('coach')}
            >
              Coach
            </button>
            <button
              type="button"
              style={{ ...styles.roleBtn, ...(role === 'athlete' ? styles.roleBtnActive : {}) }}
              onClick={() => setRole('athlete')}
            >
              Athlete
            </button>
          </div>
        )}

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p style={styles.link}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 32 },
  form: { display: 'flex', flexDirection: 'column', gap: 12, width: 320 },
  heading: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  input: { padding: '10px 12px', fontSize: 15, borderRadius: 6, border: '1px solid #ccc' },
  button: { padding: '10px 0', fontSize: 15, fontWeight: 600, borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer' },
  roleRow: { display: 'flex', gap: 10 },
  roleBtn: { flex: 1, padding: '10px 0', fontSize: 15, borderRadius: 6, border: '2px solid #ccc', background: '#fff', cursor: 'pointer' },
  roleBtnActive: { borderColor: '#1a1a1a', background: '#1a1a1a', color: '#fff' },
  error: { color: '#c0392b', fontSize: 13 },
  inviteBanner: { background: '#e8f5e9', color: '#2e7d32', padding: '8px 12px', borderRadius: 6, fontSize: 13 },
  link: { textAlign: 'center', fontSize: 13 },
}
