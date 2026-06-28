import { useState, useEffect } from 'react'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const WHITE  = '#FFFFFF'
const BLACK  = '#000000'

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

// ─── Canvas graphic ────────────────────────────────────────────────────────────
// Draw a pill (rounded rect) helper — avoids ctx.roundRect browser compat issues
function drawPill(ctx, x, y, w, h) {
  const r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

async function generateShareImage({ athleteName, sport, liftLabel, newWeight, previousBest }) {
  const SIZE = 1080
  const canvas = document.createElement('canvas')
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = BLACK
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Top orange accent bar
  ctx.fillStyle = ORANGE
  ctx.fillRect(0, 0, SIZE, 14)

  // ── Logo ────────────────────────────────────────────────────────────────────
  await new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const logoW = 420
      const logoH = Math.round((img.height / img.width) * logoW)
      ctx.drawImage(img, (SIZE - logoW) / 2, 46, logoW, logoH)
      resolve()
    }
    img.onerror = () => {
      ctx.fillStyle = WHITE
      ctx.font = 'bold 60px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('OFFSEAZ', SIZE / 2, 110)
      resolve()
    }
    img.src = '/Offseaz-Logo-White-Letter-Dark.png'
  })

  ctx.textAlign = 'center'

  // Orange accent line below logo
  ctx.fillStyle = ORANGE
  ctx.fillRect(0, 178, SIZE, 3)

  // ── Lift name in blue ───────────────────────────────────────────────────────
  ctx.fillStyle = BLUE
  ctx.font = 'bold 52px Arial, sans-serif'
  ctx.fillText(liftLabel.toUpperCase(), SIZE / 2, 252)

  // ── PR weight — massive orange ──────────────────────────────────────────────
  ctx.fillStyle = ORANGE
  ctx.font = 'bold 290px Arial, sans-serif'
  ctx.fillText(String(newWeight), SIZE / 2, 618)

  // "lbs" unit
  ctx.font = 'bold 76px Arial, sans-serif'
  ctx.fillText('lbs', SIZE / 2, 706)

  // ── Yellow "NEW PERSONAL RECORD" badge pill ─────────────────────────────────
  const pillLabel = 'NEW PERSONAL RECORD'
  ctx.font = 'bold 38px Arial, sans-serif'
  const pillTW = ctx.measureText(pillLabel).width
  const pillW  = pillTW + 80
  const pillH  = 68
  const pillX  = (SIZE - pillW) / 2
  const pillY  = 730
  ctx.fillStyle = YELLOW
  drawPill(ctx, pillX, pillY, pillW, pillH)
  ctx.fillStyle = BLACK
  ctx.fillText(pillLabel, SIZE / 2, pillY + 44)

  // ── Previous record ─────────────────────────────────────────────────────────
  if (previousBest !== null && previousBest !== undefined) {
    const improvement = (newWeight - previousBest).toFixed(1)
    ctx.fillStyle = WHITE
    ctx.font = '44px Arial, sans-serif'
    ctx.fillText(`Previous: ${previousBest} lbs`, SIZE / 2, 852)
    ctx.fillStyle = YELLOW
    ctx.font = 'bold 44px Arial, sans-serif'
    ctx.fillText(`↑ +${improvement} lbs`, SIZE / 2, 906)
  }

  // Blue accent line
  ctx.fillStyle = BLUE
  ctx.fillRect(80, 934, SIZE - 160, 3)

  // ── Athlete name + sport ────────────────────────────────────────────────────
  if (athleteName) {
    ctx.fillStyle = WHITE
    ctx.font = '500 44px Arial, sans-serif'
    ctx.fillText(athleteName + (sport ? `  ${sport}` : ''), SIZE / 2, 992)
  }

  // ── Tagline in yellow ───────────────────────────────────────────────────────
  ctx.fillStyle = YELLOW
  ctx.font = 'italic 36px Arial, sans-serif'
  ctx.fillText('Champions are made in the Offseaz.', SIZE / 2, 1044)

  // Bottom orange accent bar
  ctx.fillStyle = ORANGE
  ctx.fillRect(0, SIZE - 14, SIZE, 14)

  return canvas.toDataURL('image/png')
}

// ─── Confetti system — runs once then fades ────────────────────────────────────

