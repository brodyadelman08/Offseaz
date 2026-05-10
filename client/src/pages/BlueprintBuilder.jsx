import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const TEMPLATES = [
  {
    label: 'Start fresh',
    description: 'Build your own plan from scratch',
    data: null,
  },
  {
    label: '4-Week General Conditioning',
    description: 'Mixed fitness foundation — a balanced starting block',
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
  const [step, setStep] = useState(0) // 0 = template picker, 1 = plan info, 2+ = weeks
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    num_weeks: 4,
    weeks: makeWeeks(4),
  })

  // step 0 = template picker
  // step 1 = plan info
  // step 2..(num_weeks+1) = week editors
  // step num_weeks+2 = review
  const totalSteps = form.num_weeks + 2 // plan info + N weeks + review
  const weekStep = step - 1 // which week we're editing (0-indexed), only valid when step >= 2

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

  // ─── Template picker (step 0) ───────────────────────────────────────────────
  if (step === 0) {
    return (
      <div style={styles.container}>
        <button style={styles.backLink} onClick={() => navigate('/coach')}>← Back to dashboard</button>
        <h1 style={styles.pageTitle}>Create Blueprint</h1>
        <p style={styles.pageDesc}>Start from scratch or pick a template to pre-fill your plan.</p>
        <div style={styles.templateGrid}>
          {TEMPLATES.map(tpl => (
            <button key={tpl.label} style={styles.templateCard} onClick={() => selectTemplate(tpl)}>
              <span style={styles.templateLabel}>{tpl.label}</span>
              <span style={styles.templateDesc}>{tpl.description}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Progress bar (steps 1+) ─────────────────────────────────────────────────
  const progressPct = Math.round((step / (totalSteps)) * 100)
  const isReviewStep = step === totalSteps

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={() => setStep(s => s - 1)}>← Back</button>
      <div style={styles.progressWrap}>
        <span style={styles.progressLabel}>
          {isReviewStep ? 'Review' : step === 1 ? 'Plan info' : `Week ${step - 1} of ${form.num_weeks}`}
        </span>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
        </div>
      </div>

      <div style={styles.card}>

        {/* ── Step 1: Plan info ── */}
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

        {/* ── Steps 2..N+1: Week editors ── */}
        {step >= 2 && !isReviewStep && (() => {
          const wi = step - 2 // week index
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
                <span style={styles.label}>Sessions</span>
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
                    style={{ ...styles.textarea, marginTop: 6 }}
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

        {/* ── Review step ── */}
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
            {error && <p style={styles.error}>{error}</p>}
          </>
        )}

        <div style={styles.actions}>
          {isReviewStep ? (
            <button style={styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save blueprint'}
            </button>
          ) : (
            <button
              style={{ ...styles.primaryBtn, ...(step === 1 && !canAdvancePlanInfo ? styles.disabledBtn : {}) }}
              onClick={() => (step !== 1 || canAdvancePlanInfo) && setStep(s => s + 1)}
              disabled={step === 1 && !canAdvancePlanInfo}
            >
              {step === form.num_weeks + 1 ? 'Review plan' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: 660, margin: '0 auto', padding: '32px 20px' },
  backLink: { background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'block' },
  pageTitle: { fontSize: 26, fontWeight: 700, marginBottom: 6 },
  pageDesc: { color: '#666', fontSize: 14, marginBottom: 28 },
  templateGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  templateCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: 20, borderRadius: 10, border: '2px solid #e5e5e5', background: '#fff', cursor: 'pointer', textAlign: 'left' },
  templateLabel: { fontSize: 15, fontWeight: 700 },
  templateDesc: { fontSize: 13, color: '#666' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  progressLabel: { fontSize: 13, color: '#888', whiteSpace: 'nowrap' },
  progressBar: { flex: 1, height: 4, background: '#e5e5e5', borderRadius: 2 },
  progressFill: { height: '100%', background: '#1a1a1a', borderRadius: 2, transition: 'width 0.3s' },
  card: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 28 },
  stepTitle: { fontSize: 20, fontWeight: 700, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6, marginTop: 16 },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  sessionsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  addBtn: { fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #1a1a1a', background: '#fff', cursor: 'pointer', fontWeight: 600 },
  emptyMsg: { color: '#aaa', fontSize: 13, padding: '12px 0' },
  sessionRow: { border: '1px solid #e5e5e5', borderRadius: 8, padding: 12, marginBottom: 10, background: '#fafafa' },
  sessionTopRow: { display: 'flex', gap: 8, alignItems: 'center' },
  removeBtn: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 },
  actions: { display: 'flex', justifyContent: 'flex-end', marginTop: 28 },
  primaryBtn: { padding: '11px 28px', fontSize: 14, fontWeight: 600, borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer' },
  disabledBtn: { opacity: 0.4, cursor: 'not-allowed' },
  error: { color: '#c0392b', fontSize: 13, marginTop: 12 },
  reviewMeta: { fontSize: 16, marginBottom: 6 },
  reviewDesc: { color: '#666', fontSize: 14, marginBottom: 16 },
  reviewWeek: { borderTop: '1px solid #e5e5e5', paddingTop: 14, marginTop: 14 },
  reviewWeekTitle: { fontWeight: 700, fontSize: 14, marginBottom: 4 },
  reviewObjective: { color: '#555', fontSize: 13, marginBottom: 8, fontStyle: 'italic' },
  reviewEmpty: { color: '#aaa', fontSize: 13 },
  reviewSession: { marginBottom: 8 },
  reviewDay: { fontSize: 12, fontWeight: 700, color: '#888', marginRight: 8 },
  reviewFocus: { fontSize: 13, fontWeight: 600 },
  reviewSessionDesc: { fontSize: 13, color: '#555', margin: '2px 0 0 0' },
}
