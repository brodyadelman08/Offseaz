import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { PlusIcon, CalendarIcon, DumbbellIcon, BoltIcon } from '../components/Icons'
import { SPORT_TEMPLATES, TEMPLATE_GOALS } from '../data/blueprintTemplates'

const ORANGE  = '#F75709'
const BLUE    = '#308EBD'
const YELLOW  = '#F0BE24'

// ─── Static templates ─────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    label: 'Start fresh',
    description: 'Build your own plan from scratch',
    Icon: PlusIcon,
    data: null,
  },
  {
    label: '4-Week General Conditioning',
    description: 'Mixed fitness foundation — a balanced starting block',
    Icon: CalendarIcon,
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
    Icon: DumbbellIcon,
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
    Icon: BoltIcon,
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
  const [daysPick, setDaysPick] = useState(null)          // null | { sport, pos } — for day-count sub-picker
  const [sportTab, setSportTab] = useState('general')     // 'general' | sport.id
  const [goalPick, setGoalPick] = useState(null)          // null | { sport, pos }

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

  function selectBaseballTemplate(daysPerWeek) {
    const { sport, pos } = daysPick
    const weeks = sport.generateWeeks(pos.id, 'standard', daysPerWeek)
    setForm({
      title: `Baseball — 16-Week Offseason (${daysPerWeek} Days/Week)`,
      description: `16-week phase-based offseason program for baseball athletes. Phase 1 (70%) → Phase 2 (75%) → Phase 3 (80%) → Phase 4 (85%). Squat and Trap Bar Deadlift weights auto-calculate from logged maxes.`,
      num_weeks: 16,
      weeks,
    })
    setDaysPick(null)
    setStep(1)
  }

  function selectSportTemplate(sport, pos, goal) {
    const weeks = sport.generateWeeks(pos.id, goal.id)
    const goalSuffix = goal.id === 'muscle_gain' ? ' — Muscle Gain' : ''
    setForm({
      title: `${sport.label} — ${pos.label} 16-Week Offseason${goalSuffix}`,
      description: `16-week phase-based offseason program for ${pos.label} (${pos.sublabel}). ${goal.desc}`,
      num_weeks: 16,
      weeks,
    })
    setGoalPick(null)
    setStep(1)
  }

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setNumWeeks(n) {
    const num = Math.min(16, Math.max(1, parseInt(n, 10) || 1))
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
      navigate(`/coach/blueprints/${res.data.blueprint.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save blueprint.')
      setSubmitting(false)
    }
  }

  const canAdvancePlanInfo = form.title.trim().length > 0
  const progressPct = step === 0 ? 0 : Math.round((step / totalSteps) * 100)

  // ── Template picker ───────────────────────────────────────────────────────────
  if (step === 0) {
    // Days/week sub-picker (for sports like Baseball that offer multiple training frequencies)
    if (daysPick) {
      const { sport } = daysPick
      return (
        <div style={styles.container}>
          <button style={styles.textBackBtn} onClick={() => setDaysPick(null)}>← Back to {sport.label}</button>
          <h1 style={styles.pageTitle}>{sport.label} — 16-Week Offseason</h1>
          <p style={styles.pageDesc}>How many days per week will your athletes train?</p>
          <div style={styles.dayGrid}>
            {sport.daysOptions.map(opt => (
              <button key={opt.days} style={styles.dayCard} onClick={() => selectBaseballTemplate(opt.days)}
                onMouseEnter={e => e.currentTarget.style.borderColor = ORANGE}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <span style={styles.dayNumber}>{opt.days}</span>
                <span style={styles.dayLabel}>days / week</span>
                <span style={styles.dayDesc}>{opt.desc}</span>
              </button>
            ))}
          </div>
          <div style={styles.phaseInfo}>
            <p style={styles.phaseInfoTitle}>Program Structure</p>
            {sport.phases.map(ph => (
              <div key={ph.num} style={styles.phaseRow}>
                <span style={styles.phaseBadge}>Phase {ph.num}</span>
                <span style={styles.phaseLabel}>{ph.label}</span>
                <span style={styles.phaseWeeks}>Weeks {ph.weeks}</span>
                <span style={styles.phasePct}>{ph.pct} of max</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Sport template: goal sub-picker (Standard vs Muscle Gain)
    if (goalPick) {
      const { sport, pos } = goalPick
      return (
        <div style={styles.container}>
          <button style={styles.textBackBtn} onClick={() => setGoalPick(null)}>
            ← Back to {sport.label}
          </button>
          <h1 style={styles.pageTitle}>{sport.label} — {pos.label}</h1>
          <p style={styles.pageDesc}>{pos.desc}</p>
          <p style={{ ...styles.sportMeta, marginBottom: 24 }}>
            {sport.daysPerWeek} days/week · 16 weeks · 4 phases
          </p>

          <div style={styles.dayGrid}>
            {TEMPLATE_GOALS.map(goal => (
              <button
                key={goal.id}
                style={{
                  ...styles.templateCard,
                  ...(goal.id === 'muscle_gain' ? styles.templateCardFeatured : {}),
                }}
                onClick={() => selectSportTemplate(sport, pos, goal)}
                onMouseEnter={e => e.currentTarget.style.borderColor = ORANGE}
                onMouseLeave={e => e.currentTarget.style.borderColor = goal.id === 'muscle_gain' ? 'rgba(240,190,36,0.4)' : 'var(--border)'}
              >
                <span style={styles.templateLabel}>{goal.label}</span>
                <span style={styles.templateDesc}>{goal.desc}</span>
              </button>
            ))}
          </div>

          <div style={styles.phaseInfo}>
            <p style={styles.phaseInfoTitle}>Program Structure</p>
            {sport.phases.map(ph => (
              <div key={ph.num} style={styles.phaseRow}>
                <span style={styles.phaseBadge}>Phase {ph.num}</span>
                <span style={styles.phaseLabel}>{ph.label}</span>
                <span style={styles.phaseWeeks}>Weeks {ph.weeks}</span>
                <span style={styles.phasePct}>{ph.pct}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Main template picker
    const activeSport = SPORT_TEMPLATES.find(s => s.id === sportTab)

    return (
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>Create Blueprint</h1>
        <p style={styles.pageDesc}>Choose a sport-specific template or start from scratch.</p>

        {/* Sport tab bar */}
        <div style={styles.sportTabBar}>
          <button
            style={{ ...styles.sportTabBtn, ...(sportTab === 'general' ? styles.sportTabBtnActive : {}) }}
            onClick={() => setSportTab('general')}
          >
            General
          </button>
          {SPORT_TEMPLATES.map(s => (
            <button
              key={s.id}
              style={{ ...styles.sportTabBtn, ...(sportTab === s.id ? styles.sportTabBtnActive : {}) }}
              onClick={() => setSportTab(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* General tab */}
        {sportTab === 'general' && (
          <div style={styles.templateGrid}>
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.label}
                style={styles.templateCard}
                onClick={() => selectTemplate(tpl)}
                onMouseEnter={e => e.currentTarget.style.borderColor = ORANGE}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={styles.templateIconWrap}>
                  <tpl.Icon size={22} color={ORANGE} />
                </div>
                <span style={styles.templateLabel}>{tpl.label}</span>
                <span style={styles.templateDesc}>{tpl.description}</span>
              </button>
            ))}
          </div>
        )}

        {/* Sport tab — position cards */}
        {activeSport && (
          <div>
            <p style={styles.sportMeta}>
              {activeSport.daysPerWeekPicker ? '3–6 days/week (choose below)' : `${activeSport.daysPerWeek} days/week`} · 16 weeks · 4 phases
            </p>
            <div style={styles.templateGrid}>
              {activeSport.positions.map(pos => (
                <button
                  key={pos.id}
                  style={{ ...styles.templateCard, ...styles.templateCardFeatured }}
                  onClick={() => activeSport.daysPerWeekPicker ? setDaysPick({ sport: activeSport, pos }) : setGoalPick({ sport: activeSport, pos })}
                  onMouseEnter={e => e.currentTarget.style.borderColor = ORANGE}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(240,190,36,0.4)'}
                >
                  <span style={styles.templateLabel}>{pos.label}</span>
                  <span style={{
                    ...styles.templateBadge,
                    color: ORANGE,
                    background: 'rgba(247,87,9,0.1)',
                  }}>{pos.sublabel}</span>
                  <span style={styles.templateDesc}>{pos.desc}</span>
                  <span style={styles.templateBadge}>16 weeks · 4 phases →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Steps 1+ ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <div style={styles.progressWrap}>
        <button type="button" style={styles.backBtn} onClick={() => setStep(s => s - 1)}>← Back</button>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
        </div>
        <span style={styles.progressPct}>
          {isReviewStep ? 'Review' : step === 1 ? 'Plan info' : `Wk ${step - 1}/${form.num_weeks}`}
        </span>
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
              {Array.from({ length: 16 }, (_, i) => i + 1).map(n => (
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
                <button type="button" style={styles.addBtn} onClick={() => addSession(wi)}>+ Add session</button>
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
                    <button type="button" style={styles.removeBtn} onClick={() => removeSession(wi, si)}>×</button>
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

        <div style={{ ...styles.actions, justifyContent: step >= 2 && !isReviewStep ? 'space-between' : 'flex-end' }}>
          {step >= 2 && !isReviewStep && (
            <button
              type="button"
              style={styles.skipBtn}
              onClick={() => setStep(totalSteps)}
            >
              Skip to Review →
            </button>
          )}
          {isReviewStep ? (
            <button type="button" style={styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save blueprint'}
            </button>
          ) : (
            <button
              type="button"
              style={{
                ...styles.primaryBtn,
                opacity: step === 1 && !canAdvancePlanInfo ? 0.4 : 1,
                cursor: step === 1 && !canAdvancePlanInfo ? 'not-allowed' : 'pointer',
              }}
              onClick={() => {
                if (step === 1 && !canAdvancePlanInfo) return
                setStep(s => s + 1)
              }}
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
  container: { maxWidth: 680, margin: '0 auto' },

  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 6 },
  pageDesc: { color: 'var(--text-2)', fontSize: 14, marginBottom: 28 },

  templateGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  templateCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: 20, borderRadius: 12, border: '2px solid var(--border)', background: 'var(--card)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' },
  templateIconWrap: { width: 40, height: 40, borderRadius: 10, background: 'rgba(247,87,9,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  templateLabel: { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  templateDesc: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 },
  templateCardFeatured: { border: `2px solid rgba(240,190,36,0.4)`, background: 'rgba(240,190,36,0.04)' },
  templateBadge: { fontSize: 11, fontWeight: 700, color: YELLOW, background: 'rgba(240,190,36,0.15)', borderRadius: 6, padding: '2px 8px', letterSpacing: 0.3 },

  textBackBtn: { fontSize: 13, fontWeight: 500, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px 0' },
  dayGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 },
  dayCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: 20, borderRadius: 12, border: '2px solid var(--border)', background: 'var(--card)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' },
  dayNumber: { fontSize: 36, fontWeight: 800, color: 'var(--text)', lineHeight: 1 },
  dayLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-2)' },
  dayDesc: { fontSize: 12, color: 'var(--text-3)', lineHeight: 1.4 },

  phaseInfo: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 },
  phaseInfoTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  phaseRow: { display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--border)' },
  phaseBadge: { fontSize: 11, fontWeight: 700, color: ORANGE, background: 'rgba(247,87,9,0.1)', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' },
  phaseLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 },
  phaseWeeks: { fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' },
  phasePct: { fontSize: 12, fontWeight: 700, color: ORANGE, whiteSpace: 'nowrap' },

  progressWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { fontSize: 13, fontWeight: 500, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' },
  progressBar: { flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 },
  progressFill: { height: '100%', background: ORANGE, borderRadius: 2, transition: 'width 0.3s' },
  progressPct: { fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right' },

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
  removeBtn: { background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, padding: '0 4px', flexShrink: 0 },

  actions: { display: 'flex', alignItems: 'center', marginTop: 28 },
  primaryBtn: { padding: '11px 28px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', letterSpacing: 0.2 },
  skipBtn: { fontSize: 13, fontWeight: 600, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: 0.1 },
  errorBox: { background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 16 },

  sportTabBar: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 16, scrollbarWidth: 'none' },
  sportTabBtn: { flexShrink: 0, padding: '7px 14px', fontSize: 13, fontWeight: 600, borderRadius: 20, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  sportTabBtnActive: { borderColor: ORANGE, color: ORANGE, background: 'rgba(247,87,9,0.07)' },
  sportMeta: { fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.4 },

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
