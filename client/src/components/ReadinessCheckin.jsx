import { useState } from 'react'
import api from '../services/api'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const QUESTIONS = [
  { key: 'sleep',    label: 'How did you sleep last night?',  low: 'Terrible', high: 'Great' },
  { key: 'soreness', label: 'How sore are you today?',        low: 'Extremely sore', high: 'Fresh' },
  { key: 'energy',   label: 'How is your energy right now?',  low: 'Exhausted', high: 'Energized' },
]

function ScoreRow({ label, low, high, value, onChange }) {
  return (
    <div style={s.questionBlock}>
      <p style={s.qLabel}>{label}</p>
      {/* Score buttons fill the row evenly */}
      <div style={s.optionsRow}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            style={{
              ...s.scoreBtn,
              background: value === n ? ORANGE : 'var(--card-inner)',
              color: value === n ? '#fff' : 'var(--text-2)',
              border: `2px solid ${value === n ? ORANGE : 'var(--border)'}`,
              transform: value === n ? 'scale(1.08)' : 'scale(1)',
            }}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {/* Low / High labels below buttons — avoids horizontal overflow */}
      <div style={s.scaleLabelRow}>
        <span style={s.scaleLow}>{low}</span>
        <span style={s.scaleHigh}>{high}</span>
      </div>
    </div>
  )
}

