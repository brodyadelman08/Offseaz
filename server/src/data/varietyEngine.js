// ─── Variety Engine (feat/variety-engine, Stage 2) ─────────────────────────
// Stage 1 (dayLayoutEngine.js, feat/day-layout-engine) authored the tagged,
// role-flagged slot STRUCTURE — every slot knows its purpose tag and
// whether it's an anchor (measurable, never rotates) or filler (varies).
// This file is the RESOLVER half of Stage 2: it decides, for a given
// filler slot on a given week, WHICH exercise from a phase-appropriate
// pool actually renders. It never touches day structure or archetype
// templates — dayLayoutEngine.js's 20 templates are untouched by this PR.
//
// Scope of this PR: only ACC_* accessory tags are pool-resolved (ACC_SQUAT,
// ACC_HINGE, ACC_UNILATERAL_LOWER, ACC_POSTERIOR, ACC_PULL_H, ACC_PULL_V,
// ACC_PRESS, ACC_SHOULDER, ACC_CALF_GRIP). PLYO/SPEED/MED_BALL keep Stage
// 1's existing volume-only phase variance (dayLayoutEngine.js's own header
// comment defers their movement-name variety to "Stage 2" — this PR
// deliberately does not claim that piece; it's real, scoped-out future
// work, not an oversight). ACC_CORE gets a real pool too (pattern-keyed,
// per dayLayoutEngine.js's own `pattern` sub-property vocabulary) but stays
// wired to `() => null` in every archetype renderer exactly as Stage 1 left
// it — every renderer already defers core content to the finisher engine's
// own coreBlock()-backed 'core' family specifically to avoid rendering the
// same core content twice on one day, and this PR does not re-litigate that
// dedup guard. The pool exists (structure + the new Side Plank Sprinter
// Pose entry) so a future increment can wire it in once it's done the
// per-archetype distinct-content audit that guard requires.

// ─── Equipment tiers ────────────────────────────────────────────────────
// The pool structure carries this dimension now so the 3 tiers plug in
// cleanly later. Only STANDARD (full gym) is populated this PR — PARTIAL
// and MINIMAL (bands/bodyweight) are present as empty arrays on every
// bucket and fall back to STANDARD content until a future equipment-tier
// build fills them in.
const EQUIPMENT_TIERS = { STANDARD: 'standard', PARTIAL: 'partial', MINIMAL: 'minimal' }

const POOLED_TAGS = new Set([
  'ACC_SQUAT', 'ACC_HINGE', 'ACC_UNILATERAL_LOWER', 'ACC_POSTERIOR',
  'ACC_PULL_H', 'ACC_PULL_V', 'ACC_PRESS', 'ACC_SHOULDER', 'ACC_CALF_GRIP',
])

// tier() is a shorthand for the {standard, partial, minimal} shape every
// pool bucket carries — partial/minimal start empty (fallback-to-standard,
// per getPool() below) until a future equipment-tier build populates them.
function tier(standardList) {
  return { standard: standardList, partial: [], minimal: [] }
}

