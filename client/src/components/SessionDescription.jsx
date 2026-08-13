import { useState } from 'react'
import ExerciseInfoButton from './ExerciseInfoButton'
import { lookupExercise } from '../data/exerciseLibrary'
import { AlertIcon, ChevronDownIcon, ChevronUpIcon } from './Icons'
import { parseSupersetGroups, SUPERSET_MARKER_RE } from '../utils/supersets'

// Runs `transform` on a line with any leading ⟦SS<n>⟧ superset marker held
// aside first, then re-prepended — so an injury substitution/reduction still
// fires correctly on a superset-paired line instead of silently no-op'ing
// because the marker broke the regex's `^` anchor. Mirrors
// withMarkerPreserved() in server/src/data/blueprintTemplates.js exactly
// (this file had no equivalent before — a real gap, since a coach's
// manually-built-then-saved blueprint can legitimately carry markers from
// the "build from template" tool's own auto-organize pass).
function withMarkerPreserved(line, transform) {
  const m = line.match(SUPERSET_MARKER_RE)
  if (!m) return transform(line)
  return m[0] + transform(line.slice(m[0].length))
}

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
  Quadriceps: [
    'Back Squat', 'Front Squat', 'Goblet Squat', 'Box Squat', 'Deep Squat',
    'Bulgarian Split Squat', 'Split Squat', 'Walking Lunge', 'Reverse Lunge',
    'Step-up', 'Box Jump', 'Depth Jump', 'Jump Squat', 'Squat Jump', 'Broad Jump',
    'Leg Extension', 'Leg Press', 'Hack Squat',
  ],
  Hamstring: [
    'Romanian Deadlift', 'RDL', 'Single Leg RDL', 'Stiff Leg Deadlift',
    'Trap Bar Deadlift', 'Hex Bar Deadlift', 'Good Mornings',
    'Nordic Hamstring Curl', 'Hamstring Curls', 'Glute Bridge', 'Hip Thrust',
    'Broad Jump', 'Bounding',
  ],
  Ankle: [
    'Box Jump', 'Depth Jump', 'Broad Jump', 'Jump Squat', 'Tuck Jump', 'Squat Jump',
    'Calf Raises', 'Calf Raise', 'Single Leg Calf Raise', 'Tibialis Raises',
    'Single Leg RDL', 'Bulgarian Split Squat', 'Walking Lunge', 'Reverse Lunge', 'Sled Push',
  ],
  Back: [
    'Trap Bar Deadlift', 'Hex Bar Deadlift',
    'Romanian Deadlift', 'RDL', 'Stiff Leg Deadlift',
    'Back Squat', 'Good Mornings', 'Barbell Row', 'Back Extensions',
  ],
  Hip: [
    'Hip Thrust', 'Weighted Hip Thrust',
    'Romanian Deadlift', 'RDL', 'Single Leg RDL',
    'Bulgarian Split Squat', 'Copenhagen Adductor',
    'Reverse Lunge', 'Walking Lunge', 'Lateral Lunge',
  ],
  Elbow: [
    'Power Clean', 'Front Squat', 'Overhead Press', 'Bench Press', 'Close Grip Bench Press',
    'Chin-ups', 'Weighted Chin-ups', 'BB Row', 'Bent Over BB Row',
    'Bicep Curls', 'Hammer Curls', 'DB Curls', 'Cable Curls', 'Incline Curls',
    'Tricep Extensions', 'Tricep Pushdowns', 'DB Skull Crushers', 'Diamond Push-Ups', 'Cable Pushdown',
    'Suitcase Carry', 'Farmer Carries',
  ],
  Wrist: [
    'Power Clean', 'Front Squat', 'Overhead Press', 'Close Grip Bench Press',
    'Hang Clean', 'BB Split Jerk', 'Push Press', 'Push-ups', 'Push-up', 'Weighted Push-Ups',
    'Suitcase Carry', 'Farmer Carries', 'Grip Work',
    'Bicep Curls', 'Hammer Curls', 'DB Curls', 'Cable Curls', 'Incline Curls',
    'Tricep Extensions', 'Tricep Pushdowns', 'DB Skull Crushers', 'Diamond Push-Ups', 'Cable Pushdown',
  ],
}