const SHAPES = ['rect', 'circle', 'diamond']
const PIECE_DEFS = [
  { color: ORANGE, outline: false },
  { color: BLUE,   outline: false },
  { color: YELLOW, outline: false },
  { color: WHITE,  outline: false },
  { color: WHITE,  outline: true  }, // black-outlined pieces
]

function rnd(a, b) { return a + Math.random() * (b - a) }

const CONFETTI_PIECES = Array.from({ length: 70 }, (_, i) => {
  const shape   = SHAPES[i % 3]
  const def     = PIECE_DEFS[i % 5]
  const isCirc  = shape === 'circle'
  const isDiam  = shape === 'diamond'
  const sz      = rnd(7, 14)
  return {
    id:       i,
    color:    def.color,
    outline:  def.outline,
    clipPath: isDiam ? 'polygon(50% 0,100% 50%,50% 100%,0 50%)' : undefined,
    borderRadius: isCirc ? '50%' : 2,
    w: isCirc ? sz    : isDiam ? sz      : sz * 1.7,
    h: isCirc ? sz    : isDiam ? sz      : sz * 0.42,
    x:        rnd(0, 100),
    delay:    Math.pow(Math.random(), 2) * 0.9, // biased to 0 → dense burst at top
    dur:      rnd(2.5, 3.6),
    drift:    rnd(-100, 100),
    startRot: rnd(0, 360),
  }
})

// Build all CSS at module level so React doesn't regenerate on every render
const CONFETTI_CSS = CONFETTI_PIECES.map(p => `
  @keyframes c${p.id} {
    0%  { transform: translateY(-24px) translateX(0px) rotate(${p.startRot}deg); opacity: 1; }
    85% { opacity: 1; }
    100%{ transform: translateY(108vh) translateX(${p.drift}px) rotate(${p.startRot + 580}deg); opacity: 0; }
  }
`).join('')

const GLOBAL_CSS = `
  @keyframes prPop {
    0%  { transform: scale(0.65); opacity: 0; }
    70% { transform: scale(1.05); }
    100%{ transform: scale(1);    opacity: 1; }
  }
  @keyframes weightGlow {
    0%,100% { text-shadow: 0 0 30px rgba(247,87,9,0.45); }
    50%      { text-shadow: 0 0 70px rgba(247,87,9,0.9), 0 0 120px rgba(247,87,9,0.35); }
  }
  ${CONFETTI_CSS}
`