// ─── Purpose Tag -> Phase -> Archetype/Sport modifier -> Equipment Tier ───
// Every tag's phase-1 bucket is intentionally left for callers to prepend
// the pack's own Stage-1 static choice ahead of (see resolveFiller's
// `packChoiceText` handling below) — week 1 of the whole 16-week plan
// therefore renders byte-identical to Stage 1's existing output for every
// sport, and only weeks 2-3 of phase 1 (plus all of phases 2-4) introduce
// real week-to-week/phase-to-phase variety. Phases 2-4 are fully generic,
// phase-flavored pools in their own right (Development/Strength/Peak),
// which is what makes the SAME day at week 1 vs 5 vs 9 vs 13 show real
// phase-to-phase transformation even though each of those weeks is itself
// a phase's own "position 0" (no mid-phase rotation has happened yet).
//
// Vocabulary note: every name below already exists verbatim as an
// exerciseLibrary.js key or a pre-existing blueprintTemplates.test.js
// KNOWN_MISSING allowance (verified against both files while building this
// pool set) — deliberately reusing already-vetted names rather than
// growing the library-coverage gap. The exception is the 3 new exercises
// this PR adds (Eccentric Nordic Curl, Side Plank Sprinter Pose, KB
// Tibialis Raises), each added to exerciseLibrary.js with cues.
const VARIETY_POOLS = {
  ACC_SQUAT: {
    1: { default: tier(['Goblet Squat: 4x12', 'Cossack Squat: 4x10 each side', 'Leg Press: 4x12']) },
    2: { default: tier(['Bulgarian Split Squat: 4x8 each leg', 'Front Squat: 4x8', 'Cossack Squat: 4x8 each side']) },
    3: { default: tier(['Box Squat: 4x6', 'Front Squat: 4x6', 'Bulgarian Split Squat: 4x6 each leg']) },
    4: { default: tier(['Goblet Squat: 4x8', 'Leg Press: 4x10']) },
  },
  ACC_HINGE: {
    1: { default: tier(['Single Leg RDL: 4x10 each leg', 'Hip Thrust: 4x12', 'Glute Bridge: 4x15']) },
    2: {
      default: tier(['Single Leg RDL: 4x8 each leg', 'Barbell RDL: 4x8', 'Hip Thrust: 4x10']),
      endurance: tier(['Single Leg RDL: 4x10 each leg', 'Hip Thrust: 4x12']),
    },
    3: {
      default: tier(['Barbell RDL: 4x6', 'Good Mornings: 4x6', 'Single Leg RDL: 4x6 each leg']),
      endurance: tier(['Single Leg RDL: 4x8 each leg', 'Barbell RDL: 4x8']),
    },
    4: {
      default: tier(['Single Leg RDL: 4x8 each leg', 'Hip Thrust: 4x10']),
      endurance: tier(['Single Leg RDL: 4x8 each leg', 'Hip Thrust: 4x10']),
    },
  },
  ACC_UNILATERAL_LOWER: {
    1: { default: tier(['Walking Lunge: 4x10 each leg', 'Reverse Lunge: 4x10 each leg', 'Cossack Squat: 4x10 each side']) },
    2: { default: tier(['Bulgarian Split Squat: 4x8 each leg', 'Reverse Lunge: 4x10 each leg', 'Walking Lunge: 4x10 each leg']) },
    3: { default: tier(['Bulgarian Split Squat: 4x6 each leg', 'Cossack Squat: 4x6 each side']) },
    4: { default: tier(['Walking Lunge: 4x8 each leg', 'Reverse Lunge: 4x8 each leg']) },
  },
  // Eccentric Nordic Curl lives in Development (phase 2) and Strength
  // (phase 3) — the two phases the spec calls out — never phase 1
  // (too technical/eccentric-loaded for a Foundation-phase filler pick)
  // or phase 4 (peak/taper never introduces new loaded eccentric work).
  // "Hamstring Curls" (plural) is deliberately never used here — it's
  // reserved exclusively for the hip-injury Single Leg RDL substitution
  // (applyHipAdjustments) and must never appear in default, no-injury
  // content (a pre-existing, baseball-enforced rule predating this PR —
  // see the "Hamstring Curls — hip-injury substitution only" test area).
  // "Nordic Hamstring Curl" (singular) is a distinct name and unaffected.
  ACC_POSTERIOR: {
    1: { default: tier(['Nordic Hamstring Curl: 4x6', 'Good Mornings: 4x10']) },
    2: {
      default: tier(['Eccentric Nordic Curl: 4x5 (start at top, 5-sec lower, self-assist up)', 'Good Mornings: 4x8']),
      endurance: tier(['Eccentric Nordic Curl: 4x5 (start at top, 5-sec lower, self-assist up)', 'Good Mornings: 4x8']),
    },
    3: {
      default: tier(['Eccentric Nordic Curl: 4x5 (start at top, 5-sec lower, self-assist up)', 'Nordic Hamstring Curl: 4x6']),
      endurance: tier(['Eccentric Nordic Curl: 4x5 (start at top, 5-sec lower, self-assist up)', 'Nordic Hamstring Curl: 4x6']),
    },
    4: { default: tier(['Nordic Hamstring Curl: 4x6', 'Good Mornings: 4x8']) },
  },
  ACC_PULL_H: {
    1: { default: tier(['Chest Supported Row: 4x12', 'Single Arm DB Row: 4x10 each arm']) },
    2: {
      default: tier(['Chest Supported Row: 4x10', 'DB Row: 4x10 each arm']),
      endurance: tier(['Chest Supported Row: 4x12', 'Single Arm DB Row: 4x10 each arm']),
    },
    3: {
      default: tier(['DB Row: 4x6 each arm', 'Chest Supported Row: 4x8']),
      endurance: tier(['Chest Supported Row: 4x10', 'DB Row: 4x10 each arm']),
    },
    4: {
      default: tier(['Chest Supported Row: 4x8', 'Single Arm DB Row: 4x10 each arm']),
      endurance: tier(['Chest Supported Row: 4x10', 'DB Row: 4x10 each arm']),
    },
  },
  ACC_PULL_V: {
    1: { default: tier(['Lat Pulldown: 4x12', 'Seated Cable Lat Pulldown: 4x12']) },
    2: { default: tier(['Pull-Ups: 4x6', 'Kneeling Single Arm Lat Pulldown: 4x10 each arm']) },
    3: { default: tier(['Weighted Pull-Ups: 4x5', 'Lat Pulldown: 4x8']) },
    4: { default: tier(['Lat Pulldown: 4x10', 'Pull-Ups: 4x6']) },
  },
  // "Close Grip Bench Press" and "Landmine Rotational Press" are
  // deliberately absent here — both are extremely common MAIN_PRESS_H/
  // finisher-anchor choices across Collision-archetype sports (Linemen,
  // Hockey Forwards, Wrestling, Rugby), so a pool pick landing on either
  // risks duplicating that day's own main lift or finisher line verbatim
  // (confirmed empirically: both produced real same-day duplicates during
  // development, on days where the sport's own MAIN_PRESS_H or finisher
  // bank already used the same name). Every name below is a genuine
  // accessory-tier press variant, never a MAIN_ choice anywhere in this
  // file, so it's safe regardless of which sport/day it lands on.
  ACC_PRESS: {
    // Weighted Push-Ups — a lower-frequency 3rd horizontal-push option,
    // folded in from the retired ACCESSORY_ROTATION/SOCCER_/FOOTBALL_
    // PHASE_ACCESSORY_ROTATION "phase1WithWeightedPushUpOption" special
    // case (see blueprintTemplates.js's own retirement comment). Landing
    // in Foundation's generic slot (not the pack's own prepended choice)
    // preserves the original "real but low-frequency" character without a
    // dedicated per-week special case.
    1: { default: tier(['Weighted Push-Ups: 4x10', 'Weighted Dips: 4x10']) },
    2: { default: tier(['DB Bench Press: 4x8', 'Weighted Dips: 4x8']) },
    3: { default: tier(['Weighted Dips: 4x6', 'DB Bench Press: 4x6']) },
    4: { default: tier(['DB Bench Press: 4x8', 'Weighted Push-Ups: 4x10']) },
  },
  ACC_SHOULDER: {
    1: { default: tier(['Band External Rotation: 4x15 each arm', 'Face Pulls: 4x15', 'Band Pull-Aparts: 4x20']) },
    2: {
      default: tier(['Face Pulls: 4x12', 'Cuban Press: 4x10']),
      endurance: tier(['Band External Rotation: 4x15 each arm', 'Face Pulls: 4x15']),
    },
    3: {
      default: tier(['Cuban Press: 4x10', 'Band External Rotation: 4x12 each arm']),
      // Rotational's own peak phase (4) below emphasizes arm care over
      // heavy pressing per the archetype's spec; phase 3 for Rotational
      // stays on the default arc — only the peak's own content changes.
      endurance: tier(['Band External Rotation: 4x15 each arm', 'Face Pulls: 4x15']),
    },
    4: {
      default: tier(['Face Pulls: 4x15', 'Band Pull-Aparts: 4x20']),
      // Rotational/Throwing's peak phase intent (per the phase-intent
      // established for this archetype in PR1: rotational-power/arm-care
      // emphasis at peak, NOT heavy strength) — same durability-first
      // shoulder-health names as every other phase's own light end,
      // deliberately never introducing a heavier press substitute here.
      rotational: tier(['Band External Rotation: 4x15 each arm', 'Cuban Press: 4x12']),
      endurance: tier(['Band External Rotation: 4x15 each arm', 'Face Pulls: 4x15']),
    },
  },
  ACC_CALF_GRIP: {
    1: { default: tier(['Single Leg Calf Raise: 4x12 each leg', 'Seated Calf Raise: 4x15']) },
    2: { default: tier(['KB Tibialis Raises: 4x15-20 each leg', 'Single Leg Calf Raise: 4x12 each leg']) },
    3: { default: tier(['KB Tibialis Raises: 4x15-20 each leg', 'Seated Calf Raise: 4x15']) },
    4: { default: tier(['Single Leg Calf Raise: 4x10 each leg', 'Seated Calf Raise: 4x12']) },
  },
}

