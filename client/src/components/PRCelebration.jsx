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

// Draw confetti directly onto the canvas as a background layer.
// Called BEFORE logo/text so all content renders on top.
// Protected zone (15%–85% height, 10%–90% width) is left clear so the
// hero number and text in the center are always fully readable.
function drawCanvasConfetti(ctx, size) {
  const COLORS = [ORANGE, ORANGE, BLUE, BLUE, YELLOW, YELLOW, WHITE, WHITE, BLACK, BLACK]
  const pieces = Array.from({ length: 104 }, (_, i) => ({
    x:     Math.random() * size,
    y:     Math.random() * size,
    w:     20 + Math.random() * 30,        // 20–50 px wide
    h:     6 + Math.random() * 12,         // 6–18 px tall
    rot:   Math.random() * Math.PI * 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: i % 3,                           // 0=rect, 1=circle, 2=diamond
    alpha: 0.70 + Math.random() * 0.30,    // 70–100 % opacity
  }))
  for (const p of pieces) {
    // Skip any piece whose center falls inside the protected central zone
    if (p.x > size * 0.10 && p.x < size * 0.90 &&
        p.y > size * 0.15 && p.y < size * 0.85) continue
    ctx.save()
    ctx.globalAlpha = p.alpha
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    if (p.shape === 1) {
      // circle
      ctx.beginPath()
      ctx.arc(0, 0, p.h / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.shape === 2) {
      // diamond
      ctx.beginPath()
      ctx.moveTo(0, -p.h)
      ctx.lineTo(p.w / 2, 0)
      ctx.lineTo(0, p.h)
      ctx.lineTo(-p.w / 2, 0)
      ctx.closePath()
      ctx.fill()
    } else {
      // rectangle
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
    }
    ctx.restore()
  }
}

function fillRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,     x + w, y + r,     r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,      y + h, x,       y + h - r, r)
  ctx.lineTo(x,     y + r)
  ctx.arcTo(x,      y,     x + r,   y,         r)
  ctx.closePath()
  ctx.fill()
}

