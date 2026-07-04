import ExerciseInfoButton from './ExerciseInfoButton'
import { lookupExercise } from '../data/exerciseLibrary'
import { AlertIcon } from './Icons'

/**
 * Exercises to flag per injury area.
 * Matching is case-insensitive against the exercise name (text before the colon).
 */
const INJURY_FLAGS = {
  Shoulder: [
    'Bench Press', 'Incline Bench Press', 'DB Bench Press', 'Incline DB Press',
    'Close Grip Bench Press', 'Push Press', 'Overhead Press', 'Behind Neck Press',
    'Upright Row', 'Power Clean', 'Hang Clean', 'DB Shoulder Press', 'Arnold Press',
    'Lateral Raise', 'Front Raise', 'Face Pulls', 'Dips',
  ],
  Knee: [
    'Back Squat', 'Front Squat', 'Goblet Squat', 'Deep Squat',
    'Bulgarian Split Squat', 'Split Squat', 'Walking Lunge', 'Reverse Lunge', 'Lateral Lunge',
    'Step-up', 'Box Jump', 'Depth Jump', 'Jump Squat', 'Squat Jump',
    'Broad Jump', 'Tuck Jump', 'Sled Push', 'Sled Pull',
    'Leg Extension', 'Leg Press', 'Hack Squat',
  ],
  Ankle: [
    'Box Jump', 'Depth Jump', 'Broad Jump', 'Jump Squat', 'Tuck Jump', 'Squat Jump',
    'Calf Raises', 'Calf Raise', 'Single Leg Calf Raise',
    'Single Leg RDL', 'Walking Lunge', 'Reverse Lunge', 'Sled Push',
  ],
  Back: [
    'Conventional Deadlift', 'Trap Bar Deadlift', 'Hex Bar Deadlift',
    'Romanian Deadlift', 'RDL', 'Stiff Leg Deadlift',
    'Back Squat', 'Good Mornings', 'Barbell Row', 'Back Extensions',
  ],
  Hip: [
    'Hip Thrust', 'Weighted Hip Thrust',
    'Romanian Deadlift', 'RDL', 'Single Leg RDL',
    'Bulgarian Split Squat', 'Copenhagen Adductor',
    'Reverse Lunge', 'Walking Lunge', 'Lateral Lunge',
  ],
  Elbow: ['Power Clean', 'Front Squat', 'Overhead Press'],
  Wrist: ['Power Clean', 'Front Squat', 'Overhead Press'],
}

/**
 * Maps every exercise name (lowercase) that appears with a "@ XX%" percentage
 * reference in the blueprint templates to its lifting_maxes table key.
 *
 * VALID keys in lifting_maxes: bench_press | squat | deadlift |
 *   trap_bar_deadlift | power_clean | overhead_press
 */
const LIFT_KEY_MAP = {
  // Squat variations
  'back squat':             'squat',
  'squat':                  'squat',
  'front squat':            'front_squat',

  // Deadlift variations
  'trap bar deadlift':      'trap_bar_deadlift',
  'hex bar deadlift':       'trap_bar_deadlift',
  'romanian deadlift':      'romanian_deadlift',
  'rdl':                    'romanian_deadlift',
  'deadlift':               'deadlift',

  // Bench variations
  'bench press':            'bench_press',
  'close grip bench press': 'bench_press',

  // Olympic / clean variations
  'power clean from floor': 'power_clean',
  'power clean':            'power_clean',
  'hang clean':             'hang_clean',
  'clean':                  'clean',

  // Overhead
  'overhead press':         'overhead_press',

  // Lunge
  'reverse lunge':          'reverse_lunge',
}

