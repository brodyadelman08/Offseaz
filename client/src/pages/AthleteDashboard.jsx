import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import api from '../services/api'
import { CheckCircleIcon, PlusIcon, CheckIcon } from '../components/Icons'
import ReadinessCheckin from '../components/ReadinessCheckin'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

// Map survey offseason_goals values to suggested goal titles
function surveyGoalsToSuggestions(surveyGoals = []) {
  const MAP = {
    'Increase strength':        { title: 'Increase strength',        target: 'Log a new PR in a major lift' },
    'Gain muscle / size':       { title: 'Gain muscle / size',       target: 'Gain 5–10 lbs of muscle' },
    'Lose body fat':            { title: 'Lose body fat',            target: 'Reduce body fat by 5%' },
    'Improve speed':            { title: 'Improve speed',            target: 'Improve 40-yard dash time' },
    'Improve conditioning':     { title: 'Improve conditioning',     target: 'Complete every conditioning session' },
    'Prevent injury':           { title: 'Stay healthy all offseason',target: 'Complete full program without injury' },
    'Make varsity':             { title: 'Make the varsity roster',  target: '' },
    'Earn a starting spot':     { title: 'Earn a starting spot',     target: '' },
    'Improve sport skills':     { title: 'Improve sport-specific skills', target: '' },
    'Mental toughness':         { title: 'Build mental toughness',   target: 'Complete every scheduled session' },
    'Academic performance':     { title: 'Maintain academic eligibility', target: '' },
  }
  return surveyGoals.map(g => MAP[g] || { title: g, target: '' }).filter(Boolean)
}

// Compute 1-based current week number clamped to [1, numWeeks]
function currentWeekOf(startsOn, numWeeks) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsed   = Date.now() - new Date(startsOn).getTime()
  const week      = Math.floor(elapsed / msPerWeek) + 1
  return Math.min(Math.max(week, 1), numWeeks)
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Find today's session within the active plan's current week
function findTodaySession(plan) {
  if (!plan?.weeks?.length) return null
  const weekNum = currentWeekOf(plan.starts_on, plan.num_weeks)
  const week = plan.weeks.find(w => w.week_number === weekNum) || plan.weeks[0]
  if (!week?.sessions?.length) return null

  const todayName = DAY_NAMES[new Date().getDay()]
  const match = week.sessions.find(s => typeof s.day === 'string' && s.day.toLowerCase() === todayName.toLowerCase())
  return match || week.sessions[0]
}

// Prominent dashboard moment shown after the athlete checks in and picks Training Day
function TodaySessionCard({ activePlan, onStart }) {
  const session   = findTodaySession(activePlan)
  const exercises = session?.exercises?.slice(0, 3) || []
  const descLines = !exercises.length && session?.description
    ? session.description.split('\n').filter(Boolean).slice(0, 3)
    : []

  return (
    <div style={styles.todayCard}>
      <p style={styles.todayLabel}>Today's Training Session</p>
      {session?.day && <span style={styles.todayDay}>{session.day}</span>}
      <p style={styles.todayFocus}>{session?.focus || activePlan.title}</p>

      {exercises.length > 0 ? (
        <div style={styles.todayExList}>
          {exercises.map((ex, i) => (
            <div key={i} style={styles.todayExRow}>
              <span style={styles.todayExName}>{ex.name}</span>
              <span style={styles.todayExSets}>
                {ex.warmup ? `${ex.warmup} warmup, ` : ''}{ex.sets}×{ex.reps}
              </span>
            </div>
          ))}
        </div>
      ) : descLines.length > 0 ? (
        <div style={styles.todayExList}>
          {descLines.map((line, i) => <p key={i} style={styles.todayDescLine}>{line}</p>)}
        </div>
      ) : null}

      <button style={styles.startSessionBtn} onClick={onStart}>
        Start Session →
      </button>
    </div>
  )
}

