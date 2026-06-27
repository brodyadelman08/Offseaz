import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { FlameIcon, CalendarIcon, EditIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon, ClipboardIcon, BoltIcon } from '../components/Icons'
import AvatarUpload from '../components/AvatarUpload'
import PRCelebration from '../components/PRCelebration'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const LOG_STATUS = {
  completed: { label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
  partial:   { label: 'Partial',   color: '#b45309', bg: '#fef3c7' },
  skipped:   { label: 'Skipped',   color: '#888',    bg: '#f0f0f0' },
}

// TODO: allow custom athlete-defined lift names to reduce profile clutter
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

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtShortDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

export default function AthleteMyProfile() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState(null)
  const [coachPlan, setCoachPlan] = useState(null)
  const [autoPlan,  setAutoPlan]  = useState(null)
  const [logs, setLogs] = useState([])
  const [maxes, setMaxes] = useState(null)
  const [loading, setLoading] = useState(true)

  // Per-lift form state: { bench_press: { open: false, weight: '', notes: '' }, ... }
  const [logForms, setLogForms] = useState(
    Object.fromEntries(LIFTS.map(l => [l.key, { open: false, weight: '', reps: '1', notes: '' }]))
  )
  // History expand state: { bench_press: false, ... }
  const [historyOpen, setHistoryOpen] = useState(
    Object.fromEntries(LIFTS.map(l => [l.key, false]))
  )
  const [submitting, setSubmitting] = useState(null) // lift key being submitted
  const [saveErrors, setSaveErrors] = useState({})   // { [liftKey]: errorString }
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [prCelebration, setPrCelebration] = useState(null) // { lift, newWeight, previousBest }
  const [physicalEditing, setPhysicalEditing] = useState(false)
  const [physicalForm, setPhysicalForm] = useState({ height_feet: '', height_inches: '', weight_lbs: '' })
  const [savingPhysical, setSavingPhysical] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/survey/my').then(r => r.data.survey).catch(() => null),
      api.get('/api/blueprints/my-plan')
        .then(r => ({ auto: r.data.auto_plan || null, coach: r.data.coach_plan || null }))
        .catch(() => ({ auto: null, coach: null })),
      api.get('/api/workouts/mine').then(r => r.data.logs).catch(() => []),
      api.get('/api/maxes').then(r => r.data.maxes).catch(() => null),
    ]).then(([s, plans, l, m]) => {
      setSurvey(s)
      setCoachPlan(plans.coach)
      setAutoPlan(plans.auto)
      setLogs(l)
      setMaxes(m)
    }).finally(() => setLoading(false))
  }, [])

  function openPhysicalEdit() {
    setPhysicalForm({
      height_feet:   survey?.height_feet   != null ? String(survey.height_feet)   : '',
      height_inches: survey?.height_inches != null ? String(survey.height_inches) : '',
      weight_lbs:    survey?.weight_lbs    != null ? String(survey.weight_lbs)    : '',
    })
    setPhysicalEditing(true)
  }

  async function handleSavePhysical() {
    setSavingPhysical(true)
    try {
      const res = await api.patch('/api/survey/physical', {
        height_feet:   physicalForm.height_feet   !== '' ? parseInt(physicalForm.height_feet)   : null,
        height_inches: physicalForm.height_inches !== '' ? parseInt(physicalForm.height_inches) : null,
        weight_lbs:    physicalForm.weight_lbs    !== '' ? parseInt(physicalForm.weight_lbs)    : null,
      })
      setSurvey(res.data.survey)
      setPhysicalEditing(false)
    } catch (err) {
      console.error('Failed to save physical stats:', err)
    } finally {
      setSavingPhysical(false)
    }
  }

  async function handlePrivacyToggle() {
    const newVal = profile?.privacy_team === 'private' ? 'public' : 'private'
    setSavingPrivacy(true)
    try {
      await api.patch('/api/auth/privacy', { privacy_team: newVal })
      updateProfile({ privacy_team: newVal })
    } catch (err) {
      console.error('Failed to update privacy:', err)
    } finally {
      setSavingPrivacy(false)
    }
  }

  async function handleLogMax(liftKey) {
    const form = logForms[liftKey]
    const w = parseFloat(form.weight)
    if (!w || w <= 0) return
    setSubmitting(liftKey)
    setSaveErrors(prev => ({ ...prev, [liftKey]: null }))
    try {
      const postRes = await api.post('/api/maxes', { lift: liftKey, weight_lbs: w, reps: parseInt(form.reps) || 1, notes: form.notes || null })
      const res = await api.get('/api/maxes')
      setMaxes(res.data.maxes)
      setLogForms(prev => ({ ...prev, [liftKey]: { open: false, weight: '', reps: '1', notes: '' } }))
      if (postRes.data.is_pr) {
        setPrCelebration({ lift: liftKey, newWeight: w, previousBest: postRes.data.previous_best ?? null })
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save. Please try again.'
      console.error('Failed to log max:', err)
      setSaveErrors(prev => ({ ...prev, [liftKey]: msg }))
    } finally {
      setSubmitting(null)
    }
  }

  const completedSessions = logs.filter(l => l.status === 'completed').length
  const avgEffort = logs.filter(l => l.effort != null).length > 0
    ? (logs.filter(l => l.effort != null).reduce((a, b) => a + b.effort, 0) /
       logs.filter(l => l.effort != null).length).toFixed(1)
    : null

  if (loading) return <div style={styles.loading}>Loading…</div>

  return (
    <div style={styles.container}>
      {prCelebration && (
        <PRCelebration
          lift={prCelebration.lift}
          newWeight={prCelebration.newWeight}
          previousBest={prCelebration.previousBest}
          athleteName={profile?.full_name}
          sport={survey?.sport}
          onClose={() => setPrCelebration(null)}
        />
      )}

      {/* Profile header */}
      <div style={styles.profileHeader}>
        <AvatarUpload
          name={profile?.full_name}
          avatarUrl={profile?.avatar_url}
          size={64}
          color={ORANGE}
          editable={true}
          onUpload={(url) => updateProfile({ avatar_url: url })}
        />
        <div>
          <h1 style={styles.name}>{profile?.full_name}</h1>
          {survey && (
            <p style={styles.subline}>
              {[survey.sport, survey.position, survey.time_per_week ? `${survey.time_per_week} days/wk` : null]
                .filter(Boolean).join(' · ')}
            </p>
          )}
          <p style={styles.photoHint}>Click avatar to update photo</p>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderLeft: `3px solid ${ORANGE}` }}>
          <span style={styles.statVal}>{logs.length}</span>
          <span style={styles.statLabel}>Total sessions</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: `3px solid ${BLUE}` }}>
          <span style={{ ...styles.statVal, color: completedSessions > 0 ? BLUE : 'var(--text)' }}>
            {completedSessions}
          </span>
          <span style={styles.statLabel}>Completed</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: `3px solid ${YELLOW}` }}>
          <span style={{ ...styles.statVal, color: avgEffort ? YELLOW : 'var(--text)', textShadow: avgEffort ? '0 0 12px rgba(240,190,36,0.5)' : 'none' }}>
            {avgEffort ?? '—'}
          </span>
          <span style={styles.statLabel}>Avg effort</span>
        </div>
      </div>

      {/* Survey card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <p style={styles.cardLabel}>Athlete Survey</p>
          <button style={styles.editBtn} onClick={() => navigate('/survey', { state: { retake: true } })}>
            <EditIcon size={14} color={BLUE} />
            Retake
          </button>
        </div>
        {!survey ? (
          <div style={styles.emptyAction}>
            <p style={styles.emptyText}>Survey not completed yet.</p>
            <button style={styles.primaryBtn} onClick={() => navigate('/survey')}>
              Complete profile
            </button>
          </div>
        ) : (
          <>
            {[
              { label: 'Goals',          val: survey.goals },
              { label: 'Weaknesses',     val: survey.weaknesses },
              { label: 'Injury History', val: survey.injury_history },
            ].map(f => f.val ? (
              <div key={f.label} style={styles.surveyField}>
                <p style={styles.fieldLabel}>{f.label}</p>
                <p style={styles.fieldValue}>{f.val}</p>
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

      {/* Physical Stats */}
      {survey && (
        <div style={{ ...styles.card, marginTop: 14 }}>
          <div style={styles.cardHeader}>
            <p style={{ ...styles.cardLabel, color: BLUE }}>Physical Stats</p>
            {!physicalEditing && (
              <button style={styles.editBtn} onClick={openPhysicalEdit}>
                <EditIcon size={14} color={BLUE} />
                Edit
              </button>
            )}
          </div>
          {physicalEditing ? (
            <div style={styles.physicalForm}>
              <div style={styles.physicalRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.physicalLabel}>Height</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      style={{ ...styles.physicalInput, width: 70 }}
                      type="number"
                      placeholder="ft"
                      min="3" max="8"
                      value={physicalForm.height_feet}
                      onChange={e => setPhysicalForm(p => ({ ...p, height_feet: e.target.value }))}
                    />
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }}>ft</span>
                    <input
                      style={{ ...styles.physicalInput, width: 70 }}
                      type="number"
                      placeholder="in"
                      min="0" max="11"
                      value={physicalForm.height_inches}
                      onChange={e => setPhysicalForm(p => ({ ...p, height_inches: e.target.value }))}
                    />
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }}>in</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.physicalLabel}>Weight</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      style={{ ...styles.physicalInput, width: 100 }}
                      type="number"
                      placeholder="lbs"
                      min="50" max="500"
                      value={physicalForm.weight_lbs}
                      onChange={e => setPhysicalForm(p => ({ ...p, weight_lbs: e.target.value }))}
                    />
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }}>lbs</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  style={{ ...styles.saveBtn, maxWidth: 100, opacity: savingPhysical ? 0.6 : 1 }}
                  onClick={handleSavePhysical}
                  disabled={savingPhysical}
                >
                  {savingPhysical ? 'Saving…' : 'Save'}
                </button>
                <button style={styles.cancelBtn} onClick={() => setPhysicalEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.physicalDisplay}>
              <div style={styles.physicalStat}>
                <span style={styles.physicalStatLabel}>Height</span>
                <span style={styles.physicalStatVal}>
                  {survey.height_feet != null
                    ? `${survey.height_feet}' ${survey.height_inches ?? 0}"`
                    : <span style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: 14 }}>Not set</span>}
                </span>
              </div>
              <div style={styles.physicalStat}>
                <span style={styles.physicalStatLabel}>Weight</span>
                <span style={styles.physicalStatVal}>
                  {survey.weight_lbs != null
                    ? `${survey.weight_lbs} lbs`
                    : <span style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: 14 }}>Not set</span>}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Training plan */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <div style={styles.cardHeader}>
          <p style={{ ...styles.cardLabel, color: BLUE }}>Training Plan</p>
          <button style={styles.editBtn} onClick={() => navigate('/athlete/plan')}>
            <CalendarIcon size={14} color={BLUE} />
            View plan
          </button>
        </div>

        {!coachPlan && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic', margin: autoPlan ? '0 0 16px' : '0' }}>
            Your coach has not assigned a training plan yet.
          </p>
        )}

        {coachPlan && (
          <div style={{ marginBottom: autoPlan ? 18 : 0 }}>
            <span style={styles.coachBadge}><ClipboardIcon size={12} color="#308EBD" /> Assigned by Coach</span>
            <p style={{ ...styles.planName, marginTop: 8 }}>{coachPlan.title}</p>
            <p style={styles.planMeta}>{coachPlan.num_weeks}-week plan · Started {fmtDate(coachPlan.starts_on)}</p>
          </div>
        )}

        {autoPlan && (
          <div>
            <span style={styles.autoBadge}><BoltIcon size={12} color="#F75709" /> Personalized Plan — Generated from Your Survey</span>
            <p style={{ ...styles.planName, marginTop: 8 }}>{autoPlan.title}</p>
            <p style={styles.planMeta}>{autoPlan.num_weeks}-week plan · Started {fmtDate(autoPlan.starts_on)}</p>
          </div>
        )}
      </div>

      {/* ── Lifting Maxes ───────────────────────────────────────────────── */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <p style={{ ...styles.cardLabel, color: ORANGE }}>Lifting Maxes</p>
        <div style={styles.maxesGrid}>
          {LIFTS.map(({ key, label }) => {
            const liftData = maxes?.[key]
            const current = liftData?.current
            const history = liftData?.history || []
            const form = logForms[key]
            const isHistOpen = historyOpen[key]
            const isSubmitting = submitting === key

            return (
              <div key={key} style={styles.liftCard}>
                {/* Lift header */}
                <div style={styles.liftTop}>
                  <span style={styles.liftLabel}>{label}</span>
                  {current && (
                    <span style={styles.liftPR}>
                      {current.weight_lbs} <span style={styles.liftUnit}>lbs{current.reps > 1 ? ` x ${current.reps}` : ''}</span>
                    </span>
                  )}
                </div>

                {/* Current PR detail */}
                {current ? (
                  <p style={styles.liftDate}>Set {fmtShortDate(current.logged_at)}{current.notes ? ` · ${current.notes}` : ''}</p>
                ) : (
                  <p style={styles.liftEmpty}>No max logged yet</p>
                )}

                {/* Log form toggle */}
                {!form.open ? (
                  <button
                    style={styles.logPRBtn}
                    onClick={() => setLogForms(prev => ({ ...prev, [key]: { ...prev[key], open: true } }))}
                  >
                    <PlusIcon size={13} color={ORANGE} />
                    Log PR
                  </button>
                ) : (
                  <div style={styles.logForm}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        style={{ ...styles.weightInput, flex: 2 }}
                        type="number"
                        placeholder="Weight (lbs)"
                        min="1"
                        max="2000"
                        step="0.5"
                        value={form.weight}
                        onChange={e => {
                          setLogForms(prev => ({ ...prev, [key]: { ...prev[key], weight: e.target.value } }))
                          setSaveErrors(prev => ({ ...prev, [key]: null }))
                        }}
                      />
                      <input
                        style={{ ...styles.weightInput, flex: 1 }}
                        type="number"
                        placeholder="Reps"
                        min="1"
                        max="100"
                        value={form.reps}
                        onChange={e => setLogForms(prev => ({ ...prev, [key]: { ...prev[key], reps: e.target.value } }))}
                      />
                    </div>
                    <input
                      style={styles.notesInput}
                      type="text"
                      placeholder="Notes (optional)"
                      value={form.notes}
                      onChange={e => setLogForms(prev => ({ ...prev, [key]: { ...prev[key], notes: e.target.value } }))}
                    />
                    {saveErrors[key] && (
                      <p style={styles.saveError}>{saveErrors[key]}</p>
                    )}
                    <div style={styles.logFormBtns}>
                      <button
                        style={{ ...styles.saveBtn, opacity: (!form.weight || isSubmitting) ? 0.6 : 1 }}
                        disabled={!form.weight || isSubmitting}
                        onClick={() => handleLogMax(key)}
                      >
                        {isSubmitting ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        style={styles.cancelBtn}
                        onClick={() => {
                          setLogForms(prev => ({ ...prev, [key]: { open: false, weight: '', reps: '1', notes: '' } }))
                          setSaveErrors(prev => ({ ...prev, [key]: null }))
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* History toggle */}
                {history.length > 1 && (
                  <button
                    style={styles.historyToggle}
                    onClick={() => setHistoryOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                  >
                    {isHistOpen
                      ? <><ChevronUpIcon size={12} color="var(--text-3)" /> Hide history</>
                      : <><ChevronDownIcon size={12} color="var(--text-3)" /> History ({history.length})</>
                    }
                  </button>
                )}

                {/* History list */}
                {isHistOpen && history.length > 0 && (
                  <div style={styles.historyList}>
                    {[...history].reverse().map((entry, i) => (
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
      </div>

      {/* Privacy settings */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <p style={{ ...styles.cardLabel, color: 'var(--text-3)' }}>Privacy</p>
        <div style={styles.privacyRow}>
          <div>
            <p style={styles.privacyTitle}>
              {profile?.privacy_team === 'private' ? 'Private' : 'Public to Team'}
            </p>
            <p style={styles.privacySub}>
              {profile?.privacy_team === 'private'
                ? 'Teammates can only see your name and avatar.'
                : 'Teammates can view your survey, lifting PRs, and activity stats.'}
            </p>
          </div>
          <button
            style={{
              ...styles.privacyBtn,
              borderColor: profile?.privacy_team === 'private' ? BLUE : 'var(--border)',
              color: profile?.privacy_team === 'private' ? BLUE : 'var(--text-2)',
            }}
            onClick={handlePrivacyToggle}
            disabled={savingPrivacy}
          >
            {savingPrivacy
              ? 'Saving…'
              : profile?.privacy_team === 'private'
                ? 'Make Public'
                : 'Make Private'}
          </button>
        </div>
      </div>

      {/* Session log */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <div style={styles.cardHeader}>
          <p style={{ ...styles.cardLabel, color: YELLOW }}>Session Log</p>
          {logs.length > 0 && (
            <span style={styles.logCount}>{logs.length} sessions</span>
          )}
        </div>
        {logs.length === 0 ? (
          <p style={styles.emptyText}>No sessions logged yet.</p>
        ) : (
          <div style={styles.logList}>
            {logs.map((log, i) => {
              const s = LOG_STATUS[log.status] || LOG_STATUS.skipped
              return (
                <div
                  key={log.id}
                  style={{ ...styles.logRow, borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}
                >
                  <div style={styles.logTop}>
                    <span style={{ ...styles.logBadge, color: s.color, background: s.bg }}>{s.label}</span>
                    {log.session_focus && <span style={styles.logFocus}>{log.session_focus}</span>}
                    {log.effort != null && <span style={styles.logEffort}>{log.effort}/10</span>}
                    {log.week_number != null && <span style={styles.logWeek}>Wk {log.week_number}</span>}
                    <span style={styles.logDate}>{fmtDate(log.logged_at)}</span>
                  </div>
                  {log.note && <p style={styles.logNote}>"{log.note}"</p>}
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
  loading: { color: 'var(--text-3)', fontSize: 15 },
  container: { maxWidth: 700, margin: '0 auto' },

  profileHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' },
  name: { fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subline: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 2px' },
  photoHint: { fontSize: 11, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.04)' },
  statVal: { fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  statLabel: { fontSize: 12, color: 'var(--text-3)' },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 'clamp(16px, 4vw, 24px)', boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardLabel: { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 },
  editBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: BLUE, background: 'none', border: `1px solid ${BLUE}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', transition: 'background 0.15s' },
  logCount: { fontSize: 13, color: 'var(--text-3)' },

  emptyAction: { display: 'flex', flexDirection: 'column', gap: 14 },
  emptyText: { color: 'var(--text-3)', fontSize: 14, margin: 0 },
  primaryBtn: { alignSelf: 'flex-start', padding: '9px 18px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(247,87,9,0.28)' },

  surveyField: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 4px' },
  fieldValue: { fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: 0 },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: { fontSize: 12, fontWeight: 600, background: 'var(--border)', color: 'var(--text-2)', padding: '3px 10px', borderRadius: 12 },

  planName: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  planMeta: { fontSize: 13, color: 'var(--text-3)', margin: 0 },
  coachBadge: {
    display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#308EBD',
    background: 'rgba(48,142,189,0.12)', padding: '3px 12px', borderRadius: 12,
  },
  autoBadge: {
    display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#F75709',
    background: 'rgba(247,87,9,0.08)', padding: '3px 12px', borderRadius: 12,
  },

  // Physical stats
  physicalDisplay: { display: 'flex', gap: 32, flexWrap: 'wrap' },
  physicalStat: { display: 'flex', flexDirection: 'column', gap: 4 },
  physicalStatLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 },
  physicalStatVal: { fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  physicalForm: { display: 'flex', flexDirection: 'column', gap: 4 },
  physicalRow: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  physicalLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  physicalInput: { padding: '7px 10px', fontSize: 14, borderRadius: 6, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' },

  // Maxes
  maxesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  liftCard: { background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.14)' },
  liftTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  liftLabel: { fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4 },
  liftPR: { fontSize: 22, fontWeight: 700, color: ORANGE, lineHeight: 1 },
  liftUnit: { fontSize: 12, fontWeight: 600, color: 'var(--text-3)' },
  liftDate: { fontSize: 11, color: 'var(--text-3)', margin: 0 },
  liftEmpty: { fontSize: 12, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' },

  logPRBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: ORANGE, background: 'rgba(247,87,9,0.08)', border: `1px solid rgba(247,87,9,0.25)`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', marginTop: 4, alignSelf: 'flex-start', minHeight: 40 },

  logForm: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 },
  weightInput: { padding: '7px 10px', fontSize: 14, borderRadius: 6, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  notesInput: { padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  logFormBtns: { display: 'flex', gap: 6 },
  saveError: { fontSize: 12, color: '#c73820', background: '#fce8e6', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 8px', margin: 0 },
  saveBtn: { flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 6px rgba(247,87,9,0.28)', minHeight: 44 },
  cancelBtn: { padding: '11px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer', minHeight: 44 },

  historyToggle: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 },
  historyList: { borderTop: '1px solid var(--border-light)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  historyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyWeight: { fontSize: 13, lineHeight: 1.4 },
  prTag: { fontSize: 10, fontWeight: 700, color: ORANGE, background: 'rgba(247,87,9,0.12)', padding: '1px 5px', borderRadius: 3 },
  historyDate: { fontSize: 11, color: 'var(--text-3)' },

  // Privacy
  privacyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  privacyTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  privacySub: { fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 },
  privacyBtn: {
    flexShrink: 0,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'border-color 0.15s, color 0.15s',
  },

  // Session log
  logList: { display: 'flex', flexDirection: 'column' },
  logRow: { padding: '12px 0' },
  logTop: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  logBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' },
  logFocus: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  logEffort: { fontSize: 13, color: 'var(--text-2)' },
  logWeek: { fontSize: 11, color: 'var(--text-3)', background: 'var(--border)', padding: '2px 6px', borderRadius: 3 },
  logDate: { fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' },
  logNote: { fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', margin: '6px 0 0', lineHeight: 1.5 },
}
