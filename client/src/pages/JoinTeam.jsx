import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { AlertIcon } from '../components/Icons'

export default function JoinTeam() {
  const { code } = useParams()
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return

    if (!session) {
      navigate(`/register?invite=${code}`, { replace: true })
      return
    }

    if (profile?.role !== 'athlete') {
      setError('Only athletes can join teams via invite link.')
      return
    }

    setStatus('joining')
    api.post('/api/teams/join', { invite_code: code })
      .then(() => navigate('/athlete', { replace: true }))
      .catch(err => {
        const msg = err.response?.data?.error || 'Failed to join team.'
        if (msg === 'Already a member of this team') {
          navigate('/athlete', { replace: true })
        } else {
          setError(msg)
          setStatus('error')
        }
      })
  }, [loading, session, profile, code, navigate])

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <img src="/Offseaz_logo__DARK_-removebg-preview.png" alt="Offseaz" style={styles.logoHero} />
        {error ? (
          <div style={styles.errorCard}>
            <AlertIcon size={36} color="#c73820" />
            <p style={styles.errorText}>{error}</p>
            <button style={styles.backBtn} onClick={() => navigate('/athlete')}>
              Go to dashboard
            </button>
          </div>
        ) : (
          <div style={styles.joinCard}>
            <div style={styles.spinner} />
            <p style={styles.joiningText}>Joining your team…</p>
          </div>
        )}
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
    background: 'var(--bg)',
    position: 'relative',
  },
  logoHero: { height: 48, display: 'block' },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 32,
  },
  joinCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '40px 60px',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid var(--border)',
    borderTopColor: '#308EBD',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  joiningText: {
    fontSize: 16,
    color: 'var(--text-2)',
  },
  errorCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '40px 48px',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    textAlign: 'center',
  },
  errorText: { color: '#c73820', fontSize: 15, margin: 0 },
  backBtn: {
    marginTop: 8,
    padding: '9px 20px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    border: 'none',
    background: '#308EBD',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(48,142,189,0.30)',
  },
}
