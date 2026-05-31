import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import AvatarUpload from '../components/AvatarUpload'
import { ChevronDownIcon, ChevronUpIcon, FileTextIcon, AlertIcon, ClipboardIcon, CheckIcon } from '../components/Icons'

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

    // Dismiss any pending injury notifications for this athlete (fire-and-forget)
    api.patch(`/api/notifications/dismiss-athlete/${id}`).catch(() => {})
  }, [id])

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
          <p style={{ ...styles.cardLabel, color: BLUE }}>Current Plan</p>
          <p style={styles.planName}>{plan.title}</p>
          {plan.description && <p style={styles.planDesc}>{plan.description}</p>}
          <p style={styles.planMeta}>
            {plan.num_weeks}-week plan · Started {fmtDate(plan.starts_on)}
            {currentWeek && ` · Week ${currentWeek}`}
          </p>
        </div>
      )}

      {/* Lifting Maxes */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <p style={{ ...styles.cardLabel, color: YELLOW }}>Lifting Maxes</p>
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
    borderRadius: 8,
    border: 'none',
    background: BLUE,
    color: '#fff',
    cursor: 'pointer',
  },
  goalViewRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' },
  goalDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  goalViewContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  goalViewTitle: { fontSize: 14, fontWeight: 600 },
  goalViewTarget: { fontSize: 13, color: 'var(--text-2)' },
  completedTag: { fontSize: 11, fontWeight: 700, color: '#2e7d32', background: '#e8f5e9', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 },

  athleteHeader: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  athleteName: { fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subline: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 2px' },
  surveyDate: { fontSize: 12, color: 'var(--text-3)', margin: 0 },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
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
  liftCard: { background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5 },
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
  injuryNotesBox: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px', marginBottom: 14 },
  injuryNotesLabel: { fontSize: 12, fontWeight: 700, color: '#92400e', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 },
  injuryNotesText: { fontSize: 14, color: '#451a03', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' },
  injuryContext: { background: '#fce8e6', border: '1px solid #f5c6c2', borderRadius: 8, padding: '12px 14px', marginBottom: 16 },
  injuryContextLabel: { fontSize: 12, fontWeight: 700, color: '#c73820', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.4 },
  injuryPill: { fontSize: 12, fontWeight: 600, background: '#f5c6c2', color: '#7f1d1d', padding: '3px 10px', borderRadius: 12 },
  injuryOther: { fontSize: 13, color: '#7f1d1d', fontStyle: 'italic', margin: '8px 0 0', lineHeight: 1.5 },
  noteLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  noteTextarea: { width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', lineHeight: 1.6 },
  noteSaveRow: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  noteTimestamp: { fontSize: 12, color: 'var(--text-3)', flex: 1 },
  noteSavedMsg: { fontSize: 12, fontWeight: 700, color: '#2e7d32', flex: 1 },
  noteSaveBtn: { padding: '8px 18px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', background: '#c73820', color: '#fff', cursor: 'pointer' },

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
}
