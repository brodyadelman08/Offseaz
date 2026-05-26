import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { CheckCircleIcon, CalendarIcon, BoltIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

export default function AthleteDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [survey, setSurvey] = useState(undefined)
  const [plan, setPlan] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinSkipped, setJoinSkipped] = useState(false)

  // Redirect new athletes to the onboarding flow on first visit.
  // Once onboarding is marked done in localStorage it never fires again.
  const [onboardingDone] = useState(() => !!localStorage.getItem('offseaz_onboarding_done'))

  useEffect(() => {
    if (!onboardingDone) {
      navigate('/athlete/onboarding', { replace: true })
      return
    }
    Promise.all([
      api.get('/api/teams/my-team').then(r => r.data.team).catch(() => null),
      api.get('/api/survey/my').then(r => r.data.survey).catch(() => null),
      api.get('/api/blueprints/my-plan').then(r => r.data.plan).catch(() => null),
    ]).then(([teamData, surveyData, planData]) => {
      setTeam(teamData)
      setSurvey(surveyData)
      setPlan(planData)
    }).finally(() => setLoading(false))
  }, [onboardingDone, navigate])

  // Show a minimal loading state while the redirect fires — prevents black screen
  if (!onboardingDone) return <div style={{ color: 'var(--text-3)', fontSize: 15, padding: 32 }}>Loading…</div>

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
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>
          {profile?.full_name?.split(' ')[0]
            ? `Let's get to work, ${profile.full_name.split(' ')[0]}`
            : 'Home'}
        </h1>
        <p style={styles.pageSub}>Stay consistent. Trust the process.</p>
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading…</p>
      ) : (
        <div style={styles.stack}>
          {/* Team card */}
          {team ? (
            <div style={styles.card}>
              <p style={{ ...styles.cardLabel, color: BLUE }}>Your Team</p>
              <p style={styles.teamName}>{team.name}</p>
            </div>
          ) : joinSkipped ? (
            <div style={styles.card}>
              <p style={{ ...styles.cardLabel, color: BLUE }}>Join a Team</p>
              <p style={styles.joinDesc}>
                No team yet.{' '}
                <button style={styles.enterCodeLink} onClick={() => setJoinSkipped(false)}>
                  Enter a code →
                </button>
              </p>
            </div>
          ) : (
            <div style={styles.card}>
              <p style={{ ...styles.cardLabel, color: BLUE }}>Join a Team</p>
              <p style={styles.joinPrompt}>Enter the code your coach shared with you</p>
              <form onSubmit={handleJoinTeam} style={styles.joinFormStack}>
                <input
                  style={styles.joinInputLarge}
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
                  style={{ ...styles.joinBtnFull, opacity: joining || !joinCode.trim() ? 0.55 : 1 }}
                  disabled={joining || !joinCode.trim()}
                >
                  {joining ? 'Joining…' : 'Join Team'}
                </button>
              </form>
              {joinError && <p style={styles.joinError}>{joinError}</p>}
              <div style={styles.skipWrap}>
                <button style={styles.skipCodeBtn} type="button" onClick={() => setJoinSkipped(true)}>
                  I don't have a code yet — skip for now
                </button>
                <p style={styles.skipCodeSub}>You can always join a team later from your profile.</p>
              </div>
            </div>
          )}

          {/* Survey card */}
          <div style={styles.card}>
            {survey ? (
              <div style={styles.surveyComplete}>
                <div style={styles.checkIcon}>
                  <CheckCircleIcon size={22} color={BLUE} />
                </div>
                <div>
                  <p style={styles.surveyCompleteTitle}>Profile complete</p>
                  <p style={styles.surveyCompleteSub}>
                    {survey.sport}
                    {survey.position ? ` · ${survey.position}` : ''}
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
                <button style={{ ...styles.actionBtn, background: YELLOW, color: '#1a1a1a' }} onClick={() => navigate('/survey')}>
                  Start survey
                </button>
              </div>
            )}
          </div>

          {/* Training plan card */}
          <div style={styles.card}>
            {plan ? (
              <div style={styles.actionRow}>
                <div>
                  <p style={styles.cardLabel}>Training Plan</p>
                  <p style={styles.planTitle}>{plan.title}</p>
                  <p style={styles.planMeta}>{plan.num_weeks}-week plan</p>
                </div>
                <button style={{ ...styles.actionBtn, background: BLUE }} onClick={() => navigate('/athlete/plan')}>
                  View plan
                </button>
              </div>
            ) : (
              <div>
                <p style={styles.cardLabel}>Training Plan</p>
                <p style={styles.noPlan}>
                  Your coach is setting up your training plan. Check back soon.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 640, margin: '0 auto' },

  pageHeader: { marginBottom: 28 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  pageSub: { fontSize: 14, color: 'var(--text-2)', fontStyle: 'italic', margin: 0 },
  loadingText: { color: 'var(--text-3)', fontSize: 15 },

  stack: { display: 'flex', flexDirection: 'column', gap: 12 },

  card: { background: 'var(--card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' },
  cardLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    margin: '0 0 8px',
  },
  teamName: { fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 },

  joinDesc: { color: 'var(--text-2)', fontSize: 14, marginBottom: 0 },
  enterCodeLink: {
    background: 'none',
    border: 'none',
    color: BLUE,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },

  joinPrompt: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text)',
    margin: '0 0 14px',
    lineHeight: 1.35,
  },
  joinFormStack: { display: 'flex', flexDirection: 'column', gap: 10 },
  joinInputLarge: {
    width: '100%',
    padding: '14px 18px',
    fontSize: 22,
    fontFamily: 'monospace',
    letterSpacing: 5,
    textAlign: 'center',
    borderRadius: 10,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    textTransform: 'uppercase',
    outline: 'none',
    boxSizing: 'border-box',
  },
  joinBtnFull: {
    width: '100%',
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: BLUE,
    color: '#fff',
    cursor: 'pointer',
  },
  joinError: { color: '#c73820', fontSize: 13, marginTop: 4 },

  skipWrap: {
    marginTop: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  skipCodeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-3)',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px 0',
  },
  skipCodeSub: {
    fontSize: 12,
    color: 'var(--text-3)',
    margin: 0,
    textAlign: 'center',
  },

  surveyComplete: { display: 'flex', alignItems: 'center', gap: 14 },
  checkIcon: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(48,142,189,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  surveyCompleteTitle: { fontWeight: 700, fontSize: 15, color: BLUE, margin: '0 0 2px' },
  surveyCompleteSub: { fontSize: 13, color: 'var(--text-2)', margin: 0 },

  actionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  actionTitle: { fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: '0 0 3px' },
  actionSub: { fontSize: 13, color: 'var(--text-2)', margin: 0 },
  actionBtn: {
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  planTitle: { fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: '2px 0' },
  planMeta: { fontSize: 13, color: 'var(--text-3)', margin: 0 },
  noPlan: { color: 'var(--text-3)', fontSize: 14 },
}
