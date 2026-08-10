import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  DumbbellIcon, CheckCircleIcon, TrophyIcon, BarbellIcon, ClipboardIcon,
  TargetIcon, LockIcon, BoltIcon, EyeIcon,
  StatusCompleteIcon, StatusPartialIcon, StatusSkippedIcon, StatusInjuryIcon,
} from '../components/Icons'
import SessionDescription from '../components/SessionDescription'
import PreviewBanner from '../components/PreviewBanner'
import StreakMilestoneToast from '../components/StreakMilestoneToast'
import { useTeam } from '../context/TeamContext'

const STREAK_MILESTONES = new Set([7, 14, 21])

const BLUE   = '#308EBD'
const ORANGE = '#F75709'
const YELLOW = '#F0BE24'

// ── Program Completion Banner ─────────────────────────────────────────────────

function ProgramCompletionBanner({ plan, onChoose, chosen, choosing }) {
  const navigate = useNavigate()
  const options = [
    { key: 'retest_maxes',  Icon: BarbellIcon,   title: 'Retest Your Maxes',    color: ORANGE,
      desc: 'Log updated 1RMs so your next program auto-calculates weights from your new strength levels.' },
    { key: 'retake_survey', Icon: ClipboardIcon, title: 'Retake Your Survey',    color: BLUE,
      desc: 'Update your goals, position, and preferences to generate a fresh personalized blueprint.' },
    { key: 'wait_for_coach', Icon: TargetIcon,   title: 'Wait for Your Coach',   color: YELLOW,
      desc: "Notify your coach you're ready. They'll review your progress and assign your next program." },
  ]
  if (chosen) {
    return (
      <div style={cb.banner}>
        <div style={cb.checkRow}>
          <CheckCircleIcon size={22} color={ORANGE} />
          <span style={cb.doneTitle}>
            {chosen === 'retest_maxes'   && 'Head to My Profile to log your new maxes.'}
            {chosen === 'retake_survey'  && 'Taking you to your survey now…'}
            {chosen === 'wait_for_coach' && "Your coach has been notified — they'll assign your next plan soon."}
          </span>
        </div>
      </div>
    )
  }
  return (
    <div style={cb.banner}>
      <div style={cb.iconRow}><TrophyIcon size={44} color={ORANGE} /></div>
      <h2 style={cb.heading}>You completed your {plan.num_weeks}-week program</h2>
      <p style={cb.sub}>Choose what happens next</p>
      <div style={cb.cards}>
        {options.map(opt => (
          <button key={opt.key}
            style={{ ...cb.card, borderColor: choosing === opt.key ? opt.color : 'var(--border)',
              background: choosing === opt.key ? `${opt.color}10` : 'var(--card-inner)',
              opacity: choosing && choosing !== opt.key ? 0.45 : 1 }}
            onClick={() => onChoose(opt.key, navigate)}
            disabled={Boolean(choosing)}>
            <opt.Icon size={28} color={opt.color} />
            <span style={{ ...cb.cardTitle, color: opt.color }}>{opt.title}</span>
            <span style={cb.cardDesc}>{opt.desc}</span>
            {choosing === opt.key && <span style={cb.cardSpinner} className="survey-spinner-sm" />}
          </button>
        ))}
      </div>
    </div>
  )
}
const cb = {
  banner: { background:'linear-gradient(135deg,rgba(247,87,9,.07) 0%,rgba(48,142,189,.05) 100%)', border:`1px solid ${ORANGE}33`, borderRadius:20, padding:'28px 20px 24px', marginBottom:28, textAlign:'center' },
  iconRow: { display:'flex', justifyContent:'center', marginBottom:14 },
  heading: { fontSize:'clamp(18px,4vw,22px)', fontWeight:800, color:'var(--text)', margin:'0 0 6px', fontFamily:"'Manrope','Inter',sans-serif" },
  sub:     { fontSize:13, color:'var(--text-2)', margin:'0 0 20px' },
  cards:   { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(180px,100%),1fr))', gap:10, textAlign:'left' },
  card:    { display:'flex', flexDirection:'column', gap:5, padding:'16px 14px', borderRadius:12, border:'1px solid', cursor:'pointer', textAlign:'left', transition:'border-color .18s,background .18s,opacity .18s', boxShadow:'0 2px 6px rgba(0,0,0,.14)', minHeight:48 },
  cardEmoji: { fontSize:20 }, cardTitle: { fontSize:13, fontWeight:700, lineHeight:1.2 },
  cardDesc:  { fontSize:11, color:'var(--text-2)', lineHeight:1.5 },
  cardSpinner:{ display:'inline-block', width:14, height:14, border:'2px solid var(--border)', borderRadius:'50%', animation:'spin .65s linear infinite', alignSelf:'center' },
  checkRow:{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 },
  doneTitle:{ fontSize:14, fontWeight:600, color:'var(--text)' },
}

