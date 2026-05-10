import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

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

  if (loading || status === 'joining') {
    return <div style={styles.center}>Joining team…</div>
  }

  if (error) {
    return (
      <div style={styles.center}>
        <p style={styles.error}>{error}</p>
      </div>
    )
  }

  return null
}

const styles = {
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 120, fontSize: 16 },
  error: { color: '#c0392b' },
}
