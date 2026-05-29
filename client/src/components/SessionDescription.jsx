import ExerciseInfoButton from './ExerciseInfoButton'
import { lookupExercise } from '../data/exerciseLibrary'

/**
 * Exercises to flag per injury area.
 * Matching is case-insensitive against the exercise name (text before the colon).
 */
const INJURY_FLAGS = {
  Shoulder: ['Overhead Press', 'Push Press', 'Behind Neck Press', 'Upright Row', 'Power Clean'],
  Knee:     ['Deep Squat', 'Bulgarian Split Squat', 'Box Jump', 'Depth Jump'],
  Back:     ['Conventional Deadlift', 'Good Mornings', 'Barbell Row'],
  Elbow:    ['Power Clean', 'Front Squat', 'Overhead Press'],
  Wrist:    ['Power Clean', 'Front Squat', 'Overhead Press'],
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

/**
 * Renders a multi-line session description with inline ⓘ buttons
 * for any exercise name found in the exercise library, and yellow
 * caution tags for exercises flagged by the athlete's injury areas.
 *
 * Description format (per line):
 *   "Exercise Name: sets x reps (@ pct) (notes)"
 *   OR plain text / blank lines
 *
 * Props:
 *   description  {string}   - newline-delimited session text
 *   injuryAreas  {string[]} - athlete's reported injury areas (e.g. ['Shoulder', 'Knee'])
 *   style        {object}   - optional style overrides for the wrapper <p>
 */
export default function SessionDescription({ description, injuryAreas = [], style }) {
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
          const rest = line.slice(colonIdx)   // includes the colon
          const hasInfo = !!lookupExercise(name)
          const isFlagged = flaggedSet.has(name.toLowerCase())

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
