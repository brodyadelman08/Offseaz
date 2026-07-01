import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { FlameIcon, CalendarIcon, EditIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon, ClipboardIcon, BoltIcon, StatusInjuryIcon } from '../components/Icons'
import AvatarUpload from '../components/AvatarUpload'
import PRCelebration from '../components/PRCelebration'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const RED  = '#DC2626'
const GREY = '#666666'

// Brand-color-only status system — no green anywhere. Completed uses blue,
// not the traditional green "success" color, to stay within the 5 Offseaz colors.
const LOG_STATUS = {
  completed:      { label: 'Completed',        color: BLUE, bg: 'rgba(48,142,189,0.12)', border: BLUE   },
  partial:        { label: 'Partial',          color: '#9a6b00', bg: 'rgba(240,190,36,0.15)', border: YELLOW },
  skipped:        { label: 'Skipped',          color: GREY, bg: 'rgba(102,102,102,0.12)', border: GREY   },
  skipped_injury: { label: 'Skipped — Injury', color: RED,  bg: 'rgba(220,38,38,0.10)',   border: RED    },
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

// ─── Performance metric definitions ──────────────────────────────────────────
// Values stored as: seconds for time/speed, total inches for feet/in, total
// seconds for min:sec, raw value for mph/reps/inches.

const PERF_METRICS = {
  forty_yard_dash:     { name: '40 Yard Dash',            category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  thirty_yard_dash:    { name: '30 Yard Dash',            category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  sixty_yard_dash:     { name: '60 Yard Dash',            category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  ten_yard_split:      { name: '10 Yard Split',           category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  pro_agility:         { name: 'Pro Agility 5-10-5',      category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  three_cone:          { name: '3 Cone L Drill',          category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  vertical_jump:       { name: 'Vertical Jump',           category: 'Power & Jumping',     unit: 'inches',      lowerIsBetter: false },
  broad_jump:          { name: 'Broad Jump',              category: 'Power & Jumping',     unit: 'feet_inches', lowerIsBetter: false },
  standing_long_jump:  { name: 'Standing Long Jump',      category: 'Power & Jumping',     unit: 'feet_inches', lowerIsBetter: false },
  box_jump:            { name: 'Box Jump Height',         category: 'Power & Jumping',     unit: 'inches',      lowerIsBetter: false },
  exit_velocity:       { name: 'Exit Velocity',           category: 'Throwing & Velocity', unit: 'mph',         lowerIsBetter: false },
  pitch_velocity:      { name: 'Pitch Velocity',          category: 'Throwing & Velocity', unit: 'mph',         lowerIsBetter: false },
  shot_put:            { name: 'Shot Put Distance',       category: 'Field Events',        unit: 'feet_inches', lowerIsBetter: false },
  discus:              { name: 'Discus Distance',         category: 'Field Events',        unit: 'feet_inches', lowerIsBetter: false },
  javelin:             { name: 'Javelin Distance',        category: 'Field Events',        unit: 'feet_inches', lowerIsBetter: false },
  mile_time:           { name: 'Mile Time',               category: 'Conditioning',        unit: 'min_sec',     lowerIsBetter: true  },
  four_hundred_meter:  { name: '400 Meter',               category: 'Conditioning',        unit: 'seconds',     lowerIsBetter: true  },
  eight_hundred_meter: { name: '800 Meter',               category: 'Conditioning',        unit: 'min_sec',     lowerIsBetter: true  },
  bench_225_reps:      { name: '225 lb Bench Press Reps', category: 'Football Combine',    unit: 'reps',        lowerIsBetter: false },
}

const THROWING_SUB_TYPES = {
  infield:          { name: 'Infield Velocity',        unit: 'mph',     lowerIsBetter: false },
  outfield:         { name: 'Outfield Velocity',       unit: 'mph',     lowerIsBetter: false },
  football_pass:    { name: 'Football Pass Velocity',  unit: 'mph',     lowerIsBetter: false },
  lacrosse_throw:   { name: 'Lacrosse Throw Velocity', unit: 'mph',     lowerIsBetter: false },
  catcher_pop_time: { name: 'Catcher Pop Time',        unit: 'seconds', lowerIsBetter: true  },
}

const PERF_CATEGORIES = [
  { label: 'Speed & Agility',    keys: ['forty_yard_dash','thirty_yard_dash','sixty_yard_dash','ten_yard_split','pro_agility','three_cone'] },
  { label: 'Power & Jumping',    keys: ['vertical_jump','broad_jump','standing_long_jump','box_jump'] },
  { label: 'Throwing & Velocity',keys: ['exit_velocity','pitch_velocity','throwing_velocity'] },
  { label: 'Field Events',       keys: ['shot_put','discus','javelin'] },
  { label: 'Conditioning',       keys: ['mile_time','four_hundred_meter','eight_hundred_meter'] },
  { label: 'Football Combine',   keys: ['bench_225_reps'] },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtShortDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function fmtPerfValue(val, unit) {
  if (val == null) return '—'
  const n = Number(val)
  if (unit === 'feet_inches') {
    const ft = Math.floor(n / 12)
    const inch = parseFloat((n % 12).toFixed(1))
    return `${ft}' ${inch}"`
  }
  if (unit === 'min_sec') {
    const min = Math.floor(n / 60)
    const sec = (n % 60).toFixed(2).padStart(5, '0')
    return `${min}:${sec}`
  }
  if (unit === 'seconds') return `${n}s`
  if (unit === 'inches')  return `${n}"`
  if (unit === 'mph')     return `${n} mph`
  if (unit === 'reps')    return `${n} reps`
  return String(n)
}

function getSelectionDef(sel) {
  if (sel.metric_id === 'throwing_velocity' && sel.sub_type_id) {
    const st = THROWING_SUB_TYPES[sel.sub_type_id]
    if (!st) return null
    return { name: `Throwing Velocity — ${st.name}`, unit: st.unit, lowerIsBetter: st.lowerIsBetter }
  }
  return PERF_METRICS[sel.metric_id] || null
}

function computeStoredValue(unit, val1, val2) {
  if (unit === 'feet_inches') return (parseFloat(val1 || 0) * 12) + parseFloat(val2 || 0)
  if (unit === 'min_sec')     return (parseFloat(val1 || 0) * 60) + parseFloat(val2 || 0)
  return parseFloat(val1 || 0)
}

function isPerfFormValid(unit, val1, val2) {
  const v = computeStoredValue(unit, val1, val2)
  return isFinite(v) && v > 0
}

function unitHint(unit, lowerIsBetter) {
  const label = { seconds: 'sec', inches: 'in', feet_inches: 'ft/in', mph: 'mph', reps: 'reps', min_sec: 'min:sec' }[unit] || unit
  return `${label} · ${lowerIsBetter ? '↓ lower is better' : '↑ higher is better'}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PerfLogInput({ unit, val1, val2, onVal1, onVal2, inputStyle }) {
  if (unit === 'feet_inches') {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, width: 70 }} type="number" placeholder="ft" min="0" step="1" value={val1} onChange={e => onVal1(e.target.value)} />
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>ft</span>
        <input style={{ ...inputStyle, width: 70 }} type="number" placeholder="in" min="0" max="11.9" step="0.1" value={val2} onChange={e => onVal2(e.target.value)} />
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>in</span>
      </div>
    )
  }
  if (unit === 'min_sec') {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input style={{ ...inputStyle, width: 70 }} type="number" placeholder="min" min="0" step="1" value={val1} onChange={e => onVal1(e.target.value)} />
        <span style={{ color: 'var(--text-3)', fontSize: 16, fontWeight: 700 }}>:</span>
        <input style={{ ...inputStyle, width: 80 }} type="number" placeholder="sec" min="0" max="59.99" step="0.01" value={val2} onChange={e => onVal2(e.target.value)} />
      </div>
    )
  }
  const placeholders = { seconds: '4.35', inches: '36', mph: '95.2', reps: '25' }
  const steps        = { seconds: '0.01', inches: '0.5',  mph: '0.1',  reps: '1'  }
  return (
    <input
      style={inputStyle}
      type="number"
      placeholder={placeholders[unit] || '0'}
      min="0"
      step={steps[unit] || '0.01'}
      value={val1}
      onChange={e => onVal1(e.target.value)}
    />
  )
}

function AddLiftsModal({ selectedLifts, onSave, onClose }) {
  const [checked, setChecked] = useState(() => {
    const init = {}
    for (const { key } of LIFTS) init[key] = selectedLifts.includes(key)
    return init
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  function toggle(key) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    setErr(null)
    try {
      const newLifts = LIFTS.map(l => l.key).filter(k => checked[k])
      await api.put('/api/maxes/selections', { lifts: newLifts })
      onSave(newLifts)
    } catch (e) {
      setErr('Failed to save. Please try again.')
      console.error('[AddLifts]', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={ms.overlay}>
      <div style={ms.panel}>
        <div style={ms.header}>
          <h2 style={ms.title}>Select Lifts</h2>
          <p style={ms.subtitle}>Choose which lifts appear in your Strength PRs section. Leave all unchecked to show everything.</p>
        </div>
        <div style={{ overflowY: 'auto', padding: '12px 20px 0', flex: 1 }}>
          {LIFTS.map(({ key, label }) => (
            <div key={key} style={ms.checkRow} onClick={() => toggle(key)}>
              <div style={{ ...ms.checkbox, borderColor: checked[key] ? ORANGE : 'var(--border)', background: checked[key] ? ORANGE : 'transparent' }}>
                {checked[key] && <span style={ms.checkmark}>✓</span>}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
            </div>
          ))}
        </div>
        {err && <p style={{ fontSize: 12, color: '#c73820', margin: '0 20px 8px', background: '#fce8e6', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 10px' }}>{err}</p>}
        <div style={ms.footer}>
          <button style={{ ...ms.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button style={ms.cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function AddMetricsModal({ existingSelections, onSave, onClose }) {
  const [checked, setChecked] = useState(() => {
    const init = {}
    for (const sel of existingSelections) {
      const key = sel.metric_id === 'throwing_velocity' && sel.sub_type_id
        ? `throwing_velocity_${sel.sub_type_id}`
        : sel.metric_id
      init[key] = true
    }
    return init
  })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(null)

  function toggle(key) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveErr(null)
    try {
      const toAdd    = []
      const toRemove = []

      // Items to remove: existing selections no longer checked
      for (const sel of existingSelections) {
        const key = sel.metric_id === 'throwing_velocity' && sel.sub_type_id
          ? `throwing_velocity_${sel.sub_type_id}`
          : sel.metric_id
        if (!checked[key]) toRemove.push(sel.id)
      }

      // Items to add: checked but not already selected
      for (const [key, isChecked] of Object.entries(checked)) {
        if (!isChecked) continue
        const isThrowingSub = key.startsWith('throwing_velocity_')
        const metricId  = isThrowingSub ? 'throwing_velocity' : key
        const subTypeId = isThrowingSub ? key.replace('throwing_velocity_', '') : null
        const alreadyExists = existingSelections.some(s =>
          s.metric_id === metricId &&
          (subTypeId ? s.sub_type_id === subTypeId : s.sub_type_id == null)
        )
        if (!alreadyExists) toAdd.push({ metric_id: metricId, sub_type_id: subTypeId })
      }

      await Promise.all([
        ...toAdd.map(s => api.post('/api/performance/selections', s)),
        ...toRemove.map(id => api.delete(`/api/performance/selections/${id}`)),
      ])

      onSave()
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save. Please try again.'
      setSaveErr(msg)
      console.error('[AddMetrics]', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={ms.overlay}>
      <div style={ms.panel}>
        <div style={ms.header}>
          <h2 style={ms.title}>Select Performance Metrics</h2>
          <p style={ms.subtitle}>Choose the metrics you want displayed on your profile.</p>
        </div>

        <div style={ms.body}>
          {PERF_CATEGORIES.map(cat => (
            <div key={cat.label} style={ms.category}>
              <p style={ms.catLabel}>{cat.label}</p>

              {cat.keys.map(metricId => {
                if (metricId === 'throwing_velocity') {
                  return (
                    <div key="throwing_velocity">
                      <p style={ms.groupHeader}>Throwing Velocity</p>
                      {Object.entries(THROWING_SUB_TYPES).map(([stId, st]) => {
                        const key = `throwing_velocity_${stId}`
                        return (
                          <div key={stId} style={{ ...ms.checkRow, paddingLeft: 20 }} onClick={() => toggle(key)}>
                            <div style={{ ...ms.checkbox, borderColor: checked[key] ? ORANGE : 'var(--border)', background: checked[key] ? ORANGE : 'transparent' }}>
                              {checked[key] && <span style={ms.checkmark}>✓</span>}
                            </div>
                            <div style={ms.metricInfo}>
                              <span style={ms.metricName}>{st.name}</span>
                              <span style={ms.metricHint}>{unitHint(st.unit, st.lowerIsBetter)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }

                const def = PERF_METRICS[metricId]
                if (!def) return null
                return (
                  <div key={metricId} style={ms.checkRow} onClick={() => toggle(metricId)}>
                    <div style={{ ...ms.checkbox, borderColor: checked[metricId] ? ORANGE : 'var(--border)', background: checked[metricId] ? ORANGE : 'transparent' }}>
                      {checked[metricId] && <span style={ms.checkmark}>✓</span>}
                    </div>
                    <div style={ms.metricInfo}>
                      <span style={ms.metricName}>{def.name}</span>
                      <span style={ms.metricHint}>{unitHint(def.unit, def.lowerIsBetter)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {saveErr && <p style={ms.err}>{saveErr}</p>}

        <div style={ms.footer}>
          <button style={{ ...ms.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button style={ms.cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AthleteMyProfile() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState(null)
  const [coachPlan, setCoachPlan] = useState(null)
  const [autoPlan,  setAutoPlan]  = useState(null)
  const [logs, setLogs] = useState([])
  const [maxes, setMaxes] = useState(null)
  const [loading, setLoading] = useState(true)

  // Strength PR form state
  const [logForms, setLogForms] = useState(
    Object.fromEntries(LIFTS.map(l => [l.key, { open: false, weight: '', reps: '1', notes: '' }]))
  )
  const [historyOpen, setHistoryOpen] = useState(
    Object.fromEntries(LIFTS.map(l => [l.key, false]))
  )
  const [submitting, setSubmitting] = useState(null)
  const [saveErrors, setSaveErrors] = useState({})
  const [savingPrivacy,  setSavingPrivacy]  = useState(false)
  const [prCelebration,  setPrCelebration]  = useState(null)
  const [physicalEditing, setPhysicalEditing] = useState(false)
  const [physicalForm, setPhysicalForm] = useState({ height_feet: '', height_inches: '', weight_lbs: '' })
  const [savingPhysical, setSavingPhysical] = useState(false)

  // Lift selections state (Fix 4)
  const [selectedLifts,  setSelectedLifts]  = useState([])
  const [showAddLifts,   setShowAddLifts]   = useState(false)
  // Synchronous mirror of selectedLifts — read by handleRemoveLift so that two
  // deletes fired back-to-back (before the first one's setState has committed
  // and re-rendered) never both decide from the same stale value.
  const selectedLiftsRef = useRef(selectedLifts)
  useEffect(() => { selectedLiftsRef.current = selectedLifts }, [selectedLifts])

  // Performance PRs state
  const [perfSelections, setPerfSelections] = useState([])
  const [perfLoading,    setPerfLoading]    = useState(true)
  const [showAddMetrics, setShowAddMetrics] = useState(false)
  const [perfLogForms,   setPerfLogForms]   = useState({}) // { [selectionId]: { open, val1, val2, submitting, error } }
  const [perfHistOpen,   setPerfHistOpen]   = useState({}) // { [selectionId]: bool }
  const [perfHistData,   setPerfHistData]   = useState({}) // { [selectionId]: entries[] }
  const [confirmRemove, setConfirmRemove] = useState(null) // { type: 'lift'|'metric', key?, label?, selId?, name? }

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

    api.get('/api/maxes/selections')
      .then(r => setSelectedLifts(r.data.selected_lifts || []))
      .catch(() => {})

    api.get('/api/performance/mine')
      .then(r => setPerfSelections(r.data.selections || []))
      .catch(() => setPerfSelections([]))
      .finally(() => setPerfLoading(false))
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

  async function handleRemovePerfSelection(selId) {
    try {
      await api.delete(`/api/performance/selections/${selId}`)
      setPerfSelections(prev => prev.filter(s => s.id !== selId))
    } catch (err) {
      console.error('[removePerfSelection]', err)
    }
  }

  async function handleConfirmRemove() {
    const target = confirmRemove
    setConfirmRemove(null)
    if (target.type === 'lift') {
      const current = selectedLiftsRef.current
      const visible = current.length === 0 ? LIFTS.map(l => l.key) : current
      const next    = visible.filter(k => k !== target.key)
      selectedLiftsRef.current = next
      try {
        await api.delete(`/api/maxes/selections/${target.key}`)
        setSelectedLifts(next)
      } catch (err) {
        selectedLiftsRef.current = current
        console.error('[removeLift]', err)
      }
    } else if (target.type === 'metric') {
      try {
        await api.delete(`/api/performance/selections/${target.selId}`)
        setPerfSelections(prev => prev.filter(s => s.id !== target.selId))
      } catch (err) {
        console.error('[removePerfSelection]', err)
      }
    }
  }

  async function handleRemoveLift(liftKey) {
    // Read from ref so rapid back-to-back clicks see the result of the
    // previous removal rather than stale closed-over selectedLifts.
    const current = selectedLiftsRef.current
    const visible = current.length === 0 ? LIFTS.map(l => l.key) : current
    const next    = visible.filter(k => k !== liftKey)
    selectedLiftsRef.current = next  // claim immediately

    try {
      // Single PUT replaces the full list atomically — no wasDefault branching,
      // no individual DELETEs that silently fail when the DB row is missing.
      await api.put('/api/maxes/selections', { lifts: next })
      setSelectedLifts(next)
    } catch (err) {
      selectedLiftsRef.current = current  // revert on failure
      console.error('[removeLift]', err)
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
        setPrCelebration({
          lift: liftKey,
          newWeight: w,
          reps: parseInt(form.reps) || 1,
          estimated1rm: postRes.data.estimated_1rm ?? null,
          previousBest: postRes.data.previous_best ?? null,
          unit: 'lbs',
          isLowerBetter: false,
        })
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save. Please try again.'
      setSaveErrors(prev => ({ ...prev, [liftKey]: msg }))
    } finally {
      setSubmitting(null)
    }
  }

  // Performance PR helpers
  function getPerfForm(selId) {
    return perfLogForms[selId] || { open: false, val1: '', val2: '', submitting: false, error: null }
  }

  function setPerfForm(selId, patch) {
    setPerfLogForms(prev => ({ ...prev, [selId]: { ...getPerfForm(selId), ...patch } }))
  }

  async function handleLogPerf(sel) {
    const def  = getSelectionDef(sel)
    if (!def) return
    const form = getPerfForm(sel.id)
    const storedVal = computeStoredValue(def.unit, form.val1, form.val2)
    if (!isPerfFormValid(def.unit, form.val1, form.val2)) return

    setPerfForm(sel.id, { submitting: true, error: null })
    try {
      const res = await api.post('/api/performance/log', { selection_id: sel.id, value: storedVal })
      // Refresh selections to get updated PR
      const fresh = await api.get('/api/performance/mine')
      setPerfSelections(fresh.data.selections || [])
      setPerfForm(sel.id, { open: false, val1: '', val2: '', submitting: false, error: null })
      // Clear cached history so it refreshes next time
      setPerfHistData(prev => { const n = { ...prev }; delete n[sel.id]; return n })
      if (res.data.is_pr) {
        setPrCelebration({
          lift: def.name,
          newWeight: storedVal,
          previousBest: res.data.previous_best ?? null,
          unit: def.unit,
          isLowerBetter: def.lowerIsBetter,
        })
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to save. Please try again.'
      setPerfForm(sel.id, { submitting: false, error: msg })
    }
  }

  async function handleTogglePerfHistory(selId) {
    if (perfHistOpen[selId]) {
      setPerfHistOpen(prev => ({ ...prev, [selId]: false }))
      return
    }
    setPerfHistOpen(prev => ({ ...prev, [selId]: true }))
    if (!perfHistData[selId]) {
      try {
        const res = await api.get(`/api/performance/selections/${selId}/history`)
        setPerfHistData(prev => ({ ...prev, [selId]: res.data.history || [] }))
      } catch (err) {
        console.error('[perf history]', err)
      }
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
          reps={prCelebration.reps}
          estimated1rm={prCelebration.estimated1rm}
          previousBest={prCelebration.previousBest}
          athleteName={profile?.full_name}
          sport={survey?.sport}
          unit={prCelebration.unit || 'lbs'}
          isLowerBetter={prCelebration.isLowerBetter || false}
          onClose={() => setPrCelebration(null)}
        />
      )}
      {showAddLifts && (
        <AddLiftsModal
          selectedLifts={selectedLifts}
          onSave={(newSelection) => {
            setSelectedLifts(newSelection)
            setShowAddLifts(false)
          }}
          onClose={() => setShowAddLifts(false)}
        />
      )}
      {showAddMetrics && (
        <AddMetricsModal
          existingSelections={perfSelections}
          onSave={async () => {
            setShowAddMetrics(false)
            const fresh = await api.get('/api/performance/mine').catch(() => ({ data: { selections: [] } }))
            setPerfSelections(fresh.data.selections || [])
          }}
          onClose={() => setShowAddMetrics(false)}
        />
      )}
      {confirmRemove && (
        <div style={cs.overlay} onClick={() => setConfirmRemove(null)}>
          <div style={cs.card} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={{ width: 140, display: 'block', margin: '0 auto' }} />
            </div>
            <h3 style={cs.headline}>
              {confirmRemove.type === 'lift'
                ? 'Remove this lift from your profile'
                : 'Remove this metric from your profile'}
            </h3>
            <p style={cs.body}>
              {confirmRemove.type === 'lift'
                ? 'Your PR history and all logged data for this lift will be permanently deleted. This cannot be undone.'
                : 'Your logged values and PR history for this metric will be permanently deleted. This cannot be undone.'}
            </p>
            <div style={cs.btnRow}>
              <button style={cs.keepBtn} onClick={() => setConfirmRemove(null)}>Keep It</button>
              <button style={cs.deleteBtn} onClick={handleConfirmRemove}>Yes, Remove and Delete History</button>
            </div>
          </div>
        </div>
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
              {[survey.sport, survey.position, survey.time_per_week ? `${survey.time_per_week} days/wk` : null].filter(Boolean).join(' · ')}
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
          <span style={{ ...styles.statVal, color: completedSessions > 0 ? BLUE : 'var(--text)' }}>{completedSessions}</span>
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
            <EditIcon size={14} color={BLUE} /> Retake
          </button>
        </div>
        {!survey ? (
          <div style={styles.emptyAction}>
            <p style={styles.emptyText}>Survey not completed yet.</p>
            <button style={styles.primaryBtn} onClick={() => navigate('/survey')}>Complete profile</button>
          </div>
        ) : (
          <>
            {[{ label: 'Goals', val: survey.goals }, { label: 'Weaknesses', val: survey.weaknesses }, { label: 'Injury History', val: survey.injury_history }]
              .map(f => f.val ? (
                <div key={f.label} style={styles.surveyField}>
                  <p style={styles.fieldLabel}>{f.label}</p>
                  <p style={styles.fieldValue}>{f.val}</p>
                </div>
              ) : null)}
            {survey.equipment?.length > 0 && (
              <div style={styles.surveyField}>
                <p style={styles.fieldLabel}>Equipment</p>
                <div style={styles.pillRow}>
                  {survey.equipment.map((eq, i) => <span key={i} style={styles.pill}>{eq}</span>)}
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
                <EditIcon size={14} color={BLUE} /> Edit
              </button>
            )}
          </div>
          {physicalEditing ? (
            <div style={styles.physicalForm}>
              <div style={styles.physicalRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.physicalLabel}>Height</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input style={{ ...styles.physicalInput, width: 70 }} type="number" placeholder="ft" min="3" max="8" value={physicalForm.height_feet} onChange={e => setPhysicalForm(p => ({ ...p, height_feet: e.target.value }))} />
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }}>ft</span>
                    <input style={{ ...styles.physicalInput, width: 70 }} type="number" placeholder="in" min="0" max="11" value={physicalForm.height_inches} onChange={e => setPhysicalForm(p => ({ ...p, height_inches: e.target.value }))} />
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }}>in</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.physicalLabel}>Weight</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input style={{ ...styles.physicalInput, width: 100 }} type="number" placeholder="lbs" min="50" max="500" value={physicalForm.weight_lbs} onChange={e => setPhysicalForm(p => ({ ...p, weight_lbs: e.target.value }))} />
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }}>lbs</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{ ...styles.saveBtn, maxWidth: 100, opacity: savingPhysical ? 0.6 : 1 }} onClick={handleSavePhysical} disabled={savingPhysical}>
                  {savingPhysical ? 'Saving…' : 'Save'}
                </button>
                <button style={styles.cancelBtn} onClick={() => setPhysicalEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={styles.physicalDisplay}>
              <div style={styles.physicalStat}>
                <span style={styles.physicalStatLabel}>Height</span>
                <span style={styles.physicalStatVal}>
                  {survey.height_feet != null ? `${survey.height_feet}' ${survey.height_inches ?? 0}"` : <span style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: 14 }}>Not set</span>}
                </span>
              </div>
              <div style={styles.physicalStat}>
                <span style={styles.physicalStatLabel}>Weight</span>
                <span style={styles.physicalStatVal}>
                  {survey.weight_lbs != null ? `${survey.weight_lbs} lbs` : <span style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: 14 }}>Not set</span>}
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
            <CalendarIcon size={14} color={BLUE} /> View plan
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

      {/* ── Strength PRs ────────────────────────────────────────────────────── */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <div style={styles.cardHeader}>
          <p style={{ ...styles.cardLabel, color: ORANGE, marginBottom: 0 }}>Strength PRs</p>
          <button style={styles.editBtn} onClick={() => setShowAddLifts(true)}>
            <PlusIcon size={13} color={BLUE} /> {selectedLifts.length > 0 ? 'Edit Lifts' : 'Add Lifts'}
          </button>
        </div>
        {(() => {
          const visibleLifts = selectedLifts.length > 0
            ? LIFTS.filter(l => selectedLifts.includes(l.key))
            : LIFTS
          return (
        <div style={styles.maxesGrid}>
          {visibleLifts.map(({ key, label }) => {
            const liftData = maxes?.[key]
            const current  = liftData?.current
            const history  = liftData?.history || []
            const form     = logForms[key]
            const isHistOpen   = historyOpen[key]
            const isSubmitting = submitting === key

            return (
              <div key={key} style={styles.liftCard}>
                <div style={styles.liftTop}>
                  <span style={styles.liftLabel}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    {current && (
                      <span style={styles.liftPR}>
                        {current.weight_lbs} <span style={styles.liftUnit}>lbs{current.reps > 1 ? ` x ${current.reps}` : ''}</span>
                      </span>
                    )}
                    <button
                      style={styles.removeLiftBtn}
                      onClick={() => setConfirmRemove({ type: 'lift', key, label })}
                      title="Remove lift"
                      aria-label={`Remove ${label}`}
                    >×</button>
                  </div>
                </div>
                {current ? (
                  <p style={styles.liftDate}>Set {fmtShortDate(current.logged_at)}{current.notes ? ` · ${current.notes}` : ''}</p>
                ) : (
                  <p style={styles.liftEmpty}>No max logged yet</p>
                )}
                {!form.open ? (
                  <button style={styles.logPRBtn} onClick={() => setLogForms(prev => ({ ...prev, [key]: { ...prev[key], open: true } }))}>
                    <PlusIcon size={13} color={ORANGE} /> Log PR
                  </button>
                ) : (
                  <div style={styles.logForm}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input style={{ ...styles.weightInput, flex: 2 }} type="number" placeholder="Weight (lbs)" min="1" max="2000" step="0.5" value={form.weight}
                        onChange={e => { setLogForms(prev => ({ ...prev, [key]: { ...prev[key], weight: e.target.value } })); setSaveErrors(prev => ({ ...prev, [key]: null })) }} />
                      <input style={{ ...styles.weightInput, flex: 1 }} type="number" placeholder="Reps" min="1" max="100" value={form.reps}
                        onChange={e => setLogForms(prev => ({ ...prev, [key]: { ...prev[key], reps: e.target.value } }))} />
                    </div>
                    <input style={styles.notesInput} type="text" placeholder="Notes (optional)" value={form.notes}
                      onChange={e => setLogForms(prev => ({ ...prev, [key]: { ...prev[key], notes: e.target.value } }))} />
                    {saveErrors[key] && <p style={styles.saveError}>{saveErrors[key]}</p>}
                    <div style={styles.logFormBtns}>
                      <button style={{ ...styles.saveBtn, opacity: (!form.weight || isSubmitting) ? 0.6 : 1 }} disabled={!form.weight || isSubmitting} onClick={() => handleLogMax(key)}>
                        {isSubmitting ? 'Saving…' : 'Save'}
                      </button>
                      <button style={styles.cancelBtn} onClick={() => { setLogForms(prev => ({ ...prev, [key]: { open: false, weight: '', reps: '1', notes: '' } })); setSaveErrors(prev => ({ ...prev, [key]: null })) }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {history.length > 1 && (
                  <button style={styles.historyToggle} onClick={() => setHistoryOpen(prev => ({ ...prev, [key]: !prev[key] }))}>
                    {isHistOpen ? <><ChevronUpIcon size={12} color="var(--text-3)" /> Hide history</> : <><ChevronDownIcon size={12} color="var(--text-3)" /> History ({history.length})</>}
                  </button>
                )}
                {isHistOpen && history.length > 0 && (
                  <div style={styles.historyList}>
                    {[...history].reverse().map(entry => (
                      <div key={entry.id} style={styles.historyRow}>
                        <span style={{ ...styles.historyWeight, color: entry.id === current?.id ? ORANGE : 'var(--text)', fontWeight: entry.id === current?.id ? 700 : 600 }}>
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
          )
        })()}
      </div>

      {/* ── Performance PRs ──────────────────────────────────────────────────── */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <div style={styles.cardHeader}>
          <p style={{ ...styles.cardLabel, color: BLUE }}>Performance PRs</p>
          <button style={styles.editBtn} onClick={() => setShowAddMetrics(true)}>
            <PlusIcon size={13} color={BLUE} /> Add Metrics
          </button>
        </div>

        {perfLoading ? (
          <p style={styles.emptyText}>Loading…</p>
        ) : perfSelections.length === 0 ? (
          <div style={styles.emptyAction}>
            <p style={styles.emptyText}>No performance metrics selected yet.</p>
            <button style={styles.primaryBtn} onClick={() => setShowAddMetrics(true)}>
              Add Your First Metric
            </button>
          </div>
        ) : (
          <div style={styles.maxesGrid}>
            {perfSelections.map(sel => {
              const def = getSelectionDef(sel)
              if (!def) return null
              const pr      = sel.performance_prs?.[0] ?? null
              const bestVal = pr ? Number(pr.best_value) : null
              const form    = getPerfForm(sel.id)
              const hist    = perfHistData[sel.id] || []

              return (
                <div key={sel.id} style={styles.liftCard}>
                  <div style={styles.liftTop}>
                    <span style={styles.liftLabel}>{def.name}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      {bestVal !== null && (
                        <span style={{ ...styles.liftPR, fontSize: bestVal >= 100 ? 16 : 22 }}>
                          {fmtPerfValue(bestVal, def.unit)}
                        </span>
                      )}
                      <button
                        style={styles.removeLiftBtn}
                        onClick={() => setConfirmRemove({ type: 'metric', selId: sel.id, name: def.name })}
                        title="Remove metric"
                        aria-label={`Remove ${def.name}`}
                      >×</button>
                    </div>
                  </div>

                  {pr ? (
                    <p style={styles.liftDate}>Set {fmtShortDate(pr.updated_at)}</p>
                  ) : (
                    <p style={styles.liftEmpty}>No value logged yet</p>
                  )}

                  {!form.open ? (
                    <button style={styles.logPRBtn} onClick={() => setPerfForm(sel.id, { open: true })}>
                      <PlusIcon size={13} color={ORANGE} /> Log New
                    </button>
                  ) : (
                    <div style={styles.logForm}>
                      <PerfLogInput
                        unit={def.unit}
                        val1={form.val1}
                        val2={form.val2}
                        onVal1={v => setPerfForm(sel.id, { val1: v, error: null })}
                        onVal2={v => setPerfForm(sel.id, { val2: v, error: null })}
                        inputStyle={styles.weightInput}
                      />
                      {form.error && <p style={styles.saveError}>{form.error}</p>}
                      <div style={styles.logFormBtns}>
                        <button
                          style={{ ...styles.saveBtn, opacity: (!isPerfFormValid(def.unit, form.val1, form.val2) || form.submitting) ? 0.6 : 1 }}
                          disabled={!isPerfFormValid(def.unit, form.val1, form.val2) || form.submitting}
                          onClick={() => handleLogPerf(sel)}
                        >
                          {form.submitting ? 'Saving…' : 'Save'}
                        </button>
                        <button style={styles.cancelBtn} onClick={() => setPerfForm(sel.id, { open: false, val1: '', val2: '', error: null })}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* History toggle (only visible once we have data) */}
                  {(hist.length > 1 || perfHistOpen[sel.id]) && (
                    <button style={styles.historyToggle} onClick={() => handleTogglePerfHistory(sel.id)}>
                      {perfHistOpen[sel.id]
                        ? <><ChevronUpIcon size={12} color="var(--text-3)" /> Hide history</>
                        : <><ChevronDownIcon size={12} color="var(--text-3)" /> History</>}
                    </button>
                  )}
                  {!perfHistOpen[sel.id] && hist.length === 0 && pr && (
                    <button style={styles.historyToggle} onClick={() => handleTogglePerfHistory(sel.id)}>
                      <ChevronDownIcon size={12} color="var(--text-3)" /> History
                    </button>
                  )}

                  {perfHistOpen[sel.id] && (
                    <div style={styles.historyList}>
                      {hist.length === 0 ? (
                        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>No entries yet.</p>
                      ) : hist.map((entry, i) => (
                        <div key={entry.id} style={styles.historyRow}>
                          <span style={{ ...styles.historyWeight, color: i === 0 ? ORANGE : 'var(--text)', fontWeight: i === 0 ? 700 : 600 }}>
                            {fmtPerfValue(entry.value, def.unit)}
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

      {/* Privacy settings */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <p style={{ ...styles.cardLabel, color: 'var(--text-3)' }}>Privacy</p>
        <div style={styles.privacyRow}>
          <div>
            <p style={styles.privacyTitle}>{profile?.privacy_team === 'private' ? 'Private' : 'Public to Team'}</p>
            <p style={styles.privacySub}>
              {profile?.privacy_team === 'private'
                ? 'Teammates can only see your name and avatar.'
                : 'Teammates can view your survey, lifting PRs, and activity stats.'}
            </p>
          </div>
          <button
            style={{ ...styles.privacyBtn, borderColor: profile?.privacy_team === 'private' ? BLUE : 'var(--border)', color: profile?.privacy_team === 'private' ? BLUE : 'var(--text-2)' }}
            onClick={handlePrivacyToggle}
            disabled={savingPrivacy}
          >
            {savingPrivacy ? 'Saving…' : profile?.privacy_team === 'private' ? 'Make Public' : 'Make Private'}
          </button>
        </div>
      </div>

      {/* Session log */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <div style={styles.cardHeader}>
          <p style={{ ...styles.cardLabel, color: YELLOW }}>Session Log</p>
          {logs.length > 0 && <span style={styles.logCount}>{logs.length} sessions</span>}
        </div>
        {logs.length === 0 ? (
          <p style={styles.emptyText}>No sessions logged yet.</p>
        ) : (
          <div style={styles.logList}>
            {logs.map((log, i) => {
              const s = LOG_STATUS[log.status] || LOG_STATUS.skipped
              const isInjury = log.status === 'skipped_injury'
              return (
                <div key={log.id} style={{ ...styles.logRow, borderLeft: `3px solid ${s.border}`, marginTop: i > 0 ? 8 : 0 }}>
                  <div style={styles.logTop}>
                    <span style={{ ...styles.logBadge, color: s.color, background: s.bg, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {isInjury && <StatusInjuryIcon size={11} color={RED} />}
                      {s.label}
                    </span>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  loading:   { color: 'var(--text-3)', fontSize: 15 },
  container: { maxWidth: 700, margin: '0 auto' },

  profileHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' },
  name:      { fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subline:   { fontSize: 14, color: 'var(--text-2)', margin: '0 0 2px' },
  photoHint: { fontSize: 11, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  statCard:  { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.04)' },
  statVal:   { fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  statLabel: { fontSize: 12, color: 'var(--text-3)' },

  card:       { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 'clamp(16px, 4vw, 24px)', boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardLabel:  { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 },
  editBtn:    { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: BLUE, background: 'none', border: `1px solid ${BLUE}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer' },
  logCount:   { fontSize: 13, color: 'var(--text-3)' },

  emptyAction: { display: 'flex', flexDirection: 'column', gap: 14 },
  emptyText:   { color: 'var(--text-3)', fontSize: 14, margin: 0 },
  primaryBtn:  { alignSelf: 'flex-start', padding: '9px 18px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(247,87,9,0.28)' },

  surveyField: { marginBottom: 16 },
  fieldLabel:  { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 4px' },
  fieldValue:  { fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: 0 },
  pillRow:     { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill:        { fontSize: 12, fontWeight: 600, background: 'var(--border)', color: 'var(--text-2)', padding: '3px 10px', borderRadius: 12 },

  planName: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  planMeta: { fontSize: 13, color: 'var(--text-3)', margin: 0 },
  coachBadge: { display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#308EBD', background: 'rgba(48,142,189,0.12)', padding: '3px 12px', borderRadius: 12 },
  autoBadge:  { display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#F75709', background: 'rgba(247,87,9,0.08)', padding: '3px 12px', borderRadius: 12 },

  physicalDisplay:  { display: 'flex', gap: 32, flexWrap: 'wrap' },
  physicalStat:     { display: 'flex', flexDirection: 'column', gap: 4 },
  physicalStatLabel:{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 },
  physicalStatVal:  { fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  physicalForm:     { display: 'flex', flexDirection: 'column', gap: 4 },
  physicalRow:      { display: 'flex', gap: 24, flexWrap: 'wrap' },
  physicalLabel:    { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  physicalInput:    { padding: '7px 10px', fontSize: 14, borderRadius: 6, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' },

  maxesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  liftCard:  { background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.14)' },
  liftTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  liftLabel: { fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4 },
  liftPR:    { fontSize: 22, fontWeight: 700, color: ORANGE, lineHeight: 1 },
  liftUnit:  { fontSize: 12, fontWeight: 600, color: 'var(--text-3)' },
  liftDate:  { fontSize: 11, color: 'var(--text-3)', margin: 0 },
  liftEmpty: { fontSize: 12, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' },
  removeLiftBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    background: 'rgba(247,87,9,0.12)', border: '1px solid rgba(247,87,9,0.35)',
    color: ORANGE, fontSize: 14, fontWeight: 700, lineHeight: 1, cursor: 'pointer', padding: 0,
  },

  logPRBtn:  { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: ORANGE, background: 'rgba(247,87,9,0.08)', border: `1px solid rgba(247,87,9,0.25)`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', marginTop: 4, alignSelf: 'flex-start', minHeight: 40 },

  logForm:    { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 },
  weightInput:{ padding: '7px 10px', fontSize: 14, borderRadius: 6, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  notesInput: { padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  logFormBtns:{ display: 'flex', gap: 6 },
  saveError:  { fontSize: 12, color: '#c73820', background: '#fce8e6', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 8px', margin: 0 },
  saveBtn:    { flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 6px rgba(247,87,9,0.28)', minHeight: 44 },
  cancelBtn:  { padding: '11px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer', minHeight: 44 },

  historyToggle:{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 },
  historyList:  { borderTop: '1px solid var(--border-light)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  historyRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyWeight:{ fontSize: 13, lineHeight: 1.4 },
  prTag:        { fontSize: 10, fontWeight: 700, color: ORANGE, background: 'rgba(247,87,9,0.12)', padding: '1px 5px', borderRadius: 3 },
  historyDate:  { fontSize: 11, color: 'var(--text-3)' },

  privacyRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  privacyTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  privacySub:   { fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 },
  privacyBtn:   { flexShrink: 0, padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },

  logList: { display: 'flex', flexDirection: 'column' },
  logRow:  { padding: '10px 12px', background: 'var(--card-inner)', borderRadius: '0 8px 8px 0' },
  logTop:  { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  logBadge:{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' },
  logFocus:{ fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  logEffort:{ fontSize: 13, color: 'var(--text-2)' },
  logWeek: { fontSize: 11, color: 'var(--text-3)', background: 'var(--border)', padding: '2px 6px', borderRadius: 3 },
  logDate: { fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' },
  logNote: { fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', margin: '6px 0 0', lineHeight: 1.5 },
}

// Add Metrics modal styles
const ms = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 },
  panel: { background: 'var(--card)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 30px rgba(0,0,0,0.4)' },
  header: { padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' },
  title: { fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subtitle: { fontSize: 13, color: 'var(--text-3)', margin: 0 },
  body: { overflowY: 'auto', padding: '12px 20px 0', flex: 1 },
  footer: { padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 },
  err: { fontSize: 12, color: '#c73820', margin: '0 20px 8px', background: '#fce8e6', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 10px' },

  category: { marginBottom: 20 },
  catLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' },
  groupHeader: { fontSize: 12, fontWeight: 700, color: BLUE, margin: '8px 0 4px' },
  checkRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 4px', cursor: 'pointer', borderRadius: 8,
    userSelect: 'none',
  },
  checkbox: { width: 18, height: 18, borderRadius: 4, border: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' },
  checkmark: { fontSize: 11, color: '#fff', fontWeight: 900, lineHeight: 1 },
  metricInfo: { display: 'flex', flexDirection: 'column', gap: 1 },
  metricName: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  metricHint: { fontSize: 11, color: 'var(--text-3)' },

  saveBtn:   { flex: 1, padding: '12px 0', fontSize: 15, fontWeight: 700, borderRadius: 12, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(247,87,9,0.3)' },
  cancelBtn: { padding: '12px 20px', fontSize: 14, fontWeight: 600, borderRadius: 12, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' },
}

// Confirm-remove modal styles
const cs = {
  overlay:   { position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card:      { background: '#111111', borderRadius: 16, padding: '32px 28px', maxWidth: 360, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' },
  headline:  { fontFamily: "'Calibri', 'Trebuchet MS', 'Segoe UI', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 20, color: '#FFFFFF', margin: '0 0 12px', textAlign: 'center', lineHeight: 1.3 },
  body:      { fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.55 },
  btnRow:    { display: 'flex', gap: 10 },
  keepBtn:   { flex: 1, padding: '11px 0', background: 'transparent', border: '1.5px solid #FFFFFF', borderRadius: 8, color: '#FFFFFF', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  deleteBtn: { flex: 1, padding: '11px 0', background: RED, border: 'none', borderRadius: 8, color: '#FFFFFF', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
}
