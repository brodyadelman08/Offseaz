import { useEffect, useState } from 'react'
import { FlameIcon } from './Icons'

const ORANGE = '#F75709'
const YELLOW = '#F0BE24'

// Brief celebration toast shown when an athlete's streak crosses a 7/14/21
// day milestone right after logging a workout. Auto-dismisses after 2.5s.
export default function StreakMilestoneToast({ days, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), 2500)
    const doneTimer = setTimeout(() => onDone?.(), 2900) // let the fade-out finish before unmounting
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <div style={{ ...styles.toast, opacity: visible ? 1 : 0 }}>
      <FlameIcon size={32} color={ORANGE} />
      <div>
        <p style={styles.headline}>Streak Milestone</p>
        <p style={styles.days}>{days} <span style={styles.daysUnit}>days</span></p>
      </div>
    </div>
  )
}

const styles = {
  toast: {
    position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
    zIndex: 9600, display: 'flex', alignItems: 'center', gap: 14,
    background: '#111111', border: '1px solid rgba(247,87,9,0.35)',
    borderRadius: 16, padding: '14px 22px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    transition: 'opacity 0.4s ease',
    pointerEvents: 'none',
  },
  headline: {
    margin: 0, fontSize: 13, fontWeight: 700, color: '#FFFFFF',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  days: { margin: '2px 0 0', fontSize: 26, fontWeight: 900, color: YELLOW, lineHeight: 1 },
  daysUnit: { fontSize: 14, fontWeight: 700 },
}
