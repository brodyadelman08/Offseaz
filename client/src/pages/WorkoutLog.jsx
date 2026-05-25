import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'

const BLUE = '#308EBD'

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed',  color: '#2e7d32', bg: '#e8f5e9', activeBg: '#2e7d32' },
  { value: 'partial',   label: 'Partial',    color: '#b45309', bg: '#fef3c7', activeBg: '#b45309' },
  { value: 'skipped',   label: 'Skipped',    color: '#888',    bg: '#f0f0f0', activeBg: '#555' },
]

export default function WorkoutLog() {
  const navigate = useNavigate()
  const { state } = useLocation()

  if (!state?.weekId) {
    navigate('/athlete/plan', { replace: true })
    return null
  }

  const { weekId, sessionIndex, focus, day, description } = state

  const [status, setStatus] = useState('')
  const [effort, setEffort] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!status) return setError('Please select how the session went.')
    if (status !== 'skipped' && !effort) return setError('Please select an effort level.')

    setError('')
    setSubmitting(true)

    try {
      await api.post('/api/workouts', {
        blueprint_week_id: weekId,
        session_index: sessionIndex,
        status,
        effort: status === 'skipped' ? null : effort,
        note: note.trim() || null,
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
        {/* Status selector */}
        <div>
          <p style={styles.fieldLabel}>How did it go?</p>
          <div style={styles.statusRow}>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                style={{
                  ...styles.statusBtn,
                  ...(status === opt.value ? {
                    borderColor: opt.activeBg,
                    background: opt.activeBg,
                    color: '#fff',
                  } : {}),
                }}
                onClick={() => setStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Effort selector */}
        {status && status !== 'skipped' && (
          <div>
            <p style={styles.fieldLabel}>
              Effort level
              <span style={styles.effortHint}> · 1 = easy, 10 = max effort</span>
            </p>
            <div style={styles.effortRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  style={{
                    ...styles.effortBtn,
                    ...(effort === n ? { background: BLUE, color: '#fff', borderColor: BLUE } : {}),
                  }}
                  onClick={() => setEffort(n)}
                >
                  {n}
                </button>
              ))}
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

  previewCard: { background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `3px solid ${BLUE}`, borderRadius: '0 12px 12px 0', padding: 20, marginBottom: 28 },
  previewHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  dayBadge: { fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', background: 'rgba(48,142,189,0.1)', padding: '3px 8px', borderRadius: 4 },
  focusText: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  previewDesc: { fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 },

  form: { display: 'flex', flexDirection: 'column', gap: 28 },
  fieldLabel: { fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' },
  effortHint: { fontSize: 12, color: 'var(--text-3)', fontWeight: 400 },
  optional: { fontWeight: 400, color: 'var(--text-3)' },

  statusRow: { display: 'flex', gap: 10 },
  statusBtn: { flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '2px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', transition: 'all 0.15s' },

  effortRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  effortBtn: { width: 42, height: 42, fontSize: 14, fontWeight: 600, borderRadius: 8, border: '2px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', transition: 'all 0.15s' },

  textarea: { width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  errorBox: { background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820', borderRadius: 8, padding: '10px 14px', fontSize: 13 },
  submitBtn: { padding: '13px 0', fontSize: 15, fontWeight: 700, borderRadius: 8, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', letterSpacing: 0.2 },
}