function ConfettiPiece({ id, color, outline, w, h, x, delay, dur, borderRadius, clipPath }) {
  return (
    <div style={{
      position:       'absolute',
      left:           `${x}%`,
      top:            0,
      width:          w,
      height:         h,
      background:     color,
      borderRadius,
      clipPath:       clipPath || undefined,
      outline:        outline ? '1.5px solid #111' : 'none',
      animationName:  `c${id}`,
      animationDuration:       `${dur}s`,
      animationDelay:          `${delay}s`,
      animationTimingFunction: 'ease-in',
      animationFillMode:       'forwards',
      willChange:              'transform, opacity',
      pointerEvents:           'none',
    }} />
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PRCelebration({ lift, newWeight, previousBest, athleteName, sport, onClose }) {
  const liftLabel   = LIFT_LABELS[lift] || lift
  const improvement = (previousBest !== null && previousBest !== undefined)
    ? (newWeight - previousBest).toFixed(1)
    : null

  const [saving, setSaving] = useState(false)
  // Confetti runs for ~4s then fades out — celebration screen stays
  const [confettiOn, setConfettiOn] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setConfettiOn(false), 4200)
    return () => clearTimeout(t)
  }, [])

  // Detect Web Share API with file support (iOS Safari 15+, Android Chrome)
  const canNativeShare = typeof navigator !== 'undefined'
    && typeof navigator.canShare === 'function'

  async function handleSave() {
    setSaving(true)
    try {
      const dataUrl = await generateShareImage({ athleteName, sport, liftLabel, newWeight, previousBest })

      // Convert data URL → Blob → File for Web Share API
      const fetchRes = await fetch(dataUrl)
      const blob     = await fetchRes.blob()
      const fileName = `offseaz-pr-${(lift || 'lift').replace(/_/g, '-')}-${newWeight}lbs.png`
      const file     = new File([blob], fileName, { type: 'image/png' })

      if (canNativeShare && navigator.canShare({ files: [file] })) {
        // Works on iOS Safari 15+ and Android Chrome — saves to camera roll or shares
        await navigator.share({ files: [file], title: `New PR — ${liftLabel} ${newWeight} lbs` })
      } else {
        // Fallback: open blob URL in new tab so athlete can long-press → Save Image
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('[PRCelebration] save failed:', err)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div style={s.overlay}>
        {/* Confetti — full overlay, fades out after 4s */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          pointerEvents: 'none', zIndex: 0,
          opacity: confettiOn ? 1 : 0,
          transition: 'opacity 0.9s ease',
        }}>
          {CONFETTI_PIECES.map(p => <ConfettiPiece key={p.id} {...p} />)}
        </div>

        {/* Card */}
        <div style={s.card}>
          {/* Logo — 200px+ wide, prominent for screenshots */}
          <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={s.logo} />

          {/* Thin orange accent line */}
          <div style={s.accentLine} />

          {/* Lift name */}
          <p style={s.liftName}>{liftLabel}</p>

          {/* Weight — hero of the celebration */}
          <p style={s.weightHero}>
            {newWeight}
            <span style={s.lbsUnit}> lbs</span>
          </p>

          {/* Yellow PR badge */}
          <div style={s.prBadge}>NEW PERSONAL RECORD</div>

          {/* Previous record */}
          <div style={s.prevRow}>
            {previousBest !== null && previousBest !== undefined ? (
              <>
                <span style={s.prevLabel}>Previous: {previousBest} lbs</span>
                {improvement && (
                  <span style={s.improvement}>
                    <span style={{ color: YELLOW, fontWeight: 900 }}>↑</span> +{improvement} lbs
                  </span>
                )}
              </>
            ) : (
              <span style={s.prevLabel}>First time logging this lift!</span>
            )}
          </div>

          {/* Buttons */}
          <div style={s.btnStack}>
            <button
              style={{ ...s.saveBtn, opacity: saving ? 0.65 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Generating…' : '📸 Save to Camera Roll'}
            </button>
            <p style={s.saveCaption}>
              {canNativeShare
                ? 'Tap to share or save to your camera roll'
                : 'On iPhone: long press the image to save'}
            </p>
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
    background: '#060606',
    border: `1px solid ${ORANGE}33`,
    borderRadius: 24,
    padding: '22px 20px 20px',
    width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: `0 0 80px rgba(247,87,9,0.18), 0 0 0 1px rgba(247,87,9,0.12)`,
    animation: 'prPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
  },

  logo: {
    width: 210,
    maxWidth: '85%',
    height: 'auto',
    display: 'block',
    marginBottom: 10,
    opacity: 0.95,
  },

  accentLine: {
    width: '90%',
    height: 2,
    background: ORANGE,
    borderRadius: 1,
    marginBottom: 10,
  },

  liftName: {
    fontSize: 12,
    fontWeight: 700,
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    margin: '0 0 4px',
  },

  // Weight: minimum 96px on mobile, scales with viewport, capped at 124px
  weightHero: {
    fontSize: 'clamp(96px, 25vw, 124px)',
    fontWeight: 900,
    color: ORANGE,
    margin: '0',
    lineHeight: 0.95,
    letterSpacing: -4,
    fontFamily: 'Calibri, Arial Black, sans-serif',
    animation: 'weightGlow 2.8s ease-in-out infinite',
    textAlign: 'center',
  },
  lbsUnit: {
    fontSize: 'clamp(28px, 7vw, 36px)',
    fontWeight: 700,
    letterSpacing: 0,
    fontFamily: 'inherit',
  },

  prBadge: {
    marginTop: 10,
    marginBottom: 10,
    padding: '6px 18px',
    background: YELLOW,
    color: BLACK,
    borderRadius: 100,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  prevRow: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    marginBottom: 16,
  },
  prevLabel:   { fontSize: 12, color: '#777' },
  improvement: { fontSize: 13, fontWeight: 700, color: WHITE },

  btnStack: {
    display: 'flex', flexDirection: 'column', alignItems: 'stretch',
    gap: 0, width: '100%',
  },
  saveBtn: {
    padding: '14px 0',
    background: ORANGE,
    border: 'none',
    borderRadius: 14,
    color: WHITE,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(247,87,9,0.42)',
    letterSpacing: 0.2,
  },
  saveCaption: {
    textAlign: 'center',
    fontSize: 11,
    color: '#555',
    margin: '5px 0 8px',
  },
  continueBtn: {
    padding: '11px 0',
    background: 'transparent',
    border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: 14,
    color: WHITE,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
