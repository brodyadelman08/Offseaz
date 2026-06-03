import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const TOOLTIP_W = 270

/**
 * Shared tutorial overlay used by CoachTutorial and AthleteTutorial.
 *
 * Props:
 *   steps    – array of { id, emoji, title, body }
 *   lsKey    – localStorage key to track completion
 *   accent   – hex color for highlight ring + CTA
 */
export default function TutorialOverlay({ steps, lsKey, accent = '#F75709' }) {
  const [step,    setStep]    = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect,    setRect]    = useState(null)

  // Delay startup so layout settles; skip if already completed
  useEffect(() => {
    if (localStorage.getItem(lsKey)) return
    const t = setTimeout(() => setVisible(true), 900)
    return () => clearTimeout(t)
  }, [lsKey])

  // Re-measure target whenever step changes or window resizes
  const measure = useCallback(() => {
    if (!visible || !steps[step]) return
    const el = document.querySelector(`[data-tutorial="${steps[step].id}"]`)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [visible, step, steps])

  useEffect(() => {
    measure()
    window.addEventListener('resize',  measure)
    window.addEventListener('scroll',  measure, true)
    return () => {
      window.removeEventListener('resize',  measure)
      window.removeEventListener('scroll',  measure, true)
    }
  }, [measure])

  function dismiss() {
    localStorage.setItem(lsKey, '1')
    setVisible(false)
  }

  function next() {
    if (step < steps.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  if (!visible) return null

  const s = TOOLTIP_W
  const current = steps[step]

  // ── Tooltip position ──────────────────────────────────────────────────────
  let tt = { position: 'fixed', zIndex: 10000, width: s }
  if (rect) {
    const spaceRight  = window.innerWidth  - rect.right
    const spaceBelow  = window.innerHeight - rect.bottom
    const spaceLeft   = rect.left

    if (spaceRight >= s + 20) {
      // Place to the right of the element
      tt.left = rect.right + 14
      tt.top  = rect.top + rect.height / 2 - 70
    } else if (spaceLeft >= s + 20) {
      // Place to the left
      tt.left = rect.left - s - 14
      tt.top  = rect.top + rect.height / 2 - 70
    } else if (spaceBelow >= 160) {
      // Place below
      tt.left = Math.max(8, Math.min(rect.left, window.innerWidth - s - 8))
      tt.top  = rect.bottom + 12
    } else {
      // Place above
      tt.left = Math.max(8, Math.min(rect.left, window.innerWidth - s - 8))
      tt.top  = rect.top - 150
    }
    // Clamp within viewport
    tt.top  = Math.max(8,  Math.min(tt.top,  window.innerHeight - 180))
    tt.left = Math.max(8,  Math.min(tt.left, window.innerWidth  - s - 8))
  } else {
    // Fallback: center of screen
    tt.left = Math.max(8, window.innerWidth  / 2 - s / 2)
    tt.top  = Math.max(8, window.innerHeight / 2 - 80)
  }

  return createPortal(
    <>
      {/* Dim overlay */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.55)' }}
        onClick={dismiss}
      />

      {/* Spotlight ring around the target element */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            zIndex: 9999,
            left:   rect.left   - 5,
            top:    rect.top    - 5,
            width:  rect.width  + 10,
            height: rect.height + 10,
            borderRadius: 10,
            border: `2px solid ${accent}`,
            boxShadow: `0 0 0 4px ${accent}33`,
            pointerEvents: 'none',
            transition: 'all 0.25s ease',
          }}
        />
      )}

      {/* Tooltip card */}
      <div style={{
        ...tt,
        background:   '#1C1C1C',
        border:       '1px solid #2E2E2E',
        borderRadius: 14,
        padding:      '16px 18px',
        boxShadow:    '0 12px 48px rgba(0,0,0,0.55)',
        fontFamily:   "'Inter', system-ui, sans-serif",
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Step {step + 1} / {steps.length}
          </span>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', fontWeight: 500, padding: '2px 4px' }}
          >
            Skip Demo
          </button>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{current.emoji}</span>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#EFEFEF' }}>{current.title}</p>
        </div>

        {/* Body */}
        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#999', lineHeight: 1.6 }}>{current.body}</p>

        {/* Step dots + Next button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === step ? accent : '#3A3A3A',
                  transition: 'width 0.2s ease, background 0.2s ease',
                }}
              />
            ))}
          </div>
          <button
            onClick={next}
            style={{
              background: accent,
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 8,
              padding: '8px 18px',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            {step < steps.length - 1 ? 'Next →' : 'Done ✓'}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
