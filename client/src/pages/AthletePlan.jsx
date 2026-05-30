import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { DumbbellIcon } from '../components/Icons'
import SessionDescription from '../components/SessionDescription'

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

function ExerciseRow({ exercise, maxes }) {
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
        {note && <span style={exStyles.exerciseNote}> ({note})</span>}
      </div>
      <div style={exStyles.right}>
        <span style={exStyles.setsReps}>{setsRepsStr}</span>
        {weightLine && (
          <span style={maxLbs ? exStyles.weightCalc : exStyles.weightPrompt}>
            {weightLine}
          </span>
        )}
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

export default function AthletePlan() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState(undefined)
  const [logs, setLogs] = useState([])
  const [maxes, setMaxes] = useState({})
  const [injuryAreas, setInjuryAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(1)

  useEffect(() => {
    Promise.all([
      api.get('/api/blueprints/my-plan').then(r => r.data.plan).catch(() => null),
      api.get('/api/workouts/mine').then(r => r.data.logs).catch(() => []),
      api.get('/api/maxes').then(r => {
        const m = r.data.maxes || {}
        return m
      }).catch(err => {
        console.error('[AthletePlan] /api/maxes FAILED:', err?.response?.status, err?.message)
        return {}
      }),
      api.get('/api/survey/my').then(r => r.data.survey?.injury_areas || []).catch(() => []),
    ]).then(([planData, logsData, maxesData, injuryData]) => {
      setPlan(planData)
      setLogs(logsData)
      setMaxes(maxesData || {})
      setInjuryAreas(injuryData)
      if (planData) setCurrentWeek(calcCurrentWeek(planData.starts_on, planData.num_weeks))
    }).finally(() => setLoading(false))
  }, [])

  // ── Debug: log maxes whenever state updates ──────────────────────────────
  useEffect(() => {
    console.log('[AthletePlan] maxes state:', maxes)
    console.log('[AthletePlan] maxes keys:', Object.keys(maxes))
    const tbd = maxes?.trap_bar_deadlift
    const bp  = maxes?.bench_press
    const sq  = maxes?.squat
    console.log('[AthletePlan] trap_bar_deadlift →', tbd ? `current=${tbd.current?.weight_lbs ?? 'null'}` : 'KEY MISSING')
    console.log('[AthletePlan] bench_press        →', bp  ? `current=${bp.current?.weight_lbs  ?? 'null'}` : 'KEY MISSING')
    console.log('[AthletePlan] squat              →', sq  ? `current=${sq.current?.weight_lbs  ?? 'null'}` : 'KEY MISSING')
  }, [maxes])

  function getLog(weekId, sessionIndex) {
    return logs.find(l => l.blueprint_week_id === weekId && l.session_index === sessionIndex) || null
  }

  if (loading) return <div style={styles.center}>Loading…</div>

  const week = plan?.weeks?.find(w => w.week_number === currentWeek)

  return (
    <div style={styles.container}>
      {!plan ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <DumbbellIcon size={36} color="var(--text-3)" />
          </div>
          <h2 style={styles.emptyTitle}>No plan assigned yet</h2>
          <p style={styles.emptyDesc}>Your coach is working on your training plan. Check back soon.</p>
        </div>
      ) : (
        <>
          <div style={styles.planHeader}>
            <h1 style={styles.planTitle}>{plan.title}</h1>
            {plan.description && <p style={styles.planDesc}>{plan.description}</p>}
            <p style={styles.planMeta}>
              {plan.num_weeks}-week plan · Started{' '}
              {new Date(plan.starts_on).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>

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
                            {logged ? (
                              <span style={{ ...styles.logBadge, color: statusInfo.color, background: statusInfo.bg }}>
                                {statusInfo.label}{logged.effort ? ` · ${logged.effort}` : ''}
                              </span>
                            ) : (
                              <button
                                style={styles.logBtn}
                                onClick={() => navigate('/athlete/log', {
                                  state: {
                                    weekId: week.id,
                                    sessionIndex: i,
                                    focus: s.focus,
                                    day: s.day,
                                    description: s.description,
                                    exercises: s.exercises || [],
                                  },
                                })}
                              >
                                Log session
                              </button>
                            )}
                          </div>
                          {s.exercises && s.exercises.length > 0 ? (
                            <div style={styles.exerciseList}>
                              {s.exercises.map((ex, ei) => (
                                <ExerciseRow key={ei} exercise={ex} maxes={maxes} />
                              ))}
                            </div>
                          ) : s.description ? (
                            <SessionDescription description={s.description} injuryAreas={injuryAreas} maxes={maxes} style={styles.sessionDesc} />
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

  planHeader: { marginBottom: 28 },
  planTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 6 },
  planDesc: { color: 'var(--text-2)', fontSize: 15, marginBottom: 6 },
  planMeta: { color: 'var(--text-3)', fontSize: 13 },

  weekNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: '8px 20px', fontSize: 18, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', lineHeight: 1, transition: 'opacity 0.15s' },
  weekInfo: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  weekLabel: { fontSize: 18, fontWeight: 700, color: 'var(--text)' },
  weekOf: { fontSize: 12, color: 'var(--text-3)' },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 },
  objectiveBlock: { background: 'rgba(48,142,189,0.08)', borderLeft: `3px solid ${BLUE}`, padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: 20 },
  objectiveLabel: { fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 4px' },
  objectiveText: { fontSize: 15, color: 'var(--text)', margin: 0 },
  emptyWeek: { color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '20px 0' },

  sessionList: { display: 'flex', flexDirection: 'column', gap: 12 },
  sessionCard: { background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 },
  sessionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' },
  sessionDay: { fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', background: 'rgba(48,142,189,0.1)', padding: '3px 8px', borderRadius: 4 },
  sessionFocus: { fontSize: 15, fontWeight: 700, color: 'var(--text)', flex: 1 },
  sessionDesc: { fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 },
  exerciseList: { marginTop: 4 },
  logBtn: { marginLeft: 'auto', padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  logBadge: { marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0 },

  weekDots: { display: 'flex', justifyContent: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: '50%', background: 'var(--border)', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform 0.15s' },
  dotActive: { background: BLUE, transform: 'scale(1.4)' },
  dotPast: { background: 'var(--text-3)' },
}
