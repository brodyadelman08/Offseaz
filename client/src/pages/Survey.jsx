import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const BLUE = '#308EBD'

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
    <div style={styles.page}>
      {/* Slim top bar */}
      <div style={styles.topBar}>
        <img src="/OFFSEAZ_LOGO_PNG.png" alt="Offseaz" style={styles.logo} />
        <span style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</span>
      </div>

      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>

      <div style={styles.container}>
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
              <label style={styles.label}>How many days per week can you train?</label>
              <input
                style={styles.input}
                type="number"
                min={1}
                max={7}
                placeholder="e.g. 4"
                value={form.time_per_week}
                onChange={e => set('time_per_week', e.target.value)}
              />
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
                style={{ ...styles.nextBtn, opacity: canAdvance() ? 1 : 0.4, cursor: canAdvance() ? 'pointer' : 'not-allowed' }}
                onClick={() => canAdvance() && setStep(s => s + 1)}
                disabled={!canAdvance()}
              >
                Next →
              </button>
            ) : (
              <button
                style={styles.nextBtn}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit profile →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 16, color: 'var(--text-2)' },
  page: { minHeight: '100vh', background: 'var(--bg)' },

  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--border)' },
  logo: { height: 28, display: 'block', mixBlendMode: 'screen' },
  stepLabel: { fontSize: 13, color: 'var(--text-3)' },

  progressBar: { height: 3, background: 'var(--border)' },
  progressFill: { height: '100%', background: BLUE, transition: 'width 0.3s ease' },

  container: { maxWidth: 540, margin: '0 auto', padding: '32px 20px' },
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 },
  stepTitle: { fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 },
  stepDesc: { fontSize: 14, color: 'var(--text-2)', marginBottom: 8 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, marginTop: 20 },
  input: { width: '100%', padding: '11px 14px', fontSize: 15, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', boxSizing: 'border-box', outline: 'none' },
  textarea: { width: '100%', padding: '11px 14px', fontSize: 15, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  checkboxGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginTop: 4 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text)' },
  checkbox: { width: 16, height: 16, cursor: 'pointer', accentColor: BLUE },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 32 },
  backBtn: { padding: '10px 20px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', cursor: 'pointer', fontWeight: 500 },
  nextBtn: { padding: '11px 28px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: BLUE, color: '#fff', cursor: 'pointer', letterSpacing: 0.2 },
  error: { color: '#c73820', fontSize: 13, marginTop: 16 },
}
