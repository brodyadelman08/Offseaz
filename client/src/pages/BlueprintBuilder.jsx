import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const ORANGE = '#F75709'

const TEMPLATES = [
  {
    label: 'Start fresh',
    description: 'Build your own plan from scratch',
    icon: '✏️',
    data: null,
  },
  {
    label: '4-Week General Conditioning',
    description: 'Mixed fitness foundation — a balanced starting block',
    icon: '🏃',
    data: {
      title: '4-Week General Conditioning',
      description: 'A balanced 4-week block covering strength, conditioning, and mobility.',
      num_weeks: 4,
      weeks: [
        { week_number: 1, objective: 'Establish baseline fitness and movement patterns', sessions: [{ day: 'Day 1', focus: 'Full Body Strength', description: 'Squat 3x10, Push-up 3x15, Row 3x12, Plank 3x30s' }, { day: 'Day 2', focus: 'Conditioning', description: '20 min steady-state cardio at moderate pace' }, { day: 'Day 4', focus: 'Full Body Strength', description: 'Deadlift 3x8, Dumbbell press 3x10, Pull-up 3x8' }, { day: 'Day 5', focus: 'Mobility & Recovery', description: '30 min stretching and foam rolling' }] },
        { week_number: 2, objective: 'Increase training volume', sessions: [{ day: 'Day 1', focus: 'Lower Body', description: 'Squat 4x10, Lunge 3x12 each, Calf raise 4x15' }, { day: 'Day 2', focus: 'Conditioning', description: '25 min cardio — mix of steady state and intervals' }, { day: 'Day 3', focus: 'Upper Body', description: 'Push-up 4x15, Dumbbell row 4x12, Shoulder press 3x10' }, { day: 'Day 5', focus: 'Active Recovery', description: 'Walk 30 min + full body stretch' }] },
        { week_number: 3, objective: 'Build intensity and challenge limits', sessions: [{ day: 'Day 1', focus: 'Full Body Circuit', description: '4 rounds: Squat 15, Push-up 15, Row 15, Burpee 10 — 60s rest between rounds' }, { day: 'Day 3', focus: 'Conditioning', description: '6x400m run at 85% effort, 90s rest' }, { day: 'Day 5', focus: 'Strength', description: 'Deadlift 4x6, Bench press 4x8, Pull-up 4x6' }] },
        { week_number: 4, objective: 'Test improvements and recover', sessions: [{ day: 'Day 1', focus: 'Fitness Test', description: 'Max push-ups, 1-mile run time, max pull-ups — record results' }, { day: 'Day 3', focus: 'Light Full Body', description: 'All movements at 60% intensity — focus on form' }, { day: 'Day 5', focus: 'Recovery & Reflect', description: 'Yoga or stretching 30 min, review progress' }] },
      ],
    },
  },
  {
    label: '6-Week Strength Block',
    description: 'Progressive overload — built to add weight every week',
    icon: '💪',
    data: {
      title: '6-Week Strength Block',
      description: 'A classic 6-week progressive overload program targeting main lifts.',
      num_weeks: 6,
      weeks: [
        { week_number: 1, objective: 'Learn movement patterns at moderate load (65–70% effort)', sessions: [{ day: 'Day 1', focus: 'Squat & Accessory', description: 'Back squat 4x6 @ 65%, Leg press 3x10, Leg curl 3x12' }, { day: 'Day 3', focus: 'Bench & Accessory', description: 'Bench press 4x6 @ 65%, Dumbbell fly 3x12, Tricep dip 3x10' }, { day: 'Day 5', focus: 'Deadlift & Accessory', description: 'Deadlift 4x5 @ 65%, Romanian deadlift 3x8, Back extension 3x12' }] },
        { week_number: 2, objective: 'Add 5 lbs to all main lifts', sessions: [{ day: 'Day 1', focus: 'Squat Day', description: 'Back squat 4x5 @ 70%, Leg press 3x10, Nordic curl 3x8' }, { day: 'Day 3', focus: 'Bench Day', description: 'Bench press 4x5 @ 70%, Incline dumbbell 3x10, Skull crushers 3x10' }, { day: 'Day 5', focus: 'Deadlift Day', description: 'Deadlift 4x4 @ 70%, Barbell row 4x8, Face pull 3x15' }] },
        { week_number: 3, objective: 'Push intensity to 75–80%', sessions: [{ day: 'Day 1', focus: 'Squat Day', description: 'Back squat 5x4 @ 75%, Bulgarian split squat 3x8 each' }, { day: 'Day 3', focus: 'Bench Day', description: 'Bench press 5x4 @ 75%, Push-up finisher 2x max' }, { day: 'Day 5', focus: 'Deadlift Day', description: 'Deadlift 5x3 @ 75%, Single-leg RDL 3x10 each' }] },
        { week_number: 4, objective: 'Deload — reduce volume, keep intensity', sessions: [{ day: 'Day 1', focus: 'Squat (Deload)', description: 'Back squat 3x4 @ 60%, Light leg work' }, { day: 'Day 3', focus: 'Bench (Deload)', description: 'Bench press 3x4 @ 60%, Light accessory work' }, { day: 'Day 5', focus: 'Deadlift (Deload)', description: 'Deadlift 3x3 @ 60%, Mobility work' }] },
        { week_number: 5, objective: 'Peak — reach 85–90% intensity', sessions: [{ day: 'Day 1', focus: 'Squat Day', description: 'Back squat 4x3 @ 85%, Pause squat 2x3 @ 70%' }, { day: 'Day 3', focus: 'Bench Day', description: 'Bench press 4x3 @ 85%, Spoto press 2x4 @ 70%' }, { day: 'Day 5', focus: 'Deadlift Day', description: 'Deadlift 4x2 @ 85%, Rack pull 2x3' }] },
        { week_number: 6, objective: 'Test maxes and celebrate progress', sessions: [{ day: 'Day 1', focus: 'Max Squat Attempt', description: 'Warm up thoroughly, attempt 1RM back squat, record result' }, { day: 'Day 3', focus: 'Max Bench Attempt', description: 'Warm up thoroughly, attempt 1RM bench press, record result' }, { day: 'Day 5', focus: 'Max Deadlift Attempt', description: 'Warm up thoroughly, attempt 1RM deadlift, record result' }] },
      ],
    },
  },
  {
    label: '2-Week Peaking',
    description: 'Pre-season ramp — sharpen speed and explosiveness',
    icon: '⚡',
    data: {
      title: '2-Week Peaking',
      description: 'Sharpen explosiveness and sport readiness in the final 2 weeks before the season.',
      num_weeks: 2,
      weeks: [
        { week_number: 1, objective: 'High-intensity speed and power work', sessions: [{ day: 'Day 1', focus: 'Sprint & Power', description: '6x40m sprints @ 95%, 3 min rest · Box jumps 5x5 · Broad jump 5x3' }, { day: 'Day 2', focus: 'Upper Body Activation', description: 'Med ball chest pass 4x8 · Push press 4x4 @ 75% · Band pull-aparts 3x15' }, { day: 'Day 4', focus: 'Agility & Change of Direction', description: '5-10-5 drill 6x · T-drill 4x · Ladder footwork 10 min' }, { day: 'Day 5', focus: 'Light Full Body', description: 'All movements at 50% — prime the CNS, do not fatigue' }] },
        { week_number: 2, objective: 'Taper — reduce volume, stay sharp', sessions: [{ day: 'Day 1', focus: 'Sprint Maintenance', description: '4x30m sprint @ 90%, full rest · 3x broad jump — stay fresh' }, { day: 'Day 3', focus: 'Activation', description: 'Band walks 2x15, Glute bridge 2x15, Push-up 2x10 — light and fast' }, { day: 'Day 5', focus: 'Mental & Physical Prep', description: 'Walk-through movements, visualization, light stretch — ready for game day' }] },
      ],
    },
  },
]

