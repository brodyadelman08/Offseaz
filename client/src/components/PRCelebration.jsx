import { useState } from 'react'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const WHITE  = '#FFFFFF'
const BLACK  = '#000000'

const CONFETTI_COLORS = [ORANGE, BLUE, YELLOW, WHITE, ORANGE]

// TODO: allow custom athlete-defined lift names to reduce profile clutter
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

// Premium 1080×1080 share graphic — async so we can load the logo image
async function generateShareImage({ athleteName, sport, liftLabel, newWeight, previousBest }) {
  const SIZE = 1080
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // Black background
  ctx.fillStyle = BLACK
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Subtle orange top accent bar
  ctx.fillStyle = ORANGE
  ctx.fillRect(0, 0, SIZE, 8)

  // Load Offseaz logo (180px visual width at 1080)
  await new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const logoW = 360
      const logoH = Math.round((img.height / img.width) * logoW)
      ctx.drawImage(img, (SIZE - logoW) / 2, 60, logoW, logoH)
      resolve()
    }
    img.onerror = () => {
      // Fallback: text logo
      ctx.fillStyle = WHITE
      ctx.font = 'bold 56px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('OFFSEAZ', SIZE / 2, 110)
      resolve()
    }
    img.src = '/Offseaz-Logo-White-Letter-Dark.png'
  })

  ctx.textAlign = 'center'

  // Athlete name
  if (athleteName) {
    ctx.fillStyle = WHITE
    ctx.font = '500 42px Arial, sans-serif'
    ctx.fillText(athleteName, SIZE / 2, 260)
  }

  // Sport
  if (sport) {
    ctx.fillStyle = '#888'
    ctx.font = '36px Arial, sans-serif'
    ctx.fillText(sport, SIZE / 2, 310)
  }

  // Lift name in blue
  ctx.fillStyle = BLUE
  ctx.font = 'bold 44px Arial, sans-serif'
  ctx.fillText(liftLabel.toUpperCase(), SIZE / 2, 390)

  // PR weight — massive orange (Calibri Bold → Arial Bold fallback)
  ctx.fillStyle = ORANGE
  ctx.font = 'bold 280px Arial, sans-serif'
  ctx.fillText(String(newWeight), SIZE / 2, 710)

  // lbs unit
  ctx.fillStyle = ORANGE
  ctx.font = 'bold 64px Arial, sans-serif'
  ctx.fillText('lbs', SIZE / 2, 780)

  // Previous record
  if (previousBest !== null && previousBest !== undefined) {
    const improvement = (newWeight - previousBest).toFixed(1)
    ctx.fillStyle = WHITE
    ctx.font = '38px Arial, sans-serif'
    ctx.fillText(`Previous: ${previousBest} lbs`, SIZE / 2, 860)

    // Yellow arrow + improvement
    ctx.fillStyle = YELLOW
    ctx.font = 'bold 38px Arial, sans-serif'
    ctx.fillText(`↑ +${improvement} lbs`, SIZE / 2, 908)
  }

  // Tagline in yellow
  ctx.fillStyle = YELLOW
  ctx.font = 'italic 34px Arial, sans-serif'
  ctx.fillText('Champions are made in the Offseaz.', SIZE / 2, 984)

  // Bottom orange accent bar
  ctx.fillStyle = ORANGE
  ctx.fillRect(0, SIZE - 8, SIZE, 8)

  return canvas.toDataURL('image/png')
}

