import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={styles.loading}>
        <img src="/Offseaz_Logo__White_Letter__Dark_PNG.png" alt="Offseaz" style={styles.logo} />
        <p style={styles.loadingText}>Loading…</p>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === 'coach' ? '/coach' : '/athlete'} replace />
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