// ── Exercise row (wraps on small screens) ─────────────────────────────────────

const LIFT_LABELS = {
  bench_press:'Bench Press', squat:'Squat',
  trap_bar_deadlift:'Trap Bar Deadlift', overhead_press:'Overhead Press',
  power_clean:'Power Clean', hang_clean:'Hang Clean', clean:'Clean',
  front_squat:'Front Squat', romanian_deadlift:'Romanian Deadlift', reverse_lunge:'Reverse Lunge',
}
function calcWeight(maxLbs, pct) { return Math.round((maxLbs * pct) / 5) * 5 }

function ExerciseRow({ exercise, maxes, locked = false }) {
  const { name, sets, reps, pct, lift_key, warmup, note } = exercise
  const maxEntry = lift_key ? maxes?.[lift_key]?.current : null
  const maxLbs   = maxEntry?.weight_lbs
  let weightLine = null
  if (pct && lift_key) {
    if (maxLbs) {
      weightLine = `${Math.round(pct * 100)}% → ${calcWeight(maxLbs, pct)} lbs`
    } else {
      weightLine = `Log your ${LIFT_LABELS[lift_key] || lift_key} max to see your weight`
    }
  }
  const setsRepsStr = warmup ? `${warmup} warmup, ${sets}×${reps} working` : `${sets}×${reps}`
  return (
    <div style={ex.row}>
      <span style={ex.name}>{name}{!locked && note ? <span style={ex.note}> ({note})</span> : null}</span>
      <div style={ex.right}>
        <span style={ex.setsReps}>{setsRepsStr}</span>
        {locked && pct ? (
          <span style={ex.locked}><LockIcon size={11} color="currentColor" /> ██ lbs</span>
        ) : weightLine ? (
          <span style={maxLbs ? ex.calc : ex.prompt}>{weightLine}</span>
        ) : null}
      </div>
    </div>
  )
}
const ex = {
  row:      { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, padding:'7px 0', borderBottom:'1px solid var(--border-light)', flexWrap:'wrap' },
  name:     { fontSize:14, fontWeight:600, color:'var(--text)', flex:'1 1 140px', minWidth:0 },
  note:     { fontSize:12, color:'var(--text-3)' },
  right:    { display:'flex', flexDirection:'column', alignItems:'flex-end', flexShrink:0 },
  setsReps: { fontSize:13, color:'var(--text-2)', whiteSpace:'nowrap' },
  calc:     { fontSize:12, fontWeight:700, color:ORANGE, marginTop:2, whiteSpace:'nowrap' },
  prompt:   { fontSize:11, color:'var(--text-3)', fontStyle:'italic', marginTop:2, maxWidth:180, textAlign:'right', lineHeight:1.3 },
  locked:   { fontSize:12, color:'var(--text-3)', marginTop:2, letterSpacing:.5, userSelect:'none' },
}

// ── Workout logging bottom sheet ──────────────────────────────────────────────