// ACC_CORE — pattern-keyed (not phase-keyed), matching dayLayoutEngine.js's
// own `pattern` sub-property vocabulary (anti_extension/anti_rotation/
// anti_lateral/rotational/trunk). Inert in this PR (see header comment) —
// defined for structural completeness and so Side Plank Sprinter Pose is
// genuinely poolED per the spec, ready for whichever future increment
// re-audits the finisher-engine dedup guard and wires ACC_CORE renderers
// to consume it.
const ACC_CORE_POOLS = {
  anti_extension: tier(['Dead Bug: 3x10 each side', 'Ab Wheel: 3x8']),
  anti_rotation: tier(['Pallof Press: 3x12 each side', 'Half Kneeling Cable Press: 3x10 each side']),
  anti_lateral: tier(['Side Plank Sprinter Pose: 3x20 sec each side (sprinter knee drive)', 'Suitcase Carry: 3x20 yds each side']),
  rotational: tier(['Med Ball Rotational Throw: 3x8 each side', 'Cable Woodchop: 3x10 each side']),
  trunk: tier(['Plank: 3x45 sec', 'Suitcase Carry: 3x20 yds each side']),
}

// ─── Pool lookup ────────────────────────────────────────────────────────
function getPool(tagName, phaseNum, archetypeKey, tierName, packChoiceText) {
  const tagPools = VARIETY_POOLS[tagName]
  if (!tagPools) return [packChoiceText]
  const phaseBucket = tagPools[phaseNum]
  if (!phaseBucket) return [packChoiceText]
  const archBucket = phaseBucket[archetypeKey] || phaseBucket.default
  if (!archBucket) return [packChoiceText]
  let list = archBucket[tierName]
  if (!list || list.length === 0) list = archBucket.standard || []
  if (phaseNum === 1) return [packChoiceText, ...list]
  return list.length > 0 ? list : [packChoiceText]
}