/**
 * Maps every exercise name (lowercase) that appears with a "@ XX%" percentage
 * reference in the blueprint templates to its lifting_maxes table key.
 *
 * VALID keys in lifting_maxes: bench_press | squat |
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

  // Injury substitutes (see applyKneeSubstitutions/applyQuadricepsSubstitutions/
  // applyWristSubstitutions/applyShoulderSubstitutions) — there's no separately
  // tracked max for these movement-pattern variants anywhere in lifting_maxes,
  // so a substituted line's % resolves off the ORIGINAL lift's own tracked max
  // (the sane basis: it's the same underlying strength pattern at a lighter
  // variation, just loaded at INJURY_LOAD_FACTOR of that same number).
  'box squat':              'squat',        // Back Squat -> Box Squat (Quadriceps)
  'goblet squat':           'squat',        // Back/Front Squat -> Goblet Squat (Knee, Quadriceps)
  'cross-arm front squat':  'front_squat',  // Front Squat -> Cross-Arm Front Squat (Wrist)
  'landmine press':         'overhead_press', // Overhead Press -> Landmine Press (Shoulder)
}

const LIFT_LABELS = {
  bench_press:       'Bench Press',
  squat:             'Squat',
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

// Display-only styling for a ramp line's final/working set (FIX 1) — bold
// the converted "%×reps (lbs)" text, then a small, quieter italic tag for
// the "(work set)" label right after it. No structural change to the line.
const WORK_SET_VALUE_STYLE = { fontWeight: 700 }
const WORK_SET_TAG_STYLE = { fontWeight: 400, fontStyle: 'italic', color: 'var(--text-3)' }

// Display-only "log your max" call-to-action badge (FIX 2) — replaces a
// ramp's bare percentages when no 1RM is on file, instead of the old quiet
// trailing dash-note. Athlete-facing blue (#308EBD), matching this file's
// existing SUPERSET_LABEL_STYLE/brand convention, in the same badge shape
// as CAUTION_BADGE_STYLE above so it reads as "notice me" without being loud.
const MAX_PROMPT_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  marginLeft: 2,
  padding: '3px 10px',
  fontSize: 12,
  fontWeight: 700,
  color: '#308EBD',
  background: 'rgba(48,142,189,0.12)',
  border: '1px solid rgba(48,142,189,0.35)',
  borderRadius: 8,
  verticalAlign: 'middle',
}

// Superset bracket UI — a single continuous vertical bar spanning every line
// in the group, with an "SS" label at the top, matching the marker/parsing
// convention in client/src/utils/supersets.js (⟦SS<n>⟧, added server-side by
// superset() in server/src/data/blueprintTemplates.js). No session template
// currently emits the marker, but rendering is built so it's correct the
// moment one does.
const SUPERSET_ROW_STYLE = { display: 'flex', gap: 8, margin: '2px 0' }
const SUPERSET_GUTTER_STYLE = { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flex: '0 0 auto' }
const SUPERSET_LABEL_STYLE = { fontSize: 9, fontWeight: 800, color: '#308EBD', lineHeight: 1, letterSpacing: 0.5 }
const SUPERSET_BAR_STYLE = { flex: 1, width: 2, background: '#308EBD', marginTop: 3, borderRadius: 1, minHeight: 8 }
const SUPERSET_LINES_STYLE = { flex: 1, minWidth: 0 }

// Day-type warm-up block — collapsed by default, tap-to-expand, matching the
// same ▲/▼ chevron convention BlueprintDetail.jsx already uses for its week
// list. Warm-ups are fixed/consistent (server never rotates or waves them —
// see session.warmup in blueprintTemplates.js), so this is purely a display
// affordance for keeping a long warm-up from overwhelming the session view.
const WARMUP_WRAP_STYLE = {
  border: '1px solid var(--border)',
  borderRadius: 10,
  marginBottom: 10,
  overflow: 'hidden',
}
const WARMUP_HEADER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '8px 12px',
  background: 'var(--card-inner, rgba(127,127,127,0.06))',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-2)',
  textAlign: 'left',
}
const WARMUP_BODY_STYLE = { padding: '10px 12px', lineHeight: 1.6 }

function WarmupBlock({ warmup, flaggedSet, maxes }) {
  const [open, setOpen] = useState(false)
  if (!warmup || !warmup.lines || warmup.lines.length === 0) return null

  return (
    <div style={WARMUP_WRAP_STYLE}>
      <button style={WARMUP_HEADER_STYLE} onClick={() => setOpen(o => !o)} type="button">
        <span>{warmup.label || 'Warm-Up'}</span>
        {open
          ? <ChevronUpIcon size={14} color="var(--text-3)" />
          : <ChevronDownIcon size={14} color="var(--text-3)" />}
      </button>
      {open && (
        <div style={WARMUP_BODY_STYLE}>
          {warmup.lines.map((line, i) => (
            <div key={i}>{renderLineContent(line, flaggedSet, maxes)}</div>
          ))}
        </div>
      )}
    </div>
  )
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

// ─── Flat 50% load-reduction rule ──────────────────────────────────────────
// Mirrors blueprintTemplates.js exactly — one consistent factor for every
// substituted lift and every load reduction across the whole system.
// Shoulder/Back previously used 0.70 and Knee used 0.60; all three are now
// 0.50 too.
const INJURY_LOAD_FACTOR = 0.50

// Reduces the SET count (not reps) on any accessory-shaped "Name: NxR..."
// line whose name matches nameRe, by INJURY_LOAD_FACTOR. Mirrors
// reduceInjuryVolume() in blueprintTemplates.js exactly, including handling
// a line with multiple "NxR" segments by scaling every segment.
function reduceInjuryVolume(line, nameRe) {
  const colonIdx = line.indexOf(':')
  if (colonIdx <= 0) return line
  const name = line.slice(0, colonIdx)
  if (!nameRe.test(name)) return line
  const rest = line.slice(colonIdx)
  return name + rest.replace(/(\d+)x(\d+[a-zA-Z]*|AMAP)/g, (_, sets, reps) => {
    const newSets = Math.max(1, Math.round(parseInt(sets, 10) * INJURY_LOAD_FACTOR))
    return `${newSets}x${reps}`
  })
}

// Shared "biceps AND triceps accessory work" reduction target for both
// Elbow and Wrist. Mirrors blueprintTemplates.js exactly.
const ARM_ACCESSORY_RE = /^(Bicep Curls?|Hammer Curls?|DB Curls?|Cable Curls?|Incline Curls?|Tricep (Pushdowns?|Extensions?)|Cable Pushdown|DB Skull Crushers?|Diamond Push-?Ups?|Forearm Curls?(?: \(Both Ways\))?|Wrist Curls?|Reverse Wrist Curls?)\b/i

function applyShoulderSubstitutions(description, focus) {
  const lines = description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (/^Overhead Press\b/.test(stripped)) {
      const renamed = stripped.replace(/^Overhead Press/, 'Landmine Press')
      const scaled = scaleAllPercentages(renamed, INJURY_LOAD_FACTOR)
      return scaled === renamed ? `${renamed} (50% of your usual Overhead Press load)` : scaled
    }
    if (/^Bench Press\b/.test(stripped)) {
      return stripped.replace(/^Bench Press/, 'DB Bench Press') + ' (use a controlled range of motion)'
    }
    return stripped
  }))
  return ensureShoulderWarmup(lines.join('\n'), focus)
}

function applyKneeSubstitutions(description) {
  return description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (/^Back Squat\b/.test(stripped)) {
      return scaleAllPercentages(stripped.replace(/^Back Squat/, 'Goblet Squat'), INJURY_LOAD_FACTOR)
    }
    // Front Squat carries the same knee-loading concern as Back Squat — kept
    // in sync with applyKneeAdjustments in blueprintTemplates.js.
    if (/^Front Squat\b/.test(stripped)) {
      return scaleAllPercentages(stripped.replace(/^Front Squat/, 'Goblet Squat'), INJURY_LOAD_FACTOR)
    }
    if (/\bDepth Jumps?\b/.test(stripped)) {
      return stripped.replace(/Depth Jumps?/, 'Box Step-Ups')
    }
    // Trap Bar Jump is a loaded jump — same landing-impact concern as Depth
    // Jumps. Kept in sync with applyKneeAdjustments in blueprintTemplates.js.
    if (/^Trap Bar Jump\b/.test(stripped)) {
      return stripped.replace(/^Trap Bar Jump/, 'Trap Bar Deadlift')
    }
    if (/^Bulgarian Split Squat\b/.test(stripped)) {
      return stripped.replace(/^Bulgarian Split Squat/, 'Reverse Lunge') + ' (50% load)'
    }
    return stripped
  })).join('\n')
}

const SPINAL_FLEXION_RE = /^(Core — Sit-ups|Sit-ups|Ab Wheel|Good Mornings?|Weighted Sit-?ups?)\b/

function applyBackSubstitutions(description) {
  return description.split('\n')
    .filter(line => !SPINAL_FLEXION_RE.test(line.replace(SUPERSET_MARKER_RE, '')))
    .map(line => withMarkerPreserved(line, stripped => {
      if (/^Trap Bar Deadlift\b/.test(stripped)) {
        return scaleAllPercentages(stripped.replace(/^Trap Bar Deadlift/, 'Romanian Deadlift'), INJURY_LOAD_FACTOR)
      }
      if (/^Hex Bar Deadlift\b/.test(stripped)) {
        return scaleAllPercentages(stripped.replace(/^Hex Bar Deadlift/, 'Romanian Deadlift'), INJURY_LOAD_FACTOR)
      }
      return stripped
    })).join('\n')
}

function applyHipSubstitutions(description) {
  return description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (/^Bulgarian Split Squat\b/.test(stripped)) {
      return stripped.replace(/^Bulgarian Split Squat/, 'Single Leg Press')
    }
    // Kept in sync with applyHipAdjustments in blueprintTemplates.js —
    // Hamstring Curls is a hip-injury-only swap for Single Leg RDL, unrelated
    // to and independent of the new dedicated Hamstring area below.
    if (/^Single Leg RDL\b/.test(stripped)) {
      return stripped.replace(/^Single Leg RDL/, 'Hamstring Curls')
    }
    return reduceInjuryVolume(stripped, /\bLunge\b/i)
  })).join('\n')
}

// ─── Quadriceps (strain) ────────────────────────────────────────────────────
const QUAD_REMOVE_RE = /^Depth Jumps?\b/
const QUAD_VOLUME_RE = /^(Sprint(?: Work| Tempo Protocol| Ladder)?|Sled (?:Push|Sprint|Drag)|Broad Jumps?|(?:DB |Split |Single Leg )?Squat Jumps?|Approach Jumps?|Bounding|Hex Bar Jumps?|Lateral (?:Bounds?|Squat Jump)|Flying 20s|300 Yard Shuttle|V Drill|Star Drill|Resistance Band Sprint)\b/i

function applyQuadricepsSubstitutions(description) {
  return description.split('\n')
    .filter(line => !QUAD_REMOVE_RE.test(line.replace(SUPERSET_MARKER_RE, '')))
    .map(line => withMarkerPreserved(line, stripped => {
      if (/^Back Squat\b/.test(stripped)) {
        return scaleAllPercentages(stripped.replace(/^Back Squat/, 'Box Squat'), INJURY_LOAD_FACTOR)
      }
      if (/^Front Squat\b/.test(stripped)) {
        return scaleAllPercentages(stripped.replace(/^Front Squat/, 'Goblet Squat'), INJURY_LOAD_FACTOR)
      }
      if (/\bBox Jumps?\b/.test(stripped)) {
        return stripped.replace(/Box Jumps?/, 'Step-Ups')
      }
      if (/^Bulgarian Split Squat\b/.test(stripped)) {
        return stripped.replace(/^Bulgarian Split Squat/, 'Reverse Lunge') + ' (50% load)'
      }
      return reduceInjuryVolume(stripped, QUAD_VOLUME_RE)
    })).join('\n')
}

// ─── Hamstring (strain) — its own dedicated area, independent of Hip's
// Hamstring Curls swap above. ────────────────────────────────────────────
const HAMSTRING_REMOVE_RE = /^Good Mornings?\b/
const HAMSTRING_RDL_RE = /^(?:Barbell )?(?:Single Leg )?RDL\b/
const HAMSTRING_VOLUME_RE = /^(Sprint(?: Work| Tempo Protocol| Ladder)?|Sled Sprint|Broad Jumps?|Bounding|Lateral Bounds?|Flying 20s|300 Yard Shuttle|Resistance Band Sprint)\b/i

function applyHamstringSubstitutions(description) {
  return description.split('\n')
    .filter(line => !HAMSTRING_REMOVE_RE.test(line.replace(SUPERSET_MARKER_RE, '')))
    .map(line => withMarkerPreserved(line, stripped => {
      if (HAMSTRING_RDL_RE.test(stripped)) {
        return stripped.replace(HAMSTRING_RDL_RE, 'Hip Thrust') + ' (50% load)'
      }
      if (/^Romanian Deadlift\b/.test(stripped)) {
        const renamed = stripped.replace(/^Romanian Deadlift/, 'Glute Bridge')
        const scaled = scaleAllPercentages(renamed, INJURY_LOAD_FACTOR)
        return scaled === renamed ? `${renamed} (light)` : scaled
      }
      return reduceInjuryVolume(stripped, HAMSTRING_VOLUME_RE)
    })).join('\n')
}

// ─── Ankle ──────────────────────────────────────────────────────────────────
const ANKLE_REMOVE_RE = /^Depth Jumps?\b/
const ANKLE_SLRDL_RE = /^(?:Barbell )?Single Leg RDL\b/
const ANKLE_CALF_RE = /^(?:Calf Raises?|Seated Calf Raise|Single Leg Calf Raise|Tibialis Raises)\b/i
const ANKLE_COD_RE = /^(Sprint(?: Work| Tempo Protocol| Ladder)?|Sled Sprint|Flying 20s|300 Yard Shuttle|V Drill|Star Drill|Lateral Shuffle|Defensive Slide(?: Sprint)?|Pro Agility Drill|T-Drill|Deceleration Drill|17s Drill|Resistance Band Sprint)\b/i

function applyAnkleSubstitutions(description) {
  return description.split('\n')
    .filter(line => !ANKLE_REMOVE_RE.test(line.replace(SUPERSET_MARKER_RE, '')))
    .map(line => withMarkerPreserved(line, stripped => {
      if (/\bBox Jumps?\b/.test(stripped)) {
        return stripped.replace(/Box Jumps?/, 'Step-Ups')
      }
      if (ANKLE_SLRDL_RE.test(stripped)) {
        return stripped.replace(ANKLE_SLRDL_RE, 'Romanian Deadlift')
      }
      if (/^Bulgarian Split Squat\b/.test(stripped)) {
        return stripped.replace(/^Bulgarian Split Squat/, 'Leg Press') + ' (50% load)'
      }
      let out = reduceInjuryVolume(stripped, ANKLE_CALF_RE)
      out = reduceInjuryVolume(out, ANKLE_COD_RE)
      return out
    })).join('\n')
}

// ─── Elbow ──────────────────────────────────────────────────────────────────
const ELBOW_HEAVY_PRESS_RE = /^(Bench Press|Close Grip Bench(?: Press)?|Overhead Press)\b/
const ELBOW_ROW_RE = /^(?:Bent Over )?BB Row\b/
const ELBOW_GRIP_RE = /^(?:(?:DB )?Suitcase Carr(?:y|ies)|Farmer Carr(?:y|ies)|Sandbag Carry)\b/

function applyElbowSubstitutions(description) {
  return description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (ELBOW_HEAVY_PRESS_RE.test(stripped)) {
      const scaled = scaleAllPercentages(stripped, INJURY_LOAD_FACTOR)
      // Same fallback as Shoulder's Overhead Press swap: a plain "Name: NxR"
      // line (no % ramp) has nothing for scaleAllPercentages to touch.
      return scaled === stripped ? `${stripped} (50% load)` : scaled
    }
    if (/^(?:Weighted )?Chin-ups\b/.test(stripped)) {
      return stripped.replace(/^(?:Weighted )?Chin-ups/, 'Neutral-Grip Pull-Ups')
    }
    if (ELBOW_GRIP_RE.test(stripped)) {
      return stripped + ' (use straps)'
    }
    let out = reduceInjuryVolume(stripped, ELBOW_ROW_RE)
    out = reduceInjuryVolume(out, ARM_ACCESSORY_RE)
    return out
  })).join('\n')
}

// ─── Wrist ──────────────────────────────────────────────────────────────────
const WRIST_CATCH_OLY_RE = /^(Power Clean(?: from floor)?|Hang (?:Power )?Clean(?: Above the Knee)?|(?:BB |Single Arm DB )?Split Jerk|Push Press)\b/
const WRIST_GRIP_RE = /^(?:(?:DB )?Suitcase Carr(?:y|ies)|Farmer Carr(?:y|ies)|Sandbag Carry|Grip Work)\b/

function applyWristSubstitutions(description) {
  return description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (/^Front Squat\b/.test(stripped)) {
      return scaleAllPercentages(stripped.replace(/^Front Squat/, 'Cross-Arm Front Squat'), INJURY_LOAD_FACTOR)
    }
    if (/^(?:Weighted )?Push-?Ups?\b/i.test(stripped)) {
      return reduceInjuryVolume(stripped, /^(?:Weighted )?Push-?Ups?/i)
    }
    if (WRIST_CATCH_OLY_RE.test(stripped)) {
      return stripped.replace(WRIST_CATCH_OLY_RE, 'Clean Pull')
    }
    if (WRIST_GRIP_RE.test(stripped)) {
      return reduceInjuryVolume(stripped, WRIST_GRIP_RE)
    }
    return reduceInjuryVolume(stripped, ARM_ACCESSORY_RE)
  })).join('\n')
}

/**
 * Applies real exercise substitution/load-reduction for this athlete's flagged
 * injury areas. Returns the (possibly unchanged) text plus whether anything
 * actually changed, so the caller knows whether to show the injury banner.
 * Mirrors applyInjuryAdjustments() in blueprintTemplates.js exactly — see
 * that function's comment for why 'Other'/'None' never reach here.
 */