const STATUS_OPTIONS = [
  { key:'completed',      label:'Completed',       Icon: StatusCompleteIcon, color:'#2e7d32', bg:'rgba(46,125,50,.15)',  border:'rgba(46,125,50,.5)' },
  { key:'partial',        label:'Partial',          Icon: StatusPartialIcon,  color:'#b45309', bg:'rgba(180,83,9,.12)',   border:'rgba(180,83,9,.4)' },
  { key:'skipped',        label:'Skipped',          Icon: StatusSkippedIcon,  color:'#888',    bg:'rgba(128,128,128,.1)', border:'rgba(128,128,128,.35)' },
  { key:'skipped_injury', label:'Skipped — Injury', Icon: StatusInjuryIcon,   color:'#c73820', bg:'rgba(199,56,32,.12)',  border:'rgba(199,56,32,.4)' },
]

function LogSheet({ session, weekId, sessionIndex, existing, onClose, onSave }) {
  const [status,  setStatus]  = useState(existing?.status  || '')
  const [effort,  setEffort]  = useState(existing?.effort  || null)
  const [note,    setNote]    = useState(existing?.note    || '')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')
  const sheetRef = useRef(null)

  // Dismiss on backdrop tap
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  const isSkip = status === 'skipped' || status === 'skipped_injury'

  async function handleSubmit() {
    if (!status) { setErr('Choose how the session went.'); return }
    setSaving(true); setErr('')
    try {
      const body = { blueprint_week_id: weekId, session_index: sessionIndex, status }
      if (!isSkip && effort) body.effort = effort
      if (note.trim()) body.note = note.trim()
      const { data } = await api.post('/api/workouts', body)
      onSave(data.workout, data.streak_days)
      onClose()
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={ls.backdrop} onClick={handleBackdrop}>
      <div ref={sheetRef} style={ls.sheet} role="dialog" aria-modal="true">
        {/* Drag handle */}
        <div style={ls.handle} />

        {/* Header */}
        <div style={ls.header}>
          <div style={{ flex: 1 }}>
            <span style={ls.dayLabel}>{session.day || `Session ${sessionIndex + 1}`}</span>
            <p style={ls.focusLabel}>{session.focus}</p>
          </div>
          <button style={ls.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Status picker */}
        <p style={ls.sectionLabel}>How did it go?</p>
        <div style={ls.statusGrid}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.key}
              style={{
                ...ls.statusBtn,
                borderColor:   status === opt.key ? opt.border : 'var(--border)',
                background:    status === opt.key ? opt.bg     : 'var(--card-inner)',
                color:         status === opt.key ? opt.color  : 'var(--text-2)',
              }}
              onClick={() => { setStatus(opt.key); setErr('') }}
            >
              <opt.Icon size={28} color="currentColor" />
              <span style={ls.statusLabel}>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Effort rating — only for non-skip */}
        {status && !isSkip && (
          <div style={ls.effortSection}>
            <div style={ls.effortHeader}>
              <p style={{ ...ls.sectionLabel, marginBottom: 0 }}>Effort</p>
              {effort
                ? <span style={ls.effortBigVal}>{effort}<span style={ls.effortOfTen}>/10</span></span>
                : <span style={ls.effortHint}>drag to rate</span>
              }
            </div>
            <input
              type="range"
              className="effort-slider"
              min={1}
              max={10}
              step={1}
              value={effort ?? 5}
              onPointerDown={() => { if (!effort) setEffort(5) }}
              onChange={e => setEffort(parseInt(e.target.value, 10))}
              style={{
                background: effort
                  ? `linear-gradient(to right, ${YELLOW} 0%, ${YELLOW} ${((effort - 1) / 9) * 100}%, rgba(255,255,255,0.18) ${((effort - 1) / 9) * 100}%, rgba(255,255,255,0.18) 100%)`
                  : 'rgba(255,255,255,0.18)',
              }}
            />
            <div style={ls.effortRangeLabels}>
              <span style={ls.effortRangeLabel}>Easy</span>
              <span style={ls.effortRangeLabel}>Max</span>
            </div>
          </div>
        )}

        {/* Note */}
        <p style={ls.sectionLabel}>
          {status === 'skipped_injury' ? 'Which exercises? / injury notes (optional)' : 'Notes (optional)'}
        </p>
        <textarea
          style={ls.noteInput}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={status === 'skipped_injury' ? 'e.g. Shoulder pain, skipped Bench Press' : 'How did it feel? Any PRs?'}
          rows={3}
          onFocus={e => {
            // On iOS, scroll the textarea into view after the keyboard appears
            setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 350)
          }}
        />

        {err && <p style={ls.errMsg}>{err}</p>}

        {/* Action buttons */}
        <div style={ls.actionRow}>
          <button style={ls.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button
            style={{ ...ls.saveBtn, opacity: !status || saving ? 0.5 : 1 }}
            onClick={handleSubmit}
            disabled={!status || saving}
          >
            {saving ? 'Saving…' : existing ? 'Update Log' : 'Log Session'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ls = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.60)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    // Smooth entry handled by sheet translateY animation via CSS
  },
  sheet: {
    width: '100%',
    maxWidth: 540,
    background: 'var(--card)',
    borderTop: '1px solid var(--border)',
    borderRadius: '20px 20px 0 0',
    padding: '10px 20px calc(24px + env(safe-area-inset-bottom))',
    maxHeight: '88vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.50)',
    animation: 'sheetUp 0.26s cubic-bezier(0.34,1.06,0.64,1)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    background: 'rgba(255,255,255,0.18)',
    margin: '0 auto 16px',
  },
  header: {
    display: 'flex', alignItems: 'flex-start',
    gap: 12, marginBottom: 20,
  },
  dayLabel: {
    fontSize: 10, fontWeight: 700, color: BLUE,
    textTransform: 'uppercase', letterSpacing: 0.6,
    background: 'rgba(48,142,189,0.12)',
    padding: '3px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 4,
  },
  focusLabel: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 },
  closeBtn: {
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 18,
    color: 'var(--text-3)',
    lineHeight: 1,
    flexShrink: 0,
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  sectionLabel: { fontSize:12, fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:.5, margin:'0 0 10px' },
  statusGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 },
  statusBtn: {
    display:'flex', flexDirection:'column', alignItems:'center', gap:6,
    padding:'16px 10px', borderRadius:14, border:'1.5px solid',
    cursor:'pointer', transition:'all .15s',
    minHeight: 80,
  },
  statusLabel: { fontSize:13, fontWeight:700, lineHeight:1.3, textAlign:'center', marginTop:2 },
  effortSection:     { marginBottom: 20 },
  effortHeader:      { display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:14 },
  effortBigVal:      { fontSize:28, fontWeight:800, color:YELLOW, lineHeight:1 },
  effortOfTen:       { fontSize:14, fontWeight:600, color:YELLOW, opacity:0.7, marginLeft:2 },
  effortHint:        { fontSize:13, color:'var(--text-3)', fontStyle:'italic' },
  effortRangeLabels: { display:'flex', justifyContent:'space-between', marginTop:8 },
  effortRangeLabel:  { fontSize:11, fontWeight:600, color:'var(--text-3)', letterSpacing:.3 },
  noteInput: {
    width:'100%', padding:'12px 14px', fontSize:14,
    borderRadius:10, border:'1px solid var(--input-border)',
    background:'var(--input-bg)', color:'var(--text)',
    resize:'vertical', fontFamily:'inherit', outline:'none',
    lineHeight:1.5, boxSizing:'border-box', marginBottom:16,
  },
  errMsg:    { color:'#c73820', fontSize:13, marginBottom:12 },
  actionRow: { display:'flex', gap:10 },
  cancelBtn: {
    flex:1, padding:'15px 0', fontSize:14, fontWeight:600,
    borderRadius:12, border:'1px solid var(--border)',
    background:'transparent', color:'var(--text-2)', cursor:'pointer',
    minHeight: 54,
  },
  saveBtn: {
    flex:2, padding:'15px 0', fontSize:16, fontWeight:700,
    borderRadius:12, border:'none',
    background:ORANGE, color:'#fff', cursor:'pointer',
    boxShadow:'0 2px 14px rgba(247,87,9,0.40)',
    transition:'opacity .15s',
    minHeight: 54,
  },
}

