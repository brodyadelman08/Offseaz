'use strict'

// ─── Shared movement-pattern classifier ─────────────────────────────────
// feat/superset-ohp-fixes — the SINGLE source of truth for "do these two
// exercise names compete for the same primary muscle/movement pattern."
// Used by BOTH blueprintTemplates.js's superset-pairing algorithm (never
// FORM a competing pair while generating) and blueprintQuality.js's
// permanent guardrail check (assert zero exist in the output) — sharing
// one module means the generator and its own check can never drift apart;
// a name added to one is automatically covered by the other.
//
// Vocabulary is the exact set of exercise names that actually appear in
// real ⟦SS⟧-paired positions across the full sport/position/day-count/goal
// matrix (verified empirically — every name below was confirmed present,
// zero "unclassified" leftovers when swept against production output).
// Categories reflect primary mover / primary pattern, not just body
// region — e.g. HORIZ_PUSH groups every chest-press variant regardless of
// implement, VERT_PUSH is shoulder-press-pattern only.

const CAT = {
  SQUAT: 'SQUAT',                 // knee-dominant / quad
  HINGE: 'HINGE',                 // hip-dominant / hamstring / posterior chain
  HORIZ_PUSH: 'HORIZ_PUSH',       // chest/triceps press pattern
  VERT_PUSH: 'VERT_PUSH',         // shoulder press pattern
  HORIZ_PULL: 'HORIZ_PULL',       // row pattern
  VERT_PULL: 'VERT_PULL',         // pull-up/lat-pulldown pattern
  SHOULDER_ACC: 'SHOULDER_ACC',   // rear/lateral delt, rotator cuff isolation
  CALF: 'CALF',
  CORE_CARRY: 'CORE_CARRY',       // core, carries, rotational/anti-rotation, banded walks
  TRAP_NECK: 'TRAP_NECK',
  POWER_PUSH: 'POWER_PUSH',       // explosive horizontal-push (med ball chest pass)
  POWER_HINGE: 'POWER_HINGE',     // explosive hip-driven (med ball slam, rotational throw)
  PLYO_SQUAT: 'PLYO_SQUAT',       // jump family — quad/knee-dominant power
  PLYO_LATERAL: 'PLYO_LATERAL',   // lateral bound/hop family — still hip/quad-dominant
  GRIP: 'GRIP',
  ARM_ACC: 'ARM_ACC',             // isolated bicep/tricep curl work — feat/rugby-rebuild
}

