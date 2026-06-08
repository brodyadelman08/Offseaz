import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { TeamProvider } from './context/TeamContext'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// ── ScrollToTop — restores the window to the top on every route change ────────
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// ── Error boundary — catches any render crash and shows a safe fallback ────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '', componentStack: '' }
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || String(error),
    }
  }
  componentDidCatch(error, info) {
    const stack = info?.componentStack || ''
    console.error('[Offseaz ErrorBoundary] ═══ RENDER CRASH ═══')
    console.error('[Offseaz ErrorBoundary] Error:', error)
    console.error('[Offseaz ErrorBoundary] Message:', error?.message)
    console.error('[Offseaz ErrorBoundary] Component stack:', stack)
    console.error('[Offseaz ErrorBoundary] JS stack:', error?.stack)
    // Store stack so we can display it in the fallback UI
    this.setState({ componentStack: stack })
  }
  render() {
    if (this.state.hasError) {
      const { errorMessage, componentStack } = this.state
      // Extract the first crashing component name from the stack
      const firstComp = componentStack
        ? componentStack.trim().split('\n')[0].replace(/^\s*at\s+/, '').split(' ')[0]
        : ''
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#0A0A0A', color: '#EFEFEF',
          flexDirection: 'column', gap: 16, padding: '40px 20px', textAlign: 'center',
        }}>
          <img
            src="/Offseaz_Logo__White_Letter__Dark_PNG.png"
            alt="Offseaz"
            style={{ height: 48, display: 'block' }}
          />
          <p style={{ color: '#666', fontSize: 15, maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
            Something went wrong. Please refresh the page.
          </p>
          {/* Error details box — visible to anyone who can read the screen */}
          <div style={{
            marginTop: 8, padding: '14px 18px',
            background: 'rgba(199,56,32,0.10)', border: '1px solid rgba(199,56,32,0.30)',
            borderRadius: 10, maxWidth: 520, width: '100%', textAlign: 'left',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#c73820', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Error details (share with support)
            </p>
            <p style={{ fontSize: 13, color: '#ff9999', margin: '0 0 8px', wordBreak: 'break-word', fontFamily: 'monospace' }}>
              {errorMessage}
            </p>
            {firstComp && (
              <p style={{ fontSize: 12, color: '#888', margin: 0, fontFamily: 'monospace' }}>
                Component: <span style={{ color: '#ffaa88' }}>{firstComp}</span>
              </p>
            )}
            {componentStack && (
              <pre style={{
                fontSize: 10, color: '#555', margin: '8px 0 0', overflowX: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160,
                overflowY: 'auto', lineHeight: 1.5,
              }}>
                {componentStack.trim()}
              </pre>
            )}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, errorMessage: '', componentStack: '' }); window.location.href = '/' }}
            style={{
              padding: '11px 28px', background: '#F75709', color: '#fff',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
            }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import JoinTeam from './pages/JoinTeam'
import Survey from './pages/Survey'
import { Privacy, Terms, Refund, Accessibility } from './pages/Legal'

import CoachDashboard from './pages/CoachDashboard'
import CoachAthletes from './pages/CoachAthletes'
import CoachBlueprints from './pages/CoachBlueprints'
import BlueprintBuilder from './pages/BlueprintBuilder'
import BlueprintDetail from './pages/BlueprintDetail'
import AthleteProfile from './pages/AthleteProfile'
import AccountabilityDashboard from './pages/AccountabilityDashboard'
import Messages from './pages/Messages'
import CoachProfile from './pages/CoachProfile'
import { CoachAccessProvider } from './context/CoachAccessContext'

import AthleteDashboard from './pages/AthleteDashboard'
import AthletePlan from './pages/AthletePlan'
import AthleteMyProfile from './pages/AthleteMyProfile'
import About from './pages/About'
import Contact from './pages/Contact'
import AthleteOnboarding from './pages/AthleteOnboarding'
import AthleteRoster from './pages/AthleteRoster'
import AthleteTeammateProfile from './pages/AthleteTeammateProfile'
import Feed from './pages/Feed'
import AthleteReport from './pages/AthleteReport'

// Smart redirect for /messages → role-based destination
function MessagesRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={profile.role === 'coach' ? '/coach/messages' : '/athlete/messages'} replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <TeamProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join/:code" element={<JoinTeam />} />
            <Route path="/privacy"       element={<Privacy />} />
            <Route path="/terms"         element={<Terms />} />
            <Route path="/refund"        element={<Refund />} />
            <Route path="/accessibility" element={<Accessibility />} />
            <Route path="/about"         element={<About />} />
            <Route path="/contact"       element={<Contact />} />

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

            {/* ── Coach routes (nested, with Layout + access context) ── */}
            <Route
              path="/coach"
              element={
                <ProtectedRoute requiredRole="coach">
                  <CoachAccessProvider>
                    <Layout />
                  </CoachAccessProvider>
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
              <Route path="feed" element={<Feed />} />
              <Route path="athletes/:id/report" element={<AthleteReport />} />
              <Route path="profile" element={<CoachProfile />} />
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
              <Route path="messages" element={<Messages />} />
              <Route path="roster" element={<AthleteRoster />} />
              <Route path="roster/:athleteId" element={<AthleteTeammateProfile />} />
              <Route path="profile" element={<AthleteMyProfile />} />
              <Route path="feed" element={<Feed />} />
            </Route>

            {/* Legacy redirects — keep old bookmarks working */}
            <Route path="/plan" element={<Navigate to="/athlete/plan" replace />} />
            <Route path="/accountability" element={<Navigate to="/coach/accountability" replace />} />
            <Route path="/blueprints/new" element={<Navigate to="/coach/blueprints/new" replace />} />
            <Route path="/messages" element={<MessagesRedirect />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </TeamProvider>
        </AuthProvider>
      </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