const LIFT_LABELS = {
  bench_press:       'Bench Press',
  squat:             'Squat',
  deadlift:          'Deadlift',
  trap_bar_deadlift: 'Trap Bar Deadlift',
  overhead_press:    'Overhead Press',
  power_clean:       'Power Clean',
  hang_clean:        'Hang Clean',
  clean:             'Clean',
  front_squat:       'Front Squat',
  romanian_deadlift: 'Romanian Deadlift',
  reverse_lunge:     'Reverse Lunge',
}

const CAUTION_BADGE_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  marginLeft: 6,
  padding: '1px 7px',
  fontSize: 11,
  fontWeight: 700,
  color: '#92400e',
  background: '#fef3c7',
  border: '1px solid #fde68a',
  borderRadius: 10,
  verticalAlign: 'middle',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
}

const INJURY_BANNER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  marginBottom: 12,
  borderRadius: 10,
  background: 'rgba(199,56,32,0.10)',
  border: '1px solid rgba(199,56,32,0.35)',
  color: '#ff6b4a',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.4,
}

/**
 * ─── Real injury-area substitution (not just a cosmetic badge) ───────────────
 *
 * Mirrors applyInjuryAdjustments() and its helpers in
 * server/src/data/blueprintTemplates.js — that server-side pass bakes the same
 * substitutions directly into auto-assigned blueprints (safe there since those
 * are already one-per-athlete). A coach-built blueprint can be shared across a
 * whole team with different injury profiles, so the equivalent logic has to
 * run here, at render time, using this specific athlete's injuryAreas, instead
 * of mutating the shared stored content. Keep both in sync.
 */

function scaleAllPercentages(text, factor) {
  return text.replace(/(\d+)%/g, (_, p) => `${Math.max(1, Math.round(parseInt(p, 10) * factor))}%`)
}

function isUpperBodySession(focus, description) {
  if (/upper/i.test(focus || '')) return true
  return /^(Bench Press|DB Bench Press|Incline (DB )?Press|Close Grip Bench Press|Overhead Press|Push Press|Landmine Press|BB Split Jerk|Behind Neck Press|Arnold Press|DB Shoulder Press)\b/m.test(description)
}

function ensureShoulderWarmup(description, focus) {
  if (!isUpperBodySession(focus, description)) return description
  let text = description
  const REQUIRED = ' (required warm-up)'

  function ensure(matchRe, insertLine) {
    if (matchRe.test(text)) {
      text = text.replace(matchRe, line => (line.includes('(required warm-up)') ? line : line + REQUIRED))
      return
    }
    const lines = text.split('\n')
    let insertAt = 0
    if (/warm-?up/i.test(lines[0] || '')) {
      insertAt = 1
      while (lines[insertAt] === '') insertAt++
    }
    lines.splice(insertAt, 0, insertLine)
    text = lines.join('\n')
  }

  ensure(/^Band External Rotation:.*$/m, `Band External Rotation: 3x15 each arm${REQUIRED}`)
  ensure(/^YTW( Shoulder)? Series:.*$/m, `YTW Series: 3x10 each${REQUIRED}`)

  return text
}

function applyShoulderSubstitutions(description, focus) {
  const lines = description.split('\n').map(line => {
    if (/^Overhead Press\b/.test(line)) {
      const renamed = line.replace(/^Overhead Press/, 'Landmine Press')
      const scaled = scaleAllPercentages(renamed, 0.70)
      return scaled === renamed ? `${renamed} (70% of your usual Overhead Press load)` : scaled
    }
    if (/^Bench Press\b/.test(line)) {
      return line.replace(/^Bench Press/, 'DB Bench Press') + ' (use a controlled range of motion)'
    }
    return line
  })
  return ensureShoulderWarmup(lines.join('\n'), focus)
}

function applyKneeSubstitutions(description) {
  return description.split('\n').map(line => {
    if (/^Back Squat\b/.test(line)) {
      return scaleAllPercentages(line.replace(/^Back Squat/, 'Goblet Squat'), 0.60)
    }
    if (/\bDepth Jumps?\b/.test(line)) {
      return line.replace(/Depth Jumps?/, 'Box Step-Ups')
    }
    if (/^Bulgarian Split Squat\b/.test(line)) {
      return line.replace(/^Bulgarian Split Squat/, 'Reverse Lunge') + ' (reduced load)'
    }
    return line
  }).join('\n')
}

