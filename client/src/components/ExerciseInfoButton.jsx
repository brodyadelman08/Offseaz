import { useState } from 'react'
import { lookupExercise } from '../data/exerciseLibrary'

const ORANGE = '#F75709'

export default function ExerciseInfoButton({ exerciseName }) {
  const [open, setOpen] = useState(false)
  const info = lookupExercise(exerciseName)
  if (!info) return null

  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName)}`

  return (
    <>
      <button
        style={s.btn}
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        title={`Info: ${exerciseName}`}
        aria-label={`Info about ${exerciseName}`}
      >
        ⓘ
      </button>

      {open && (
        <div style={s.overlay} onClick={() => setOpen(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.header}>
              <h3 style={s.title}>{exerciseName}</h3>
              <button style={s.close} onClick={() => setOpen(false)}>✕</button>
            </div>

            <p style={s.desc}>{info.description}</p>

            <div style={s.muscles}>
              <span style={s.musclesLabel}>Muscles: </span>
              <span style={s.musclesText}>{info.muscles}</span>
            </div>

            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={s.ytLink}
            >
              ▶ Watch Demo on YouTube
            </a>
          </div>
        </div>
      )}
    </>
  )
}

const s = {
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    fontSize: 13,
    lineHeight: 1,
    color: ORANGE,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    marginLeft: 5,
    verticalAlign: 'middle',
    opacity: 0.75,
    flexShrink: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 24,
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
    flex: 1,
  },
  close: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: 'var(--text-3)',
    cursor: 'pointer',
    padding: '2px 4px',
    flexShrink: 0,
  },
  desc: {
    fontSize: 14,
    color: 'var(--text-2)',
    margin: '0 0 14px',
    lineHeight: 1.6,
  },
  muscles: {
    fontSize: 13,
    marginBottom: 18,
  },
  musclesLabel: {
    fontWeight: 700,
    color: 'var(--text)',
  },
  musclesText: {
    color: 'var(--text-2)',
  },
  ytLink: {
    display: 'inline-block',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    background: '#c00',
    borderRadius: 8,
    textDecoration: 'none',
    letterSpacing: 0.2,
  },
}