function makeWeeks(n, existing = []) {
  return Array.from({ length: n }, (_, i) => {
    const weekNum = i + 1
    const prev = existing.find(w => w.week_number === weekNum)
    return prev || { week_number: weekNum, objective: '', sessions: [] }
  })
}

function blankSession() {
  return { day: '', focus: '', description: '' }
}

export default function BlueprintBuilder() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    num_weeks: 4,
    weeks: makeWeeks(4),
  })

  const totalSteps = form.num_weeks + 2
  const isReviewStep = step === totalSteps

  function selectTemplate(tpl) {
    if (!tpl.data) {
      setForm({ title: '', description: '', num_weeks: 4, weeks: makeWeeks(4) })
    } else {
      setForm({
        title: tpl.data.title,
        description: tpl.data.description,
        num_weeks: tpl.data.num_weeks,
        weeks: makeWeeks(tpl.data.num_weeks, tpl.data.weeks),
      })
    }
    setStep(1)
  }

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setNumWeeks(n) {
    const num = Math.min(12, Math.max(1, parseInt(n, 10) || 1))
    setForm(prev => ({ ...prev, num_weeks: num, weeks: makeWeeks(num, prev.weeks) }))
  }

  function setWeekField(weekIdx, field, value) {
    setForm(prev => {
      const weeks = prev.weeks.map((w, i) => i === weekIdx ? { ...w, [field]: value } : w)
      return { ...prev, weeks }
    })
  }

  function addSession(weekIdx) {
    setForm(prev => {
      const weeks = prev.weeks.map((w, i) =>
        i === weekIdx ? { ...w, sessions: [...w.sessions, blankSession()] } : w
      )
      return { ...prev, weeks }
    })
  }

  function removeSession(weekIdx, sessionIdx) {
    setForm(prev => {
      const weeks = prev.weeks.map((w, i) =>
        i === weekIdx ? { ...w, sessions: w.sessions.filter((_, si) => si !== sessionIdx) } : w
      )
      return { ...prev, weeks }
    })
  }

  function setSessionField(weekIdx, sessionIdx, field, value) {
    setForm(prev => {
      const weeks = prev.weeks.map((w, i) => {
        if (i !== weekIdx) return w
        const sessions = w.sessions.map((s, si) => si === sessionIdx ? { ...s, [field]: value } : s)
        return { ...w, sessions }
      })
      return { ...prev, weeks }
    })
  }

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/api/blueprints', form)
      navigate(`/blueprints/${res.data.blueprint.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save blueprint.')
      setSubmitting(false)
    }
  }

  const canAdvancePlanInfo = form.title.trim().length > 0
  const progressPct = step === 0 ? 0 : Math.round((step / totalSteps) * 100)

  // ── Template picker ───────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Wordmark size={20} />
            <span style={styles.roleChip}>Coach</span>
          </div>
          <div style={styles.headerRight}>
            <button onClick={toggle} style={styles.iconBtn} title="Toggle theme">
              {mode === 'dark' ? '☀' : '☾'}
            </button>
            <button style={styles.backBtn} onClick={() => navigate('/coach')}>← Dashboard</button>
          </div>
        </div>

        <h1 style={styles.pageTitle}>Create Blueprint</h1>
        <p style={styles.pageDesc}>Start from scratch or choose a template to pre-fill your plan.</p>

        <div style={styles.templateGrid}>
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.label}
              style={styles.templateCard}
              onClick={() => selectTemplate(tpl)}
              onMouseEnter={e => e.currentTarget.style.borderColor = ORANGE}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={styles.templateIcon}>{tpl.icon}</span>
              <span style={styles.templateLabel}>{tpl.label}</span>
              <span style={styles.templateDesc}>{tpl.description}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Steps 1+ ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <img src="/OFFSEAZ_LOGO_PNG.png" alt="Offseaz" style={styles.logo} />
          <span style={styles.roleChip}>Coach</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.backBtn} onClick={() => setStep(s => s - 1)}>← Back</button>
        </div>
      </div>

      <div style={styles.progressWrap}>
        <span style={styles.progressLabel}>
          {isReviewStep ? 'Review' : step === 1 ? 'Plan info' : `Week ${step - 1} of ${form.num_weeks}`}
        </span>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
        </div>
        <span style={styles.progressPct}>{progressPct}%</span>
      </div>

      <div style={styles.card}>
        {/* Step 1: Plan info */}
        {step === 1 && (
          <>
            <h2 style={styles.stepTitle}>Plan details</h2>
            <label style={styles.label}>Title *</label>
            <input
              style={styles.input}
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="e.g. Fall Strength Block"
              autoFocus
            />
            <label style={styles.label}>Description</label>
            <textarea
              style={styles.textarea}
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="Optional overview for your athletes…"
              rows={3}
            />
            <label style={styles.label}>Number of weeks</label>
            <select
              style={styles.input}
              value={form.num_weeks}
              onChange={e => setNumWeeks(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'week' : 'weeks'}</option>
              ))}
            </select>
          </>
        )}

        {/* Steps 2..N+1: Week editors */}
        {step >= 2 && !isReviewStep && (() => {
          const wi = step - 2
          const week = form.weeks[wi]
          return (
            <>
              <h2 style={styles.stepTitle}>Week {week.week_number}</h2>
              <label style={styles.label}>Weekly objective</label>
              <textarea
                style={styles.textarea}
                value={week.objective}
                onChange={e => setWeekField(wi, 'objective', e.target.value)}
                placeholder="What's the focus of this week? (e.g. Build aerobic base)"
                rows={2}
              />

              <div style={styles.sessionsHeader}>
                <label style={{ ...styles.label, marginTop: 0 }}>Sessions</label>
                <button style={styles.addBtn} onClick={() => addSession(wi)}>+ Add session</button>
              </div>

              {week.sessions.length === 0 && (
                <p style={styles.emptyMsg}>No sessions yet — click "Add session" to build this week.</p>
              )}

              {week.sessions.map((s, si) => (
                <div key={si} style={styles.sessionRow}>
                  <div style={styles.sessionTopRow}>
                    <input
                      style={{ ...styles.input, flex: '0 0 100px' }}
                      value={s.day}
                      onChange={e => setSessionField(wi, si, 'day', e.target.value)}
                      placeholder="Day 1"
                    />
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      value={s.focus}
                      onChange={e => setSessionField(wi, si, 'focus', e.target.value)}
                      placeholder="Focus (e.g. Upper Body Strength)"
                    />
                    <button style={styles.removeBtn} onClick={() => removeSession(wi, si)}>✕</button>
                  </div>
                  <textarea
                    style={{ ...styles.textarea, marginTop: 8 }}
                    value={s.description}
                    onChange={e => setSessionField(wi, si, 'description', e.target.value)}
                    placeholder="Describe the session… (exercises, sets, reps, notes)"
                    rows={3}
                  />
                </div>
              ))}
            </>
          )
        })()}

        {/* Review step */}
        {isReviewStep && (
          <>
            <h2 style={styles.stepTitle}>Review your blueprint</h2>
            <p style={styles.reviewMeta}><strong>{form.title}</strong> · {form.num_weeks} weeks</p>
            {form.description && <p style={styles.reviewDesc}>{form.description}</p>}
            {form.weeks.map(w => (
              <div key={w.week_number} style={styles.reviewWeek}>
                <p style={styles.reviewWeekTitle}>Week {w.week_number}</p>
                {w.objective && <p style={styles.reviewObjective}>{w.objective}</p>}
                {w.sessions.length === 0 && <p style={styles.reviewEmpty}>No sessions added</p>}
                {w.sessions.map((s, si) => (
                  <div key={si} style={styles.reviewSession}>
                    <span style={styles.reviewDay}>{s.day || `Session ${si + 1}`}</span>
                    <span style={styles.reviewFocus}>{s.focus}</span>
                    {s.description && <p style={styles.reviewSessionDesc}>{s.description}</p>}
                  </div>
                ))}
              </div>
            ))}
            {error && <div style={styles.errorBox}>{error}</div>}
          </>
        )}

        <div style={styles.actions}>
          {isReviewStep ? (
            <button style={styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save blueprint →'}
            </button>
          ) : (
            <button
              style={{
                ...styles.primaryBtn,
                opacity: step === 1 && !canAdvancePlanInfo ? 0.4 : 1,
                cursor: step === 1 && !canAdvancePlanInfo ? 'not-allowed' : 'pointer',
              }}
              onClick={() => (step !== 1 || canAdvancePlanInfo) && setStep(s => s + 1)}
              disabled={step === 1 && !canAdvancePlanInfo}
            >
              {step === form.num_weeks + 1 ? 'Review plan →' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: 680, margin: '0 auto', padding: '0 20px 60px' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 32 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { height: 32, display: 'block', mixBlendMode: 'screen' },
  roleChip: { fontSize: 11, fontWeight: 700, background: ORANGE, color: '#fff', padding: '3px 8px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: { fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 500 },

  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 6 },
  pageDesc: { color: 'var(--text-2)', fontSize: 14, marginBottom: 28 },

  templateGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  templateCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 20, borderRadius: 12, border: '2px solid var(--border)', background: 'var(--card)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' },
  templateIcon: { fontSize: 24 },
  templateLabel: { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  templateDesc: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 },

  progressWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  progressLabel: { fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap', minWidth: 80 },
  progressBar: { flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 },
  progressFill: { height: '100%', background: ORANGE, borderRadius: 2, transition: 'width 0.3s' },
  progressPct: { fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', minWidth: 32, textAlign: 'right' },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 },
  stepTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, marginTop: 16 },
  input: { width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', boxSizing: 'border-box', outline: 'none' },
  textarea: { width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },

  sessionsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  addBtn: { fontSize: 13, padding: '6px 14px', borderRadius: 8, border: `1px solid ${ORANGE}`, background: 'transparent', color: ORANGE, cursor: 'pointer', fontWeight: 600 },
  emptyMsg: { color: 'var(--text-3)', fontSize: 13, padding: '10px 0' },
  sessionRow: { border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10, background: 'var(--card-inner)' },
  sessionTopRow: { display: 'flex', gap: 8, alignItems: 'center' },
  removeBtn: { background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 },

  actions: { display: 'flex', justifyContent: 'flex-end', marginTop: 28 },
  primaryBtn: { padding: '11px 28px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', letterSpacing: 0.2 },
  errorBox: { background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 16 },

  reviewMeta: { fontSize: 16, color: 'var(--text)', marginBottom: 6 },
  reviewDesc: { color: 'var(--text-2)', fontSize: 14, marginBottom: 16 },
  reviewWeek: { borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 },
  reviewWeekTitle: { fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 },
  reviewObjective: { color: 'var(--text-2)', fontSize: 13, marginBottom: 8, fontStyle: 'italic' },
  reviewEmpty: { color: 'var(--text-3)', fontSize: 13 },
  reviewSession: { marginBottom: 8 },
  reviewDay: { fontSize: 11, fontWeight: 700, color: ORANGE, marginRight: 8 },
  reviewFocus: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  reviewSessionDesc: { fontSize: 13, color: 'var(--text-2)', margin: '2px 0 0 0', lineHeight: 1.5 },
}