const SPINAL_FLEXION_RE = /^(Core — Sit-ups|Sit-ups|Ab Wheel|Good Mornings?|Weighted Sit-?ups?)\b/

function applyBackSubstitutions(description) {
  return description.split('\n')
    .filter(line => !SPINAL_FLEXION_RE.test(line))
    .map(line => {
      if (/^Trap Bar Deadlift\b/.test(line)) {
        return scaleAllPercentages(line.replace(/^Trap Bar Deadlift/, 'Romanian Deadlift'), 0.70)
      }
      if (/^Hex Bar Deadlift\b/.test(line)) {
        return scaleAllPercentages(line.replace(/^Hex Bar Deadlift/, 'Romanian Deadlift'), 0.70)
      }
      return line
    }).join('\n')
}

function applyHipSubstitutions(description) {
  return description.split('\n').map(line => {
    if (/^Bulgarian Split Squat\b/.test(line)) {
      return line.replace(/^Bulgarian Split Squat/, 'Single Leg Press')
    }
    const m = line.match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
    if (m && /\bLunge\b/i.test(m[1])) {
      const [, name, sets, reps, rest] = m
      const newSets = Math.max(1, Math.round(parseInt(sets, 10) * 0.50))
      return `${name}: ${newSets}x${reps}${rest}`
    }
    return line
  }).join('\n')
}

/**
 * Applies real exercise substitution/load-reduction for this athlete's flagged
 * injury areas. Returns the (possibly unchanged) text plus whether anything
 * actually changed, so the caller knows whether to show the injury banner.
 */
function applyInjurySubstitutions(description, injuryAreas = [], focus = '') {
  const areas = new Set((injuryAreas || []).filter(a => a && a !== 'None'))
  if (areas.size === 0) return { text: description, modified: false }

  let text = description
  if (areas.has('Shoulder')) text = applyShoulderSubstitutions(text, focus)
  if (areas.has('Knee'))     text = applyKneeSubstitutions(text)
  if (areas.has('Back'))     text = applyBackSubstitutions(text)
  if (areas.has('Hip'))      text = applyHipSubstitutions(text)

  return { text, modified: text !== description }
}

/**
 * Find the longest flagged exercise name at the start of a segment.
 * Returns the matched lowercase name or null.
 */
function findFlagAtStart(seg, flaggedSet) {
  const segLower = seg.toLowerCase()
  let best = null
  for (const name of flaggedSet) {
    if (segLower.startsWith(name)) {
      const after = seg[name.length]
      if (!after || !/[a-zA-Z]/.test(after)) {
        if (!best || name.length > best.length) best = name
      }
    }
  }
  return best
}

/**
 * Build a Set of lowercase exercise names that should be flagged
 * given the athlete's reported injury areas.
 */
function buildFlaggedSet(injuryAreas = []) {
  const flagged = new Set()
  for (const area of injuryAreas) {
    if (area === 'None') continue
    const exercises = INJURY_FLAGS[area] || []
    for (const ex of exercises) flagged.add(ex.toLowerCase())
  }
  return flagged
}

/** Round to nearest 5 lbs */
function calcWeight(maxLbs, pct) {
  return Math.round((Number(maxLbs) * pct) / 5) * 5
}

/**
 * For comma-separated format lines without a colon
 * (e.g. "Back squat 4x6 @ 65%"), try to match the start of the
 * segment against LIFT_KEY_MAP and substitute @ XX% with the
 * calculated weight or a prompt to log the max.
 */
