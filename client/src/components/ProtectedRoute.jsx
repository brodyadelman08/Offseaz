import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AgeConfirmGate from './AgeConfirmGate'
import AgeBlockMessage from './AgeBlockMessage'

export default function ProtectedRoute({ children, requiredRole }) {
  const { session, profile, loading } = useAuth()

  // Owned here, not inside AgeConfirmGate: once an underage account is
  // removed server-side, AgeConfirmGate calls signOut(), which flips
  // session/profile to null. If this flag lived in AgeConfirmGate's own
  // state, the `!session`/`!profile` checks below would redirect to /login
  // and unmount it before the block message ever rendered. This component
  // instance itself doesn't unmount across that state change (same route,
  // same position in the tree), so state kept here survives it.
  const [ageBlockedMessage, setAgeBlockedMessage] = useState(null)

  if (ageBlockedMessage) {
    return <AgeBlockMessage message={ageBlockedMessage} />
  }

  // Still resolving auth state — show branded spinner
  if (loading) {
    return (
      <div style={styles.loading}>
        <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={styles.logo} />
        <div className="skeleton" style={{ width: 120, height: 12, borderRadius: 6 }} />
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

  // Single choke point for every authenticated route (coach and athlete
  // alike): an existing account with no recorded age_verified_at (created
  // before the age gate existed) is blocked here, on next login, until it
  // confirms a date of birth — same server-side check as new signup, no
  // second age system. Checked before the role redirect below since it
  // applies regardless of destination.
  if (!profile.age_verified_at) {
    return <AgeConfirmGate onBlocked={setAgeBlockedMessage} />
  }

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
}
