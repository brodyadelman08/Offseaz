import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Register from './pages/Register'
import JoinTeam from './pages/JoinTeam'
import Survey from './pages/Survey'

import CoachDashboard from './pages/CoachDashboard'
import CoachAthletes from './pages/CoachAthletes'
import CoachBlueprints from './pages/CoachBlueprints'
import BlueprintBuilder from './pages/BlueprintBuilder'
import BlueprintDetail from './pages/BlueprintDetail'
import AthleteProfile from './pages/AthleteProfile'
import AccountabilityDashboard from './pages/AccountabilityDashboard'
import Messages from './pages/Messages'

import AthleteDashboard from './pages/AthleteDashboard'
import AthletePlan from './pages/AthletePlan'
import WorkoutLog from './pages/WorkoutLog'
import AthleteMyProfile from './pages/AthleteMyProfile'
import AthleteOnboarding from './pages/AthleteOnboarding'

// Smart redirect for /messages → role-based destination
function MessagesRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={profile.role === 'coach' ? '/coach/messages' : '/athlete/messages'} replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join/:code" element={<JoinTeam />} />

            {/* Athlete-only standalone (no sidebar) */}
            <Route
              path="/survey"
              element={
                <ProtectedRoute requiredRole="athlete">
                  <Survey />
                </ProtectedRoute>
              }
            />
            <Route
              path="/athlete/onboarding"
              element={
                <ProtectedRoute requiredRole="athlete">
                  <AthleteOnboarding />
                </ProtectedRoute>
              }
            />

            {/* ── Coach routes (nested, with Layout) ── */}
            <Route
              path="/coach"
              element={
                <ProtectedRoute requiredRole="coach">
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CoachDashboard />} />
              <Route path="athletes" element={<CoachAthletes />} />
              <Route path="athletes/:id" element={<AthleteProfile />} />
              <Route path="blueprints" element={<CoachBlueprints />} />
              <Route path="blueprints/new" element={<BlueprintBuilder />} />
              <Route path="blueprints/:id" element={<BlueprintDetail />} />
              <Route path="messages" element={<Messages />} />
              <Route path="accountability" element={<AccountabilityDashboard />} />
            </Route>

            {/* ── Athlete routes (nested, with Layout) ── */}
            <Route
              path="/athlete"
              element={
                <ProtectedRoute requiredRole="athlete">
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AthleteDashboard />} />
              <Route path="plan" element={<AthletePlan />} />
              <Route path="log" element={<WorkoutLog />} />
              <Route path="messages" element={<Messages />} />
              <Route path="profile" element={<AthleteMyProfile />} />
            </Route>

            {/* Legacy redirects — keep old bookmarks working */}
            <Route path="/plan" element={<Navigate to="/athlete/plan" replace />} />
            <Route path="/log" element={<Navigate to="/athlete/log" replace />} />
            <Route path="/accountability" element={<Navigate to="/coach/accountability" replace />} />
            <Route path="/blueprints/new" element={<Navigate to="/coach/blueprints/new" replace />} />
            <Route path="/messages" element={<MessagesRedirect />} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
