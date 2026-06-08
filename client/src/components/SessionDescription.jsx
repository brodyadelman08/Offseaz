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
 * Renders a multi-line session description with:
 *  - Inline ⓘ buttons for exercises in the library
 *  - Yellow caution tags for exercises matching the athlete's injury areas
 *  - Automatic weight calculation for "@ XX%" percentage references
 *
 * Props:
 *   description  {string}   - newline-delimited session text
 *   injuryAreas  {string[]} - athlete's reported injury areas (e.g. ['Shoulder', 'Knee'])
 *   maxes        {object}   - { liftKey: { current: { weight_lbs } } } from /api/maxes
 *   style        {object}   - optional style overrides for the wrapper <p>
 */
export default function SessionDescription({ description, injuryAreas = [], maxes = {}, style }) {
  if (!description) return null

  const flaggedSet = buildFlaggedSet(injuryAreas)
  const lines = description.split('\n')

  return (
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
          const pctMatch = rest.match(/@\s*(\d+)%/)
          if (pctMatch) {
            const pct = parseInt(pctMatch[1], 10) / 100
            const nameLower = name.toLowerCase()
            const liftKey = LIFT_KEY_MAP[nameLower]
            const maxEntry = liftKey ? maxes?.[liftKey] : null
            const maxLbs = maxEntry?.current?.weight_lbs ?? null
            const pctLabel = `${Math.round(pct * 100)}%`

            if (maxLbs) {
              const lbs = calcWeight(maxLbs, pct)
              rest = rest.replace(pctMatch[0], `${pctLabel} of your max → ${lbs} lbs`)
            } else if (liftKey) {
              const label = LIFT_LABELS[liftKey] || liftKey
              rest = rest.replace(pctMatch[0], `${pctLabel} of your max → Log your ${label} max to see your weight`)
            }
          }

          rendered = (
            <span>
              <span style={{ fontWeight: hasInfo || isFlagged ? 600 : 'inherit' }}>{name}</span>
              {hasInfo && <ExerciseInfoButton exerciseName={name} />}
              {isFlagged && (
                <span style={{
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
                }}>
                  <AlertIcon size={11} color="#92400e" strokeWidth={2} /> Use caution — flagged injury
                </span>
              )}
              {rest}
            </span>
          )
        } else {
          // No colon — handle comma-separated builder format (e.g. "Back squat 4x6 @ 65%, Leg press 3x10")
          if (/@\s*\d+%/.test(line)) {
            const processed = line
              .split(/, ?/)
              .map(seg => substitutePercentage(seg.trim(), maxes))
              .join(', ')
            rendered = <span>{processed}</span>
          } else {
            rendered = <span>{line}</span>
          }
        }

        return (
          <span key={i}>
            {rendered}
            {i < lines.length - 1 && <br />}
          </span>
        )
      })}
    </p>
  )
}