const NAME_TO_CAT = {
  // SQUAT / quad-dominant
  'back squat': CAT.SQUAT, 'front squat': CAT.SQUAT, 'box squat': CAT.SQUAT,
  'goblet squat': CAT.SQUAT, 'bulgarian split squat': CAT.SQUAT, 'cossack squat': CAT.SQUAT,
  'step-up': CAT.SQUAT, 'step-ups': CAT.SQUAT, 'db step-ups': CAT.SQUAT,
  'walking lunge': CAT.SQUAT, 'reverse lunge': CAT.SQUAT, 'db lateral lunge': CAT.SQUAT,
  'goblet lateral lunge': CAT.SQUAT,
  // HINGE / hamstring / posterior chain
  'trap bar deadlift': CAT.HINGE, 'hex bar deadlift': CAT.HINGE, 'barbell rdl': CAT.HINGE,
  'single leg rdl': CAT.HINGE, 'good mornings': CAT.HINGE, 'nordic hamstring curl': CAT.HINGE,
  'eccentric nordic curl': CAT.HINGE, 'hip thrust': CAT.HINGE,
  // feat/rugby-rebuild — Romanian Deadlift (a real, distinct name from
  // Barbell RDL already above — same hip-hinge pattern) and the doc's own
  // 3-member Leg Curl filler pool (posterior-chain/hamstring-dominant, same
  // family as Nordic Hamstring Curl just above).
  'romanian deadlift': CAT.HINGE, 'seated leg curl': CAT.HINGE, 'lying leg curl': CAT.HINGE,
  'stability-ball leg curl': CAT.HINGE,
  // HORIZONTAL PUSH
  'bench press': CAT.HORIZ_PUSH, 'db bench': CAT.HORIZ_PUSH, 'db bench press': CAT.HORIZ_PUSH,
  'db chest press (varied grip)': CAT.HORIZ_PUSH, 'single arm db bench': CAT.HORIZ_PUSH,
  'weighted push-ups': CAT.HORIZ_PUSH, 'weighted dips': CAT.HORIZ_PUSH,
  'push-up': CAT.HORIZ_PUSH, 'push-ups': CAT.HORIZ_PUSH,
  'incline db press': CAT.HORIZ_PUSH, 'db incline press': CAT.HORIZ_PUSH,
  // VERTICAL PUSH — includes Landmine Press (angled overhead press, the
  // shoulder-safer Overhead Press substitute this fix introduces more
  // broadly — see blueprintTemplates.js's throwing-sport OHP removal) so
  // it's never blindly superset-paired with another vertical-press line.
  'overhead press': CAT.VERT_PUSH, 'db shoulder press': CAT.VERT_PUSH, 'shoulder press': CAT.VERT_PUSH,
  'seated single arm db overhead press': CAT.VERT_PUSH, 'landmine press': CAT.VERT_PUSH,
  // feat/rugby-rebuild — Half-Kneeling Landmine Press is a real, distinct
  // name from plain Landmine Press above (same vertical-press pattern).
  'half-kneeling landmine press': CAT.VERT_PUSH,
  // HORIZONTAL PULL / ROW
  'bb row': CAT.HORIZ_PULL, 'bent over bb row': CAT.HORIZ_PULL, 'gorilla row': CAT.HORIZ_PULL,
  'db row': CAT.HORIZ_PULL, 'single arm db row': CAT.HORIZ_PULL, 'chest supported row': CAT.HORIZ_PULL,
  'split stance cable row': CAT.HORIZ_PULL, 'inverted bb row': CAT.HORIZ_PULL,
  // feat/rugby-rebuild
  'chest-supported db row': CAT.HORIZ_PULL, 'seated cable row': CAT.HORIZ_PULL, 'one-arm cable row': CAT.HORIZ_PULL,
  // VERTICAL PULL
  'lat pulldown': CAT.VERT_PULL, 'seated cable lat pulldown': CAT.VERT_PULL,
  'kneeling single arm lat pulldown': CAT.VERT_PULL, 'pull-ups': CAT.VERT_PULL, 'pull-up': CAT.VERT_PULL,
  'weighted pull-ups': CAT.VERT_PULL, 'weighted chin-ups': CAT.VERT_PULL, 'rope climb': CAT.VERT_PULL,
  // feat/rugby-rebuild — "Weighted/Assisted Pull-Up" is the doc's own
  // single combined name (one prescription covering both directions).
  'weighted/assisted pull-up': CAT.VERT_PULL, 'neutral-grip lat pulldown': CAT.VERT_PULL,
  // SHOULDER ACCESSORY (isolation — rear/lateral delt, rotator cuff)
  'lateral raise': CAT.SHOULDER_ACC, 'reverse flys': CAT.SHOULDER_ACC, 'face pulls': CAT.SHOULDER_ACC,
  'cuban press': CAT.SHOULDER_ACC,
  // feat/rugby-rebuild — singular "Face Pull" (the doc's own wording,
  // distinct string from plural "Face Pulls" above), DB Lateral Raise (same
  // lateral-delt isolation as plain Lateral Raise), Band Pull-Apart
  // (singular; scap/rear-delt, same family as Face Pull/Face Pulls), and
  // Cable Rear-Delt Fly (rear-delt isolation, same bucket).
  'face pull': CAT.SHOULDER_ACC, 'db lateral raise': CAT.SHOULDER_ACC,
  'band pull-apart': CAT.SHOULDER_ACC, 'cable rear-delt fly': CAT.SHOULDER_ACC,
  // TRAP / NECK
  'db shrugs': CAT.TRAP_NECK, 'neck strengthening': CAT.TRAP_NECK,
  // CALF
  'seated calf raise': CAT.CALF, 'single leg calf raise': CAT.CALF, 'kb tibialis raises': CAT.CALF,
  // ARM ACCESSORY (isolated bicep/tricep curl work) — feat/rugby-rebuild.
  // Not in STRICT_CATEGORIES (see below): an isolated arm curl is exactly
  // the kind of low-competing accessory the existing CORE_CARRY/GRIP
  // exemption already models — never the primary mover for anything else
  // in this file's vocabulary.
  'bicep curl': CAT.ARM_ACC, 'db hammer curl': CAT.ARM_ACC,
  // CORE / CARRY / ROTATIONAL / LATERAL-WALK — deliberately NOT strict (see
  // STRICT_CATEGORIES below): the user's own rule allows "a strength
  // movement with core/mobility."
  'anti-rotation press': CAT.CORE_CARRY, 'copenhagen plank': CAT.CORE_CARRY, 'sandbag carry': CAT.CORE_CARRY,
  'copenhagen adductor': CAT.CORE_CARRY,
  'db suitcase carries': CAT.CORE_CARRY, 'grip work': CAT.GRIP, 'landmine rotation': CAT.CORE_CARRY,
  'rotational cable pull': CAT.CORE_CARRY, 'banded monster walk': CAT.CORE_CARRY,
  'resistance band lateral walk': CAT.CORE_CARRY, 'sprawl drills': CAT.CORE_CARRY,
  'lateral sled drag': CAT.CORE_CARRY,
  // feat/rugby-rebuild — Pallof Press family (anti-rotation core, matches
  // the existing "anti-rotation press" precedent just above), Cable
  // Woodchop (rotational core, already used elsewhere in this file's own
  // coreBlock content), Dead Bug/Ab Wheel Rollout/Hollow Body Hold
  // (anti-extension core, same family as the existing Ab Wheel usage).
  'pallof press': CAT.CORE_CARRY, 'half-kneeling pallof press': CAT.CORE_CARRY, 'cable woodchop': CAT.CORE_CARRY,
  'dead bug': CAT.CORE_CARRY, 'ab wheel rollout': CAT.CORE_CARRY, 'hollow body hold': CAT.CORE_CARRY,
  // POWER / EXPLOSIVE (med ball) — the explosive version of the SAME joint
  // action as their strength-pattern counterpart, so each competes with
  // its strength sibling too (see CROSS_COMPETES below), not just itself.
  'med ball chest pass': CAT.POWER_PUSH,
  'med ball slam': CAT.POWER_HINGE, 'med ball overhead slam': CAT.POWER_HINGE, 'med ball rotational throw': CAT.POWER_HINGE,
  // PLYO — jump family (quad/knee-dominant power — literally "two
  // quad-dominant movements" if paired with another squat-pattern line)
  'box jumps': CAT.PLYO_SQUAT, 'broad jump': CAT.PLYO_SQUAT, 'broad jumps': CAT.PLYO_SQUAT,
  'depth jumps': CAT.PLYO_SQUAT, 'db squat jumps': CAT.PLYO_SQUAT, 'hex bar jumps': CAT.PLYO_SQUAT,
  'hurdle hops': CAT.PLYO_SQUAT, 'single leg box jump': CAT.PLYO_SQUAT, 'split squat jump': CAT.PLYO_SQUAT,
  'ankle hops': CAT.PLYO_SQUAT, 'approach jump': CAT.PLYO_SQUAT, 'lateral squat jump': CAT.PLYO_SQUAT,
  // PLYO — lateral bound/hop family
  'lateral bound': CAT.PLYO_LATERAL, 'lateral bounds': CAT.PLYO_LATERAL,
  'single leg lateral hurdle hop': CAT.PLYO_LATERAL,
}

