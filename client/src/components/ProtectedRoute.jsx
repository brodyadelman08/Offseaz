import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { session, profile, loading } = useAuth()

  // Still resolving auth state — show branded spinner
  if (loading) {
    return (
      <div style={styles.loading}>
        <img src="/Offseaz Logo (White Letter) Dark.PNG" alt="Offseaz" style={styles.logo} />
        <p style={styles.loadingText}>Loading…</p>
      </div>
    )
  }

  // No session → go to login
  if (!session) return <Navigate to="/login" replace />

  // Session exists but profile failed to load → go to login so user can
  // re-authenticate and trigger a fresh profile fetch.  Without this guard,
  // profile.role would be undefined and ProtectedRoute would incorrectly
  // redirect coaches to the athlete dashboard.
  if (!profile) return <Navigate to="/login" replace />

  // Session + profile exist but wrong role for this route → redirect to the
  // correct dashboard for this user's actual role.
  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={profile.role === 'coach' ? '/coach' : '/athlete'} replace />
  }

  return children
}

const styles = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    background: 'var(--bg)',
  },
  logo: { height: 48, display: 'block' },
  loadingText: {
    fontSize: 14,
    color: 'var(--text-3)',
  },
}
