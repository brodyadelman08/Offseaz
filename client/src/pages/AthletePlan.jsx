import { useState, useEffect } from 'react'
import api from '../services/api'
import { DumbbellIcon } from '../components/Icons'
import SessionDescription from '../components/SessionDescription'
import PreviewBanner from '../components/PreviewBanner'
import { useTeam } from '../context/TeamContext'

const BLUE   = '#308EBD'
const ORANGE = '#F75709'

const LIFT_LABELS = {
  bench_press:       'Bench Press',
  squat:             'Squat',
  deadlift:          'Deadlift',
  trap_bar_deadlift: 'Trap Bar Deadlift',
  overhead_press:    'Overhead Press',
  power_clean:       'Power Clean',
  hang_clean:        'Hang Clean',
  clean:             'Clean',
  front_squat:       'Front Squat',
  romanian_deadlift: 'Romanian Deadlift',
  reverse_lunge:     'Reverse Lunge',
}

/** Round to nearest 5 lbs */
function calcWeight(maxLbs, pct) {
  return Math.round((maxLbs * pct) / 5) * 5
}

function ExerciseRow({ exercise, maxes, locked = false }) {
  const { name, sets, reps, pct, lift_key, warmup, note } = exercise
  const maxEntry = lift_key ? maxes?.[lift_key]?.current : null
  const maxLbs   = maxEntry?.weight_lbs

  let weightLine = null
  if (pct && lift_key) {
    if (maxLbs) {
      const w = calcWeight(maxLbs, pct)
      weightLine = `at ${Math.round(pct * 100)}% of your max → ${w} lbs`
    } else {
      weightLine = `Log your ${LIFT_LABELS[lift_key] || lift_key} max to see your personalized weight`
    }
  }

  const setsRepsStr = warmup
    ? `${warmup} warmup, ${sets}×${reps} working`
    : `${sets}×${reps}`

  return (
    <div style={exStyles.row}>
      <div style={exStyles.left}>
        <span style={exStyles.exerciseName}>{name}</span>
        {!locked && note && <span style={exStyles.exerciseNote}> ({note})</span>}
      </div>
      <div style={exStyles.right}>
        <span style={exStyles.setsReps}>{setsRepsStr}</span>
        {locked && pct ? (
          /* Replace weight line with a locked placeholder */
          <span style={exStyles.lockedWeight}>🔒 ██ lbs · unlock to see</span>
        ) : weightLine ? (
          <span style={maxLbs ? exStyles.weightCalc : exStyles.weightPrompt}>
            {weightLine}
          </span>
        ) : null}
      </div>
    </div>
  )
}

const exStyles = {
  row:           { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border-light)' },
  left:          { flex: 1 },
  right:         { textAlign: 'right', flexShrink: 0 },
  exerciseName:  { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  exerciseNote:  { fontSize: 13, color: 'var(--text-3)' },
  setsReps:      { display: 'block', fontSize: 13, color: 'var(--text-2)' },
  weightCalc:    { display: 'block', fontSize: 12, fontWeight: 700, color: ORANGE, marginTop: 2 },
  weightPrompt:  { display: 'block', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 2, maxWidth: 200 },
  lockedWeight:  { display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2, letterSpacing: 0.5, userSelect: 'none' },
}

function calcCurrentWeek(startsOn, numWeeks) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - new Date(startsOn).getTime()
  const week = Math.floor(elapsed / msPerWeek) + 1
  return Math.min(Math.max(week, 1), numWeeks)
}

const LOG_STATUS = {
  completed:       { label: 'Completed',        color: '#2e7d32', bg: '#e8f5e9' },
  partial:         { label: 'Partial',          color: '#b45309', bg: '#fef3c7' },
  skipped:         { label: 'Skipped',          color: '#888',    bg: '#f0f0f0' },
  skipped_injury:  { label: 'Skipped — Injury', color: '#c73820', bg: '#fce8e6' },
}

