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

// ─── Value formatting helpers ─────────────────────────────────────────────────

function fmtValue(val, unit) {
  if (val == null) return ''
  const n = Number(val)
  if (unit === 'feet_inches') {
    const ft = Math.floor(n / 12)
    const inch = parseFloat((n % 12).toFixed(1))
    return `${ft}' ${inch}"`
  }
  if (unit === 'min_sec') {
    const min = Math.floor(n / 60)
    const sec = (n % 60).toFixed(2).padStart(5, '0')
    return `${min}:${sec}`
  }
  return String(val)
}

function unitLabel(unit) {
  const MAP = { lbs: 'lbs', seconds: 'sec', inches: 'in', mph: 'mph', reps: 'reps' }
  return MAP[unit] ?? '' // feet_inches and min_sec are already complete in fmtValue
}

function fmtImprovement(raw, unit) {
  const n = Math.abs(raw)
  if (unit === 'feet_inches') {
    const ft = Math.floor(n / 12)
    const inch = parseFloat((n % 12).toFixed(1))
    return ft > 0 ? `${ft}' ${inch}"` : `${inch}"`
  }
  if (unit === 'min_sec') {
    const min = Math.floor(n / 60)
    const sec = (n % 60).toFixed(2).padStart(5, '0')
    return min > 0 ? `${min}:${sec}` : `${n.toFixed(2)}s`
  }
  return String(Number(n.toFixed(2)))
}

// ─── Canvas graphic ────────────────────────────────────────────────────────────

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

