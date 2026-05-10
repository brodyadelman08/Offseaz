import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const EQUIPMENT_OPTIONS = [
  'Bodyweight only',
  'Dumbbells',
  'Barbell & plates',
  'Resistance bands',
  'Pull-up bar',
  'Kettlebells',
  'Machines (gym)',
  'Track / field',
  'Pool',
]

const TOTAL_STEPS = 4

export default function Survey() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [checkingExisting, setCheckingExisting] = useState(true)

  const [form, setForm] = useState({
    sport: '',
    position: '',
    goals: '',
    time_per_week: '',
    weaknesses: '',
    injury_history: '',
    equipment: [],
  })

  useEffect(() => {
    api.get('/api/survey/my')
      .then(res => {
        if (res.data.survey) {
          navigate('/athlete', { replace: true })
        } else {
          setCheckingExisting(false)
        }
      })
      .catch(() => setCheckingExisting(false))
  }, [navigate])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleEquipment(item) {
    setForm(prev => {
      const already = prev.equipment.includes(item)
      return {
        ...prev,
        equipment: already
          ? prev.equipment.filter(e => e !== item)
          : [...prev.equipment, item],
      }
    })
  }

  function canAdvance() {
    if (step === 1) return form.sport.trim().length > 0
    return true
  }

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      await api.post('/api/survey', form)
      navigate('/athlete', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.')
      setSubmitting(false)
    }
  }

  if (checkingExisting) return <div style={styles.center}>Loading…</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.brand}>Offseaz</h1>
        <p style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</p>
      </div>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>

      <div style={styles.card}>
        {step === 1 && (
          <>
            <h2 style={styles.stepTitle}>Your Sport</h2>
            <p style={styles.stepDesc}>Tell us what sport you play and your position.</p>
            <label style={styles.label}>Sport *</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Basketball, Soccer, Football…"
              value={form.sport}
              onChange={e => set('sport', e.target.value)}
              autoFocus
            />
            <label style={styles.label}>Position</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Point Guard, Midfielder, QB…"
              value={form.position}
              onChange={e => set('position', e.target.value)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={styles.stepTitle}>Your Goals</h2>
            <p style={styles.stepDesc}>What do you want to achieve this offseason?</p>
            <label style={styles.label}>Goals</label>
            <textarea
              style={styles.textarea}
              placeholder="e.g. Improve my speed, add 20 lbs to my bench, get leaner…"
              value={form.goals}
              onChange={e => set('goals', e.target.value)}
              rows={4}
            />
            <label style={styles.label}>Hours available per week</label>
            <select
              style={styles.input}
              value={form.time_per_week}
              onChange={e => set('time_per_week', e.target.value)}
            >
              <option value="">Select…</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'hour' : 'hours'}</option>
              ))}
            </select>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={styles.stepTitle}>Areas to Improve</h2>
            <p style={styles.stepDesc}>Where do you most want to get better?</p>
            <label style={styles.label}>Weaknesses</label>
            <textarea
              style={styles.textarea}
              placeholder="e.g. Lateral quickness, upper body strength, conditioning…"
              value={form.weaknesses}
              onChange={e => set('weaknesses', e.target.value)}
              rows={5}
            />
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={styles.stepTitle}>Health & Equipment</h2>
            <p style={styles.stepDesc}>Help your coach plan around your situation.</p>
            <label style={styles.label}>Injury history</label>
            <textarea
              style={styles.textarea}
              placeholder="Any past or current injuries your coach should know about? (Leave blank if none)"
              value={form.injury_history}
              onChange={e => set('injury_history', e.target.value)}
              rows={3}
            />
            <label style={styles.label}>Available equipment</label>
            <div style={styles.checkboxGrid}>
              {EQUIPMENT_OPTIONS.map(item => (
                <label key={item} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.equipment.includes(item)}
                    onChange={() => toggleEquipment(item)}
                    style={styles.checkbox}
                  />
                  {item}
                </label>
              ))}
            </div>
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          {step > 1 && (
            <button style={styles.backBtn} onClick={() => setStep(s => s - 1)}>
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              style={{ ...styles.nextBtn, ...(canAdvance() ? {} : styles.disabled) }}
              onClick={() => canAdvance() && setStep(s => s + 1)}
              disabled={!canAdvance()}
            >
              Next
            </button>
          ) : (
            <button
              style={styles.nextBtn}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 16 },
  container: { maxWidth: 540, margin: '0 auto', padding: '32px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brand: { fontSize: 22, fontWeight: 700 },
  stepLabel: { fontSize: 13, color: '#888' },
  progressBar: { height: 4, background: '#e5e5e5', borderRadius: 2, marginBottom: 28 },
  progressFill: { height: '100%', background: '#1a1a1a', borderRadius: 2, transition: 'width 0.3s ease' },
  card: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 28 },
  stepTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  stepDesc: { fontSize: 14, color: '#666', marginBottom: 24 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6, marginTop: 16 },
  input: { width: '100%', padding: '10px 12px', fontSize: 15, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', fontSize: 15, borderRadius: 6, border: '1px solid #ccc', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  checkboxGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginTop: 4 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' },
  checkbox: { width: 16, height: 16, cursor: 'pointer' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28 },
  backBtn: { padding: '10px 20px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' },
  nextBtn: { padding: '10px 24px', fontSize: 14, fontWeight: 600, borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer' },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
  error: { color: '#c0392b', fontSize: 13, marginTop: 12 },
}
