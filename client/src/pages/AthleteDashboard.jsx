import { useState, useEffect } from 'react'
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
  const activeTeam     = teamCtx?.activeTeam     ?? null
  const teams          = teamCtx?.teams          ?? []
  const teamsLoading   = teamCtx?.teamsLoading   ?? false
  const setActiveTeamId = teamCtx?.setActiveTeamId ?? (() => {})
  const refreshTeams   = teamCtx?.refreshTeams   ?? (() => Promise.resolve())
  const navigate = useNavigate()
  const [survey, setSurvey] = useState(undefined)
  const [plan, setPlan] = useState(undefined)
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [showJoinAnother, setShowJoinAnother] = useState(false)
  const [showCheckin, setShowCheckin] = useState(false)

  // Goal form state
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDue, setGoalDue] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  useEffect(() => {
    // Check if athlete has done today's readiness check-in
    api.get('/api/checkins/today')
      .then(r => { if (!r.data.checkin) setShowCheckin(true) })
      .catch(() => {}) // don't block on failure

    Promise.all([
      api.get('/api/survey/my').then(r => r.data.survey).catch(() => null),
      api.get('/api/blueprints/my-plan').then(r => r.data.plan).catch(() => null),
      api.get('/api/goals').then(r => r.data.goals).catch(() => []),
    ]).then(([surveyData, planData, goalsData]) => {
      setSurvey(surveyData)
      setPlan(planData)
      setGoals(goalsData)

      // Seed suggested goals from survey if no goals exist yet
      if (goalsData.length === 0 && surveyData?.offseason_goals?.length > 0) {
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

  return (
    <div style={styles.container}>
      {showCheckin && (
        <ReadinessCheckin
          onComplete={({ is_rest_day }) => {
            setShowCheckin(false)
            if (!is_rest_day && plan) navigate('/athlete/plan')
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[90, 70, 80].map((w, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div className="skeleton" style={{ width: `${w}px`, height: 11, marginBottom: 10 }} />
              <div className="skeleton" style={{ width: '60%', height: 20, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '40%', height: 13 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.stack}>
          {/* Team card */}
          {teamsLoading ? (
            <div style={styles.card}>
              <p style={styles.loadingText}>Loading team…</p>
            </div>
          ) : activeTeam ? (
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
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
                  {showJoinAnother ? 'Cancel' : '+ Join another team'}
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
              <div className="action-row-mobile" style={styles.actionRow}>
                <div style={{ minWidth: 0 }}>
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
              <div className="action-row-mobile" style={styles.actionRow}>
                <div style={{ minWidth: 0 }}>
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

          {/* ── Goals card ── */}
          <div style={styles.card}>
            <div style={styles.goalCardHeader}>
              <div>
                <p style={{ ...styles.cardLabel, color: ORANGE, marginBottom: 0 }}>Offseason Goals</p>
                {goals.length > 0 && (
                  <p style={styles.goalProgress}>
                    {completedCount}/{goals.length} completed
                  </p>
                )}
              </div>
              <button
                style={styles.addGoalBtn}
                onClick={() => setShowGoalForm(s => !s)}
              >
                <PlusIcon size={14} color="#fff" />
                Add goal
              </button>
            </div>

            {/* Progress bar */}
            {goals.length > 0 && (
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${Math.round((completedCount / goals.length) * 100)}%` }} />
              </div>
            )}

            {/* Add goal form */}
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
                  <div style={{ flex: 1 }}>
                    <label style={styles.goalDateLabel}>Due date (optional)</label>
                    <input
                      type="date"
                      style={styles.goalInput}
                      value={goalDue}
                      onChange={e => setGoalDue(e.target.value)}
                    />
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
                  <GoalRow
                    key={goal.id}
                    goal={goal}
                    onToggle={handleToggleGoal}
                    onDelete={handleDeleteGoal}
                  />
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

  pageHeader: { marginBottom: 28 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  pageSub: { fontSize: 14, color: 'var(--text-2)', fontStyle: 'italic', margin: 0 },
  loadingText: { color: 'var(--text-3)', fontSize: 15 },

  stack: { display: 'flex', flexDirection: 'column', gap: 14 },

  card: {
    background: 'var(--card)',
    borderRadius: 16,
    padding: 24,
    border: '1px solid var(--border)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    margin: '0 0 8px',
  },
  teamName: { fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' },
  teamCount: { fontSize: 12, color: 'var(--text-3)', margin: 0, marginTop: 2 },
  joinAnotherBtn: {
    padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 8,
    border: `1px solid ${BLUE}44`, background: 'transparent', color: BLUE,
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: 0.1,
  },
  joinAnotherPanel: {
    marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)',
  },
  joinInputSmall: {
    width: '100%',
    padding: '11px 14px',
    fontSize: 16,
    fontFamily: 'monospace',
    letterSpacing: 4,
    textAlign: 'center',
    borderRadius: 10,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    textTransform: 'uppercase',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 8,
  },

  joinHeroCard: {
    background: 'var(--card)',
    borderRadius: 18,
    padding: '28px 28px 24px',
    border: '1px solid var(--border)',
    borderLeft: `4px solid ${ORANGE}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  joinHeroLabel: { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 },
  joinHeroTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 },
  joinHeroDesc: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 4px', lineHeight: 1.5 },
  joinFormStack: { display: 'flex', flexDirection: 'column', gap: 10 },
  joinInputLarge: {
    width: '100%',
    padding: '14px 18px',
    fontSize: 24,
    fontFamily: 'monospace',
    letterSpacing: 6,
    textAlign: 'center',
    borderRadius: 10,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    textTransform: 'uppercase',
    outline: 'none',
    boxSizing: 'border-box',
  },
  joinBtnFull: { width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 10px rgba(48,142,189,0.30)', letterSpacing: 0.2 },
  joinError: { color: '#c73820', fontSize: 13, marginTop: 4 },

  surveyComplete: { display: 'flex', alignItems: 'center', gap: 14 },
  checkIcon: { width: 40, height: 40, borderRadius: '50%', background: 'rgba(48,142,189,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  surveyCompleteTitle: { fontWeight: 700, fontSize: 15, color: BLUE, margin: '0 0 2px' },
  surveyCompleteSub: { fontSize: 13, color: 'var(--text-2)', margin: 0 },

  actionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  actionTitle: { fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: '0 0 3px' },
  actionSub: { fontSize: 13, color: 'var(--text-2)', margin: 0 },
  actionBtn: { padding: '12px 20px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 2px 8px rgba(247,87,9,0.28)', letterSpacing: 0.1, minHeight: 44 },

  planTitle: { fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: '2px 0' },
  planMeta: { fontSize: 13, color: 'var(--text-3)', margin: 0 },
  noPlan: { color: 'var(--text-3)', fontSize: 14 },

  // Goals
  goalCardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  goalProgress: { fontSize: 12, color: 'var(--text-3)', marginTop: 4 },
  addGoalBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(247,87,9,0.25)',
    minHeight: 44,
  },
  progressTrack: { height: 4, background: 'var(--border)', borderRadius: 6, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', background: BLUE, borderRadius: 4, transition: 'width 0.4s' },

  goalForm: { display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--card-inner)', borderRadius: 12, padding: '14px 16px', marginBottom: 12, border: '1px solid var(--border)' },
  goalInput: { width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  goalDateLabel: { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  goalFormRow: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  goalFormBtns: { display: 'flex', gap: 8, flexShrink: 0, marginLeft: 'auto' },
  cancelGoalBtn: { padding: '11px 16px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer', minHeight: 44 },
  saveGoalBtn: { padding: '11px 18px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(48,142,189,0.28)', minHeight: 44 },

  noGoals: { fontSize: 14, color: 'var(--text-3)', margin: 0 },
  goalList: { display: 'flex', flexDirection: 'column', gap: 0 },
  goalRow: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 0', borderBottom: '1px solid var(--border-light)' },
  checkBtn: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid var(--border)',
    background: 'transparent',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    marginTop: 0,
    transition: 'all 0.15s',
  },
  goalContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  goalTitle:  { fontSize: 14, fontWeight: 600, lineHeight: 1.4 },
  goalTarget: { fontSize: 13, color: 'var(--text-2)' },
  goalDue:    { fontSize: 12, color: 'var(--text-3)' },
  deleteGoalBtn: {
    background: 'none', border: 'none', color: 'var(--text-3)',
    fontSize: 18, cursor: 'pointer', lineHeight: 1,
    padding: '4px 6px', flexShrink: 0,
    minWidth: 36, minHeight: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}