async function generateShareImage({ athleteName, sport, liftLabel, newWeight, previousBest, unit, isLowerBetter }) {
  const SIZE = 1080
  const canvas = document.createElement('canvas')
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = BLACK
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.fillStyle = ORANGE
  ctx.fillRect(0, 0, SIZE, 14)

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

  ctx.fillStyle = ORANGE
  ctx.fillRect(0, 178, SIZE, 3)

  ctx.fillStyle = BLUE
  ctx.font = 'bold 52px Arial, sans-serif'
  ctx.fillText(liftLabel.toUpperCase(), SIZE / 2, 252)

  // Hero value — font size scales with string length for complex units
  const heroStr = fmtValue(newWeight, unit) || String(newWeight)
  const unitStr = unitLabel(unit)
  const heroFontSize = heroStr.length > 6 ? 170 : heroStr.length > 4 ? 210 : 290
  ctx.fillStyle = ORANGE
  ctx.font = `bold ${heroFontSize}px Arial, sans-serif`
  const heroBaseline = Math.min(260 + Math.round(heroFontSize * 0.75), 620)
  ctx.fillText(heroStr, SIZE / 2, heroBaseline)

  if (unitStr) {
    ctx.font = 'bold 76px Arial, sans-serif'
    ctx.fillText(unitStr, SIZE / 2, 706)
  }

  const pillLabel = 'NEW PERSONAL RECORD'
  ctx.font = 'bold 38px Arial, sans-serif'
  const pillW = ctx.measureText(pillLabel).width + 80
  const pillH = 68
  const pillX = (SIZE - pillW) / 2
  const pillY = 730
  ctx.fillStyle = YELLOW
  drawPill(ctx, pillX, pillY, pillW, pillH)
  ctx.fillStyle = BLACK
  ctx.fillText(pillLabel, SIZE / 2, pillY + 44)

  if (previousBest !== null && previousBest !== undefined) {
    const prevStr = fmtValue(previousBest, unit) || String(previousBest)
    const rawDiff = isLowerBetter
      ? Number(previousBest) - Number(newWeight)
      : Number(newWeight) - Number(previousBest)
    const improvStr = fmtImprovement(rawDiff, unit)
    const arrow = isLowerBetter ? '↓' : '↑'
    const sign  = rawDiff >= 0 ? '+' : '−'

    ctx.fillStyle = WHITE
    ctx.font = '44px Arial, sans-serif'
    ctx.fillText(`Previous: ${prevStr}${unitStr ? ' ' + unitStr : ''}`, SIZE / 2, 852)
    ctx.fillStyle = YELLOW
    ctx.font = 'bold 44px Arial, sans-serif'
    ctx.fillText(`${arrow} ${sign}${improvStr}${unitStr ? ' ' + unitStr : ''}`, SIZE / 2, 906)
  }

  ctx.fillStyle = BLUE
  ctx.fillRect(80, 934, SIZE - 160, 3)

  if (athleteName) {
    ctx.fillStyle = WHITE
    ctx.font = '500 44px Arial, sans-serif'
    ctx.fillText(athleteName + (sport ? `  ${sport}` : ''), SIZE / 2, 992)
  }

  ctx.fillStyle = YELLOW
  ctx.font = 'italic 36px Arial, sans-serif'
  ctx.fillText('Champions are made in the Offseaz.', SIZE / 2, 1044)

  ctx.fillStyle = ORANGE
  ctx.fillRect(0, SIZE - 14, SIZE, 14)

  return canvas.toDataURL('image/png')
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const SHAPES = ['rect', 'circle', 'diamond']
const PIECE_DEFS = [
  { color: ORANGE, outline: false },
  { color: BLUE,   outline: false },
  { color: YELLOW, outline: false },
  { color: WHITE,  outline: false },
  { color: WHITE,  outline: true  },
]

function rnd(a, b) { return a + Math.random() * (b - a) }

const CONFETTI_PIECES = Array.from({ length: 70 }, (_, i) => {
  const shape  = SHAPES[i % 3]
  const def    = PIECE_DEFS[i % 5]
  const isCirc = shape === 'circle'
  const isDiam = shape === 'diamond'
  const sz     = rnd(7, 14)
  return {
    id:       i,
    color:    def.color,
    outline:  def.outline,
    clipPath: isDiam ? 'polygon(50% 0,100% 50%,50% 100%,0 50%)' : undefined,
    borderRadius: isCirc ? '50%' : 2,
    w: isCirc ? sz : isDiam ? sz      : sz * 1.7,
    h: isCirc ? sz : isDiam ? sz      : sz * 0.42,
    x:        rnd(0, 100),
    delay:    Math.pow(Math.random(), 2) * 0.9,
    dur:      rnd(2.5, 3.6),
    drift:    rnd(-100, 100),
    startRot: rnd(0, 360),
  }
})

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

export default function PRCelebration({
  lift,
  newWeight,
  previousBest,
  athleteName,
  sport,
  onClose,
  unit = 'lbs',
  isLowerBetter = false,
}) {
  const liftLabel = LIFT_LABELS[lift] || lift

  const heroStr  = fmtValue(newWeight, unit) || String(newWeight)
  const unitStr  = unitLabel(unit)

  const rawDiff = previousBest != null
    ? (isLowerBetter ? Number(previousBest) - Number(newWeight) : Number(newWeight) - Number(previousBest))
    : null
  const improvStr  = rawDiff != null ? fmtImprovement(rawDiff, unit) : null
  const improvSign = rawDiff != null && rawDiff >= 0 ? '+' : '−'
  const improvArr  = isLowerBetter ? '↓' : '↑'
  const prevStr    = previousBest != null ? (fmtValue(previousBest, unit) || String(previousBest)) : null

  const [saving,     setSaving]     = useState(false)
  const [confettiOn, setConfettiOn] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setConfettiOn(false), 4200)
    return () => clearTimeout(t)
  }, [])

  const canNativeShare = typeof navigator !== 'undefined'
    && typeof navigator.canShare === 'function'

  async function handleSave() {
    setSaving(true)
    try {
      const dataUrl = await generateShareImage({ athleteName, sport, liftLabel, newWeight, previousBest, unit, isLowerBetter })
      const res  = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `offseaz-pr-${Date.now()}.png`, { type: 'image/png' })
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `New PR — ${liftLabel} ${heroStr}${unitStr ? ' ' + unitStr : ''}` })
      } else {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('[PRCelebration] save:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={s.overlay}>
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          pointerEvents: 'none', zIndex: 0,
          opacity: confettiOn ? 1 : 0, transition: 'opacity 0.9s ease',
        }}>
          {CONFETTI_PIECES.map(p => <ConfettiPiece key={p.id} {...p} />)}
        </div>

        <div style={s.card}>
          <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={s.logo} />
          <div style={s.accentLine} />
          <p style={s.liftName}>{liftLabel}</p>

          <p style={s.weightHero}>
            {heroStr}
            {unitStr && <span style={s.lbsUnit}> {unitStr}</span>}
          </p>

          <div style={s.prBadge}>NEW PERSONAL RECORD</div>

          <div style={s.prevRow}>
            {prevStr ? (
              <>
                <span style={s.prevLabel}>Previous: {prevStr}{unitStr ? ' ' + unitStr : ''}</span>
                {improvStr && rawDiff !== null && Math.abs(rawDiff) > 0 && (
                  <span style={s.improvement}>
                    <span style={{ color: YELLOW, fontWeight: 900 }}>{improvArr}</span>
                    {' '}{improvSign}{improvStr}{unitStr ? ' ' + unitStr : ''}
                  </span>
                )}
              </>
            ) : (
              <span style={s.prevLabel}>First time logging this metric!</span>
            )}
          </div>

          <div style={s.btnStack}>
            <button style={{ ...s.saveBtn, opacity: saving ? 0.65 : 1 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Generating…' : '📸 Save to Camera Roll'}
            </button>
            <p style={s.saveCaption}>
              {canNativeShare ? 'Tap to share or save to your camera roll' : 'On iPhone: long press the image to save'}
            </p>
            <button style={s.continueBtn} onClick={onClose}>Continue</button>
          </div>
        </div>
      </div>
    </>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto',
  },
  card: {
    position: 'relative', zIndex: 1, background: '#060606',
    border: `1px solid ${ORANGE}33`, borderRadius: 24, padding: '22px 20px 20px',
    width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: `0 0 80px rgba(247,87,9,0.18), 0 0 0 1px rgba(247,87,9,0.12)`,
    animation: 'prPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
  },
  logo: { width: 210, maxWidth: '85%', height: 'auto', display: 'block', marginBottom: 10, opacity: 0.95 },
  accentLine: { width: '90%', height: 2, background: ORANGE, borderRadius: 1, marginBottom: 10 },
  liftName: { fontSize: 12, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 2.5, margin: '0 0 4px' },
  weightHero: {
    fontSize: 'clamp(72px, 22vw, 124px)', fontWeight: 900, color: ORANGE, margin: '0',
    lineHeight: 0.95, letterSpacing: -3, fontFamily: 'Calibri, Arial Black, sans-serif',
    animation: 'weightGlow 2.8s ease-in-out infinite', textAlign: 'center',
  },
  lbsUnit: { fontSize: 'clamp(22px, 6vw, 36px)', fontWeight: 700, letterSpacing: 0, fontFamily: 'inherit' },
  prBadge: {
    marginTop: 10, marginBottom: 10, padding: '6px 18px', background: YELLOW, color: BLACK,
    borderRadius: 100, fontSize: 11, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  prevRow: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginBottom: 16 },
  prevLabel:   { fontSize: 12, color: '#777' },
  improvement: { fontSize: 13, fontWeight: 700, color: WHITE },
  btnStack: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0, width: '100%' },
  saveBtn: {
    padding: '14px 0', background: ORANGE, border: 'none', borderRadius: 14, color: WHITE,
    fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(247,87,9,0.42)', letterSpacing: 0.2,
  },
  saveCaption: { textAlign: 'center', fontSize: 11, color: '#555', margin: '5px 0 8px' },
  continueBtn: {
    padding: '11px 0', background: 'transparent', border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: 14, color: WHITE, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
}
