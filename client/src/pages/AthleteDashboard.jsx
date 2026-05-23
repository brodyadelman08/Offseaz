import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function AthleteDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [survey, setSurvey] = useState(undefined)
  const [plan, setPlan] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/teams/my-team').then(r => r.data.team).catch(() => null),
      api.get('/api/survey/my').then(r => r.data.survey).catch(() => null),
      api.get('/api/blueprints/my-plan').then(r => r.data.plan).catch(() => null),
    ]).then(([teamData, surveyData, planData]) => {
      setTeam(teamData)
      setSurvey(surveyData)
      setPlan(planData)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Athlete Dashboard</h1>
        <button onClick={signOut} style={styles.signOut}>Sign out</button>
      </div>

      <p style={styles.welcome}>Welcome, {profile?.full_name || 'Athlete'}</p>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {/* Team card */}
          {team ? (
            <div style={styles.card}>
              <p style={styles.label}>Your team</p>
              <p style={styles.teamName}>{team.name}</p>
            </div>
          ) : (
            <div style={styles.card}>
              <p style={styles.noTeam}>You haven't joined a team yet. Ask your coach for an invite link.</p>
            </div>
          )}

          {/* Survey status card */}
          <div style={{ ...styles.card, marginTop: 16 }}>
            {survey ? (
              <div style={styles.surveyComplete}>
                <span style={styles.checkmark}>✓</span>
                <div>
                  <p style={styles.surveyCompleteTitle}>Profile complete</p>
                  <p style={styles.surveyCompleteSub}>
                    {survey.sport}{survey.position ? ` · ${survey.position}` : ''}
                    {survey.time_per_week ? ` · ${survey.time_per_week}h/week` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div style={styles.surveyPending}>
                <div>
                  <p style={styles.surveyPendingTitle}>Complete your athlete profile</p>
                  <p style={styles.surveyPendingSub}>Help your coach build the right plan for you.</p>
                </div>
                <button style={styles.actionBtn} onClick={() => navigate('/survey')}>
                  Start survey →
                </button>
              </div>
            )}
          </div>

          {/* Messages card */}
          <div style={{ ...styles.card, marginTop: 16 }}>
            <div style={styles.surveyPending}>
              <div>
                <p style={styles.surveyPendingTitle}>Messages</p>
                <p style={styles.surveyPendingSub}>View announcements and messages from your coach.</p>
              </div>
              <button style={styles.actionBtn} onClick={() => navigate('/messages')}>
                View →
              </button>
            </div>
          </div>

          {/* Training plan card */}
          <div style={{ ...styles.card, marginTop: 16 }}>
            {plan ? (
              <div style={styles.planRow}>
                <div>
                  <p style={styles.label}>Training plan</p>
                  <p style={styles.planTitle}>{plan.title}</p>
                  <p style={styles.planMeta}>{plan.num_weeks}-week plan</p>
                </div>
                <button style={styles.actionBtn} onClick={() => navigate('/plan')}>
                  View plan →
                </button>
              </div>
            ) : (
              <p style={styles.noPlan}>Your coach is setting up your training plan. Check back soon.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 600, margin: '0 auto', padding: '40px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 700 },
  signOut: { fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' },
  welcome: { color: '#555', marginBottom: 32 },
  card: { background: '#f9f9f9', borderRadius: 10, padding: 24, border: '1px solid #e5e5e5' },
  label: { fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 6 },
  teamName: { fontSize: 20, fontWeight: 600 },
  noTeam: { color: '#555', fontSize: 14 },
  surveyComplete: { display: 'flex', alignItems: 'center', gap: 16 },
  checkmark: { fontSize: 24, color: '#2e7d32', background: '#e8f5e9', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  surveyCompleteTitle: { fontWeight: 600, fontSize: 15, color: '#2e7d32', margin: 0 },
  surveyCompleteSub: { fontSize: 13, color: '#666', margin: '4px 0 0' },
  surveyPending: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  surveyPendingTitle: { fontWeight: 600, fontSize: 15, margin: 0 },
  surveyPendingSub: { fontSize: 13, color: '#666', margin: '4px 0 0' },
  planRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  planTitle: { fontWeight: 700, fontSize: 16, margin: '4px 0 2px' },
  planMeta: { fontSize: 13, color: '#888', margin: 0 },
  noPlan: { color: '#888', fontSize: 14 },
  actionBtn: { padding: '10px 18px', fontSize: 14, fontWeight: 600, borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
}
