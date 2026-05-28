import ExerciseInfoButton from './ExerciseInfoButton'
import { lookupExercise } from '../data/exerciseLibrary'

/**
 * Renders a multi-line session description with inline ⓘ buttons
 * for any exercise name found in the exercise library.
 *
 * Description format (per line):
 *   "Exercise Name: sets x reps (@ pct) (notes)"
 *   OR plain text / blank lines
 */
export default function SessionDescription({ description, style }) {
  if (!description) return null

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

          rendered = (
            <span>
              <span style={{ fontWeight: hasInfo ? 600 : 'inherit' }}>{name}</span>
              {hasInfo && <ExerciseInfoButton exerciseName={name} />}
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
