import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import AvatarUpload from '../components/AvatarUpload'
import { ChevronDownIcon, ChevronUpIcon, FileTextIcon, AlertIcon, ClipboardIcon, CheckIcon, XIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const LIFTS = [
  { key: 'bench_press',       label: 'Bench Press' },
  { key: 'squat',             label: 'Squat' },
  { key: 'deadlift',          label: 'Deadlift' },
  { key: 'trap_bar_deadlift', label: 'Trap Bar Deadlift' },
  { key: 'overhead_press',    label: 'Overhead Press' },
  { key: 'power_clean',       label: 'Power Clean' },
  { key: 'hang_clean',        label: 'Hang Clean' },
  { key: 'clean',             label: 'Clean' },
  { key: 'front_squat',       label: 'Front Squat' },
  { key: 'romanian_deadlift', label: 'Romanian Deadlift' },
  { key: 'reverse_lunge',     label: 'Reverse Lunge' },
]

const LOG_STATUS = {
  completed:       { label: 'Completed',        color: '#2e7d32', bg: '#e8f5e9' },
  partial:         { label: 'Partial',          color: '#b45309', bg: '#fef3c7' },
  skipped:         { label: 'Skipped',          color: '#888',    bg: '#f0f0f0' },
  skipped_injury:  { label: 'Skipped — Injury', color: '#c73820', bg: '#fce8e6' },
}

/** Split a workout note into flagged injury exercises and a free-text note. */
function parseLogNote(rawNote) {
  if (!rawNote) return { injuryExercises: [], freeNote: null }
  const PREFIX = '⚠️ Cannot complete:'
  if (!rawNote.startsWith(PREFIX)) return { injuryExercises: [], freeNote: rawNote }
  const nlIdx = rawNote.indexOf('\n\n')
  const prefixLine = nlIdx > 0 ? rawNote.slice(0, nlIdx) : rawNote
  const rest = nlIdx > 0 ? rawNote.slice(nlIdx + 2).trim() : ''
  const exStr = prefixLine.slice(PREFIX.length).trim()
  return {
    injuryExercises: exStr.split(',').map(s => s.trim()).filter(Boolean),
    freeNote: rest || null,
  }
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtShortDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function calcCurrentWeek(startsOn, numWeeks) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - new Date(startsOn).getTime()
  const week = Math.floor(elapsed / msPerWeek) + 1
  return Math.min(Math.max(week, 1), numWeeks)
}

// ─── Performance metric display helpers (coach read-only) ─────────────────────

const PERF_METRICS_COACH = {
  forty_yard_dash:     { name: '40 Yard Dash',            unit: 'seconds',     lowerIsBetter: true  },
  thirty_yard_dash:    { name: '30 Yard Dash',            unit: 'seconds',     lowerIsBetter: true  },
  sixty_yard_dash:     { name: '60 Yard Dash',            unit: 'seconds',     lowerIsBetter: true  },
  ten_yard_split:      { name: '10 Yard Split',           unit: 'seconds',     lowerIsBetter: true  },
  pro_agility:         { name: 'Pro Agility 5-10-5',      unit: 'seconds',     lowerIsBetter: true  },
  three_cone:          { name: '3 Cone L Drill',          unit: 'seconds',     lowerIsBetter: true  },
  vertical_jump:       { name: 'Vertical Jump',           unit: 'inches',      lowerIsBetter: false },
  broad_jump:          { name: 'Broad Jump',              unit: 'feet_inches', lowerIsBetter: false },
  standing_long_jump:  { name: 'Standing Long Jump',      unit: 'feet_inches', lowerIsBetter: false },
  box_jump:            { name: 'Box Jump Height',         unit: 'inches',      lowerIsBetter: false },
  exit_velocity:       { name: 'Exit Velocity',           unit: 'mph',         lowerIsBetter: false },
  pitch_velocity:      { name: 'Pitch Velocity',          unit: 'mph',         lowerIsBetter: false },
  shot_put:            { name: 'Shot Put Distance',       unit: 'feet_inches', lowerIsBetter: false },
  discus:              { name: 'Discus Distance',         unit: 'feet_inches', lowerIsBetter: false },
  javelin:             { name: 'Javelin Distance',        unit: 'feet_inches', lowerIsBetter: false },
  mile_time:           { name: 'Mile Time',               unit: 'min_sec',     lowerIsBetter: true  },
  four_hundred_meter:  { name: '400 Meter',               unit: 'seconds',     lowerIsBetter: true  },
  eight_hundred_meter: { name: '800 Meter',               unit: 'min_sec',     lowerIsBetter: true  },
  bench_225_reps:      { name: '225 lb Bench Press Reps', unit: 'reps',        lowerIsBetter: false },
}

const THROWING_SUB_TYPES_COACH = {
  infield:          { name: 'Infield Velocity',        unit: 'mph',     lowerIsBetter: false },
  outfield:         { name: 'Outfield Velocity',       unit: 'mph',     lowerIsBetter: false },
  football_pass:    { name: 'Football Pass Velocity',  unit: 'mph',     lowerIsBetter: false },
  lacrosse_throw:   { name: 'Lacrosse Throw Velocity', unit: 'mph',     lowerIsBetter: false },
  catcher_pop_time: { name: 'Catcher Pop Time',        unit: 'seconds', lowerIsBetter: true  },
}

function getPerfDefCoach(sel) {
  if (sel.metric_id === 'throwing_velocity' && sel.sub_type_id) {
    const st = THROWING_SUB_TYPES_COACH[sel.sub_type_id]
    if (!st) return null
    return { name: `Throwing Velocity — ${st.name}`, unit: st.unit, lowerIsBetter: st.lowerIsBetter }
  }
  return PERF_METRICS_COACH[sel.metric_id] || null
}

function fmtPerfCoach(val, unit) {
  if (val == null) return '—'
  const n = Number(val)
  if (unit === 'feet_inches') { const ft = Math.floor(n / 12); const inch = parseFloat((n % 12).toFixed(1)); return `${ft}' ${inch}"` }
  if (unit === 'min_sec')     { const min = Math.floor(n / 60); const sec = (n % 60).toFixed(2).padStart(5, '0'); return `${min}:${sec}` }
  if (unit === 'seconds') return `${n}s`
  if (unit === 'inches')  return `${n}"`
  if (unit === 'mph')     return `${n} mph`
  if (unit === 'reps')    return `${n} reps`
  return String(n)
}

export default function AthleteProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [athlete, setAthlete] = useState(null)
  const [maxes, setMaxes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(
    Object.fromEntries(LIFTS.map(l => [l.key, false]))
  )
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [noteUpdatedAt, setNoteUpdatedAt] = useState(null)
  const [goals, setGoals] = useState([])

  // Performance PRs (coach read-only)
  const [perfSelections, setPerfSelections]   = useState([])
  const [perfHistOpen,   setPerfHistOpen]     = useState({})
  const [perfHistData,   setPerfHistData]     = useState({})

  // ── Edit plan state ──────────────────────────────────────────────────────────
  const [editingPlan, setEditingPlan] = useState(false)
  const [planOverrides, setPlanOverrides] = useState(null)   // { coach_note, removed_exercises }
  const [assignmentId, setAssignmentId] = useState(null)
  const [overridesLoading, setOverridesLoading] = useState(false)
  const [savingOverrides, setSavingOverrides] = useState(false)
  const [overridesSaved, setOverridesSaved] = useState(false)
  // Edit form values
  const [editNote, setEditNote] = useState('')
  const [removedExercises, setRemovedExercises] = useState({}) // { "w1_s0_line0": true }

  useEffect(() => {
    Promise.all([
      api.get(`/api/athletes/${id}`).then(r => r.data.athlete),
      api.get(`/api/maxes/${id}`).then(r => r.data.maxes).catch(() => null),
      api.get(`/api/goals/athlete/${id}`).then(r => r.data.goals).catch(() => []),
    ])
      .then(([athleteData, maxesData, goalsData]) => {
        setAthlete(athleteData)
        setMaxes(maxesData)
        setNoteText(athleteData.coach_note || '')
        setNoteUpdatedAt(athleteData.coach_note_updated_at || null)
        setGoals(goalsData)
      })
      .catch(err => setError(err.response?.data?.error || 'Could not load profile.'))
      .finally(() => setLoading(false))

    api.get(`/api/performance/athlete/${id}`)
      .then(r => setPerfSelections(r.data.selections || []))
      .catch(() => {})

    // Dismiss any pending injury notifications for this athlete (fire-and-forget)
    api.patch(`/api/notifications/dismiss-athlete/${id}`).catch(() => {})
  }, [id])

  async function handleTogglePerfHistoryCoach(selId) {
    if (perfHistOpen[selId]) {
      setPerfHistOpen(prev => ({ ...prev, [selId]: false }))
      return
    }
    setPerfHistOpen(prev => ({ ...prev, [selId]: true }))
    if (!perfHistData[selId]) {
      try {
        const res = await api.get(`/api/performance/athlete/${id}/selections/${selId}/history`)
        setPerfHistData(prev => ({ ...prev, [selId]: res.data.history || [] }))
      } catch (err) {
        console.error('[perf history coach]', err)
      }
    }
  }

  async function handleOpenEditPlan() {
    setEditingPlan(true)
    setOverridesLoading(true)
    try {
      const res = await api.get(`/api/blueprints/overrides/${id}`)
      const existing = res.data.overrides
      setAssignmentId(res.data.assignmentId)
      if (existing) {
        setPlanOverrides(existing)
        setEditNote(existing.coach_note || '')
        setRemovedExercises(existing.removed_exercises || {})
      } else {
        setPlanOverrides({})
        setEditNote('')
        setRemovedExercises({})
      }
    } catch (e) {
      console.error('Failed to load overrides:', e)
    } finally {
      setOverridesLoading(false)
    }
  }

  async function handleSavePlanOverrides() {
    if (!assignmentId) return
    setSavingOverrides(true)
    setOverridesSaved(false)
    try {
      const overrides = { coach_note: editNote.trim(), removed_exercises: removedExercises }
      await api.post(`/api/blueprints/overrides/${id}`, { assignment_id: assignmentId, overrides })
      setPlanOverrides(overrides)
      setOverridesSaved(true)
      setTimeout(() => { setOverridesSaved(false); setEditingPlan(false) }, 1500)
    } catch (e) {
      console.error('Failed to save overrides:', e)
    } finally {
      setSavingOverrides(false)
    }
  }

  function toggleExerciseRemoval(weekNum, sessionIdx, lineIdx) {
    const key = `w${weekNum}_s${sessionIdx}_l${lineIdx}`
    setRemovedExercises(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSaveNote() {
    setNoteSaving(true)
    setNoteSaved(false)
    try {
      const res = await api.put(`/api/athletes/${id}/notes`, { note: noteText })
      setNoteUpdatedAt(res.data.updated_at)
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 3000)
    } catch (e) {
      console.error('Note save failed:', e)
    } finally {
      setNoteSaving(false)
    }
  }

  if (loading) return <div style={styles.center}>Loading…</div>
  if (error)   return <div style={styles.center}>{error}</div>
  if (!athlete) return null

  const { survey, plan, logs } = athlete
  const currentWeek = plan ? calcCurrentWeek(plan.starts_on, plan.num_weeks) : null
  const hasAnyMax = maxes && LIFTS.some(l => maxes[l.key]?.current)

  const surveyFields = [
    { key: 'goals',          label: 'Goals' },
    { key: 'weaknesses',     label: 'Weaknesses' },
    { key: 'injury_history', label: 'Injury History' },
  ]

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.backLink} onClick={() => navigate('/coach/athletes')}>
          ← Athletes
        </button>
        <button
          style={styles.reportBtn}
          onClick={() => navigate(`/coach/athletes/${id}/report`)}
        >
          <FileTextIcon size={14} color="#fff" />
          End of Offseason Report
        </button>
      </div>

      {/* Athlete header */}
      <div style={styles.athleteHeader}>
        <AvatarUpload
          name={athlete.full_name}
          avatarUrl={athlete.avatar_url}
          size={56}
          color={ORANGE}
          editable={false}
        />
        <div>
          <h1 style={styles.athleteName}>{athlete.full_name}</h1>
          {survey && (
            <p style={styles.subline}>
              {[survey.sport, survey.position, survey.time_per_week ? `${survey.time_per_week} days/wk` : null]
                .filter(Boolean).join(' · ')}
            </p>
          )}
          {survey?.completed_at && (
            <p style={styles.surveyDate}>Survey completed {fmtDate(survey.completed_at)}</p>
          )}
        </div>
      </div>

      {/* Survey card */}
      <div style={styles.card}>
        <p style={styles.cardLabel}>Athlete Survey</p>
        {!survey ? (
          <p style={styles.empty}>Survey not completed yet.</p>
        ) : (
          <>
            {/* Physical stats inline */}
            {(survey.height_feet != null || survey.weight_lbs != null) && (
              <div style={{ display: 'flex', gap: 24, marginBottom: 18, flexWrap: 'wrap' }}>
                {survey.height_feet != null && (
                  <div>
                    <p style={styles.fieldLabel}>Height</p>
                    <p style={{ ...styles.fieldValue, fontSize: 20, fontWeight: 700 }}>
                      {survey.height_feet}' {survey.height_inches ?? 0}"
                    </p>
                  </div>
                )}
                {survey.weight_lbs != null && (
                  <div>
                    <p style={styles.fieldLabel}>Weight</p>
                    <p style={{ ...styles.fieldValue, fontSize: 20, fontWeight: 700 }}>
                      {survey.weight_lbs} lbs
                    </p>
                  </div>
                )}
              </div>
            )}
            {surveyFields.map(f => survey[f.key] ? (
              <div key={f.key} style={styles.surveyField}>
                <p style={styles.fieldLabel}>{f.label}</p>
                <p style={styles.fieldValue}>{survey[f.key]}</p>
              </div>
            ) : null)}
            {survey.equipment?.length > 0 && (
              <div style={styles.surveyField}>
                <p style={styles.fieldLabel}>Equipment</p>
                <div style={styles.pillRow}>
                  {survey.equipment.map((eq, i) => (
                    <span key={i} style={styles.pill}>{eq}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Plan card */}
      {plan && (
        <div style={{ ...styles.card, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ ...styles.cardLabel, color: BLUE }}>Current Plan</p>
              <p style={styles.planName}>{plan.title}</p>
              {plan.description && <p style={styles.planDesc}>{plan.description}</p>}
              <p style={styles.planMeta}>
                {plan.num_weeks}-week plan · Started {fmtDate(plan.starts_on)}
                {currentWeek && ` · Week ${currentWeek}`}
              </p>
            </div>
            <button
              style={styles.editPlanBtn}
              onClick={handleOpenEditPlan}
            >
              Edit Plan
            </button>
          </div>

          {/* Plan override summary */}
          {planOverrides?.coach_note && !editingPlan && (
            <div style={styles.overrideNoteBox}>
              <p style={styles.overrideNoteLabel}>Coach note for this athlete</p>
              <p style={styles.overrideNoteText}>{planOverrides.coach_note}</p>
            </div>
          )}
          {planOverrides && Object.values(planOverrides.removed_exercises || {}).some(Boolean) && !editingPlan && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
              {Object.values(planOverrides.removed_exercises).filter(Boolean).length} exercise{Object.values(planOverrides.removed_exercises).filter(Boolean).length !== 1 ? 's' : ''} removed for this athlete
            </p>
          )}
        </div>
      )}

      {/* Edit plan panel */}
      {editingPlan && plan && (
        <div style={{ ...styles.card, marginTop: 14, border: `2px solid ${BLUE}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ ...styles.cardLabel, color: BLUE, margin: 0 }}>Editing Plan for {athlete.full_name}</p>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '4px 8px' }}
              onClick={() => setEditingPlan(false)}
            >
              Cancel
            </button>
          </div>

          {/* Coach note for athlete */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.noteLabel}>Private note for this athlete's plan</label>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 8px' }}>
              This will be visible to the athlete when they view their plan.
            </p>
            <textarea
              style={styles.noteTextarea}
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              placeholder="e.g. Modified for your shoulder — skip any overhead pressing this phase."
              rows={3}
            />
          </div>

          {/* Exercise toggles per session */}
          {overridesLoading ? (
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading exercises…</p>
          ) : (
            <div>
              <p style={{ ...styles.noteLabel, marginBottom: 12 }}>Toggle exercises to remove for this athlete</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {plan.weeks?.slice(0, 1).map(week => (
                  <div key={week.week_number}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      Week {week.week_number} (applies to all weeks)
                    </p>
                    {(week.sessions || []).map((session, si) => {
                      const lines = (session.description || '').split('\n').filter(l => l.trim())
                      return (
                        <div key={si} style={{ marginBottom: 12 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: BLUE, marginBottom: 6 }}>
                            {session.day} — {session.focus}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {lines.map((line, li) => {
                              const key = `w${week.week_number}_s${si}_l${li}`
                              const removed = !!removedExercises[key]
                              return (
                                <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <button
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 4,
                                      border: `2px solid ${removed ? '#c73820' : 'var(--border)'}`,
                                      background: removed ? '#c73820' : 'transparent',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                      padding: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 10,
                                      color: '#fff',
                                      fontWeight: 700,
                                    }}
                                    onClick={() => toggleExerciseRemoval(week.week_number, si, li)}
                                    title={removed ? 'Click to restore' : 'Click to remove'}
                                  >
                                    {removed ? <XIcon size={11} color="currentColor" /> : null}
                                  </button>
                                  <span style={{
                                    fontSize: 13,
                                    color: removed ? 'var(--text-3)' : 'var(--text-2)',
                                    textDecoration: removed ? 'line-through' : 'none',
                                    flex: 1,
                                  }}>
                                    {line}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, fontStyle: 'italic' }}>
                Removals apply to all weeks of the plan for this athlete.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
            <button
              style={{ ...styles.noteSaveBtn, opacity: savingOverrides ? 0.6 : 1 }}
              onClick={handleSavePlanOverrides}
              disabled={savingOverrides}
            >
              {savingOverrides ? 'Saving…' : overridesSaved ? '✓ Saved' : 'Save Changes'}
            </button>
            <button
              style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' }}
              onClick={() => setEditingPlan(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Strength PRs */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <p style={{ ...styles.cardLabel, color: YELLOW }}>Strength PRs</p>
        {!hasAnyMax ? (
          <p style={styles.empty}>No maxes logged yet.</p>
        ) : (
          <div style={styles.maxesGrid}>
            {LIFTS.map(({ key, label }) => {
              const liftData = maxes?.[key]
              const current = liftData?.current
              const history = liftData?.history || []
              const isHistOpen = historyOpen[key]

              return (
                <div key={key} style={styles.liftCard}>
                  <div style={styles.liftTop}>
                    <span style={styles.liftLabel}>{label}</span>
                    {current ? (
                      <span style={styles.liftPR}>
                        {current.weight_lbs} <span style={styles.liftUnit}>lbs{current.reps > 1 ? ` x ${current.reps}` : ''}</span>
                      </span>
                    ) : (
                      <span style={styles.liftNone}>—</span>
                    )}
                  </div>

                  {current ? (
                    <p style={styles.liftDate}>Set {fmtShortDate(current.logged_at)}{current.notes ? ` · ${current.notes}` : ''}</p>
                  ) : (
                    <p style={styles.liftEmpty}>No data</p>
                  )}

                  {history.length > 1 && (
                    <button
                      style={styles.historyToggle}
                      onClick={() => setHistoryOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                    >
                      {isHistOpen
                        ? <><ChevronUpIcon size={12} color="var(--text-3)" /> Hide</>
                        : <><ChevronDownIcon size={12} color="var(--text-3)" /> History ({history.length})</>
                      }
                    </button>
                  )}

                  {isHistOpen && history.length > 0 && (
                    <div style={styles.historyList}>
                      {[...history].reverse().map(entry => (
                        <div key={entry.id} style={styles.historyRow}>
                          <span style={{
                            ...styles.historyWeight,
                            color: entry.id === current?.id ? ORANGE : 'var(--text)',
                            fontWeight: entry.id === current?.id ? 700 : 600,
                          }}>
                            {entry.weight_lbs} lbs{entry.reps > 1 ? ` x ${entry.reps}` : ''}
                            {entry.id === current?.id && <span style={styles.prTag}> PR</span>}
                          </span>
                          <span style={styles.historyDate}>{fmtShortDate(entry.logged_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Performance PRs */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <p style={{ ...styles.cardLabel, color: BLUE }}>Performance PRs</p>
        {perfSelections.length === 0 ? (
          <p style={styles.empty}>No performance metrics selected by this athlete yet.</p>
        ) : (
          <div style={styles.maxesGrid}>
            {perfSelections.map(sel => {
              const def    = getPerfDefCoach(sel)
              if (!def) return null
              const pr      = sel.performance_prs?.[0] ?? null
              const bestVal = pr ? Number(pr.best_value) : null
              const hist    = perfHistData[sel.id] || []

              return (
                <div key={sel.id} style={styles.liftCard}>
                  <div style={styles.liftTop}>
                    <span style={styles.liftLabel}>{def.name}</span>
                    {bestVal !== null && (
                      <span style={{ ...styles.liftPR, fontSize: String(fmtPerfCoach(bestVal, def.unit)).length > 7 ? 14 : 20 }}>
                        {fmtPerfCoach(bestVal, def.unit)}
                      </span>
                    )}
                  </div>
                  {pr ? (
                    <p style={styles.liftDate}>Set {fmtShortDate(pr.updated_at)}</p>
                  ) : (
                    <p style={styles.liftEmpty}>No data</p>
                  )}

                  <button style={styles.historyToggle} onClick={() => handleTogglePerfHistoryCoach(sel.id)}>
                    {perfHistOpen[sel.id]
                      ? <><ChevronUpIcon size={12} color="var(--text-3)" /> Hide</>
                      : <><ChevronDownIcon size={12} color="var(--text-3)" /> History</>}
                  </button>

                  {perfHistOpen[sel.id] && (
                    <div style={styles.historyList}>
                      {hist.length === 0 ? (
                        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Loading…</p>
                      ) : hist.map((entry, i) => (
                        <div key={entry.id} style={styles.historyRow}>
                          <span style={{ ...styles.historyWeight, color: i === 0 ? ORANGE : 'var(--text)', fontWeight: i === 0 ? 700 : 600 }}>
                            {fmtPerfCoach(entry.value, def.unit)}
                            {i === 0 && <span style={styles.prTag}> PR</span>}
                          </span>
                          <span style={styles.historyDate}>{fmtShortDate(entry.logged_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Goals */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <p style={{ ...styles.cardLabel, color: '#F75709' }}>Offseason Goals</p>
        {goals.length === 0 ? (
          <p style={styles.empty}>No goals set yet.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                {goals.filter(g => g.completed).length}/{goals.length} completed
              </span>
            </div>
            {goals.map(goal => (
              <div key={goal.id} style={styles.goalViewRow}>
                <span style={{
                  ...styles.goalDot,
                  background: goal.completed ? '#2e7d32' : 'var(--border)',
                }} />
                <div style={styles.goalViewContent}>
                  <span style={{
                    ...styles.goalViewTitle,
                    textDecoration: goal.completed ? 'line-through' : 'none',
                    color: goal.completed ? 'var(--text-3)' : 'var(--text)',
                  }}>
                    {goal.title}
                  </span>
                  {goal.target && <span style={styles.goalViewTarget}>{goal.target}</span>}
                </div>
                {goal.completed && (
                  <span style={styles.completedTag}>
                    <CheckIcon size={11} color="#2e7d32" /> Done
                  </span>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Coach Notes */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <p style={{ ...styles.cardLabel, color: '#c73820' }}>Coach Notes <span style={styles.privateTag}>private</span></p>

        {/* Athlete's own injury notes — top of coach notes */}
        {survey?.injury_notes && (
          <div style={styles.injuryNotesBox}>
            <p style={styles.injuryNotesLabel}><ClipboardIcon size={13} color="#c73820" /> Athlete's Injury Notes</p>
            <p style={styles.injuryNotesText}>{survey.injury_notes}</p>
          </div>
        )}

        {/* Injury context from survey */}
        {survey && (() => {
          const areas = (survey.injury_areas || []).filter(a => a && a !== 'None')
          const hasInjury = areas.length > 0 || survey.injury_other
          return hasInjury ? (
            <div style={styles.injuryContext}>
              <p style={styles.injuryContextLabel}><AlertIcon size={13} color="#c73820" /> Athlete reported injury</p>
              {areas.length > 0 && (
                <div style={styles.pillRow}>
                  {areas.map((a, i) => (
                    <span key={i} style={styles.injuryPill}>{a}</span>
                  ))}
                </div>
              )}
              {survey.injury_other && (
                <p style={styles.injuryOther}>"{survey.injury_other}"</p>
              )}
            </div>
          ) : (
            <p style={{ ...styles.empty, marginBottom: 14 }}>No injury reported in survey.</p>
          )
        })()}

        <label style={styles.noteLabel}>Your private notes</label>
        <textarea
          style={styles.noteTextarea}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Add notes about this athlete's injury, training modifications, or anything else…"
          rows={4}
        />
        <div style={styles.noteSaveRow}>
          {noteUpdatedAt && !noteSaved && (
            <span style={styles.noteTimestamp}>Last saved {fmtDate(noteUpdatedAt)}</span>
          )}
          {noteSaved && <span style={styles.noteSavedMsg}><CheckIcon size={13} color="#2e7d32" /> Saved</span>}
          <button
            style={{ ...styles.noteSaveBtn, opacity: noteSaving ? 0.6 : 1 }}
            onClick={handleSaveNote}
            disabled={noteSaving}
          >
            {noteSaving ? 'Saving…' : 'Save Notes'}
          </button>
        </div>
      </div>

      {/* Log history */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <div style={styles.logHeader}>
          <p style={styles.cardLabel}>Session Log</p>
          {logs.length > 0 && (
            <span style={styles.logCount}>{logs.length} session{logs.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {logs.length === 0 ? (
          <p style={styles.empty}>No sessions logged yet.</p>
        ) : (
          <div style={styles.logList}>
            {logs.map((log, i) => {
              const s = LOG_STATUS[log.status] || LOG_STATUS.skipped
              return (
                <div key={log.id} style={{ ...styles.logRow, borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={styles.logTop}>
                    <span style={{ ...styles.logBadge, color: s.color, background: s.bg }}>{s.label}</span>
                    {log.session_focus && <span style={styles.logFocus}>{log.session_focus}</span>}
                    {log.effort != null && <span style={styles.logEffort}>· {log.effort}/10</span>}
                    {log.week_number != null && <span style={styles.logWeek}>Wk {log.week_number}</span>}
                    <span style={styles.logDate}>{fmtDate(log.logged_at)}</span>
                  </div>
                  {log.note && (() => {
                    const { injuryExercises, freeNote } = parseLogNote(log.note)
                    return (
                      <>
                        {injuryExercises.length > 0 && (
                          <div style={styles.injuryExRow}>
                            <span style={styles.injuryExLabel}><AlertIcon size={12} color="#c73820" /> Cannot complete:</span>
                            <div style={styles.injuryExPills}>
                              {injuryExercises.map(ex => (
                                <span key={ex} style={styles.injuryExPill}>{ex}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {freeNote && <p style={styles.logNote}>"{freeNote}"</p>}
                      </>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  center: { color: 'var(--text-3)', fontSize: 15 },
  container: { maxWidth: 700, margin: '0 auto' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backLink: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  reportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: BLUE,
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(48,142,189,0.30)',
  },
  goalViewRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' },
  goalDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  goalViewContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  goalViewTitle: { fontSize: 14, fontWeight: 600 },
  goalViewTarget: { fontSize: 13, color: 'var(--text-2)' },
  completedTag: { fontSize: 11, fontWeight: 700, color: '#2e7d32', background: '#e8f5e9', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 },

  athleteHeader: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24, flexWrap: 'wrap' },
  athleteName: { fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subline: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 2px' },
  surveyDate: { fontSize: 12, color: 'var(--text-3)', margin: 0 },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 'clamp(16px, 4vw, 24px)', boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)' },
  cardLabel: { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 16px' },
  empty: { color: 'var(--text-3)', fontSize: 14, margin: 0 },

  surveyField: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 4px' },
  fieldValue: { fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: 0 },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: { fontSize: 12, fontWeight: 600, background: 'var(--border)', color: 'var(--text-2)', padding: '3px 10px', borderRadius: 12 },

  planName: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  planDesc: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 6px' },
  planMeta: { fontSize: 13, color: 'var(--text-3)', margin: 0 },

  maxesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  liftCard: { background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5, boxShadow: '0 1px 4px rgba(0,0,0,0.14)' },
  liftTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  liftLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4 },
  liftPR: { fontSize: 20, fontWeight: 700, color: ORANGE, lineHeight: 1 },
  liftUnit: { fontSize: 11, fontWeight: 600, color: 'var(--text-3)' },
  liftNone: { fontSize: 18, fontWeight: 700, color: 'var(--text-3)' },
  liftDate: { fontSize: 11, color: 'var(--text-3)', margin: 0 },
  liftEmpty: { fontSize: 12, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' },

  historyToggle: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 },
  historyList: { borderTop: '1px solid var(--border-light)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  historyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyWeight: { fontSize: 13, lineHeight: 1.4 },
  prTag: { fontSize: 10, fontWeight: 700, color: ORANGE, background: 'rgba(247,87,9,0.12)', padding: '1px 5px', borderRadius: 3 },
  historyDate: { fontSize: 11, color: 'var(--text-3)' },

  privateTag: { fontSize: 10, fontWeight: 700, color: '#888', background: 'var(--border)', borderRadius: 4, padding: '1px 6px', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.3, verticalAlign: 'middle' },
  injuryNotesBox: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginBottom: 14 },
  injuryNotesLabel: { fontSize: 12, fontWeight: 700, color: '#92400e', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 },
  injuryNotesText: { fontSize: 14, color: '#451a03', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' },
  injuryContext: { background: '#fce8e6', border: '1px solid #f5c6c2', borderRadius: 10, padding: '12px 14px', marginBottom: 16 },
  injuryContextLabel: { fontSize: 12, fontWeight: 700, color: '#c73820', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.4 },
  injuryPill: { fontSize: 12, fontWeight: 600, background: '#f5c6c2', color: '#7f1d1d', padding: '3px 10px', borderRadius: 12 },
  injuryOther: { fontSize: 13, color: '#7f1d1d', fontStyle: 'italic', margin: '8px 0 0', lineHeight: 1.5 },
  noteLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  noteTextarea: { width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', lineHeight: 1.6 },
  noteSaveRow: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  noteTimestamp: { fontSize: 12, color: 'var(--text-3)', flex: 1 },
  noteSavedMsg: { fontSize: 12, fontWeight: 700, color: '#2e7d32', flex: 1 },
  noteSaveBtn: { padding: '8px 18px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: '#c73820', color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(199,56,32,0.28)' },

  logHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logCount: { fontSize: 13, color: 'var(--text-3)' },
  logList: { display: 'flex', flexDirection: 'column' },
  logRow: { padding: '12px 0' },
  logTop: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  logBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' },
  logFocus: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  logEffort: { fontSize: 13, color: 'var(--text-2)' },
  logWeek: { fontSize: 11, color: 'var(--text-3)', background: 'var(--border)', padding: '2px 6px', borderRadius: 3 },
  logDate: { fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' },
  logNote: { fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', margin: '6px 0 0', lineHeight: 1.5 },
  injuryExRow: { display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  injuryExLabel: { fontSize: 12, fontWeight: 700, color: '#c73820', whiteSpace: 'nowrap', paddingTop: 2 },
  injuryExPills: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  injuryExPill: { fontSize: 11, fontWeight: 700, color: '#7f1d1d', background: '#fce8e6', border: '1px solid #f5c6c2', borderRadius: 10, padding: '2px 8px' },

  editPlanBtn: {
    padding: '7px 16px',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 8,
    border: `1px solid ${BLUE}`,
    background: 'transparent',
    color: BLUE,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  overrideNoteBox: {
    marginTop: 14,
    background: 'rgba(48,142,189,0.06)',
    border: `1px solid rgba(48,142,189,0.25)`,
    borderRadius: 10,
    padding: '10px 14px',
  },
  overrideNoteLabel: { fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 4px' },
  overrideNoteText: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 },
}