// Confetti piece
function ConfettiPiece({ color, x, delay, dur, size, rotate }) {
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: -20,
      width: size, height: size * 0.5,
      background: color, borderRadius: 2,
      animation: `confettiFall ${dur}s ${delay}s ease-in infinite`,
      transform: `rotate(${rotate}deg)`,
      pointerEvents: 'none',
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
  const improvement = (previousBest !== null && previousBest !== undefined)
    ? (newWeight - previousBest).toFixed(1)
    : null

  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const dataUrl = await generateShareImage({ athleteName, sport, liftLabel, newWeight, previousBest })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `offseaz-pr-${(lift || 'lift').replace(/_/g, '-')}-${newWeight}lbs.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('[PRCelebration] share failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        @keyframes prPop {
          0%   { transform: scale(0.7); opacity: 0; }
          70%  { transform: scale(1.04); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes weightPulse {
          0%, 100% { text-shadow: 0 0 30px rgba(247,87,9,0.5); }
          50%       { text-shadow: 0 0 60px rgba(247,87,9,0.9), 0 0 100px rgba(247,87,9,0.4); }
        }
      `}</style>

      <div style={s.overlay}>
        {/* Confetti — sits in full overlay, behind card */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {CONFETTI_PIECES.map(p => <ConfettiPiece key={p.id} {...p} />)}
        </div>

        {/* Card */}
        <div style={s.card}>
          {/* Logo — large and prominent for screenshots */}
          <img
            src="/Offseaz-Logo-White-Letter-Dark.png"
            alt="Offseaz"
            style={s.logo}
          />

          {/* NEW PR label */}
          <p style={s.newPrLabel}>NEW PR</p>

          {/* Lift name */}
          <p style={s.liftName}>{liftLabel}</p>

          {/* Weight hero — the star of the show */}
          <p style={s.weightHero}>
            {newWeight}
            <span style={s.lbsUnit}> lbs</span>
          </p>

          {/* Previous record */}
          <div style={s.prevRow}>
            {previousBest !== null && previousBest !== undefined ? (
              <>
                <span style={s.prevLabel}>Previous: {previousBest} lbs</span>
                {improvement && (
                  <span style={s.improvement}>
                    <span style={s.yellowArrow}>↑</span> +{improvement} lbs
                  </span>
                )}
              </>
            ) : (
              <span style={s.prevLabel}>First time logging this lift!</span>
            )}
          </div>

          {/* Buttons */}
          <div style={s.btnStack}>
            <button style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Generating…' : '📸 Save to Camera Roll'}
            </button>
            <p style={s.saveCaption}>Save and share anywhere</p>
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
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.94)',
    zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
    overflowY: 'auto',
  },
  card: {
    position: 'relative', zIndex: 1,
    background: '#080808',
    border: `1px solid ${ORANGE}44`,
    borderRadius: 24,
    padding: '28px 24px 24px',
    width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
    boxShadow: `0 0 80px rgba(247,87,9,0.20), 0 0 0 1px rgba(247,87,9,0.15)`,
    animation: 'prPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
  },

  // Logo — prominent for screenshots: 200px min, never wider than card
  logo: {
    width: 200,
    maxWidth: '80%',
    height: 'auto',
    display: 'block',
    marginBottom: 14,
    opacity: 0.95,
  },

  newPrLabel: {
    fontSize: 13,
    fontWeight: 900,
    color: WHITE,
    letterSpacing: 5,
    textTransform: 'uppercase',
    margin: '0 0 6px',
    opacity: 0.7,
  },

  // Lift name
  liftName: {
    fontSize: 13,
    fontWeight: 700,
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 2,
    margin: '0 0 4px',
  },

  // Weight is the hero — 96px minimum on mobile (card is max 420px wide)
  weightHero: {
    fontSize: 'clamp(96px, 26vw, 124px)',
    fontWeight: 900,
    color: ORANGE,
    margin: '4px 0 0',
    lineHeight: 1,
    letterSpacing: -3,
    fontFamily: 'Calibri, Arial, sans-serif',
    animation: 'weightPulse 2.5s ease-in-out infinite',
  },
  lbsUnit: {
    fontSize: 'clamp(28px, 8vw, 38px)',
    fontWeight: 700,
    color: ORANGE,
    letterSpacing: 0,
  },

  // Previous record row
  prevRow: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    marginTop: 10, marginBottom: 18,
  },
  prevLabel: { fontSize: 13, color: '#999' },
  improvement: { fontSize: 14, fontWeight: 700, color: WHITE },
  yellowArrow: { color: YELLOW, fontWeight: 900 },

  // Button stack
  btnStack: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0, width: '100%' },
  saveBtn: {
    padding: '14px 0',
    background: ORANGE,
    border: 'none',
    borderRadius: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(247,87,9,0.45)',
    letterSpacing: 0.2,
  },
  saveCaption: {
    textAlign: 'center',
    fontSize: 11,
    color: '#555',
    margin: '5px 0 10px',
  },
  continueBtn: {
    padding: '12px 0',
    background: 'transparent',
    border: `1px solid rgba(255,255,255,0.15)`,
    borderRadius: 14,
    color: WHITE,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
