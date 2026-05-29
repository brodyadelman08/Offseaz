import ExerciseInfoButton from './ExerciseInfoButton'
import { lookupExercise } from '../data/exerciseLibrary'

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
  Knee:  ['Deep Squat', 'Bulgarian Split Squat', 'Box Jump', 'Depth Jump'],
  Back:  ['Conventional Deadlift', 'Good Mornings', 'Barbell Row'],
  Elbow: ['Power Clean', 'Front Squat', 'Overhead Press'],
  Wrist: ['Power Clean', 'Front Squat', 'Overhead Press'],
}

/**
 * Maps lowercase exercise names to a lifting_maxes lift key so percentage
 * references in descriptions can be resolved to an actual weight.
 */
const LIFT_KEY_MAP = {
  'back squat':             'squat',
  'squat':                  'squat',
  'front squat':            'squat',
  'trap bar deadlift':      'trap_bar_deadlift',
  'hex bar deadlift':       'trap_bar_deadlift',
  'bench press':            'bench_press',
  'close grip bench press': 'bench_press',
  'power clean':            'power_clean',
  'hang clean':             'power_clean',
  'overhead press':         'overhead_press',
  'romanian deadlift':      'deadlift',
  'deadlift':               'deadlift',
}

const LIFT_LABELS = {
  squat:             'Squat',
  deadlift:          'Deadlift',
  trap_bar_deadlift: 'Trap Bar Deadlift',
  bench_press:       'Bench Press',
  power_clean:       'Power Clean',
  overhead_press:    'Overhead Press',
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
  return Math.round((maxLbs * pct) / 5) * 5
}

/**
 * Renders a multi-line session description with:
 *  - Inline ⓘ buttons for exercises in the library
 *  - Yellow caution tags for exercises matching the athlete's injury areas
 *  - Automatic weight calculation for "@ XX%" percentage references
 *
 * Description format (per line):
 *   "Exercise Name: sets x reps @ XX%"
 *   "Exercise Name: sets x reps (notes)"
 *   OR plain text / blank lines
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
            const liftKey = LIFT_KEY_MAP[name.toLowerCase()]
            const maxLbs = liftKey ? maxes?.[liftKey]?.current?.weight_lbs : null
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
                  ⚠️ Use caution — flagged injury
                </span>
              )}
              {rest}
            </span>
          )
        } else {
          rendered = <span>{line}</span>
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
