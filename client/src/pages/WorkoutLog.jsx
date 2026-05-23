import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
  { value: 'partial', label: 'Partial', color: '#b45309', bg: '#fef3c7' },
  { value: 'skipped', label: 'Skipped', color: '#888', bg: '#f0f0f0' },
]

export default function WorkoutLog() {
  const navigate = useNavigate()
  const { state } = useLocation()

  // Redirect if accessed directly without state
  if (!state?.weekId) {
    navigate('/plan', { replace: true })
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
      navigate('/plan')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save log.')
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={() => navigate('/plan')}>← Back to plan</button>

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
                  ...(status === opt.value ? { borderColor: '#1a1a1a', background: '#1a1a1a', color: '#fff' } : {}),
                }}
                onClick={() => setStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Effort selector — hidden when skipped */}
        {status && status !== 'skipped' && (
          <div>
            <p style={styles.fieldLabel}>Effort level</p>
            <div style={styles.effortRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  style={{
                    ...styles.effortBtn,
                    ...(effort === n ? { background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' } : {}),
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
          <p style={styles.fieldLabel}>Notes <span style={styles.optional}>(optional)</span></p>
          <textarea
            style={styles.textarea}
            placeholder="How did it feel? Anything to note…"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.submitBtn} type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Log this session'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: { maxWidth: 520, margin: '0 auto', padding: '32px 20px' },
  backLink: { background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 24, display: 'block' },
  previewCard: { background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 10, padding: 20, marginBottom: 28 },
  previewHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  dayBadge: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', background: '#f0f0f0', padding: '3px 8px', borderRadius: 4 },
  focusText: { fontSize: 16, fontWeight: 700 },
  previewDesc: { fontSize: 14, color: '#555', margin: 0, lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: 24 },
  fieldLabel: { fontSize: 14, fontWeight: 600, marginBottom: 10, margin: '0 0 10px' },
  optional: { fontWeight: 400, color: '#aaa' },
  statusRow: { display: 'flex', gap: 10 },
  statusBtn: { flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600, borderRadius: 6, border: '2px solid #ddd', background: '#fff', cursor: 'pointer' },
  effortRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  effortBtn: { width: 40, height: 40, fontSize: 14, fontWeight: 600, borderRadius: 6, border: '2px solid #ddd', background: '#fff', cursor: 'pointer' },
  textarea: { width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  error: { color: '#c0392b', fontSize: 13, margin: 0 },
  submitBtn: { padding: '12px 0', fontSize: 15, fontWeight: 600, borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer' },
}