// Categories where TWO members of the SAME category is a genuine violation
// (competing for the same primary muscle/pattern). CORE_CARRY/GRIP are
// excluded — the user's own stated rule allows "a strength movement with
// core/mobility," and two DIFFERENT core/carry movements together is
// exactly that kind of low-competing pairing.
//
// PLYO_SQUAT/PLYO_LATERAL/POWER_HINGE/POWER_PUSH ARE included (unlike an
// earlier draft of this classifier) — "no two quad-dominant movements" is
// the user's own explicit rule, and a jump/throw movement is exactly that.
// The one legitimate exception — the %-ramped MAIN lift paired with a
// SINGLE plyo line on a power-focus day (a deliberate contrast/complex-
// training pairing: heavy lift potentiates the jump) — never reaches this
// classifier at all: it's assembled by organizeSessionDescription's
// `keepPlyo` branch BEFORE the general candidate pool (and this pairing
// function) ever runs, so that pre-existing, intentional pairing is
// structurally untouched by this rule, not exempted by name.
const STRICT_CATEGORIES = new Set([
  CAT.SQUAT, CAT.HINGE, CAT.HORIZ_PUSH, CAT.VERT_PUSH, CAT.HORIZ_PULL,
  CAT.VERT_PULL, CAT.SHOULDER_ACC, CAT.CALF, CAT.TRAP_NECK,
  CAT.PLYO_SQUAT, CAT.PLYO_LATERAL, CAT.POWER_HINGE, CAT.POWER_PUSH,
])

// Cross-category pairs that are the SAME primary movement pattern at two
// different training intents (strength vs. its explosive/plyo sibling) —
// e.g. Back Squat (strength) + a squat-pattern jump both load the same
// knee-extension pattern, so an ACCESSORY squat-pattern move (Bulgarian
// Split Squat, Cossack Squat, ...) paired with a jump in the general
// candidate pool is still "two quad-dominant movements", exactly like
// same-category. (This does NOT touch the ramped-MAIN-lift + plyo contrast
// pairing — see the comment above; that pairing never reaches this table.)
const CROSS_COMPETES = [
  [CAT.SQUAT, CAT.PLYO_SQUAT],
  [CAT.SQUAT, CAT.PLYO_LATERAL],
  [CAT.HINGE, CAT.POWER_HINGE],
  [CAT.HORIZ_PUSH, CAT.POWER_PUSH],
]
const crossKey = (a, b) => [a, b].sort().join('|')
const CROSS_COMPETES_SET = new Set(CROSS_COMPETES.map(([a, b]) => crossKey(a, b)))

function classify(name) {
  if (!name) return null
  return NAME_TO_CAT[name.toLowerCase().trim()] || null
}

// True if the two exercise NAMES train the same primary muscle/pattern and
// should never be superset-paired together. Unclassified names (not yet in
// the vocabulary above) never compete — a conservative default that avoids
// false-blocking a pairing over a name gap, at the cost of relying on the
// vocabulary above staying current; blueprintQuality.js's own check reports
// any newly-unclassified name it encounters so gaps get caught, not just
// silently defaulted through forever.
function competes(nameA, nameB) {
  const a = classify(nameA)
  const b = classify(nameB)
  if (!a || !b) return false
  if (a === b) return STRICT_CATEGORIES.has(a)
  return CROSS_COMPETES_SET.has(crossKey(a, b))
}

module.exports = { CAT, NAME_TO_CAT, STRICT_CATEGORIES, CROSS_COMPETES, classify, competes }
