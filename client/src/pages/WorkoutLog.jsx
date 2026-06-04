import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import { AlertIcon } from '../components/Icons'

const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const STATUS_OPTIONS = [
  { value: 'completed',       label: 'Completed',        color: '#2e7d32', bg: '#e8f5e9', activeBg: '#2e7d32' },
  { value: 'partial',         label: 'Partial',          color: '#b45309', bg: '#fef3c7', activeBg: '#b45309' },
  { value: 'skipped',         label: 'Skipped',          color: '#888',    bg: '#f0f0f0', activeBg: '#555' },
  { value: 'skipped_injury',  label: 'Skipped — Injury', color: '#c73820', bg: '#fce8e6', activeBg: '#c73820' },
]

/** Extract exercise names from a multi-line session description. */
function parseExercises(desc) {
  if (!desc) return []
  return desc
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (!t || t.startsWith('(') || t.startsWith('⚠') || t.startsWith('[')) return false
      const ci = t.indexOf(':')
      return ci > 2 && ci < 60          // colon exists and name isn't empty or absurdly long
    })
    .map(line => line.slice(0, line.indexOf(':')).trim())
    .filter(Boolean)
}

export default function WorkoutLog() {
  const navigate = useNavigate()
  const { state } = useLocation()

  if (!state?.weekId) {
    navigate('/athlete/plan', { replace: true })
    return null
  }

  const { weekId, sessionIndex, focus, day, description, exercises: structuredExercises } = state

  const [status, setStatus] = useState('')
  const [effort, setEffort] = useState(null)
  const [note, setNote] = useState('')
  const [injuredExercises, setInjuredExercises] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Prefer structured exercise list (used by the Cobber-style templates);
  // fall back to parsing the free-text description for older/text-only sessions.
  const exercises = (structuredExercises && structuredExercises.length > 0)
    ? structuredExercises.map(ex => ex.name).filter(Boolean)
    : parseExercises(description)

  function toggleInjury(name) {
    setInjuredExercises(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!status) return setError('Please select how the session went.')
    const isSkip = status === 'skipped' || status === 'skipped_injury'
    if (!isSkip && !effort) return setError('Please select an effort level.')

    setError('')
    setSubmitting(true)

    // Prepend injury exercise flags to the note if any were selected
    let finalNote = note.trim() || null
    if (injuredExercises.size > 0) {
      const injuryLine = `⚠️ Cannot complete: ${[...injuredExercises].join(', ')}`
      finalNote = finalNote ? `${injuryLine}\n\n${finalNote}` : injuryLine
    }

    try {
      await api.post('/api/workouts', {
        blueprint_week_id: weekId,
        session_index: sessionIndex,
        status,
        effort: isSkip ? null : effort,
        note: finalNote,
      })
      navigate('/athlete/plan')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save log.')
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={() => navigate('/athlete/plan')}>
        ← Back to plan
      </button>

      <h1 style={styles.pageTitle}>Log Session</h1>

      {/* Session preview */}
      <div style={styles.previewCard}>
        <div style={styles.previewHeader}>
          {day && <span style={styles.dayBadge}>{day}</span>}
          <span style={styles.focusText}>{focus}</span>
        </div>
        {description && <p style={styles.previewDesc}>{description}</p>}
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Status selector — 2×2 grid so all labels fit */}
        <div>
          <p style={styles.fieldLabel}>How did it go?</p>
          <div style={styles.statusGrid}>
            {STATUS_OPTIONS.map(opt => {
              const isInjuryOpt = opt.value === 'skipped_injury'
              const isActive = status === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  style={{
                    ...styles.statusBtn,
                    // Skipped — Injury always shows red tint so it's visually distinct
                    ...(isInjuryOpt && !isActive ? {
                      borderColor: 'rgba(199,56,32,0.4)',
                      color: '#c73820',
                    } : {}),
                    ...(isActive ? {
                      borderColor: opt.activeBg,
                      background: opt.activeBg,
                      color: '#fff',
                    } : {}),
                  }}
                  onClick={() => setStatus(opt.value)}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Exercise-level injury flags — shown when session has exercises */}
        {exercises.length > 0 && (
          <div>
            <p style={styles.fieldLabel}>
              Exercises you can't do
              <span style={styles.optional}> (optional — flags injury to your coach)</span>
            </p>
            <div style={styles.exerciseFlagRow}>
              {exercises.map(name => {
                const flagged = injuredExercises.has(name)
                return (
                  <button
                    key={name}
                    type="button"
                    style={{ ...styles.exerciseFlagChip, ...(flagged ? styles.exerciseFlagChipActive : {}) }}
                    onClick={() => toggleInjury(name)}
                  >
                    {flagged && <><AlertIcon size={12} color="#c73820" />{' '}</>}{name}
                  </button>
                )
              })}
            </div>
            {injuredExercises.size > 0 && (
              <p style={styles.injuryFlagNote}>
                {injuredExercises.size === 1 ? '1 exercise' : `${injuredExercises.size} exercises`} flagged — your coach will be notified.
              </p>
            )}
          </div>
        )}

        {/* Effort slider */}
        {status && status !== 'skipped' && status !== 'skipped_injury' && (
          <div>
            {/* Inject thumb + track styles — can't do pseudo-elements via inline React styles */}
            <style>{`
              .effort-slider {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 6px;
                border-radius: 6px;
                outline: none;
                cursor: pointer;
                display: block;
              }
              .effort-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #F0BE24;
                cursor: grab;
                border: 3px solid rgba(0,0,0,0.8);
                box-shadow: 0 2px 10px rgba(240,190,36,0.55), 0 0 0 4px rgba(240,190,36,0.18);
                transition: transform 0.12s ease, box-shadow 0.12s ease;
              }
              .effort-slider:hover::-webkit-slider-thumb {
                transform: scale(1.1);
                box-shadow: 0 3px 14px rgba(240,190,36,0.65), 0 0 0 6px rgba(240,190,36,0.2);
              }
              .effort-slider:active::-webkit-slider-thumb {
                transform: scale(1.22);
                cursor: grabbing;
                box-shadow: 0 4px 20px rgba(240,190,36,0.75), 0 0 0 8px rgba(240,190,36,0.22);
              }
              .effort-slider::-moz-range-thumb {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #F0BE24;
                cursor: grab;
                border: 3px solid rgba(0,0,0,0.8);
                box-shadow: 0 2px 10px rgba(240,190,36,0.55);
              }
              .effort-slider::-moz-range-track {
                height: 6px;
                border-radius: 6px;
              }
              .effort-slider:focus { outline: none; }
            `}</style>

            <p style={styles.fieldLabel}>Effort level</p>

            {/* Large number display */}
            <div style={styles.effortDisplay}>
              <span style={{
                ...styles.effortNumber,
                color: effort !== null ? YELLOW : 'var(--text-3)',
                opacity: effort !== null ? 1 : 0.35,
              }}>
                {effort !== null ? effort : '—'}
              </span>
              <span style={styles.effortLabel}>
                {effort === null   ? 'drag the slider to rate'
                : effort === 1    ? 'Easy'
                : effort <= 3     ? 'Light effort'
                : effort <= 5     ? 'Moderate'
                : effort <= 7     ? 'Hard'
                : effort <= 9     ? 'Very hard'
                :                   'Max effort 🔥'}
              </span>
            </div>

            {/* Slider */}
            <div style={styles.sliderWrap}>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={effort !== null ? effort : 5}
                className="effort-slider"
                style={{
                  background: effort !== null
                    ? `linear-gradient(to right, ${YELLOW} ${((effort - 1) / 9) * 100}%, rgba(240,190,36,0.16) ${((effort - 1) / 9) * 100}%)`
                    : 'rgba(240,190,36,0.14)',
                }}
                onChange={e => setEffort(Number(e.target.value))}
              />
              {/* Tick marks 1–10 */}
              <div style={styles.sliderTicks}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <span
                    key={n}
                    style={{
                      ...styles.tickLabel,
                      ...(effort === n ? { color: YELLOW, fontWeight: 700 } : {}),
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.effortRange}>
              <span>1 = easy</span>
              <span>10 = max effort</span>
            </div>
          </div>
        )}

        {/* Note */}
        <div>
          <p style={styles.fieldLabel}>
            Notes <span style={styles.optional}>(optional)</span>
          </p>
          <textarea
            style={styles.textarea}
            placeholder="How did it feel? Anything to note…"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <button style={styles.submitBtn} type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Log this session'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: { maxWidth: 540, margin: '0 auto' },

  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-2)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 0 20px',
  },

  pageTitle: { fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 20 },

  previewCard: { background: 'linear-gradient(135deg, rgba(48,142,189,0.05) 0%, var(--card) 100%)', border: '1px solid var(--border)', borderLeft: `3px solid ${BLUE}`, borderRadius: '0 16px 16px 0', padding: 20, marginBottom: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
  previewHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  dayBadge: { fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', background: 'rgba(48,142,189,0.12)', padding: '3px 8px', borderRadius: 6, letterSpacing: 0.3 },
  focusText: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  previewDesc: { fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 },

  form: { display: 'flex', flexDirection: 'column', gap: 28 },
  fieldLabel: { fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' },
  optional: { fontWeight: 400, color: 'var(--text-3)' },

  // Effort slider
  effortDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 24,
  },
  effortNumber: {
    fontSize: 80,
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: '-0.04em',
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    transition: 'color 0.18s ease, opacity 0.18s ease',
    userSelect: 'none',
  },
  effortLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-3)',
    letterSpacing: 0.3,
    minHeight: 18,
    transition: 'opacity 0.15s',
  },
  sliderWrap: {
    paddingBottom: 4,
  },
  sliderTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  tickLabel: {
    fontSize: 11,
    color: 'var(--text-3)',
    lineHeight: 1,
    textAlign: 'center',
    width: 16,
    transition: 'color 0.12s, font-weight 0.12s',
  },
  effortRange: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: 6,
    fontSize: 11,
    color: 'var(--text-3)',
    letterSpacing: 0.2,
    opacity: 0.7,
  },

  statusGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  statusBtn: { padding: '13px 8px', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '2px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', transition: 'all 0.18s ease', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' },

  exerciseFlagRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  exerciseFlagChip: { padding: '7px 13px', fontSize: 13, fontWeight: 600, borderRadius: 20, border: '1.5px dashed var(--border)', background: 'var(--card)', color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.18s ease', whiteSpace: 'nowrap' },
  exerciseFlagChipActive: { borderStyle: 'solid', borderColor: '#c73820', background: '#fce8e6', color: '#c73820' },
  injuryFlagNote: { fontSize: 12, color: '#c73820', fontWeight: 600, margin: '8px 0 0' },

  textarea: { width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  errorBox: { background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820', borderRadius: 10, padding: '10px 14px', fontSize: 13 },
  submitBtn: { padding: '14px 0', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', letterSpacing: 0.2, boxShadow: '0 2px 10px rgba(48,142,189,0.32)' },
}