// ── PlanView ──────────────────────────────────────────────────────────────────

function calcCurrentWeek(startsOn, numWeeks) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - new Date(startsOn).getTime()
  const week = Math.floor(elapsed / msPerWeek) + 1
  return Math.min(Math.max(week, 1), numWeeks)
}

const LOG_STATUS = {
  completed:       { label:'Completed',        color:'#2e7d32', bg:'#e8f5e9' },
  partial:         { label:'Partial',          color:'#b45309', bg:'#fef3c7' },
  skipped:         { label:'Skipped',          color:'#888',    bg:'#f0f0f0' },
  skipped_injury:  { label:'Skipped — Injury', color:'#c73820', bg:'#fce8e6' },
}

function PlanView({ plan, currentWeek, setCurrentWeek, logs, setLogs, maxes, injuryAreas, locked = false }) {
  const week = plan?.weeks?.find(w => w.week_number === currentWeek)

  // Which session log sheet is open: { weekId, sessionIndex, session } or null
  const [logSheet, setLogSheet] = useState(null)
  const [milestoneDays, setMilestoneDays] = useState(null)

  function getLog(weekId, sessionIndex) {
    return logs.find(l => l.blueprint_week_id === weekId && l.session_index === sessionIndex) || null
  }

  function handleSave(newLog, streakDays) {
    setLogs(prev => {
      const filtered = prev.filter(
        l => !(l.blueprint_week_id === newLog.blueprint_week_id && l.session_index === newLog.session_index)
      )
      return [...filtered, newLog]
    })
    if (STREAK_MILESTONES.has(streakDays)) setMilestoneDays(streakDays)
  }

  return (
    <>
      <p style={styles.planMeta}>
        {plan.num_weeks}-week plan · Started{' '}
        {new Date(plan.starts_on).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
      </p>

      {/* Week navigator */}
      <div style={styles.weekNav}>
        <button
          style={{ ...styles.navBtn, opacity: currentWeek === 1 ? 0.35 : 1 }}
          onClick={() => setCurrentWeek(w => Math.max(1, w - 1))}
          disabled={currentWeek === 1}
        >←</button>
        <div style={styles.weekInfo}>
          <span style={styles.weekLabel}>Week {currentWeek}</span>
          <span style={styles.weekOf}>of {plan.num_weeks}</span>
        </div>
        <button
          style={{ ...styles.navBtn, opacity: currentWeek === plan.num_weeks ? 0.35 : 1 }}
          onClick={() => setCurrentWeek(w => Math.min(plan.num_weeks, w + 1))}
          disabled={currentWeek === plan.num_weeks}
        >→</button>
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
                  const logged     = getLog(week.id, i)
                  const statusInfo = logged ? LOG_STATUS[logged.status] : null
                  return (
                    <div key={i} style={{
                      ...styles.sessionCard,
                      ...(logged ? { borderColor: `${statusInfo.color}44` } : {}),
                    }}>
                      {/* Session header */}
                      <div style={styles.sessionHeader}>
                        <span style={styles.sessionDay}>{s.day || `Session ${i + 1}`}</span>
                        <span style={styles.sessionFocus}>{s.focus}</span>
                        {logged && statusInfo && (
                          <span style={{ ...styles.logBadge, color: statusInfo.color, background: statusInfo.bg }}>
                            {statusInfo.label}{logged.effort ? ` · ${logged.effort}/10` : ''}
                          </span>
                        )}
                      </div>

                      {/* Session content */}
                      {s.exercises && s.exercises.length > 0 ? (
                        <div style={styles.exerciseList}>
                          {s.exercises.map((ex, ei) => (
                            <ExerciseRow key={ei} exercise={ex} maxes={maxes} locked={locked} />
                          ))}
                        </div>
                      ) : s.description ? (
                        locked ? (
                          <div style={styles.lockedDesc}>
                            <LockIcon size={13} color="var(--text-3)" /> Detailed coaching notes unlock when you join your team
                          </div>
                        ) : (
                          <SessionDescription description={s.description} focus={s.focus} injuryAreas={injuryAreas} injuryModified={s.injury_modified} maxes={maxes} warmup={s.warmup} style={styles.sessionDesc} />
                        )
                      ) : null}

                      {/* Log button — only when not locked */}
                      {!locked && (
                        <button
                          style={{
                            ...styles.logBtn,
                            ...(logged
                              ? {
                                  background: `${statusInfo.color}15`,
                                  borderColor: `${statusInfo.color}55`,
                                  color: statusInfo.color,
                                }
                              : styles.logBtnUnlogged),
                          }}
                          onClick={() => setLogSheet({ weekId: week.id, sessionIndex: i, session: s })}
                        >
                          {logged
                            ? <><StatusCompleteIcon size={16} color="currentColor" /> {statusInfo.label} — Update</>
                            : '+ Log Session'
                          }
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Week dots — wrap so 16 dots don't overflow on narrow screens */}
      <div style={styles.weekDots}>
        {Array.from({ length: plan.num_weeks }, (_, i) => i + 1).map(n => {
          const isPast = n < currentWeek
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
              aria-label={`Week ${n}`}
            />
          )
        })}
      </div>

      {/* Workout log sheet */}
      {logSheet && (
        <LogSheet
          session={logSheet.session}
          weekId={logSheet.weekId}
          sessionIndex={logSheet.sessionIndex}
          existing={getLog(logSheet.weekId, logSheet.sessionIndex)}
          onClose={() => setLogSheet(null)}
          onSave={handleSave}
        />
      )}

      {/* Streak milestone celebration */}
      {milestoneDays != null && (
        <StreakMilestoneToast days={milestoneDays} onDone={() => setMilestoneDays(null)} />
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AthletePlan() {
  const navigate   = useNavigate()
  const activeTeam = useTeam()?.activeTeam ?? null
  const hasTeam    = Boolean(activeTeam)

  const [coachPlan, setCoachPlan]  = useState(undefined)
  const [autoPlan,  setAutoPlan]   = useState(undefined)
  const [logs,      setLogs]       = useState([])
  const [maxes,     setMaxes]      = useState({})
  const [injuryAreas, setInjuryAreas] = useState([])
  const [loading,   setLoading]    = useState(true)
  const [currentWeekCoach, setCurrentWeekCoach] = useState(1)
  const [currentWeekAuto,  setCurrentWeekAuto]  = useState(1)

  const [choosingAction, setChoosingAction] = useState(null)
  const [chosenAction,   setChosenAction]   = useState(null)

  async function handleProgramComplete(action, nav) {
    setChoosingAction(action)
    try {
      const activePlan = coachPlan || autoPlan
      await api.post('/api/programs/complete', { blueprint_id: activePlan?.id || null, action })
      setChosenAction(action)
      if (action === 'retake_survey') setTimeout(() => nav('/survey', { state: { retake: true } }), 800)
    } catch (err) {
      console.error('[AthletePlan] handleProgramComplete:', err)
    } finally {
      setChoosingAction(null)
    }
  }

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
      // is_individual plans (always true for the auto plan; true for a
      // coach plan only if assigned to this one athlete, not bulk-assigned
      // to the whole team) carry a real, stored current_week. A team-wide
      // assignment has no single meaningful value per athlete — fall back
      // to the elapsed-time estimate for that case only.
      if (plans.coach) setCurrentWeekCoach(plans.coach.is_individual ? plans.coach.current_week : calcCurrentWeek(plans.coach.starts_on, plans.coach.num_weeks))
      if (plans.auto)  setCurrentWeekAuto(plans.auto.is_individual ? plans.auto.current_week : calcCurrentWeek(plans.auto.starts_on, plans.auto.num_weeks))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={styles.container}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 140, height: 20, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '60%', height: 13 }} />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '50%', height: 14, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '30%', height: 11 }} />
          </div>
        </div>
      ))}
    </div>
  )

  const hasAny = coachPlan || autoPlan

  if (!hasAny && !hasTeam) {
    return (
      <div style={styles.container}>
        <PreviewBanner noun="training plan" />
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><DumbbellIcon size={36} color="var(--text-3)" /></div>
          <h2 style={styles.emptyTitle}>Complete your survey to preview your plan</h2>
          <p style={styles.emptyDesc}>
            We'll generate a personalized training plan matched to your sport and goals.
          </p>
        </div>
      </div>
    )
  }

  if (!hasAny && hasTeam) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><DumbbellIcon size={36} color="var(--text-3)" /></div>
          <h2 style={styles.emptyTitle}>No plan assigned yet</h2>
          <p style={styles.emptyDesc}>Your coach is working on your training plan. Check back soon.</p>
        </div>
      </div>
    )
  }

  const previewMode      = !hasTeam && Boolean(autoPlan)
  const activePlan       = coachPlan || autoPlan
  const activeCurrentWeek = coachPlan ? currentWeekCoach : currentWeekAuto
  const showCompletion   = !previewMode && activePlan && activeCurrentWeek >= activePlan.num_weeks

  return (
    <div style={styles.container}>
      {previewMode && <PreviewBanner noun="training plan" />}

      {showCompletion && (
        <ProgramCompletionBanner
          plan={activePlan}
          onChoose={handleProgramComplete}
          choosing={choosingAction}
          chosen={chosenAction}
        />
      )}

      {/* Coach plan */}
      {hasTeam && (
        coachPlan ? (
          <div style={styles.planSection}>
            <div style={styles.labelRow}>
              <span style={styles.coachLabel}>
                <ClipboardIcon size={13} color={BLUE} /> Assigned by Coach — {coachPlan.title}
              </span>
            </div>
            <PlanView
              plan={coachPlan}
              currentWeek={currentWeekCoach}
              setCurrentWeek={setCurrentWeekCoach}
              logs={logs}
              setLogs={setLogs}
              maxes={maxes}
              injuryAreas={injuryAreas}
            />
          </div>
        ) : (
          <div style={styles.noCoachNotice}>Your coach has not assigned a training plan yet.</div>
        )
      )}

      {/* Auto plan */}
      {autoPlan && (
        <div style={styles.planSection}>
          <div style={styles.labelRow}>
            <span style={previewMode ? styles.previewLabel : styles.autoLabel}>
              {previewMode
                ? <><EyeIcon size={13} color="currentColor" /> Preview — {autoPlan.title}</>
                : <><BoltIcon size={13} color={ORANGE} /> Personalized Plan — Generated from Your Survey</>
              }
            </span>
          </div>
          <PlanView
            plan={autoPlan}
            currentWeek={currentWeekAuto}
            setCurrentWeek={setCurrentWeekAuto}
            logs={previewMode ? [] : logs}
            setLogs={setLogs}
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
  center:    { color:'var(--text-3)', fontSize:15 },
  container: { maxWidth:660, margin:'0 auto' },

  emptyState: { textAlign:'center', paddingTop:80 },
  emptyIcon:  { display:'flex', justifyContent:'center', marginBottom:20 },
  emptyTitle: { fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:8 },
  emptyDesc:  { color:'var(--text-2)', fontSize:15, lineHeight:1.6 },

  planSection:  { marginBottom:40 },
  labelRow:     { marginBottom:14 },
  coachLabel:   { display:'inline-block', fontSize:13, fontWeight:700, color:BLUE, background:'rgba(48,142,189,.12)', border:'1px solid rgba(48,142,189,.25)', padding:'6px 16px', borderRadius:20, letterSpacing:.2 },
  autoLabel:    { display:'inline-block', fontSize:13, fontWeight:700, color:ORANGE, background:'rgba(247,87,9,.08)', border:'1px solid rgba(247,87,9,.2)', padding:'6px 16px', borderRadius:20, letterSpacing:.2 },
  previewLabel: { display:'inline-block', fontSize:13, fontWeight:700, color:'var(--text-3)', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.12)', padding:'6px 16px', borderRadius:20, letterSpacing:.2 },
  lockedDesc:   { fontSize:13, color:'var(--text-3)', fontStyle:'italic', padding:'8px 12px', background:'rgba(255,255,255,.04)', borderRadius:8, marginTop:6, userSelect:'none' },
  noCoachNotice:{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px', marginBottom:28, color:'var(--text-2)', fontSize:14, fontStyle:'italic' },

  planMeta:   { color:'var(--text-3)', fontSize:13, margin:'0 0 16px' },

  weekNav:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  navBtn:     { padding:'12px 20px', fontSize:20, borderRadius:12, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', lineHeight:1, boxShadow:'0 1px 3px rgba(0,0,0,.18)', minWidth:56, minHeight:50 },
  weekInfo:   { display:'flex', flexDirection:'column', alignItems:'center', gap:2 },
  weekLabel:  { fontSize:18, fontWeight:700, color:'var(--text)' },
  weekOf:     { fontSize:12, color:'var(--text-3)' },

  card:        { background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px 16px', marginBottom:20, boxShadow:'0 2px 8px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.04)' },
  objectiveBlock: { background:'rgba(48,142,189,.08)', borderLeft:`3px solid ${BLUE}`, padding:'12px 16px', borderRadius:'0 12px 12px 0', marginBottom:20 },
  objectiveLabel: { fontSize:11, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:.5, margin:'0 0 4px' },
  objectiveText:  { fontSize:15, color:'var(--text)', margin:0 },
  emptyWeek:      { color:'var(--text-3)', fontSize:14, textAlign:'center', padding:'20px 0' },

  sessionList: { display:'flex', flexDirection:'column', gap:14 },
  sessionCard: {
    background:'linear-gradient(135deg,rgba(48,142,189,.04) 0%,var(--card-inner) 100%)',
    border:'1px solid var(--border)',
    borderRadius:14,
    padding:'14px 14px 12px',
    boxShadow:'0 1px 4px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.04)',
    transition:'border-color .18s',
  },
  sessionHeader: { display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' },
  sessionDay:    { fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', background:'rgba(48,142,189,.12)', padding:'3px 7px', borderRadius:5, letterSpacing:.3, flexShrink:0 },
  sessionFocus:  { fontSize:15, fontWeight:700, color:'var(--text)', flex:1, minWidth:0 },
  sessionDesc:   { fontSize:14, color:'var(--text-2)', margin:0, lineHeight:1.6 },
  exerciseList:  { marginTop:4 },
  logBadge:      { fontSize:11, fontWeight:700, padding:'4px 9px', borderRadius:6, whiteSpace:'nowrap', flexShrink:0 },

  // The Log Session button — large tap target, full-width on mobile
  logBtn: {
    marginTop: 14,
    width: '100%',
    padding: '14px 0',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: '1.5px solid',
    cursor: 'pointer',
    letterSpacing: 0.2,
    transition: 'all .15s',
    minHeight: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // Prominent orange style when session has NOT been logged yet
  logBtnUnlogged: {
    background: ORANGE,
    borderColor: ORANGE,
    color: '#fff',
    boxShadow: '0 2px 14px rgba(247,87,9,0.35)',
  },

  // Week dots — wrap on narrow screens (16 dots would overflow otherwise)
  // Each button is 32×32 touch target; the coloured dot is 12×12 centred inside
  weekDots: { display:'flex', justifyContent:'center', gap:2, flexWrap:'wrap', padding:'4px 0 8px' },
  // Each dot button is 32×32 touch area; the circle fills the full button.
  dot: {
    width: 32, height: 32,
    borderRadius: '50%',
    background: 'var(--border)',   // default: gray
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'background .15s, transform .15s, box-shadow .15s',
    flexShrink: 0,
  },
  dotActive: { background: BLUE, transform: 'scale(1.15)', boxShadow: `0 0 0 3px rgba(48,142,189,0.25)` },
  dotPast:   { background: 'var(--text-3)' },
}
