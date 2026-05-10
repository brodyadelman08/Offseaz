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

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    try {
      const res = await api.get('/api/auth/profile')
      const role = res.data.profile?.role
      navigate(role === 'coach' ? '/coach' : '/athlete')
    } catch {
      setError('Could not load profile. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Offseaz</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.heading}>Sign in</h2>
        {error && <p style={styles.error}>{error}</p>}
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
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={styles.link}>
          No account? <Link to="/register">Create one</Link>
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
  error: { color: '#c0392b', fontSize: 13 },
  link: { textAlign: 'center', fontSize: 13 },
}