function GoalRow({ goal, onToggle, onDelete }) {
  return (
    <div style={styles.goalRow}>
      <button
        style={{ ...styles.checkBtn, background: goal.completed ? BLUE : 'transparent', borderColor: goal.completed ? BLUE : 'var(--border)' }}
        onClick={() => onToggle(goal)}
        title={goal.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {goal.completed && <CheckIcon size={12} color="#fff" />}
      </button>
      <div style={styles.goalContent}>
        <span style={{ ...styles.goalTitle, textDecoration: goal.completed ? 'line-through' : 'none', color: goal.completed ? 'var(--text-3)' : 'var(--text)' }}>
          {goal.title}
        </span>
        {goal.target && <span style={styles.goalTarget}>{goal.target}</span>}
        {goal.due_date && (
          <span style={styles.goalDue}>
            Due {new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
      <button style={styles.deleteGoalBtn} onClick={() => onDelete(goal.id)} title="Remove goal">×</button>
    </div>
  )
}

export default function AthleteDashboard() {
  const { profile } = useAuth()
  const teamCtx = useTeam()
  const activeTeam      = teamCtx?.activeTeam      ?? null
  const teams           = teamCtx?.teams            ?? []
  const teamsLoading    = teamCtx?.teamsLoading     ?? false
  const setActiveTeamId = teamCtx?.setActiveTeamId  ?? (() => {})
  const refreshTeams    = teamCtx?.refreshTeams     ?? (() => Promise.resolve())
  const navigate = useNavigate()

  const [survey,    setSurvey]    = useState(undefined)
  const [coachPlan, setCoachPlan] = useState(undefined)
  const [autoPlan,  setAutoPlan]  = useState(undefined)
  const [goals,     setGoals]     = useState([])
  const [loading,   setLoading]   = useState(true)

  const [joinCode,       setJoinCode]       = useState('')
  const [joining,        setJoining]        = useState(false)
  const [joinError,      setJoinError]      = useState('')
  const [showJoinAnother, setShowJoinAnother] = useState(false)
  const [showCheckin,    setShowCheckin]    = useState(false)
  const [trainingCheckinDone, setTrainingCheckinDone] = useState(false)

  // Goal form state
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalTitle,    setGoalTitle]    = useState('')
  const [goalTarget,   setGoalTarget]   = useState('')
  const [goalDue,      setGoalDue]      = useState('')
  const [savingGoal,   setSavingGoal]   = useState(false)
  const hasSeededGoals = useRef(false)

  useEffect(() => {
    api.get('/api/checkins/today')
      .then(r => {
        if (!r.data.checkin) {
          setShowCheckin(true)
        } else {
          // A checkin already exists for today — hydrate the highlighted
          // Today's Session card state from it instead of only relying on the
          // live modal's onComplete callback, so it persists across reloads.
          setTrainingCheckinDone(!r.data.checkin.is_rest_day)
        }
      })
      .catch(() => {})

    Promise.all([
      api.get('/api/survey/my').then(r => r.data.survey).catch(() => null),
      api.get('/api/blueprints/my-plan')
        .then(r => ({ coach: r.data.coach_plan || null, auto: r.data.auto_plan || null }))
        .catch(() => ({ coach: null, auto: null })),
      api.get('/api/goals').then(r => r.data.goals).catch(() => []),
    ]).then(([surveyData, plans, goalsData]) => {
      setSurvey(surveyData)
      setCoachPlan(plans.coach)
      setAutoPlan(plans.auto)
      setGoals(goalsData)

      if (goalsData.length === 0 && surveyData?.offseason_goals?.length > 0 && !hasSeededGoals.current) {
        hasSeededGoals.current = true
        const suggestions = surveyGoalsToSuggestions(surveyData.offseason_goals)
        Promise.all(
          suggestions.map(s =>
            api.post('/api/goals', { title: s.title, target: s.target, source: 'survey' })
              .then(r => r.data.goal)
              .catch(() => null)
          )
        ).then(created => {
          const seeded = created.filter(Boolean)
          if (seeded.length > 0) setGoals(seeded)
        })
      }
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
      await refreshTeams()
      setActiveTeamId(res.data.team.id)
      setJoinCode('')
      setShowJoinAnother(false)
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Failed to join team. Check the code and try again.')
    } finally {
      setJoining(false)
    }
  }

  async function handleAddGoal(e) {
    e.preventDefault()
    if (!goalTitle.trim()) return
    setSavingGoal(true)
    try {
      const res = await api.post('/api/goals', {
        title: goalTitle.trim(),
        target: goalTarget.trim() || null,
        due_date: goalDue || null,
        source: 'custom',
      })
      setGoals(prev => [...prev, res.data.goal])
      setGoalTitle('')
      setGoalTarget('')
      setGoalDue('')
      setShowGoalForm(false)
    } catch (err) {
      console.error('Goal save failed:', err)
    } finally {
      setSavingGoal(false)
    }
  }

  async function handleToggleGoal(goal) {
    try {
      const res = await api.patch(`/api/goals/${goal.id}`, { completed: !goal.completed })
      setGoals(prev => prev.map(g => g.id === goal.id ? res.data.goal : g))
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  async function handleDeleteGoal(id) {
    try {
      await api.delete(`/api/goals/${id}`)
      setGoals(prev => prev.filter(g => g.id !== id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const completedCount = goals.filter(g => g.completed).length

  // Active plan: coach takes priority over auto
  const activePlan  = coachPlan ?? autoPlan ?? null
  const isCoachPlan = !!coachPlan

  // Render the today's session card based on survey + plan state
  function renderSessionCard() {
    // No survey yet
    if (survey === null) {
      return (
        <div style={styles.card}>
          <p style={{ ...styles.cardLabel, color: ORANGE }}>Get Started</p>
          <p style={styles.actionTitle}>Complete your needs analysis</p>
          <p style={{ ...styles.actionSub, marginBottom: 14 }}>
            Answer a few questions so we can build your personalized training plan.
          </p>
          <button style={{ ...styles.actionBtn, background: ORANGE, alignSelf: 'flex-start' }} onClick={() => navigate('/survey')}>
            Start now →
          </button>
        </div>
      )
    }

    // Has survey but no plan at all
    if (!activePlan) {
      return (
        <div style={styles.card}>
          <p style={{ ...styles.cardLabel, color: BLUE }}>Training Plan</p>
          <p style={styles.noPlan}>Your coach is setting up your training plan. Check back soon.</p>
        </div>
      )
    }

    // Check-in complete + Training Day selected — show the dedicated session card
    if (trainingCheckinDone) {
      return <TodaySessionCard activePlan={activePlan} onStart={() => navigate('/athlete/plan')} />
    }

    // Default — plain plan summary card
    const week = currentWeekOf(activePlan.starts_on, activePlan.num_weeks)
    return (
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ ...styles.cardLabel, color: BLUE, marginBottom: 4 }}>
              {isCoachPlan ? 'Coach Blueprint' : 'Personalized Plan'}
            </p>
            <p style={styles.planTitle}>{activePlan.title}</p>
            <p style={styles.planMeta}>
              Week {week} of {activePlan.num_weeks}
              {isCoachPlan && <span style={styles.coachTag}> · Coach assigned</span>}
            </p>
          </div>
          <button
            style={{ ...styles.actionBtn, background: BLUE, flexShrink: 0, fontSize: 13, padding: '10px 16px' }}
            onClick={() => navigate('/athlete/plan')}
          >
            View plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {showCheckin && (
        <ReadinessCheckin
          onComplete={({ is_rest_day }) => {
            setShowCheckin(false)
            if (!is_rest_day) setTrainingCheckinDone(true)
          }}
          onDismiss={() => setShowCheckin(false)}
        />
      )}

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>
          {profile?.full_name?.split(' ')[0]
            ? `Let's get to work, ${profile.full_name.split(' ')[0]}`
            : 'Home'}
        </h1>
        <p style={styles.pageSub}>Stay consistent. Trust the process.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[90, 70, 80].map((w, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div className="skeleton" style={{ width: `${w}px`, height: 11, marginBottom: 10 }} />
              <div className="skeleton" style={{ width: '60%', height: 20, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '40%', height: 13 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.stack}>

          {/* ── Today's session (top priority) ── */}
          {renderSessionCard()}

          {/* ── Team card ── */}
          {teamsLoading ? (
            <div style={styles.card}>
              <div className="skeleton" style={{ width: 80, height: 11, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 160, height: 20 }} />
            </div>
          ) : activeTeam ? (
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ ...styles.cardLabel, color: BLUE }}>Your Team</p>
                  <p style={styles.teamName}>{activeTeam.name}</p>
                  {teams.length > 1 && (
                    <p style={styles.teamCount}>{teams.length} teams joined</p>
                  )}
                </div>
                <button
                  style={styles.joinAnotherBtn}
                  onClick={() => { setShowJoinAnother(s => !s); setJoinError('') }}
                >
                  {showJoinAnother ? 'Cancel' : '+ Join another'}
                </button>
              </div>
              {showJoinAnother && (
                <div style={styles.joinAnotherPanel}>
                  <form onSubmit={handleJoinTeam} style={styles.joinFormStack}>
                    <input
                      style={styles.joinInputSmall}
                      type="text"
                      placeholder="Invite code (e.g. 2FB9A616)"
                      value={joinCode.toUpperCase()}
                      onChange={e => setJoinCode(e.target.value)}
                      maxLength={8}
                      autoCapitalize="characters"
                      spellCheck={false}
                    />
                    <button
                      type="submit"
                      style={{ ...styles.actionBtn, background: BLUE, opacity: joining || !joinCode.trim() ? 0.55 : 1 }}
                      disabled={joining || !joinCode.trim()}
                    >
                      {joining ? 'Joining…' : 'Join Team'}
                    </button>
                  </form>
                  {joinError && <p style={styles.joinError}>{joinError}</p>}
                </div>
              )}
            </div>
          ) : (
            <div style={styles.joinHeroCard}>
              <p style={styles.joinHeroLabel}>Join Your Team</p>
              <h2 style={styles.joinHeroTitle}>Enter the code your coach shared with you</h2>
              <p style={styles.joinHeroDesc}>
                Your coach gave you an 8-character invite code. Type it below to get connected.
              </p>
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
            </div>
          )}

          {/* ── Survey complete badge ── */}
          {survey && (
            <div style={styles.card}>
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
            </div>
          )}

          {/* ── Goals card ── */}
          <div style={styles.card}>
            <div style={styles.goalCardHeader}>
              <div>
                <p style={{ ...styles.cardLabel, color: ORANGE, marginBottom: 0 }}>Offseason Goals</p>
                {goals.length > 0 && (
                  <p style={styles.goalProgress}>{completedCount}/{goals.length} completed</p>
                )}
              </div>
              <button style={styles.addGoalBtn} onClick={() => setShowGoalForm(s => !s)}>
                <PlusIcon size={14} color="#fff" />
                Add goal
              </button>
            </div>

            {goals.length > 0 && (
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${Math.round((completedCount / goals.length) * 100)}%` }} />
              </div>
            )}

            {showGoalForm && (
              <form onSubmit={handleAddGoal} style={styles.goalForm}>
                <input
                  style={styles.goalInput}
                  placeholder="Goal title (e.g. Increase bench by 20 lbs)"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  maxLength={120}
                  autoFocus
                />
                <input
                  style={styles.goalInput}
                  placeholder="Target / description (optional)"
                  value={goalTarget}
                  onChange={e => setGoalTarget(e.target.value)}
                  maxLength={200}
                />
                <div style={styles.goalFormRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={styles.goalDateLabel}>Due date (optional)</label>
                    <input type="date" style={styles.goalInput} value={goalDue} onChange={e => setGoalDue(e.target.value)} />
                  </div>
                  <div style={styles.goalFormBtns}>
                    <button
                      type="button"
                      style={styles.cancelGoalBtn}
                      onClick={() => { setShowGoalForm(false); setGoalTitle(''); setGoalTarget(''); setGoalDue('') }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ ...styles.saveGoalBtn, opacity: savingGoal || !goalTitle.trim() ? 0.5 : 1 }}
                      disabled={savingGoal || !goalTitle.trim()}
                    >
                      {savingGoal ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {goals.length === 0 && !showGoalForm ? (
              <p style={styles.noGoals}>No goals set yet. Add your first offseason goal above.</p>
            ) : (
              <div style={styles.goalList}>
                {goals.map(goal => (
                  <GoalRow key={goal.id} goal={goal} onToggle={handleToggleGoal} onDelete={handleDeleteGoal} />
                ))}
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

  pageHeader: { marginBottom: 20 },
  pageTitle:  { fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  pageSub:    { fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', margin: 0 },

  stack: { display: 'flex', flexDirection: 'column', gap: 12 },

  card: {
    background: 'var(--card)',
    borderRadius: 16,
    padding: 'clamp(14px, 4vw, 22px)',
    border: '1px solid var(--border)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  cardLabel: {
    fontSize: 11, fontWeight: 700, color: ORANGE,
    textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 6px',
  },

  // Plan / session card
  planTitle:  { fontWeight: 700, fontSize: 'clamp(14px, 4vw, 16px)', color: 'var(--text)', margin: '2px 0' },
  planMeta:   { fontSize: 12, color: 'var(--text-3)', margin: 0 },
  coachTag:   { color: BLUE },
  noPlan:     { color: 'var(--text-3)', fontSize: 14, margin: 0 },
  actionTitle:{ fontWeight: 700, fontSize: 'clamp(14px, 4vw, 15px)', color: 'var(--text)', margin: '0 0 3px' },
  actionSub:  { fontSize: 13, color: 'var(--text-2)', margin: 0 },
  actionBtn:  {
    padding: '11px 18px', fontSize: 14, fontWeight: 700, borderRadius: 10,
    border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
    boxShadow: '0 2px 8px rgba(247,87,9,0.28)', letterSpacing: 0.1, minHeight: 44,
  },

  // Today's Session card (shown after check-in + Training Day selection)
  todayCard: {
    background: 'var(--card)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    borderLeft: `4px solid ${ORANGE}`,
    padding: 'clamp(16px, 4vw, 22px)',
    boxShadow: '0 4px 24px rgba(247,87,9,0.22)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  todayLabel: {
    fontSize: 11, fontWeight: 700, color: ORANGE,
    textTransform: 'uppercase', letterSpacing: 0.8, margin: 0,
  },
  todayDay: {
    fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase',
    background: 'rgba(48,142,189,0.12)', padding: '3px 8px', borderRadius: 6,
    display: 'inline-block', alignSelf: 'flex-start', letterSpacing: 0.4,
  },
  todayFocus: {
    fontSize: 'clamp(18px, 5vw, 22px)', fontWeight: 700, color: 'var(--text)',
    fontFamily: "'Manrope', 'Inter', sans-serif", margin: '0 0 4px',
  },
  todayExList: { display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 4 },
  todayExRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid var(--border-light)', gap: 10,
  },
  todayExName: { fontSize: 14, fontWeight: 600, color: 'var(--text)', minWidth: 0 },
  todayExSets: { fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap', flexShrink: 0 },
  todayDescLine: { fontSize: 13, color: 'var(--text-2)', margin: '4px 0', lineHeight: 1.5 },
  startSessionBtn: {
    marginTop: 8, padding: '15px 0', fontSize: 16, fontWeight: 700,
    borderRadius: 12, border: 'none', background: ORANGE, color: '#fff',
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(247,87,9,0.40)',
    minHeight: 52, width: '100%', letterSpacing: 0.2,
  },

  // Team
  teamName:   { fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' },
  teamCount:  { fontSize: 12, color: 'var(--text-3)', margin: 0, marginTop: 2 },
  joinAnotherBtn: {
    padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 8,
    border: `1px solid ${BLUE}44`, background: 'transparent', color: BLUE,
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: 0.1,
  },
  joinAnotherPanel: { marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' },
  joinInputSmall: {
    width: '100%', padding: '11px 14px', fontSize: 16, fontFamily: 'monospace',
    letterSpacing: 4, textAlign: 'center', borderRadius: 10,
    border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)',
    textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box', marginBottom: 8,
  },
  joinHeroCard: {
    background: 'var(--card)', borderRadius: 18, padding: 'clamp(16px, 4vw, 28px)',
    border: '1px solid var(--border)', borderLeft: `4px solid ${ORANGE}`,
    display: 'flex', flexDirection: 'column', gap: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  joinHeroLabel: { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 },
  joinHeroTitle: { fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 },
  joinHeroDesc:  { fontSize: 13, color: 'var(--text-2)', margin: '0 0 4px', lineHeight: 1.5 },
  joinFormStack: { display: 'flex', flexDirection: 'column', gap: 10 },
  joinInputLarge: {
    width: '100%', padding: '13px 18px', fontSize: 'clamp(18px, 5vw, 24px)',
    fontFamily: 'monospace', letterSpacing: 6, textAlign: 'center', borderRadius: 10,
    border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)',
    textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box',
  },
  joinBtnFull: {
    width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 700, borderRadius: 10,
    border: 'none', background: BLUE, color: '#fff', cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(48,142,189,0.30)', letterSpacing: 0.2,
  },
  joinError: { color: '#c73820', fontSize: 13, marginTop: 4 },

  // Survey badge
  surveyComplete:      { display: 'flex', alignItems: 'center', gap: 14 },
  checkIcon:           { width: 40, height: 40, borderRadius: '50%', background: 'rgba(48,142,189,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  surveyCompleteTitle: { fontWeight: 700, fontSize: 15, color: BLUE, margin: '0 0 2px' },
  surveyCompleteSub:   { fontSize: 13, color: 'var(--text-2)', margin: 0 },

  // Goals
  goalCardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  goalProgress:   { fontSize: 12, color: 'var(--text-3)', marginTop: 4 },
  addGoalBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 14px', fontSize: 13, fontWeight: 700, borderRadius: 10,
    border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 2px 8px rgba(247,87,9,0.25)', minHeight: 40,
  },
  progressTrack: { height: 4, background: 'var(--border)', borderRadius: 6, marginBottom: 12, overflow: 'hidden' },
  progressFill:  { height: '100%', background: BLUE, borderRadius: 4, transition: 'width 0.4s' },

  goalForm: {
    display: 'flex', flexDirection: 'column', gap: 8,
    background: 'var(--card-inner)', borderRadius: 12,
    padding: '12px 14px', marginBottom: 10, border: '1px solid var(--border)',
  },
  goalInput: {
    width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 10,
    border: '1px solid var(--input-border)', background: 'var(--input-bg)',
    color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  goalDateLabel: { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  goalFormRow:   { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  goalFormBtns:  { display: 'flex', gap: 8, flexShrink: 0, marginLeft: 'auto' },
  cancelGoalBtn: { padding: '10px 14px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer', minHeight: 42 },
  saveGoalBtn:   { padding: '10px 16px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(48,142,189,0.28)', minHeight: 42 },

  noGoals: { fontSize: 14, color: 'var(--text-3)', margin: 0 },
  goalList:{ display: 'flex', flexDirection: 'column', gap: 0 },
  goalRow: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '11px 0', borderBottom: '1px solid var(--border-light)' },
  checkBtn: {
    width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)',
    background: 'transparent', cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, transition: 'all 0.15s',
  },
  goalContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  goalTitle:   { fontSize: 14, fontWeight: 600, lineHeight: 1.4 },
  goalTarget:  { fontSize: 13, color: 'var(--text-2)' },
  goalDue:     { fontSize: 12, color: 'var(--text-3)' },
  deleteGoalBtn: {
    background: 'none', border: 'none', color: 'var(--text-3)',
    fontSize: 18, cursor: 'pointer', lineHeight: 1,
    padding: '4px 6px', flexShrink: 0,
    minWidth: 36, minHeight: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}