export default function ReadinessCheckin({ onComplete, onDismiss }) {
  const [sleep,    setSleep]    = useState(null)
  const [soreness, setSoreness] = useState(null)
  const [energy,   setEnergy]   = useState(null)
  const [step, setStep]         = useState('questions') // 'questions' | 'rest_confirm'
  const [submitting, setSubmitting] = useState(false)

  const allAnswered = sleep && soreness && energy

  async function handleDayType(isRestDay) {
    if (!allAnswered) return
    setSubmitting(true)
    try {
      await api.post('/api/checkins', {
        sleep_score: sleep,
        soreness_score: soreness,
        energy_score: energy,
        is_rest_day: isRestDay,
      })
      if (isRestDay) {
        setStep('rest_confirm')
      } else {
        onComplete({ is_rest_day: false })
      }
    } catch (err) {
      console.error('[ReadinessCheckin]', err)
      onComplete({ is_rest_day: isRestDay })
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'rest_confirm') {
    return (
      <div style={s.overlay}>
        <div style={s.card}>
          <div style={s.restIcon}>😴</div>
          <h2 style={s.restTitle}>Smart.</h2>
          <p style={s.restMsg}>Recovery is part of the program.</p>
          <p style={{ ...s.restMsg, color: YELLOW, fontWeight: 700, fontSize: 15 }}>Your streak is safe. 🔥</p>
          <button style={s.continueBtn} onClick={() => onComplete({ is_rest_day: true })}>
            Got it
          </button>
        </div>
      </div>
    )
  }

  const readiness = allAnswered ? Math.round(((sleep + soreness + energy) / 3) * 20) : null

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ minWidth: 0 }}>
            <p style={s.headerLabel}>Daily Readiness</p>
            <h2 style={s.headerTitle}>How are you feeling?</h2>
          </div>
          {readiness !== null && (
            <div style={{
              ...s.readinessBadge,
              background: readiness >= 70 ? 'rgba(48,142,189,0.15)' : readiness >= 40 ? 'rgba(240,190,36,0.15)' : 'rgba(247,87,9,0.15)',
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: readiness >= 70 ? BLUE : readiness >= 40 ? YELLOW : ORANGE, lineHeight: 1 }}>
                {readiness}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600 }}>/ 100</span>
            </div>
          )}
        </div>

        {/* Questions */}
        <ScoreRow label={QUESTIONS[0].label} low={QUESTIONS[0].low} high={QUESTIONS[0].high} value={sleep}    onChange={setSleep} />
        <ScoreRow label={QUESTIONS[1].label} low={QUESTIONS[1].low} high={QUESTIONS[1].high} value={soreness} onChange={setSoreness} />
        <ScoreRow label={QUESTIONS[2].label} low={QUESTIONS[2].low} high={QUESTIONS[2].high} value={energy}   onChange={setEnergy} />

        {/* Training vs Rest */}
        <p style={s.dayTypeLabel}>Is today a training or rest day?</p>
        <div style={s.dayTypeBtns}>
          <button
            style={{ ...s.dayTypeBtn, opacity: !allAnswered || submitting ? 0.45 : 1, background: ORANGE, boxShadow: '0 3px 14px rgba(247,87,9,0.35)' }}
            disabled={!allAnswered || submitting}
            onClick={() => handleDayType(false)}
          >
            <span style={{ fontSize: 22 }}>💪</span>
            <span style={s.dayTypeBtnLabel}>Training Day</span>
          </button>
          <button
            style={{ ...s.dayTypeBtn, opacity: !allAnswered || submitting ? 0.45 : 1, background: BLUE, boxShadow: '0 3px 14px rgba(48,142,189,0.35)' }}
            disabled={!allAnswered || submitting}
            onClick={() => handleDayType(true)}
          >
            <span style={{ fontSize: 22 }}>😴</span>
            <span style={s.dayTypeBtnLabel}>Rest Day</span>
          </button>
        </div>

        {!allAnswered && (
          <p style={s.hint}>Answer all three questions to continue</p>
        )}

        <button style={s.skipBtn} onClick={onDismiss}>Skip for now</button>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
    zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px', overflowY: 'auto',
  },
  card: {
    background: 'var(--card)', borderRadius: 20, padding: '20px 16px',
    width: '100%', maxWidth: 460, boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    border: '1px solid var(--border)', boxSizing: 'border-box',
  },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerLabel: { fontSize: 10, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 3px' },
  headerTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 },
  readinessBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '7px 12px', borderRadius: 10, minWidth: 52, flexShrink: 0, marginLeft: 8,
  },

  questionBlock: { marginBottom: 16 },
  qLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.3 },

  /* Buttons fill the full width evenly — no overflow */
  optionsRow: { display: 'flex', gap: 5 },
  scoreBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 700,
    transition: 'all 0.14s',
    padding: 0,
    minWidth: 0,
  },

  scaleLabelRow: { display: 'flex', justifyContent: 'space-between', marginTop: 5 },
  scaleLow:  { fontSize: 10, color: 'var(--text-3)', lineHeight: 1 },
  scaleHigh: { fontSize: 10, color: 'var(--text-3)', lineHeight: 1 },

  dayTypeLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '4px 0 10px' },
  dayTypeBtns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 },
  dayTypeBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    padding: '13px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
    color: '#fff', transition: 'opacity 0.15s',
  },
  dayTypeBtnLabel: { fontSize: 13, fontWeight: 700, letterSpacing: 0.1 },

  hint: { fontSize: 11, color: 'var(--text-3)', textAlign: 'center', margin: '8px 0 0' },
  skipBtn: {
    display: 'block', width: '100%', marginTop: 12,
    background: 'none', border: 'none', color: 'var(--text-3)',
    fontSize: 12, cursor: 'pointer', padding: '8px 0',
  },

  restIcon: { fontSize: 48, textAlign: 'center', marginBottom: 10 },
  restTitle: { fontSize: 26, fontWeight: 900, color: 'var(--text)', textAlign: 'center', margin: '0 0 6px' },
  restMsg: { fontSize: 14, color: 'var(--text-2)', textAlign: 'center', margin: '0 0 5px' },
  continueBtn: {
    display: 'block', width: '100%', marginTop: 20,
    padding: '13px 0', background: ORANGE, border: 'none',
    borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15,
    cursor: 'pointer', boxShadow: '0 3px 14px rgba(247,87,9,0.35)',
  },
}
