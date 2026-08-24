import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { stripSupersetMarker } from '../utils/supersets'
import { useCoachAccess } from '../context/CoachAccessContext'
import {
  PlusIcon, CalendarIcon, DumbbellIcon, BoltIcon, EditIcon, CopyIcon, LockIcon, UnlockIcon,
  FootballIcon, BasketballIcon, BaseballIcon, SoftballIcon, SoccerIcon, HockeyIcon,
  RugbyIcon, TennisIcon, GolfIcon, WrestlingIcon, VolleyballIcon, RunningIcon,
  CrossCountryIcon, LacrosseIcon, SwimmingIcon,
} from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const CELL_W = 220
const LABEL_W = 130

const SPORT_ICONS = {
  baseball: BaseballIcon, softball: SoftballIcon, football: FootballIcon, basketball: BasketballIcon,
  soccer: SoccerIcon, hockey: HockeyIcon, rugby: RugbyIcon, tennis: TennisIcon, golf: GolfIcon,
  wrestling: WrestlingIcon, volleyball: VolleyballIcon, track: RunningIcon, cross_country: CrossCountryIcon,
  lacrosse: LacrosseIcon, swimming: SwimmingIcon,
}

const TEMPLATES = [
  { label: 'Start fresh', description: 'Build your own plan from scratch', Icon: PlusIcon, data: null },
  { label: '4-Week General Conditioning', description: 'Mixed fitness foundation — a balanced starting block', Icon: CalendarIcon,
    data: { title: '4-Week General Conditioning', description: 'A balanced 4-week block covering strength, conditioning, and mobility.', num_weeks: 4,
      weeks: [
        { week_number: 1, objective: 'Establish baseline fitness', sessions: [{ day: 'Day 1', focus: 'Full Body Strength', description: 'Squat 3x10, Push-up 3x15, Row 3x12, Plank 3x30s' }, { day: 'Day 2', focus: 'Conditioning', description: '20 min steady-state cardio' }, { day: 'Day 4', focus: 'Full Body Strength', description: 'Trap Bar Deadlift 3x8, DB press 3x10, Pull-up 3x8' }] },
        { week_number: 2, objective: 'Increase training volume', sessions: [{ day: 'Day 1', focus: 'Lower Body', description: 'Squat 4x10, Lunge 3x12 each, Calf raise 4x15' }, { day: 'Day 2', focus: 'Conditioning', description: '25 min cardio' }, { day: 'Day 3', focus: 'Upper Body', description: 'Push-up 4x15, DB row 4x12, Press 3x10' }] },
        { week_number: 3, objective: 'Build intensity', sessions: [{ day: 'Day 1', focus: 'Full Body Circuit', description: '4 rounds: Squat 15, Push-up 15, Row 15, Burpee 10' }, { day: 'Day 3', focus: 'Conditioning', description: '6x400m run at 85% effort' }, { day: 'Day 5', focus: 'Strength', description: 'Trap Bar Deadlift 4x6, Bench 4x8, Pull-up 4x6' }] },
        { week_number: 4, objective: 'Test and recover', sessions: [{ day: 'Day 1', focus: 'Fitness Test', description: 'Max push-ups, 1-mile run, max pull-ups' }, { day: 'Day 3', focus: 'Light Full Body', description: 'All movements at 60% — focus on form' }, { day: 'Day 5', focus: 'Recovery', description: 'Yoga or stretching 30 min' }] },
      ] } },
  { label: '6-Week Strength Block', description: 'Progressive overload — built to add weight every week', Icon: DumbbellIcon,
    data: { title: '6-Week Strength Block', description: 'A classic 6-week progressive overload program.', num_weeks: 6,
      weeks: [
        { week_number: 1, objective: '65–70% effort', sessions: [{ day: 'Day 1', focus: 'Squat', description: 'Back squat 4x6 @ 65%' }, { day: 'Day 3', focus: 'Bench', description: 'Bench press 4x6 @ 65%' }, { day: 'Day 5', focus: 'Deadlift', description: 'Trap bar deadlift 4x5 @ 65%' }] },
        { week_number: 2, objective: 'Add 5 lbs to all lifts', sessions: [{ day: 'Day 1', focus: 'Squat', description: 'Back squat 4x5 @ 70%' }, { day: 'Day 3', focus: 'Bench', description: 'Bench press 4x5 @ 70%' }, { day: 'Day 5', focus: 'Deadlift', description: 'Trap bar deadlift 4x4 @ 70%' }] },
        { week_number: 3, objective: '75–80% intensity', sessions: [{ day: 'Day 1', focus: 'Squat', description: 'Back squat 5x4 @ 75%' }, { day: 'Day 3', focus: 'Bench', description: 'Bench press 5x4 @ 75%' }, { day: 'Day 5', focus: 'Deadlift', description: 'Trap bar deadlift 5x3 @ 75%' }] },
        { week_number: 4, objective: 'Deload', sessions: [{ day: 'Day 1', focus: 'Squat (Deload)', description: 'Back squat 3x4 @ 60%' }, { day: 'Day 3', focus: 'Bench (Deload)', description: 'Bench 3x4 @ 60%' }, { day: 'Day 5', focus: 'Deadlift (Deload)', description: 'Trap bar deadlift 3x3 @ 60%' }] },
        { week_number: 5, objective: 'Peak 85–90%', sessions: [{ day: 'Day 1', focus: 'Squat', description: 'Back squat 4x3 @ 85%' }, { day: 'Day 3', focus: 'Bench', description: 'Bench 4x3 @ 85%' }, { day: 'Day 5', focus: 'Deadlift', description: 'Trap bar deadlift 4x2 @ 85%' }] },
        { week_number: 6, objective: 'Test maxes', sessions: [{ day: 'Day 1', focus: 'Max Squat', description: 'Warm up, attempt 1RM back squat' }, { day: 'Day 3', focus: 'Max Bench', description: 'Warm up, attempt 1RM bench' }, { day: 'Day 5', focus: 'Max Deadlift', description: 'Warm up, attempt 1RM trap bar deadlift' }] },
      ] } },
  { label: '2-Week Peaking', description: 'Pre-season ramp — sharpen speed and explosiveness', Icon: BoltIcon,
    data: { title: '2-Week Peaking', description: 'Sharpen explosiveness in the final 2 weeks before season.', num_weeks: 2,
      weeks: [
        { week_number: 1, objective: 'High-intensity speed and power', sessions: [{ day: 'Day 1', focus: 'Sprint & Power', description: '6x40m @ 95% · Box jumps 5x5 · Broad jump 5x3' }, { day: 'Day 2', focus: 'Upper Activation', description: 'Med ball chest pass 4x8 · Push press 4x4 @ 75%' }, { day: 'Day 4', focus: 'Agility', description: '5-10-5 drill 6x · T-drill 4x · Ladder 10 min' }] },
        { week_number: 2, objective: 'Taper — stay sharp', sessions: [{ day: 'Day 1', focus: 'Sprint Maintenance', description: '4x30m @ 90% · 3x broad jump' }, { day: 'Day 3', focus: 'Activation', description: 'Band walks 2x15, Glute bridge 2x15, Push-up 2x10' }] },
      ] } },
]

