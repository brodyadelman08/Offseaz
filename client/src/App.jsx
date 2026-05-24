import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import JoinTeam from './pages/JoinTeam'
import CoachDashboard from './pages/CoachDashboard'
import AthleteDashboard from './pages/AthleteDashboard'
import Survey from './pages/Survey'
import BlueprintBuilder from './pages/BlueprintBuilder'
import BlueprintDetail from './pages/BlueprintDetail'
import AthletePlan from './pages/AthletePlan'
import WorkoutLog from './pages/WorkoutLog'
import AccountabilityDashboard from './pages/AccountabilityDashboard'
import Messages from './pages/Messages'
import AthleteProfile from './pages/AthleteProfile'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join/:code" element={<JoinTeam />} />
            <Route
              path="/coach"
              element={
                <ProtectedRoute requiredRole="coach">
                  <CoachDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/athlete"
              element={
                <ProtectedRoute requiredRole="athlete">
                  <AthleteDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/survey"
              element={
                <ProtectedRoute requiredRole="athlete">
                  <Survey />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accountability"
              element={
                <ProtectedRoute requiredRole="coach">
                  <AccountabilityDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/blueprints/new"
              element={
                <ProtectedRoute requiredRole="coach">
                  <BlueprintBuilder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/blueprints/:id"
              element={
                <ProtectedRoute requiredRole="coach">
                  <BlueprintDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan"
              element={
                <ProtectedRoute requiredRole="athlete">
                  <AthletePlan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/log"
              element={
                <ProtectedRoute requiredRole="athlete">
                  <WorkoutLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/athletes/:id"
              element={
                <ProtectedRoute requiredRole="coach">
                  <AthleteProfile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
