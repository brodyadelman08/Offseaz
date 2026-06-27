import { useEffect, useRef } from 'react'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const WHITE  = '#FFFFFF'
const BLACK  = '#000000'

const CONFETTI_COLORS = [ORANGE, BLUE, YELLOW, WHITE, '#F75709']

const LIFT_LABELS = {
  bench_press:       'Bench Press',
  squat:             'Squat',
  deadlift:          'Deadlift',
  trap_bar_deadlift: 'Trap Bar Deadlift',
  power_clean:       'Power Clean',
  overhead_press:    'Overhead Press',
  hang_clean:        'Hang Clean',
  clean:             'Clean',
  front_squat:       'Front Squat',
  romanian_deadlift: 'Romanian Deadlift',
  reverse_lunge:     'Reverse Lunge',
}

// Generate share image via canvas
function generateShareImage({ athleteName, sport, liftLabel, newWeight }) {
  const SIZE = 1080
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = BLACK
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Orange accent bar at top
  ctx.fillStyle = ORANGE
  ctx.fillRect(0, 0, SIZE, 12)

  // Logo text placeholder (uppercase brand name)
  ctx.fillStyle = WHITE
  ctx.font = 'bold 52px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('OFFSEAZ', SIZE / 2, 100)

  // PR label
  ctx.fillStyle = ORANGE
  ctx.font = 'bold 80px Arial, sans-serif'
  ctx.fillText('NEW PR', SIZE / 2, 240)

  // Lift name
  ctx.fillStyle = WHITE
  ctx.font = '500 44px Arial, sans-serif'
  ctx.fillText(liftLabel, SIZE / 2, 320)

  // Weight
  ctx.fillStyle = ORANGE
  ctx.font = 'bold 200px Arial, sans-serif'
  ctx.fillText(`${newWeight}`, SIZE / 2, 560)
  ctx.font = 'bold 60px Arial, sans-serif'
  ctx.fillText('lbs', SIZE / 2, 640)

  // Athlete name
  ctx.fillStyle = WHITE
  ctx.font = '500 40px Arial, sans-serif'
  ctx.fillText(athleteName || 'Athlete', SIZE / 2, 740)

  if (sport) {
    ctx.fillStyle = '#888'
    ctx.font = '36px Arial, sans-serif'
    ctx.fillText(sport, SIZE / 2, 790)
  }

  // Bottom accent bar
  ctx.fillStyle = ORANGE
  ctx.fillRect(0, SIZE - 12, SIZE, 12)

  // Tagline
  ctx.fillStyle = '#555'
  ctx.font = 'italic 32px Arial, sans-serif'
  ctx.fillText('Champions are made in the Offseaz.', SIZE / 2, SIZE - 60)

  return canvas.toDataURL('image/png')
}

// Single confetti piece
function ConfettiPiece({ color, x, delay, dur, size, rotate }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`,
      top: -20,
      width: size,
      height: size * 0.5,
      background: color,
      borderRadius: 2,
      animation: `confettiFall ${dur}s ${delay}s ease-in infinite`,
      transform: `rotate(${rotate}deg)`,
    }} />
  )
}

const CONFETTI_PIECES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  x: Math.random() * 100,
  delay: Math.random() * 2,
  dur: 2.5 + Math.random() * 2,
  size: 8 + Math.floor(Math.random() * 8),
  rotate: Math.random() * 360,
}))

export default function PRCelebration({ lift, newWeight, previousBest, athleteName, sport, onClose }) {
  const liftLabel = LIFT_LABELS[lift] || lift
  const improvement = previousBest ? (newWeight - previousBest).toFixed(1) : null

  function handleShare() {
    const dataUrl = generateShareImage({ athleteName, sport, liftLabel, newWeight })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `offseaz-pr-${lift}-${newWeight}lbs.png`
    a.click()
  }

  return (
    <>
      {/* Confetti keyframes injected once */}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        @keyframes prPop {
          0%   { transform: scale(0.6); opacity: 0; }
          70%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes starPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50%       { transform: scale(1.08) rotate(8deg); }
        }
      `}</style>

      <div style={s.overlay}>
        {/* Confetti */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {CONFETTI_PIECES.map(p => <ConfettiPiece key={p.id} {...p} />)}
        </div>

        {/* Card */}
        <div style={s.card}>
          {/* Logo */}
          <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={s.logo} />

          {/* NEW PR */}
          <div style={s.newPrBadge}>NEW PR</div>

          {/* Starburst */}
          <div style={s.starburst}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ animation: 'starPulse 2s ease-in-out infinite' }}>
              {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
                <line key={deg}
                  x1="60" y1="60"
                  x2={60 + 50 * Math.cos((deg * Math.PI) / 180)}
                  y2={60 + 50 * Math.sin((deg * Math.PI) / 180)}
                  stroke={deg % 90 === 0 ? ORANGE : deg % 60 === 0 ? YELLOW : BLUE}
                  strokeWidth={deg % 90 === 0 ? 4 : 2}
                  strokeLinecap="round"
                />
              ))}
              <circle cx="60" cy="60" r="22" fill={ORANGE} />
              <text x="60" y="67" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="900">🏆</text>
            </svg>
          </div>

          {/* Lift + weight */}
          <p style={s.liftName}>{liftLabel}</p>
          <p style={s.newWeight}>{newWeight} <span style={s.lbsUnit}>lbs</span></p>

          {/* Previous best */}
          {previousBest !== null && (
            <p style={s.prevRecord}>
              <span style={s.greenArrow}>↑</span>
              {' '}Previous: {previousBest} lbs
              {improvement && <span style={s.improvement}> (+{improvement} lbs)</span>}
            </p>
          )}
          {previousBest === null && (
            <p style={s.prevRecord}>First time logging this lift — history starts now!</p>
          )}

          {/* Buttons */}
          <div style={s.btnRow}>
            <button style={s.shareBtn} onClick={handleShare}>
              📸 Share Your PR
            </button>
            <button style={s.continueBtn} onClick={onClose}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  card: {
    background: '#0d0d0d', border: '1px solid rgba(247,87,9,0.3)',
    borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 440,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    boxShadow: '0 0 60px rgba(247,87,9,0.25)',
    animation: 'prPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
    position: 'relative', zIndex: 1,
  },
  logo: { height: 32, marginBottom: 4, opacity: 0.9 },
  newPrBadge: {
    fontSize: 48, fontWeight: 900, color: WHITE,
    letterSpacing: 4, lineHeight: 1,
    fontFamily: 'Calibri, Arial, sans-serif',
    textShadow: `0 0 30px ${ORANGE}`,
  },
  starburst: { margin: '8px 0' },
  liftName: { fontSize: 18, fontWeight: 600, color: '#bbb', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: 1 },
  newWeight: { fontSize: 72, fontWeight: 900, color: ORANGE, margin: 0, lineHeight: 1.1, letterSpacing: -2, textShadow: `0 0 40px ${ORANGE}55` },
  lbsUnit: { fontSize: 28, fontWeight: 700, color: ORANGE },
  prevRecord: { fontSize: 14, color: '#888', margin: '4px 0 12px', textAlign: 'center' },
  greenArrow: { color: '#4caf50', fontWeight: 900, fontSize: 16 },
  improvement: { color: '#4caf50', fontWeight: 700 },
  btnRow: { display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 8 },
  shareBtn: {
    padding: '14px 0', background: ORANGE, border: 'none', borderRadius: 14,
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(247,87,9,0.40)',
  },
  continueBtn: {
    padding: '12px 0', background: 'transparent', border: `2px solid ${WHITE}33`,
    borderRadius: 14, color: WHITE, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}