function makeWeeks(n, existing = []) {
  return Array.from({ length: n }, (_, i) => {
    const weekNum = i + 1
    const prev = existing.find(w => w.week_number === weekNum)
    return prev || { week_number: weekNum, objective: '', sessions: [] }
  })
}

function blankSession(di) {
  return { day: `Day ${di + 1}`, focus: '', description: '', locked: false }
}

function getMaxDays(weeks) {
  return Math.max(1, ...weeks.map(w => w.sessions.length))
}

// ─── Edit drawer ──────────────────────────────────────────────────────────────

function EditDrawer({ cell, weekNum, dayIdx, onChange, onClose, onCopy, onPaste, onLock, clipboard }) {
  return (
    <div style={dr.overlay} onClick={onClose}>
      <div style={dr.drawer} onClick={e => e.stopPropagation()}>
        <div style={dr.drawerHeader}>
          <div>
            <span style={dr.drawerWeek}>Week {weekNum}</span>
            <span style={dr.drawerDay}> · Day {dayIdx + 1}</span>
          </div>
          <button onClick={onClose} style={dr.closeBtn}>✕</button>
        </div>

        <label style={dr.label}>Day label</label>
        <input style={dr.input} value={cell.day || ''} onChange={e => onChange({ day: e.target.value })} placeholder={`Day ${dayIdx + 1}`} />

        <label style={dr.label}>Focus</label>
        <input style={dr.input} value={cell.focus || ''} onChange={e => onChange({ focus: e.target.value })} placeholder="e.g. Lower Power" />

        <label style={dr.label}>Description</label>
        <textarea style={dr.textarea} rows={8} value={cell.description || ''} onChange={e => onChange({ description: e.target.value })} placeholder="Exercises, sets, reps, notes…" />

        <div style={dr.drawerActions}>
          <button
            style={{ ...dr.actionBtn, background: cell.locked ? 'rgba(247,87,9,0.12)' : 'var(--card-inner)', color: cell.locked ? ORANGE : 'var(--text-2)', border: `1px solid ${cell.locked ? ORANGE : 'var(--border)'}` }}
            onClick={onLock}
          >
            {cell.locked
              ? <><LockIcon size={14} color="currentColor" /> Locked</>
              : <><UnlockIcon size={14} color="currentColor" /> Unlocked</>
            }
          </button>
          <button style={{ ...dr.actionBtn, background: 'var(--card-inner)', color: 'var(--text-2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={onCopy}>
            <CopyIcon size={13} color="var(--text-2)" /> Copy Session
          </button>
          {clipboard && (
            <button style={{ ...dr.actionBtn, background: 'rgba(247,87,9,0.1)', color: ORANGE, border: `1px solid ${ORANGE}` }} onClick={onPaste}>
              ⬇ Paste
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Bulk edit modal ──────────────────────────────────────────────────────────

function BulkEditModal({ count, focus, desc, onFocusChange, onDescChange, onApply, onClose }) {
  return (
    <div style={dr.overlay} onClick={onClose}>
      <div style={{ ...dr.drawer, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={dr.drawerHeader}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Bulk Edit — {count} session{count !== 1 ? 's' : ''}
          </span>
          <button onClick={onClose} style={dr.closeBtn}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          Fill in only the fields you want to change. Leave blank to keep existing values.
        </p>
        <label style={dr.label}>Focus (overwrite all selected)</label>
        <input style={dr.input} value={focus} onChange={e => onFocusChange(e.target.value)} placeholder="e.g. Lower Power" />
        <label style={dr.label}>Description (overwrite all selected)</label>
        <textarea style={dr.textarea} rows={5} value={desc} onChange={e => onDescChange(e.target.value)} placeholder="Exercises, sets, reps, notes…" />
        <button style={{ ...dr.applyBtn, marginTop: 20 }} onClick={onApply}>
          Apply to {count} session{count !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}

// ─── Leave-without-saving confirmation modal ─────────────────────────────────

function LeaveConfirmModal({ onCancel, onConfirm }) {
  return (
    <div style={lc.overlay} onClick={onCancel}>
      <div style={lc.card} onClick={e => e.stopPropagation()}>
        <p style={lc.title}>Leave without saving?</p>
        <p style={lc.body}>Your blueprint progress will be lost. Go back to templates.</p>
        <div style={lc.btnRow}>
          <button onClick={onCancel} style={lc.cancelBtn}>Cancel</button>
          <button onClick={onConfirm} style={lc.confirmBtn}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ─── Week-reduction confirmation modal ───────────────────────────────────────

function WeekReductionConfirmModal({ from, to, onCancel, onConfirm }) {
  return (
    <div style={lc.overlay} onClick={onCancel}>
      <div style={lc.card} onClick={e => e.stopPropagation()}>
        <p style={lc.title}>Reduce weeks?</p>
        <p style={lc.body}>
          Reducing weeks from {from} to {to} will permanently delete the content for weeks {to + 1} through {from}. This cannot be undone.
        </p>
        <div style={lc.btnRow}>
          <button onClick={onCancel} style={lc.cancelBtn}>Cancel</button>
          <button onClick={onConfirm} style={lc.confirmBtn}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ─── Description preview with bolded exercise names ──────────────────────────

function BoldDesc({ text, maxChars }) {
  if (!text) return null
  const display = maxChars && text.length > maxChars ? text.slice(0, maxChars) + '…' : text
  // Preview rendering only (not SessionDescription.jsx's full bracket UI) —
  // strip any superset marker per line first so it never gets absorbed into
  // the bolded exercise-name slice or shown raw.
  const lines = display.split('\n').map(stripSupersetMarker)
  return (
    <>
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':')
        let content
        if (colonIdx > 0) {
          content = (
            <><span style={{ fontWeight: 600 }}>{line.slice(0, colonIdx)}</span>{line.slice(colonIdx)}</>
          )
        } else {
          const segs = line.split(/, ?/)
          content = segs.map((seg, si) => {
            if (!/^[A-Za-z]/.test(seg)) return <span key={si}>{si > 0 && ', '}{seg}</span>
            const idx = seg.search(/\s+(?:\d|@)/)
            const nameLen = idx > 0 ? idx : seg.length
            return (
              <span key={si}>
                {si > 0 && ', '}
                <span style={{ fontWeight: 600 }}>{seg.slice(0, nameLen)}</span>
                {seg.slice(nameLen)}
              </span>
            )
          })
        }
        return <span key={i}>{content}{i < lines.length - 1 && <br />}</span>
      })}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BlueprintBuilder() {
  const navigate = useNavigate()
  const { team, loading: teamLoading } = useCoachAccess()
  const [phase, setPhase] = useState('pick')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [daysPick, setDaysPick] = useState(null)
  const [sportTab, setSportTab] = useState('general')
  const [goalPick, setGoalPick] = useState(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)

  // Sport templates come from the server — the same generator functions that
  // power auto-assign, so manual builds and auto-assigned plans never diverge.
  const [sportTemplates, setSportTemplates] = useState([])
  const [templateGoals, setTemplateGoals] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templatesError, setTemplatesError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')

  useEffect(() => {
    api.get('/api/blueprints/templates')
      .then(res => {
        setSportTemplates(res.data.sports || [])
        setTemplateGoals(res.data.goals || [])
      })
      .catch(err => setTemplatesError(err.response?.data?.error || 'Failed to load blueprint templates.'))
      .finally(() => setTemplatesLoading(false))
  }, [])

  const [form, setForm] = useState({ title: '', description: '', num_weeks: 4, weeks: makeWeeks(4) })

  // Grid state
  const [clipboard, setClipboard] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [editing, setEditing] = useState(null)
  const [activeWeek, setActiveWeek] = useState(0)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkFocus, setBulkFocus] = useState('')
  const [bulkDesc, setBulkDesc] = useState('')
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [pendingWeekReduction, setPendingWeekReduction] = useState(null) // { from, to } or null

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Once a coach is in the grid builder they have unsaved manual work (a
  // template pick or a from-scratch build) that only persists on successful
  // "Save Blueprint" — warn before a tab close/reload throws it away.
  const hasUnsavedChanges = phase === 'build'

  useEffect(() => {
    if (!hasUnsavedChanges) return
    function handleBeforeUnload(e) {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // ── Template selection ──────────────────────────────────────────────────────

  function selectTemplate(tpl) {
    if (!tpl.data) setForm({ title: '', description: '', num_weeks: 4, weeks: makeWeeks(4) })
    else setForm({ title: tpl.data.title, description: tpl.data.description, num_weeks: tpl.data.num_weeks, weeks: makeWeeks(tpl.data.num_weeks, tpl.data.weeks) })
    setPhase('build')
  }

  async function selectDayPickerTemplate(daysPerWeek) {
    const { sport, pos } = daysPick
    setGenerateError(''); setGenerating(true)
    try {
      const res = await api.post('/api/blueprints/templates/generate', {
        sport_id: sport.id, position_id: pos.id, goal_id: 'standard', days_per_week: daysPerWeek,
      })
      setForm({ title: `${sport.label} — 16-Week Offseason (${daysPerWeek} Days/Week)`, description: sport.templateDescription || `16-week program for ${sport.label.toLowerCase()} athletes.`, num_weeks: 16, weeks: res.data.weeks })
      setDaysPick(null)
      setPhase('build')
    } catch (err) {
      setGenerateError(err.response?.data?.error || 'Failed to generate this template. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function selectSportTemplate(sport, pos, goal) {
    setGenerateError(''); setGenerating(true)
    try {
      const res = await api.post('/api/blueprints/templates/generate', {
        sport_id: sport.id, position_id: pos.id, goal_id: goal.id,
      })
      const goalSuffix = goal.id === 'muscle_gain' ? ' — Muscle Gain' : ''
      setForm({ title: `${sport.label} — ${pos.label} 16-Week Offseason${goalSuffix}`, description: `16-week offseason for ${pos.label} (${pos.sublabel}). ${goal.desc}`, num_weeks: 16, weeks: res.data.weeks })
      setGoalPick(null)
      setPhase('build')
    } catch (err) {
      setGenerateError(err.response?.data?.error || 'Failed to generate this template. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Grid operations ─────────────────────────────────────────────────────────

  function getCell(wi, di) { return form.weeks[wi]?.sessions[di] || null }

  function setCell(wi, di, updates) {
    setForm(prev => ({
      ...prev,
      weeks: prev.weeks.map((w, i) => {
        if (i !== wi) return w
        const sessions = [...w.sessions]
        while (sessions.length <= di) sessions.push(blankSession(sessions.length))
        sessions[di] = { ...sessions[di], ...updates }
        return { ...w, sessions }
      }),
    }))
  }

  function copyCell(wi, di) {
    const c = getCell(wi, di)
    if (c) setClipboard({ day: c.day, focus: c.focus, description: c.description })
  }

  function pasteCell(wi, di) {
    if (!clipboard) return
    setCell(wi, di, { focus: clipboard.focus, description: clipboard.description })
  }

  function pasteToAllWeeks(di) {
    if (!clipboard) return
    setForm(prev => ({
      ...prev,
      weeks: prev.weeks.map(w => {
        const sessions = [...w.sessions]
        while (sessions.length <= di) sessions.push(blankSession(sessions.length))
        sessions[di] = { ...sessions[di], focus: clipboard.focus, description: clipboard.description }
        return { ...w, sessions }
      }),
    }))
  }

  function toggleLock(wi, di) {
    const c = getCell(wi, di)
    if (c) setCell(wi, di, { locked: !c.locked })
    else setCell(wi, di, { ...blankSession(di), locked: true })
  }

  function toggleSelect(wi, di) {
    const k = `${wi}-${di}`
    setSelected(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  }

  function addDay() {
    const n = getMaxDays(form.weeks)
    setForm(prev => ({ ...prev, weeks: prev.weeks.map(w => ({ ...w, sessions: [...w.sessions, blankSession(n)] })) }))
  }

  function removeDay(di) {
    setForm(prev => ({ ...prev, weeks: prev.weeks.map(w => ({ ...w, sessions: w.sessions.filter((_, i) => i !== di) })) }))
    if (editing?.di === di) setEditing(null)
    setSelected(prev => { const n = new Set(); for (const k of prev) { const [, d] = k.split('-').map(Number); if (d !== di) n.add(k) }; return n })
  }

  function applyBulkEdit() {
    setForm(prev => ({
      ...prev,
      weeks: prev.weeks.map((w, wi) => ({
        ...w,
        sessions: w.sessions.map((s, di) => {
          if (!selected.has(`${wi}-${di}`)) return s
          return { ...s, ...(bulkFocus.trim() ? { focus: bulkFocus } : {}), ...(bulkDesc.trim() ? { description: bulkDesc } : {}) }
        }),
      })),
    }))
    setSelected(new Set()); setBulkEditOpen(false); setBulkFocus(''); setBulkDesc('')
  }

  function applyNumWeeks(num) {
    setForm(prev => ({ ...prev, num_weeks: num, weeks: makeWeeks(num, prev.weeks) }))
  }

  // Reducing num_weeks drops the content for every week above the new count
  // (makeWeeks only keeps the first `num` weeks) — confirm before doing that.
  function setNumWeeks(n) {
    const num = Math.min(16, Math.max(1, parseInt(n, 10) || 1))
    if (num < form.num_weeks) {
      setPendingWeekReduction({ from: form.num_weeks, to: num })
    } else {
      applyNumWeeks(num)
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError('Please enter a title for this blueprint.'); return }
    // Without team_id, the server fell back to the coach's first-created
    // team regardless of which team was active here — invisible before #31
    // (the detail page tolerated the mismatch), but #31's strict active-team
    // check then rejected the very next request (the post-save redirect
    // into the new blueprint), which read as "saving does nothing." Block
    // the save instead of silently creating it under the wrong team.
    if (teamLoading) { setError('Still loading your team — try again in a moment.'); return }
    if (!team?.id) { setError('Create a team before building a blueprint.'); return }
    setError(''); setSubmitting(true)
    try {
      const res = await api.post(`/api/blueprints?team_id=${team.id}`, form)
      navigate(`/coach/blueprints/${res.data.blueprint.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save blueprint.')
      setSubmitting(false)
    }
  }

  // ── Template picker ─────────────────────────────────────────────────────────

  if (phase === 'pick') {
    if (daysPick) {
      const { sport } = daysPick
      return (
        <div style={s.container}>
          <button style={s.textBackBtn} onClick={() => setDaysPick(null)}>← Back to {sport.label}</button>
          <h1 style={s.pageTitle}>{sport.label} — 16-Week Offseason</h1>
          <p style={s.pageDesc}>How many days per week will your athletes train?</p>
          {generateError && <div style={s.errorBox}>{generateError}</div>}
          <div style={s.dayGrid}>
            {sport.daysOptions.map(opt => (
              <button key={opt.days} style={{ ...s.dayCard, ...(generating ? { opacity: 0.6, cursor: 'default' } : {}) }} disabled={generating} onClick={() => selectDayPickerTemplate(opt.days)}
                onMouseEnter={e => e.currentTarget.style.border = `2px solid ${ORANGE}`}
                onMouseLeave={e => e.currentTarget.style.border = '2px solid var(--border)'}>
                <span style={s.dayNumber}>{opt.days}</span>
                <span style={s.dayLabel}>days / week</span>
                <span style={s.dayDesc}>{opt.desc}</span>
              </button>
            ))}
          </div>
          <PhaseInfo phases={sport.phases} />
        </div>
      )
    }

    if (goalPick) {
      const { sport, pos } = goalPick
      return (
        <div style={s.container}>
          <button style={s.textBackBtn} onClick={() => setGoalPick(null)}>← Back to {sport.label}</button>
          <h1 style={s.pageTitle}>{sport.label} — {pos.label}</h1>
          <p style={s.pageDesc}>{pos.desc}</p>
          <p style={{ ...s.sportMeta, marginBottom: 24 }}>{sport.daysPerWeek} days/week · 16 weeks · 4 phases</p>
          {generateError && <div style={s.errorBox}>{generateError}</div>}
          <div style={s.dayGrid}>
            {templateGoals.map(goal => (
              <button key={goal.id} style={{ ...s.templateCard, ...(goal.id === 'muscle_gain' ? s.templateCardFeatured : {}), ...(generating ? { opacity: 0.6, cursor: 'default' } : {}) }}
                disabled={generating}
                onClick={() => selectSportTemplate(sport, pos, goal)}
                onMouseEnter={e => e.currentTarget.style.border = `2px solid ${ORANGE}`}
                onMouseLeave={e => e.currentTarget.style.border = goal.id === 'muscle_gain' ? '2px solid rgba(240,190,36,0.4)' : '2px solid var(--border)'}>
                <span style={s.templateLabel}>{goal.label}</span>
                <span style={s.templateDesc}>{goal.desc}</span>
              </button>
            ))}
          </div>
          <PhaseInfo phases={sport.phases} />
        </div>
      )
    }

    const activeSport = sportTemplates.find(sp => sp.id === sportTab)
    return (
      <div style={s.container}>
        <h1 style={s.pageTitle}>Create Blueprint</h1>
        <p style={s.pageDesc}>Choose a sport-specific template or start from scratch.</p>
        {templatesError && <div style={s.errorBox}>{templatesError}</div>}
        <div style={s.sportTabBar}>
          <button style={{ ...s.sportTabBtn, ...(sportTab === 'general' ? s.sportTabBtnActive : {}) }} onClick={() => setSportTab('general')}>General</button>
          {templatesLoading && (
            <>
              <div className="skeleton" style={{ width: 90, height: 34, borderRadius: 8 }} />
              <div className="skeleton" style={{ width: 90, height: 34, borderRadius: 8 }} />
            </>
          )}
          {sportTemplates.map(sp => {
            const SportIcon = SPORT_ICONS[sp.id]
            return (
              <button key={sp.id} style={{ ...s.sportTabBtn, ...(sportTab === sp.id ? s.sportTabBtnActive : {}) }} onClick={() => setSportTab(sp.id)}>
                {SportIcon && <span style={{ marginRight: 5, display: 'inline-flex', verticalAlign: 'middle' }}><SportIcon size={18} /></span>}{sp.label}
              </button>
            )
          })}
        </div>
        {sportTab === 'general' && (
          <div style={s.templateGrid}>
            {TEMPLATES.map(tpl => (
              <button key={tpl.label} style={s.templateCard} onClick={() => selectTemplate(tpl)}
                onMouseEnter={e => e.currentTarget.style.border = `2px solid ${ORANGE}`}
                onMouseLeave={e => e.currentTarget.style.border = '2px solid var(--border)'}>
                <div style={s.templateIconWrap}><tpl.Icon size={22} color={ORANGE} /></div>
                <span style={s.templateLabel}>{tpl.label}</span>
                <span style={s.templateDesc}>{tpl.description}</span>
              </button>
            ))}
          </div>
        )}
        {activeSport && (
          <div>
            <p style={s.sportMeta}>{activeSport.daysPerWeekPicker ? '3–6 days/week (choose below)' : `${activeSport.daysPerWeek} days/week`} · 16 weeks · 4 phases</p>
            <div style={s.templateGrid}>
              {activeSport.positions.map(pos => (
                <button key={pos.id} style={{ ...s.templateCard, ...s.templateCardFeatured }}
                  onClick={() => activeSport.daysPerWeekPicker ? setDaysPick({ sport: activeSport, pos }) : setGoalPick({ sport: activeSport, pos })}
                  onMouseEnter={e => e.currentTarget.style.border = `2px solid ${ORANGE}`}
                  onMouseLeave={e => e.currentTarget.style.border = '2px solid rgba(240,190,36,0.4)'}>
                  <span style={s.templateLabel}>{pos.label}</span>
                  <span style={{ ...s.templateBadge, color: ORANGE, background: 'rgba(247,87,9,0.1)' }}>{pos.sublabel}</span>
                  <span style={s.templateDesc}>{pos.desc}</span>
                  <span style={s.templateBadge}>16 weeks · 4 phases →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Grid builder ────────────────────────────────────────────────────────────

  const maxDays = getMaxDays(form.weeks)
  const editingCell = editing ? (getCell(editing.wi, editing.di) || blankSession(editing.di)) : null

  // On mobile the page must grow naturally so the parent <main> can scroll it.
  // On desktop the page is fixed-height and the grid scrolls internally.
  const pageStyle = isMobile
    ? { display: 'flex', flexDirection: 'column' }
    : g.page

  return (
    <div style={pageStyle}>

      {/* ── Top bar ── */}
      <div style={g.topBar}>
        <button onClick={() => setShowLeaveConfirm(true)} style={g.backBtn}>← Templates</button>
        <div style={g.titleGroup}>
          <input style={g.titleInput} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Blueprint title…" />
          <select style={g.weeksSelect} value={form.num_weeks} onChange={e => setNumWeeks(e.target.value)}>
            {Array.from({ length: 16 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? 'wk' : 'wks'}</option>)}
          </select>
        </div>
        <button onClick={handleSubmit} disabled={submitting} style={g.saveBtn}>
          {submitting ? 'Saving…' : 'Save Blueprint'}
        </button>
      </div>

      {error && <div style={g.errorBox}>{error}</div>}

      {/* ── Clipboard banner ── */}
      {clipboard && (
        <div style={g.clipBar}>
          <span style={g.clipIcon}><CopyIcon size={16} color={ORANGE} /></span>
          <div style={g.clipInfo}>
            <span style={g.clipFocus}>{clipboard.focus || 'Session copied'}</span>
            <span style={g.clipHint}>Click any cell to paste · Use "Paste All ↓" on a day row to fill all {form.num_weeks} weeks instantly</span>
          </div>
          <button onClick={() => setClipboard(null)} style={g.clipClear}>✕ Clear</button>
        </div>
      )}

      {/* ── Bulk edit banner ── */}
      {selected.size > 0 && (
        <div style={g.bulkBar}>
          <span style={g.bulkCount}>{selected.size} session{selected.size !== 1 ? 's' : ''} selected</span>
          <button onClick={() => setBulkEditOpen(true)} style={{ ...g.bulkEditBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}><EditIcon size={13} color={BLUE} /> Bulk Edit</button>
          <button onClick={() => setSelected(new Set())} style={g.bulkClearBtn}>Deselect All</button>
        </div>
      )}

      {/* ── Grid (desktop) / Card view (mobile) ── */}
      {isMobile ? (
        <div style={g.mobileWrap}>
          {/* Week selector */}
          <div style={g.weekTabs}>
            {form.weeks.map((w, wi) => (
              <button key={wi} style={{ ...g.weekTab, ...(activeWeek === wi ? g.weekTabActive : {}) }} onClick={() => setActiveWeek(wi)}>
                W{w.week_number}
              </button>
            ))}
          </div>
          {/* Week objective (mobile only) */}
          {form.weeks[activeWeek]?.objective && (
            <div style={g.mobileObjective}>
              <span style={g.mobileObjectiveLabel}>Focus</span>
              <span style={g.mobileObjectiveText}>{form.weeks[activeWeek].objective}</span>
            </div>
          )}

          {/* Day cards */}
          <div style={g.mobileCards}>
            {form.weeks[activeWeek] && Array.from({ length: maxDays }, (_, di) => {
              const cell = form.weeks[activeWeek].sessions[di]
              const k = `${activeWeek}-${di}`
              return (
                <div key={di} style={{ ...g.mobileCard, ...(cell?.locked ? g.mobileCardLocked : {}) }}>
                  <div style={g.mobileCardHeader}>
                    <span style={g.mobileCardDay}>{cell?.day || `Day ${di + 1}`}</span>
                    {cell?.locked && <span style={g.lockBadge}><LockIcon size={12} color={ORANGE} /> Locked</span>}
                    <div style={g.mobileCardBtns}>
                      <button style={g.mobileActionBtn} onClick={() => copyCell(activeWeek, di)} title="Copy session"><CopyIcon size={15} color="var(--text-2)" /></button>
                      {clipboard && <button style={{ ...g.mobileActionBtn, color: ORANGE }} onClick={() => pasteCell(activeWeek, di)} title="Paste">⬇</button>}
                      <button style={g.mobileActionBtn} onClick={() => setEditing({ wi: activeWeek, di })} title="Edit session"><EditIcon size={15} color="var(--text-2)" /></button>
                    </div>
                  </div>
                  {cell?.focus && <p style={g.mobileCardFocus}>{cell.focus}</p>}
                  {cell?.description && <p style={g.mobileCardDesc}><BoldDesc text={cell.description} /></p>}
                  {!cell?.focus && !cell?.description && <p style={g.emptyCell}>Tap edit to add session</p>}
                </div>
              )
            })}
            <button onClick={addDay} style={g.addDayBtn}>+ Add Day</button>
          </div>
        </div>
      ) : (
        <div style={g.gridOuter}>
          <div style={{ minWidth: LABEL_W + form.num_weeks * CELL_W }}>
            {/* Week header row */}
            <div style={g.gridRow}>
              <div style={{ ...g.cornerCell, width: LABEL_W, minWidth: LABEL_W }}>
                <span style={g.cornerText}>Day / Week</span>
              </div>
              {form.weeks.map((w, wi) => (
                <div key={wi} style={{ ...g.weekHeaderCell, width: CELL_W, minWidth: CELL_W }}>
                  <span style={g.weekNum}>Week {w.week_number}</span>
                  {w.objective && <span style={g.weekObj} title={w.objective}>{w.objective.slice(0, 30)}{w.objective.length > 30 ? '…' : ''}</span>}
                </div>
              ))}
            </div>

            {/* Day rows */}
            {Array.from({ length: maxDays }, (_, di) => (
              <div key={di} style={g.gridRow}>
                {/* Day label column */}
                <div style={{ ...g.dayLabelCell, width: LABEL_W, minWidth: LABEL_W }}>
                  <span style={g.dayLabelText}>Day {di + 1}</span>
                  <div style={g.dayLabelBtns}>
                    {clipboard && (
                      <button style={g.pasteAllBtn} title={`Paste "${clipboard.focus || 'session'}" to all ${form.num_weeks} weeks`} onClick={() => pasteToAllWeeks(di)}>
                        Paste All ↓
                      </button>
                    )}
                    <button style={g.removeDayBtn} title="Remove this day from all weeks" onClick={() => removeDay(di)}>×</button>
                  </div>
                </div>

                {/* Session cells */}
                {form.weeks.map((w, wi) => {
                  const cell = w.sessions[di]
                  const k = `${wi}-${di}`
                  const isSel = selected.has(k)
                  const isEdit = editing?.wi === wi && editing?.di === di

                  return (
                    <div key={wi}
                      style={{ ...g.cell, width: CELL_W, minWidth: CELL_W, ...(isSel ? g.cellSelected : {}), ...(isEdit ? g.cellEditing : {}), ...(cell?.locked ? g.cellLocked : {}) }}
                      onClick={() => setEditing({ wi, di })}
                    >
                      <div style={g.cellTop}>
                        <input type="checkbox" style={g.checkbox} checked={isSel}
                          onClick={e => { e.stopPropagation(); toggleSelect(wi, di) }}
                          onChange={() => {}} />
                        {cell?.locked && <span style={g.lockIcon} title="Locked"><LockIcon size={13} color={ORANGE} /></span>}
                        {cell?.focus
                          ? <span style={g.cellFocus}>{cell.focus}</span>
                          : <span style={g.cellEmpty}>Empty — click to add</span>
                        }
                      </div>
                      {cell?.description && (
                        <p style={g.cellDesc}><BoldDesc text={cell.description} maxChars={80} /></p>
                      )}
                      <div style={g.cellFooter}>
                        <button style={{ ...g.cellBtn, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={e => { e.stopPropagation(); copyCell(wi, di) }} title="Copy session"><CopyIcon size={11} color="var(--text-3)" /> Copy</button>
                        {clipboard && (
                          <button style={{ ...g.cellBtn, color: ORANGE }} onClick={e => { e.stopPropagation(); pasteCell(wi, di) }} title="Paste clipboard here">⬇ Paste</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Add day row */}
            <div style={g.addDayRow}>
              <button onClick={addDay} style={g.addDayBtnGrid}>+ Add Day</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit drawer ── */}
      {editing && editingCell && (
        <EditDrawer
          cell={editingCell}
          weekNum={form.weeks[editing.wi]?.week_number}
          dayIdx={editing.di}
          onChange={updates => setCell(editing.wi, editing.di, updates)}
          onClose={() => setEditing(null)}
          onCopy={() => copyCell(editing.wi, editing.di)}
          onPaste={clipboard ? () => pasteCell(editing.wi, editing.di) : null}
          onLock={() => toggleLock(editing.wi, editing.di)}
          clipboard={clipboard}
        />
      )}

      {/* ── Bulk edit modal ── */}
      {bulkEditOpen && (
        <BulkEditModal
          count={selected.size}
          focus={bulkFocus}
          desc={bulkDesc}
          onFocusChange={setBulkFocus}
          onDescChange={setBulkDesc}
          onApply={applyBulkEdit}
          onClose={() => setBulkEditOpen(false)}
        />
      )}

      {/* ── Leave-without-saving confirmation ── */}
      {showLeaveConfirm && (
        <LeaveConfirmModal
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={() => { setShowLeaveConfirm(false); setPhase('pick') }}
        />
      )}

      {/* ── Week-reduction confirmation ── */}
      {pendingWeekReduction && (
        <WeekReductionConfirmModal
          from={pendingWeekReduction.from}
          to={pendingWeekReduction.to}
          onCancel={() => setPendingWeekReduction(null)}
          onConfirm={() => { applyNumWeeks(pendingWeekReduction.to); setPendingWeekReduction(null) }}
        />
      )}
    </div>
  )
}

function PhaseInfo({ phases }) {
  return (
    <div style={s.phaseInfo}>
      <p style={s.phaseInfoTitle}>Program Structure</p>
      {phases.map(ph => (
        <div key={ph.num} style={s.phaseRow}>
          <span style={s.phaseBadge}>Phase {ph.num}</span>
          <span style={s.phaseLabel}>{ph.label}</span>
          <span style={s.phaseWeeks}>Weeks {ph.weeks}</span>
          <span style={s.phasePct}>{ph.pct}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Template picker styles ───────────────────────────────────────────────────
const s = {
  container: { maxWidth: 680, margin: '0 auto' },
  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 6 },
  pageDesc: { color: 'var(--text-2)', fontSize: 14, marginBottom: 28 },
  templateGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px,100%),1fr))', gap: 12 },
  templateCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: 20, borderRadius: 14, border: '2px solid var(--border)', background: 'var(--card)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.18s', boxShadow: '0 2px 6px rgba(0,0,0,0.14)' },
  templateIconWrap: { width: 40, height: 40, borderRadius: 10, background: 'rgba(247,87,9,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  templateLabel: { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  templateDesc: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 },
  templateCardFeatured: { border: '2px solid rgba(240,190,36,0.4)', background: 'rgba(240,190,36,0.04)' },
  templateBadge: { fontSize: 11, fontWeight: 700, color: YELLOW, background: 'rgba(240,190,36,0.15)', borderRadius: 6, padding: '2px 8px', letterSpacing: 0.3 },
  textBackBtn: { fontSize: 13, fontWeight: 500, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px 0' },
  dayGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px,100%),1fr))', gap: 12, marginBottom: 28 },
  dayCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: 20, borderRadius: 14, border: '2px solid var(--border)', background: 'var(--card)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.18s', boxShadow: '0 2px 6px rgba(0,0,0,0.14)' },
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
  sportTabBar: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 16, scrollbarWidth: 'none' },
  sportTabBtn: { flexShrink: 0, padding: '7px 14px', fontSize: 13, fontWeight: 600, borderRadius: 20, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  sportTabBtnActive: { border: `1.5px solid ${ORANGE}`, color: ORANGE, background: 'rgba(247,87,9,0.07)' },
  sportMeta: { fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
}

// ─── Grid builder styles ──────────────────────────────────────────────────────
const g = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },

  topBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 16px', flexWrap: 'wrap' },
  backBtn: { fontSize: 13, fontWeight: 500, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', flexShrink: 0 },
  // titleGroup takes full row on mobile by breaking at flex wrap point
  titleGroup: { flex: 1, minWidth: '200px', display: 'flex', gap: 8 },
  titleInput: { flex: 1, padding: '9px 13px', fontSize: 15, fontWeight: 600, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', minWidth: 0 },
  weeksSelect: { padding: '9px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', cursor: 'pointer', flexShrink: 0 },
  saveBtn: { padding: '11px 22px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 10px rgba(247,87,9,0.35)', flexShrink: 0, minHeight: 44 },
  errorBox: { background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 },

  clipBar: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(247,87,9,0.07)', border: `1px solid rgba(247,87,9,0.25)`, borderRadius: 10, marginBottom: 10, flexWrap: 'wrap' },
  clipIcon: { fontSize: 18, flexShrink: 0 },
  clipInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  clipFocus: { fontSize: 13, fontWeight: 700, color: ORANGE },
  clipHint: { fontSize: 12, color: 'var(--text-2)' },
  clipClear: { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 },

  bulkBar: { display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', background: 'rgba(48,142,189,0.07)', border: '1px solid rgba(48,142,189,0.25)', borderRadius: 10, marginBottom: 10 },
  bulkCount: { fontSize: 13, fontWeight: 600, color: BLUE, flex: 1 },
  bulkEditBtn: { fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 7, border: `1px solid ${BLUE}`, background: 'transparent', color: BLUE, cursor: 'pointer' },
  bulkClearBtn: { fontSize: 12, fontWeight: 500, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' },

  gridOuter: { flex: 1, overflowX: 'auto', overflowY: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)' },

  gridRow: { display: 'flex', borderBottom: '1px solid var(--border)' },

  cornerCell: { flexShrink: 0, padding: '10px 14px', borderRight: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', position: 'sticky', left: 0, zIndex: 2 },
  cornerText: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 },

  weekHeaderCell: { flexShrink: 0, padding: '10px 14px', borderRight: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 3 },
  weekNum: { fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' },
  weekObj: { fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  dayLabelCell: { flexShrink: 0, padding: '12px 14px', borderRight: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', position: 'sticky', left: 0, zIndex: 2 },
  dayLabelText: { fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' },
  dayLabelBtns: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pasteAllBtn: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, border: `1px solid ${ORANGE}`, background: 'rgba(247,87,9,0.1)', color: ORANGE, cursor: 'pointer', whiteSpace: 'nowrap' },
  removeDayBtn: { fontSize: 14, fontWeight: 700, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '1px 4px' },

  cell: { flexShrink: 0, padding: 12, borderRight: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, transition: 'background 0.15s', minHeight: 110 },
  cellSelected: { background: 'rgba(48,142,189,0.08)', outline: `2px solid ${BLUE}`, outlineOffset: -2 },
  cellEditing: { background: 'rgba(247,87,9,0.06)', outline: `2px solid ${ORANGE}`, outlineOffset: -2 },
  cellLocked: { background: 'rgba(247,87,9,0.03)' },

  cellTop: { display: 'flex', alignItems: 'flex-start', gap: 6 },
  checkbox: { marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: BLUE },
  lockIcon: { fontSize: 12, flexShrink: 0 },
  cellFocus: { fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, flex: 1 },
  cellEmpty: { fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', flex: 1 },
  cellDesc: { fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4, margin: 0 },
  cellFooter: { display: 'flex', gap: 8, marginTop: 'auto' },
  cellBtn: { fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' },

  addDayRow: { padding: '10px 14px' },
  addDayBtnGrid: { fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 8, border: `1px dashed var(--border)`, background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' },

  // Mobile — no flex:1 so the wrapper grows with content and parent <main> scrolls
  mobileWrap: { display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 },
  mobileObjective: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 12px', background: 'rgba(48,142,189,0.07)', border: '1px solid rgba(48,142,189,0.18)', borderRadius: 10 },
  mobileObjectiveLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 0 },
  mobileObjectiveText: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 },
  weekTabs: { display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, WebkitOverflowScrolling: 'touch' },
  weekTab: { flexShrink: 0, padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 20, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' },
  weekTabActive: { border: `1.5px solid ${ORANGE}`, color: ORANGE, background: 'rgba(247,87,9,0.08)' },
  mobileCards: { display: 'flex', flexDirection: 'column', gap: 10 },
  mobileCard: { padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)' },
  mobileCardLocked: { border: '1px solid rgba(247,87,9,0.3)', background: 'rgba(247,87,9,0.03)' },
  mobileCardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  mobileCardDay: { fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1 },
  lockBadge: { fontSize: 11, color: ORANGE, fontWeight: 600 },
  mobileCardBtns: { display: 'flex', gap: 6 },
  mobileActionBtn: { fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: 'var(--text-2)', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mobileCardFocus: { fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  mobileCardDesc: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 },
  emptyCell: { fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' },
  addDayBtn: { fontSize: 13, fontWeight: 600, padding: '12px', borderRadius: 10, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', width: '100%' },
}

// ─── Drawer / modal styles ────────────────────────────────────────────────────
const dr = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' },
  drawer: { width: '100%', maxWidth: 400, background: 'var(--bg)', borderLeft: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  drawerWeek: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  drawerDay: { fontSize: 14, color: 'var(--text-2)' },
  closeBtn: { fontSize: 18, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { width: '100%', padding: '10px 13px', fontSize: 14, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', boxSizing: 'border-box', outline: 'none' },
  textarea: { width: '100%', padding: '10px 13px', fontSize: 13, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 },
  drawerActions: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  actionBtn: { fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8, cursor: 'pointer' },
  applyBtn: { width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer' },
}

// ─── Leave-confirm modal styles ───────────────────────────────────────────────
const lc = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  title: { fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' },
  body: { fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 0 22px' },
  btnRow: { display: 'flex', gap: 10 },
  cancelBtn: { flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  confirmBtn: { flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
}