async function generateShareImage({ athleteName, sport, liftLabel, newWeight, previousBest, unit, isLowerBetter }) {
  const SIZE = 1080
  const canvas = document.createElement('canvas')
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // ── Black background ──────────────────────────────────────────────────────
  ctx.fillStyle = BLACK
  ctx.fillRect(0, 0, SIZE, SIZE)

  // ── Confetti behind everything ────────────────────────────────────────────
  drawCanvasConfetti(ctx, SIZE)

  // ── Orange accent bars — top and bottom edges ─────────────────────────────
  ctx.fillStyle = ORANGE
  ctx.fillRect(0, 0, SIZE, 12)
  ctx.fillRect(0, SIZE - 12, SIZE, 12)

  // ── Section 1: Header ────────────────────────────────────────────────────
  const LOGO_W    = 580
  const LOGO_Y    = 22
  let logoBottomY = LOGO_Y + 115   // fallback if image fails to load

  await new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const logoH = Math.round((img.height / img.width) * LOGO_W)
      ctx.drawImage(img, (SIZE - LOGO_W) / 2, LOGO_Y, LOGO_W, logoH)
      logoBottomY = LOGO_Y + logoH
      resolve()
    }
    img.onerror = () => {
      ctx.fillStyle = WHITE
      ctx.textAlign = 'center'
      ctx.font = 'bold 64px Arial, sans-serif'
      ctx.fillText('OFFSEAZ', SIZE / 2, LOGO_Y + 75)
      logoBottomY = LOGO_Y + 95
      resolve()
    }
    img.src = '/Offseaz-Logo-White-Letter-Dark.png'
  })

  ctx.textAlign = 'center'

  // Blue header divider — 1px, 80px margins (Fix 3: tighter to logo, −30%)
  const headerDivY = logoBottomY + 18   // was 26
  ctx.fillStyle = BLUE
  ctx.fillRect(80, headerDivY, SIZE - 160, 1)

  // ── Section 3: Footer — calculated FIRST so card can avoid it (Fix 2) ─────
  // Layout upward from the bottom bar:
  //   bottom bar (12px) | tagline | generous gap | sport | athlete name | divider
  const taglineBaseline = SIZE - 12 - 26   // = 1042
  const hasAthlete = Boolean(athleteName)
  const hasSport   = Boolean(sport)

  let footerDivY, athleteBaseline, sportBaseline
  if (hasAthlete) {
    if (hasSport) {
      sportBaseline   = taglineBaseline - 64
      athleteBaseline = sportBaseline - 60
      footerDivY      = athleteBaseline - 52
    } else {
      athleteBaseline = taglineBaseline - 64
      footerDivY      = athleteBaseline - 52
    }
  } else {
    footerDivY = taglineBaseline - 80
  }

  // ── Section 2: Performance card ───────────────────────────────────────────
  const CARD_X       = 52
  const CARD_W       = SIZE - 104
  const CARD_Y       = headerDivY + 25   // Fix 3: was +36 (−30%)
  const CARD_RADIUS  = 28
  const CARD_PAD_TOP = 74   // Fix 4: extra top breathing room (was 42)
  const CARD_PAD_V   = 42   // bottom padding
  const CARD_PAD_H   = 52   // horizontal inset for hero overflow check

  const heroStr = fmtValue(newWeight, unit) || String(newWeight)
  const unitStr = unitLabel(unit)
  const hasPrev = previousBest != null && previousBest !== undefined

  // Pick starting hero font size, then scale down if the number is too wide
  let heroFontSz = heroStr.length > 6 ? 148 : heroStr.length > 4 ? 188 : 228
  const reCalc = () => {
    ctx.font = `bold ${heroFontSz}px Calibri, Arial Black, sans-serif`
    const nW = ctx.measureText(heroStr).width
    const uFs = unitStr ? Math.round(heroFontSz * 0.30) : 0
    ctx.font = unitStr ? `bold ${uFs}px Arial, sans-serif` : ''
    const uW = unitStr ? ctx.measureText(` ${unitStr}`).width : 0
    return { nW, uFs, uW }
  }
  let { nW: numW, uFs: uFontSz, uW: unitW } = reCalc()
  const availHeroW = CARD_W - CARD_PAD_H * 2
  while (numW + unitW > availHeroW && heroFontSz > 80) {
    heroFontSz -= 6
    ;({ nW: numW, uFs: uFontSz, uW: unitW } = reCalc())
  }

  // — Metric name: scale down then word-wrap if still too wide —
  const METRIC_MAX_W = CARD_W - CARD_PAD_H * 2
  const metricText   = liftLabel.toUpperCase()
  let metricFontSz   = 52
  ctx.font = `bold ${metricFontSz}px Arial, sans-serif`
  while (ctx.measureText(metricText).width > METRIC_MAX_W && metricFontSz > 32) {
    metricFontSz -= 2
    ctx.font = `bold ${metricFontSz}px Arial, sans-serif`
  }
  // Still overflows at 32px min — split onto two lines at a comfortable size
  let metricLines = [metricText]
  if (ctx.measureText(metricText).width > METRIC_MAX_W) {
    metricFontSz = 38
    const words = metricText.split(' ')
    let split = 1
    for (let i = 1; i < words.length; i++) {
      ctx.font = `bold ${metricFontSz}px Arial, sans-serif`
      if (ctx.measureText(words.slice(0, i + 1).join(' ')).width <= METRIC_MAX_W) split = i + 1
      else break
    }
    metricLines = [words.slice(0, split).join(' '), words.slice(split).join(' ')].filter(Boolean)
    while (metricFontSz > 22) {
      ctx.font = `bold ${metricFontSz}px Arial, sans-serif`
      if (Math.max(...metricLines.map(l => ctx.measureText(l).width)) <= METRIC_MAX_W) break
      metricFontSz -= 2
    }
  }
  const METRIC_LINE_GAP = 8
  const metricTotalH = metricLines.length === 2
    ? metricFontSz + METRIC_LINE_GAP + metricFontSz
    : metricFontSz

  // Fix 1: pill label flips based on whether this is the first entry ever
  ctx.font = 'bold 34px Arial, sans-serif'
  const PILL_LABEL = hasPrev ? 'NEW PERSONAL RECORD' : '★ FIRST TIME LOGGED'
  const pillW = ctx.measureText(PILL_LABEL).width + 56
  const PILL_H = 50

  // Card height: Fix 1 removes the separate prev-section for first-time entries
  const prevSecH = hasPrev ? 80 : 0
  const cardH    = CARD_PAD_TOP + metricTotalH + 20 + heroFontSz + 20 + PILL_H
    + (hasPrev ? 14 + prevSecH : 0) + CARD_PAD_V

  // Fix 2: enforce 40px minimum gap between card bottom and footer divider
  const safeCardH = Math.min(cardH, footerDivY - 40 - CARD_Y)

  // Draw card background (#1A1A1A rounded rect)
  ctx.fillStyle = '#1A1A1A'
  fillRoundRect(ctx, CARD_X, CARD_Y, CARD_W, safeCardH, CARD_RADIUS)

  // — Metric / exercise name (single or two-line) —
  let cy = CARD_Y + CARD_PAD_TOP   // Fix 4: use larger top padding
  ctx.fillStyle = BLUE
  ctx.font = `bold ${metricFontSz}px Arial, sans-serif`
  ctx.textAlign = 'center'
  cy += metricFontSz
  ctx.fillText(metricLines[0], SIZE / 2, cy)
  if (metricLines.length === 2) {
    cy += METRIC_LINE_GAP + metricFontSz
    ctx.fillText(metricLines[1], SIZE / 2, cy)
  }
  cy += 20   // gap below name

  // — Hero number + unit —
  const heroBaseline = cy + heroFontSz * 0.84
  const heroX = (SIZE - numW - unitW) / 2
  ctx.fillStyle = ORANGE
  ctx.textAlign = 'left'
  ctx.font = `bold ${heroFontSz}px Calibri, Arial Black, sans-serif`
  ctx.fillText(heroStr, heroX, heroBaseline)
  if (unitStr) {
    ctx.font      = `bold ${uFontSz}px Arial, sans-serif`
    ctx.fillStyle = 'rgba(247,87,9,0.82)'
    ctx.fillText(` ${unitStr}`, heroX + numW, heroBaseline - Math.round(heroFontSz * 0.10))
  }
  ctx.textAlign = 'center'
  cy += heroFontSz + 20

  // — Badge pill: Fix 1 — FIRST TIME LOGGED or NEW PERSONAL RECORD, never both —
  ctx.fillStyle = YELLOW
  drawPill(ctx, (SIZE - pillW) / 2, cy, pillW, PILL_H)
  ctx.fillStyle = BLACK
  ctx.font = 'bold 34px Arial, sans-serif'
  ctx.fillText(PILL_LABEL, SIZE / 2, cy + 34)
  cy += PILL_H + 14

  // — Previous record + improvement (returning PRs only — Fix 1) —
  if (hasPrev) {
    const prevStr   = fmtValue(previousBest, unit) || String(previousBest)
    const rawDiff   = isLowerBetter
      ? Number(previousBest) - Number(newWeight)
      : Number(newWeight) - Number(previousBest)
    const improvStr = fmtImprovement(rawDiff, unit)
    const arrow     = isLowerBetter ? '↓' : '↑'
    const sign      = rawDiff >= 0 ? '+' : '−'
    ctx.fillStyle = 'rgba(255,255,255,0.60)'
    ctx.font = '36px Arial, sans-serif'
    ctx.fillText(`Previous: ${prevStr}${unitStr ? ' ' + unitStr : ''}`, SIZE / 2, cy + 36)
    ctx.fillStyle = YELLOW
    ctx.font = 'bold 36px Arial, sans-serif'
    ctx.fillText(`${arrow} ${sign}${improvStr}${unitStr ? ' ' + unitStr : ''}`, SIZE / 2, cy + 78)
  }

  // ── Section 3: Athlete footer — draw after card content ──────────────────
  ctx.fillStyle = BLUE
  ctx.fillRect(80, footerDivY, SIZE - 160, 1)

  if (hasAthlete) {
    ctx.fillStyle = WHITE
    ctx.font = 'bold 48px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(athleteName, SIZE / 2, athleteBaseline)
    if (hasSport) {
      ctx.font = '400 36px Arial, sans-serif'
      ctx.fillText(sport, SIZE / 2, sportBaseline)
    }
  }

  ctx.fillStyle = YELLOW
  ctx.font = 'bold italic 38px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Champions are made in the Offseaz.', SIZE / 2, taglineBaseline)

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