function substitutePercentage(text, maxes) {
  const pctMatch = text.match(/@\s*(\d+)%/)
  if (!pctMatch) return text
  const pct = parseInt(pctMatch[1], 10) / 100
  const pctLabel = `${Math.round(pct * 100)}%`
  const textLower = text.toLowerCase()
  // Try longest lift-name match first so "close grip bench press" beats "bench press"
  const sortedKeys = Object.keys(LIFT_KEY_MAP).sort((a, b) => b.length - a.length)
  let liftKey = null
  for (const key of sortedKeys) {
    if (textLower.startsWith(key)) {
      liftKey = LIFT_KEY_MAP[key]
      break
    }
  }
  if (!liftKey) return text
  const maxEntry = maxes?.[liftKey]
  const maxLbs = maxEntry?.current?.weight_lbs ?? null
  if (maxLbs) {
    const lbs = calcWeight(maxLbs, pct)
    return text.replace(pctMatch[0], `${pctLabel} of your max → ${lbs} lbs`)
  }
  const label = LIFT_LABELS[liftKey] || liftKey
  return text.replace(pctMatch[0], `${pctLabel} of your max → Log your ${label} max to see your weight`)
}

/**
 * Returns the length of the exercise name at the start of a comma-separated
 * segment (letters/hyphens before the first space+digit or @ sign).
 * Returns 0 for segments starting with a digit (no extractable name).
 */
function segmentNameLength(seg) {
  if (!/^[A-Za-z]/.test(seg)) return 0
  const idx = seg.search(/\s+(?:\d|@)/)
  return idx > 0 ? idx : seg.length
}

/**
 * Renders a multi-line session description with:
 *  - Inline ⓘ buttons for exercises in the library
 *  - Real exercise substitution / load reduction for the athlete's flagged
 *    injury areas (see applyInjurySubstitutions above), with a red banner
 *    when a session was actually modified
 *  - Yellow caution tags for exercises matching the athlete's injury areas
 *  - Automatic weight calculation for "@ XX%" percentage references
 *
 * Props:
 *   description     {string}   - newline-delimited session text
 *   focus           {string}   - session focus label (e.g. "Upper Strength"); used
 *                                 to detect upper-body sessions for the shoulder
 *                                 required-warmup rule
 *   injuryAreas     {string[]} - athlete's reported injury areas (e.g. ['Shoulder', 'Knee'])
 *   injuryModified  {boolean}  - true if this session's description was already
 *                                substituted server-side (auto-assigned blueprints —
 *                                see applyInjuryAdjustments in blueprintTemplates.js).
 *                                When true, the live substitution pass below is
 *                                skipped (the text is already correct) and only the
 *                                banner is shown. When false/undefined, substitution
 *                                runs live here instead — the coach-built/shared-
 *                                blueprint case, where injury_areas can't safely be
 *                                baked into shared stored content.
 *   maxes           {object}   - { liftKey: { current: { weight_lbs } } } from /api/maxes
 *   style           {object}   - optional style overrides for the wrapper <p>
 */