// ── Sub-component: renders one plan's week navigator + content ──────────────

function PlanView({ plan, currentWeek, setCurrentWeek, logs, maxes, injuryAreas, locked = false }) {
  const week = plan?.weeks?.find(w => w.week_number === currentWeek)

  function getLog(weekId, sessionIndex) {
    return logs.find(l => l.blueprint_week_id === weekId && l.session_index === sessionIndex) || null
  }

  return (
    <>
      <p style={styles.planMeta}>
        {plan.num_weeks}-week plan · Started{' '}
        {new Date(plan.starts_on).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })}
      </p>

      {/* Week navigator */}
      <div style={styles.weekNav}>
        <button
          style={{ ...styles.navBtn, opacity: currentWeek === 1 ? 0.3 : 1 }}
          onClick={() => setCurrentWeek(w => Math.max(1, w - 1))}
          disabled={currentWeek === 1}
        >
          ←
        </button>
        <div style={styles.weekInfo}>
          <span style={styles.weekLabel}>Week {currentWeek}</span>
          <span style={styles.weekOf}>of {plan.num_weeks}</span>
        </div>
        <button
          style={{ ...styles.navBtn, opacity: currentWeek === plan.num_weeks ? 0.3 : 1 }}
          onClick={() => setCurrentWeek(w => Math.min(plan.num_weeks, w + 1))}
          disabled={currentWeek === plan.num_weeks}
        >
          →
        </button>
      </div>

      {/* Current week card */}
      <div style={styles.card}>
        {!week ? (
          <p style={styles.emptyWeek}>No content for this week yet.</p>
        ) : (
          <>
            {week.objective && (
              <div style={styles.objectiveBlock}>
                <p style={styles.objectiveLabel}>This Week's Focus</p>
                <p style={styles.objectiveText}>{week.objective}</p>
              </div>
            )}
            {week.sessions.length === 0 ? (
              <p style={styles.emptyWeek}>No sessions scheduled this week.</p>
            ) : (
              <div style={styles.sessionList}>
                {week.sessions.map((s, i) => {
                  const logged = getLog(week.id, i)
                  const statusInfo = logged ? LOG_STATUS[logged.status] : null
                  return (
                    <div key={i} style={styles.sessionCard}>
                      <div style={styles.sessionHeader}>
                        <span style={styles.sessionDay}>{s.day || `Session ${i + 1}`}</span>
                        <span style={styles.sessionFocus}>{s.focus}</span>
                        {logged && statusInfo && (
                          <span style={{ ...styles.logBadge, color: statusInfo.color, background: statusInfo.bg }}>
                            {statusInfo.label}{logged.effort ? ` · ${logged.effort}` : ''}
                          </span>
                        )}
                      </div>
                      {s.exercises && s.exercises.length > 0 ? (
                        <div style={styles.exerciseList}>
                          {s.exercises.map((ex, ei) => (
                            <ExerciseRow key={ei} exercise={ex} maxes={maxes} locked={locked} />
                          ))}
                        </div>
                      ) : s.description ? (
                        locked ? (
                          <div style={styles.lockedDesc}>
                            🔒 Detailed coaching notes unlock when you join your team
                          </div>
                        ) : (
                          <SessionDescription description={s.description} injuryAreas={injuryAreas} maxes={maxes} style={styles.sessionDesc} />
                        )
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Week dots */}
      <div style={styles.weekDots}>
        {Array.from({ length: plan.num_weeks }, (_, i) => i + 1).map(n => {
          const isPast = n < calcCurrentWeek(plan.starts_on, plan.num_weeks)
          return (
            <button
              key={n}
              style={{
                ...styles.dot,
                ...(n === currentWeek ? styles.dotActive : {}),
                ...(isPast && n !== currentWeek ? styles.dotPast : {}),
              }}
              onClick={() => setCurrentWeek(n)}
              title={`Week ${n}`}
            />
          )
        })}
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AthletePlan() {
  const activeTeam = useTeam()?.activeTeam ?? null
  const hasTeam = Boolean(activeTeam)

  const [coachPlan, setCoachPlan]  = useState(undefined)
  const [autoPlan,  setAutoPlan]   = useState(undefined)
  const [logs,        setLogs]     = useState([])
  const [maxes,       setMaxes]    = useState({})
  const [injuryAreas, setInjuryAreas] = useState([])
  const [loading,     setLoading]  = useState(true)
  const [currentWeekCoach, setCurrentWeekCoach] = useState(1)
  const [currentWeekAuto,  setCurrentWeekAuto]  = useState(1)

  useEffect(() => {
    Promise.all([
      api.get('/api/blueprints/my-plan')
        .then(r => ({ auto: r.data.auto_plan || null, coach: r.data.coach_plan || null }))
        .catch(() => ({ auto: null, coach: null })),
      api.get('/api/workouts/mine').then(r => r.data.logs).catch(() => []),
      api.get('/api/maxes').then(r => r.data.maxes || {}).catch(() => ({})),
      api.get('/api/survey/my').then(r => r.data.survey?.injury_areas || []).catch(() => []),
    ]).then(([plans, logsData, maxesData, injuryData]) => {
      setCoachPlan(plans.coach)
      setAutoPlan(plans.auto)
      setLogs(logsData)
      setMaxes(maxesData)
      setInjuryAreas(injuryData)
      if (plans.coach) setCurrentWeekCoach(calcCurrentWeek(plans.coach.starts_on, plans.coach.num_weeks))
      if (plans.auto)  setCurrentWeekAuto(calcCurrentWeek(plans.auto.starts_on,   plans.auto.num_weeks))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.center}>Loading…</div>

  const hasAny = coachPlan || autoPlan

  // No team + no plan at all = haven't taken survey yet
  if (!hasAny && !hasTeam) {
    return (
      <div style={styles.container}>
        <PreviewBanner noun="training plan" />
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <DumbbellIcon size={36} color="var(--text-3)" />
          </div>
          <h2 style={styles.emptyTitle}>Complete your survey to preview your plan</h2>
          <p style={styles.emptyDesc}>
            We'll generate a personalized training plan matched to your sport and goals.
            You can preview it now and unlock the full version when you join your coach's team.
          </p>
        </div>
      </div>
    )
  }

  // Has a team but no plan yet
  if (!hasAny && hasTeam) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <DumbbellIcon size={36} color="var(--text-3)" />
          </div>
          <h2 style={styles.emptyTitle}>No plan assigned yet</h2>
          <p style={styles.emptyDesc}>Your coach is working on your training plan. Check back soon.</p>
        </div>
      </div>
    )
  }

  // Locked preview: has auto plan but no team
  const previewMode = !hasTeam && Boolean(autoPlan)

  return (
    <div style={styles.container}>

      {/* ── Preview banner (shown when athlete has no team) ─────────────── */}
      {previewMode && <PreviewBanner noun="training plan" />}

      {/* ── Coach plan section ─────────────────────────────────────────── */}
      {hasTeam && (
        coachPlan ? (
          <div style={styles.planSection}>
            <div style={styles.labelRow}>
              <span style={styles.coachLabel}>📋 Assigned by Coach — {coachPlan.title}</span>
            </div>
            <PlanView
              plan={coachPlan}
              currentWeek={currentWeekCoach}
              setCurrentWeek={setCurrentWeekCoach}
              logs={logs}
              maxes={maxes}
              injuryAreas={injuryAreas}
            />
          </div>
        ) : (
          <div style={styles.noCoachNotice}>
            Your coach has not assigned a training plan yet.
          </div>
        )
      )}

      {/* ── Auto-generated plan section ────────────────────────────────── */}
      {autoPlan && (
        <div style={styles.planSection}>
          <div style={styles.labelRow}>
            <span style={previewMode ? styles.previewLabel : styles.autoLabel}>
              {previewMode ? '👁 Preview — ' : '⚡ '}
              {previewMode ? `${autoPlan.title}` : 'Personalized Plan — Generated from Your Survey'}
            </span>
          </div>
          <PlanView
            plan={autoPlan}
            currentWeek={currentWeekAuto}
            setCurrentWeek={setCurrentWeekAuto}
            logs={previewMode ? [] : logs}
            maxes={previewMode ? {} : maxes}
            injuryAreas={injuryAreas}
            locked={previewMode}
          />
        </div>
      )}

    </div>
  )
}

const styles = {
  center: { color: 'var(--text-3)', fontSize: 15 },
  container: { maxWidth: 660, margin: '0 auto' },

  emptyState: { textAlign: 'center', paddingTop: 80 },
  emptyIcon: { display: 'flex', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  emptyDesc: { color: 'var(--text-2)', fontSize: 15 },

  planSection: { marginBottom: 40 },
  labelRow: { marginBottom: 14 },
  coachLabel: {
    display: 'inline-block', fontSize: 13, fontWeight: 700, color: BLUE,
    background: 'rgba(48,142,189,0.12)', border: '1px solid rgba(48,142,189,0.25)',
    padding: '6px 16px', borderRadius: 20, letterSpacing: 0.2,
  },
  autoLabel: {
    display: 'inline-block', fontSize: 13, fontWeight: 700, color: ORANGE,
    background: 'rgba(247,87,9,0.08)', border: '1px solid rgba(247,87,9,0.2)',
    padding: '6px 16px', borderRadius: 20, letterSpacing: 0.2,
  },
  previewLabel: {
    display: 'inline-block', fontSize: 13, fontWeight: 700, color: 'var(--text-3)',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    padding: '6px 16px', borderRadius: 20, letterSpacing: 0.2,
  },
  lockedDesc: {
    fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic',
    padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
    borderRadius: 8, marginTop: 6, userSelect: 'none',
  },
  noCoachNotice: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
    padding: '16px 20px', marginBottom: 28, color: 'var(--text-2)', fontSize: 14,
    fontStyle: 'italic',
  },

  planMeta: { color: 'var(--text-3)', fontSize: 13, margin: '0 0 16px' },

  weekNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: '8px 20px', fontSize: 18, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', lineHeight: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.18)' },
  weekInfo: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  weekLabel: { fontSize: 18, fontWeight: 700, color: 'var(--text)' },
  weekOf: { fontSize: 12, color: 'var(--text-3)' },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)' },
  objectiveBlock: { background: 'rgba(48,142,189,0.08)', borderLeft: `3px solid ${BLUE}`, padding: '12px 16px', borderRadius: '0 12px 12px 0', marginBottom: 20 },
  objectiveLabel: { fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 4px' },
  objectiveText: { fontSize: 15, color: 'var(--text)', margin: 0 },
  emptyWeek: { color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '20px 0' },

  sessionList: { display: 'flex', flexDirection: 'column', gap: 12 },
  sessionCard: {
    background: 'linear-gradient(135deg, rgba(48,142,189,0.04) 0%, var(--card-inner) 100%)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  sessionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' },
  sessionDay: { fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', background: 'rgba(48,142,189,0.12)', padding: '3px 8px', borderRadius: 6, letterSpacing: 0.3 },
  sessionFocus: { fontSize: 15, fontWeight: 700, color: 'var(--text)', flex: 1 },
  sessionDesc: { fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 },
  exerciseList: { marginTop: 4 },
  logBadge: { marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 },

  weekDots: { display: 'flex', justifyContent: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: '50%', background: 'var(--border)', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform 0.15s' },
  dotActive: { background: BLUE, transform: 'scale(1.4)' },
  dotPast: { background: 'var(--text-3)' },
}