function applyInjurySubstitutions(description, injuryAreas = [], focus = '') {
  const areas = new Set((injuryAreas || []).filter(a => a && a !== 'None'))
  if (areas.size === 0) return { text: description, modified: false }

  let text = description
  if (areas.has('Shoulder'))   text = applyShoulderSubstitutions(text, focus)
  if (areas.has('Knee'))       text = applyKneeSubstitutions(text)
  if (areas.has('Back'))       text = applyBackSubstitutions(text)
  if (areas.has('Hip'))        text = applyHipSubstitutions(text)
  if (areas.has('Quadriceps')) text = applyQuadricepsSubstitutions(text)
  if (areas.has('Hamstring'))  text = applyHamstringSubstitutions(text)
  if (areas.has('Ankle'))      text = applyAnkleSubstitutions(text)
  if (areas.has('Elbow'))      text = applyElbowSubstitutions(text)
  if (areas.has('Wrist'))      text = applyWristSubstitutions(text)

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
  // Keys off the estimated true 1RM (weight as-is for a logged 1RM,
  // converted via a standard rep-max multiplier otherwise — see
  // estimateOneRepMax in server/src/services/maxesService.js), not the raw
  // weight_lbs the athlete typed in.
  const maxLbs = maxEntry?.current?.estimated_1rm ?? null
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
 * Renders the content of a single exercise/prescription line (no wrapping
 * key or line-break) — the same colon vs. comma-separated logic used for
 * every line, factored out so both a standalone line and a line inside a
 * superset group render identically.
 */
function renderLineContent(line, flaggedSet, maxes) {
  const colonIdx = line.indexOf(':')

  if (colonIdx > 0) {
    const name = line.slice(0, colonIdx).trim()
    let rest = line.slice(colonIdx)   // includes the colon
    const hasInfo = !!lookupExercise(name)
    const isFlagged = flaggedSet.has(name.toLowerCase())

    // ── Percentage-based weight calculation ──────────────────────────
    const nameLower = name.toLowerCase()
    const liftKey   = LIFT_KEY_MAP[nameLower]
    const maxEntry  = liftKey ? maxes?.[liftKey] : null
    // Keys off the estimated true 1RM, not the raw weight_lbs the athlete
    // typed in — see the matching comment on substitutePercentage above.
    const maxLbs    = maxEntry?.current?.estimated_1rm ?? null

    // What actually renders after the name — `rest` (a plain string) in
    // every pre-existing case; only the ramp-with-a-logged-max case (FIX 1)
    // needs to become an array of strings/elements, to bold+label just the
    // final set without touching how every earlier warm-up set renders.
    let restNode = rest

    // Ramping sets: "40%×10, 50%×8, 60%×6, 70%×5, 75%×3"
    const rampMatches = [...rest.matchAll(/(\d+)%([×x])(\d+)/g)]
    if (rampMatches.length > 0 && liftKey) {
      if (maxLbs) {
        // FIX 1 — the LAST set in the ramp is the working set. Every earlier
        // set converts to "%×reps (lbs)" exactly as before; only this last
        // one also gets bolded + an appended "(work set)" tag.
        const lastMatch = rampMatches[rampMatches.length - 1]
        const pieces = []
        let cursor = 0
        rampMatches.forEach((m, i) => {
          const [full, pctStr, sep, repsStr] = m
          const pct = parseInt(pctStr, 10) / 100
          const converted = `${pctStr}%${sep}${repsStr} (${calcWeight(maxLbs, pct)} lbs)`
          pieces.push(rest.slice(cursor, m.index))
          pieces.push(
            m === lastMatch
              ? (
                <span key={`set-${i}`}>
                  <span style={WORK_SET_VALUE_STYLE}>{converted}</span>
                  <span style={WORK_SET_TAG_STYLE}> (work set)</span>
                </span>
              )
              : converted
          )
          cursor = m.index + full.length
        })
        pieces.push(rest.slice(cursor))
        restNode = pieces
      } else {
        // FIX 2 — no logged max: replace the whole ramp with one clear,
        // visually distinct call-to-action instead of a wall of bare,
        // unconverted percentages (the old behavior — a quiet trailing
        // dash-note appended after the raw ramp — is gone).
        const label = LIFT_LABELS[liftKey] || liftKey
        restNode = (
          <>
            {': '}
            <span style={MAX_PROMPT_STYLE}>Log your {label} max to unlock your weights</span>
          </>
        )
      }
    } else if (liftKey) {
      // Single-percentage format: "@ XX%" — unchanged.
      const pctMatch = rest.match(/@\s*(\d+)%/)
      if (pctMatch) {
        const pct = parseInt(pctMatch[1], 10) / 100
        const pctLabel = `${Math.round(pct * 100)}%`
        if (maxLbs) {
          const lbs = calcWeight(maxLbs, pct)
          restNode = rest.replace(pctMatch[0], `${pctLabel} of your max → ${lbs} lbs`)
        } else {
          const label = LIFT_LABELS[liftKey] || liftKey
          restNode = rest.replace(pctMatch[0], `${pctLabel} of your max → Log your ${label} max to see your weight`)
        }
      }
    }

    return (
      <span>
        <span style={{ fontWeight: 600 }}>{name}</span>
        {hasInfo && <ExerciseInfoButton exerciseName={name} />}
        {isFlagged && (
          <span style={CAUTION_BADGE_STYLE}>
            <AlertIcon size={11} color="#92400e" strokeWidth={2} /> Use caution — flagged injury
          </span>
        )}
        {restNode}
      </span>
    )
  }

  // No colon — comma-separated builder format (e.g. "Back squat 4x6 @ 65%, Leg press 3x10")
  const segments = line.split(/, ?/)
  const hasPercent = /@\s*\d+%/.test(line)

  return (
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

/**
 * Renders a multi-line session description with:
 *  - Inline ⓘ buttons for exercises in the library
 *  - Real exercise substitution / load reduction for the athlete's flagged
 *    injury areas (see applyInjurySubstitutions above), with a red banner
 *    when a session was actually modified
 *  - Yellow caution tags for exercises matching the athlete's injury areas
 *  - Automatic weight calculation for "@ XX%" percentage references
 *  - Superset groups (consecutive lines marked with a shared ⟦SS<n>⟧ marker —
 *    see client/src/utils/supersets.js) rendered as one continuous bracket
 *    spanning the group. No template currently emits the marker; this is
 *    rendering-capability only.
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
 *   maxes           {object}   - { liftKey: { current: { weight_lbs, estimated_1rm, is_estimated } } }
 *                                 from /api/maxes — percentage math keys off estimated_1rm,
 *                                 not the raw weight_lbs the athlete logged (see maxesService.js)
 *   warmup          {object}   - optional { label, lines } day-type warm-up block
 *                                 (see session.warmup in blueprintTemplates.js).
 *                                 Rendered as a collapsed, tap-to-expand block above
 *                                 the main content — never rotated/waved, so it's
 *                                 passed straight through with no substitution pass.
 *   style           {object}   - optional style overrides for the wrapper element
 */
export default function SessionDescription({ description, focus = '', injuryAreas = [], injuryModified = false, maxes = {}, warmup = null, style }) {
  if (!description && !warmup) return null

  const { text: processedDescription, modified: liveModified } = injuryModified
    ? { text: description, modified: false }
    : applyInjurySubstitutions(description || '', injuryAreas, focus)
  const sessionModified = injuryModified || liveModified

  const flaggedSet = buildFlaggedSet(injuryAreas)
  const lines = processedDescription.split('\n')
  const chunks = parseSupersetGroups(lines)

  return (
    <>
      <WarmupBlock warmup={warmup} flaggedSet={flaggedSet} maxes={maxes} />
      {sessionModified && (
        <div style={INJURY_BANNER_STYLE}>
          <AlertIcon size={15} color="#ff6b4a" strokeWidth={2} />
          Session modified for your flagged injury areas. Contact your coach before increasing load.
        </div>
      )}
      {!description ? null : (
        // A <div> wrapper (not <p>) so a superset group's block-level bracket
        // row can sit alongside plain lines without invalid <div>-inside-<p>
        // nesting; each plain line becomes its own block instead of relying
        // on inline <br /> the way a single <p> did before.
        <div style={{ margin: 0, lineHeight: 1.6, ...style }}>
          {chunks.map((chunk, i) => {
            if (chunk.type === 'superset') {
              return (
                <div key={i} style={SUPERSET_ROW_STYLE}>
                  <div style={SUPERSET_GUTTER_STYLE}>
                    <span style={SUPERSET_LABEL_STYLE}>SS</span>
                    <div style={SUPERSET_BAR_STYLE} />
                  </div>
                  <div style={SUPERSET_LINES_STYLE}>
                    {chunk.lines.map((line, li) => (
                      <div key={li}>{renderLineContent(line, flaggedSet, maxes)}</div>
                    ))}
                  </div>
                </div>
              )
            }
            return <div key={i}>{renderLineContent(chunk.text, flaggedSet, maxes)}</div>
          })}
        </div>
      )}
    </>
  )
}