export default function SessionDescription({ description, focus = '', injuryAreas = [], injuryModified = false, maxes = {}, style }) {
  if (!description) return null

  const { text: processedDescription, modified: liveModified } = injuryModified
    ? { text: description, modified: false }
    : applyInjurySubstitutions(description, injuryAreas, focus)
  const sessionModified = injuryModified || liveModified

  const flaggedSet = buildFlaggedSet(injuryAreas)
  const lines = processedDescription.split('\n')

  return (
    <>
      {sessionModified && (
        <div style={INJURY_BANNER_STYLE}>
          <AlertIcon size={15} color="#ff6b4a" strokeWidth={2} />
          Session modified for your flagged injury areas. Contact your coach before increasing load.
        </div>
      )}
      <p style={{ margin: 0, lineHeight: 1.6, ...style }}>
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':')

        let rendered
        if (colonIdx > 0) {
          const name = line.slice(0, colonIdx).trim()
          let rest = line.slice(colonIdx)   // includes the colon
          const hasInfo = !!lookupExercise(name)
          const isFlagged = flaggedSet.has(name.toLowerCase())

          // ── Percentage-based weight calculation ──────────────────────────
          const nameLower = name.toLowerCase()
          const liftKey   = LIFT_KEY_MAP[nameLower]
          const maxEntry  = liftKey ? maxes?.[liftKey] : null
          const maxLbs    = maxEntry?.current?.weight_lbs ?? null

          // Ramping sets: "40%×10, 50%×8, 60%×6, 70%×5, 75%×3"
          if (/\d+%[×x]\d+/.test(rest) && liftKey) {
            rest = rest.replace(/(\d+)%([×x])(\d+)/g, (_, pctStr, sep, repsStr) => {
              const pct = parseInt(pctStr, 10) / 100
              if (maxLbs) {
                return `${pctStr}%${sep}${repsStr} (${calcWeight(maxLbs, pct)} lbs)`
              }
              return `${pctStr}%${sep}${repsStr}`
            })
            if (!maxLbs) {
              const label = LIFT_LABELS[liftKey] || liftKey
              rest += ` — log your ${label} max to see weights`
            }
          } else if (liftKey) {
            // Single-percentage format: "@ XX%"
            const pctMatch = rest.match(/@\s*(\d+)%/)
            if (pctMatch) {
              const pct = parseInt(pctMatch[1], 10) / 100
              const pctLabel = `${Math.round(pct * 100)}%`
              if (maxLbs) {
                const lbs = calcWeight(maxLbs, pct)
                rest = rest.replace(pctMatch[0], `${pctLabel} of your max → ${lbs} lbs`)
              } else {
                const label = LIFT_LABELS[liftKey] || liftKey
                rest = rest.replace(pctMatch[0], `${pctLabel} of your max → Log your ${label} max to see your weight`)
              }
            }
          }

          rendered = (
            <span>
              <span style={{ fontWeight: 600 }}>{name}</span>
              {hasInfo && <ExerciseInfoButton exerciseName={name} />}
              {isFlagged && (
                <span style={CAUTION_BADGE_STYLE}>
                  <AlertIcon size={11} color="#92400e" strokeWidth={2} /> Use caution — flagged injury
                </span>
              )}
              {rest}
            </span>
          )
        } else {
          // No colon — comma-separated builder format (e.g. "Back squat 4x6 @ 65%, Leg press 3x10")
          const segments = line.split(/, ?/)
          const hasPercent = /@\s*\d+%/.test(line)

          rendered = (
            <span>
              {segments.map((seg, si) => {
                const trimmed = seg.trim()
                const processed = hasPercent ? substitutePercentage(trimmed, maxes) : trimmed
                const flaggedName = findFlagAtStart(trimmed, flaggedSet)
                if (flaggedName) {
                  return (
                    <span key={si}>
                      {si > 0 && ', '}
                      <span style={{ fontWeight: 600 }}>{trimmed.slice(0, flaggedName.length)}</span>
                      <span style={CAUTION_BADGE_STYLE}>
                        <AlertIcon size={11} color="#92400e" strokeWidth={2} /> Use caution — flagged injury
                      </span>
                      {processed.slice(flaggedName.length)}
                    </span>
                  )
                }
                const nameLen = segmentNameLength(trimmed)
                if (nameLen > 0) {
                  return (
                    <span key={si}>
                      {si > 0 && ', '}
                      <span style={{ fontWeight: 600 }}>{processed.slice(0, nameLen)}</span>
                      {processed.slice(nameLen)}
                    </span>
                  )
                }
                return <span key={si}>{si > 0 && ', '}{processed}</span>
              })}
            </span>
          )
        }

        return (
          <span key={i}>
            {rendered}
            {i < lines.length - 1 && <br />}
          </span>
        )
      })}
      </p>
    </>
  )
}