// ─── Round-robin filler coordinator ────────────────────────────────────
// "0-1 filler-slot rotations per day per week; a 2nd rotation only if the
// day has >=3 filler slots." Within a phase there are exactly 2 rotation
// opportunities (the wip 1->2 and wip 2->3 transitions — wip 1 is the
// phase's own fresh start, wip 4 is the deload and never rotates). Each
// opportunity advances a DIFFERENT K-sized block of the day's filler slots
// (K=2 when the day has >=3 fillers, else 1), round-robining through all F
// filler slots so, across a phase, every filler slot gets a turn without
// ever moving 2+ slots on the same day in the same week.
function fillerStepsForDay(numFillers, wipClamped) {
  const F = numFillers
  const steps = new Array(F).fill(0)
  if (F === 0 || wipClamped <= 1) return steps
  const K = F >= 3 ? 2 : 1
  for (let w = 2; w <= wipClamped; w++) {
    const startIdx = ((w - 2) * K) % F
    for (let k = 0; k < K; k++) steps[(startIdx + k) % F] += 1
  }
  return steps
}

// ─── Single authoritative rotation system ───────────────────────────────
// blueprintTemplates.js used to ALSO rotate accessory names downstream, in
// applyAccessoryProgression, via a comprehensive per-sport, name-keyed
// system (the global ACCESSORY_ROTATION table, every SPORT_ACCESSORY_
// ROTATION entry, every SPORT_PHASE_ACCESSORY_ROTATION table) — matching
// purely on the CURRENT rendered exercise name, with zero awareness of
// which dayLayoutEngine slot produced that line. That's exactly why it
// used to rename ANCHOR lines too (e.g. Soccer's `ACC_UNILATERAL_LOWER`
// anchor, "Bulgarian Split Squat," changing to "Reverse Lunge"/"Walking
// Lunge" by phase even though the slot was anchor:true) — a name-matching
// pass downstream of this file has no way to know that.
//
// blueprintTemplates.js's applyAccessoryProgression has been stripped of
// its naming role entirely (it only scales SET COUNT now — see its own
// comment) — THIS resolver is the only place in the codebase that ever
// picks an accessory's exercise NAME. That is what makes the anchor
// guarantee below actually hold: an anchor slot's name is returned
// unchanged here and nothing downstream ever touches it again.
//
// ─── Top-level resolver ─────────────────────────────────────────────────
// Called from each archetype's renderer for every ACC_* tag (anchor or
// filler alike) — `packChoiceText` is that renderer's already-resolved
// Stage-1 static text (string or function entry, already invoked), used
// verbatim for anchors, non-pooled tags, and as phase-1's own "position 0"
// pick. `ctx` is the same per-day render context buildSessionFromTemplate
// already threads through (phaseNum/wip/deload/dayTemplate/...).
function resolveFiller(archetypeKey, slotDef, tagName, ctx, packChoiceText) {
  if (slotDef.anchor) return packChoiceText // anchors never rotate/transform — authoritative, no downstream override exists anymore
  if (!POOLED_TAGS.has(tagName)) return packChoiceText // PLYO/SPEED/MED_BALL — out of scope this PR

  const fillerSlots = ctx.dayTemplate.slots.filter(s => !s.anchor && POOLED_TAGS.has(s.tag))
  const fillerIndex = fillerSlots.indexOf(slotDef)
  if (fillerIndex < 0) return packChoiceText // defensive fallback, should not happen

  const tierName = ctx.equipmentTier || EQUIPMENT_TIERS.STANDARD
  const pool = getPool(tagName, ctx.phaseNum, archetypeKey, tierName, packChoiceText)
  if (pool.length <= 1) return pool[0]

  // Peak/taper (phase 4, weeks 13-16) — ZERO rotations, always the phase's
  // own frozen position 0. Deload weeks (wip 4, i.e. weeks 4/8/12/16) —
  // ZERO rotations, frozen at wherever wip 3 left off (no further advance,
  // no reversion). Everything else (wip 1-3 of phases 1-3) rotates via the
  // round-robin coordinator above.
  let effectiveWip
  if (ctx.phaseNum === 4) effectiveWip = 1
  else if (ctx.wip === 4) effectiveWip = 3
  else effectiveWip = ctx.wip

  const steps = fillerStepsForDay(fillerSlots.length, effectiveWip)
  const step = steps[fillerIndex] || 0
  return pool[step % pool.length]
}

module.exports = {
  EQUIPMENT_TIERS,
  POOLED_TAGS,
  VARIETY_POOLS,
  ACC_CORE_POOLS,
  resolveFiller,
  // exported for direct unit testing of the rotation math
  fillerStepsForDay,
  getPool,
}
