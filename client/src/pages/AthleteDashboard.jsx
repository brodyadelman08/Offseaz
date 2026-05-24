import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Wordmark } from '../components/Wordmark'
import api from '../services/api'

const BLUE = '#308EBD'

export default function AthleteDashboard() {
  const { profile, signOut } = useAuth()
  const { mode, toggle } = useTheme()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [survey, setSurvey] = useState(undefined)
  const [plan, setPlan] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

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

  async function handleJoinTeam(e) {
    e.preventDefault()
    const code = joinCode.trim().toLowerCase()
    if (!code) return
    setJoinError('')
    setJoining(true)
    try {
      const res = await api.post('/api/teams/join', { invite_code: code })
      setTeam(res.data.team)
      setJoinCode('')
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Failed to join team. Check the code and try again.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Wordmark size={22} />
          <span style={styles.roleChip}>Athlete</span>
        </div>
        <div style={styles.headerRight}>
          <button onClick={toggle} style={styles.iconBtn} title="Toggle theme">
            {mode === 'dark' ? '☀' : '☾'}
          </button>
          <button onClick={signOut} style={styles.signOutBtn}>Sign out</button>
        </div>
      </div>

      <div style={styles.welcome}>
        <h1 style={styles.welcomeTitle}>
          Let's get to work, {profile?.full_name?.split(' ')[0] || 'Athlete'} ⚡
        </h1>
        <p style={styles.welcomeSub}>Stay consistent. Trust the process.</p>
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading…</p>
      ) : (
        <>
          {/* Team card */}
          {team ? (
            <div style={styles.card}>
              <p style={styles.cardLabel}>Your Team</p>
              <p style={styles.teamName}>{team.name}</p>
            </div>
          ) : (
            <div style={styles.card}>
              <p style={styles.cardLabel}>Join a Team</p>
              <p style={styles.joinDesc}>Enter the code your coach shared with you.</p>
              <form onSubmit={handleJoinTeam} style={styles.joinForm}>
                <input
                  style={styles.joinInput}
                  type="text"
                  placeholder="e.g. 2FB9A616"
                  value={joinCode.toUpperCase()}
                  onChange={e => setJoinCode(e.target.value)}
                  maxLength={8}
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  style={styles.joinBtn}
                  disabled={joining || !joinCode.trim()}
                >
                  {joining ? 'Joining…' : 'Join'}
                </button>
              </form>
              {joinError && <p style={styles.joinError}>{joinError}</p>}
            </div>
          )}

          {/* Survey card */}
          <div style={{ ...styles.card, marginTop: 12 }}>
            {survey ? (
              <div style={styles.surveyComplete}>
                <div style={styles.checkmark}>✓</div>
                <div>
                  <p style={styles.surveyCompleteTitle}>Profile complete</p>
                  <p style={styles.surveyCompleteSub}>
                    {survey.sport}{survey.position ? ` · ${survey.position}` : ''}
                    {survey.time_per_week ? ` · ${survey.time_per_week} days/wk` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div style={styles.actionRow}>
                <div>
                  <p style={styles.actionTitle}>Complete your athlete profile</p>
                  <p style={styles.actionSub}>Help your coach build the right plan for you.</p>
                </div>
                <button style={styles.actionBtn} onClick={() => navigate('/survey')}>
                  Start survey →
                </button>
              </div>
            )}
          </div>

          {/* Messages card */}
          <div style={{ ...styles.card, marginTop: 12 }}>
            <div style={styles.actionRow}>
              <div>
                <p style={styles.actionTitle}>Messages</p>
                <p style={styles.actionSub}>View announcements and messages from your coach.</p>
              </div>
              <button style={styles.actionBtn} onClick={() => navigate('/messages')}>
                View →
              </button>
            </div>
          </div>

          {/* Training plan card */}
          <div style={{ ...styles.card, marginTop: 12 }}>
            {plan ? (
              <div style={styles.actionRow}>
                <div>
                  <p style={styles.cardLabel}>Training Plan</p>
                  <p style={styles.planTitle}>{plan.title}</p>
                  <p style={styles.planMeta}>{plan.num_weeks}-week plan</p>
                </div>
                <button style={styles.actionBtn} onClick={() => navigate('/plan')}>
                  View plan →
                </button>
              </div>
            ) : (
              <div>
                <p style={styles.cardLabel}>Training Plan</p>
                <p style={styles.noPlan}>Your coach is setting up your training plan. Check back soon.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 640, margin: '0 auto', padding: '0 20px 60px' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 32 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  roleChip: { fontSize: 11, fontWeight: 700, background: BLUE, color: '#fff', padding: '3px 8px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  iconBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 34, height: 34, fontSize: 14, cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  signOutBtn: { fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 500 },

  welcome: { marginBottom: 28 },
  welcomeTitle: { fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  welcomeSub: { fontSize: 14, color: 'var(--text-2)', fontStyle: 'italic' },

  loadingText: { color: 'var(--text-3)', fontSize: 15 },

  card: { background: 'var(--card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' },
  cardLabel: { fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 8px' },
  teamName: { fontSize: 20, fontWeight: 700, color: 'var(--text)' },

  joinDesc: { color: 'var(--text-2)', fontSize: 14, marginBottom: 16 },
  joinForm: { display: 'flex', gap: 8 },
  joinInput: { flex: 1, padding: '10px 14px', fontSize: 16, fontFamily: 'monospace', letterSpacing: 3, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', textTransform: 'uppercase', outline: 'none' },
  joinBtn: { padding: '10px 20px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' },
  joinError: { color: '#c73820', fontSize: 13, marginTop: 10 },

  surveyComplete: { display: 'flex', alignItems: 'center', gap: 16 },
  checkmark: { width: 40, height: 40, borderRadius: '50%', background: 'rgba(48,142,189,0.12)', color: BLUE, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  surveyCompleteTitle: { fontWeight: 700, fontSize: 15, color: BLUE, margin: '0 0 2px' },
  surveyCompleteSub: { fontSize: 13, color: 'var(--text-2)', margin: 0 },

  actionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  actionTitle: { fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: '0 0 3px' },
  actionSub: { fontSize: 13, color: 'var(--text-2)', margin: 0 },
  actionBtn: { padding: '10px 18px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },

  planTitle: { fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: '2px 0' },
  planMeta: { fontSize: 13, color: 'var(--text-3)', margin: 0 },
  noPlan: { color: 'var(--text-3)', fontSize: 14 },
}