const CONFETTI_PIECES = Array.from({ length: 150 }, (_, i) => {
  const shape  = SHAPES[i % 3]
  const def    = PIECE_DEFS[i % 5]
  const isCirc = shape === 'circle'
  const isDiam = shape === 'diamond'
  const sz     = rnd(8, 18)
  return {
    id:       i,
    color:    def.color,
    outline:  def.outline,
    clipPath: isDiam ? 'polygon(50% 0,100% 50%,50% 100%,0 50%)' : undefined,
    borderRadius: isCirc ? '50%' : 2,
    w: isCirc ? sz : isDiam ? sz      : sz * 1.7,
    h: isCirc ? sz : isDiam ? sz      : sz * 0.42,
    x:        rnd(0, 100),
    delay:    Math.pow(Math.random(), 2) * 2.5,
    dur:      rnd(1.4, 2.8),
    drift:    rnd(-130, 130),
    startRot: rnd(0, 360),
  }
})

const CONFETTI_CSS = CONFETTI_PIECES.map(p => `
  @keyframes c${p.id} {
    0%  { transform: translateY(-50px) translateX(0px) rotate(${p.startRot}deg); opacity: 1; }
    75% { opacity: 1; }
    100%{ transform: translateY(120vh) translateX(${p.drift}px) rotate(${p.startRot + 720}deg); opacity: 0; }
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
          pointerEvents: 'none', zIndex: 2,
          opacity: confettiOn ? 1 : 0, transition: 'opacity 1.1s ease',
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
              <span style={s.firstTime}>★ FIRST TIME LOGGED</span>
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
  firstTime:   { fontSize: 13, fontWeight: 700, color: YELLOW, letterSpacing: 0.5 },
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
