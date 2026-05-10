import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === 'coach' ? '/coach' : '/athlete'} replace />
  }

  return children
}
