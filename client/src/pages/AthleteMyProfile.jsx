import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { FlameIcon, CalendarIcon, EditIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon } from '../components/Icons'
import AvatarUpload from '../components/AvatarUpload'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const LOG_STATUS = {
  completed: { label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
  partial:   { label: 'Partial',   color: '#b45309', bg: '#fef3c7' },
  skipped:   { label: 'Skipped',   color: '#888',    bg: '#f0f0f0' },
}

const LIFTS = [
  { key: 'bench_press',       label: 'Bench Press' },
  { key: 'squat',             label: 'Squat' },
  { key: 'deadlift',          label: 'Deadlift' },
  { key: 'trap_bar_deadlift', label: 'Trap Bar Deadlift' },
  { key: 'power_clean',       label: 'Power Clean' },
  { key: 'overhead_press',    label: 'Overhead Press' },
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
  const [plan, setPlan] = useState(null)
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
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/survey/my').then(r => r.data.survey).catch(() => null),
      api.get('/api/blueprints/my-plan').then(r => r.data.plan).catch(() => null),
      api.get('/api/workouts/mine').then(r => r.data.logs).catch(() => []),
      api.get('/api/maxes').then(r => r.data.maxes).catch(() => null),
    ]).then(([s, p, l, m]) => {
      setSurvey(s)
      setPlan(p)
      setLogs(l)
      setMaxes(m)
    }).finally(() => setLoading(false))
  }, [])

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
    try {
      await api.post('/api/maxes', { lift: liftKey, weight_lbs: w, reps: parseInt(form.reps) || 1, notes: form.notes || null })
      const res = await api.get('/api/maxes')
      setMaxes(res.data.maxes)
      setLogForms(prev => ({ ...prev, [liftKey]: { open: false, weight: '', reps: '1', notes: '' } }))
    } catch (err) {
      console.error('Failed to log max:', err)
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

      {/* Current plan */}
      {plan && (
        <div style={{ ...styles.card, marginTop: 14 }}>
          <div style={styles.cardHeader}>
            <p style={{ ...styles.cardLabel, color: BLUE }}>Current Plan</p>
            <button style={styles.editBtn} onClick={() => navigate('/athlete/plan')}>
              <CalendarIcon size={14} color={BLUE} />
              View plan
            </button>
          </div>
          <p style={styles.planName}>{plan.title}</p>
          {plan.description && <p style={styles.planDesc}>{plan.description}</p>}
          <p style={styles.planMeta}>
            {plan.num_weeks}-week plan · Started {fmtDate(plan.starts_on)}
          </p>
        </div>
      )}

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
                        onChange={e => setLogForms(prev => ({ ...prev, [key]: { ...prev[key], weight: e.target.value } }))}
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
                        onClick={() => setLogForms(prev => ({ ...prev, [key]: { open: false, weight: '', reps: '1', notes: '' } }))}
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

  profileHeader: { display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 },
  name: { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subline: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 2px' },
  photoHint: { fontSize: 11, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statVal: { fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  statLabel: { fontSize: 12, color: 'var(--text-3)' },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardLabel: { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 },
  editBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: BLUE, background: 'none', border: `1px solid ${BLUE}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' },
  logCount: { fontSize: 13, color: 'var(--text-3)' },

  emptyAction: { display: 'flex', flexDirection: 'column', gap: 14 },
  emptyText: { color: 'var(--text-3)', fontSize: 14, margin: 0 },
  primaryBtn: { alignSelf: 'flex-start', padding: '9px 18px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer' },

  surveyField: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 4px' },
  fieldValue: { fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: 0 },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: { fontSize: 12, fontWeight: 600, background: 'var(--border)', color: 'var(--text-2)', padding: '3px 10px', borderRadius: 12 },

  planName: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  planDesc: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 6px' },
  planMeta: { fontSize: 13, color: 'var(--text-3)', margin: 0 },

  // Maxes
  maxesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  liftCard: { background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 },
  liftTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  liftLabel: { fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4 },
  liftPR: { fontSize: 22, fontWeight: 700, color: ORANGE, lineHeight: 1 },
  liftUnit: { fontSize: 12, fontWeight: 600, color: 'var(--text-3)' },
  liftDate: { fontSize: 11, color: 'var(--text-3)', margin: 0 },
  liftEmpty: { fontSize: 12, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' },

  logPRBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: ORANGE, background: 'rgba(247,87,9,0.08)', border: `1px solid rgba(247,87,9,0.25)`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', marginTop: 2, alignSelf: 'flex-start' },

  logForm: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 },
  weightInput: { padding: '7px 10px', fontSize: 14, borderRadius: 6, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  notesInput: { padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  logFormBtns: { display: 'flex', gap: 6 },
  saveBtn: { flex: 1, padding: '7px 0', fontSize: 13, fontWeight: 700, borderRadius: 6, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer' },
  cancelBtn: { padding: '7px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' },

  historyToggle: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 },
  historyList: { borderTop: '1px solid var(--border-light)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  historyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyWeight: { fontSize: 13, lineHeight: 1.4 },
  prTag: { fontSize: 10, fontWeight: 700, color: ORANGE, background: 'rgba(247,87,9,0.12)', padding: '1px 5px', borderRadius: 3 },
  historyDate: { fontSize: 11, color: 'var(--text-3)' },

  // Privacy
  privacyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  privacyTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  privacySub: { fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 },
  privacyBtn: {
    flexShrink: 0,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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
