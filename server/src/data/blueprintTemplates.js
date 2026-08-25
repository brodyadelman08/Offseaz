// ─── Server-side blueprint template generator (CommonJS) ──────────────────────
// Single source of truth for both auto-assign (generateBlueprintForAthlete) and
// the coach's manual "build from template" tool (SPORT_TEMPLATES, below).

const finisherEngine = require('./finisherEngine')
const dayLayoutEngine = require('./dayLayoutEngine')
const varietyEngine = require('./varietyEngine')
const movementPatterns = require('./movementPatterns')

// ─── Utilities ────────────────────────────────────────────────────────────────

function pct(f) { return `${Math.round(f * 100)}%` }

// A real deload cuts intensity 15-20% below what the athlete actually lifted
// the week before, not a flat arbitrary number — 17.5% is the midpoint.
const DELOAD_PCT_CUT = 0.175

// Wave loading within the 3 working weeks of a phase (week-in-phase 1-3;
// wip 4 is always the deload — see below). Moderate -> lighter dip -> peak,
// instead of a flat linear climb, so the progression isn't a straight line.
// Still starts above the phase floor and ends exactly at the phase's `high`
// (the peak, right before that phase's deload), so a phase's overall low/high
// range — and therefore how hard the phase is overall — is unchanged; only
// how the 3 weeks inside it are sequenced changes.
const WAVE_T = { 1: 0.45, 2: 0.20, 3: 1.00 }

// Warm-up ramp steps as fractions of that week's OWN top set, not fixed
// absolute percentages — previously "40/50/60/70%" never changed even as the
// top set climbed to 90%+, so by the back half of a plan the "warm-up" was
// heavier than the top set had been in week 1. Same 10/8/6/5 rep scheme as
// before; only the % values are now proportionate to the week's actual load.
const RAMP_FRACTIONS = [0.50, 0.65, 0.80, 0.90]
const RAMP_REPS      = [10, 8, 6, 5]

function buildRamp(topFraction) {
  return RAMP_FRACTIONS
    .map((frac, i) => `${Math.round(topFraction * frac * 100)}%×${RAMP_REPS[i]}`)
    .join(', ')
}

function getPhaseInfo(weekNum, phases) {
  const idx  = Math.min(3, Math.floor((weekNum - 1) / 4))
  const ph   = phases[idx]
  const wip  = ((weekNum - 1) % 4) + 1
  // Every phase's 4th week is a deload now, not just the plan's final phase —
  // a 16-week plan gets real recovery weeks at 4, 8, 12, and 16.
  const deload = wip === 4
  let f2
  if (deload) {
    // Relative to the phase's peak (wip=3, t=1.0 below — i.e. the heaviest
    // week actually programmed this phase), cut 15-20% below it.
    const peakF = ph.low + (ph.high - ph.low) * WAVE_T[3]
    f2 = Math.round(peakF * (1 - DELOAD_PCT_CUT) * 100) / 100
  } else {
    const t = WAVE_T[wip]
    f2 = Math.round((ph.low + (ph.high - ph.low) * t) * 100) / 100
  }
  return { week: weekNum, phaseNum: idx + 1, phaseLabel: ph.label, f: f2, pct: pct(f2), wip, deload, ramp: buildRamp(f2) }
}

function buildWeeks(n, phases, sessionsFn) {
  return Array.from({ length: n }, (_, i) => {
    const w    = i + 1
    const info = getPhaseInfo(w, phases)
    return {
      week_number: w,
      objective: info.deload
        ? `Phase ${info.phaseNum} — Deload (${info.pct}) · Week ${info.wip} of 4`
        : `Phase ${info.phaseNum} — ${info.phaseLabel} (${info.pct}) · Week ${info.wip} of 4`,
      sessions: sessionsFn(info),
    }
  })
}

function buildWeeksDynamic(n, phases, sessFn, daysPerWeek, extraDays = []) {
  return buildWeeks(n, phases, (info) => {
    const base = sessFn(info)
    if (daysPerWeek <= base.length) return base.slice(0, Math.max(2, daysPerWeek))
    const extras = extraDays
      .slice(0, daysPerWeek - base.length)
      .map(d => typeof d === 'function' ? d(info) : d)
    return [...base, ...extras]
  })
}

// ─── Shared block periodization (feat/shared-block-periodization) ─────────
// Upgrades getPhaseInfo's consumers from "one block with climbing weight" to
// four real blocks with distinct intent, WITHOUT touching getPhaseInfo's own
// signature or math. Scoped to exactly the sports/positions that opt in by
// calling these helpers: baseball, football skill/hybrid/qb, basketball,
// soccer. Football linemen (generateLinemenWeeks, built on the shared
// Collision/Max-Strength archetype core's collisionPhaseInfo — see that
// section above) is a fully separate engine from Change 1-4's own phase
// system and is never touched by anything below.

// Change 1 — main-lift top-set rep target descends by phase instead of a
// fixed 3 reps for all 16 weeks. Two tiers: power (peaks harder, down to a
// triple — football skill AND hybrid, whose day templates and phase table
// are both closest to skill's) and rotational/speed (peaks softer, down to
// a set of 4 — baseball, football QB, basketball, soccer). No true singles
// anywhere; a triple is the absolute ceiling. The warm-up ramp underneath
// (RAMP_FRACTIONS/RAMP_REPS/buildRamp, still driven by info.ramp) is
// unchanged — this only replaces the fixed literal "3" after the final "×".
const MAIN_LIFT_TOP_REPS = {
  power:      { 1: 6, 2: 5, 3: 4, 4: 3 },
  rotational: { 1: 8, 2: 6, 3: 5, 4: 4 },
}
function mainLiftTopReps(phaseNum, tier) {
  return MAIN_LIFT_TOP_REPS[tier][phaseNum]
}

// Change 3 — explosive/power work (Trap Bar Jump, med ball throws,
// rotational power lines — never the sport's own phase-gated plyo function
// like baseballPlyo/phasePlyo/bballPlyo, which already vary by NAME per
// phase and are left alone) varies by phase via VOLUME and an intent note,
// never by dropping reps toward a single. Foundation: baseline volume,
// moderate intent. Development: add volume — building intent. Strength:
// same raised volume, high/near-max intent (paired with added load at the
// coach/athlete's discretion — this system prescribes sets/reps, not
// absolute load, on these lines). Peak: lowest volume of all four phases,
// tapered — this is this line-category's share of Change 2's whole-session
// Phase 4 taper.
const EXPLOSIVE_ARC = {
  1: { setsMult: 1.00, intent: 'moderate intent — controlled speed' },
  2: { setsMult: 1.25, intent: 'add volume — building intent' },
  3: { setsMult: 1.25, intent: 'high intent — near-max effort' },
  4: { setsMult: 0.75, intent: 'tapered — lowest volume, stay sharp' },
}
function explosiveSets(baseSets, phaseNum) {
  return Math.max(1, Math.round(baseSets * EXPLOSIVE_ARC[phaseNum].setsMult))
}
function explosiveIntent(phaseNum) {
  return EXPLOSIVE_ARC[phaseNum].intent
}

// Change 4 — phase-keyed accessory VOLUME (naming role retired, see
// hasPhaseAccessoryEntry below). Resolves a volume multiplier by PHASE
// (constant across all non-deload weeks of that phase) instead of the
// standard wip-based ACCESSORY_VOLUME_WAVE, for any accessory whose name is
// still a key in a sport's own phase table (SOCCER_PHASE_ACCESSORY_ROTATION
// etc., below) — "Foundation = highest volume (work-capacity), Peak =
// lowest (stripped down)," phase 2/3 in between.
const PHASE_ACCESSORY_MULT = { 1: 1.3, 2: 1.0, 3: 0.85, 4: 0.5 }

// feat/variety-engine — varietyEngine.js's resolveFiller() is now the
// single authority for which exercise NAME an accessory line shows (both
// anchor slots, which it never renames, and filler slots, which it
// rotates through its own pools). This function no longer resolves or
// returns a name at all — it exists only to preserve the volume ARC this
// table used to carry alongside its (now-retired) naming role: any
// accessory whose current name is still a key in a sport's phaseRotation
// table gets PHASE_ACCESSORY_MULT's "Foundation = high volume, Peak =
// stripped down" progression instead of the standard within-phase wip
// wave — see applyAccessoryProgression below, the only caller.
function hasPhaseAccessoryEntry(name, phaseRotation) {
  return !!phaseRotation[name.toLowerCase().trim()]
}

// ─── Superset notation (structural capability only) ────────────────────────
// Marks two or more consecutive exercise lines as one superset group so the
// client can render a single continuous "SS" bracket down the left side
// spanning the group, instead of standalone lines. This is ONLY the plumbing
// — no session template in this file groups any specific lifts into a
// superset yet (which lifts pair together is separately-scoped follow-up
// work); this just makes it possible to mark a group and have it render
// correctly once one is added.
//
// Convention: every line in the group is prefixed with the same ⟦SS<n>⟧
// marker, where <n> is a 1-based group number *within that session* (a
// session with two separate superset pairs uses ⟦SS1⟧ on both lines of the
// first pair and ⟦SS2⟧ on both lines of the second). Markers are parsed and
// stripped client-side — see client/src/utils/supersets.js, which must be
// kept in sync with this exact `⟦SS` + digits + `⟧` shape.
//
// superset(groupNum, lines) is a small helper for template authors: given an
// array of already-formatted exercise line strings, it returns them prefixed
// as one group, so a whole session can still be composed with plain string
// interpolation/`.join('\n')` like every other session in this file.
const SUPERSET_MARKER_RE = /^⟦SS(\d+)⟧/

function superset(groupNum, lines) {
  const marker = `⟦SS${groupNum}⟧`
  return lines.map(line => `${marker}${line}`)
}

// Every per-line classifier/substitution pass below this point that assumes
// a line starts with the exercise name — a `^`-anchored regex, or
// String#startsWith — breaks the moment that line is superset-grouped,
// since a marked line's real content starts after the ⟦SS<n>⟧ prefix, not
// at index 0. Before this rebuild that was moot (no template ever grouped
// anything), but the first real superset content pairs an
// injury-substitution target ("Bulgarian Split Squat") inside a group, so a
// `^`-anchored knee-injury check would otherwise silently stop firing for
// that specific line. withMarkerPreserved runs `transform` against the
// content with any leading marker stripped, then re-attaches the same
// marker to the result, so classification/substitution behaves identically
// whether or not the line happens to be in a superset group.
function withMarkerPreserved(line, transform) {
  const m = line.match(SUPERSET_MARKER_RE)
  if (!m) return transform(line)
  return m[0] + transform(line.slice(m[0].length))
}

// Extracts the exercise NAME (text before the first colon) from a rendered
// "Name: SxR..." line, stripping any already-present ⟦SS<n>⟧ marker first —
// used only to feed movementPatterns.competes(), never to alter the line.
function exerciseNameOf(line) {
  const bare = line.replace(SUPERSET_MARKER_RE, '')
  const colonIdx = bare.indexOf(':')
  return (colonIdx > 0 ? bare.slice(0, colonIdx) : bare).trim()
}

// feat/superset-ohp-fixes — pairs a run of same-day accessory/filler
// candidates into NON-COMPETING superset groups (see movementPatterns.js,
// the same classifier blueprintQuality.js's own guardrail check uses, so
// this pairing and that check can never drift apart).
//
// Greedy NEAREST-FORWARD compatible match, in original authored order: for
// each not-yet-paired candidate, take the first LATER candidate that
// doesn't compete with it. This means an already-compatible adjacent pair
// is completely untouched — byte-identical to the old purely-positional
// pairing — and only a genuine same-pattern collision ever changes which
// two lines end up bracketed together (by reaching past the colliding
// neighbor for the next compatible one instead). A candidate with no
// compatible partner anywhere in the run renders solo rather than forcing
// a bad pairing — see FIX 1's day-template content additions for how days
// that were short a real partner get real accessory volume instead of a
// forced junk pairing.
function pairCompatibleSingles(items) {
  const n = items.length
  const partnerOf = new Array(n).fill(-1)
  for (let i = 0; i < n; i++) {
    if (partnerOf[i] !== -1) continue
    for (let j = i + 1; j < n; j++) {
      if (partnerOf[j] !== -1) continue
      if (!movementPatterns.competes(exerciseNameOf(items[i].lines[0]), exerciseNameOf(items[j].lines[0]))) {
        partnerOf[i] = j
        partnerOf[j] = i
        break
      }
    }
  }
  const groups = []
  const emitted = new Array(n).fill(false)
  for (let i = 0; i < n; i++) {
    if (emitted[i]) continue
    const p = partnerOf[i]
    if (p > i) {
      groups.push({ kind: 'pair', lines: [items[i].lines[0], items[p].lines[0]] })
      emitted[i] = true; emitted[p] = true
    } else if (p === -1) {
      groups.push({ kind: 'single', line: items[i].lines[0] })
      emitted[i] = true
    }
  }
  return groups
}

function mgNote() {
  return '\n\nMuscle Gain additions: +1-2 sets on all compounds · Rep ranges 8-12 for compounds / 12-15 for accessories · Add Bicep Curls 3x12, Tricep Extensions 3x12, Lateral Raises 3x15, Calf Raises 3x15'
}

// Fix 3 — Phase-based plyometric progression
// Ph1: Box Jumps · Ph2: Broad Jumps · Ph3: Hurdle Hops · Ph4: Depth Jumps
function phasePlyo(phaseNum) {
  if (phaseNum === 1) return 'Box Jumps: 5x5'
  if (phaseNum === 2) return 'Broad Jumps: 5x3'
  if (phaseNum === 3) return 'Hurdle Hops: 4x6'
  return 'Depth Jumps: 4x5'
}

// Phased core progression (matches client file exactly)
// `deload` is an optional, backward-compatible addition (added for the
// Repeat-Sprint/Field archetype's finisher rework — see the PR #20 review)
// — every pre-existing call site in this file passes only `phaseNum`, so
// `deload` defaults false and every one of those call sites is completely
// unaffected. Only the new Repeat-Sprint day functions pass `info.deload`
// explicitly, so a deload week's core finisher genuinely tapers (a single,
// light line) instead of holding at full phase volume the way it silently
// did everywhere before this — Core was already exempt from the shared
// deload-reduction pass entirely, which meant "no reduction at all," not
// "an intentional taper."
function coreBlock(phaseNum, deload = false) {
  if (deload) return 'Core — Deload (Light):\nDead Bug: 2x8 each side\nPlank: 2x20 seconds'
  if (phaseNum === 1)
    return 'Core — Anti-Extension:\nDead Bug: 3x10 each side\nAb Wheel: 3x8\nPlank: 3x30 seconds'
  if (phaseNum === 2)
    return 'Core — Anti-Rotation:\nPallof Press: 3x10 each side\nHalf Kneeling Cable Press: 3x10 each side'
  if (phaseNum === 3)
    return 'Core — Rotational Power:\nMed Ball Rotational Throw: 4x6 each side\nCable Woodchop: 3x10 each side'
  return 'Core — Lateral Stability:\nCopenhagen Adductor: 3x8 each leg\nSuitcase Carry: 3x20 yds each side'
}

// Second core-finisher variant — same phase-varying design as coreBlock
// above, deliberately different movements, so a week's two core-finisher
// days (see the Repeat-Sprint/Field archetype's day layout) never repeat
// the same content. Shared/generic the same way coreBlock itself already
// is (core work has never been sport-specific in this file — every sport
// that uses coreBlock draws from the identical pool); only the archetype's
// CONDITIONING finishers are sport-owned (see conditioningFinisher, and
// each sport's own drill choices below).
function coreBlockB(phaseNum, deload = false) {
  if (deload) return 'Core — Deload (Light):\nDead Bug: 2x8 each side\nPlank: 2x20 seconds'
  if (phaseNum === 1)
    return 'Core — Rotational Endurance:\nCable Woodchop: 3x12 each side\nBird Dog: 3x10 each side'
  if (phaseNum === 2)
    return 'Core — Anti-Flexion:\nPlank: 3x40 seconds\nBird Dog: 3x10 each side'
  if (phaseNum === 3)
    return 'Core — Explosive Rotation:\nMed Ball Side Throw: 4x6 each side\nRotational Cable Pull: 3x10 each side'
  return 'Core — Stability & Control:\nPallof Press: 3x10 each side\nDead Bug: 3x10 each side'
}

// Adapter — turns a "Core — <Subtitle>:\n<line>\n<line>" string from
// coreBlock/coreBlockB into the {subtitle, lines[]} shape the Shared
// Finisher Engine's content banks use (finisherEngine.js), so every sport's
// 'core' family reuses this already phase-progressive, already-vetted
// content instead of re-authoring it per sport. Not a fragile parse — the
// "Core — X:" header shape is a fixed, established convention throughout
// this file (see organizeSessionDescription/applyDeloadVolumeReduction).
function coreEntryFromBlock(blockFn, phaseNum, deload) {
  const [header, ...lines] = blockFn(phaseNum, deload).split('\n')
  return { subtitle: header.replace(/^Core\s*—\s*/, '').replace(/:$/, ''), lines }
}

// ─── Phase configs ────────────────────────────────────────────────────────────

// Every phase array's boundaries are contiguous (phase[n].high === phase[n+1].low)
// so the wave-loading week that opens the next phase never dips below the
// peak the previous phase just hit — several of these used to regress at the
// Power/Peak boundary (e.g. BB_PHASES dropped from 0.85 down to 0.80) before
// that was fixed here. `deload` is no longer read from these objects — see
// getPhaseInfo, which now deloads every phase's 4th week unconditionally.
//
// Change 2 (shared block periodization) — Phase 4 of FB_PHASES/BB_PHASES/
// SOC_PHASES/BASEBALL_PHASES (below, in the baseball section) no longer
// continues the climb past Phase 3's peak. Each now reuses that SAME
// sport's own Phase 1 (Foundation) low/high range as a genuine taper: the
// contiguous-boundary invariant above is deliberately broken ONLY at the
// Phase 3 -> Phase 4 seam for these four tables, on purpose — Phase 4 backs
// off so the athlete enters the season fresh instead of grinding to a new
// high. Every other sport's table (MG_PHASES, HOCKEY_PHASES, RUGBY_PHASES,
// TENNIS_PHASES, GOLF_PHASES, WR_PHASES, STD_PHASES) is untouched and keeps
// climbing straight through Phase 4 exactly as before.
const FB_PHASES = [
  { label: 'Accumulation',   low: 0.65, high: 0.75 },
  { label: 'Strength Build', low: 0.75, high: 0.82 },
  { label: 'Peak Strength',  low: 0.82, high: 0.88 },
  { label: 'Peak Taper',     low: 0.65, high: 0.75 },
]
const BB_PHASES = [
  { label: 'Foundation',        low: 0.65, high: 0.72 },
  { label: 'Strength',          low: 0.72, high: 0.80 },
  { label: 'Power Conversion',  low: 0.80, high: 0.85 },
  { label: 'Peak Taper',        low: 0.65, high: 0.72 },
]
const SOC_PHASES = [
  { label: 'Foundation',     low: 0.65, high: 0.72 },
  { label: 'Strength',       low: 0.72, high: 0.80 },
  { label: 'Power-Strength', low: 0.80, high: 0.85 },
  { label: 'Peak Taper',     low: 0.65, high: 0.72 },
]
const WR_PHASES = [
  { label: 'Accumulation',   low: 0.70, high: 0.80 },
  { label: 'Strength Build', low: 0.80, high: 0.87 },
  { label: 'Peak Strength',  low: 0.87, high: 0.92 },
  { label: 'Max Strength',   low: 0.92, high: 0.95 },
]
const STD_PHASES = [
  { label: 'Foundation',   low: 0.65, high: 0.72 },
  { label: 'Strength',     low: 0.72, high: 0.80 },
  { label: 'Power Blend',  low: 0.80, high: 0.85 },
  { label: 'Peak',         low: 0.85, high: 0.88 },
]
const MG_PHASES = [
  { label: 'Hypertrophy Base',   low: 0.65, high: 0.68 },
  { label: 'Volume Build',       low: 0.68, high: 0.72 },
  { label: 'Strength-Volume',    low: 0.72, high: 0.76 },
  { label: 'Peak Volume',        low: 0.76, high: 0.78 },
]
const HOCKEY_PHASES = [
  { label: 'Foundation',  low: 0.65, high: 0.73 },
  { label: 'Strength',    low: 0.73, high: 0.80 },
  { label: 'Power Build', low: 0.80, high: 0.85 },
  { label: 'Peak',        low: 0.85, high: 0.88 },
]
const RUGBY_PHASES = [
  { label: 'Accumulation',   low: 0.65, high: 0.75 },
  { label: 'Strength Build', low: 0.75, high: 0.82 },
  { label: 'Peak Strength',  low: 0.82, high: 0.88 },
  { label: 'Maximum Output', low: 0.88, high: 0.93 },
]
const TENNIS_PHASES = [
  { label: 'Foundation',     low: 0.65, high: 0.72 },
  { label: 'Strength',       low: 0.72, high: 0.80 },
  { label: 'Power Build',    low: 0.80, high: 0.85 },
  { label: 'Peak',           low: 0.85, high: 0.88 },
]
const GOLF_PHASES = [
  { label: 'Foundation',     low: 0.60, high: 0.70 },
  { label: 'Strength Build', low: 0.70, high: 0.78 },
  { label: 'Power Build',    low: 0.78, high: 0.82 },
  { label: 'Peak',           low: 0.82, high: 0.85 },
]

// ─── Football ─────────────────────────────────────────────────────────────────
// Fix 2 — Session-appropriate dynamic warm-ups replace the old barbell complex

const WU_LOWER = 'Lower Body Warm-up: Hip Circles 10 each direction · Leg Swings 10 each leg · Lateral Band Walk 2x10 · Box Jump 3x3 activation\n\n'
const WU_UPPER = 'Upper Body Warm-up: Arm Circles 2x10 each direction · Band Pull-Aparts 2x15 · Push-up 2x10 · Med Ball Chest Pass 3x5\n\n'
const SPRINT_STD   = '\n\nSprint Work: 10x10 yds · 6x20 yds · 4x40 yds'
const SPRINT_SKILL = '\n\nSprint Work: 10x10 yds · 8x20 yds · 6x40 yds @ 95%'
// Fix 2 — Neck protocol for contact positions (Linemen, Hybrid). ~5 min. Growing evidence for concussion severity reduction.
const NECK = '\nNeck Flexion: 2x15\nNeck Extension: 2x15\nLateral Neck Flexion: 2x15 each side'
// Fix 3 — Reduced basketball plyo volume (≤35 contacts/session vs. 62+ previously)
function bballPlyo(phaseNum) {
  if (phaseNum === 1) return 'Box Jumps: 3x4'
  if (phaseNum === 2) return 'Broad Jumps: 3x3'
  if (phaseNum === 3) return 'Hurdle Hops: 3x5'
  return 'Depth Jumps: 3x4'
}

// ─── Collision/Max-Strength archetype core (feat/archetype-collision;
// day-count-aware assembly rebuilt on dayLayoutEngine.js in
// feat/day-layout-engine) ───────────────────────────────────────────────
// Extracted from Football Linemen, the archetype's original, benchmark
// implementation (see the Blueprint Architecture Audit). This section is
// the reusable CORE — the rep-scheme math, the autoregulated Oly-lift
// prescription, and the phase/deload cadence — shared by every sport that
// joins this archetype. Day-count-aware assembly itself now goes through
// dayLayoutEngine's purpose-built 3/4/5/6-day templates (see
// generateCollisionWeeksFromPack/buildCollisionRenderers below) instead of
// a per-sport hand-written anchor4Day/threeDay/day5/lowerC/upperC set —
// each sport now supplies a "pack" (its own exercise selections, keyed by
// tag) instead of its own day-content functions.
//
// What makes this archetype "Collision/Max-Strength" (not just "any sport
// with a squat in it"):
//   1. A raised accessory cap (5, see resolveAccessoryCapKey/
//      SPORT_MAX_ACCESSORIES) so a day can run main power lift + main
//      strength lift + 3-4 accessories (5-6 movements) instead of the
//      sport-wide default cap of 3.
//   2. Main strength lifts prescribe an OPEN rep WINDOW on the top set
//      (e.g. "80%×5-8") instead of a fixed rep count — see
//      buildCollisionMainLiftRamp. The window is just text appended after
//      the top-set %, so every existing %-based classifier (isRampedLiftLine,
//      the beginner/advanced experience-adjustment passes) already handles
//      it unchanged; addExtraTopSet above got one small, backward-compatible
//      fix (optional "-N" support) so an advanced athlete's extra top set
//      doesn't truncate the window.
//   3. Olympic lifts (Power Clean, Hang Clean Above the Knee, BB/Single Arm
//      DB Split Jerk, Clean Pull, ...) are autoregulated — "start light and
//      build" to a top set/double/single, never a %-of-max — so every one
//      of their lines is deliberately written as prose (no "NxR" shape)
//      rather than a parsed number, which keeps them naturally exempt from
//      the accessory-rotation, volume-wave, and deload-reduction passes
//      that only ever touch lines matching that shape (see isAccessoryLine).
//   4. Day-count-aware, PURPOSE-BUILT layouts (3/4/5/6 days) — see
//      dayLayoutEngine.js's TEMPLATES.collision — rather than a generic
//      slice-to-N fallback.

// Main strength lift wave loading, off personal max, tied to the same
// phase/deload cadence every other sport uses (phase boundary every 4
// weeks, deload on the 4th). Only 3 named tiers are prescribed
// (Accumulation/Intensification/Peak); Phase 4 holds at Peak's numbers
// rather than inventing a 4th tier, matching how several real programs
// keep the final block at peak intensity through to the end of an
// offseason.
const COLLISION_MAIN_LIFT_SCHEMES = {
  accumulation:    { pcts: [40, 50, 60, 70, 80],     reps: [10, 8, 6, 5],    top: '5-8' },
  intensification: { pcts: [40, 53, 65, 75, 85],     reps: [10, 8, 6, 5],    top: '3-6' },
  peak:            { pcts: [40, 50, 60, 70, 80, 90], reps: [10, 8, 6, 5, 3], top: '1-4' },
  deload:          { pcts: [40, 70],                 reps: [10],            top: '5' },
}

// feat/blueprint-cleanup — muscle_gain variant of the same scheme shape
// (pcts/reps/top window), moderate load and a higher-rep top window
// instead of climbing toward a near-max single. % range (35-76%) and
// phase-label vocabulary (Hypertrophy Base/Volume Build/Strength-Volume/
// Peak Volume) deliberately match MG_PHASES — the same muscle_gain
// terminology and intensity band every other sport in this file already
// uses for its own goal=muscle_gain path — so this is "the same rep/
// volume emphasis muscle_gain gets everywhere else," not a bespoke
// invention for Collision sports specifically. Phase 4 climbs slightly
// past Phase 3 (peakVolume) rather than holding, matching MG_PHASES' own
// shape — a hypertrophy block's natural endpoint is its highest volume
// week, not a taper into a season it isn't peaking for.
const COLLISION_MG_MAIN_LIFT_SCHEMES = {
  hypertrophyBase: { pcts: [35, 45, 55, 60, 65], reps: [12, 10, 10, 8], top: '8-10' },
  volumeBuild:     { pcts: [38, 48, 58, 64, 68], reps: [12, 10, 10, 8], top: '8-10' },
  strengthVolume:  { pcts: [40, 50, 60, 68, 72], reps: [12, 10, 8, 8],  top: '6-8' },
  peakVolume:      { pcts: [42, 52, 62, 70, 76], reps: [12, 10, 8, 8],  top: '6-8' },
  deload:          { pcts: [35, 55],             reps: [10],           top: '10' },
}

function collisionMainLiftScheme(phaseNum, deload, mg = false) {
  if (mg) {
    if (deload) return COLLISION_MG_MAIN_LIFT_SCHEMES.deload
    if (phaseNum <= 1) return COLLISION_MG_MAIN_LIFT_SCHEMES.hypertrophyBase
    if (phaseNum === 2) return COLLISION_MG_MAIN_LIFT_SCHEMES.volumeBuild
    if (phaseNum === 3) return COLLISION_MG_MAIN_LIFT_SCHEMES.strengthVolume
    return COLLISION_MG_MAIN_LIFT_SCHEMES.peakVolume
  }
  if (deload) return COLLISION_MAIN_LIFT_SCHEMES.deload
  if (phaseNum <= 1) return COLLISION_MAIN_LIFT_SCHEMES.accumulation
  if (phaseNum === 2) return COLLISION_MAIN_LIFT_SCHEMES.intensification
  return COLLISION_MAIN_LIFT_SCHEMES.peak // Phase 3 AND 4 hold at Peak
}

// Returns just the ramp text (no exercise name) — e.g.
// "40%×10, 50%×8, 60%×6, 70%×5, 80%×5-8" for an Accumulation-phase week, or
// "40%×10, 70%×5" (fixed, no open window) for a deload week.
function buildCollisionMainLiftRamp(phaseNum, deload, mg = false) {
  const s = collisionMainLiftScheme(phaseNum, deload, mg)
  const steps = s.pcts.slice(0, -1).map((p, i) => `${p}%×${s.reps[i]}`)
  const topPct = s.pcts[s.pcts.length - 1]
  return `${steps.join(', ')}, ${topPct}%×${s.top}`
}

// Olympic-lift autoregulated prescription — "start light and build," never a
// forced percentage. Rep scheme descends by phase: Accumulation 5x3,
// Intensification down to heavy doubles (3,3,2,2), Peak heavy singles off a
// triple (3,2,2,1,1), deload 3x3 lighter (no build).
//
// feat/blueprint-cleanup — muscle_gain keeps the exact same autoregulated
// "start light and build" convention (still prose, still never a forced
// percentage, still exempt from accessory-rotation/volume-wave/deload-
// reduction for the same reason the standard branches are — see the note
// below) but targets higher-rep clusters (5x5/4x4/3x3) instead of
// descending toward a single, since a hypertrophy block wants sets in the
// 3-5 rep range on an Olympic lift, not a 1-rep peak.
function collisionOlyScheme(phaseNum, deload, mg = false) {
  // Deliberately NOT written as a leading "3x3" — every branch here is
  // prose specifically so it never matches the shared "Name: NxR" accessory
  // shape (isAccessoryLine's regex requires digits immediately after the
  // colon). That keeps every Oly-lift line naturally exempt from the
  // accessory-rotation/volume-wave/deload-reduction passes, which is the
  // correct outcome for an autoregulated lift — but it means the number
  // can't lead the string, or reduceAccessoryVolume would still halve it
  // out from under this already-deloaded prescription.
  if (mg) {
    if (deload) return 'lighter, no build — 3x5'
    if (phaseNum <= 1) return 'build to a strong set of 5x5 — start light and build'
    if (phaseNum === 2) return 'build to a strong set of 4x4 — start light and build'
    return 'build to a strong set of 3x3 — start light and build'
  }
  if (deload) return 'lighter, no build — 3x3'
  if (phaseNum <= 1) return 'build to a top set of 5x3 — start light and build'
  if (phaseNum === 2) return 'build to heavy doubles — 3,3,2,2, start light and build'
  return 'build to a heavy single off a triple — 3,2,2,1,1, start light and build'
}

function collisionPhaseInfo(weekNumber, mg = false) {
  const phaseNum = Math.min(4, Math.floor((weekNumber - 1) / 4) + 1)
  const wip = ((weekNumber - 1) % 4) + 1
  const deload = wip === 4
  // feat/blueprint-cleanup — muscle_gain uses the same phase-label
  // vocabulary as MG_PHASES (every other sport's own muscle_gain phase
  // table), instead of the standard path's Accumulation/Intensification/
  // Peak labels, so a coach sees consistent terminology regardless of
  // which archetype the sport happens to be built on.
  const labels = mg
    ? ['Hypertrophy Base', 'Volume Build', 'Strength-Volume', 'Peak Volume']
    : ['Accumulation', 'Intensification', 'Peak', 'Peak']
  return { week: weekNumber, phaseNum, phaseLabel: labels[phaseNum - 1], wip, deload, mg }
}

// Fixed 4-way neck-armor block — flexion, extension, both lateral
// directions. Shared across every Collision-archetype sport that wants
// dedicated neck work (Linemen, Wrestling, Rugby Forwards — see their own
// sections; Hockey Forwards opts out in favor of hip/skating-mobility
// accessories instead, per its own real demands). The "Neck — ...:" header
// (see organizeSessionDescription/applyDeloadVolumeReduction) keeps it
// exempt from the accessory cap, rotation, volume wave, and deload
// reduction — a fixed, always-kept dose every week, same treatment as a
// "Core — ...:" block.
const COLLISION_NECK = 'Neck — 4-Way (band or manual resistance):\nNeck Flexion: 2x15\nNeck Extension: 2x15\nLateral Neck Flexion: 2x15 each side'
// Heavier dedicated neck dose for a 5-day plan's own Day 5.
const COLLISION_NECK_DEDICATED = 'Neck — Dedicated 4-Way (band or manual resistance):\nNeck Flexion: 3x12\nNeck Extension: 3x12\nLateral Neck Flexion: 3x12 each side'

// feat/blueprint-cleanup — the same "+mgNote(), relabel focus" wrapper
// every non-Collision sport's own muscle_gain path already applies (see
// e.g. Football Skill/Hybrid/QB, Basketball, Rugby Backs above/below) —
// shared here since all four Collision-archetype sports (Linemen,
// Wrestling, Rugby Forwards, Hockey Forwards) need the identical
// treatment on top of their own already mg-aware day content (see
// buildCollisionMainLiftRamp/collisionOlyScheme's own `mg` branches).
function applyCollisionMgWrapper(weeks, mg) {
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

// Shared Finisher Engine wiring for every Collision-archetype sport (see
// finisherEngine.js for the weighting/allocation/scheduling math, shared
// verbatim by every archetype). Each sport supplies its own content bank
// (LINEMEN_FINISHERS etc., below) — this just calls into the engine with
// this archetype's key and renders whichever family the engine assigned to
// `dayIndex` that week. `days` is the day-count of the CALLING layout (4 for
// the anchor, 3 for the hand-consolidated 3-day version) — each layout gets
// its own independently-computed plan, not a slice of the 4-day one, same
// "hand-consolidated, not sliced" precedent the day-content itself follows.
// feat/finisher-engine-rollout correction — arm care is NOT universal.
// Collision sports (Linemen/Wrestling/Rugby Forwards/Hockey Forwards)
// aren't throwing/overhead positions; they get shoulder work from normal
// pressing/pulling, not a dedicated arm-care finisher. `hasArmCare: false`
// zeroes Arm's weight and the engine redistributes it proportionally into
// Sprint/Energy/Core/Rotation — the families this archetype actually
// needs. Each sport's own bank below still defines an `arm` entry (dead,
// unreachable code now) purely so nothing breaks if a future position on
// this archetype ever needs it back; the engine guarantees it's never
// selected while this flag is false.
function collisionFinisher(bank, dayIndex, days, info) {
  const plan = finisherEngine.planWeekFinishers('collision', info.phaseNum, days, { hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(bank, plan, info.phaseNum, info.deload)
}

// ─── Day Layout Engine wiring: Collision archetype (feat/day-layout-engine)
// Builds a full dayLayoutEngine renderers object for one Collision sport
// from a "pack" — that sport's own exercise selections, keyed by the day's
// `focus` label (the day-count templates in dayLayoutEngine.js use unique
// focus labels per day, so this is an unambiguous lookup regardless of
// which day-count template is active). Reuses collisionMainLiftScheme/
// collisionOlyScheme/buildCollisionMainLiftRamp (main-lift math),
// coreBlock (ACC_CORE), phasePlyo (PLYO, where a pack opts in), and the
// sport's own already-existing finisher bank via collisionFinisher()
// (FINISHER) — completely unchanged. This function only supplies the
// STRUCTURE (which tag renders on which day) plus the sport's exercise
// NAMES; Stage 2 will later replace a pack entry's single fixed name with
// a phase-varying pool without touching this function or the templates.
//
// pack shape:
//   warmupLower/warmupUpper: strings (no trailing newline — the assembler
//     adds exactly one blank line after)
//   neckBlock: string, defaults to COLLISION_NECK — a sport may override
//     per-day via byFocus[focus].NECK (checked first)
//   byFocus: { [focusLabel]: { [TAG]: entry } }
//     - MAIN_* entry: a string (bare exercise name) or { name, suffix }
//       for lifts that carry a fixed trailing note (e.g. "(full ROM)")
//     - ACC_*/PLYO/SPEED/MED_BALL entry: a plain "Name: SxR note" string,
//       or a function (ctx) => string for lines that still need phase-
//       aware volume via already-existing machinery (phasePlyo, etc.)
//   finisherBank: the sport's existing *_FINISHERS object
function buildCollisionRenderers(pack) {
  function mainEntry(focusLabel, tagName) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (!entry) throw new Error(`Collision pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'string' ? { name: entry, suffix: '' } : { name: entry.name, suffix: entry.suffix || '' }
  }
  function accEntry(focusLabel, tagName, ctx) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (entry === undefined) throw new Error(`Collision pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'function' ? entry(ctx) : entry
  }

  const renderers = {}
  renderers.MAIN_OLY = (slotDef, ctx) => {
    const { name, suffix } = mainEntry(ctx.dayTemplate.focus, 'MAIN_OLY')
    return `${name}: ${collisionOlyScheme(ctx.phaseNum, ctx.deload, ctx.mg)}${suffix}`
  }
  for (const tagName of ['MAIN_SQUAT', 'MAIN_HINGE', 'MAIN_PRESS_H', 'MAIN_PRESS_V']) {
    renderers[tagName] = (slotDef, ctx) => {
      const { name, suffix } = mainEntry(ctx.dayTemplate.focus, tagName)
      return `${name}: ${buildCollisionMainLiftRamp(ctx.phaseNum, ctx.deload, ctx.mg)}${suffix}`
    }
  }
  for (const tagName of [
    'ACC_SQUAT', 'ACC_HINGE', 'ACC_UNILATERAL_LOWER', 'ACC_POSTERIOR',
    'ACC_PULL_H', 'ACC_PULL_V', 'ACC_PRESS', 'ACC_SHOULDER', 'ACC_CALF_GRIP',
    'PLYO', 'SPEED', 'MED_BALL',
  ]) {
    renderers[tagName] = (slotDef, ctx) => {
      const packChoice = accEntry(ctx.dayTemplate.focus, tagName, ctx)
      return varietyEngine.resolveFiller('collision', slotDef, tagName, ctx, packChoice)
    }
  }
  // ACC_CORE renders nothing in Stage 1 (unchanged in Stage 2 — see
  // varietyEngine.js's own header comment) — the finisher engine's own
  // 'core' family already renders coreBlock() content, weighted/phased/
  // anti-clustered across the week; if this slot ALSO called coreBlock()
  // directly, a day where the finisher engine independently picks 'core'
  // for that same day would render identical core content twice. The
  // finisher engine remains the single source of truth for core content
  // (matches "preserve the finisher engine... this plugs into it, does
  // not redesign it") — ACC_CORE's placement in a template is structural
  // signal only for now (documenting which days want core emphasis, for
  // Stage 2 to build on), not a Stage 1 render.
  renderers.ACC_CORE = () => null
  renderers.WARMUP = (ctx) => {
    const lu = dayLayoutEngine.dayLowerOrUpper(ctx.dayTemplate)
    if (lu === 'lower') return pack.warmupLower
    if (lu === 'upper') return pack.warmupUpper
    return null
  }
  renderers.NECK = (ctx) => {
    // Hockey Forwards has always opted out of the fixed neck block
    // entirely (a real, documented, pre-existing sport-level choice, not
    // an oversight) — pack.noNeck lets a sport suppress it even on a day
    // the shared template itself flags neck:true.
    if (pack.noNeck) return null
    const override = pack.byFocus[ctx.dayTemplate.focus] && pack.byFocus[ctx.dayTemplate.focus].NECK
    if (override) return typeof override === 'function' ? override(ctx) : override
    return pack.neckBlock || COLLISION_NECK
  }
  renderers.FINISHER = (dayIndex, ctx) => collisionFinisher(pack.finisherBank, dayIndex, ctx.days, ctx)
  return renderers
}

// Generates all 16 weeks for one Collision-archetype sport at a given
// day count, entirely from its pack — replaces the old per-day-count hand
// -written function set (anchor4Day/threeDay/day5/lowerC/upperC) with the
// same generateCollisionArchetypeWeeks phase/deload cadence, now driving
// dayLayoutEngine's purpose-built 3/4/5/6-day templates instead of a
// 4-day-only anchor + slice/generic-bonus-day fallback.
function generateCollisionWeeksFromPack(pack, daysPerWeek, mg = false) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = collisionPhaseInfo(w, mg)
    const ctx = { ...info, days: Math.max(2, Math.min(6, daysPerWeek)) }
    let sessions = dayLayoutEngine.buildWeekSessions('collision', ctx.days, buildCollisionRenderers(pack), ctx)
    // dayLayoutEngine.js's templates use one GENERIC focus label per day,
    // shared across every Collision sport (the byFocus lookup key) — a
    // sport whose own day identity reads richer than the generic label
    // (e.g. Rugby's "Lower Power — Scrummage Drive" vs. the template's
    // plain "Lower Power") can supply `pack.displayFocus[genericLabel] =
    // 'own text'` to rename the OUTPUT label only, after all content is
    // already resolved — purely cosmetic, never touches lookup.
    if (pack.displayFocus) {
      sessions = sessions.map(s => ({ ...s, focus: pack.displayFocus[s.focus] || s.focus }))
    }
    const topScheme = collisionMainLiftScheme(info.phaseNum, info.deload, mg)
    const topPct = topScheme.pcts[topScheme.pcts.length - 1]
    weeks.push({
      week_number: w,
      objective: info.deload
        ? `Phase ${info.phaseNum} — Deload (${topPct}%) · Week ${info.wip} of 4`
        : `Phase ${info.phaseNum} — ${info.phaseLabel} (${topPct}%) · Week ${info.wip} of 4`,
      sessions,
    })
  }
  return weeks
}

// Linemen's own finisher content — reuses already-vetted vocabulary from
// its own Day 5 (Sled Push, Loaded Carry Mix, Grip Work) and existing
// rotational/arm-care names already established elsewhere in this file
// (Med Ball Rotational Throw, Landmine Rotational Press, Band External
// Rotation, Face Pulls). Core reuses the shared coreBlock verbatim.
const LINEMEN_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Sled Push: 2x15 yds'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Sled Push: 4x15 yds (short, choppy steps)'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Sled Push: 4x20 yds'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Sprint Work: 5x10 yds @ max effort'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Sprint Work: 4x10 yds @ max effort (full recovery)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Farmer Carries: 2x20 yds'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Loaded Carry Mix: 3 rounds (farmer + suitcase, alternating)'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Farmer Carries: 4x30 yds'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Battle Rope: 4x20s'] }
    return { subtitle: 'Reduced', lines: ['Farmer Carries: 2x30 yds'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Landmine Rotational Press: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
  arm(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Band External Rotation: 2x15 each arm'] }
    if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: ['Band External Rotation: 3x15 each arm', 'Face Pulls: 3x15'] }
    if (ph === 2) return { subtitle: 'Modest Increase', lines: ['Face Pulls: 4x15', 'Grip Work: 2 sets'] }
    if (ph === 3) return { subtitle: 'Maintenance', lines: ['Grip Work: 3 sets'] }
    return { subtitle: 'Readiness', lines: ['Band External Rotation: 2x15 each arm', 'Face Pulls: 2x15'] }
  },
}

// ─── Football — Linemen (both standard and muscle_gain goals — see
// generateLinemenWeeks/applyCollisionMgWrapper below; feat/blueprint-cleanup
// retired the old pre-archetype fbLinemenMGSess fallback, so both goals now
// share this same day content) ─────────────────────────────────────────────
// Adapted from a real D1 4-day upper/lower linemen program — the 4-day
// layout (LINEMEN_PACK's 'Lower Power'/'Upper Strength'/'Lower Strength'/
// 'Upper Power' entries) is the source-faithful anchor; the purpose-built
// 3/5/6-day templates (dayLayoutEngine.js's TEMPLATES.collision) draw on
// this same pack for their own content. This is the archetype's reference
// implementation — see generateLinemenWeeks below, which plugs LINEMEN_PACK
// into generateCollisionWeeksFromPack.

const LINEMEN_WU_LOWER = 'Empty BB Warm-Up Complex: RDL x5 · Hang Clean x5 · Front Squat x5 · Back Squat x5'
const LINEMEN_WU_UPPER = 'Upper Body Warm-Up Series: Prone Swimmers x5 · Push-Up to Pike x5 · Band Pull-Aparts x20'

// AMRAP Pull-Up special protocol (kept exactly, every week — this is a fixed
// live-testing protocol, not something that progresses by phase). Set 1 is
// AMRAP; the athlete looks up their own result on this chart for the
// remaining work sets. Neutral grip.
const LINEMEN_AMRAP_PULLUP =
  'Neutral-Grip Pull-Ups: Set 1 = AMRAP (record reps), then 5 work sets per your Set-1 result — ' +
  '1-5 reps→5x1 · 6-10→5x2 · 11-15→5x3 · 16-20→5x4 · 21+→5x5'

// feat/day-layout-engine — Linemen's pack for the purpose-built 3/4/5/6-day
// Collision templates (dayLayoutEngine.js). Every exercise name below is
// reused verbatim from the pre-existing hand-written day content; ACC_CORE
// now routes through the shared, already-phase-rotating coreBlock() (every
// other archetype in this file already does this — Collision's own ad hoc
// core lines, e.g. the old "Plate Overhead Sit-Ups," are the one thing
// this migration deliberately does NOT carry forward, since coreBlock is
// strictly richer and already-established shared machinery). PLYO on the
// 5-day bonus day now phase-varies via the existing phasePlyo() instead of
// a fixed, non-varying Box Jumps/Broad Jumps pair. A handful of lines from
// the old day content don't have a corresponding slot in the new templates
// (DB Suitcase Carries on the old Day 3, the old Upper C's Lateral Raise/
// Bicep Curls/Tricep Pushdowns) — the new templates are deliberately
// leaner, purpose-built structures, not a 1:1 re-slotting of every old
// line; the carry-family volume these dropped lines represented is still
// present via the finisher engine's own Energy family (Farmer Carries/
// Loaded Carry Mix, already in LINEMEN_FINISHERS).
const LINEMEN_PACK = {
  warmupLower: LINEMEN_WU_LOWER,
  warmupUpper: LINEMEN_WU_UPPER,
  finisherBank: LINEMEN_FINISHERS,
  byFocus: {
    'Lower Power': {
      MAIN_OLY: { name: 'Power Clean', suffix: ' (from floor, catch quarter squat)' },
      MAIN_SQUAT: { name: 'Front Squat', suffix: ' (full ROM)' },
      ACC_HINGE: 'Barbell RDL: 3x8',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 3x6 each leg',
    },
    // Focus labels are reused across day-count templates whenever the
    // slot composition is genuinely the same (e.g. every "Lower Power" day
    // across 3/4/5/6-day) — but "Upper Strength" and "Lower Strength"
    // aren't identical between the 3-day and 4-day templates (3-day's
    // "Lower Strength" is a hinge day; 4-day's is a squat day), so this
    // entry carries the UNION of tags either template might request under
    // that label. A tag a given day-count's template doesn't actually use
    // is simply never looked up — harmless.
    'Upper Strength': {
      // Standing BB OHP is this day's ONLY pressing lift (no separate
      // bench elsewhere in the session), so it gets the same wave-loaded,
      // open-rep-window main-lift treatment as Front/Back Squat and Close
      // Grip Bench — the MAIN_PRESS_V slot, not just another accessory.
      MAIN_OLY: { name: 'Single Arm DB Split Jerk', suffix: ', each arm' },
      MAIN_PRESS_V: 'Standing BB OHP',
      ACC_PULL_V: LINEMEN_AMRAP_PULLUP,
      ACC_PRESS: 'Single Arm DB Bench: 3x10 each arm',
      ACC_PULL_H: 'Inverted BB Row: 2x5 + 1 AMRAP',
      ACC_SHOULDER: 'Band Pull-Aparts: 3x20', // 3-day only
    },
    'Lower Strength': {
      MAIN_OLY: { name: 'Hang Clean Above the Knee', suffix: ' (start at hip crease, hinge to above kneecaps, explode)' },
      MAIN_SQUAT: { name: 'Back Squat', suffix: ' (full ROM)' },
      MAIN_HINGE: 'Trap Bar Deadlift', // 3-day only
      ACC_SQUAT: 'Goblet Lateral Lunge: 3x4 each leg', // 3-day only
      ACC_HINGE: 'Single Leg RDL: 3x8 each leg (2 DB)',
      ACC_UNILATERAL_LOWER: 'DB Step-Ups: 2x6 each leg (box below knee)',
      ACC_CALF_GRIP: 'Single Leg Calf Raise: 2x10 each leg',
    },
    'Upper Power': {
      MAIN_OLY: 'BB Split Jerk',
      MAIN_PRESS_H: { name: 'Close Grip Bench Press', suffix: ' (hands at shoulder width)' },
      ACC_PULL_H: 'Bent Over BB Row: 3x10',
      ACC_PRESS: 'Seated Single Arm DB Overhead Press: 3x10 each arm',
      ACC_PULL_V: 'Seated Cable Lat Pulldown: 3x12 (underhand grip)',
    },
    // 5-day bonus — same "Power, Athleticism & Armor" identity as before,
    // now with a real dedicated (heavier) neck dose per the day's own
    // NECK override, phase-varying plyo, and the finisher engine (rather
    // than fixed Sled Push/Loaded Carry Mix text) supplying the day's
    // conditioning — that content already lives in LINEMEN_FINISHERS.energy.
    'Power, Athleticism & Armor': {
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
      MED_BALL: 'Med Ball Chest Pass: 4x8',
      ACC_CALF_GRIP: 'Grip Work: 2 sets',
      NECK: COLLISION_NECK_DEDICATED,
    },
    // 6-day Lower C/Upper C — same identity/vocabulary as before, mapped
    // onto the new, leaner 4-slot structure.
    'Lower — Posterior Chain & Athletic': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 3x8 each leg',
      ACC_POSTERIOR: 'Hip Thrust: 3x10',
      ACC_CALF_GRIP: 'Farmer Carries: 3x30 yds',
    },
    'Upper — Hypertrophy & Armor': {
      ACC_PRESS: (ctx) => `${weeklyVariant(ctx.week, 'Incline DB Press: 3x10', 'Weighted Dips: 3x10')}`,
      ACC_PULL_H: 'Chest Supported Row: 3x12',
      ACC_SHOULDER: 'Face Pulls: 3x15',
    },
  },
}

function generateLinemenWeeks(daysPerWeek = 4, mg = false) {
  return applyCollisionMgWrapper(generateCollisionWeeksFromPack(LINEMEN_PACK, daysPerWeek, mg), mg)
}

// ─── Day Layout Engine wiring: Speed/Power archetype
// (feat/day-layout-engine) ───────────────────────────────────────────────
// Same "pack supplies tag->exercise, shared renderer supplies the math"
// split as Field/Collision/Rotational above. hasArmCare is always false
// for this whole archetype (none of Football Skill/Hybrid/Track Sprinters/
// Basketball Guards are throwing/overhead positions — matches every
// existing *Finisher() wrapper's own hardcoded `hasArmCare: false`).
//
// Note the archetype's own reversed press assignment vs Collision/Field/
// Rotational: "Upper Strength" wants MAIN_PRESS_V here, "Upper Power"
// wants MAIN_PRESS_H — the opposite of every other archetype. And unlike
// Collision/Field, this archetype's own "Lower Explosion & Speed" day
// wants MAIN_HINGE, not a second squat — every migrated sport's own
// existing hinge lift already sits there with no conformance fix needed.
function buildSpeedPowerRenderers(pack) {
  function mainEntry(focusLabel, tagName) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (!entry) throw new Error(`Speed/Power pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'string' ? { name: entry, suffix: '' } : { name: entry.name, suffix: entry.suffix || '' }
  }
  function accEntry(focusLabel, tagName, ctx) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (entry === undefined) throw new Error(`Speed/Power pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'function' ? entry(ctx) : entry
  }

  const renderers = {}
  for (const tagName of ['MAIN_SQUAT', 'MAIN_HINGE', 'MAIN_PRESS_H', 'MAIN_PRESS_V']) {
    renderers[tagName] = (slotDef, ctx) => {
      const { name, suffix } = mainEntry(ctx.dayTemplate.focus, tagName)
      const r = mainLiftTopReps(ctx.phaseNum, pack.mainLiftTier || 'power')
      // Basketball Bigs' own pre-existing design: a top-set percentage
      // boosted +5% (capped 93%) over every other sport's own ctx.pct —
      // "heavier top set," applied uniformly to every main lift.
      const topPct = pack.mainLiftPct ? pack.mainLiftPct(ctx) : ctx.pct
      return `${name}: ${ctx.ramp}, ${topPct}×${r}${suffix}`
    }
  }
  for (const tagName of [
    'ACC_SQUAT', 'ACC_HINGE', 'ACC_UNILATERAL_LOWER', 'ACC_POSTERIOR',
    'ACC_PULL_H', 'ACC_PULL_V', 'ACC_PRESS', 'ACC_SHOULDER', 'ACC_CALF_GRIP',
    'PLYO', 'SPEED', 'MED_BALL',
  ]) {
    renderers[tagName] = (slotDef, ctx) => {
      const packChoice = accEntry(ctx.dayTemplate.focus, tagName, ctx)
      return varietyEngine.resolveFiller('speedpower', slotDef, tagName, ctx, packChoice)
    }
  }
  renderers.ACC_CORE = () => null
  // Same dedup guard as Collision/Rotational/Field's own ACC_SHOULDER —
  // for a hasArmCare:true sport (Volleyball, the one Speed/Power-templated
  // sport with a real overhead/throwing-adjacent demand) the finisher
  // engine's own 'arm' family already renders real shoulder-health content,
  // so an inline ACC_SHOULDER slot would risk duplicating it.
  if (pack.hasArmCare) renderers.ACC_SHOULDER = () => null
  if (pack.warmupLower || pack.warmupUpper) {
    renderers.WARMUP = (ctx) => {
      const lu = dayLayoutEngine.dayLowerOrUpper(ctx.dayTemplate)
      if (lu === 'lower') return pack.warmupLower || null
      if (lu === 'upper') return pack.warmupUpper || null
      return null
    }
  }
  renderers.FINISHER = (dayIndex, ctx) => {
    // Structural day layout (dayLayoutEngine's own 'speedpower' template)
    // is shared by two DIFFERENT finisher-engine archetype weightings:
    // Football Skill/Hybrid/Track Sprinters/Basketball Guards use
    // 'speedpower' itself; Basketball Wings/Bigs/Volleyball/Track Jumpers
    // (the "Vertical/Court" group — no separate structural template of
    // their own, per spec) use 'vertical' instead. Defaults to
    // 'speedpower' so every existing pack is unaffected.
    const finisherArchetype = pack.finisherArchetype || 'speedpower'
    const plan = finisherEngine.planWeekFinishers(finisherArchetype, ctx.phaseNum, ctx.days, { hasArmCare: !!pack.hasArmCare, overrides: pack.finisherOverrides || null })[dayIndex]
    return finisherEngine.renderFinisher(pack.finisherBank, plan, ctx.phaseNum, ctx.deload)
  }
  return renderers
}

// Generates all 16 weeks for one Speed/Power-archetype sport at a given
// day count, entirely from its pack. `phases` is that sport's own phase
// table, run through the same shared getPhaseInfo every non-Collision
// sport already uses. `pack.mainLiftTier` defaults to 'power' (Change 1's
// 6/5/4/3 tier, matching Football Skill/Hybrid's own pre-existing choice)
// — Basketball Guards overrides to 'rotational' (8/6/5/4), its own
// pre-existing tier.
function generateSpeedPowerWeeksFromPack(pack, phases, daysPerWeek) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = getPhaseInfo(w, phases)
    const ctx = { ...info, days: Math.max(2, Math.min(6, daysPerWeek)) }
    let sessions = dayLayoutEngine.buildWeekSessions('speedpower', ctx.days, buildSpeedPowerRenderers(pack), ctx)
    if (pack.displayFocus) {
      sessions = sessions.map(s => ({ ...s, focus: pack.displayFocus[s.focus] || s.focus }))
    }
    weeks.push({
      week_number: w,
      objective: info.deload
        ? `Phase ${info.phaseNum} — Deload (${info.pct}) · Week ${info.wip} of 4`
        : `Phase ${info.phaseNum} — ${info.phaseLabel} (${info.pct}) · Week ${info.wip} of 4`,
      sessions,
    })
  }
  return weeks
}

// Football Skill/Hybrid's shared finisher content — Speed/Power archetype,
// arm care OFF (not throwing positions — QB is the one football exception,
// see FOOTBALL_QB_FINISHERS below). One shared bank for both positions
// (same archetype, same sport-level vocab — "position overrides
// differentiate by weighting," and neither needs one here). Sprint reuses
// the sport-wide Sprint Work vocabulary (previously the fixed, non-phase-
// varying SPRINT_SKILL suffix on skill/hybrid's own Day 1/3 — now properly
// phase-progressive and deload-safe instead); Energy reuses FB_DAY5's own
// Pro Agility Drill/300 Yard Shuttle; Rotation uses the already-vetted Med
// Ball Rotational Throw. Core reuses the shared coreBlock verbatim. No
// `arm` entry — `hasArmCare: false` guarantees it's never selected.
const FOOTBALL_SKILL_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Sprint Work: 4x10 yds'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Sprint Work: 6x10 yds · 4x20 yds'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Sprint Work: 8x10 yds · 6x20 yds'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Sprint Work: 6x20 yds · 4x40 yds @ 95%'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Sprint Work: 4x20 yds @ 95% (full recovery)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['300 Yard Shuttle: 1x1 (90 sec rest)'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Pro Agility Drill: 4x1'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Pro Agility Drill: 6x1'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['300 Yard Shuttle: 3x1 (90 sec rest)'] }
    return { subtitle: 'Reduced', lines: ['Pro Agility Drill: 3x1'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Med Ball Rotational Throw: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
}

function fbSkillFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('speedpower', info.phaseNum, 4, { hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(FOOTBALL_SKILL_FINISHERS, plan, info.phaseNum, info.deload)
}

// feat/day-layout-engine — Football Skill's pack. Push Press (Day 4's own
// explosive, non-ramped vertical-press accessory) promotes to the ramped
// MAIN_PRESS_V "Upper Strength" wants — the archetype's own reversed V/H
// assignment means this is a genuinely natural fit (Push Press already IS
// a vertical press pattern), not an artificial swap. Bench Press (already
// ramped) simply moves from Day 2 to "Upper Power"'s MAIN_PRESS_H. Power
// Clean/Hang Clean drop (no MAIN_OLY tag in this archetype, same as
// Rotational's own precedent). Med Ball Chest Pass has no slot on "Upper
// Power" (no MED_BALL there) — dropped.
const FB_SKILL_PACK = {
  finisherBank: FOOTBALL_SKILL_FINISHERS,
  warmupLower: WU_LOWER.trimEnd(),
  warmupUpper: WU_UPPER.trimEnd(),
  byFocus: {
    'Lower Power & Speed': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
    },
    'Upper Strength': {
      MAIN_PRESS_V: 'Push Press',
      MAIN_PRESS_H: 'Bench Press', // 3-day
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm', // 3-day
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
    'Lower Explosion & Speed': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      // Single Leg RDL (not Hip Thrust) — matches the archetype's own
      // ACC_HINGE precedent and keeps applyHamstringAdjustments' Single
      // Leg RDL -> Hip Thrust hamstring-injury substitution reachable.
      ACC_POSTERIOR: 'Single Leg RDL: 4x8 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum), // 3-day
    },
    'Upper Power': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Bent Over BB Row: 4x8',
      ACC_PRESS: 'DB Incline Press: 4x10',
    },
    'Reactive Speed': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
    },
    'Upper Armor': {
      ACC_PRESS: 'DB Incline Press: 4x10',
      ACC_PULL_H: 'Bent Over BB Row: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
  },
}

// Hybrid — same shape as Skill; Sled Push (Day 1) and the neck block
// (Day 2/4) have no slot (no ACC_CALF_GRIP-adjacent extra on "Lower Power
// & Speed", and this archetype's templates carry no NECK tag at all) and
// are dropped. Incline DB Press (vs. Skill's DB Incline Press) is the one
// genuine, pre-existing wording difference between the two positions,
// preserved.
const FB_HYBRID_PACK = {
  ...FB_SKILL_PACK,
  byFocus: {
    ...FB_SKILL_PACK.byFocus,
    'Upper Power': { ...FB_SKILL_PACK.byFocus['Upper Power'], ACC_PRESS: 'Incline DB Press: 4x8' },
    'Upper Armor': { ...FB_SKILL_PACK.byFocus['Upper Armor'], ACC_PRESS: 'Incline DB Press: 4x8' },
  },
}

// QB's own finisher content — Rotational/Throwing archetype (same tier as
// Baseball/Tennis/Golf/Softball — QB already used the 'rotational' rep
// tier for its main lifts before this), arm care ON — the one football
// position that's genuinely a throwing position. Sprint/Energy reuse the
// same sport-wide vocabulary skill/hybrid's bank uses; Rotation/Arm reuse
// QB's own existing Day 2/4 vocabulary (Med Ball Rotational Throw, Band
// External Rotation, YTW Shoulder Series). Core reuses the shared
// coreBlock verbatim.
const FOOTBALL_QB_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Sprint Work: 4x10 yds'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Sprint Work: 6x10 yds · 4x20 yds'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Sprint Work: 8x10 yds · 6x20 yds'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Sprint Work: 6x20 yds · 4x40 yds @ 95%'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Sprint Work: 4x20 yds @ 95% (full recovery)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['300 Yard Shuttle: 1x1 (90 sec rest)'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Pro Agility Drill: 4x1'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Pro Agility Drill: 6x1'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['300 Yard Shuttle: 3x1 (90 sec rest)'] }
    return { subtitle: 'Reduced', lines: ['Pro Agility Drill: 3x1'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Landmine Press: 3x8 each arm'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
  arm(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Band External Rotation: 2x15 each arm'] }
    if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: ['Band External Rotation: 4x15 each arm', 'YTW Shoulder Series: 3x10 each'] }
    if (ph === 2) return { subtitle: 'Modest Increase', lines: ['Band External Rotation: 4x15 each arm'] }
    if (ph === 3) return { subtitle: 'Maintenance', lines: ['YTW Shoulder Series: 3x10 each'] }
    return { subtitle: 'Readiness', lines: ['Band External Rotation: 3x15 each arm'] }
  },
}

// feat/day-layout-engine — QB's pack. hasArmCare:true (real throwing
// demand) — ACC_SHOULDER slots defer to the finisher engine's own arm
// family, same as Tennis. QB's own day names already match two of the
// generic template labels verbatim ('Upper & Shoulder Health', and 'Upper
// & Rotational' happens to equal the 3-day template's own label too), so
// no displayFocus override is needed there; 'Lower'/'Lower Explosion' do
// need one. Old fixed "Hang Clean: 3x3"/"Power Clean: 4x3" drop (no
// MAIN_OLY slot); Push Press (a second, redundant vertical press on the
// same day as Overhead Press) drops in favor of Overhead Press filling
// MAIN_PRESS_V; phasePlyo/Single Leg Calf Raise don't have a slot on the
// 4-day "Lower Explosion" day either (no PLYO/calf-grip slot there).
const FOOTBALL_QB_PACK = {
  finisherBank: FOOTBALL_QB_FINISHERS,
  hasArmCare: true,
  warmupLower: WU_LOWER.trimEnd(),
  warmupUpper: WU_UPPER.trimEnd(),
  displayFocus: {
    'Lower Power': 'Lower',
    'Lower Strength': 'Lower Explosion',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
    },
    'Upper & Shoulder Health': {
      // feat/superset-ohp-fixes — no barbell Overhead Press: QB is a
      // throwing sport (same throwing-shoulder-health rationale already
      // applied to Baseball/Softball). Landmine Press (angled, no direct
      // overhead loading) fills the vertical-press slot instead, same
      // substitute and phrasing as Baseball's PITCHER_PACK.
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper & Rotational': { // shared literal key — matches BOTH the
      // 3-day template's own label AND QB's own 4-day Day 2 name.
      MAIN_PRESS_H: 'DB Bench',
      ACC_PULL_H: 'Bent Over BB Row: 4x8',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Lower Strength': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_SQUAT: 'Goblet Squat: 4x10',
      ACC_POSTERIOR: 'Hip Thrust: 4x8', // 4-day
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Upper Power & Rotational': {
      MAIN_PRESS_H: 'DB Bench',
      ACC_PULL_H: 'Bent Over BB Row: 4x8',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
    },
    'Shoulder Health & Power Accessory': {
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Vertical Press Emphasis': {
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Horizontal Press Emphasis': {
      MAIN_PRESS_H: 'DB Bench',
      ACC_PULL_H: 'Bent Over BB Row: 4x8',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_POSTERIOR: 'Hip Thrust: 4x8',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Arm-Care Emphasis': {
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
    },
  },
}

function generateQBWeeks(daysPerWeek, mg = false) {
  const phases = mg ? MG_PHASES : FB_PHASES
  const weeks = generateRotationalWeeksFromPack(FOOTBALL_QB_PACK, phases, daysPerWeek)
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

const FB_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Speed & Conditioning',
  description: `Sprint Work: 6x40 yds @ max effort\nPro Agility Drill: 6x1\n300 Yard Shuttle: 3x1 (90 sec rest)\nSled Push: 4x20 yds\n${coreBlock(info.phaseNum)}`,
})
const FB_DAY6 = {
  day: 'Day 6', focus: 'Active Recovery & Mobility',
  description: `Foam Roll: Full body — 15 minutes\nDynamic Stretch: Hip Flexors · Hamstrings · Thoracic\nBand Work: Pull-Aparts 3x20 · External Rotation 3x15 each arm\nCore Maintenance: Plank 3x60s · Dead Bug 3x10 each side`,
}

function generateFootballWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  // Linemen (and the position default for any unrecognized posId) route to
  // the rebuilt, source-faithful linemen generator for BOTH goals —
  // feat/blueprint-cleanup wired generateLinemenWeeks' own mg path onto the
  // same generateCollisionWeeksFromPack orchestrator/autoregulated Oly
  // lifts/finisher engine, so muscle-gain linemen no longer needs (or gets)
  // the older, pre-archetype fbLinemenMGSess fallback. Skill/hybrid/qb are
  // unaffected either way — they already had a modern mg path.
  if (posId !== 'skill' && posId !== 'hybrid' && posId !== 'qb') {
    return generateLinemenWeeks(daysPerWeek, mg)
  }
  // QB (Rotational/Throwing archetype) now routes through its own
  // purpose-built day-layout pack, day-count-aware for all of 3/4/5/6
  // days — see generateQBWeeks/FOOTBALL_QB_PACK above.
  if (posId === 'qb') return generateQBWeeks(daysPerWeek, mg)
  // Skill/Hybrid (Speed/Power archetype) now route through their own
  // purpose-built day-layout packs, day-count-aware for all of 3/4/5/6
  // days — see FB_SKILL_PACK/FB_HYBRID_PACK above. FB_DAY5/FB_DAY6 (the
  // old generic bolt-on days) are retired in favor of each pack's own
  // "Reactive Speed"/"Upper Armor" purpose-built days.
  const phases = mg ? MG_PHASES : FB_PHASES
  const packs = { skill: FB_SKILL_PACK, hybrid: FB_HYBRID_PACK }
  const weeks = generateSpeedPowerWeeksFromPack(packs[posId], phases, daysPerWeek)
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

// ─── Basketball ───────────────────────────────────────────────────────────────

// Guards — Speed/Power archetype (first-step quickness, perimeter defense),
// arm care OFF (redistributed — guards get shoulder work from normal
// lifting, not throwing/overhead athletes). Sprint/Energy absorb what were
// previously fixed, non-phase-varying blocks (Defensive Slide Sprint on
// Day 1, the "Court Conditioning" block on Day 4) into proper phase
// progression + deload safety. Rotation reuses the cross-sport Med Ball
// Rotational Throw vocabulary (no existing basketball-specific rotational
// movement to anchor to). Core reuses the shared coreBlock verbatim.
const BASKETBALL_GUARD_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Defensive Slide Sprint: 2x20 yds each direction'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Defensive Slide Sprint: 4x20 yds each direction'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Defensive Slide Sprint: 6x20 yds each direction'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Baseline Sprint: 8x1'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Baseline Sprint: 4x1 (full recovery)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['17s Drill: 2x1 (17 second target)'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['17s Drill: 3x1 (17 second target)'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['17s Drill: 4x1 (17 second target)'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Full Court Sprint: 6x1'] }
    return { subtitle: 'Reduced', lines: ['17s Drill: 2x1 (17 second target)'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Med Ball Rotational Throw: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
}

function bbGuardFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('speedpower', info.phaseNum, 4, { hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(BASKETBALL_GUARD_FINISHERS, plan, info.phaseNum, info.deload)
}

// feat/day-layout-engine — Guards' pack. mainLiftTier: 'rotational'
// (Guards' own pre-existing 8/6/5/4 tier, distinct from Football Skill/
// Hybrid's 'power' tier). Guards' original content doesn't split cleanly
// into the archetype's 2-lower/2-upper shape — Day 2 ("Upper") carries
// ALL the upper-body content (with no genuine ramped press at all: DB
// Bench and Overhead Press were both fixed/flat), while Day 4's "Full
// Body Power" is entirely lower-body work with no upper content and no
// template slot of its own (Day 1/Day 3 already cover both lower slots).
// Resolved by promoting DB Bench (horizontal) and Overhead Press
// (vertical) — Day 2's own two fixed press accessories — into the
// archetype's two genuinely-ramped MAIN_PRESS slots, splitting Day 2's
// pull accessories across both upper days; Day 4's own lower-body content
// (Front Squat/Hip Thrust/Single Leg RDL) has no home anywhere in the
// new 2-lower/2-upper structure and is dropped. Power Clean/Hang Clean
// drop (no MAIN_OLY tag in this archetype).
const BB_GUARDS_PACK = {
  finisherBank: BASKETBALL_GUARD_FINISHERS,
  mainLiftTier: 'rotational',
  byFocus: {
    'Lower Power & Speed': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Lateral Step-Up: 4x8 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `DB Squat Jumps: ${explosiveSets(4, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_V: 'Overhead Press',
      MAIN_PRESS_H: 'DB Bench', // 3-day
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm', // 3-day
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
    'Lower Explosion & Speed': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      // Single Leg RDL — matches every other ACC_POSTERIOR fill in this
      // archetype and keeps applyHamstringAdjustments' own substitution
      // reachable (its own original Day 4 carried this line too, before
      // that whole day was retired for having no template slot).
      ACC_POSTERIOR: 'Single Leg RDL: 4x8 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => bballPlyo(ctx.phaseNum), // 3-day
    },
    'Upper Power': {
      MAIN_PRESS_H: 'DB Bench',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm',
      ACC_PRESS: 'Push-up: 4xAMAP',
    },
    'Reactive Speed': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => bballPlyo(ctx.phaseNum),
    },
    'Upper Armor': {
      ACC_PRESS: 'Push-up: 4xAMAP',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
  },
}

// Wings — Vertical/Court archetype (landing mechanics + repeat-explosive
// court demand), arm care OFF. Sprint/Energy absorb wings' existing
// "Court Conditioning" vocabulary (Baseline Sprint / Baseline Defensive
// Slide / Sprint + Close Out) into proper phase progression. Rotation
// reuses Med Ball Rotational Throw, same as guards. Core reuses coreBlock.
const BASKETBALL_WING_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Baseline Sprint: 2x1'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Baseline Sprint: 4x1'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Baseline Sprint: 6x1'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Full Court Sprint: 6x1'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Baseline Sprint: 3x1 (full recovery)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Baseline Defensive Slide: 2x1'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Baseline Defensive Slide: 3x1'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Sprint + Close Out: 4 rounds'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Sprint + Close Out: 6 rounds'] }
    return { subtitle: 'Reduced', lines: ['Baseline Defensive Slide: 2x1'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Med Ball Rotational Throw: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
}

function bbWingFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('vertical', info.phaseNum, 4, { hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(BASKETBALL_WING_FINISHERS, plan, info.phaseNum, info.deload)
}

// feat/day-layout-engine — Wings' pack (Vertical/Court archetype — no
// structural template of its own; uses Speed/Power's own structure per
// spec, with 'vertical' as the finisher-engine archetype weighting
// instead). Same structural mismatch/resolution as Guards: Day 2 carries
// every upper accessory (three flat presses — DB Bench, DB Chest Press,
// Overhead Press — none ramped); Day 4 is entirely lower-body with no
// template slot. Overhead Press promotes to MAIN_PRESS_V, DB Bench to
// MAIN_PRESS_H; DB Chest Press (varied grip) becomes "Upper Power"'s
// ACC_PRESS. Power Clean/Hang Clean drop (no MAIN_OLY tag).
const BB_WINGS_PACK = {
  finisherBank: BASKETBALL_WING_FINISHERS,
  finisherArchetype: 'vertical',
  mainLiftTier: 'rotational',
  byFocus: {
    'Lower Power & Speed': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x5 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => bballPlyo(ctx.phaseNum),
    },
    'Upper Strength': {
      MAIN_PRESS_V: 'Overhead Press',
      MAIN_PRESS_H: 'DB Bench', // 3-day
      ACC_PULL_V: 'Weighted Pull-ups: 4x5',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm', // 3-day
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
    'Lower Explosion & Speed': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_POSTERIOR: 'Single Leg RDL: 4x8 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => bballPlyo(ctx.phaseNum), // 3-day
    },
    'Upper Power': {
      MAIN_PRESS_H: 'DB Bench',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm',
      ACC_PRESS: 'DB Chest Press (varied grip): 4x10',
    },
    'Reactive Speed': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => bballPlyo(ctx.phaseNum),
    },
    'Upper Armor': {
      ACC_PRESS: 'DB Chest Press (varied grip): 4x10',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
  },
}

// Bigs — Vertical/Court archetype, arm care OFF. Sprint/Energy absorb
// bigs' existing "Post Conditioning" vocabulary (Post Sprint / Box Out
// Drill / Shuffle Step) into proper phase progression. Rotation reuses
// Med Ball Rotational Throw. Core reuses coreBlock.
const BASKETBALL_BIG_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Post Sprint: 2x1 (half court · full stop)'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Post Sprint: 4x1 (half court · full stop)'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Post Sprint: 6x1 (half court · full stop)'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Shuffle Step: 6x full court'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Post Sprint: 3x1 (half court · full stop)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Box Out Drill: 1 minute'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Box Out Drill: 2 minutes'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Box Out Drill: 3 minutes'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Shuffle Step: 4x full court'] }
    return { subtitle: 'Reduced', lines: ['Box Out Drill: 2 minutes'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Med Ball Rotational Throw: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
}

function bbBigFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('vertical', info.phaseNum, 4, { hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(BASKETBALL_BIG_FINISHERS, plan, info.phaseNum, info.deload)
}

// feat/day-layout-engine — Bigs' pack (Vertical/Court archetype, same
// 'vertical' finisher weighting as Wings). Bigs' original day order
// already splits 2-lower/2-upper cleanly (Day 4's own Close Grip Bench
// Press is genuinely ramped and genuinely upper-body, unlike Guards/
// Wings' own Day 4) — only the usual reversed-V/H promotion applies:
// Overhead Press (Day 2, flat) promotes to MAIN_PRESS_V; Close Grip Bench
// Press (Day 4, already ramped) fills MAIN_PRESS_H; DB Bench (Day 2,
// flat) becomes "Upper Power"'s ACC_PRESS. mainLiftPct preserves Bigs'
// own pre-existing +5%-boosted (capped 93%) top-set percentage — a real,
// deliberate "heavier top set" design choice, not something this
// migration should flatten to every other sport's plain ctx.pct.
const BB_BIGS_PACK = {
  finisherBank: BASKETBALL_BIG_FINISHERS,
  finisherArchetype: 'vertical',
  mainLiftTier: 'rotational',
  mainLiftPct: (ctx) => pct(Math.min(0.93, ctx.f + 0.05)),
  byFocus: {
    'Lower Power & Speed': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `DB Squat Jumps: ${explosiveSets(3, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_V: 'Overhead Press',
      MAIN_PRESS_H: 'Close Grip Bench Press', // 3-day
      ACC_PULL_V: 'Weighted Pull-ups: 5x5',
      ACC_PULL_H: 'BB Row: 4x8', // 3-day
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
    'Lower Explosion & Speed': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_POSTERIOR: 'Single Leg RDL: 4x8 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => bballPlyo(ctx.phaseNum), // 3-day
    },
    'Upper Power': {
      MAIN_PRESS_H: 'Close Grip Bench Press',
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PRESS: 'DB Bench: 5x8',
    },
    'Reactive Speed': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => bballPlyo(ctx.phaseNum),
    },
    'Upper Armor': {
      ACC_PRESS: 'DB Bench: 5x8',
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
  },
}

const BB_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Court Conditioning',
  description: `17s Drill: 4x1 (17 second target)\nFull Court Sprint: 8x1\nDefensive Slide: 4x full court\nSprint + Close Out: 6 rounds\n${coreBlock(info.phaseNum)}`,
})
const BB_DAY6 = {
  day: 'Day 6', focus: 'Active Recovery',
  description: `Foam Roll: Quads · IT Band · Calves — 15 minutes\nBalance Work: Single Leg Stand 3x30s each leg\nBand Work: Hip Flexor · External Rotation — 2x15 each\nStatic Stretch: Hip Flexors · Hamstrings · Hip Internal Rotation`,
}

// feat/day-layout-engine — all 3 positions now route through the shared
// Speed/Power day-layout wiring (Guards on 'speedpower', Wings/Bigs on
// 'vertical' — the Vertical/Court group's own finisher weighting, no
// separate structural template of its own, per spec). BB_DAY5/BB_DAY6
// (the old generic bolt-on days) are retired in favor of each pack's own
// purpose-built "Reactive Speed"/"Upper Armor" days.
function generateBasketballWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : BB_PHASES
  const packs = { guards: BB_GUARDS_PACK, wings: BB_WINGS_PACK, bigs: BB_BIGS_PACK }
  const pack = packs[posId] || BB_GUARDS_PACK
  const weeks = generateSpeedPowerWeeksFromPack(pack, phases, daysPerWeek)
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

// ─── Repeat-Sprint/Field Athlete archetype core (feat/archetype-repeat-sprint) ─
// Extracted from Soccer, this archetype's benchmark (see the Blueprint
// Architecture Audit — Soccer already rated 4/5 across all 6 positions
// before this work, the most evenly-built archetype in the system). Unlike
// Collision/Max-Strength (extracted from Linemen), this archetype's core
// math was ALREADY fully shared engine machinery before this extraction —
// mainLiftTopReps' 'rotational' tier, explosiveSets/explosiveIntent, and
// coreBlock are the exact same functions baseball/basketball/football QB
// already use, and the day-count/deload/phase cadence already runs through
// the fully generic getPhaseInfo/buildWeeksDynamic every non-Collision sport
// uses. So there is no bespoke rep-scheme or autoregulation math to pull out
// the way Linemen had — the genuine, extractable "archetype core" here is
// smaller and structural: the WEEKLY TEMPLATE every Repeat-Sprint/Field
// sport below follows, plus one small real helper (sprintYardsForPhase).
//
// The weekly template (every sport below, every position, every day count
// this archetype covers):
//   Day 1 (Monday)    — Lower Strength/Power: one ramped main lift + a
//                        posterior-chain/unilateral accessory pool + one
//                        explosiveSets-scaled explosive/lateral line +
//                        coreBlock(phaseNum).
//   Day 2 (Tuesday)   — Upper, no ramped lift at all (this archetype is
//                        deliberately less gym-lift-dense than Collision —
//                        see the default, un-raised accessory cap below) —
//                        plain accessory presses/rows + shoulder-health/
//                        rotational work. No coreBlock — this day is the
//                        one exception to "every lifting day ends in core."
//   Day 3 (Thursday)  — Lower Explosion: a SECOND ramped main lift (usually
//                        a hinge variant — Hex Bar or Trap Bar Deadlift) +
//                        lateral/COD-specific accessory work +
//                        coreBlock(phaseNum).
//   Day 4 (Friday)    — Pure Speed & Conditioning: no lifting at all —
//                        sprint ladders, shuttles, flying sprints, scaled
//                        by phase via that sport's own sprintYardsForPhase
//                        progression. No coreBlock.
// Real weekday labels (not "Day 1-4") on purpose — a field sport's training
// week is organized around competition day, not just gym frequency; this
// carries through as an archetype-level convention for every sport below,
// same as Soccer's own. 5th/6th extra days (where a sport has them) revert
// to generic "Day 5"/"Day 6" labels, matching Soccer's own precedent exactly.
//
// The accessory cap is deliberately NOT raised (see resolveAccessoryCapKey —
// no Repeat-Sprint/Field sport gets an entry there) — every sport below
// resolves to the sport-wide default cap of 3, a genuine, intentional
// archetype trait distinguishing it from Collision/Max-Strength's raised
// cap of 5: this archetype is conditioning-forward, not lift-volume-forward.

// Indexes a sport's own sprint-yardage-by-phase array — e.g. Foundation
// (phase 1) uses the shortest yardage, Peak (phase 3) the longest, matching
// every Repeat-Sprint/Field sport's own real progression. The single small
// piece of genuinely shared math this archetype needed (every sport below
// was reimplementing the identical `Math.min(3, phaseNum - 1)` indexing
// inline before this extraction).
function sprintYardsForPhase(yards, phaseNum) {
  return yards[Math.min(yards.length - 1, phaseNum - 1)]
}

// ─── Finisher structure (added post-launch — see the PR #20 review) ───────
// Every Repeat-Sprint/Field day now ends in a finisher, and the finisher's
// TYPE alternates day to day: Monday/Thursday close with a phase-varying
// Conditioning block, Tuesday/Friday close with a phase-varying Core block
// (two distinct variants of each, so a week's two Conditioning days — and
// its two Core days — never repeat the same content). This section owns
// the shared STRUCTURE only — the phase-intent labels, the volume-arc math,
// and the exempt-header formatting (see COLLISION_NECK/coreBlock's own
// "Core — ...:" convention above, now joined by "Conditioning — ...:",
// recognized the identical way in organizeSessionDescription/
// applyDeloadVolumeReduction). Every sport below still authors its OWN
// drill names inside that structure — nothing here hardcodes an exercise.

// The same 4 labels every sport's Conditioning finisher uses, matching the
// archetype's own defined phase intent: Foundation is aerobic-base/higher-
// volume work, Strength adds intensity without dropping volume much,
// Power/Peak Strength shifts toward true repeat-sprint/max-effort work at
// lower volume, and the plan's own taper phase backs off further. This is
// intent-language, not a drill list — genuinely shared across the whole
// archetype the same way "Foundation/Strength/Power/Peak" phase LABELS
// already are for every sport's main lift.
const CONDITIONING_SUBTITLES = { 1: 'Aerobic Base', 2: 'Intensity Build', 3: 'Repeat Sprint', 4: 'Taper' }

// Volume arc for conditioning-finisher set/round counts — same shape as
// EXPLOSIVE_ARC above (moderate -> build -> peak -> taper) but tuned for a
// conditioning finisher specifically: Foundation runs the highest volume
// (aerobic base-building), Strength holds close to it while intensity
// climbs, Power/Peak Strength drops volume as effort quality goes up (true
// repeat-sprint work can't be high-volume by definition), Peak Taper drops
// further so the athlete enters the next block recovered.
// Wider spread than a first pass (1.15/1.0/0.80/0.60) — at the small base
// counts (3-5 sets) these conditioning finishers actually use, 1.15 vs 1.0
// round to the same integer (e.g. base 3: 3.45→3, 3.0→3), making Phase 1 and
// Phase 2 look identical even though the label changes. 1.3/1.0/0.75/0.5
// reliably separates at every base this file uses.
const CONDITIONING_ARC = { 1: 1.3, 2: 1.0, 3: 0.75, 4: 0.5 }

function conditioningSets(baseSets, phaseNum) {
  return Math.max(1, Math.round(baseSets * CONDITIONING_ARC[phaseNum]))
}

// Wraps a sport's own drill lines in the shared exempt-header format. Used
// for BOTH the 4 real phases and the deload state — deload passes its own,
// separately-authored (already-light) `lines`, not a scaled-down version of
// the phase content, so a coach reading a deload week sees an intentional,
// coherent "this is the taper" prescription rather than fractional sets.
function conditioningFinisher(subtitle, lines) {
  return `Conditioning — ${subtitle}:\n${lines.join('\n')}`
}

// Same wrapping convention for a sport-specific SECOND core variant — reuses
// the exact same "Core — ...:" header the shared, generic coreBlock() above
// already uses (no new header type needed; core was already fully generic-
// exempt everywhere). Lets a sport's second core-finisher slot in the week
// show genuinely different, sport-flavored trunk/rotational work instead of
// literally repeating coreBlock()'s own output on two different days.
function coreFinisher(subtitle, lines) {
  return `Core — ${subtitle}:\n${lines.join('\n')}`
}

// ─── Shared Finisher Engine wiring for the Field archetype (feat/finisher-
// engine) — soccer/lacrosse/hockey all route through this. Every sport
// below keeps authoring its OWN drill names (gkConditioningA/B etc., each
// sport's own Rotation/Arm anchor movement) — only the day-to-family
// assignment (which day gets Sprint vs Energy vs Core vs Rotation vs Arm,
// and each family's phase character/deload taper) now comes from the
// shared engine instead of being hardcoded per sport. ────────────────────

// Adapter — turns a "Conditioning — <Subtitle>:\n<line>\n<line>" string
// (the shape every existing per-sport conditioning function already
// returns) into the {subtitle, lines[]} shape the engine's content banks
// use. Lets the ALREADY-BUILT, already-vetted per-sport/per-position
// conditioning content (gkConditioningA, cbConditioningB, ...) plug
// straight into the engine as the Sprint and Energy families, with zero new
// content authored for those two families.
//
// `subtitles` overrides the parsed header text with family-specific phase
// language (see SPRINT_SUBTITLES/ENERGY_SUBTITLES below) — every existing
// per-sport function derives its subtitle from the SAME shared
// CONDITIONING_SUBTITLES table regardless of whether it's being used as the
// Sprint or the Energy family, so under the engine's own scheduling (which
// can now legitimately land Sprint and Energy on ADJACENT days — see
// finisherEngine.js's scheduleFamilies) two different families could
// otherwise render the identical subtitle text back to back (e.g.
// "Conditioning — Aerobic Base:" on both Monday and Tuesday). The
// underlying drill LINES are untouched either way.
function conditioningEntryFromFn(fn, ph, dl, subtitles) {
  const [header, ...lines] = fn(ph, dl).split('\n')
  const subtitle = dl ? 'Deload (Light)' : (subtitles ? subtitles[ph] : header.replace(/^Conditioning\s*—\s*/, '').replace(/:$/, ''))
  return { subtitle, lines }
}

// Family-specific phase-character subtitles (spec's own PER-FAMILY PHASE
// CHARACTER language) — Sprint: accel mechanics -> quality speed ->
// full-recovery reps. Energy: aerobic base -> intervals -> repeat-effort ->
// reduced.
const SPRINT_SUBTITLES = { 1: 'Acceleration Mechanics', 2: 'Acceleration Mechanics', 3: 'Quality Speed', 4: 'Full-Recovery Reps' }
const ENERGY_SUBTITLES = { 1: 'Aerobic Base', 2: 'Interval Work', 3: 'Repeat Effort', 4: 'Reduced' }

// Generic phase-progressive Rotation-family content, parameterized by each
// sport's own already-vetted rotational movement (e.g. Soccer's own "MB
// Twist Throw", already used on several positions' Day 2) — progresses by
// movement complexity/intent, not ball weight, per the engine spec:
// half-kneeling -> standing -> maximal velocity -> low volume/max intent.
function fieldRotationFinisher(anchorName, ph, dl) {
  if (dl) return { subtitle: 'Deload (Light)', lines: [`${anchorName}: 2x5 each side`] }
  if (ph === 1) return { subtitle: 'Half-Kneeling', lines: [`${anchorName}: 3x6 each side (half-kneeling)`] }
  if (ph === 2) return { subtitle: 'Standing', lines: [`${anchorName}: 3x6 each side`] }
  if (ph === 3) return { subtitle: 'Maximal Velocity', lines: [`${anchorName}: 4x6 each side (max intent)`] }
  return { subtitle: 'Low Volume, Max Intent', lines: [`${anchorName}: 2x6 each side (max intent)`] }
}

// Generic phase-progressive Arm-Care content, parameterized by each sport's
// own already-vetted shoulder-health anchor (e.g. "Band External Rotation",
// already used on several positions' Day 2) — capacity/scap control ->
// modest increase -> maintenance -> readiness, per the engine spec.
function fieldArmFinisher(anchorName, ph, dl) {
  if (dl) return { subtitle: 'Deload (Light)', lines: [`${anchorName}: 2x15 each arm`] }
  if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: [`${anchorName}: 3x15 each arm`, 'Face Pulls: 3x15'] }
  if (ph === 2) return { subtitle: 'Modest Increase', lines: [`${anchorName}: 3x15 each arm`] }
  if (ph === 3) return { subtitle: 'Maintenance', lines: ['Face Pulls: 4x15'] }
  return { subtitle: 'Readiness', lines: [`${anchorName}: 2x15 each arm`] }
}

// Assembles a sport's 5-family bank: Sprint/Energy reuse that sport's own
// already-built conditioning functions verbatim (see conditioningEntryFromFn
// above); Core reuses the shared coreBlock verbatim; Rotation/Arm use the
// generic phase templates above with that sport's own anchor movement name.
function fieldFinisherBank(sprintFn, energyFn, rotationAnchor, armAnchor) {
  return {
    sprint: (ph, dl) => conditioningEntryFromFn(sprintFn, ph, dl, SPRINT_SUBTITLES),
    energy: (ph, dl) => conditioningEntryFromFn(energyFn, ph, dl, ENERGY_SUBTITLES),
    core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
    rotation: (ph, dl) => fieldRotationFinisher(rotationAnchor, ph, dl),
    arm: (ph, dl) => fieldArmFinisher(armAnchor, ph, dl),
  }
}

// Same wiring shape as collisionFinisher above, just keyed to the 'field'
// archetype (soccer/lacrosse/hockey's own base weighting — see
// finisherEngine.js) instead of 'collision'. `isFieldSport: true` applies
// the Peak/Taper Energy exception (0.80 instead of 0.55) so sport-specific
// conditioning stays present into the season, per the engine spec.
// `overrides` is an optional POSITION-level weighting delta (e.g. Hockey
// Goalie's own lateral-power/hip/reactive emphasis vs. Defense's) — see the
// spec's POSITION OVERRIDES section: differentiates by weighting only,
// never by inventing new exercises per position.
// feat/finisher-engine-rollout correction — arm care is NOT universal.
// None of this archetype's sports (Soccer, Lacrosse, Rugby Backs, Hockey
// Defense/Goalie) are throwing/overhead positions; they get shoulder work
// from normal lifting. `hasArmCare: false` zeroes Arm's weight and the
// engine redistributes it proportionally into Sprint/Energy/Core/Rotation.
// Each sport's own bank below still defines an `arm` entry (dead,
// unreachable code now, same as collisionFinisher above) purely so
// nothing breaks if a future position on this archetype ever needs it
// back; the engine guarantees it's never selected while this flag is
// false.
function fieldFinisher(bank, dayIndex, days, info, overrides = null) {
  const plan = finisherEngine.planWeekFinishers('field', info.phaseNum, days, { isFieldSport: true, overrides, hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(bank, plan, info.phaseNum, info.deload)
}

// ─── Day Layout Engine wiring: Repeat-Sprint/Field archetype
// (feat/day-layout-engine) ───────────────────────────────────────────────
// Same "pack supplies tag->exercise, shared renderer supplies the math"
// split as Collision/Rotational above. Main-lift math is the same shared
// mainLiftTopReps('rotational') + each sport's own getPhaseInfo(w, ITS_OWN_
// PHASES) every non-Collision sport already uses. hasArmCare is always
// false for this whole archetype (none of Soccer/Lacrosse/Hockey Defense-
// Goalie/Rugby Backs are throwing/overhead positions — matches fieldFinisher's
// own pre-existing hardcoded `hasArmCare: false`), so ACC_SHOULDER renders
// real, generic shoulder-health content everywhere (no dedup-null needed).
//
// Squat/hinge conformance (same fix already applied across Collision):
// this archetype's own template structurally wants TWO squat days
// ("Lower Power" and "Lower Explosion" both carry MAIN_SQUAT on 4/5/6-day)
// — but every migrated sport's own "Lower Explosion"-equivalent day
// originally topped out with a HINGE lift (Hex Bar Deadlift/Trap Bar
// Deadlift), not a squat. Resolved the same way as Collision: Front Squat
// (a genuine second squat variant) fills "Lower Explosion"'s MAIN_SQUAT on
// 4/5/6-day; the sport's own original hinge lift relocates to the 3-day-
// only "Lower Explosion" template, which genuinely wants MAIN_HINGE.
//
// Vertical-press conformance (same fix already applied to Rugby Forwards/
// Hockey Forwards/Tennis/Golf/QB/Track Throwers/Baseball): "Upper Power"
// structurally wants a genuine vertical press. Every migrated sport here
// already had "Overhead Press" as a fixed, non-ramped ACCESSORY line (not
// a main lift) — promoted to the ramped MAIN_PRESS_V slot. The sport's own
// original flat/non-ramped press accessory (DB Bench Press) fills "Upper
// Strength"'s own ACC_PRESS slot instead, alongside its own genuinely-
// ramped horizontal press (Bench Press) filling MAIN_PRESS_H there.
function buildFieldRenderers(pack) {
  function mainEntry(focusLabel, tagName) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (!entry) throw new Error(`Field pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'string' ? { name: entry, suffix: '' } : { name: entry.name, suffix: entry.suffix || '' }
  }
  function accEntry(focusLabel, tagName, ctx) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (entry === undefined) throw new Error(`Field pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'function' ? entry(ctx) : entry
  }

  const renderers = {}
  for (const tagName of ['MAIN_SQUAT', 'MAIN_HINGE', 'MAIN_PRESS_H', 'MAIN_PRESS_V']) {
    renderers[tagName] = (slotDef, ctx) => {
      const { name, suffix } = mainEntry(ctx.dayTemplate.focus, tagName)
      const r = mainLiftTopReps(ctx.phaseNum, 'rotational')
      return `${name}: ${ctx.ramp}, ${ctx.pct}×${r}${suffix}`
    }
  }
  for (const tagName of [
    'ACC_SQUAT', 'ACC_HINGE', 'ACC_UNILATERAL_LOWER', 'ACC_POSTERIOR',
    'ACC_PULL_H', 'ACC_PULL_V', 'ACC_PRESS', 'ACC_SHOULDER', 'ACC_CALF_GRIP',
    'PLYO', 'SPEED', 'MED_BALL',
  ]) {
    renderers[tagName] = (slotDef, ctx) => {
      const packChoice = accEntry(ctx.dayTemplate.focus, tagName, ctx)
      return varietyEngine.resolveFiller('field', slotDef, tagName, ctx, packChoice)
    }
  }
  // Same as Collision/Rotational's own ACC_CORE — never rendered directly,
  // the finisher engine's own 'core' family already owns coreBlock()
  // content for this archetype.
  renderers.ACC_CORE = () => null
  renderers.FINISHER = (dayIndex, ctx) => {
    return fieldFinisher(pack.finisherBank, dayIndex, ctx.days, ctx, pack.finisherOverrides || null)
  }
  return renderers
}

// Generates all 16 weeks for one Field-archetype sport at a given day
// count, entirely from its pack. `phases` is that sport's own phase table
// (SOC_PHASES, HOCKEY_PHASES, RUGBY_PHASES, STD_PHASES for Lacrosse, ...),
// run through the same shared getPhaseInfo every non-Collision sport
// already uses.
function generateFieldWeeksFromPack(pack, phases, daysPerWeek) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = getPhaseInfo(w, phases)
    const ctx = { ...info, days: Math.max(2, Math.min(6, daysPerWeek)) }
    let sessions = dayLayoutEngine.buildWeekSessions('field', ctx.days, buildFieldRenderers(pack), ctx)
    if (pack.displayFocus) {
      sessions = sessions.map(s => ({ ...s, focus: pack.displayFocus[s.focus] || s.focus }))
    }
    weeks.push({
      week_number: w,
      objective: info.deload
        ? `Phase ${info.phaseNum} — Deload (${info.pct}) · Week ${info.wip} of 4`
        : `Phase ${info.phaseNum} — ${info.phaseLabel} (${info.pct}) · Week ${info.wip} of 4`,
      sessions,
    })
  }
  return weeks
}

// ─── Soccer ───────────────────────────────────────────────────────────────────

const SOC_SPRINT_YARDS = [50, 60, 70, 80]

// ── Goalkeeper conditioning: reactive/lateral (Monday) vs lateral+hip
// mobility (Thursday) — two distinct flavors of the same reactive identity.
function gkConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Lateral Shuffle: 2x20 yds', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Reactive Lateral Bound: 4x5 each side', 'Flying 20s: 4x1'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Lateral Shuffle: ${conditioningSets(5, ph)}x20 yds`, '300 Yard Shuttle: 2x2'])
}
function gkConditioningB(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Single Leg Squat Jump: 2x5 each leg', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Reactive Lateral Bound: 4x5 each side', 'Single Leg Squat Jump: 4x5 each leg'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Single Leg Squat Jump: ${conditioningSets(4, ph)}x5 each leg`, 'Resistance Band Lateral Walk: 3x20 each direction'])
}
// Goalkeeper's 5-family bank — Sprint/Energy reuse gkConditioningA/B above
// verbatim (zero new content); Rotation has no existing GK-specific anchor
// (GK's own Day 2 doesn't carry MB Twist Throw the way the other 5
// positions' do), so it uses the generic already-vetted Med Ball
// Rotational Throw; Arm reuses GK's own Band External Rotation.
const GK_FINISHERS = fieldFinisherBank(gkConditioningA, gkConditioningB, 'Med Ball Rotational Throw', 'Band External Rotation')

// feat/day-layout-engine — GK's pack. displayFocus restores GK's own
// richer day names. Lateral Bound/Calf Raises/Resistance Band Lateral
// Walk have no slot on the leaner template and are dropped (same class of
// simplification already applied throughout this PR).
const GK_PACK = {
  finisherBank: GK_FINISHERS,
  displayFocus: {
    'Lower Power': 'Lower Power & Explosive',
    'Upper Strength': 'Upper',
    'Lower Explosion': 'Lateral Explosion & Hip Mobility',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
      ACC_UNILATERAL_LOWER: 'Copenhagen Adductor: 4x8 each leg',
      PLYO: (ctx) => `Single Leg Box Jump: ${explosiveSets(4, ctx.phaseNum)}x4 each leg (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Single Arm DB Row: 4x8 each arm',
      ACC_PRESS: 'DB Bench Press: 4x10',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      MAIN_HINGE: 'Hex Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Cossack Squat: 4x6 each side',
      // feat/no-competing-supersets — was 'DB Lateral Lunge', a lunge-
      // pattern (quad-dominant) movement mismatched to this tag's own
      // posterior-chain intent, which paired it with this same day's
      // ACC_UNILATERAL_LOWER (Cossack Squat/Bulgarian Split Squat — also
      // squat-pattern) into a same-pattern superset. Copenhagen Adductor is
      // ACC_POSTERIOR's own established vocabulary elsewhere in this file
      // for exactly this "light lateral/adductor" role, and is adductor-
      // isolation, not squat-pattern — de-conflicts the pairing.
      ACC_POSTERIOR: 'Copenhagen Adductor: 4x8 each leg',
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Weighted Pull-ups: 4x5',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Reverse Fly: 4x15',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Single Leg Box Jump: ${explosiveSets(4, ctx.phaseNum)}x4 each leg (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Copenhagen Adductor: 3x8 each leg (light)',
    },
  },
}

// ── Center Back conditioning: acceleration (Monday) vs deceleration
// (Thursday) — a center back's real dual demand, closing the ground both ways.
function cbConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Sled Push: 2x15 yds', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Sprint Work: 6x30 yds @ max effort', 'Flying 20s: 4x1'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Sled Push: ${conditioningSets(5, ph)}x20 yds`, '300 Yard Shuttle: 3x2'])
}
function cbConditioningB(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Deceleration Drill: 2x20 yds (sprint 20 · brake · hold 2s)', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Sprint Work: 6x30 yds @ max effort', 'Deceleration Drill: 4x20 yds (sprint 20 · brake · hold 2s)'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Deceleration Drill: ${conditioningSets(5, ph)}x20 yds (sprint 20 · brake · hold 2s)`, '300 Yard Shuttle: 2x2'])
}
// Center Back's 5-family bank — Sprint/Energy reuse cbConditioningA/B
// verbatim; Rotation reuses CB's own MB Twist Throw (already Day 2
// content); Arm reuses the same Band External Rotation anchor every soccer
// position's bank uses, for a consistent "arm care" identity across the
// team even though it's not literally in CB's own Day 2 today.
const CB_FINISHERS = fieldFinisherBank(cbConditioningA, cbConditioningB, 'MB Twist Throw', 'Band External Rotation')

const CB_PACK = {
  finisherBank: CB_FINISHERS,
  displayFocus: {
    'Lower Power': 'Max Lower Strength',
    'Upper Strength': 'Upper Contact Strength',
    'Lower Explosion': 'Power, Jumping & Deceleration',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
      // feat/no-competing-supersets — was 'Single Leg RDL', itself a
      // hip-hinge/hamstring movement mismatched to this tag's own
      // unilateral-lower intent, which paired it with this same day's
      // ACC_HINGE (Hip Thrust — also hip-hinge) into a same-pattern
      // superset. Copenhagen Adductor matches GK_PACK's own established
      // choice for this exact day/tag combination — adductor-isolation,
      // not hip-hinge, de-conflicts the pairing.
      ACC_UNILATERAL_LOWER: 'Copenhagen Adductor: 4x8 each leg',
      PLYO: (ctx) => `Broad Jump: ${explosiveSets(3, ctx.phaseNum)}x3 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Single Arm DB Row: 5x8 each arm',
      ACC_PRESS: 'DB Bench Press: 5x8',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      MAIN_HINGE: 'Hex Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      // feat/no-competing-supersets — was 'DB Lateral Lunge', a lunge-
      // pattern (quad-dominant) movement mismatched to this tag's own
      // posterior-chain intent, which paired it with this same day's
      // ACC_UNILATERAL_LOWER (Cossack Squat/Bulgarian Split Squat — also
      // squat-pattern) into a same-pattern superset. Copenhagen Adductor is
      // ACC_POSTERIOR's own established vocabulary elsewhere in this file
      // for exactly this "light lateral/adductor" role, and is adductor-
      // isolation, not squat-pattern — de-conflicts the pairing.
      ACC_POSTERIOR: 'Copenhagen Adductor: 4x8 each leg',
      PLYO: (ctx) => `Approach Jump: ${explosiveSets(3, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Weighted Pull-ups: 4x6',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Face Pulls: 4x15',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Broad Jump: ${explosiveSets(3, ctx.phaseNum)}x3 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Groin Plank: 3x10 each side (light)',
    },
  },
}

// ── Fullback conditioning: shuttle/hip-abduction (Monday) vs sled-sprint
// development (Thursday) — the same two-way repeat-sprint identity as
// Soccer's own overall archetype, at fullback's own volume.
function fbConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['300 Yard Shuttle: 1x2', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Flying 20s: 8x1', 'Sprint Ladder: 10/20/30/20/10 yds — 3 rounds'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`300 Yard Shuttle: ${conditioningSets(3, ph)}x2`, 'Banded Hip Abduction: 3x15 each side'])
}
function fbConditioningB(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Sled Sprint: 2x20 yds', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Flying 20s: 8x1', 'Sled Sprint: 6x20 yds'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Sled Sprint: ${conditioningSets(5, ph)}x20 yds`, 'Sprint Ladder: 10/20/30/20/10 yds — 3 rounds'])
}
const FB_FINISHERS = fieldFinisherBank(fbConditioningA, fbConditioningB, 'MB Twist Throw', 'Band External Rotation')

// Overhead Press is genuinely new for Fullback (not a repurposed old
// accessory — FB's own content never had one) — same treatment Golf's own
// MAIN_PRESS_V got when a sport's real content had no vertical press to
// promote at all.
const FB_PACK = {
  finisherBank: FB_FINISHERS,
  displayFocus: {
    'Lower Power': 'Lower Strength & Sprint',
    'Upper Strength': 'Upper Light & Mobility',
    'Lower Explosion': 'Explosion & Sprint Development',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
      ACC_UNILATERAL_LOWER: 'Single Leg RDL: 4x8 each leg',
      PLYO: (ctx) => `Lateral Bounds: ${explosiveSets(4, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PRESS: 'DB Bench Press: 4x10',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      MAIN_HINGE: 'Hex Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_POSTERIOR: 'Copenhagen Adductor: 4x8 each leg',
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Single Arm DB Row: 4x10 each arm',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Lateral Raise: 4x12',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Hip 90/90 Hold: 3x30s each side (light)',
    },
  },
}

// ── Midfielder conditioning: aerobic base (Monday, matching the position's
// own "aerobic base" identity) vs change-of-direction (Thursday).
function mfConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Aerobic Finish: 5 min easy tempo', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Flying 20s: 6x1', '300 Yard Shuttle: 2x2'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`300 Yard Shuttle: ${conditioningSets(3, ph)}x2`, 'Aerobic Finish: 8 min tempo run'])
}
function mfConditioningB(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['V Drill: 2x3', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['V Drill: 5x3', 'Flying 20s: 6x1'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`V Drill: ${conditioningSets(4, ph)}x3`, 'Star Drill: 3x3'])
}
const MF_FINISHERS = fieldFinisherBank(mfConditioningA, mfConditioningB, 'MB Twist Throw', 'Band External Rotation')

const MF_PACK = {
  finisherBank: MF_FINISHERS,
  displayFocus: {
    'Lower Power': 'Lower Strength & Aerobic Base',
    'Upper Strength': 'Upper & Work Capacity',
    'Lower Explosion': 'Explosion & Change of Direction',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
      ACC_UNILATERAL_LOWER: 'Single Leg RDL: 4x8 each leg',
      PLYO: (ctx) => `Hex Bar Jumps: ${explosiveSets(4, ctx.phaseNum)}x6 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Single Arm DB Row: 4x8 each arm',
      ACC_PRESS: 'DB Bench Press: 4x8',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      MAIN_HINGE: 'Hex Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_POSTERIOR: 'Banded Monster Walk: 4x10 each direction',
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Kneeling Single Arm Lat Pulldown: 4x8 each arm',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Lateral Raise: 4x12',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Groin Plank: 3x10 each side (light)',
    },
  },
}

// ── Winger conditioning: sprint-ladder acceleration (Monday) vs sled-sprint
// reactive speed (Thursday) — winger's real top-end/reactive dual demand.
function wgConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Sprint Ladder: 10/20/30/20/10 yds — 1 round', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Flying 20s: 8x1', 'Sprint Ladder: 10/20/30/20/10 yds — 4 rounds'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Sprint Ladder: 10/20/30/20/10 yds — ${conditioningSets(3, ph)} rounds`, '300 Yard Shuttle: 2x2'])
}
function wgConditioningB(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Sled Sprint: 2x20 yds', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Flying 20s: 8x1', 'Sled Sprint: 6x20 yds'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Sled Sprint: ${conditioningSets(5, ph)}x20 yds`, '300 Yard Shuttle: 2x2'])
}
const WG_FINISHERS = fieldFinisherBank(wgConditioningA, wgConditioningB, 'MB Twist Throw', 'Band External Rotation')

// Winger's original Day 1/Day 3 main lifts are reversed relative to every
// other soccer position (hinge first, squat second) — kept in their
// original day slots rather than force-matched to another position's
// pattern: "Lower Power" gets a genuine second squat (Front Squat, new,
// same conformance fix as everywhere else) instead of Day 1's own Trap
// Bar Deadlift, which relocates to "Lower Explosion"'s 3-day-only
// MAIN_HINGE slot — the exact slot every other position's own hinge lift
// already occupies there, so Winger stays structurally consistent with
// its teammates despite starting from a reversed day order.
const WG_PACK = {
  finisherBank: WG_FINISHERS,
  displayFocus: {
    'Lower Power': 'Lower Speed-Strength & Horizontal Force',
    'Upper Strength': 'Upper Light & Accessory',
    'Lower Explosion': 'Vertical Strength & Reactive Speed',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Front Squat',
      ACC_HINGE: 'Nordic Hamstring Curl: 4x5',
      ACC_UNILATERAL_LOWER: 'Reverse Lunge: 4x5 each leg',
      PLYO: (ctx) => `Ankle Hops: ${explosiveSets(3, ctx.phaseNum)}x20 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PRESS: 'DB Bench Press: 4x10',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Back Squat',
      MAIN_HINGE: 'Trap Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_POSTERIOR: 'Copenhagen Adductor: 4x8 each leg',
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Single Arm DB Row: 4x10 each arm',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Lateral Raise: 4x12',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Front Squat',
      ACC_HINGE: 'Nordic Hamstring Curl: 4x5',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Ankle Hops: ${explosiveSets(3, ctx.phaseNum)}x20 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Copenhagen Adductor: 3x8 each leg (light)',
    },
  },
}

// ── Striker conditioning: vertical power/broad jump (Monday) vs horizontal
// power/shot-drive sled work (Thursday) — striker's own vertical + horizontal
// power split, matching what its main-lift days already emphasize.
function skConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Broad Jump: 2x3', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Flying 20s: 6x1', 'Broad Jump: 4x3'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`300 Yard Shuttle: ${conditioningSets(3, ph)}x2`, 'Broad Jump: 3x3'])
}
function skConditioningB(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Sled Sprint: 2x20 yds', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Flying 20s: 6x1', 'Sled Sprint: 6x20 yds'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Sled Sprint: ${conditioningSets(5, ph)}x20 yds`, 'Sprint Ladder: 10/20/30/20/10 yds — 3 rounds'])
}
const SK_FINISHERS = fieldFinisherBank(skConditioningA, skConditioningB, 'MB Twist Throw', 'Band External Rotation')

const SK_PACK = {
  finisherBank: SK_FINISHERS,
  displayFocus: {
    'Lower Power': 'Lower Vertical Power & Jump Height',
    'Upper Strength': 'Upper & Rotational Power',
    'Lower Explosion': 'Explosive Speed, Horizontal Power & Shot Drive',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
      ACC_UNILATERAL_LOWER: 'Copenhagen Adductor: 4x8 each leg',
      PLYO: (ctx) => `Approach Jump: ${explosiveSets(5, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Single Arm DB Row: 4x8 each arm',
      ACC_PRESS: 'DB Bench Press: 4x8',
      MED_BALL: 'Med Ball Overhead Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      MAIN_HINGE: 'Hex Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_POSTERIOR: 'Rotational Cable Pull: 4x8 each side',
      PLYO: (ctx) => `Hex Bar Jumps: ${explosiveSets(4, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Single Arm DB Row: 4x10 each arm',
      MED_BALL: 'Med Ball Overhead Slam: 4x8',
      ACC_SHOULDER: 'Band External Rotation: 4x15 each arm',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Approach Jump: ${explosiveSets(5, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Copenhagen Adductor: 3x8 each leg (light)',
    },
  },
}

// feat/day-layout-engine — SOC_DAY5/SOC_DAY6 (the old generic bolted-on
// 5th/6th days, shared byte-for-byte across all 6 positions) are retired:
// every position's 5/6-day plan is now purpose-built via its own pack's
// 'Speed & Change of Direction'/'Recovery & Mobility' entries instead —
// matches this PR's whole goal.
function generateSoccerWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : SOC_PHASES
  const packs = {
    goalkeeper: GK_PACK,
    center_back: CB_PACK,
    fullback: FB_PACK,
    midfielder: MF_PACK,
    winger: WG_PACK,
    striker: SK_PACK,
  }
  const pack = packs[posId] || MF_PACK
  const weeks = generateFieldWeeksFromPack(pack, phases, daysPerWeek)
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

// ─── Wrestling ────────────────────────────────────────────────────────────────

// ─── Wrestling — Collision/Max-Strength archetype (both standard and
// muscle_gain goals — see generateWrestlingWeeks/applyCollisionMgWrapper
// below; feat/blueprint-cleanup retired the old pre-archetype wrestlingSess/
// WR_DAY5/WR_DAY6 fallback, same as Linemen's own fbLinemenMGSess) ────────
// Built on the same archetype core Football Linemen established — same
// rep-scheme math (collisionMainLiftScheme/buildCollisionMainLiftRamp),
// same autoregulated Oly-lift prescription (collisionOlyScheme), same
// day-count-aware layouts, same raised accessory cap (see
// resolveAccessoryCapKey below). Differentiated from Linemen by exercise
// selection and emphasis, not by structure: grip strength and grappling-
// specific work (Weighted Pull-ups, Farmer/DB Suitcase Carries, Grip Work,
// Rope Climb, Sprawl Drills) stand in for Linemen's football-specific
// movements. The two sports share only the neck-armor block (COLLISION_NECK)
// as common contact-sport ground — everything else is wrestling's own.

const WRESTLING_WU_LOWER = 'Wrestling Movement Warm-up: Sprawls x10 · Shot Entries x10 each side · Hip Heist x10 each side\n\n'
const WRESTLING_WU_UPPER = 'Upper Body Warm-up: Band Pull-Aparts x20 · Scap Push-Ups x10 · Arm Circles x10 each direction\n\n'

// Wrestling's own finisher content — grip/mat-conditioning identity (Grip
// Work, Wrestle-Outs, Battle Rope, already vetted names) plus already-vetted
// rotational vocabulary shared with the other Collision sports. Core reuses
// the shared coreBlock verbatim.
const WRESTLING_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Sprint Work: 3x10 yds'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Sprint Work: 4x10 yds @ max effort (mat transitions)'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Sprint Work: 4x15 yds @ max effort'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Sprint Work: 5x15 yds @ max effort'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Sprint Work: 3x15 yds @ max effort (full recovery)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Battle Rope: 2x15s'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Battle Rope: 3x20s'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Battle Rope: 4x20s'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Wrestle-Outs: 4x30s'] }
    return { subtitle: 'Reduced', lines: ['Battle Rope: 2x20s'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Landmine Rotational Press: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
  arm(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Grip Work: 2 sets'] }
    if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: ['Grip Work: 3x30s each (plate pinch · towel hang)'] }
    if (ph === 2) return { subtitle: 'Modest Increase', lines: ['Band External Rotation: 3x15 each arm', 'Grip Work: 2 sets'] }
    if (ph === 3) return { subtitle: 'Maintenance', lines: ['Grip Work: 3 sets'] }
    return { subtitle: 'Readiness', lines: ['Band External Rotation: 2x15 each arm'] }
  },
}

// feat/day-layout-engine — Wrestling's pack. Reuses its own vetted
// vocabulary throughout (Sprawl Drills, Rope Climb, Grip Work, Farmer/DB
// Suitcase Carries, Nordic Hamstring Curl). One deliberate structural
// change, called out because the golden-suite diff shows it plainly: the
// shared 4-day Collision template wants TWO squat days (matching
// Linemen's own Front Squat/Back Squat split), not a squat+hinge split —
// Wrestling's old Day 3 used Trap Bar Deadlift as its top-line ramped
// lift, which doesn't fit the MAIN_SQUAT slot every other Collision sport
// puts there. Front Squat now fills that slot for 4/5/6-day (paired with
// Back Squat on Day 1, mirroring Linemen exactly); Trap Bar Deadlift moves
// to the 3-day-only MAIN_HINGE slot (the 3-day template's own "Lower
// Strength" IS a hinge day) and to the 6-day Lower C day, so it isn't
// lost, just relocated to where the archetype's own structure has room
// for a true hinge main lift. A few old lines don't have a matching slot
// in the new leaner templates (Weighted Pull-ups/Farmer Carries on old
// Day 1, Grip Work repeated across old Day 2/4) — that volume is still
// present via the finisher engine's own energy/arm families (Battle Rope,
// Wrestle-Outs, Grip Work already in WRESTLING_FINISHERS).
const WRESTLING_PACK = {
  warmupLower: WRESTLING_WU_LOWER,
  warmupUpper: WRESTLING_WU_UPPER,
  finisherBank: WRESTLING_FINISHERS,
  byFocus: {
    // Accessory set counts below default to 4 (not 3) wherever this pack
    // is free to choose — a 3-set line only cuts to 2 on deload (33%), a
    // 4-set line cuts to 2 as well but that's a full 50% — with the new,
    // leaner per-day slot count, enough 3-set lines drags the WEEK's
    // aggregate deload reduction below the required 40% floor even though
    // every individual line is still genuinely halved.
    'Lower Power': {
      MAIN_OLY: { name: 'Power Clean', suffix: ' (from floor, catch quarter squat)' },
      MAIN_SQUAT: { name: 'Back Squat', suffix: ' (full ROM)' },
      ACC_HINGE: 'Barbell RDL: 4x8',
      ACC_UNILATERAL_LOWER: 'Sprawl Drills: 4x10',
    },
    'Upper Strength': {
      MAIN_OLY: { name: 'Single Arm DB Split Jerk', suffix: ', each arm' },
      MAIN_PRESS_V: 'Overhead Press',
      // "4x1 ascent" (not "3 ascents" — no "x" multiplier, so it never
      // matched the deload volume-reduction regex) — same real prescription,
      // now genuinely reducible like every other accessory.
      ACC_PULL_V: 'Rope Climb: 4x1 ascent',
      ACC_PRESS: 'Push-ups: 4xAMAP',
      ACC_PULL_H: 'BB Row: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x20', // 3-day only
    },
    'Lower Strength': {
      MAIN_OLY: { name: 'Hang Clean Above the Knee', suffix: ' (start at hip crease, hinge to above kneecaps, explode)' },
      MAIN_SQUAT: { name: 'Front Squat', suffix: ' (full ROM)' }, // 4-day
      MAIN_HINGE: 'Trap Bar Deadlift', // 3-day only
      ACC_SQUAT: 'Goblet Squat: 4x10', // 3-day only
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg (2 DB)',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x8 each leg',
      ACC_CALF_GRIP: 'DB Suitcase Carries: 4x20 yds each side',
    },
    'Upper Power': {
      MAIN_OLY: 'BB Split Jerk',
      MAIN_PRESS_H: { name: 'Close Grip Bench Press', suffix: ' (hands at shoulder width)' },
      ACC_PULL_H: 'Weighted Chin-ups: 4x6',
      ACC_PRESS: 'Single Arm DB Bench: 4x10 each arm',
      ACC_PULL_V: 'Inverted BB Row: 4x10',
    },
    // Focus label is the shared template's own ("Power, Athleticism &
    // Armor" — same label Linemen's 5-day bonus day uses) since this day
    // comes from dayLayoutEngine.js's shared COLLISION_5 template, not a
    // per-sport label; Wrestling's old distinct "Grip, Conditioning &
    // Armor" branding doesn't carry forward, a minor cosmetic tradeoff of
    // the shared-template architecture.
    'Power, Athleticism & Armor': {
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
      MED_BALL: 'Med Ball Slam: 4x8',
      // "Farmer Carries: SxR yds" (not "Rope Climb: N ascents", which has
      // no "x" multiplication token and so never matches the deload
      // volume-reduction regex) — restores old Day 1's carry-family
      // content and keeps this day's accessory volume genuinely
      // deload-reducible, same as every other day.
      ACC_CALF_GRIP: 'Farmer Carries: 3x40 yds',
      NECK: COLLISION_NECK_DEDICATED,
    },
    // 6-day labels are the shared template's own literal strings too
    // (same "Lower — Posterior Chain & Athletic"/"Upper — Hypertrophy &
    // Armor" Linemen uses) — Wrestling's old distinct "...& Grappling"/
    // "...Grip Armor" branding doesn't carry forward, same tradeoff as
    // the 5-day label above.
    'Lower — Posterior Chain & Athletic': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x8 each leg',
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5',
      ACC_CALF_GRIP: 'DB Suitcase Carries: 4x30 yds each side',
    },
    'Upper — Hypertrophy & Armor': {
      ACC_PRESS: (ctx) => weeklyVariant(ctx.week, 'Incline DB Press: 4x10', 'Weighted Dips: 4x10'),
      ACC_PULL_H: 'Chest Supported Row: 4x12',
      ACC_SHOULDER: 'Face Pulls: 4x15',
    },
  },
}

function generateWrestlingWeeks(_, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  return applyCollisionMgWrapper(generateCollisionWeeksFromPack(WRESTLING_PACK, daysPerWeek, mg), mg)
}

// ─── Volleyball ───────────────────────────────────────────────────────────────

// Volleyball — Vertical/Court archetype, arm care ON (overhead hitting/
// serving is a throwing-adjacent shoulder demand, per the user's explicit
// allow-list). Sprint/Energy reuse Day 3's Lateral Bounds and VB_DAY4's
// own Court Sprints vocabulary (already vetted names in this file), made
// phase-progressive. Arm reuses Day 2's existing Band External Rotation/
// YTW Series. Rotation reuses the cross-sport Med Ball Rotational Throw
// (spiking is rotational power; no existing volleyball-specific movement
// to anchor to). Core reuses the shared coreBlock verbatim.
const VOLLEYBALL_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Lateral Bounds: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Lateral Bounds: 4x5 each side'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Lateral Bounds: 5x5 each side'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Line Jumps: 3x20s'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Lateral Bounds: 3x5 each side (max intent)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Court Sprints: 3x full court (45s rest)'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Court Sprints: 6x full court (45s rest)'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Court Sprints: 8x full court (45s rest)'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Court Sprints: 10x full court (45s rest)'] }
    return { subtitle: 'Reduced', lines: ['Court Sprints: 4x full court (45s rest)'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Med Ball Rotational Throw: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
  arm(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Band External Rotation: 2x15 each arm'] }
    if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: ['Band External Rotation: 4x15 each arm', 'YTW Series: 3x10 each'] }
    if (ph === 2) return { subtitle: 'Modest Increase', lines: ['Band External Rotation: 4x15 each arm'] }
    if (ph === 3) return { subtitle: 'Maintenance', lines: ['YTW Series: 3x10 each'] }
    return { subtitle: 'Readiness', lines: ['Band External Rotation: 3x15 each arm'] }
  },
}

function volleyballFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('vertical', info.phaseNum, 3, { hasArmCare: true })[dayIndex]
  return finisherEngine.renderFinisher(VOLLEYBALL_FINISHERS, plan, info.phaseNum, info.deload)
}

// feat/day-layout-engine — Volleyball's pack (Vertical/Court archetype,
// 'vertical' finisher weighting, hasArmCare:true — the one sport in this
// group with a real overhead/throwing-adjacent demand, per the user's
// own explicit allow-list). Overhead Press promotes to MAIN_PRESS_V, DB
// Bench to MAIN_PRESS_H (same reversed-slot promotion as Guards/Wings/
// Bigs); DB Shoulder Press (VB_DAY5's own vetted vocabulary) fills
// "Upper Power"'s ACC_PRESS. Power Clean drops (no MAIN_OLY tag). Snap
// Down/Depth Drop/Single Leg Box Jump/Calf Raises/Band Pull-Aparts have
// no slot and are dropped — VB_DAY4/5/6 (the old generic bolt-on days)
// retired in favor of the archetype's own purpose-built 5/6-day layout.
const VOLLEYBALL_PACK = {
  finisherBank: VOLLEYBALL_FINISHERS,
  finisherArchetype: 'vertical',
  hasArmCare: true,
  mainLiftTier: 'rotational',
  byFocus: {
    'Lower Power & Speed': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x5 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
    },
    'Upper Strength': {
      MAIN_PRESS_V: 'Overhead Press',
      MAIN_PRESS_H: 'DB Bench', // 3-day
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm', // 3-day
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Lower Explosion & Speed': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Approach Jump: ${explosiveSets(5, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`, // 3-day
    },
    'Upper Power': {
      MAIN_PRESS_H: 'DB Bench',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm',
      ACC_PRESS: 'DB Shoulder Press: 4x10',
    },
    'Reactive Speed': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
    },
    'Upper Armor': {
      ACC_PRESS: 'DB Shoulder Press: 4x10',
      ACC_PULL_H: 'Single Arm DB Row: 4x12 each arm',
    },
  },
}

function generateVolleyballWeeks(_, goal, daysPerWeek = 3) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : STD_PHASES
  const weeks = generateSpeedPowerWeeksFromPack(VOLLEYBALL_PACK, phases, daysPerWeek)
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

// ─── Track & Field ────────────────────────────────────────────────────────────

// Track Sprinters — Speed/Power archetype, arm care OFF. Sprint/Energy
// reuse the sprinters' own existing Wicket Drills / Sled Sprint
// vocabulary, made phase-progressive. Rotation reuses the cross-sport Med
// Ball Rotational Throw (arm drive/rotation still matters for sprint
// mechanics). Core reuses coreBlock.
const TRACK_SPRINT_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Wicket Drills: 2x30m'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Wicket Drills: 3x30m'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Wicket Drills: 4x30m'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Hill Sprints: 5x40m'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Wicket Drills: 2x30m (max intent)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Sled Sprint: 3x20 yds'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Sled Sprint: 5x20 yds'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Sled Sprint: 6x20 yds'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Sled Sprint: 8x20 yds'] }
    return { subtitle: 'Reduced', lines: ['Sled Sprint: 3x20 yds (full recovery)'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Med Ball Rotational Throw: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
}

function trackSprintFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('speedpower', info.phaseNum, 4, { hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(TRACK_SPRINT_FINISHERS, plan, info.phaseNum, info.deload)
}

// feat/day-layout-engine — Track Sprinters' pack. Original content had 3
// lower-flavored days (Day1 squat, Day3 a SECOND squat, Day4 hinge) and
// only 1 upper day — same class of mismatch as Basketball Guards/Wings.
// Resolved by keeping Day1's Back Squat (MAIN_SQUAT) and Day4's Trap Bar
// Deadlift (MAIN_HINGE, already a natural fit — no promotion needed);
// Day3's own redundant Front Squat has no slot and drops, with Bounding
// (Day3's own sprint-specific plyo) relocating to "Lower Explosion &
// Speed"'s own SPEED slot. Day2's Bench Press (already ramped) fills
// MAIN_PRESS_H; Overhead Press (flat) promotes to MAIN_PRESS_V. Power
// Clean/Hang Clean drop (no MAIN_OLY tag).
const TRACK_SPRINT_PACK = {
  finisherBank: TRACK_SPRINT_FINISHERS,
  mainLiftTier: 'rotational',
  byFocus: {
    'Lower Power & Speed': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
    },
    'Upper Strength': {
      MAIN_PRESS_V: 'Overhead Press',
      MAIN_PRESS_H: 'Bench Press', // 3-day
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      ACC_PULL_H: 'DB Row: 4x12', // 3-day
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
    'Lower Explosion & Speed': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_POSTERIOR: 'Single Leg RDL: 4x8 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum), // 3-day
    },
    'Upper Power': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'DB Row: 4x12',
      ACC_PRESS: 'Push-up: 4xAMAP',
    },
    'Reactive Speed': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
    },
    'Upper Armor': {
      ACC_PRESS: 'Push-up: 4xAMAP',
      ACC_PULL_H: 'DB Row: 4x12',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
  },
}

// Track Throwers — Rotational/Throwing archetype, arm care ON (the
// clearest throwing position in the whole system). Sprint reinterpreted
// as explosive lower-body extension (Broad Jump, matching Golf's own
// rotational-archetype Sprint content); Energy reuses Day 1's existing
// Grip Work vocabulary; Rotation/Arm reuse throwers' own rich existing
// Day 2/4 vocabulary (Med Ball Rotational Throw, Rotational Cable Throw,
// Band External Rotation, YTW Shoulder Series, Face Pulls). Core reuses
// coreBlock.
const TRACK_THROW_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Broad Jump: 2x3'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Broad Jump: 3x3'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Broad Jump: 4x3'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Broad Jump: 4x3 (max intent)'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Broad Jump: 2x3 (max intent)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Grip Work: 2x30s each (plate pinch · towel hang)'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Grip Work: 3x30s each (plate pinch · towel hang)'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Grip Work: 4x30s each (plate pinch · towel hang)'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Grip Work: 3x45s each (plate pinch · towel hang)'] }
    return { subtitle: 'Reduced', lines: ['Grip Work: 2x30s each (plate pinch · towel hang)'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x6 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Rotational Cable Throw: 4x8 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
  arm(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Band External Rotation: 2x15 each arm'] }
    if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: ['Band External Rotation: 4x15 each arm', 'YTW Shoulder Series: 3x10 each'] }
    if (ph === 2) return { subtitle: 'Modest Increase', lines: ['Band External Rotation: 4x15 each arm', 'Face Pulls: 3x15'] }
    if (ph === 3) return { subtitle: 'Maintenance', lines: ['YTW Shoulder Series: 3x10 each'] }
    return { subtitle: 'Readiness', lines: ['Band External Rotation: 3x15 each arm'] }
  },
}

// feat/day-layout-engine — Track Throwers' pack. hasArmCare:true (real
// overhead/throwing demand), no warmup lines (Track never had them). Old
// Day1's Power Clean is dropped — Rotational has no MAIN_OLY slot at all
// (same documented archetype simplification as Baseball/Tennis/Golf/QB).
// Old Day2's Overhead Press ("4x8", a plain accessory) is promoted to the
// ramped MAIN_PRESS_V lift on "Upper & Shoulder Health" — that day
// structurally wants a genuine vertical press, same conformance fix
// applied to Rugby Forwards/Hockey Forwards/Tennis/Golf/QB. Old Day4's
// Push Press is dropped as redundant with the now-ramped Overhead Press
// (same call made for QB); Close Grip Bench Press (already ramped in the
// old content) fills MAIN_PRESS_H. Old Day1/3's calf-raise lines and
// Day3's DB Step-Ups have no home in the new, leaner slot counts —
// dropped (documented, deliberate, matches the pattern already applied
// across every migrated sport this PR). displayFocus restores throwers'
// own richer day names as pure output relabeling.
const TRACK_THROW_PACK = {
  finisherBank: TRACK_THROW_FINISHERS,
  hasArmCare: true,
  displayFocus: {
    'Lower Power': 'Lower Power — Squat',
    'Upper & Shoulder Health': 'Upper Strength, Rotational & Shoulder Health',
    'Lower Strength': 'Lower Strength — Deadlift',
    'Upper Power & Rotational': 'Upper Power, Rotational & Shoulder Health',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
      ACC_UNILATERAL_LOWER: 'Goblet Lateral Lunge: 4x4 each leg',
    },
    'Upper & Shoulder Health': { // 4-day only
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      ACC_PULL_H: 'BB Row: 4x8',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper & Rotational': { // 3-day only
      MAIN_PRESS_H: 'Close Grip Bench Press',
      ACC_PULL_H: 'BB Row: 4x8',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Lower Strength': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_SQUAT: 'Goblet Squat: 4x10',
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5', // 4-day
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Upper Power & Rotational': { // 4-day only
      MAIN_PRESS_H: 'Close Grip Bench Press',
      ACC_PULL_H: 'BB Row: 4x8',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
    },
    'Shoulder Health & Power Accessory': { // 5-day
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Vertical Press Emphasis': { // 6-day
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Horizontal Press Emphasis': { // 6-day
      MAIN_PRESS_H: 'Close Grip Bench Press',
      ACC_PULL_H: 'BB Row: 4x8',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Lower Explosion': { // 6-day
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Goblet Lateral Lunge: 4x4 each leg',
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Arm-Care Emphasis': { // 6-day
      ACC_PULL_H: 'BB Row: 4x8',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
    },
  },
}

function generateTrackThrowWeeks(daysPerWeek, mg = false) {
  const phases = mg ? MG_PHASES : STD_PHASES
  const weeks = generateRotationalWeeksFromPack(TRACK_THROW_PACK, phases, daysPerWeek)
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

// Track Jumpers — Vertical/Court archetype, arm care OFF. Sprint/Energy
// reuse jumpers' own existing Bounding / Approach Jump Work / Sled Sprint
// vocabulary, made phase-progressive. Rotation reuses the cross-sport Med
// Ball Rotational Throw (arm drive/block at takeoff). Core reuses
// coreBlock.
const TRACK_JUMP_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Bounding: 2x20m'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Bounding: 3x20m'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Bounding: 4x20m'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Bounding: 3x20m (max intent)'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Bounding: 2x20m (max intent)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Approach Jump Work: 1 set'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Approach Jump Work: 2 sets'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Approach Jump Work: 3 sets'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Sled Sprint: 6x20 yds'] }
    return { subtitle: 'Reduced', lines: ['Approach Jump Work: 2 sets'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Med Ball Rotational Throw: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
}

function trackJumpFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('vertical', info.phaseNum, 4, { hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(TRACK_JUMP_FINISHERS, plan, info.phaseNum, info.deload)
}

// feat/day-layout-engine — Track Jumpers' pack (Vertical/Court archetype,
// 'vertical' finisher weighting). Same structural shape and resolution as
// Track Sprinters: Day1 squat + Day4 hinge fill the two lower slots,
// Day3's redundant Front Squat drops with its own Single Leg Box Jump
// relocating to "Lower Explosion & Speed"'s SPEED slot; Day2's Bench
// Press/Overhead Press fill the two upper MAIN_ slots. Power Clean/Hang
// Clean drop.
const TRACK_JUMP_PACK = {
  finisherBank: TRACK_JUMP_FINISHERS,
  finisherArchetype: 'vertical',
  mainLiftTier: 'rotational',
  byFocus: {
    'Lower Power & Speed': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Terminal Knee Extension: 4x15 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
    },
    'Upper Strength': {
      MAIN_PRESS_V: 'Overhead Press',
      MAIN_PRESS_H: 'Bench Press', // 3-day
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      ACC_PULL_H: 'DB Row: 4x12', // 3-day
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
    'Lower Explosion & Speed': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_POSTERIOR: 'Single Leg RDL: 4x8 each leg',
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum), // 3-day
    },
    'Upper Power': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'DB Row: 4x12',
      ACC_PRESS: 'Push-up: 4xAMAP',
    },
    'Reactive Speed': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(3, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
    },
    'Upper Armor': {
      ACC_PRESS: 'Push-up: 4xAMAP',
      ACC_PULL_H: 'DB Row: 4x12',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x15',
    },
  },
}

const TRACK_SPRINT_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Sprint Mechanics & Acceleration',
  description: `Wicket Runs: 4x40m\nBlock Start Acceleration: 6x20m\nHill Sprints: 5x40m\nResistance Band Sprint Marches: 4x20m\nAnkle Circuit: 3x20 each\n${coreBlock(info.phaseNum)}`,
})
const TRACK_JUMP_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Elastic Strength & Bounding',
  description: `Ankle Hops: 4x20\nSingle Leg Bounding: 4x5 each leg\nDrop Jump: 4x5\nReactive Box Jump: 3x5\nLateral Hurdle Hops: 3x5 each side\n${coreBlock(info.phaseNum)}`,
})
const TRACK_DAY6 = {
  day: 'Day 6', focus: 'Recovery & Mobility',
  description: `Foam Roll: Full body — 15 minutes\nHip Flexor Stretch: 3x45s each leg\nHamstring Eccentric: 3x8\nCalf Raise Static Stretch: 3x45s\nThoracic Rotation: 3x10 each side\nAnkle Mobility Circles: 3x10 each`,
}

// feat/day-layout-engine — all 3 sub-events now route through their own
// purpose-built day-layout packs, day-count-aware for all of 3/4/5/6 days
// (Throwers on the Rotational archetype, Sprinters on Speed/Power,
// Jumpers on the Vertical/Court group). TRACK_SPRINT_DAY5/TRACK_JUMP_DAY5/
// TRACK_DAY6 (the old generic bolt-on days) are retired in favor of each
// pack's own purpose-built "Reactive Speed"/"Upper Armor" days.
function generateTrackWeeks(subtype, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  if (subtype === 'throw') return generateTrackThrowWeeks(daysPerWeek, mg)
  const phases = mg ? MG_PHASES : STD_PHASES
  const packs = { sprint: TRACK_SPRINT_PACK, jump: TRACK_JUMP_PACK }
  const pack = packs[subtype] || TRACK_SPRINT_PACK
  const weeks = generateSpeedPowerWeeksFromPack(pack, phases, daysPerWeek)
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

// ─── Day Layout Engine wiring: Endurance archetype (feat/day-layout-engine) ─
// Same "pack supplies tag->exercise, shared renderer supplies the math"
// split as every other archetype above — but Endurance's own two sports
// (Cross Country, Swimming) never used the shared %-ramp math at all:
// their main lifts are deliberately light, non-percentage prescriptions
// (XC: a fixed "3x8 @ 65-70% only — no heavy loading"; Swimming: a
// phase-tiered set count "@ moderate load", no % anywhere), matching the
// archetype's own "SUPPORT only, never peaks heavy" design intent. So
// unlike every other archetype's MAIN_ renderer, a pack's MAIN_ entry
// here is a (ctx) => 'full rendered line' function — no {name,suffix}
// wrapper, no shared ramped-format construction; XC's own function still
// reuses ctx.pct (from the same shared getPhaseInfo everyone else uses,
// with a pack-specific phases table pinned to a flat 65-70% band all 16
// weeks — real week-to-week variation within that light band, deload
// cut included for free, but never escalating) rather than reinventing
// its own percentage math.
//
// recoveryOnly days (Day 6 on both sports' own old bolt-on, now the
// archetype's own template flag) bypass the finisher engine's family
// allocation entirely — Sprint/Energy/Core/Rotation/Arm are all real
// training stimuli, and a day flagged recoveryOnly must never receive
// one. pack.recoveryContent supplies that day's fixed, genuinely gentle
// text directly instead.
function buildEnduranceRenderers(pack) {
  function mainEntry(focusLabel, tagName, ctx) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (!entry) throw new Error(`Endurance pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'function' ? entry(ctx) : entry
  }
  function accEntry(focusLabel, tagName, ctx) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (entry === undefined) throw new Error(`Endurance pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'function' ? entry(ctx) : entry
  }

  const renderers = {}
  for (const tagName of ['MAIN_SQUAT', 'MAIN_HINGE', 'MAIN_PRESS_H', 'MAIN_PRESS_V']) {
    renderers[tagName] = (slotDef, ctx) => mainEntry(ctx.dayTemplate.focus, tagName, ctx)
  }
  for (const tagName of [
    'ACC_SQUAT', 'ACC_HINGE', 'ACC_UNILATERAL_LOWER', 'ACC_POSTERIOR',
    'ACC_PULL_H', 'ACC_PULL_V', 'ACC_PRESS', 'ACC_SHOULDER', 'ACC_CALF_GRIP',
    'PLYO', 'SPEED', 'MED_BALL',
  ]) {
    renderers[tagName] = (slotDef, ctx) => {
      const packChoice = accEntry(ctx.dayTemplate.focus, tagName, ctx)
      return varietyEngine.resolveFiller('endurance', slotDef, tagName, ctx, packChoice)
    }
  }
  renderers.ACC_CORE = () => null
  if (pack.hasArmCare) renderers.ACC_SHOULDER = () => null
  renderers.FINISHER = (dayIndex, ctx) => {
    if (ctx.dayTemplate.recoveryOnly) return pack.recoveryContent ? pack.recoveryContent(ctx) : null
    const plan = finisherEngine.planWeekFinishers('endurance', ctx.phaseNum, ctx.days, { hasArmCare: !!pack.hasArmCare, overrides: pack.finisherOverrides || null })[dayIndex]
    return finisherEngine.renderFinisher(pack.finisherBank, plan, ctx.phaseNum, ctx.deload)
  }
  return renderers
}

// Generates all 16 weeks for one Endurance-archetype sport at a given
// day count, entirely from its pack.
function generateEnduranceWeeksFromPack(pack, phases, daysPerWeek) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = getPhaseInfo(w, phases)
    const ctx = { ...info, days: Math.max(2, Math.min(6, daysPerWeek)) }
    let sessions = dayLayoutEngine.buildWeekSessions('endurance', ctx.days, buildEnduranceRenderers(pack), ctx)
    if (pack.displayFocus) {
      sessions = sessions.map(s => ({ ...s, focus: pack.displayFocus[s.focus] || s.focus }))
    }
    weeks.push({
      week_number: w,
      objective: info.deload
        ? `Phase ${info.phaseNum} — Deload · Week ${info.wip} of 4`
        : `Phase ${info.phaseNum} — ${info.phaseLabel} · Week ${info.wip} of 4`,
      sessions,
    })
  }
  return weeks
}

// ─── Cross Country ────────────────────────────────────────────────────────────

// Cross Country — Endurance archetype, arm care OFF (not a throwing/
// overhead sport). Per ENDURANCE_FINISHER_MODE: XC's own practice already
// IS the conditioning, so Energy content here stays deliberately light —
// an aerobic flush/controlled tempo, never a second brutal conditioning
// block. Sprint is reinterpreted as very short, relaxed speed (strides),
// not max-effort sprinting. Core replaces the day's old ad hoc Dead Bug/
// Plank/Core Circuit lines with the shared coreBlock. Rotation stays light
// (low weight in this archetype) and reuses the cross-sport Med Ball
// Rotational Throw. No `arm` entry — `hasArmCare: false` guarantees it's
// never selected.
const CROSS_COUNTRY_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Easy Strides: 2x50m (relaxed)'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Easy Strides: 3x50m (relaxed)'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Easy Strides: 4x50m (relaxed)'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Strides: 4x60m (controlled — not max effort)'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Easy Strides: 2x50m (relaxed)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Aerobic Flush: 10 min easy jog'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Aerobic Flush: 12 min easy jog'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Aerobic Flush: 15 min easy jog'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Controlled Tempo: 10 min @ conversational pace'] }
    return { subtitle: 'Reduced', lines: ['Aerobic Flush: 10 min easy jog'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Med Ball Rotational Throw: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
}


// feat/day-layout-engine — XC's pack. A flat 65-70% band, every phase,
// all 16 weeks (no phase-to-phase intensification at all) — reuses the
// exact same shared getPhaseInfo wave/deload math every other sport's
// ctx.pct comes from, just pinned to that one light band, so "no heavy
// loading" now gets real week-to-week variation within the band (and
// deload-safe for free) instead of a static "65-70%" string shown
// unchanged all 16 weeks. Calf Raises/Band Hip Abduction (Day 1/2's own
// accessories) have no slot on the leaner template and are dropped;
// Push-ups (Day 2) promotes into MAIN_PRESS_H (XC had no press movement
// of its own at all before); a new, equally light DB Shoulder Press
// fills MAIN_PRESS_V, since XC had no vertical press either.
const XC_PHASES = [
  { label: 'Injury Prevention Base', low: 0.65, high: 0.70 },
  { label: 'Base Strength', low: 0.65, high: 0.70 },
  { label: 'Maintenance', low: 0.65, high: 0.70 },
  { label: 'Pre-Season Taper', low: 0.65, high: 0.70 },
]
const XC_RECOVERY_CONTENT = () => `Foam Roll: Full body — 10 minutes\nHip Flexor Stretch: 3x45s each leg\nHamstring Eccentric: 3x8\nAnkle Circles: 3x20 each direction\nHip 90/90 Hold: 2x45s each side\nCalf Stretch: 3x45s each leg\nLight Walking Lunge: 2x10 each leg`
const CROSS_COUNTRY_PACK = {
  finisherBank: CROSS_COUNTRY_FINISHERS,
  recoveryContent: XC_RECOVERY_CONTENT,
  displayFocus: {
    'Full Body — Squat & Press': 'Lower (Low Load)',
    'Full Body — Hinge & Press': 'Full Body Light',
  },
  byFocus: {
    'Full Body — Squat & Press': {
      MAIN_SQUAT: (ctx) => `Back Squat: 3x8 @ ${ctx.pct} — no heavy loading`,
      MAIN_PRESS_H: 'Push-ups: 4xAMAP',
      ACC_HINGE: 'Single Leg RDL: 4x10 each leg',
    },
    'Full Body — Unilateral & Mobility': { // 3-day
      // Bulgarian Split Squat, not Copenhagen Adductor — the latter's exact
      // "3x8 each leg" text collides with coreBlock's own Phase 4 "Lateral
      // Stability" variant (Copenhagen Adductor/Suitcase Carry), which the
      // finisher engine's 'core' family reuses verbatim; a genuinely
      // different movement avoids the risk outright rather than relying on
      // set-count luck. 4 sets (not 3), matching the deload-safety lesson
      // learned on Baseball: a 3-set line only cuts to 2 sets (33%) under
      // deload, dragging the week's aggregate below the required 40% floor
      // even though every individual line is genuinely halved.
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_PULL_H: 'Pull-ups: 4xAMAP',
    },
    'Full Body — Unilateral & Pull': { // 4-day
      // Bulgarian Split Squat, not Copenhagen Adductor — see the 3-day
      // key's own comment above (identical reasoning, both fixes).
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_PULL_H: 'Pull-ups: 4xAMAP',
    },
    'Full Body — Hinge & Press': {
      MAIN_HINGE: (ctx) => `Trap Bar Deadlift: 3x8 @ ${ctx.pct} — no heavy loading`,
      MAIN_PRESS_V: 'DB Shoulder Press: 3x10 (light)',
      PLYO: (ctx) => `Ankle Hops: ${explosiveSets(3, ctx.phaseNum)}x20 (${explosiveIntent(ctx.phaseNum)})`,
      ACC_SHOULDER: 'Band External Rotation: 4x15 each arm',
    },
    'Low-Load — Posterior & Mobility': {
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5',
    },
    'Hip & Tissue Mobility': {
      ACC_POSTERIOR: 'Hip Thrust: 3x12 (light)',
    },
  },
}

function generateXCWeeks(_, goal, daysPerWeek = 2) {
  return generateEnduranceWeeksFromPack(CROSS_COUNTRY_PACK, XC_PHASES, daysPerWeek)
}

// ─── Lacrosse ─────────────────────────────────────────────────────────────────

function lacrosseSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — repeat-sprint/field archetype, same tier as soccer
  const lb   = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const mbrt = explosiveSets(4, ph)
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Single Leg RDL + Nordic kept as accessories
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 4x3\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 3x8\nSingle Leg RDL: 3x8 each leg\nNordic Hamstring Curl: 3x5\nLateral Bounds: ${lb}x5 each side (${explosiveIntent(ph)})\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nPull-ups: 4xAMAP\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nMed Ball Rotational Throw: ${mbrt}x6 each side (${explosiveIntent(ph)})\nLandmine Rotation: 3x8 each side\nCable Woodchop: 3x10 each side\nBand External Rotation: 3x15\nGrip Work: 3x30s each` },
    // Fix 3: phasePlyo replaces multi-plyo list
    { day: 'Day 3', focus: 'Explosion',
      description: `Hang Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Conditioning & COD',
      description: `V Drill: 4x3\nStar Drill: 3x3\nSled Sprint: 6x20 yds\n200m Intervals: 8x1 @ 80-85% effort (90 sec rest)\nBroad Jump: 3x3\nCopenhagen Adductor: 3x8 each leg` },
  ]
}

const LAX_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Speed & Field Conditioning',
  description: `Flying 20s: 6x20m\nLateral Shuffle Sprint: 4x10 yds each way\nAgility Cone Drill (5-10-5): 6x1\nMed Ball Slam: 4x8\nFarmer Carry: 3x40 yds\n${coreBlock(info.phaseNum)}`,
})
const LAX_DAY6 = {
  day: 'Day 6', focus: 'Recovery & Mobility',
  description: `Foam Roll: Full body — 15 minutes\nHip Flexor Stretch: 3x45s each leg\nHamstring Eccentric: 3x8\nThoracic Rotation: 3x10 each side\nStatic Stretch: Groin · Quads · Calves`,
}

// ─── Lacrosse — Repeat-Sprint/Field Athlete archetype (standard goal only;
// see lacrosseSess above for the muscle-gain variant, untouched by this
// build). Same weekly template Soccer established, same 'rotational' tier,
// same un-raised default cap. Differentiated from Soccer by lacrosse's own
// real demand: Tuesday carries genuine overhead/rotational shooting power
// (Med Ball Rotational Throw, Landmine Rotation, Cable Woodchop, stick-sport
// Grip Work) rather than Soccer's shoulder-health-focused light upper day —
// a real point of differentiation, not a reused template.

// ── Lacrosse conditioning: repeat-sprint (Monday, paired with Lower Power &
// Sprint) vs change-of-direction (Thursday, paired with Lower Explosion &
// COD) — both drawn from Lacrosse's own old Friday vocabulary.
function laxConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['300 Yard Shuttle: 1x2', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['200m Intervals: 8x1 @ 80-85% effort (90 sec rest)', 'Broad Jump: 4x3'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`300 Yard Shuttle: ${conditioningSets(3, ph)}x2`, 'Broad Jump: 3x3'])
}
function laxConditioningB(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['V Drill: 2x3', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['V Drill: 5x3', '200m Intervals: 8x1 @ 80-85% effort (90 sec rest)'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`V Drill: ${conditioningSets(4, ph)}x3`, 'Star Drill: 3x3'])
}
// Lacrosse's rotation anchor reuses Med Ball Rotational Throw (already
// Day 2's own content); arm reuses the same Band External Rotation anchor
// every Field sport's bank uses, for a consistent "arm care" identity.
const LAX_FINISHERS = fieldFinisherBank(laxConditioningA, laxConditioningB, 'Med Ball Rotational Throw', 'Band External Rotation')

// feat/day-layout-engine — Lacrosse's pack. displayFocus restores the
// original 4-day names. Landmine Rotation/Cable Woodchop/Grip Work (Day
// 2's own rich rotational/grip vocabulary) have no slot on the leaner
// template — dropped (Band External Rotation fills ACC_SHOULDER instead,
// same generic-shoulder-health treatment used across this archetype).
const LAX_PACK = {
  finisherBank: LAX_FINISHERS,
  displayFocus: {
    'Lower Power': 'Lower Power & Sprint',
    'Upper Strength': 'Upper & Rotational Shooting Power',
    'Lower Explosion': 'Lower Explosion & Change of Direction',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
      ACC_UNILATERAL_LOWER: 'Single Leg RDL: 4x8 each leg',
      PLYO: (ctx) => `Lateral Bounds: ${explosiveSets(4, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PRESS: 'DB Bench Press: 4x8',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      MAIN_HINGE: 'Trap Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5',
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Weighted Pull-ups: 4x6',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band External Rotation: 4x15 each arm',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Hip Thrust: 4x8',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 3x5 (light)',
    },
  },
}

function generateLacrosseWeeks(_, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  if (!mg) return generateFieldWeeksFromPack(LAX_PACK, STD_PHASES, daysPerWeek)
  const phases = MG_PHASES
  const fn = (info) => lacrosseSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [LAX_DAY5, LAX_DAY6])
}

// ─── Swimming ─────────────────────────────────────────────────────────────────

const SWIM_PHASE_LABELS = ['Base Dryland', 'Build Dryland', 'Strength Dryland', 'Peak Dryland']

// Swimming — Endurance archetype, arm care ON (reinterpreted as shoulder/
// scapular capacity, not throwing-style arm care — per the user's explicit
// instruction). Per ENDURANCE_FINISHER_MODE: swim practice itself is the
// conditioning, so Energy content stays a light dryland tempo flush, never
// a second brutal workout; Sprint reuses Day 4's own explosive dryland
// vocabulary (Box Jump / Medicine Ball Overhead Throw — that day is a
// daysPerWeek>=4 extra, untouched, but its vocabulary is fair game here).
// Arm reuses the shoulder-health vocabulary already spread across Day 1/
// Day 5 (Band External Rotation, YTW Series, Face Pulls, Serratus Wall
// Slides). Core replaces the old ad hoc Plank/Dead Bug/Bird Dog/Core
// Circuit lines with the shared coreBlock. Rotation stays light (low
// weight in this archetype) and reuses the cross-sport Med Ball
// Rotational Throw.
const SWIMMING_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Box Jump: 2x5'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Box Jump: 3x5'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Box Jump: 4x5'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Medicine Ball Overhead Throw: 4x8'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Box Jump: 2x5 (light)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Resistance Band Sprint: 2x20 yds'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Resistance Band Sprint: 3x20 yds'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Resistance Band Sprint: 4x20 yds'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Ankle Hops: 4x20'] }
    return { subtitle: 'Reduced', lines: ['Resistance Band Sprint: 2x20 yds (light)'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Med Ball Rotational Throw: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
  arm(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Band External Rotation: 2x15 each arm'] }
    if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: ['Band External Rotation: 3x15 each arm', 'YTW Series: 3x10 each'] }
    if (ph === 2) return { subtitle: 'Modest Increase', lines: ['Band External Rotation: 4x15 each arm', 'Face Pulls: 4x15'] }
    if (ph === 3) return { subtitle: 'Maintenance', lines: ['YTW Series: 4x10 each'] }
    return { subtitle: 'Readiness', lines: ['Serratus Wall Slides: 3x12'] }
  },
}

// feat/day-layout-engine — Swimming's pack. Its own day content already
// splits cleanly into the archetype's "full body" shape once regrouped by
// PATTERN rather than the old Day1/2/3 split: Day2's Back Squat + Day3's
// DB Bench (a real horizontal press, previously stranded on its own
// "Full Dryland" day) become one squat+press day; Day1's Trap Bar
// Deadlift + Day3's Shoulder Press (a real vertical press) become one
// hinge+press day — no promotion needed, just consolidation, since
// Swimming already had genuine squat/hinge/horizontal-press/vertical-
// press content, just spread across a 3rd day the template doesn't have
// room for. Goblet Squat/Lat Pulldown/Push-ups(Day1)/Wrist Circles have
// no slot and are dropped. hasArmCare:true (reinterpreted as shoulder/
// scapular capacity, not throwing-style — per the user's own explicit
// instruction) nulls ACC_SHOULDER on "Full Body — Hinge & Press"; Band
// External Rotation still fills XC-style ACC_SHOULDER... n/a here (no
// slot needs it once hasArmCare is set). No % lifting anywhere (unchanged
// from before) — every MAIN_ entry is a (ctx) => line function using the
// same phaseNum<=2?3:4 set-count tiering Swimming's own content always
// used, at a flat "moderate load" note instead of a percentage.
const SWIM_PHASES = [
  { label: 'Base Dryland', low: 0.65, high: 0.70 },
  { label: 'Build Dryland', low: 0.65, high: 0.70 },
  { label: 'Strength Dryland', low: 0.65, high: 0.70 },
  { label: 'Peak Dryland', low: 0.65, high: 0.70 },
]
function swimSets(ctx) { return ctx.phaseNum <= 2 ? 3 : 4 }
const SWIM_RECOVERY_CONTENT = () => `Foam Roll: Full body — 10 minutes\nDownward Dog → Cobra flow: 3x10\nThoracic Rotation: 3x10 each side\nShoulder Cross-Body Stretch: 3x45s each arm\nHip 90/90 Hold: 2x45s each side`
const SWIMMING_PACK = {
  finisherBank: SWIMMING_FINISHERS,
  hasArmCare: true,
  recoveryContent: SWIM_RECOVERY_CONTENT,
  displayFocus: {
    'Full Body — Squat & Press': 'Lower',
    'Full Body — Hinge & Press': 'Upper & Posterior Chain',
  },
  byFocus: {
    'Full Body — Squat & Press': {
      MAIN_SQUAT: (ctx) => `Back Squat: ${swimSets(ctx)}x8 @ moderate load`,
      MAIN_PRESS_H: (ctx) => `DB Bench: ${swimSets(ctx)}x12`,
      ACC_HINGE: (ctx) => `Single Leg RDL: ${swimSets(ctx)}x10 each leg`,
    },
    'Full Body — Unilateral & Mobility': { // 3-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 3x6 each leg (light)',
      ACC_PULL_H: (ctx) => `DB Row: ${swimSets(ctx)}x12`,
    },
    'Full Body — Unilateral & Pull': { // 4-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 3x6 each leg (light)',
      ACC_PULL_H: (ctx) => `DB Row: ${swimSets(ctx)}x12`,
    },
    'Full Body — Hinge & Press': {
      MAIN_HINGE: (ctx) => `Trap Bar Deadlift: ${swimSets(ctx)}x8 @ moderate load`,
      MAIN_PRESS_V: (ctx) => `Shoulder Press: ${swimSets(ctx)}x12`,
      // Broad Jump, not Box Jump — Box Jump is SWIMMING_FINISHERS' own
      // 'sprint' family anchor; a different movement avoids the collision.
      PLYO: (ctx) => `Broad Jump: ${explosiveSets(4, ctx.phaseNum)}x5 (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Low-Load — Posterior & Mobility': {
      ACC_POSTERIOR: (ctx) => `Hip Thrust: ${swimSets(ctx)}x12`,
    },
    'Hip & Tissue Mobility': {
      ACC_POSTERIOR: (ctx) => `Hip Thrust: ${swimSets(ctx)}x12`,
    },
  },
}

function generateSwimmingWeeks(_, goal, daysPerWeek = 3) {
  return generateEnduranceWeeksFromPack(SWIMMING_PACK, SWIM_PHASES, daysPerWeek)
}

// ─── Baseball ─────────────────────────────────────────────────────────────────
// Used to be a flat, fixed % per phase (0.70/0.75/0.80/0.85) with zero climb
// across the 4 weeks inside a phase. Now a proper low/high range per phase,
// run through the same getPhaseInfo() every other sport uses, so baseball
// gets the identical wave-loading climb and per-phase deload as everyone else.
// Change 2 (shared block periodization): Phase 4 reuses Phase 1's own range
// as a genuine taper — see the longer comment on FB_PHASES above.
const BASEBALL_PHASES = [
  { label: 'Foundation',  low: 0.65, high: 0.72 },
  { label: 'Development', low: 0.72, high: 0.78 },
  { label: 'Strength',    low: 0.78, high: 0.83 },
  { label: 'Peak Taper',  low: 0.65, high: 0.72 },
]

// feat/variety-engine — this table's naming role is retired (see the big
// comment above const PHASE_ACCESSORY_MULT / applyAccessoryProgression
// below) — varietyEngine.js's resolveFiller() owns exercise naming now,
// and baseball's own ACC_* slots go through it like every other sport's.
// This table's ONE remaining live consumer is applySessionOrganization's
// `protectedNames` set, built from Object.keys(extraRotation) — every key
// below (including the "empty override" ones, whose {} value never
// mattered for naming and still doesn't) stays PROTECTED FROM PAIRING,
// because baseball's own inline weeklyVariant()/medBallPoolVariant()
// category-variation system (a completely separate mechanism, baked
// directly into BASEBALL_PACK's byFocus function values, evaluated before
// dayLayoutEngine even renders a line) still independently varies these
// exact names week to week — bracketing one of them with a neighbor would
// pair two lines whose names move on different, uncoordinated schedules.
const BASEBALL_ACCESSORY_ROTATION = {
  'band external rotation': {},
  'face pulls': {},
  'calf raises': {},
  'bulgarian split squat': {},
  'db bench press': {},
  'incline db press': {},
  'lateral raise': {},
  'reverse lunge': {},
  'single leg rdl': {},
  'pull-ups': {},
  'goblet squat': {},
}

// Per-sport extra-rotation lookup passed into applyAccessoryProgression.
// Baseball is the first entry; adding another sport's own rotation pool
// later is exactly this — one more `<sportId>: <SPORT>_ACCESSORY_ROTATION`
// line — nothing else in the shared engine needs to change.
//
// Keyed by two different ids for the same table on purpose: the auto-assign
// path looks this up by normalizeSport()'s output ('softball' normalizes to
// 'baseball'), while the coach manual-builder path looks it up by the
// SPORT_TEMPLATES entry's own id (a distinct 'softball' entry exists there,
// reusing generateBaseballWeeks — see its own comment below). Both must
// resolve to the same table so a coach-built softball blueprint gets the
// identical rotational-power/arm-care variety an auto-assigned one does.
const SPORT_ACCESSORY_ROTATION = {
  baseball: BASEBALL_ACCESSORY_ROTATION,
  softball: BASEBALL_ACCESSORY_ROTATION,
}

// ─── Change 4 — phase-keyed accessory rotation ─────────────────────────────
// Scoped to exactly the 5 target groups (baseball/softball, football,
// basketball, soccer). Every table below reuses names ALREADY vetted as safe
// substitutes by the existing wip-based tables above/ACCESSORY_ROTATION — no
// new exercise names are introduced anywhere in Change 4. Shape per key:
// {1: anchor, 2: <already-vetted "heavier/focused" target>, 3: <already-
// vetted "explosive/specific/unilateral" target>, 4: anchor} — phase 1 and 4
// both show the base template name (1 = Foundation, highest volume via
// PHASE_ACCESSORY_MULT; 4 = Peak, lowest volume — "stripped down").
//
// Baseball only phase-rotates its own 3 real (non-empty-override) wip
// entries — band external rotation / face pulls / calf raises. Every name
// already blocked in BASEBALL_ACCESSORY_ROTATION above (bulgarian split
// squat, db bench press, incline db press, lateral raise, reverse lunge,
// single leg rdl, pull-ups, goblet squat — all owned by the weekly
// weeklyVariant category-variation system) stays blocked here too, for the
// exact same reason: a second independent rotation axis on those names
// would fight the weekly anchor swap. That, plus Trap Bar Jump/the med-ball
// pools (governed by Change 3) and everything else on Day 1-4 (Gorilla Row,
// Tibialis Raises, Barbell Single Leg RDL, Side X Plank, Copenhagen
// Adductor, Suitcase Carry, Forearm Curls, Cable/Band Rotational Chop, the
// Iso-Hold pair, Pull-ups, the core finisher, the Arm Care circuit's Band
// Pull-Aparts line, and every warm-up) is baseball's stable core — left
// completely untouched by Change 4.
const BASEBALL_PHASE_ACCESSORY_ROTATION = {
  'band external rotation': { 1: 'Band External Rotation', 2: 'Scap Push-Ups',  3: 'YTW Raises',                      4: 'Band External Rotation' },
  'face pulls':              { 1: 'Face Pulls',             2: 'Prone Swimmers', 3: 'Crossover Symmetry Band Series', 4: 'Face Pulls' },
  'calf raises':             { 1: 'Calf Raises',            2: 'Tibialis Raises', 3: 'Seated Calf Raise',             4: 'Calf Raises' },
}

// Weighted Push-Ups — a lower-frequency 3rd option in the horizontal-push
// rotation (football's "incline db press" key below, soccer's "db bench
// press" key below), alongside the existing Close Grip Bench Press/DB
// Bench Press variants, which stay the primary options. Substitutes in on
// exactly one week — Phase 1's middle normal week (wip 2 = week 2) — out
// of the 9 normal training weeks this pool spans across a 16-week plan,
// clearly less often than either primary variant (each gets a full phase,
// 3 weeks apiece). Phase 4 (Peak Taper) keeps a plain anchor-name string
// for its own entry below, so this function is never even called during
// the taper; deload weeks never reach any phase-rotation resolution at
// all (applyAccessoryProgression returns early on every wip-4 week before
// resolvePhaseAccessory ever runs) — Weighted Push-Ups can't appear on
// weeks 4/8/12/16 or during weeks 13-16 by construction, not by a special case.
function phase1WithWeightedPushUpOption(anchorName) {
  return (weekNumber) => (weekNumber === 2 ? 'Weighted Push-Ups' : anchorName)
}

// Football skill/hybrid/qb share one table (all three already share the
// same FB_PHASES phase table and pipeline). Stable core: Hip Thrust, Single
// Arm DB Row, Band Pull-Aparts/External Rotation, Bent Over BB Row, Weighted
// Pull-ups, Landmine Press, YTW Shoulder Series, and everything Change 3
// already governs (DB Squat Jumps, Med Ball Chest Pass/Rotational Throw/
// Side Throw) — plus every Oly lift and the main lifts themselves.
const FOOTBALL_PHASE_ACCESSORY_ROTATION = {
  'single leg rdl':        { 1: 'Single Leg RDL',    2: 'Good Mornings',           3: 'Romanian Deadlift',    4: 'Single Leg RDL' },
  'bulgarian split squat': { 1: 'Bulgarian Split Squat', 2: 'Reverse Lunge',       3: 'Walking Lunge',        4: 'Bulgarian Split Squat' },
  'pull-ups':               { 1: 'Pull-ups',          2: 'DB Row',                 3: 'Chin-ups',             4: 'Pull-ups' },
  // Two keys for the same slot: hybrid's raw content reads "Incline DB
  // Press", skill's reads "DB Incline Press" (word order swapped — a
  // pre-existing naming inconsistency between the two session functions,
  // not something this change renames). Both need an entry or one of the
  // two positions silently never rotates at all.
  'incline db press':      { 1: phase1WithWeightedPushUpOption('DB Incline Press'), 2: 'Close Grip Bench Press', 3: 'DB Bench Press', 4: 'DB Incline Press' },
  'db incline press':      { 1: phase1WithWeightedPushUpOption('DB Incline Press'), 2: 'Close Grip Bench Press', 3: 'DB Bench Press', 4: 'DB Incline Press' },
}

// Basketball — shared across guards/wings/bigs. Stable core: Lateral
// Step-Up(s), Nordic Hamstring Curl, Snap Down, Depth Drop, DB Shrugs, DB
// Bench/Chest Press, BB Row, Overhead Press, court-conditioning finishers,
// and everything Change 3 already governs (DB Squat Jumps, Approach Jump).
const BASKETBALL_PHASE_ACCESSORY_ROTATION = {
  'bulgarian split squat': { 1: 'Bulgarian Split Squat', 2: 'Reverse Lunge', 3: 'Walking Lunge',         4: 'Bulgarian Split Squat' },
  'single leg rdl':        { 1: 'Single Leg RDL',        2: 'Good Mornings', 3: 'Romanian Deadlift',      4: 'Single Leg RDL' },
  'pull-ups':               { 1: 'Pull-ups',              2: 'DB Row',        3: 'Chin-ups',               4: 'Pull-ups' },
  'calf raises':            { 1: 'Calf Raises',           2: 'Seated Calf Raise', 3: 'Single Leg Calf Raise', 4: 'Calf Raises' },
}

// Soccer — shared across all 6 positions. Stable core: Nordic Hamstring
// Curl, Hip Thrust, Copenhagen Adductor, Groin Plank, carries/sled/sprint
// conditioning, MB Twist Throw/Med Ball Overhead Slam, and everything
// Change 3 already governs (the one jump line per position picked above).
const SOCCER_PHASE_ACCESSORY_ROTATION = {
  'single leg rdl':        { 1: 'Single Leg RDL',        2: 'Good Mornings', 3: 'Romanian Deadlift', 4: 'Single Leg RDL' },
  'bulgarian split squat': { 1: 'Bulgarian Split Squat', 2: 'Reverse Lunge', 3: 'Walking Lunge',      4: 'Bulgarian Split Squat' },
  'db bench press':        { 1: phase1WithWeightedPushUpOption('DB Bench Press'), 2: 'Incline DB Press', 3: 'Close Grip Bench Press', 4: 'DB Bench Press' },
  'lateral raise':          { 1: 'Lateral Raise',         2: 'Front Raise',   3: 'Cuban Press',        4: 'Lateral Raise' },
}

// ─── Coverage extension (feat/blueprint-quick-wins) ────────────────────────
// The 10 sport groups below never got Change 4 (or Change 1/3 — see each
// session function). Every table here reuses ONLY names already vetted as
// safe substitutes elsewhere in this file (the global wip-based
// ACCESSORY_ROTATION table above, or FOOTBALL_/BASKETBALL_/SOCCER_/
// BASEBALL_PHASE_ACCESSORY_ROTATION) — no new exercise names are introduced,
// same rule Change 4 has followed from the start. Keys are picked from names
// that actually recur in that sport's own real content (verified against
// the live session functions, not guessed).

// Hockey — shared across forwards/defense/goalie. All three share Weighted
// Pull-ups, Single Arm DB Row, Face Pulls, and Band External Rotation.
const HOCKEY_PHASE_ACCESSORY_ROTATION = {
  'weighted pull-ups':      { 1: 'Weighted Pull-ups',      2: 'DB Row',              3: 'Weighted Chin-ups', 4: 'Weighted Pull-ups' },
  'single arm db row':      { 1: 'Single Arm DB Row',      2: 'Chest Supported Row', 3: 'Pull-ups',          4: 'Single Arm DB Row' },
  'face pulls':             { 1: 'Face Pulls',             2: 'Reverse Flys',        3: 'DB Row',            4: 'Face Pulls' },
  'band external rotation': { 1: 'Band External Rotation', 2: 'Scap Push-Ups',       3: 'YTW Raises',        4: 'Band External Rotation' },
}

// Rugby — shared across forwards/backs. Both share Single Leg RDL,
// Bulgarian Split Squat, Weighted Pull-ups, and Face Pulls.
const RUGBY_PHASE_ACCESSORY_ROTATION = {
  'single leg rdl':        { 1: 'Single Leg RDL',        2: 'Good Mornings', 3: 'Romanian Deadlift', 4: 'Single Leg RDL' },
  'bulgarian split squat': { 1: 'Bulgarian Split Squat', 2: 'Reverse Lunge', 3: 'Walking Lunge',      4: 'Bulgarian Split Squat' },
  'weighted pull-ups':     { 1: 'Weighted Pull-ups',     2: 'DB Row',        3: 'Weighted Chin-ups',  4: 'Weighted Pull-ups' },
  'face pulls':            { 1: 'Face Pulls',            2: 'Reverse Flys', 3: 'DB Row',             4: 'Face Pulls' },
}

// Track — shared across sprint/throw/jump (all 3 sub-events, mirroring how
// basketball/soccer share one table across positions). Pull-ups, Hip
// Thrust, Nordic Hamstring Curl, and Overhead Press all recur in every
// sub-event's own content.
const TRACK_PHASE_ACCESSORY_ROTATION = {
  'pull-ups':              { 1: 'Pull-ups',              2: 'DB Row',          3: 'Chin-ups',           4: 'Pull-ups' },
  'hip thrust':            { 1: 'Hip Thrust',            2: 'Glute Bridge',    3: 'Romanian Deadlift',  4: 'Hip Thrust' },
  'nordic hamstring curl': { 1: 'Nordic Hamstring Curl', 2: 'Single Leg RDL',  3: 'Glute Bridge',       4: 'Nordic Hamstring Curl' },
  'overhead press':        { 1: 'Overhead Press',        2: 'Arnold Press',    3: 'Push Press',         4: 'Overhead Press' },
}

const WRESTLING_PHASE_ACCESSORY_ROTATION = {
  'weighted pull-ups':      { 1: 'Weighted Pull-ups',      2: 'DB Row',        3: 'Weighted Chin-ups', 4: 'Weighted Pull-ups' },
  'band external rotation': { 1: 'Band External Rotation', 2: 'Scap Push-Ups', 3: 'YTW Raises',        4: 'Band External Rotation' },
  'face pulls':             { 1: 'Face Pulls',             2: 'Reverse Flys',  3: 'DB Row',             4: 'Face Pulls' },
}

const VOLLEYBALL_PHASE_ACCESSORY_ROTATION = {
  'bulgarian split squat': { 1: 'Bulgarian Split Squat', 2: 'Reverse Lunge',       3: 'Walking Lunge',        4: 'Bulgarian Split Squat' },
  'calf raises':           { 1: 'Calf Raises',           2: 'Seated Calf Raise',  3: 'Single Leg Calf Raise', 4: 'Calf Raises' },
  'single arm db row':     { 1: 'Single Arm DB Row',     2: 'Chest Supported Row', 3: 'Pull-ups',             4: 'Single Arm DB Row' },
  'face pulls':            { 1: 'Face Pulls',            2: 'Reverse Flys',        3: 'DB Row',               4: 'Face Pulls' },
}

// Cross Country — Single Leg RDL and Pull-ups (CROSS_COUNTRY_PACK's own
// ACC_HINGE/ACC_PULL_H fills on "Full Body — Squat & Press"/"Full Body —
// Unilateral & Mobility") are the two names guaranteed present regardless
// of daysPerWeek — every day count's own template includes both days.
const XC_PHASE_ACCESSORY_ROTATION = {
  'single leg rdl': { 1: 'Single Leg RDL', 2: 'Good Mornings', 3: 'Romanian Deadlift', 4: 'Single Leg RDL' },
  'pull-ups':       { 1: 'Pull-ups',        2: 'DB Row',        3: 'Chin-ups',           4: 'Pull-ups' },
}

const LACROSSE_PHASE_ACCESSORY_ROTATION = {
  'single leg rdl':         { 1: 'Single Leg RDL',         2: 'Good Mornings',       3: 'Romanian Deadlift', 4: 'Single Leg RDL' },
  'single arm db row':      { 1: 'Single Arm DB Row',      2: 'Chest Supported Row', 3: 'Pull-ups',          4: 'Single Arm DB Row' },
  'band external rotation': { 1: 'Band External Rotation', 2: 'Scap Push-Ups',       3: 'YTW Raises',        4: 'Band External Rotation' },
}

const TENNIS_PHASE_ACCESSORY_ROTATION = {
  'bulgarian split squat':  { 1: 'Bulgarian Split Squat',  2: 'Reverse Lunge',       3: 'Walking Lunge',     4: 'Bulgarian Split Squat' },
  'single leg rdl':         { 1: 'Single Leg RDL',         2: 'Good Mornings',       3: 'Romanian Deadlift', 4: 'Single Leg RDL' },
  'single arm db row':      { 1: 'Single Arm DB Row',      2: 'Chest Supported Row', 3: 'Pull-ups',          4: 'Single Arm DB Row' },
  'band external rotation': { 1: 'Band External Rotation', 2: 'Scap Push-Ups',       3: 'YTW Raises',        4: 'Band External Rotation' },
}

const GOLF_PHASE_ACCESSORY_ROTATION = {
  'single arm db row': { 1: 'Single Arm DB Row', 2: 'Chest Supported Row', 3: 'Pull-ups',                4: 'Single Arm DB Row' },
  'db bench press':    { 1: 'DB Bench Press',     2: 'Incline DB Press',   3: 'Close Grip Bench Press', 4: 'DB Bench Press' },
  'single leg rdl':    { 1: 'Single Leg RDL',     2: 'Good Mornings',      3: 'Romanian Deadlift',      4: 'Single Leg RDL' },
}

const SWIMMING_PHASE_ACCESSORY_ROTATION = {
  'pull-ups':               { 1: 'Pull-ups',               2: 'DB Row',         3: 'Chin-ups',    4: 'Pull-ups' },
  'band external rotation': { 1: 'Band External Rotation', 2: 'Scap Push-Ups', 3: 'YTW Raises',   4: 'Band External Rotation' },
  'face pulls':             { 1: 'Face Pulls',              2: 'Reverse Flys',  3: 'DB Row',       4: 'Face Pulls' },
}

// Registry mirroring SPORT_ACCESSORY_ROTATION's shape/keys exactly, so both
// call sites (blueprintController.js and generateBlueprintForAthlete below)
// can pass `SPORT_PHASE_ACCESSORY_ROTATION[sportId] || {}` right alongside
// the existing `SPORT_ACCESSORY_ROTATION[sportId] || {}` with no other
// wiring changes. `resolvePhaseRotationKey` already returns the bare sport
// id for every non-football sport, so registering a new key here is the
// ONLY wiring needed to reach it — no change to resolvePhaseRotationKey,
// resolveAccessoryCapKey, applyAccessoryProgression, or the call site.
// General (the "Other" fallback) and football linemen/muscle-gain
// deliberately stay unregistered — see each's own comment elsewhere in this
// file for why.
const SPORT_PHASE_ACCESSORY_ROTATION = {
  baseball:      BASEBALL_PHASE_ACCESSORY_ROTATION,
  softball:      BASEBALL_PHASE_ACCESSORY_ROTATION,
  football:      FOOTBALL_PHASE_ACCESSORY_ROTATION,
  basketball:    BASKETBALL_PHASE_ACCESSORY_ROTATION,
  soccer:        SOCCER_PHASE_ACCESSORY_ROTATION,
  hockey:        HOCKEY_PHASE_ACCESSORY_ROTATION,
  rugby:         RUGBY_PHASE_ACCESSORY_ROTATION,
  track:         TRACK_PHASE_ACCESSORY_ROTATION,
  wrestling:     WRESTLING_PHASE_ACCESSORY_ROTATION,
  volleyball:    VOLLEYBALL_PHASE_ACCESSORY_ROTATION,
  cross_country: XC_PHASE_ACCESSORY_ROTATION,
  lacrosse:      LACROSSE_PHASE_ACCESSORY_ROTATION,
  tennis:        TENNIS_PHASE_ACCESSORY_ROTATION,
  golf:          GOLF_PHASE_ACCESSORY_ROTATION,
  swimming:      SWIMMING_PHASE_ACCESSORY_ROTATION,
}

// Phase-gated plyo progression for baseball, mirroring the shape of the
// shared phasePlyo() helper above (one function, phase number in, one jump
// out) that football/basketball/etc already use — same pattern, but
// baseball's own explosive-power library, and returning an exercise OBJECT
// (not a pre-formatted string) since baseball's session builder composes
// from objects, not raw template-literal text. Box Jumps -> Broad Jumps ->
// the Depth Jump -> Box Jump contrast combo -> back to Box Jumps at higher
// volume for the peak phase.
// ─── Category-based lift variation (deterministic) ─────────────────────
// Alternates which named variant of an exercise shows on a given week while
// the %-ramp progression (info.ramp/info.pct, computed once per week by
// getPhaseInfo) stays completely untouched — only the exercise NAME varies;
// load computation is identical either way. "Every other week" = alternates
// every single week (odd vs. even), not every 2 weeks. Originally
// baseball-only; now shared — see Tennis/Golf's own ACC_PRESS entries.
function weeklyVariant(weekNumber, a, b) {
  return weekNumber % 2 === 1 ? a : b
}

// Med-ball rotational/power pool — still used by baseballFinisherBank's own
// 'rotation' family below (the finisher engine's pre-existing week-based
// rotation, not day-content variety — see that function's own comment).
// feat/day-layout-engine dropped the OLD inline Day 3/4 accessory calls to
// this same pool (medBallPoolVariant/upperPowerMedBallVariant fed a second,
// independent rotation axis on top of the finisher's own — Stage 1 scope
// is static day-content resolution, real variety pools are Stage 2's job;
// see BASEBALL_PACK's own doc comment).
const MED_BALL_POOL = ['Med Ball Rotational Throw', 'Med Ball Scoop Toss', 'Shotput Med Ball Throw', 'Med Ball Overhead Slam']
function medBallPoolVariant(weekNumber) {
  return MED_BALL_POOL[(weekNumber - 1) % MED_BALL_POOL.length]
}

// Rotating pool — 3 movements at a time, keeping the 20s-on/10s-off
// interval structure. Decline Bench Iso is a genuine 30-second static hold,
// not an interval movement, so it gets its own "3x30s hold" line instead
// when it's in rotation.
const CORE_FINISHER_POOL = [
  'Alternating V-Ups', 'Penguins', 'Alternating Supermans', 'Flutter Kicks',
  'Mountain Climbers', 'Russian Twists', 'Hollow Hold', 'Cherry Pickers',
  'Decline Bench Iso', 'Dead Bug',
]

// Deterministic (not random) rotation: a rolling 3-movement window keyed by
// week number, so the finisher varies week to week but is reproducible and
// consistent for any given week — no persisted/random state needed, and two
// calls with the same week number always produce the same 3 movements.
function coreFinisherMovements(weekNumber) {
  const start = ((weekNumber - 1) * 3) % CORE_FINISHER_POOL.length
  return [0, 1, 2].map(i => CORE_FINISHER_POOL[(start + i) % CORE_FINISHER_POOL.length])
}

// ─── Baseball — Shared Finisher Engine wiring (feat/finisher-engine) ──────
// Rotational/Throwing archetype. Baseball's existing per-day finishers
// (BIKE_LADDER, BASEBALL_SPRINT_PROTOCOL, the Arm Care circuit,
// baseballCoreFinisher's own rotating pool) were already well-designed —
// one finisher per day, day-type-locked so arm-care/core/conditioning never
// collide on the same day — but were STATIC (identical every week within a
// phase) and NOT deload-safe: none of them used the "Core/Arm Care/
// Conditioning —" exempt-header convention, so isConditioningLine silently
// DELETED them outright on deload weeks rather than tapering — the same gap
// the Repeat-Sprint archetype had before its own PR #20 finisher
// restructure. Wiring onto the shared engine fixes both, reusing this
// existing content as directly as possible: Core keeps baseballCoreFinisher's
// own week-based rotating pool verbatim; Rotation reuses the existing
// medBallPoolVariant rotation; Arm reuses the existing Band External
// Rotation/Face Pulls/Band Pull-Aparts circuit; Sprint/Energy keep their
// existing Sprint Tempo Protocol/Bike Ladder prescriptions, now with real
// phase progression instead of one fixed prescription all 16 weeks.
// Bumps every "SxR" set count in a line by +1 — restores baseball's own
// PRE-EXISTING pitcher differentiation ("higher sets on the same 3-move
// circuit," not a different exercise) that predates the engine and would
// otherwise be lost: the position override changes SCHEDULING (which day/
// how often arm care shows up), not the content bank's own text, so
// without this, Pitcher and Position Player would render byte-identical
// arm-care volume whenever it does land on the same day for both.
function bumpSets(line) {
  return line.replace(/(\d+)x/, (_, n) => `${parseInt(n, 10) + 1}x`)
}

function baseballFinisherBank(weekNumber, isPitcher = false) {
  return {
    sprint(ph, dl) {
      if (dl) return { subtitle: 'Deload (Light)', lines: ['Sprint Tempo Protocol: 3x1 — 20 yds stride @ 70%, jog back @ 50%, 20 yds stride @ 70%, walk back = 1 rep'] }
      if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Sprint Tempo Protocol: 5x1 — 20 yds stride @ 75%, jog back @ 50%, 20 yds stride @ 75%, walk back = 1 rep'] }
      if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Sprint Tempo Protocol: 5x1 — 30 yds stride @ 75%, jog back @ 50%, 30 yds stride @ 75%, walk back = 1 rep'] }
      if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Sprint Tempo Protocol: 6x1 — 30 yds stride @ 85%, jog back @ 50%, 30 yds stride @ 85%, walk back = 1 rep'] }
      return { subtitle: 'Full-Recovery Reps', lines: ['Sprint Tempo Protocol: 4x1 — 30 yds stride @ 85%, full recovery, 30 yds stride @ 85%, full recovery = 1 rep'] }
    },
    energy(ph, dl) {
      if (dl) return { subtitle: 'Deload (Light)', lines: ['Bike Ladder: 2x1 — 10s on/20s off, 15s/15s, 10s/20s'] }
      if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Bike Ladder: 3x1 — 10s on/20s off, 15s/15s, 20s/10s, 15s/15s, 10s/20s'] }
      if (ph === 2) return { subtitle: 'Interval Work', lines: ['Bike Ladder: 4x1 — 10s on/20s off, 15s/15s, 20s/10s, 25s/5s, 20s/10s, 15s/15s, 10s/20s'] }
      if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Bike Ladder: 3x1 — 20s on/10s off, 25s/5s, 20s/10s'] }
      return { subtitle: 'Reduced', lines: ['Bike Ladder: 2x1 — 10s on/20s off, 15s/15s'] }
    },
    core(ph, dl) {
      if (dl) return { subtitle: 'Deload (Light)', lines: ['Dead Bug: 2x8 each side', 'Plank: 2x20 seconds'] }
      const lines = coreFinisherMovements(weekNumber).map(name =>
        name === 'Decline Bench Iso' ? `${name}: 3x30s hold` : `${name}: 3x20s`)
      return { subtitle: 'Finisher (20s on/10s off unless noted)', lines }
    },
    rotation(ph, dl) {
      const anchor = medBallPoolVariant(weekNumber)
      if (dl) return { subtitle: 'Deload (Light)', lines: [`${anchor}: 2x5 each side`] }
      if (ph === 1) return { subtitle: 'Half-Kneeling', lines: [`${anchor}: 3x6 each side (half-kneeling)`] }
      if (ph === 2) return { subtitle: 'Standing', lines: [`${anchor}: 3x6 each side`] }
      if (ph === 3) return { subtitle: 'Maximal Velocity', lines: [`${anchor}: 4x6 each side (max intent)`] }
      return { subtitle: 'Low Volume, Max Intent', lines: [`${anchor}: 2x6 each side (max intent)`] }
    },
    arm(ph, dl) {
      let entry
      if (dl) entry = { subtitle: 'Deload (Light)', lines: ['Band External Rotation: 2x15 each arm', 'Face Pulls: 2x15'] }
      else if (ph === 1) entry = { subtitle: 'Capacity & Scap Control', lines: ['Band External Rotation: 4x15 each arm', 'Face Pulls: 3x15', 'Band Pull-Aparts: 3x20'] }
      else if (ph === 2) entry = { subtitle: 'Modest Increase', lines: ['Band External Rotation: 4x15 each arm', 'Face Pulls: 3x15'] }
      else if (ph === 3) entry = { subtitle: 'Maintenance', lines: ['Face Pulls: 3x15', 'Band Pull-Aparts: 3x20'] }
      else entry = { subtitle: 'Readiness', lines: ['Band External Rotation: 3x15 each arm'] }
      return isPitcher ? { ...entry, lines: entry.lines.map(bumpSets) } : entry
    },
  }
}

// Day-type compatibility (see finisherEngine.js's scheduleFamilies/
// assignSecondaries) — baseball's own PRE-EXISTING "day-type locking" rule
// (arm-care work never on a lower-body day) predates this engine and is a
// real, tested invariant, not something the engine's normally-free
// scheduling should silently break. Sprint/Energy are the lower-body-day-
// compatible families (leg-driven conditioning); Core/Arm are upper-body-
// day-compatible; Rotation fits either. Day-count-aware (a function, not a
// static array) because which template day is lower/upper-flavored shifts
// with the day count — 5-day's bonus day ("Shoulder Health & Power
// Accessory") is upper/arm-flavored, 6-day's own 5th day ("Lower
// Explosion") is a real lower day — see buildRotationalRenderers' own
// function-vs-static-array support.
//
// baseballFinisherPlanDays floors the day count the finisher ENGINE plans
// against to 4, even on a 3-day week — matching the pre-existing behavior
// this rebuild preserves (the old 3-day split always planned a full 4-day
// finisher schedule and only sliced off Day 4's session, never asking the
// engine to fit all 5 families into just 3 day-compat-constrained slots).
// With only 3 real slots, the engine's own documented last-resort fallback
// ("ignore compatibility rather than drop the family entirely" — see
// scheduleFamilies/assignSecondaries) can and does place Arm Care on a
// lower day, which would break day-type locking; flooring to 4 avoids ever
// exercising that fallback for baseball. dayCompatibility mirrors the same
// floor so its own array length always matches what's actually planned.
function baseballFinisherPlanDays(ctx) {
  return Math.max(4, ctx.days)
}
const BASEBALL_LOWER_COMPAT = ['sprint', 'energy', 'rotation']
const BASEBALL_UPPER_COMPAT = ['core', 'arm', 'rotation']
function baseballDayCompat(ctx) {
  const L = BASEBALL_LOWER_COMPAT, U = BASEBALL_UPPER_COMPAT
  const days = baseballFinisherPlanDays(ctx)
  if (days === 5) return [L, U, L, U, U]
  if (days === 6) return [L, U, L, U, L, U]
  return [L, U, L, U] // 3-day floors to this same 4-entry array; 4-day itself
}

// Pitcher's own position override — "more arm care + lower rotational-throw
// volume" (per the spec's own example) — differentiates Pitcher from
// Position Player by weighting only, same content bank, no new exercises.
// ±12 is the largest delta that still respects baseballDayCompat at every
// phase — past ±12, Rotation (the lower-body days' flex family alongside
// Sprint/Energy) gets suppressed hard enough that Phase 1 can be left with
// no lower-compatible family remaining, forcing a same-day arm-care/lower-
// body violation (verified by brute-force sweep 8/10/12/14/16 against
// every phase; 14 was the first delta to violate).
const PITCHER_FINISHER_OVERRIDES = { arm: 12, rotation: -12 }

// ─── Day-type warm-up blocks ────────────────────────────────────────────
// Attached as session.warmup — a SEPARATE field from `description`, not text
// woven into it, deliberately: warm-ups are fixed/consistent (never rotated,
// never volume-waved, never touched by deload) so keeping them structurally
// outside `description` means none of the line-classification passes
// (accessory rotation, deload reduction, session organization, injury
// substitution) need to know warm-ups exist at all. `blueprint_weeks.sessions`
// is a JSONB column — this needs no schema migration, and blueprintService.js
// already stores whatever's on a session object as-is. Rendered client-side
// as a collapsed, tap-to-expand block (see SessionDescription.jsx) so a long
// warm-up doesn't overwhelm the session view. Attached generically off the
// day template's own MAIN_ tag composition by generateBaseballWeeksFromPack
// below (MAIN_SQUAT->lower_power, MAIN_HINGE->squat_hinge, MAIN_PRESS_*->
// upper_push, no MAIN_ tag->no warmup) — every other Rotational-archetype
// sport instead weaves its warmup into `description` text via
// pack.warmupLower/warmupUpper; baseball keeps its own pre-existing,
// distinct collapsed-block UI treatment untouched.
const UPPER_PUSH_WARMUP = {
  label: 'Upper/Push Warm-Up',
  lines: [
    'Prone Y-T-W Raises: 2-3x5-8',
    'Band External Rotation: 2-3x5-8',
    'Scap Push-Ups: 2-3x5-8',
    'Band Pull-Aparts: 2-3x5-8',
    'Prone Swimmers: 2-3x5-8',
    'Cuban Press: 2-3x5-8',
    'Push-ups: 2-3x5-8',
    'Wall Slides: 2-3x5-8',
    'Face Pulls: 2-3x5-8 (light)',
    'Arm Circles / Pass-Throughs: 2-3x5-8',
  ],
}
const LOWER_POWER_WARMUP = {
  label: 'Lower Power Warm-Up',
  lines: [
    'Jog: brief',
    'Open and Close the Gate: 2x10 each',
    'Leg Swings: 10 each (front/back + side)',
    'Walking Lunge: 10 yds',
    'Karaoka: 10 yds each way (both ways)',
    'High Knees / Butt Kicks: 10 yds each',
    'Side Shuffle: 10 yds each way (both ways)',
    'A-Skips: 10 yds',
    'Broad Jumps: 3 (submax)',
    'A-Skip to 10-Yard Build-Up: 2',
    'Short Sprints: 2x15 yds',
  ],
}
const SQUAT_HINGE_WARMUP = {
  label: 'Squat/Hinge Warm-Up',
  lines: [
    'Cat-Cow: 8-10',
    '90/90 Hip Rotations: 5 each side',
    'Clock T-Spine: 5 each direction',
    'Inchworms with Seal Stretch: 5',
    'Thread the Needle: 5 each side (T-Spine)',
    'Glute Bridge: 10',
    'Bodyweight Squat to Depth: 8 (use squat rack to pull deeper)',
    'Ankle Cradle to Side Lunge: 5 each side',
    'Squat to Hamstring: 8',
  ],
}

// ─── Baseball/Softball — Rotational archetype day-layout packs ────────────
// feat/day-layout-engine, Stage 1: baseball's old object-array session
// builder (makeBaseballSession/buildSessionDescription, ss-based authored
// supersets, weeklyVariant-driven exercise-name swaps on Front Squat/Back
// Squat, Trap Bar Deadlift/Reverse Lunge, DB Bench Press/Incline DB Press,
// plus the Tricep/Bicep rotatingChoice slots) is retired in favor of the
// same tagged/role-flagged slot structure every other sport in this PR now
// uses. Two things are deliberately NOT carried over, both out of Stage 1's
// stated scope ("resolve tags to exercises using current/static selection,
// no phase-varying pools yet — that's Stage 2's job"):
//   - The weekly exercise-NAME alternation (weeklyVariant) on the day's own
//     MAIN_/accessory content — every pack in this PR picks one static
//     exercise per slot; baseball is no exception.
//   - The old Day 3/4 inline Med Ball accessory calls
//     (medBallPoolVariant/upperPowerMedBallVariant) — the finisher engine's
//     own 'rotation' family already reuses medBallPoolVariant on whichever
//     day it lands (untouched, see baseballFinisherBank below), so an
//     inline MED_BALL slot with the SAME pool risks the exact duplication
//     class already fixed for ACC_CORE/ACC_SHOULDER; the Tricep/Bicep
//     choose-1 slots have no isolation-work tag in this archetype at all.
// What IS preserved untouched: the finisher engine wiring itself
// (baseballFinisherBank's week-based core/rotation rotation, arm-care
// bumpSets pitcher differentiation, baseballDayCompat's day-type locking)
// — that's pre-existing finisher-engine behavior this PR's own spec says to
// plug into, not redesign — and the day-type-locked warmup-as-separate-
// field UI treatment (see UPPER_PUSH_WARMUP etc. above).
//
// Squat/hinge conformance: 'Lower Power' keeps Back Squat (was already the
// template's own MAIN_SQUAT day); 'Lower Explosion' (6-day only) gets Front
// Squat, restoring the OTHER half of the old weekly Front/Back alternation
// as its own distinct day instead. MAIN_HINGE keeps Trap Bar Deadlift
// (static); the old alternate, Reverse Lunge, gets its own home as
// 'Lower Explosion's ACC_UNILATERAL_LOWER anchor instead of disappearing.
//
// Vertical-press conformance (same fix already applied to Rugby Forwards/
// Hockey Forwards/Tennis/Golf/QB/Track Throwers): 'Upper & Shoulder Health'
// structurally wants a genuine vertical press, which neither position had
// before (DB Bench Press covered the sport's only bench slot). Position
// Player gets a real Overhead Press, matching every other hasArmCare:true
// sport's own resolution. Pitcher keeps "no direct overhead pressing" —
// its own explicit, pre-existing design constraint — by filling the slot
// with Landmine Press (an angled, shoulder-safer press pattern, and
// already pitcher's own pre-existing bench-slot substitute) instead.
function baseballFinisherBankFor(isPitcher) {
  return (ctx) => baseballFinisherBank(ctx.week, isPitcher)
}

// feat/baseball-ohp-superset-fix — two targeted content fixes, Position
// Player only (Pitcher was already correct on both counts — see
// PITCHER_PACK's own comment — and is untouched here):
//
// 1. No barbell Overhead Press. MAIN_PRESS_V used to resolve to a literal,
//    percentage-ramped 'Overhead Press' (see buildRotationalRenderers —
//    MAIN_ tags render as a real ramped main lift, not a light accessory)
//    on both days that carry the tag. Throwing-shoulder health means
//    baseball/softball must never load a barbell overhead press; Incline
//    DB Press is the ceiling. Both MAIN_PRESS_V entries below now resolve
//    to 'Incline DB Press' (the exact vetted exerciseLibrary.js name —
//    'incline db press' — word order matters for the client's lookup) with
//    a suffix explaining why, mirroring Pitcher's own Landmine Press note.
//    Since softball has no dedicated pack (normalizeSport maps it onto
//    'baseball', see generateBaseballWeeks), this fixes softball too, at
//    every day count and goal — there's no separate softball code path to
//    also patch.
//
// 2. A second superset per day. Every Rotational-archetype day template
//    only ever supplies 2-3 accessory-tag slots after ACC_CORE/ACC_SHOULDER
//    null out (see buildRotationalRenderers' own comment on why those two
//    tags render null for hasArmCare sports) — too few candidates for
//    organizeSessionDescription's pairing pass to ever form more than one
//    bracket, regardless of day. Pre-migration baseball routinely authored
//    2-3 supersets/day (see git history on this file, 92a44b8^, e.g. three
//    explicit `ss:` groups on one day) — the day-layout migration thinned
//    that out as a side effect, not a deliberate one.
//    Option A patch (explicitly NOT a dayLayoutEngine.js template change,
//    which would also alter every other Rotational sport — Tennis/Golf/QB/
//    Track Throw — a separate, not-yet-approved task): extend specific
//    ACC_* entries below into multiple newline-separated exercises. Only
//    ANCHOR-flagged tags (per the 'rotational' template in
//    dayLayoutEngine.js) and MED_BALL are extended this way — anchor slots
//    always render their pack text verbatim (varietyEngine.resolveFiller's
//    `if (slotDef.anchor) return packChoiceText`), and MED_BALL is entirely
//    outside variety-engine scope (not in POOLED_TAGS) — so both are safe
//    to make multi-line without the variety engine's pool silently
//    overriding the extra content on non-week-1 weeks, which would make
//    the superset count inconsistent week to week. A genuinely pooled,
//    non-anchor tag (ACC_UNILATERAL_LOWER on 'Lower Power', ACC_POSTERIOR
//    on 'Lower Strength', ACC_PULL_V where non-anchor, ...) is left exactly
//    as it was — still a single, phase/week-rotating line — both to avoid
//    that inconsistency and because touching it would be a variety-engine
//    change, out of this patch's scope. New exercise names below are
//    checked against exerciseLibrary.js (exact match required — the
//    lookup is a plain lowercase string match, no plural/word-order
//    normalization) and against every finisher-family's own vocabulary
//    (baseballFinisherBank's arm/rotation/core families) to avoid
//    reintroducing the same same-day duplicate-line class fixed on
//    feat/variety-engine.
const BASEBALL_PACK = {
  finisherBank: baseballFinisherBankFor(false),
  hasArmCare: true,
  dayCompatibility: baseballDayCompat,
  finisherPlanDays: baseballFinisherPlanDays,
  displayFocus: {
    'Upper & Shoulder Health': 'Upper Strength',
    'Upper & Rotational': 'Upper Strength & Rotational',
    'Upper Power & Rotational': 'Upper Power',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      // Plain "Single Leg RDL" (not "Barbell Single Leg RDL") — matches
      // every other Rotational sport's own ACC_HINGE text (see Golf/Tennis/
      // QB/Track Throwers) and keeps applyHipAdjustments' pre-existing
      // Single Leg RDL -> Hamstring Curls hip-injury substitution reachable
      // (its regex is anchored to the exact start of the line — the 2nd/3rd
      // lines added below are untouched by it either way).
      // ACC_HINGE is anchor:true on every day count this key is used at
      // (3/4/6-day) — safe to extend. feat/superset-ohp-fixes: 3 straight
      // hinge/hamstring lines here (Single Leg RDL/Nordic/Hip Thrust) plus
      // ACC_UNILATERAL_LOWER's own single squat-pattern line is 3 HINGE + 1
      // SQUAT candidates — organizeSessionDescription's now movement-
      // pattern-aware pairing can only ever form ONE valid non-competing
      // pair out of that mix (whichever hinge line reaches the lone squat
      // line), leaving the other two hinge lines unpaired rather than
      // forced into a same-pattern bracket. A 4th line, Sandbag Carry
      // (loaded carry/anti-lateral-flexion — CORE_CARRY in
      // movementPatterns.js, competes with nothing), gives every one of
      // the 3 hinge lines a genuine, distinct non-competing partner (2
      // pair off against the squat line and the carry line; the 3rd
      // stands alone same as before) — reaching 2 full supersets without
      // cutting any existing content. NOT Copenhagen Adductor/Suitcase
      // Carry/Glute Bridge — all three are in MOBILITY_EXACT_EXEMPT
      // (isMobilityCoreExempt), so isAccessoryLine silently excludes them
      // from organizeSessionDescription's pairing candidates entirely
      // (confirmed by direct trace: adding one here rendered as an
      // untouched, unpaired trailing line, not a 4th pairing candidate at
      // all — the day stayed stuck at 1 superset).
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg\nNordic Hamstring Curl: 4x6\nHip Thrust: 4x10\nSandbag Carry: 4x20 yds',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
    },
    'Upper & Shoulder Health': { // 4-day only
      MAIN_PRESS_V: { name: 'Incline DB Press', suffix: ' (dumbbells only — no barbell overhead pressing, for throwing-shoulder health)' },
      // ACC_PULL_H is anchor:true here, MED_BALL is never pool-driven
      // (outside POOLED_TAGS) — both safe to extend; together they're
      // exactly 2 full supersets (ACC_SHOULDER nulls out on this day for
      // hasArmCare sports, so no 3rd accessory tag competes for a slot).
      ACC_PULL_H: 'Gorilla Row: 4x8\nLateral Raise: 3x12',
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Upper & Rotational': { // 3-day only
      MAIN_PRESS_H: 'DB Bench Press',
      ACC_PULL_H: 'Gorilla Row: 4x8\nLateral Raise: 3x12',
      ACC_PULL_V: 'Pull-ups: 4xAMAP', // non-anchor here — left as a single, phase-rotating line, on purpose
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Lower Strength': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      // ACC_SQUAT is anchor:true at 4/6-day (paired below with the
      // pool-driven ACC_POSTERIOR line) but non-anchor at 3-day, where
      // MED_BALL (always safe) carries the 2nd-pair job instead — both
      // values coexist here since each day count only ever reads the tag
      // its own template actually declares. feat/superset-ohp-fixes: at
      // 4/6-day, 3 straight squat-pattern lines (Goblet Squat/Step-Ups/
      // Cossack Squat) plus ACC_POSTERIOR's own single hinge-pattern line
      // is 3 SQUAT + 1 HINGE — same shape as ACC_HINGE's own fix above,
      // same reasoning: only one valid non-competing pair is possible out
      // of that mix. A 4th line, Sandbag Carry (CORE_CARRY, competes with
      // nothing — see that fix's own comment for why NOT Copenhagen
      // Adductor/Suitcase Carry/Glute Bridge, all MOBILITY_EXACT_EXEMPT and
      // silently excluded from pairing entirely), gives a genuine partner
      // to a 2nd squat line, so 2 of the 3 squat lines pair off (one
      // against the hinge line, one against the carry line) and reach 2
      // full supersets — the 3rd stands alone same as before, no existing
      // content cut.
      ACC_SQUAT: 'Goblet Squat: 4x10\nStep-Ups: 4x6 each leg\nCossack Squat: 3x10 each side\nSandbag Carry: 4x20 yds',
      ACC_POSTERIOR: 'Hip Thrust: 4x8', // 4/6-day — non-anchor, left as a single, phase-rotating line
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8\nLateral Bounds: 4x5 each side', // 3-day
    },
    'Upper Power & Rotational': { // 4-day only
      MAIN_PRESS_H: 'DB Bench Press',
      // Only safe tag on this 3-slot day (ACC_PULL_V is non-anchor, pool-
      // driven) — extended to 3 lines so, paired with ACC_PULL_V's single
      // pool line, this still reaches 2 full supersets.
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm\nChest Supported Row: 4x10\nReverse Flys: 3x15',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
    },
    'Shoulder Health & Power Accessory': { // 5-day — MED_BALL is the ONLY
      // accessory tag this bonus day carries at all (ACC_CORE/ACC_SHOULDER
      // both null out), so it alone has to supply both pairs.
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8\nBroad Jumps: 3x5 (submax)\nLateral Bounds: 4x5 each side',
    },
    'Upper — Vertical Press Emphasis': { // 6-day
      MAIN_PRESS_V: { name: 'Incline DB Press', suffix: ' (dumbbells only — no barbell overhead pressing, for throwing-shoulder health)' },
      ACC_PULL_V: 'Pull-ups: 4xAMAP\nChest Supported Row: 4x10', // anchor on this day count
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Upper — Horizontal Press Emphasis': { // 6-day
      MAIN_PRESS_H: 'DB Bench Press',
      ACC_PULL_H: 'Gorilla Row: 4x8\nLateral Raise: 3x12',
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Lower Explosion': { // 6-day
      MAIN_SQUAT: 'Front Squat',
      ACC_UNILATERAL_LOWER: 'Reverse Lunge: 4x6 each leg\nStep-Ups: 4x6 each leg', // anchor on this day
      ACC_POSTERIOR: 'Hip Thrust: 4x8', // non-anchor — left as a single, phase-rotating line
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Upper — Arm-Care Emphasis': { // 6-day — no MAIN_ tag at all, so
      // organizeSessionDescription's "no ramped/oly lift" rule promotes
      // whichever accessory is authored FIRST to stand alone as the day's
      // free anchor line, removing it from the pairing pool entirely. Extend
      // ACC_PULL_H (anchor:true) to 4 lines so, even after the 1st is
      // promoted away, the remaining 3 plus ACC_PULL_V's single pool line
      // still reach 2 full supersets.
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm\nChest Supported Row: 4x10\nDB Row: 4x10 each arm\nSeated Cable Lat Pulldown: 4x12',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
    },
  },
}

// Pitcher — same shape, three differentiators (all pre-existing, all
// preserved): no direct overhead pressing (Landmine Press fills the
// vertical-press slot instead of Overhead Press), Copenhagen Adductor as
// the "enhanced hip stability" swap wherever ACC_POSTERIOR would otherwise
// be Hip Thrust, and PITCHER_FINISHER_OVERRIDES (more arm care, less
// rotational-throw volume) on the finisher.
const PITCHER_PACK = {
  finisherBank: baseballFinisherBankFor(true),
  hasArmCare: true,
  dayCompatibility: baseballDayCompat,
  finisherPlanDays: baseballFinisherPlanDays,
  finisherOverrides: PITCHER_FINISHER_OVERRIDES,
  displayFocus: {
    'Upper & Shoulder Health': 'Upper Strength and Arm Care',
    'Upper & Rotational': 'Upper Strength, Arm Care & Rotational',
    'Upper Power & Rotational': 'Upper Power and Rotational',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      // Plain "Single Leg RDL" (not "Barbell Single Leg RDL") — matches
      // every other Rotational sport's own ACC_HINGE text (see Golf/Tennis/
      // QB/Track Throwers) and keeps applyHipAdjustments' pre-existing
      // Single Leg RDL -> Hamstring Curls hip-injury substitution reachable
      // (its regex is anchored to the exact start of the line). Extended
      // to the same 4-line ACC_HINGE shape as BASEBALL_PACK's own
      // (already-verified) fix for the identical single-superset shortfall
      // — see that pack's comment for the full reasoning; Sandbag Carry
      // gives 2 of the 3 hinge lines a genuine non-competing partner (one
      // against the squat line, one against the carry line) instead of
      // only one.
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg\nNordic Hamstring Curl: 4x6\nHip Thrust: 4x10\nSandbag Carry: 4x20 yds',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
    },
    'Upper & Shoulder Health': {
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      // ACC_PULL_H is anchor:true here, MED_BALL is never pool-driven —
      // both safe to extend, same shape as BASEBALL_PACK's own fix: a
      // single line on each tag was only ever one superset total (Gorilla
      // Row + Med Ball Slam, one cross-category pair); a 2nd line on each
      // reaches 2 full supersets (Row+Lateral Raise, Slam+Chest Pass).
      ACC_PULL_H: 'Gorilla Row: 4x8\nLateral Raise: 3x12',
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Upper & Rotational': {
      MAIN_PRESS_H: 'DB Bench Press',
      // Same 2-line ACC_PULL_H + 2-line MED_BALL shape as BASEBALL_PACK's
      // own (already-verified) fix for this exact 3-day-only focus: a
      // single line on each was only ever one cross-category superset
      // (Gorilla Row + Med Ball Slam); a 2nd on each reaches 2 full
      // supersets (Row+Lateral Raise, Slam+Chest Pass).
      ACC_PULL_H: 'Gorilla Row: 4x8\nLateral Raise: 3x12',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Lower Strength': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      // ACC_POSTERIOR (Copenhagen Adductor — the deliberate pitcher-
      // specific "enhanced hip stability" swap, see this pack's own top
      // comment) is in MOBILITY_EXACT_EXEMPT, so it was NEVER a pairing
      // candidate at all — left exactly as-is, not touched by this fix.
      // Before this fix ACC_SQUAT's single line therefore had no eligible
      // partner whatsoever (0 supersets, confirmed by direct trace).
      // Extended to the same 5-line ACC_SQUAT shape as BASEBALL_PACK's own
      // 'Lower Strength' fix, PLUS one extra safe line (Anti-Rotation
      // Press) specifically because Copenhagen Adductor contributes
      // nothing here: Sandbag Carry pairs off the 1st squat line, Anti-
      // Rotation Press pairs off the 2nd, reaching 2 full supersets
      // entirely from ACC_SQUAT's own content.
      ACC_SQUAT: 'Goblet Squat: 4x10\nStep-Ups: 4x6 each leg\nCossack Squat: 3x10 each side\nSandbag Carry: 4x20 yds\nAnti-Rotation Press: 3x10 each side',
      ACC_POSTERIOR: 'Copenhagen Adductor: 4x8 each leg',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper Power & Rotational': {
      MAIN_PRESS_H: 'DB Bench Press',
      // Only safe (anchor) tag on this 2-slot day — extended to 3 lines,
      // same shape as BASEBALL_PACK's own fix, so paired with ACC_PULL_V's
      // single pool line this still reaches 2 full supersets instead of 1.
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm\nChest Supported Row: 4x10\nReverse Flys: 3x15',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
    },
    'Shoulder Health & Power Accessory': {
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Vertical Press Emphasis': {
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      // ACC_PULL_V is anchor at 6-day (same as BASEBALL_PACK's own fix) —
      // extended to 2 lines, paired with MED_BALL's own 2 lines below,
      // reaches 2 full supersets instead of 1.
      ACC_PULL_V: 'Pull-ups: 4xAMAP\nChest Supported Row: 4x10',
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Upper — Horizontal Press Emphasis': {
      MAIN_PRESS_H: 'DB Bench Press',
      // Same shape as BASEBALL_PACK's own fix for this exact 6-day-only
      // focus.
      ACC_PULL_H: 'Gorilla Row: 4x8\nLateral Raise: 3x12',
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      // ACC_UNILATERAL_LOWER is anchor on this day (same as BASEBALL_PACK's
      // own fix) — extended to 2 squat-pattern lines. ACC_POSTERIOR (
      // Copenhagen Adductor, the deliberate pitcher-specific swap) is
      // MOBILITY_EXACT_EXEMPT and contributes nothing to pairing either
      // way (see 'Lower Strength' above) — MED_BALL's own 2 lines below
      // give both squat lines a genuine, distinct non-competing partner
      // (Reverse Lunge+Med Ball Slam, Step-Ups+Med Ball Chest Pass)
      // instead, reaching 2 full supersets without relying on it.
      ACC_UNILATERAL_LOWER: 'Reverse Lunge: 4x6 each leg\nStep-Ups: 4x6 each leg',
      ACC_POSTERIOR: 'Copenhagen Adductor: 4x8 each leg',
      MED_BALL: 'Med Ball Slam: 4x8\nMed Ball Chest Pass: 4x8',
    },
    'Upper — Arm-Care Emphasis': {
      // No MAIN_ tag on this day — the day's first-authored accessory line
      // gets promoted to stand alone (see BASEBALL_PACK's own comment on
      // the identical day). Extended to the same 4-line ACC_PULL_H shape
      // as that fix: even after the 1st line is promoted away, the
      // remaining 3 plus ACC_PULL_V's single pool line still reach 2 full
      // supersets instead of 1.
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm\nChest Supported Row: 4x10\nDB Row: 4x10 each arm\nSeated Cable Lat Pulldown: 4x12',
      ACC_PULL_V: 'Pull-ups: 4xAMAP',
    },
  },
}

// Shared driver for both packs — not generateRotationalWeeksFromPack,
// because baseball keeps two things every other Rotational sport doesn't:
// its own "(X working max)" objective wording, and warmup-as-a-separate-
// session-field (see UPPER_PUSH_WARMUP etc.'s own comment) rather than
// text woven into `description`. Warmup type is read off the day
// template's own MAIN_ tag composition (same data dayLowerOrUpper already
// uses), not the day index, so it stays correct across every day count.
function generateBaseballWeeksFromPack(pack, daysPerWeek) {
  const days = Math.max(2, Math.min(6, daysPerWeek))
  const template = dayLayoutEngine.getTemplate('rotational', days)
  const renderers = buildRotationalRenderers(pack)
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = getPhaseInfo(w, BASEBALL_PHASES)
    const ctx = { ...info, days }
    const sessions = dayLayoutEngine.buildWeekSessions('rotational', days, renderers, ctx).map((s, i) => {
      const dt = template[i]
      const wuType = dt.slots.some(sl => sl.tag === 'MAIN_SQUAT') ? 'lower_power'
        : dt.slots.some(sl => sl.tag === 'MAIN_HINGE') ? 'squat_hinge'
        : dt.slots.some(sl => sl.tag === 'MAIN_PRESS_H' || sl.tag === 'MAIN_PRESS_V') ? 'upper_push'
        : null
      const withWarmup = wuType === 'lower_power' ? { ...s, warmup: LOWER_POWER_WARMUP }
        : wuType === 'squat_hinge' ? { ...s, warmup: SQUAT_HINGE_WARMUP }
        : wuType === 'upper_push' ? { ...s, warmup: UPPER_PUSH_WARMUP }
        : s
      return { ...withWarmup, focus: pack.displayFocus[withWarmup.focus] || withWarmup.focus }
    })
    weeks.push({
      week_number: w,
      objective: info.deload
        ? `Phase ${info.phaseNum} — Deload (${info.pct} working max) · Week ${info.wip} of 4`
        : `Phase ${info.phaseNum} — ${info.phaseLabel} (${info.pct} working max) · Week ${info.wip} of 4`,
      sessions,
    })
  }
  return weeks
}

// `goal` stays an accepted-but-unused parameter, matching baseball's
// pre-existing behavior — baseball has never had a muscle_gain-specific
// path (no mgNote()/focus-suffix branch existed before this PR either).
function generateBaseballWeeks(_, goal, daysPerWeek) {
  return generateBaseballWeeksFromPack(BASEBALL_PACK, daysPerWeek)
}

function generatePitcherBaseballWeeks(goal, daysPerWeek) {
  return generateBaseballWeeksFromPack(PITCHER_PACK, daysPerWeek)
}

// ─── Hockey ───────────────────────────────────────────────────────────────────

function hockeyForwardsSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'power') // Change 1 — contact position, same tier as football skill/hybrid
  const mbcp = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const ssj  = explosiveSets(4, ph)
  return [
    { day: 'Day 1', focus: 'Lower — First-Step Explosion',
      description: `Hang Power Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nBulgarian Split Squat: 3x6 each leg\nSled Sprint: 6x20 yds\nHip Thrust: 3x8\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper — Puck Battle Strength',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Chest Pass: ${mbcp}x8 (${explosiveIntent(ph)})\nBand External Rotation: 3x15 each arm\nYTW Series: 3x10 each\nFace Pulls: 3x15\nBand Pull-Aparts: 3x20\n${coreBlock(ph)}` },
    { day: 'Day 3', focus: 'Lower — Acceleration & COD',
      description: `Front Squat: ${info.ramp}, ${q}×${r}\nSplit Squat Jump: ${ssj}x5 each leg (${explosiveIntent(ph)})\nLateral Bound: 5x5 each side\nHip Thrust: 4x8\nResistance Band Sprint: 6x20 yds\n${phasePlyo(ph)}\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power & Conditioning',
      description: `Hang Clean: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×${r}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Slam: 4x8\nBattle Rope: 4x20s\nFarmer Carries: 3x40 yds\n${coreBlock(ph)}` },
  ]
}

function hockeyDefenseSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — lateral/reactive position, same tier as soccer/basketball
  const lb   = explosiveSets(5, ph) // Change 3 — explosive volume by phase
  const mbrt = explosiveSets(4, ph)
  return [
    { day: 'Day 1', focus: 'Lower — Lateral Mobility & Single Leg Stability',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nCossack Squat: 3x8 each side\nCopenhagen Adductor: 3x8 each leg\nLateral Bound: ${lb}x5 each side (${explosiveIntent(ph)})\nCopenhagen Plank: 3x20s each side\nSingle Leg RDL: 3x8 each leg\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper — Core Stiffness & Rotational Strength',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Rotational Throw: ${mbrt}x6 each side (${explosiveIntent(ph)})\nPallof Press: 3x12 each side\nBand External Rotation: 3x15 each arm\nYTW Series: 3x10 each\nFace Pulls: 3x15\n${coreBlock(ph)}` },
    { day: 'Day 3', focus: 'Lower — Crossover & Backward Skating Mechanics',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nLateral Sled Drag: 4x20 yds each direction\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\n${phasePlyo(ph)}\nResistance Band Lateral Walk: 3x20 each direction\nBulgarian Split Squat: 3x6 each leg\nHip 90/90 Hold: 3x30s each side\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power & Anti-Rotation',
      description: `BB Split Jerk: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×${r}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nSuitcase Carry: 4x20 yds each arm\nSingle Leg RDL: 3x8 each leg\nAnti-Rotation Press: 3x10 each side\n${coreBlock(ph)}` },
  ]
}

function hockeyGoalieSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — reactive/lateral position, same tier as soccer/basketball
  const slbj = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  const lsj  = explosiveSets(4, ph)
  return [
    { day: 'Day 1', focus: 'Lower — Butterfly Mechanics & Hip Mobility',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nCossack Squat: 3x10 each side\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nLateral Bound: 5x5 each side\nCopenhagen Adductor: 4x8 each leg\nSingle Leg Box Jump: ${slbj}x5 each leg (${explosiveIntent(ph)})\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper — Shoulder Health (Goalie Protection)',
      description: `DB Bench Press: 4x10 (DB only — protects shoulder joint)\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nBand External Rotation: 3x15 each arm\nYTW Series: 3x10 each\nFace Pulls: 4x15\n${coreBlock(ph)}` },
    { day: 'Day 3', focus: 'Lower — Reactive Lateral & Butterfly Recovery',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nLateral Squat Jump: ${lsj}x5 each side (${explosiveIntent(ph)})\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\n${phasePlyo(ph)}\nResistance Band Lateral Walk: 3x20 each direction\nLateral Shuffle: 6x20 yds\nCossack Squat: 3x8 each side\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power & Conditioning',
      description: `BB Split Jerk: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×${r}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nFarmer Carries: 4x20 yds\nBattle Rope: 4x20s\nCopenhagen Plank: 3x20s each side\n${coreBlock(ph)}` },
  ]
}

const HOCKEY_DAY5 = (info) => ({
  day: 'Day 5', focus: 'On-Ice Transfer & Skating Power',
  description: `Lateral Sled Drag: 4x20 yds each direction\nSingle Leg Box Jump: 4x5 each leg\nLateral Bound: 5x5 each side\nCopenhagen Adductor: 3x8 each leg\nBand Lateral Walk: 3x20 each direction\n${coreBlock(info.phaseNum)}`,
})
const HOCKEY_DAY6 = {
  day: 'Day 6', focus: 'Recovery & Mobility',
  description: `Foam Roll: Full body — 15 minutes\nHip 90/90 Hold: 3x45s each side\nCossack Squat (light): 2x10 each side\nThoracic Rotation: 3x10 each side\nAdductor Static Stretch: 3x45s each side\nAnkle Mobility Circles: 3x10 each`,
}

// ─── Hockey Forwards — Collision/Max-Strength archetype (standard goal
// only; see hockeyForwardsSess above for the muscle-gain variant, untouched
// by this build) — Hockey Defense/Goalie are a different archetype (Repeat-
// Sprint/Field, lateral/reactive) and are completely unaffected. ──────────
// Built on the same archetype core as Linemen/Wrestling/Rugby Forwards, but
// deliberately WITHOUT the shared neck-armor block — forwards' real
// contact/first-step demand is collision strength blended with skating
// acceleration and hip mobility (Copenhagen Adductor, Cossack Squat, Hip
// 90/90 Hold, Lateral Bound, Split Squat Jump) rather than the
// head/neck-impact profile Linemen/Wrestling/Rugby Forwards share — a real
// point of differentiation between contact-sport programs, not an
// oversight. Otherwise identical machinery: same rep-scheme math, same
// autoregulated Oly-lift prescription, same raised accessory cap.

const HOCKEY_ARCHETYPE_WU_LOWER = 'Hockey Lower-Body Warm-up: Hip Circles 10 each direction · Leg Swings 10 each leg · Lateral Band Walk 2x10\n\n'
const HOCKEY_ARCHETYPE_WU_UPPER = 'Hockey Upper-Body Warm-up: Band Pull-Aparts x20 · Prone Swimmers x10 · Push-Up to Pike x10\n\n'

// Hockey Forwards' own finisher content — skating/puck-battle identity
// (Sled Sprint, Battle Rope, Lateral Sled Drag, Band External Rotation —
// several already used elsewhere in this sport's own content). Core reuses
// the shared coreBlock verbatim. Hockey Forwards has no fixed Neck block
// (opts out — see the archetype section doc comment above), so this is the
// sport's FIRST dedicated finisher of any kind.
const HOCKEY_FORWARDS_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Sled Sprint: 2x20 yds'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Sled Sprint: 4x20 yds'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Sled Sprint: 5x20 yds'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Sprint Work: 5x15 yds @ max effort'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Sprint Work: 3x15 yds @ max effort (full recovery)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Battle Rope: 2x15s'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Battle Rope: 3x20s'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Battle Rope: 4x20s'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Lateral Sled Drag: 4x20 yds each direction'] }
    return { subtitle: 'Reduced', lines: ['Battle Rope: 2x20s'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Landmine Rotational Press: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
  arm(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Band External Rotation: 2x15 each arm'] }
    if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: ['Band External Rotation: 3x15 each arm'] }
    if (ph === 2) return { subtitle: 'Modest Increase', lines: ['Band External Rotation: 3x15 each arm', 'Face Pulls: 3x15'] }
    if (ph === 3) return { subtitle: 'Maintenance', lines: ['Face Pulls: 4x15'] }
    return { subtitle: 'Readiness', lines: ['Band External Rotation: 2x15 each arm'] }
  },
}

// feat/day-layout-engine — Hockey Forwards' pack. noNeck:true preserves
// this sport's own, already-documented choice to carry no fixed neck
// block at all (unlike the other 3 Collision sports) — see buildCollisionRenderers'
// NECK doc comment.
//
// Two deliberate structural changes, same rationale as Wrestling/Rugby
// Forwards above: the shared template wants two squat days (Day 1 was a
// hinge day — Trap Bar Deadlift — with only Day 3 a genuine squat day);
// Back Squat now fills Day 1's MAIN_SQUAT slot, and Trap Bar Deadlift
// moves to the 3-day-only MAIN_HINGE slot and the 6-day Lower C day (which
// already used it). Day 2's old main lift was Bench Press (horizontal) on
// the week's vertical-press day; Overhead Press fills that slot now, same
// as Wrestling/Rugby Forwards — Day 4's Close Grip Bench already covers
// horizontal pressing.
//
// The 4-day template has no PLYO slot on any of its 4 days (only the
// 5/6-day bonus days do) — Hockey's own plyo-heavy identity (Lateral
// Bound, Split Squat Jump) doesn't fit the leaner 4-day structure the way
// it did before; both move to the 5-day bonus day (PLYO) and 6-day Lower
// C (ACC_CALF_GRIP, loose fit but preserves real content over inventing
// something new), so a coach on the 4-day plan sees less of Hockey's
// on-ice-transfer flavor than before — flagged here since it's a real,
// visible simplification, not an oversight.
const HOCKEY_FORWARDS_PACK = {
  warmupLower: HOCKEY_ARCHETYPE_WU_LOWER,
  warmupUpper: HOCKEY_ARCHETYPE_WU_UPPER,
  finisherBank: HOCKEY_FORWARDS_FINISHERS,
  noNeck: true,
  displayFocus: {
    'Lower Power': 'Lower — First-Step Explosion',
    'Upper Strength': 'Upper — Puck Battle Strength',
    'Lower Strength': 'Lower — Acceleration & COD',
    'Upper Power': 'Upper Power & Conditioning',
    'Lower — Posterior Chain & Athletic': 'Lower — Skating Power & Hip Mobility',
  },
  byFocus: {
    'Lower Power': {
      MAIN_OLY: 'Hang Power Clean',
      MAIN_SQUAT: { name: 'Back Squat', suffix: ' (full ROM)' },
      ACC_HINGE: 'Barbell RDL: 4x8',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
    },
    'Upper Strength': {
      MAIN_OLY: { name: 'Single Arm DB Split Jerk', suffix: ', each arm' },
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Weighted Pull-ups: 4x5',
      ACC_PRESS: 'Single Arm DB Bench: 4x10 each arm',
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x20', // 3-day only
    },
    'Lower Strength': {
      MAIN_OLY: 'Hang Clean Above the Knee',
      MAIN_SQUAT: { name: 'Front Squat', suffix: ' (full ROM)' }, // 4-day
      MAIN_HINGE: 'Trap Bar Deadlift', // 3-day only
      ACC_SQUAT: 'Goblet Squat: 4x10', // 3-day only
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
      ACC_UNILATERAL_LOWER: 'Cossack Squat: 4x8 each side',
      ACC_CALF_GRIP: 'Copenhagen Adductor: 4x8 each leg',
    },
    'Upper Power': {
      MAIN_OLY: 'BB Split Jerk',
      MAIN_PRESS_H: { name: 'Close Grip Bench Press', suffix: ' (hands at shoulder width)' },
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PRESS: 'Seated Single Arm DB Overhead Press: 4x10 each arm',
      ACC_PULL_V: 'Weighted Chin-ups: 4x5',
    },
    'Power, Athleticism & Armor': {
      PLYO: 'Lateral Bound: 5x5 each side',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_CALF_GRIP: 'Copenhagen Adductor: 4x8 each leg',
    },
    'Lower — Posterior Chain & Athletic': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_UNILATERAL_LOWER: 'Cossack Squat: 4x8 each side',
      ACC_POSTERIOR: 'Copenhagen Adductor: 4x8 each leg',
      ACC_CALF_GRIP: 'Split Squat Jump: 4x5 each leg',
    },
    'Upper — Hypertrophy & Armor': {
      ACC_PRESS: (ctx) => weeklyVariant(ctx.week, 'Incline DB Press: 4x10', 'Weighted Dips: 4x10'),
      ACC_PULL_H: 'Chest Supported Row: 4x12',
      ACC_SHOULDER: 'Face Pulls: 4x15',
    },
  },
}

function generateHockeyForwardsArchetypeWeeks(daysPerWeek, mg = false) {
  return applyCollisionMgWrapper(generateCollisionWeeksFromPack(HOCKEY_FORWARDS_PACK, daysPerWeek, mg), mg)
}

// ─── Hockey Defense & Hockey Goalie — Repeat-Sprint/Field Athlete archetype
// (standard goal only; see hockeyDefenseSess/hockeyGoalieSess above for the
// muscle-gain variants, untouched by this build) — Hockey Forwards is a
// different archetype (Collision/Max-Strength) and is completely
// unaffected. Same weekly template Soccer established, same 'rotational'
// tier, same un-raised default cap. Differentiated from Soccer, and from
// each other, by real position demand: Defense gets crossover/backward-
// skating mechanics and anti-rotation work (a defenseman defends and
// transitions in every direction); Goalie keeps its own distinct reactive/
// butterfly-recovery emphasis and the DB-only-bench shoulder-protection
// detail its pre-archetype content already established — genuinely
// different from Defense, not a shared template with the label swapped.

// ── Hockey Defense conditioning: lateral shuffle/acceleration (Monday,
// paired with lateral mobility/single-leg stability) vs reactive squat-jump
// (Thursday, paired with crossover/backward skating) — both drawn from
// Defense's own old Friday vocabulary.
function hdConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Lateral Shuffle: 2x20 yds', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Reactive Lateral Bound: 4x5 each side', 'Flying 20s: 4x1'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Lateral Shuffle: ${conditioningSets(5, ph)}x20 yds`, '300 Yard Shuttle: 2x2'])
}
function hdConditioningB(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Single Leg Squat Jump: 2x5 each leg', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Reactive Lateral Bound: 4x5 each side', 'Single Leg Squat Jump: 4x5 each leg'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Single Leg Squat Jump: ${conditioningSets(4, ph)}x5 each leg`, '300 Yard Shuttle: 2x2'])
}
// Hockey Defense's rotation/arm anchors reuse its own Day 2 content
// (Med Ball Rotational Throw, Band External Rotation) verbatim.
const HD_FINISHERS = fieldFinisherBank(hdConditioningA, hdConditioningB, 'Med Ball Rotational Throw', 'Band External Rotation')

// feat/day-layout-engine — Hockey Defense's pack. Pallof Press (a core
// move) has no slot — dropped, the finisher engine's own core family
// covers this day instead, same dedup pattern used throughout this PR.
const HD_PACK = {
  finisherBank: HD_FINISHERS,
  displayFocus: {
    'Lower Power': 'Lower — Lateral Mobility & Single Leg Stability',
    'Upper Strength': 'Upper — Core Stiffness & Rotational Strength',
    'Lower Explosion': 'Lower — Crossover & Backward Skating Mechanics',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
      ACC_UNILATERAL_LOWER: 'Cossack Squat: 4x8 each side',
      PLYO: (ctx) => `Lateral Bound: ${explosiveSets(5, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PRESS: 'DB Bench Press: 4x10',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      MAIN_HINGE: 'Trap Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5',
      PLYO: (ctx) => `Lateral Sled Drag: ${explosiveSets(4, ctx.phaseNum)}x20 yds each direction (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Weighted Pull-ups: 4x5',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band External Rotation: 4x15 each arm',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Lateral Bound: ${explosiveSets(5, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Copenhagen Adductor: 3x8 each leg (light)',
    },
  },
}

function generateHockeyDefenseArchetypeWeeks(daysPerWeek) {
  return generateFieldWeeksFromPack(HD_PACK, HOCKEY_PHASES, daysPerWeek)
}

// ── Hockey Goalie conditioning: reactive/lateral (Monday, paired with power &
// butterfly mechanics) vs reactive squat-jump (Thursday, paired with
// reactive lateral & butterfly recovery) — both drawn from Goalie's own old
// Friday vocabulary.
function hgConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Lateral Shuffle: 2x20 yds', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Reactive Lateral Bound: 4x5 each side', 'Flying 20s: 4x1'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Lateral Shuffle: ${conditioningSets(5, ph)}x20 yds`, '300 Yard Shuttle: 2x2'])
}
function hgConditioningB(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['Single Leg Squat Jump: 2x5 each leg', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Reactive Lateral Bound: 4x5 each side', 'Single Leg Squat Jump: 4x5 each leg'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Single Leg Squat Jump: ${conditioningSets(4, ph)}x5 each leg`, 'Flying 20s: 4x1'])
}
// Goalie's rotation/arm anchors — no MB Twist Throw/Rotational Throw
// already in Goalie's own Day 2 (it's DB-only/shoulder-protection content),
// so Rotation uses the generic already-vetted Med Ball Rotational Throw;
// Arm reuses Goalie's own Band External Rotation.
const HG_FINISHERS = fieldFinisherBank(hgConditioningA, hgConditioningB, 'Med Ball Rotational Throw', 'Band External Rotation')
// Position override vs. Defense — "lateral power + hip + reactive" (per the
// spec's own Hockey Goalie example): more Sprint (lateral quickness/
// reactive movement, now the week's most frequent family) and Core (hip
// stability), less Rotation (a goalie doesn't need max-velocity rotational
// shooting power the way Defense's own outlet-pass identity benefits from
// it) and Energy. Weighting only — same 5 families, same content bank,
// nothing new invented for this position.
const HG_OVERRIDES = { sprint: 10, core: 5, rotation: -8, arm: -3, energy: -4 }

// feat/day-layout-engine — Hockey Goalie's pack. "DB only — protects
// shoulder joint" is Goalie's own explicit, pre-existing design
// constraint (same class as Pitcher's "no direct overhead pressing") —
// preserved by keeping every press DB-based: Incline DB Press (Goalie's
// own genuinely-ramped press, originally on Day 4) fills MAIN_PRESS_H;
// MAIN_PRESS_V uses DB Shoulder Press (a DB-only vertical press, not the
// barbell-style Overhead Press every other Field sport promotes here) so
// the vertical-press conformance fix never compromises Goalie's own
// shoulder-protection identity.
const HG_PACK = {
  finisherBank: HG_FINISHERS,
  finisherOverrides: HG_OVERRIDES,
  displayFocus: {
    'Lower Power': 'Lower Power & Butterfly Mechanics',
    'Upper Strength': 'Upper (DB Only — Protects Shoulder Joint)',
    'Lower Explosion': 'Reactive Lateral & Butterfly Recovery',
    'Upper Power': 'Upper Power (Goalie Protection)',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
      ACC_UNILATERAL_LOWER: 'Cossack Squat: 4x10 each side',
      PLYO: (ctx) => `Single Leg Box Jump: ${explosiveSets(4, ctx.phaseNum)}x4 each leg (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: { name: 'Incline DB Press', suffix: ' (DB only — protects shoulder joint)' },
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PRESS: 'DB Bench Press: 4x10 (DB only — protects shoulder joint)',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      MAIN_HINGE: 'Trap Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Cossack Squat: 4x8 each side',
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5',
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: { name: 'DB Shoulder Press', suffix: ' (DB only — protects shoulder joint)' },
      ACC_PULL_V: 'Weighted Pull-ups: 4x5',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Face Pulls: 4x15',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(5, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(5, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Single Leg Box Jump: ${explosiveSets(4, ctx.phaseNum)}x4 each leg (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Copenhagen Adductor: 3x8 each leg (light)',
    },
  },
}

function generateHockeyGoalieArchetypeWeeks(daysPerWeek) {
  return generateFieldWeeksFromPack(HG_PACK, HOCKEY_PHASES, daysPerWeek)
}

function generateHockeyWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  // feat/blueprint-cleanup — Hockey Forwards (Collision archetype) now
  // routes through the modern generator for both goals. Defense/Goalie
  // (Field archetype) are untouched — still standard-goal only, per this
  // fix's scope.
  if (posId === 'forwards') return generateHockeyForwardsArchetypeWeeks(daysPerWeek, mg)
  if (!mg && posId === 'defense') return generateHockeyDefenseArchetypeWeeks(daysPerWeek)
  if (!mg && posId === 'goalie') return generateHockeyGoalieArchetypeWeeks(daysPerWeek)
  const phases = mg ? MG_PHASES : HOCKEY_PHASES
  const baseFns = { forwards: hockeyForwardsSess, defense: hockeyDefenseSess, goalie: hockeyGoalieSess }
  const baseFn = baseFns[posId] || hockeyForwardsSess
  const fn = mg
    ? (info) => baseFn(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : baseFn
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [HOCKEY_DAY5, HOCKEY_DAY6])
}

// ─── Rugby ────────────────────────────────────────────────────────────────────

function rugbyForwardsSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'power') // Change 1 — contact/scrummage position, same tier as football skill/hybrid
  const mbrs = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const mbcp = explosiveSets(4, ph)
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Hip Thrust + Nordic remain
    { day: 'Day 1', focus: 'Lower Max Strength & Scrummage Drive',
      description: `Power Clean from floor: 5x3 working up\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x10\nNordic Hamstring Curl: 4x5\nSled Push: 6x20 yds\nNeck Strengthening: 3x12 each direction\nMed Ball Rotational Slam: ${mbrs}x8 (${explosiveIntent(ph)})\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper Strength & Contact Prep',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Pull-ups: 5x5\nDB Row: 4x10 each arm\nOverhead Press: 4x8\nDB Shrugs: 3x12\nNeck Strengthening: 3x12 each direction\nFace Pulls: 3x15\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo replaces Box Jump + Broad Jump list
    { day: 'Day 3', focus: 'Lower Explosion & Carrying',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nBulgarian Split Squat: 3x6 each leg\nSingle Leg RDL: 3x8 each leg\nFarmer Carries: 4x20 yds\nSandbag Carry: 4x20 yds\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power, Contact & Rotational',
      description: `Hang Clean: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×${r}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nLandmine Rotational Press: 3x6 each side\nMed Ball Chest Pass: ${mbcp}x8 (${explosiveIntent(ph)})\nSled Push: 6x20 yds\n${coreBlock(ph)}` },
  ]
}

function rugbyBacksSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'power') // Change 1 — contact-sport speed position, same tier as football skill/hybrid
  const lb1  = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const lb3  = explosiveSets(4, ph)
  const mbcp = explosiveSets(4, ph)
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; power and speed emphasis for backs
    { day: 'Day 1', focus: 'Lower Power & First-Step Speed',
      description: `Power Clean: 4x3\nBack Squat: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nSingle Leg RDL: 3x8 each leg\nLateral Bounds: ${lb1}x5 each side (${explosiveIntent(ph)})\nSprint Work: 8x40 yds\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Pull-ups: 5x5\nDB Row: 4x10 each arm\nOverhead Press: 4x8\nDB Shrugs: 3x12\nNeck Strengthening: 3x12 each direction\nFace Pulls: 3x15\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo replaces Box Jump + Broad Jump list
    { day: 'Day 3', focus: 'Lower Explosion, Agility & COD',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nBulgarian Split Squat: 3x6 each leg\nSingle Leg RDL: 3x8 each leg\nLateral Bounds: ${lb3}x5 each side (${explosiveIntent(ph)})\nT-Drill: 6x1\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `Hang Clean: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×${r}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Chest Pass: ${mbcp}x8 (${explosiveIntent(ph)})\n${coreBlock(ph)}` },
  ]
}

const RUGBY_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Contact Conditioning',
  description: `Wrestle-Outs: 4x30s\nWeighted Carries Medley: Farmer / Sandbag / Rack — 3 sets each\nSled Push: 6x20 yds\nBattle Rope: 4x30s\nPush-up Max Set: x3\n${coreBlock(info.phaseNum)}`,
})
const RUGBY_DAY6 = {
  day: 'Day 6', focus: 'Recovery & Mobility',
  description: `Foam Roll: Full body — 15 minutes\nHip Flexor Stretch: 3x45s each leg\nThoracic Rotation: 3x10 each side\nHamstring Eccentric: 3x8\nStatic Stretch: Adductors · Quads · Calves`,
}

// ─── Rugby Forwards — Collision/Max-Strength archetype (standard goal only;
// see rugbyForwardsSess above for the muscle-gain variant, untouched by
// this build) — Rugby Backs is a different archetype (Repeat-Sprint/Field
// Athlete) and is completely unaffected by this section. ───────────────────
// Built on the same archetype core as Linemen/Wrestling. Differentiated by
// scrum/contact-specific work (Scrum Drive, Sandbag Carry, Landmine
// Rotational Press) in place of Linemen's football-specific movements,
// sharing the neck-armor block (COLLISION_NECK) as common contact-sport
// ground with Linemen and Wrestling.

const RUGBY_ARCHETYPE_WU_LOWER = 'Rugby Lower-Body Warm-up: Hip Circles 10 each direction · Leg Swings 10 each leg · Lateral Band Walk 2x10\n\n'
const RUGBY_ARCHETYPE_WU_UPPER = 'Rugby Upper-Body Warm-up: Band Pull-Aparts x20 · Prone Swimmers x10 · Push-Up to Pike x10\n\n'

// Rugby Forwards' own finisher content — scrum/contact identity (Scrum
// Drive, Sled Push, Landmine Rotational Press, Grip Work — all already
// vetted, several already used elsewhere in this sport's own content).
// Core reuses the shared coreBlock verbatim.
const RUGBY_FORWARDS_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Scrum Drive: 2x10 yds'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Scrum Drive: 4x10 yds'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Scrum Drive: 4x15 yds'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Sprint Work: 5x15 yds @ max effort'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Sprint Work: 3x15 yds @ max effort (full recovery)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Sled Push: 2x15 yds'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Sled Push: 4x20 yds'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Farmer Carries: 4x30 yds'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Battle Rope: 4x20s'] }
    return { subtitle: 'Reduced', lines: ['Sled Push: 2x20 yds'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Landmine Rotational Press: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Landmine Rotational Press: 3x6 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Landmine Rotational Press: 2x6 each side (max intent)'] }
  },
  arm(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Grip Work: 2 sets'] }
    if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: ['Band External Rotation: 3x15 each arm'] }
    if (ph === 2) return { subtitle: 'Modest Increase', lines: ['Grip Work: 2 sets', 'Band External Rotation: 3x15 each arm'] }
    if (ph === 3) return { subtitle: 'Maintenance', lines: ['Grip Work: 3 sets'] }
    return { subtitle: 'Readiness', lines: ['Band External Rotation: 2x15 each arm'] }
  },
}

// feat/day-layout-engine — Rugby Forwards' pack. Two deliberate structural
// changes, both because the shared 4-day Collision template genuinely
// wants a specific main-lift split that Rugby's old content didn't quite
// match:
//   1. Same squat/hinge conformance fix as Wrestling — Front Squat now
//      fills Day 3's MAIN_SQUAT slot (4/5/6-day), pairing with Day 1's
//      Back Squat; Trap Bar Deadlift moves to the 3-day-only MAIN_HINGE
//      slot and the 6-day Lower C day.
//   2. Day 2's old main lift was Bench Press — a horizontal press — on a
//      day the template structurally wants to be the week's VERTICAL-press
//      day (paired with ACC_PULL_V, mirroring Linemen's Standing BB OHP/
//      Wrestling's Overhead Press). Overhead Press now fills that slot;
//      Day 4 already had a genuine horizontal press (Close Grip Bench)
//      covering that plane for the week.
// Landmine Rotational Press deliberately does NOT appear as an inline
// accessory anywhere in this pack even though it's real Rugby vocabulary
// — RUGBY_FORWARDS_FINISHERS.rotation already renders it, and duplicating
// it inline risks the same double-render the day the finisher engine also
// picks 'rotation' for that day (see ACC_CORE's own doc comment above for
// the general version of this risk).
const RUGBY_FORWARDS_PACK = {
  warmupLower: RUGBY_ARCHETYPE_WU_LOWER,
  warmupUpper: RUGBY_ARCHETYPE_WU_UPPER,
  finisherBank: RUGBY_FORWARDS_FINISHERS,
  // byFocus is keyed by the shared template's own generic labels (see
  // buildCollisionRenderers/generateCollisionWeeksFromPack) — Rugby's own
  // richer day names ("Lower Power — Scrummage Drive", etc.) are restored
  // as OUTPUT text only via displayFocus below, after content resolution.
  displayFocus: {
    'Lower Power': 'Lower Power — Scrummage Drive',
    'Upper Strength': 'Upper Strength & Contact Prep',
    'Lower Strength': 'Lower Explosion & Carrying',
    'Upper Power': 'Upper Power, Contact & Rotational',
  },
  byFocus: {
    'Lower Power': {
      MAIN_OLY: { name: 'Power Clean from floor', suffix: ' (from floor, catch quarter squat)' },
      MAIN_SQUAT: { name: 'Back Squat', suffix: ' (full ROM)' },
      ACC_HINGE: 'Barbell RDL: 4x8',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x8 each leg',
    },
    'Upper Strength': {
      MAIN_OLY: { name: 'Single Arm DB Split Jerk', suffix: ', each arm' },
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Weighted Pull-ups: 5xAMAP',
      ACC_PRESS: 'Seated Single Arm DB Overhead Press: 4x10 each arm',
      ACC_PULL_H: 'DB Row: 4x10 each arm',
      ACC_SHOULDER: 'DB Shrugs: 4x12', // 3-day only
    },
    'Lower Strength': {
      MAIN_OLY: { name: 'Hang Clean Above the Knee', suffix: ' (start at hip crease, hinge to above kneecaps, explode)' },
      MAIN_SQUAT: { name: 'Front Squat', suffix: ' (full ROM)' }, // 4-day
      MAIN_HINGE: 'Trap Bar Deadlift', // 3-day only
      ACC_SQUAT: 'Goblet Squat: 4x10', // 3-day only
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x8 each leg',
      ACC_CALF_GRIP: 'Farmer Carries: 4x20 yds',
    },
    'Upper Power': {
      MAIN_OLY: 'BB Split Jerk',
      MAIN_PRESS_H: { name: 'Close Grip Bench Press', suffix: ' (hands at shoulder width)' },
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PRESS: 'Single Arm DB Bench: 4x10 each arm',
      ACC_PULL_V: 'Weighted Chin-ups: 4x6',
    },
    'Power, Athleticism & Armor': {
      PLYO: (ctx) => phasePlyo(ctx.phaseNum),
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_CALF_GRIP: 'Sandbag Carry: 4x20 yds',
      NECK: COLLISION_NECK_DEDICATED,
    },
    'Lower — Posterior Chain & Athletic': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x8 each leg',
      ACC_POSTERIOR: 'Single Leg RDL: 4x8 each leg',
      ACC_CALF_GRIP: 'Sandbag Carry: 4x20 yds',
    },
    'Upper — Hypertrophy & Armor': {
      ACC_PRESS: (ctx) => weeklyVariant(ctx.week, 'Incline DB Press: 4x10', 'Weighted Dips: 4x10'),
      ACC_PULL_H: 'Chest Supported Row: 4x12',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x20',
    },
  },
}

function generateRugbyForwardsArchetypeWeeks(daysPerWeek, mg = false) {
  return applyCollisionMgWrapper(generateCollisionWeeksFromPack(RUGBY_FORWARDS_PACK, daysPerWeek, mg), mg)
}

// ─── Rugby Backs — Repeat-Sprint/Field Athlete archetype (standard goal
// only; see rugbyBacksSess above for the muscle-gain variant, untouched by
// this build) — same weekly template Soccer established (Monday lower
// strength/power, Tuesday upper, Thursday lower explosion, Friday pure
// speed/conditioning), same 'rotational' rep tier, same un-raised default
// accessory cap. Differentiated from Soccer by genuinely more contact
// tolerance: Tuesday is a real strength day (Bench Press, Weighted
// Pull-ups, neck work) rather than Soccer's deliberately light upper day —
// backs still take contact, just less of it than forwards — and Thursday
// keeps a Trap Bar Deadlift second main lift shared with the Forwards'
// own Collision-archetype content, rather than Soccer's Hex Bar Deadlift.
// RUGBY_PHASES (kept — a genuinely more aggressive intensity table than
// Soccer's own SOC_PHASES, reflecting rugby's real demand) and RUGBY_DAY5/
// RUGBY_DAY6 (kept — "Contact Conditioning" fits Backs' own contact-tolerance
// need as well as it always fit Forwards') are both preserved unchanged.

// ── Rugby Backs conditioning: shuttle/sprint-ladder (Monday, paired with
// Lower Strength & Sprint) vs flying-sprint/sprint+jog-ladder (Thursday,
// paired with Explosion, Agility & COD) — both drawn from Backs' own old
// Friday vocabulary.
function rbConditioningA(ph, deload) {
  if (deload) return conditioningFinisher('Deload (Light)', ['300 Yard Shuttle: 1x2', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Flying 20s: 8x1', 'Sprint Ladder: 10/20/30/20/10 yds — 4 rounds'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`300 Yard Shuttle: ${conditioningSets(3, ph)}x2`, 'Sprint Ladder: 10/20/30/20/10 yds — 3 rounds'])
}
function rbConditioningB(ph, deload) {
  const sy = sprintYardsForPhase(SOC_SPRINT_YARDS, ph)
  if (deload) return conditioningFinisher('Deload (Light)', ['Flying 20s: 2x1', 'Easy Mobility Circuit: 1 round'])
  if (ph === 3) return conditioningFinisher(CONDITIONING_SUBTITLES[3], ['Flying 20s: 8x1', 'Sprint Ladder: 10/20/30/20/10 yds — 4 rounds'])
  return conditioningFinisher(CONDITIONING_SUBTITLES[ph], [`Flying 20s: ${conditioningSets(4, ph)}x1`, `Sprint + Jog Ladder: 4 rounds up to ${sy} yards`])
}
// Rugby Backs has no existing rotational anchor in its own Day 2 (a
// straightforward strength day, no med-ball/twist work) — Rotation uses the
// generic already-vetted Med Ball Rotational Throw; Arm reuses the same
// Band External Rotation anchor every Field sport's bank uses.
const RB_FINISHERS = fieldFinisherBank(rbConditioningA, rbConditioningB, 'Med Ball Rotational Throw', 'Band External Rotation')

// feat/day-layout-engine — Rugby Backs' pack. Unlike every other Field
// sport, Backs' own genuinely-ramped press was Day 4's Close Grip Bench
// Press (Day 2's "Bench Press" was the FLAT, non-ramped one) — Close Grip
// Bench Press fills MAIN_PRESS_H, Bench Press fills ACC_PRESS instead of
// the usual DB Bench Press. Neck Strengthening/Grip Work have no slot
// (Field's own templates carry no NECK tag at all, unlike Collision) and
// are dropped.
const RB_PACK = {
  finisherBank: RB_FINISHERS,
  displayFocus: {
    'Lower Power': 'Lower Strength & Sprint',
    'Upper Strength': 'Upper Contact Strength',
    'Lower Explosion': 'Explosion, Agility & COD',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      PLYO: (ctx) => `Lateral Bounds: ${explosiveSets(4, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Strength': {
      MAIN_PRESS_H: 'Close Grip Bench Press',
      ACC_PULL_H: 'DB Row: 4x10 each arm',
      ACC_PRESS: 'Bench Press: 4x8',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Front Squat',
      MAIN_HINGE: 'Trap Bar Deadlift', // 3-day
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5',
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Upper Power': {
      MAIN_PRESS_V: 'Overhead Press',
      ACC_PULL_V: 'Weighted Pull-ups: 4x6',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Face Pulls: 4x15',
    },
    'Lower Power & Sprint': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
    },
    'Speed & Change of Direction': {
      SPEED: (ctx) => `Acceleration Sprints: ${explosiveSets(4, ctx.phaseNum)}x20 yds`,
      PLYO: (ctx) => `Lateral Squat Jump: ${explosiveSets(4, ctx.phaseNum)}x5 each side (${explosiveIntent(ctx.phaseNum)})`,
    },
    'Recovery & Mobility': {
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 3x5 (light)',
    },
  },
}

function generateRugbyBacksArchetypeWeeks(daysPerWeek) {
  return generateFieldWeeksFromPack(RB_PACK, RUGBY_PHASES, daysPerWeek)
}

function generateRugbyWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  // feat/blueprint-cleanup — Rugby Forwards (Collision archetype) now
  // routes through the modern generator for both goals. Backs (Field
  // archetype) is untouched — still standard-goal only, per this fix's
  // scope.
  if (posId === 'forwards') return generateRugbyForwardsArchetypeWeeks(daysPerWeek, mg)
  if (!mg && posId === 'backs') return generateRugbyBacksArchetypeWeeks(daysPerWeek)
  const phases = mg ? MG_PHASES : RUGBY_PHASES
  const baseFns = { forwards: rugbyForwardsSess, backs: rugbyBacksSess }
  const baseFn = baseFns[posId] || rugbyForwardsSess
  const fn = mg
    ? (info) => baseFn(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : baseFn
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [RUGBY_DAY5, RUGBY_DAY6])
}

// ─── Tennis ───────────────────────────────────────────────────────────────────

// ─── Day Layout Engine wiring: Rotational/Throwing archetype
// (feat/day-layout-engine) ───────────────────────────────────────────────
// Same "pack supplies tag->exercise, shared renderer supplies the math"
// split as Collision (see buildCollisionRenderers above), but this
// archetype's main-lift math is the ALREADY-shared mainLiftTopReps('rotational')
// + each sport's own getPhaseInfo(w, ITS_OWN_PHASES)/info.ramp — no
// archetype-level phase function of its own the way Collision has
// collisionPhaseInfo, since Rotational sports already run their own phase
// tables (TENNIS_PHASES, GOLF_PHASES, FB_PHASES, BASEBALL_PHASES, ...)
// through the pre-existing shared getPhaseInfo. No MAIN_OLY and no NECK
// in any of this archetype's templates (see dayLayoutEngine.js) — Oly-
// style lines some sports used to carry (Tennis's old fixed "Power Clean:
// 3x3"/"Hang Clean: 3x3") don't have a slot here and are dropped, matching
// the archetype's own design intent (rotational power expression via
// MED_BALL/rotation work, not barbell Oly lifts).
function buildRotationalRenderers(pack) {
  function mainEntry(focusLabel, tagName) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (!entry) throw new Error(`Rotational pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'string' ? { name: entry, suffix: '' } : { name: entry.name, suffix: entry.suffix || '' }
  }
  function accEntry(focusLabel, tagName, ctx) {
    const byTag = pack.byFocus[focusLabel]
    const entry = byTag && byTag[tagName]
    if (entry === undefined) throw new Error(`Rotational pack missing ${tagName} for day "${focusLabel}"`)
    return typeof entry === 'function' ? entry(ctx) : entry
  }

  const renderers = {}
  for (const tagName of ['MAIN_SQUAT', 'MAIN_HINGE', 'MAIN_PRESS_H', 'MAIN_PRESS_V']) {
    renderers[tagName] = (slotDef, ctx) => {
      const { name, suffix } = mainEntry(ctx.dayTemplate.focus, tagName)
      const r = mainLiftTopReps(ctx.phaseNum, 'rotational')
      return `${name}: ${ctx.ramp}, ${ctx.pct}×${r}${suffix}`
    }
  }
  for (const tagName of [
    'ACC_SQUAT', 'ACC_HINGE', 'ACC_UNILATERAL_LOWER', 'ACC_POSTERIOR',
    'ACC_PULL_H', 'ACC_PULL_V', 'ACC_PRESS', 'ACC_SHOULDER', 'ACC_CALF_GRIP',
    'PLYO', 'SPEED', 'MED_BALL',
  ]) {
    renderers[tagName] = (slotDef, ctx) => {
      const packChoice = accEntry(ctx.dayTemplate.focus, tagName, ctx)
      return varietyEngine.resolveFiller('rotational', slotDef, tagName, ctx, packChoice)
    }
  }
  // Same as Collision's ACC_CORE — never rendered directly, the finisher
  // engine's own 'core' family already owns coreBlock() content for this
  // archetype (see the fuller doc comment on buildCollisionRenderers).
  renderers.ACC_CORE = () => null
  // Same duplication risk, one level removed: for a hasArmCare:true sport,
  // the finisher engine's own 'arm' family already renders real shoulder-
  // health content (Band External Rotation/YTW Series/...) on whichever
  // day it's scheduled — an ACC_SHOULDER slot rendering the SAME kind of
  // content inline risks colliding with it on that day. For a
  // hasArmCare:false sport there's no arm-family content to collide with,
  // so ACC_SHOULDER renders normally there — a real, generic shoulder-
  // health accessory (distinct from arm care, open to every sport).
  if (pack.hasArmCare) renderers.ACC_SHOULDER = () => null
  if (pack.warmupLower || pack.warmupUpper) {
    renderers.WARMUP = (ctx) => {
      const lu = dayLayoutEngine.dayLowerOrUpper(ctx.dayTemplate)
      if (lu === 'lower') return pack.warmupLower || null
      if (lu === 'upper') return pack.warmupUpper || null
      return null
    }
  }
  renderers.FINISHER = (dayIndex, ctx) => {
    const opts = { hasArmCare: !!pack.hasArmCare }
    // Baseball's own day-type-locking rule (arm-care never on a lower-body
    // day) doesn't collapse to one static array once 5/6-day plans stop
    // being a flat append: which template day is "lower" vs "upper" shifts
    // with the day count (day 5 is upper-flavored at 5 days, lower-flavored
    // at 6), so a pack may hand over a (ctx) => array function instead of a
    // static array. Every other pack still just hands over a static array.
    const dayCompat = typeof pack.dayCompatibility === 'function' ? pack.dayCompatibility(ctx) : pack.dayCompatibility
    if (dayCompat) opts.dayCompatibility = dayCompat
    if (pack.finisherOverrides) opts.overrides = pack.finisherOverrides
    // Almost every pack plans the finisher against the day's own real day
    // count. Baseball floors this to 4 (see baseballFinisherPlanDays) so a
    // tightly-constrained 3-day week never forces the engine's day-type-
    // locking compatibility fallback to fire.
    const planDays = pack.finisherPlanDays ? pack.finisherPlanDays(ctx) : ctx.days
    const plan = finisherEngine.planWeekFinishers('rotational', ctx.phaseNum, planDays, opts)[dayIndex]
    // Baseball's own finisher bank varies by week (its 'core' family rotates
    // a pool keyed off weekNumber, matching baseballCoreFinisher's
    // pre-existing rotation) and by position (isPitcher bumps arm-care set
    // counts) — a plain object can't express that, so a pack may hand over
    // a (ctx) => bank function instead of a static bank. Every other pack
    // still just hands over a static object, unaffected.
    const bank = typeof pack.finisherBank === 'function' ? pack.finisherBank(ctx) : pack.finisherBank
    return finisherEngine.renderFinisher(bank, plan, ctx.phaseNum, ctx.deload)
  }
  return renderers
}

// Generates all 16 weeks for one Rotational-archetype sport at a given
// day count, entirely from its pack. `phases` is that sport's own phase
// table (TENNIS_PHASES, GOLF_PHASES, ...), run through the same shared
// getPhaseInfo every non-Collision sport already uses — Change 1-4's own
// block-periodization math is completely untouched by this.
function generateRotationalWeeksFromPack(pack, phases, daysPerWeek) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = getPhaseInfo(w, phases)
    const ctx = { ...info, days: Math.max(2, Math.min(6, daysPerWeek)) }
    let sessions = dayLayoutEngine.buildWeekSessions('rotational', ctx.days, buildRotationalRenderers(pack), ctx)
    if (pack.displayFocus) {
      sessions = sessions.map(s => ({ ...s, focus: pack.displayFocus[s.focus] || s.focus }))
    }
    weeks.push({
      week_number: w,
      objective: info.deload
        ? `Phase ${info.phaseNum} — Deload (${info.pct}) · Week ${info.wip} of 4`
        : `Phase ${info.phaseNum} — ${info.phaseLabel} (${info.pct}) · Week ${info.wip} of 4`,
      sessions,
    })
  }
  return weeks
}

// Tennis's own finisher content — Rotational/Throwing archetype, arm care
// ON (a real overhead/throwing-adjacent sport — serving). Sprint/Energy
// reuse TENNIS_DAY5's own already-vetted court-movement vocabulary
// (Lateral Shuffle Sprint, 5-10-5 Shuttle, Reactive Cone Drill, Ankle
// Hops); Rotation reuses Day 3's own Med Ball Rotational Throw; Arm reuses
// Day 2's own Band External Rotation/YTW Series. Core reuses the shared
// coreBlock verbatim.
const TENNIS_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Lateral Shuffle Sprint: 2x10 yds each way'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Lateral Shuffle Sprint: 4x10 yds each way'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Lateral Shuffle Sprint: 5x10 yds each way'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['5-10-5 Shuttle: 6x1'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['5-10-5 Shuttle: 4x1'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Reactive Cone Drill: 2x3'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Reactive Cone Drill: 3x3'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Reactive Cone Drill: 4x3'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Ankle Hops: 4x20'] }
    return { subtitle: 'Reduced', lines: ['Reactive Cone Drill: 2x3'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Rotational Cable Pull: 3x8 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
  arm(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Band External Rotation: 2x15 each arm'] }
    if (ph === 1) return { subtitle: 'Capacity & Scap Control', lines: ['Band External Rotation: 4x15 each arm', 'YTW Series: 3x10 each'] }
    if (ph === 2) return { subtitle: 'Modest Increase', lines: ['Band External Rotation: 4x15 each arm'] }
    if (ph === 3) return { subtitle: 'Maintenance', lines: ['YTW Series: 3x10 each'] }
    return { subtitle: 'Readiness', lines: ['Band External Rotation: 3x15 each arm'] }
  },
}

// feat/day-layout-engine — Tennis's pack. hasArmCare:true (real overhead/
// serving demand), so ACC_SHOULDER slots defer entirely to the finisher
// engine's own arm family (see buildRotationalRenderers' doc comment) —
// no ACC_SHOULDER entries needed below. Old fixed "Power Clean: 3x3"/
// "Hang Clean: 3x3" lines drop (no MAIN_OLY slot in this archetype); Day
// 3's old plyo/lateral-jump content (phasePlyo, Lateral Squat Jump, Single
// Leg Box Jump) doesn't have a slot in the 4-day template either — none of
// Rotational's 4-day days carry PLYO, only MED_BALL, reflecting the
// archetype's own rotational-power-over-jump-power emphasis — a real,
// visible simplification on 3/4-day plans specifically. Day 2's old main
// lift was Bench Press (horizontal) on what's structurally the week's
// VERTICAL-press day; Overhead Press (already in Tennis's own content,
// just as a fixed accessory before) is promoted to fill that slot, and
// Bench Press moves to the days that actually want a horizontal press
// (3-day's 'Upper & Rotational', 6-day's 'Upper — Horizontal Press
// Emphasis').
const TENNIS_PACK = {
  finisherBank: TENNIS_FINISHERS,
  hasArmCare: true,
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: 'Back Squat',
      ACC_HINGE: 'Single Leg RDL: 4x8 each leg',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
    },
    'Upper & Shoulder Health': { // 4-day only
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper & Rotational': { // 3-day only
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Split Stance Cable Row: 4x10 each side',
      ACC_PULL_V: 'Seated Cable Lat Pulldown: 4x12',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Lower Strength': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_SQUAT: 'Goblet Squat: 4x10',
      ACC_POSTERIOR: 'Single Leg RDL: 4x8 each leg', // 4-day
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
    },
    'Upper Power & Rotational': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Split Stance Cable Row: 4x10 each side',
      ACC_PULL_V: 'Seated Cable Lat Pulldown: 4x12',
    },
    'Shoulder Health & Power Accessory': {
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Vertical Press Emphasis': {
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      ACC_PULL_V: 'Seated Cable Lat Pulldown: 4x12',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Horizontal Press Emphasis': {
      MAIN_PRESS_H: 'Bench Press',
      ACC_PULL_H: 'Split Stance Cable Row: 4x10 each side',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Bulgarian Split Squat: 4x6 each leg',
      ACC_POSTERIOR: 'Single Leg RDL: 4x8 each leg',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Arm-Care Emphasis': {
      ACC_PULL_H: 'Single Arm DB Row: 4x10 each arm',
      ACC_PULL_V: 'Seated Cable Lat Pulldown: 4x12',
    },
  },
}

function generateTennisWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : TENNIS_PHASES
  const weeks = generateRotationalWeeksFromPack(TENNIS_PACK, phases, daysPerWeek)
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

// ─── Golf ─────────────────────────────────────────────────────────────────────

// Golf's own finisher content — Rotational/Throwing archetype, but arm
// care is OFF (not a throwing/overhead sport — shoulder work comes from
// its own normal lifting) — the freed weight redistributes into
// Sprint/Energy/Core/Rotation, matching golf's real emphasis. Sprint uses
// Broad Jump (ground-force/explosive power — golf's real athletic demand
// is club-head speed off the ground, not straight-line running); Energy
// uses Suitcase Carry (already vetted, fits the "carry a bag 18 holes"
// identity); Rotation reuses Day 2's own Med Ball Rotational Throw. Core
// reuses the shared coreBlock verbatim. No `arm` entry — with
// `hasArmCare: false` the engine guarantees it's never selected as
// primary or secondary (see finisherEngine.js's assignSecondaries), so its
// absence here is intentional and self-documenting.
const GOLF_FINISHERS = {
  sprint(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Broad Jump: 2x3'] }
    if (ph === 1) return { subtitle: 'Acceleration Mechanics', lines: ['Broad Jump: 3x3'] }
    if (ph === 2) return { subtitle: 'Acceleration Mechanics', lines: ['Broad Jump: 4x3'] }
    if (ph === 3) return { subtitle: 'Quality Speed', lines: ['Broad Jump: 4x3 (max intent)'] }
    return { subtitle: 'Full-Recovery Reps', lines: ['Broad Jump: 2x3 (max intent)'] }
  },
  energy(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Suitcase Carry: 1x20 yds each side'] }
    if (ph === 1) return { subtitle: 'Aerobic Base', lines: ['Suitcase Carry: 3x20 yds each side'] }
    if (ph === 2) return { subtitle: 'Interval Work', lines: ['Suitcase Carry: 4x20 yds each side'] }
    if (ph === 3) return { subtitle: 'Repeat Effort', lines: ['Farmer Carries: 3x30 yds'] }
    return { subtitle: 'Reduced', lines: ['Suitcase Carry: 2x20 yds each side'] }
  },
  core: (ph, dl) => coreEntryFromBlock(coreBlock, ph, dl),
  rotation(ph, dl) {
    if (dl) return { subtitle: 'Deload (Light)', lines: ['Med Ball Rotational Throw: 2x5 each side'] }
    if (ph === 1) return { subtitle: 'Half-Kneeling', lines: ['Med Ball Rotational Throw: 3x6 each side (half-kneeling)'] }
    if (ph === 2) return { subtitle: 'Standing', lines: ['Rotational Cable Pull: 4x8 each side'] }
    if (ph === 3) return { subtitle: 'Maximal Velocity', lines: ['Med Ball Rotational Throw: 4x6 each side (max intent)'] }
    return { subtitle: 'Low Volume, Max Intent', lines: ['Med Ball Rotational Throw: 2x6 each side (max intent)'] }
  },
}

// feat/day-layout-engine — Golf's pack. hasArmCare:false, so ACC_SHOULDER
// renders normally here (real generic shoulder-health content, e.g. Band
// Pull-Aparts) unlike Tennis. Golf's old "4/5/6-day" content (GOLF_DAY4/5/6)
// was always a generic bolt-on, not purpose-built — this pack gives every
// day count real, tag-driven content instead. Old fixed "Power Clean: 3x3"
// drops (no MAIN_OLY slot); DB Squat Jump/phasePlyo/Anti-Rotation Press
// don't have a slot on the 3-day template either (no PLYO slot on any
// Rotational 3/4-day). Day 2 had no ramped main lift at all before — DB
// Bench Press is promoted to fill MAIN_PRESS_H; Day 2's own
// "Upper — Shoulder Health" role (4-day+) needed a genuine vertical press
// Golf's existing vocabulary didn't have — Overhead Press (already vetted
// elsewhere in this file) fills it.
const GOLF_PACK = {
  finisherBank: GOLF_FINISHERS,
  hasArmCare: false,
  displayFocus: {
    'Lower Power': 'Lower Vertical Strength & Ground Force',
    'Upper & Rotational': 'Upper & Rotational Power',
    'Lower Strength': 'Full Body Power & Posterior Chain',
  },
  byFocus: {
    'Lower Power': {
      MAIN_SQUAT: { name: 'Back Squat', suffix: ' (explosive intent)' },
      ACC_HINGE: 'Hip Thrust: 4x10',
      ACC_UNILATERAL_LOWER: 'Step-Up: 4x6 each leg',
    },
    'Upper & Rotational': { // 3-day only
      MAIN_PRESS_H: 'DB Bench Press',
      ACC_PULL_H: 'Split Stance Cable Row: 4x10 each side',
      ACC_PULL_V: 'Seated Cable Lat Pulldown: 4x12',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Lower Strength': {
      MAIN_HINGE: 'Trap Bar Deadlift',
      ACC_SQUAT: 'Goblet Squat: 4x10',
      MED_BALL: 'Med Ball Slam: 4x8', // 3-day
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5', // 4-day
    },
    'Upper & Shoulder Health': { // 4-day only
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      ACC_PULL_H: 'Single Arm DB Row: 4x8 each arm',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x20',
    },
    'Upper Power & Rotational': {
      MAIN_PRESS_H: 'DB Bench Press',
      ACC_PULL_H: 'Split Stance Cable Row: 4x10 each side',
      ACC_PULL_V: 'Seated Cable Lat Pulldown: 4x12',
    },
    'Shoulder Health & Power Accessory': {
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x20',
    },
    'Upper — Vertical Press Emphasis': {
      MAIN_PRESS_V: { name: 'Landmine Press', suffix: ' (angled — no direct overhead loading)' },
      ACC_PULL_V: 'Seated Cable Lat Pulldown: 4x12',
      MED_BALL: 'Med Ball Slam: 4x8',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x20',
    },
    'Upper — Horizontal Press Emphasis': {
      MAIN_PRESS_H: 'DB Bench Press',
      ACC_PULL_H: 'Split Stance Cable Row: 4x10 each side',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Lower Explosion': {
      MAIN_SQUAT: 'Back Squat',
      ACC_UNILATERAL_LOWER: 'Step-Up: 4x6 each leg',
      ACC_POSTERIOR: 'Nordic Hamstring Curl: 4x5',
      MED_BALL: 'Med Ball Slam: 4x8',
    },
    'Upper — Arm-Care Emphasis': {
      ACC_PULL_H: 'Single Arm DB Row: 4x8 each arm',
      ACC_PULL_V: 'Seated Cable Lat Pulldown: 4x12',
      ACC_SHOULDER: 'Band Pull-Aparts: 4x20',
    },
  },
}

function generateGolfWeeks(posId, goal, daysPerWeek = 3) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : GOLF_PHASES
  const weeks = generateRotationalWeeksFromPack(GOLF_PACK, phases, daysPerWeek)
  if (!mg) return weeks
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })),
  }))
}

// ─── General Athletic Performance (fallback) ──────────────────────────────────

function generalSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  return [
    { day: 'Day 1', focus: 'Lower Strength',
      description: `Back Squat: ${info.ramp}, ${q}×3\nBulgarian Split Squat: 3x6 each leg\nHip Thrust: 3x10\nNordic Hamstring Curl: 3x5\nCalf Raises: 3xAMAP\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `Bench Press: ${info.ramp}, ${q}×3\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nOverhead Press: 3x10\nFace Pulls: 3x15` },
    { day: 'Day 3', focus: 'Full Body Power',
      description: `Power Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\n${coreBlock(ph)}` },
  ]
}

const GENERAL_DAY4 = (info) => ({
  day: 'Day 4', focus: 'Conditioning & Accessory',
  description: `Sled Push: 4x20 yds\nFarmer Carries: 3x40 yds\nBand Pull-Aparts: 3x20\n${coreBlock(info.phaseNum)}`,
})
const GENERAL_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Speed & Conditioning',
  description: `Sprint Work: 6x40 yds\nAgility Ladder: 4 rounds\n${coreBlock(info.phaseNum)}`,
})
const GENERAL_DAY6 = {
  day: 'Day 6', focus: 'Active Recovery & Mobility',
  description: `Foam Roll: Full body — 15 minutes\nDynamic Stretch: Hip Flexors · Hamstrings · Thoracic\nBand Work: Pull-Aparts 3x20 · External Rotation 3x15 each arm\nCore Maintenance: Plank 3x60s · Dead Bug 3x10 each side`,
}

function generateGeneralWeeks(_, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : STD_PHASES
  const fn = mg
    ? (info) => generalSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : generalSess
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [GENERAL_DAY4, GENERAL_DAY5, GENERAL_DAY6])
}

// ─── Sport / position / goal normalization ────────────────────────────────────

function normalizeSport(raw) {
  if (!raw) return null
  const s = raw.toLowerCase().trim().replace(/[\s\-&]/g, '').replace(/[^a-z0-9_]/g, '')
  const MAP = {
    football: 'football', fb: 'football',
    basketball: 'basketball', bball: 'basketball', hoops: 'basketball',
    soccer: 'soccer', futbol: 'soccer',
    baseball: 'baseball', softball: 'baseball', fastpitch: 'baseball',
    hockey: 'hockey', icehockey: 'hockey', fieldhockey: 'hockey',
    rugby: 'rugby', rugbyunion: 'rugby', rugbyleague: 'rugby',
    tennis: 'tennis',
    golf: 'golf',
    wrestling: 'wrestling',
    volleyball: 'volleyball', vball: 'volleyball',
    track: 'track', trackandfield: 'track', trackandfiled: 'track', trackanfield: 'track', trackandfieldfield: 'track',
    crosscountry: 'cross_country', xc: 'cross_country', crosscountryrunning: 'cross_country',
    lacrosse: 'lacrosse', lax: 'lacrosse',
    swimming: 'swimming', swim: 'swimming',
  }
  return MAP[s] || null
}

// Fires whenever normalizePosition can't match a sport's regexes and has to
// fall back to a default template. Several of those defaults are the sport's
// most extreme/heaviest archetype (see the per-sport comments below), so a
// silent fallback can quietly hand an athlete a program that doesn't fit
// them at all — e.g. a typo'd position, or a position the survey offers that
// no regex accounts for. This only logs (never throws) so generation always
// still succeeds; it exists purely to make the fallback visible in server
// logs/monitoring instead of invisible.
function logPositionFallback(sport, rawPos, resolvedTo) {
  console.warn(`[normalizePosition] Unrecognized ${sport} position "${rawPos}" — defaulting to "${resolvedTo}"`)
}

function normalizePosition(sport, rawPos) {
  const p = (rawPos || '').toLowerCase().trim()

  if (sport === 'football') {
    if (/^qb$/.test(p) || /quarter/.test(p)) return 'qb'
    if (/\b(ol|dl|guard|tackle|center|centre|nose|offensive\s*line|defensive\s*line|lineman|linemen)\b/.test(p)) return 'linemen'
    if (/\b(wr|db|rb|safety|corner|cornerback|running\s*back|wide\s*rec|slot|receiver)\b/.test(p)) return 'skill'
    if (/\b(lb|te|fb|linebacker|tight\s*end|fullback)\b/.test(p)) return 'hybrid'
    // Kickers/punters: a real, selectable survey option ("K/P") that never
    // matched any branch above and was silently defaulting straight into
    // Linemen — the heaviest, lowest-speed archetype in the system, a poor
    // fit for a specialist position. Route to Skill (Speed/Power) instead —
    // closer to a kicker/punter's actual explosiveness/hip-mobility/leg-speed
    // demands than a max-strength/contact program. No new template — reuses
    // the existing Skill content, same as any other skill-position athlete.
    if (/\b(k\/p|kicker|punter|placekicker|place\s*kicker|long\s*snapper)\b/.test(p)) return 'skill'
    logPositionFallback('football', rawPos, 'linemen')
    return 'linemen'
  }

  if (sport === 'basketball') {
    if (/\b(c|center|centre)\b/.test(p)) return 'bigs'
    if (/\b(sf|pf|small\s*forward|power\s*forward|forward|wing)\b/.test(p)) return 'wings'
    if (/\b(pg|sg|point|shooting|point\s*guard|shooting\s*guard|guard)\b/.test(p)) return 'guards'
    logPositionFallback('basketball', rawPos, 'guards')
    return 'guards'
  }

  if (sport === 'hockey') {
    if (/\b(goalie|goaltender|g)\b/.test(p)) return 'goalie'
    if (/\b(defense|defence|d|defenseman|defenceman|def)\b/.test(p)) return 'defense'
    logPositionFallback('hockey', rawPos, 'forwards')
    return 'forwards'
  }

  if (sport === 'track') {
    // Plural forms added — the survey's own dropdown sends "Throws"/"Jumps"
    // (plural), which the previous singular-only \bthrow\b/\bjump\b never
    // matched (a trailing "s" breaks the trailing word boundary), silently
    // defaulting every athlete who picked those exact options to Sprint.
    if (/\b(shot|discus|javelin|hammer|throws?|throwers?)\b/.test(p)) return 'throw'
    if (/\b(jumps?|jumpers?|hj|lj|tj|high\s*jumps?|long\s*jumps?|triple\s*jumps?|pole\s*vaults?|pv)\b/.test(p)) return 'jump'
    return 'sprint'
  }

  if (sport === 'baseball') {
    if (/\b(pitcher|p)\b/.test(p) || p === 'pitcher') return 'pitcher'
    return 'baseball'
  }

  if (sport === 'rugby') {
    if (/\b(prop|hooker|lock|flanker|number\s*8|no\.?\s*8|numbe?r?\s*eight)\b/.test(p)) return 'forwards'
    if (/\b(scrum\s*half|fly\s*half|center|centre|wing|fullback|winger|back)\b/.test(p)) return 'backs'
    logPositionFallback('rugby', rawPos, 'forwards')
    return 'forwards'
  }
  if (sport === 'soccer') {
    if (/\b(gk|goalkeeper|keeper|goalie)\b/.test(p)) return 'goalkeeper'
    if (/\b(cb|center\s*back|centre\s*back|central\s*defender|center\s*def)\b/.test(p)) return 'center_back'
    if (/\b(lb|rb|fullback|full\s*back|wingback|wing\s*back|left\s*back|right\s*back)\b/.test(p)) return 'fullback'
    if (/\b(cm|dm|cdm|cam|midfielder|mid|central\s*mid|defensive\s*mid|attacking\s*mid)\b/.test(p)) return 'midfielder'
    if (/\b(lw|rw|winger|wide|wide\s*mid|wide\s*player)\b/.test(p)) return 'winger'
    if (/\b(st|cf|striker|center\s*forward|centre\s*forward|forward|fw)\b/.test(p)) return 'striker'
    return 'midfielder'
  }

  if (sport === 'tennis') return 'tennis'
  if (sport === 'golf')   return 'golf'

  return sport
}

function normalizeGoal(primary_goal) {
  if (!primary_goal) return 'standard'
  const g = primary_goal.toLowerCase()
  if (g.includes('muscle') || g.includes('bulk') || g.includes('hyper') || g === 'muscle_gain') return 'muscle_gain'
  return 'standard'
}

function normalizeExperience(raw) {
  if (!raw) return 'intermediate'
  const e = raw.toLowerCase().trim()
  if (e.includes('beginn') || e.includes('novice') || e.includes('new')) return 'beginner'
  if (e.includes('advanc') || e.includes('elite') || e.includes('expert')) return 'advanced'
  return 'intermediate'
}

// ─── Experience-level adjustments ──────────────────────────────────────────────
// Applied as a post-processing pass over the already-generated `weeks` array
// instead of inside each of the ~60 sport/position session functions above —
// every session across all 14 sports is plain-text `description` in the same
// "ExerciseName: sets x reps [@ pct%]" shape, so one shared pass here reaches
// every sport/position/goal combination uniformly and can't drift out of sync
// with any single sport's hand-authored session content.
//
// Intermediate is the level the templates above are already calibrated for, so
// it is a no-op. Beginner and advanced both operate on `session.description`
// text only; nothing about set/rep/percentage math elsewhere in this file changes.

// Scales only the LAST %-of-max figure on each line (the top/working set of a
// ramp, e.g. the "65" in "40%×10, 50%×8, 60%×6, 70%×5, 65%×3"), leaving the
// fixed warm-up ramp steps (40/50/60/70%) as clean, untouched numbers. A "lo-hi%"
// range (e.g. Cross Country's "65-70% only" or a conditioning "80-85% effort")
// is handled separately, scaling both bounds together — treating it as a single
// trailing "%" would corrupt the range (e.g. "65-70%" -> the nonsensical "65-63%").
function scaleTopSetPercent(text, factor) {
  return text.split('\n').map(line => {
    const rangeMatch = line.match(/(\d+)-(\d+)%/)
    if (rangeMatch) {
      const lo = Math.max(1, Math.round(parseInt(rangeMatch[1], 10) * factor))
      const hi = Math.max(1, Math.round(parseInt(rangeMatch[2], 10) * factor))
      return line.slice(0, rangeMatch.index) + `${lo}-${hi}%` + line.slice(rangeMatch.index + rangeMatch[0].length)
    }
    const matches = [...line.matchAll(/(\d+)%/g)]
    if (matches.length === 0) return line
    const last = matches[matches.length - 1]
    const scaled = Math.max(1, Math.round(parseInt(last[1], 10) * factor))
    return line.slice(0, last.index) + `${scaled}%` + line.slice(last.index + last[0].length)
  }).join('\n')
}

// Appends one more work set at the (already scaled) top-set percentage to any
// line that is a genuine multi-step ramp — i.e. a primary compound lift, not a
// single-percentage accessory line.
function addExtraTopSet(text) {
  return text.split('\n').map(line => {
    // Optional trailing "-N" supports an open rep WINDOW on the top set
    // (e.g. linemen's "85%×3-6") — without it, the range's second number
    // would be silently dropped when this duplicated set is appended.
    // Every other sport's top set is a single fixed rep count with no
    // hyphen, so this is purely additive: identical matches/behavior there.
    const matches = [...line.matchAll(/\d+%×\d+(?:-\d+)?/g)]
    if (matches.length < 2) return line
    return `${line}, ${matches[matches.length - 1][0]}`
  }).join('\n')
}

// Power Clean / Hang Clean (and hockey's "Hang Power Clean") are technical
// Olympic-lift variants with no place in a beginner's first 8 weeks with no
// technique-development period. Swap them for the hinge-pattern lift the "Fix
// 1" corrections elsewhere in this file already prefer over redundant cleans —
// keeping whatever sets/reps/ramp the original line had.
function removeBeginnerOlyLifts(text) {
  return text.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (stripped.startsWith('Hang Power Clean')) return 'Trap Bar Deadlift' + stripped.slice('Hang Power Clean'.length)
    if (stripped.startsWith('Power Clean from floor')) return 'Trap Bar Deadlift' + stripped.slice('Power Clean from floor'.length)
    if (stripped.startsWith('Power Clean')) return 'Trap Bar Deadlift' + stripped.slice('Power Clean'.length)
    if (stripped.startsWith('Hang Clean')) return 'Romanian Deadlift' + stripped.slice('Hang Clean'.length)
    // A fixed WARM-UP COMPLEX line (not a standalone prescription) can name
    // "Hang Clean xN" as one empty-bar technique-priming rep among several
    // (e.g. linemen's Empty BB Warm-Up Complex) — swap just that one step to
    // a non-technical hinge rep for beginners, leaving the rest of the fixed
    // block untouched. Scoped narrowly (requires both "warm-up" wording and
    // the exact "Hang Clean xN" shape) so it can't fire on any other line.
    if (/warm-?up/i.test(stripped) && /Hang Clean x\d+/.test(stripped)) {
      return stripped.replace(/Hang Clean x(\d+)/, 'Good Morning x$1')
    }
    return stripped
  })).join('\n')
}

const PLYO_KEYWORDS = /\b(Box Jumps?|Broad Jumps?|Hurdle Hops?|Depth Jumps?|Depth Drop|Snap Down|Squat Jumps?|Lateral Bounds?|Bounding|Approach Jumps?|Drop Jumps?|Reactive Box Jump|Ankle Hops?|Hop & Stick)\b/i

// Reduces the SET count (not reps) on any line whose exercise name matches a
// plyometric/jump/bound movement, e.g. "Box Jumps: 5x5" → "4x5" at factor 0.7.
function reducePlyoVolume(text, factor) {
  return text.split('\n').map(line => {
    const m = line.match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
    if (!m) return line
    const [, name, sets, reps, rest] = m
    if (!PLYO_KEYWORDS.test(name)) return line
    const newSets = Math.max(1, Math.round(parseInt(sets, 10) * factor))
    return `${name}: ${newSets}x${reps}${rest}`
  }).join('\n')
}

const BEGINNER_NOTE = '\n\nCoach note: Focus on form over weight — technique first, load second.'

function applyExperienceAdjustments(weeks, experience) {
  if (experience === 'intermediate') return weeks // current templates are calibrated for this level

  return weeks.map(week => {
    const phaseNum = Math.ceil(week.week_number / 4) // 1-4 -> 1, 5-8 -> 2, 9-12 -> 3, 13-16 -> 4
    return {
      ...week,
      sessions: week.sessions.map(session => {
        let description = session.description

        if (experience === 'beginner') {
          if (phaseNum <= 2) description = removeBeginnerOlyLifts(description)
          description = scaleTopSetPercent(description, 0.90) // -10%, all phases
          description = reducePlyoVolume(description, 0.70)    // -30%, all phases
          description = description + BEGINNER_NOTE
        } else if (experience === 'advanced' && phaseNum >= 3) {
          description = scaleTopSetPercent(description, 1.05) // +5%, Phase 3-4 only
          description = addExtraTopSet(description)            // +1 heavy set, Phase 3-4 only
        }

        return { ...session, description }
      }),
    }
  })
}

// ─── Injury-area adjustments ───────────────────────────────────────────────────
// Same rationale as applyExperienceAdjustments() above: a text-level post-
// processing pass over the generated `weeks`, since every session across all
// 14 sports/position groups is the same plain "ExerciseName: sets x reps
// [@ pct%]" shape. Previously injury_areas only drove a cosmetic caution badge
// (client/src/components/SessionDescription.jsx) with no effect on the actual
// prescription — a shoulder-injured athlete still received full-intensity
// Overhead Press and Bench Press, a knee-injured athlete still received full-
// load Back Squat and Depth Jumps.
//
// It's safe to bake this directly into the STORED session text here because
// auto-assigned blueprints (the only thing generateBlueprintForAthlete produces)
// are already one-per-athlete. A team-wide/coach-built blueprint, by contrast,
// can be shared across athletes with different injury profiles, so the
// equivalent substitution there has to run at render time instead of being
// written into shared storage — see applyInjurySubstitutions() in
// client/src/components/SessionDescription.jsx, which mirrors these exact
// rules and must be kept in sync with any change made here.

function normalizeInjuryAreas(raw) {
  if (!Array.isArray(raw)) return []
  return raw.filter(a => a && a !== 'None')
}

// Scales every %-of-max figure on a line by `factor` — used for injury-driven
// load reductions, where the whole prescription should come down, not just the
// top set (contrast with scaleTopSetPercent() above, used for experience level).
function scaleAllPercentages(text, factor) {
  return text.replace(/(\d+)%/g, (_, p) => `${Math.max(1, Math.round(parseInt(p, 10) * factor))}%`)
}

function isUpperBodySession(focus, description) {
  if (/upper/i.test(focus || '')) return true
  return /^(Bench Press|DB Bench Press|Incline (DB )?Press|Close Grip Bench Press|Overhead Press|Push Press|Landmine Press|BB Split Jerk|Behind Neck Press|Arnold Press|DB Shoulder Press)\b/m.test(description)
}

// Ensures Band External Rotation and a YTW series are present and explicitly
// marked as a required warm-up on any upper-body session, for shoulder-flagged
// athletes — inserting them near the top (after any leading warm-up line) if
// missing, or annotating the existing line if already programmed.
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
// One consistent factor for every substituted lift and every load reduction
// across the whole injury-adjustment system (Shoulder/Knee/Back/Hip/
// Quadriceps/Hamstring/Ankle/Elbow/Wrist) — a single, conservative number
// rather than a per-area tuned percentage, since there's no coach in the
// room to judge how much an individual athlete's acute strain should
// actually be scaled back. Shoulder/Back previously used 0.70 and Knee used
// 0.60 — both are 0.50 now too, so the number never varies by area.
const INJURY_LOAD_FACTOR = 0.50

// Reduces the SET count (not reps) on any accessory-shaped "Name: NxR..."
// line whose name matches nameRe, by INJURY_LOAD_FACTOR. Generalizes the
// lever Hip's lunge-volume cut already used, so every area below can reuse
// it for "reduce/cut X volume" rules. Handles a line with multiple "NxR"
// segments (e.g. a multi-distance sprint line) by scaling every segment,
// not just the first. No-ops (returns the line unchanged) if the name
// doesn't match or the line isn't "Name: ...NxR..." shaped at all.
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
// Elbow and Wrist — every arm-isolation exercise name already used anywhere
// in this file's accessory content (same names GENERIC_FILLER below tracks).
const ARM_ACCESSORY_RE = /^(Bicep Curls?|Hammer Curls?|DB Curls?|Cable Curls?|Incline Curls?|Tricep (Pushdowns?|Extensions?)|Cable Pushdown|DB Skull Crushers?|Diamond Push-?Ups?|Forearm Curls?(?: \(Both Ways\))?|Wrist Curls?|Reverse Wrist Curls?)\b/i

function applyShoulderAdjustments(description, focus) {
  const lines = description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (/^Overhead Press\b/.test(stripped)) {
      const renamed = stripped.replace(/^Overhead Press/, 'Landmine Press')
      const scaled = scaleAllPercentages(renamed, INJURY_LOAD_FACTOR)
      // Overhead Press is never percentage-ramped in these templates (plain
      // sets x reps), so there's usually no numeric max to scale — make the
      // load reduction explicit as text instead of silently doing nothing.
      return scaled === renamed ? `${renamed} (50% of your usual Overhead Press load)` : scaled
    }
    if (/^Bench Press\b/.test(stripped)) {
      return stripped.replace(/^Bench Press/, 'DB Bench Press') + ' (use a controlled range of motion)'
    }
    return stripped
  }))
  return ensureShoulderWarmup(lines.join('\n'), focus)
}

function applyKneeAdjustments(description) {
  return description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (/^Back Squat\b/.test(stripped)) {
      return scaleAllPercentages(stripped.replace(/^Back Squat/, 'Goblet Squat'), INJURY_LOAD_FACTOR)
    }
    // Front Squat carries the same knee-loading concern as Back Squat but
    // never got the same substitution — a pre-existing gap that matters
    // more now that baseball's category variation puts Front Squat into
    // regular weekly rotation. Same target, same flat load cut.
    if (/^Front Squat\b/.test(stripped)) {
      return scaleAllPercentages(stripped.replace(/^Front Squat/, 'Goblet Squat'), INJURY_LOAD_FACTOR)
    }
    if (/\bDepth Jumps?\b/.test(stripped)) {
      return stripped.replace(/Depth Jumps?/, 'Box Step-Ups')
    }
    // Trap Bar Jump is a loaded jump — same landing-impact concern as Depth
    // Jumps. Swap to Trap Bar Deadlift (same equipment/hip-hinge pattern,
    // zero landing impact), keeping the rest of the line (its load note)
    // as-is, same name-only-swap approach as the Depth Jumps line above.
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

function applyBackAdjustments(description) {
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

function applyHipAdjustments(description) {
  return description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (/^Bulgarian Split Squat\b/.test(stripped)) {
      return stripped.replace(/^Bulgarian Split Squat/, 'Single Leg Press')
    }
    // Hamstring Curls is intentionally absent from baseball's default weekly
    // content (kept in the exercise library, but only ever surfaced here) —
    // a lower-intensity, joint-controlled swap for Single Leg RDL under a
    // hip-related injury flag. This is unchanged and independent of the new,
    // fully separate Hamstring area below (see applyHamstringAdjustments) —
    // an athlete can have either flag, both, or neither; this line only
    // fires when Hip itself is flagged.
    if (/^Single Leg RDL\b/.test(stripped)) {
      return stripped.replace(/^Single Leg RDL/, 'Hamstring Curls')
    }
    return reduceInjuryVolume(stripped, /\bLunge\b/i)
  })).join('\n')
}

// ─── Quadriceps (strain) ────────────────────────────────────────────────────
const QUAD_REMOVE_RE = /^Depth Jumps?\b/
const QUAD_VOLUME_RE = /^(Sprint(?: Work| Tempo Protocol| Ladder)?|(?:Easy )?Strides|Sled (?:Push|Sprint|Drag)|Broad Jumps?|(?:DB |Split |Single Leg )?Squat Jumps?|Approach Jumps?|Bounding|Hex Bar Jumps?|Lateral (?:Bounds?|Squat Jump)|Flying 20s|300 Yard Shuttle|V Drill|Star Drill|Resistance Band Sprint)\b/i

function applyQuadricepsAdjustments(description) {
  return description.split('\n')
    .filter(line => !QUAD_REMOVE_RE.test(line.replace(SUPERSET_MARKER_RE, '')))
    .map(line => withMarkerPreserved(line, stripped => {
      if (/^Back Squat\b/.test(stripped)) {
        return scaleAllPercentages(stripped.replace(/^Back Squat/, 'Box Squat'), INJURY_LOAD_FACTOR)
      }
      if (/^Front Squat\b/.test(stripped)) {
        return scaleAllPercentages(stripped.replace(/^Front Squat/, 'Goblet Squat'), INJURY_LOAD_FACTOR)
      }
      // Depth Jumps are removed entirely above (filter); Box Jumps are the
      // lower-eccentric-demand jump, so they get a name swap instead.
      if (/\bBox Jumps?\b/.test(stripped)) {
        return stripped.replace(/Box Jumps?/, 'Step-Ups')
      }
      if (/^Bulgarian Split Squat\b/.test(stripped)) {
        return stripped.replace(/^Bulgarian Split Squat/, 'Reverse Lunge') + ' (50% load)'
      }
      // RDL/hinge work is deliberately left alone — quad strains don't
      // implicate the posterior chain.
      return reduceInjuryVolume(stripped, QUAD_VOLUME_RE)
    })).join('\n')
}

// ─── Hamstring (strain) — formalized as its own area. Previously this only
// existed indirectly, riding on Hip (see the "Hamstring Curls" swap in
// applyHipAdjustments above, which is unrelated and stays exactly as-is) —
// an athlete now flags Hamstring directly and gets its own dedicated,
// hamstring-specific substitution set below. ────────────────────────────────
// feat/variety-engine — Eccentric Nordic Curl (new) joins Good Mornings as
// a full removal, not a volume/load reduction: an eccentric-loaded Nordic
// variant is exactly the kind of hamstring-strain-provoking movement that
// stays off the plan entirely while that flag is active, same rationale as
// every other REMOVE_RE in this file (Depth Jumps for Quad/Ankle, etc.).
const HAMSTRING_REMOVE_RE = /^(?:Good Mornings?|Eccentric Nordic Curl)\b/
const HAMSTRING_RDL_RE = /^(?:Barbell )?(?:Single Leg )?RDL\b/
const HAMSTRING_VOLUME_RE = /^(Sprint(?: Work| Tempo Protocol| Ladder)?|(?:Easy )?Strides|Sled Sprint|Broad Jumps?|Bounding|Lateral Bounds?|Flying 20s|300 Yard Shuttle|Resistance Band Sprint)\b/i

function applyHamstringAdjustments(description) {
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
      // Squats are deliberately left alone — a hamstring strain doesn't
      // implicate the quad-dominant pattern the way a hinge/RDL does.
      return reduceInjuryVolume(stripped, HAMSTRING_VOLUME_RE)
    })).join('\n')
}

// ─── Ankle ──────────────────────────────────────────────────────────────────
const ANKLE_REMOVE_RE = /^Depth Jumps?\b/
const ANKLE_SLRDL_RE = /^(?:Barbell )?Single Leg RDL\b/
// feat/variety-engine — KB Tibialis Raises (new) matches via the optional
// "KB " prefix; plain "Tibialis Raises" stays matched too.
const ANKLE_CALF_RE = /^(?:Calf Raises?|Seated Calf Raise|Single Leg Calf Raise|(?:KB )?Tibialis Raises)\b/i
const ANKLE_COD_RE = /^(Sprint(?: Work| Tempo Protocol| Ladder)?|(?:Easy )?Strides|Sled Sprint|Flying 20s|300 Yard Shuttle|V Drill|Star Drill|Lateral Shuffle|Defensive Slide(?: Sprint)?|Pro Agility Drill|T-Drill|Deceleration Drill|17s Drill|Resistance Band Sprint)\b/i

function applyAnkleAdjustments(description) {
  return description.split('\n')
    .filter(line => !ANKLE_REMOVE_RE.test(line.replace(SUPERSET_MARKER_RE, '')))
    .map(line => withMarkerPreserved(line, stripped => {
      if (/\bBox Jumps?\b/.test(stripped)) {
        return stripped.replace(/Box Jumps?/, 'Step-Ups')
      }
      // Single-leg stance is the ankle-stability demand here — the fix is
      // going bilateral, not touching the hinge pattern itself.
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

function applyElbowAdjustments(description) {
  return description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    // Heavy pressing stays the same movement, just lighter — unlike
    // Shoulder, elbow strain doesn't need a different movement pattern.
    if (ELBOW_HEAVY_PRESS_RE.test(stripped)) {
      const scaled = scaleAllPercentages(stripped, INJURY_LOAD_FACTOR)
      // A plain "Name: NxR" heavy-press line (no % ramp — e.g. "Overhead
      // Press: 4x10") has nothing for scaleAllPercentages to touch, so it'd
      // silently pass through at full load. Same fallback Shoulder's own
      // Overhead Press swap already uses: make the cut explicit as text.
      return scaled === stripped ? `${stripped} (50% load)` : scaled
    }
    if (/^(?:Weighted )?Chin-ups\b/.test(stripped)) {
      return stripped.replace(/^(?:Weighted )?Chin-ups/, 'Neutral-Grip Pull-Ups')
    }
    // Grip-intensive carries: accommodate with straps rather than cut the
    // prescription — the grip is what's protected, not the loaded carry itself.
    if (ELBOW_GRIP_RE.test(stripped)) {
      return stripped + ' (use straps)'
    }
    let out = reduceInjuryVolume(stripped, ELBOW_ROW_RE)
    out = reduceInjuryVolume(out, ARM_ACCESSORY_RE)
    return out
  })).join('\n')
  // Legs are untouched — nothing in this function matches a lower-body name.
}

// ─── Wrist ──────────────────────────────────────────────────────────────────
// Power Clean / Hang Clean / Split Jerk all load the wrist hard in the
// front-rack catch position — Clean Pull keeps the same pull pattern and
// intent (an already-recognized Oly variant, see MAIN_LIFT_KEYWORDS) with
// no catch at all. Push Press is included too: its dip-drive starts from
// the same front-rack position before the press.
const WRIST_CATCH_OLY_RE = /^(Power Clean(?: from floor)?|Hang (?:Power )?Clean(?: Above the Knee)?|(?:BB |Single Arm DB )?Split Jerk|Push Press)\b/
const WRIST_GRIP_RE = /^(?:(?:DB )?Suitcase Carr(?:y|ies)|Farmer Carr(?:y|ies)|Sandbag Carry|Grip Work)\b/

function applyWristAdjustments(description) {
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
  // Legs are otherwise fine — only Front Squat (a wrist-loaded front-rack
  // hold) is touched; every other lower-body line matches nothing above.
}

function applyInjuryAdjustments(weeks, injuryAreasRaw) {
  const areas = new Set(normalizeInjuryAreas(injuryAreasRaw))
  if (areas.size === 0) return weeks

  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(session => {
      const original = session.description
      let description = original

      if (areas.has('Shoulder'))    description = applyShoulderAdjustments(description, session.focus)
      if (areas.has('Knee'))        description = applyKneeAdjustments(description)
      if (areas.has('Back'))        description = applyBackAdjustments(description)
      if (areas.has('Hip'))         description = applyHipAdjustments(description)
      if (areas.has('Quadriceps'))  description = applyQuadricepsAdjustments(description)
      if (areas.has('Hamstring'))   description = applyHamstringAdjustments(description)
      if (areas.has('Ankle'))       description = applyAnkleAdjustments(description)
      if (areas.has('Elbow'))       description = applyElbowAdjustments(description)
      if (areas.has('Wrist'))       description = applyWristAdjustments(description)
      // 'Other' and 'None' deliberately never reach any substitution pass —
      // see submitSurvey/updateSurvey in surveyController.js, which routes
      // 'Other' to a coach notification with the athlete's own description
      // instead of any automatic exercise change.

      if (description === original) return session
      return { ...session, description, injury_modified: true }
    }),
  }))
}

// ─── Accessory progression: volume wave + exercise rotation ───────────────────
// Requirement (approved): accessory work must visibly change week-to-week
// within a phase — both in VOLUME (a wave, mirroring the same wip-driven
// moderate/lighter/peak shape used for the primary lift's top-set %, see
// WAVE_T) and in WHICH exercise is prescribed (a curated, deterministic
// rotation — NOT random: the same wip always maps to the same alternate, so
// output stays reproducible and coach-reviewable run to run).
//
// Scope: only plain ACCESSORY lines are touched. A line is left completely
// alone if it's a conditioning line, a plyo line, inside a "Core — ..." block,
// on the mobility/warm-up exempt list, or carries a "%" (every ramped
// main/primary lift line in this file has a %-of-max figure on it — accessory
// lines never do) — reusing the exact same classifiers applyDeloadVolumeReduction
// uses below, so the two passes never disagree about what counts as
// "an accessory."
//
// wip 4 is always a deload (see getPhaseInfo / applyDeloadAdjustments) and
// keeps its own larger, separate volume cut — this pass no-ops on wip 4 so a
// deload week's accessories aren't reduced twice by two different passes.
//
// Pipeline order matters: this must run BEFORE applyInjuryAdjustments (see
// generateBlueprintForAthlete below) so an injury substitution is always the
// last word on an athlete's actual prescription — rotation never overrides a
// safety swap.

// Volume multiplier on accessory SETS, keyed by wip. Mirrors WAVE_T's shape
// (moderate -> lighter dip -> peak) but expressed for accessory volume rather
// than main-lift intensity.
const ACCESSORY_VOLUME_WAVE = { 1: 1.0, 2: 0.80, 3: 1.15 }

// feat/variety-engine — RETIRED. This table (and SPORT_ACCESSORY_ROTATION/
// BASEBALL_ACCESSORY_ROTATION's own wip-based entries) used to rename
// accessory lines by matching the CURRENT rendered name, with no awareness
// of which dayLayoutEngine slot produced it — which is exactly why it used
// to rename ANCHOR slots too (an anchor's whole point is measurability: the
// same exercise, 16 weeks straight). varietyEngine.js's resolveFiller() is
// now the single authority on exercise naming (anchor slots keep theirs
// forever; filler slots rotate through its own tag-keyed pools, which
// already reuse this table's same vetted vocabulary — Reverse Lunge/
// Walking Lunge/Bulgarian Split Squat, DB Row/Pull-Ups/Chest Supported Row,
// Face Pulls/Cuban Press/Band External Rotation, Seated/Single Leg Calf
// Raise, DB Bench Press/Close Grip Bench Press, Good Mornings/Romanian
// Deadlift). applyAccessoryProgression below no longer renames anything —
// it only scales SET COUNT now (see its own comment) — so this table has
// no remaining consumer; kept here, inert, as the historical record of
// which substitutions were already vetted, in case a future pool addition
// wants to reuse one.

// ─── Session organization: pairing + formatting (all sports) ──────────────
// Every sport's session templates were authored densely — main lift plus
// 4-8+ accessories on a single day. This pass runs FIRST in the pipeline
// (before accessory rotation/wave/deload), on the fixed, freshly-generated
// template content.
//
// CORE PRINCIPLE (feat/fix-silent-accessory-drops): no authored movement is
// ever silently dropped. Every accessory-shaped line the template author
// wrote for a day survives into the rendered output — full stop. What this
// pass DOES do is formatting: reorganize each day into any inline warm-up
// preamble a sport already writes (untouched, wherever it is), the main
// lift alone — UNLESS the day has exactly one plyo/jump line, the one
// approved exception: bracketed with the main lift as a contrast superset
// (heavy lift first, so it potentiates the jump) — then EVERY remaining
// accessory (a pre-existing hand-authored pair, e.g. baseball's press +
// iso-hold superset, kept as an atomic 2-exercise unit; everything else
// paired sequentially into brackets of 2 in the order the template
// authored them, any genuinely odd leftover rendering as a single line
// instead of a bracket), conditioning work, and the core block(s) — always
// last.
//
// MAX_ACCESSORIES/SPORT_MAX_ACCESSORIES/resolveAccessoryCapKey previously
// governed a hard budget that DELETED any candidate once the day's
// authored count exceeded it — that was the actual root cause of a
// full-codebase silent-content-loss bug (an audited 125 of ~163 distinct
// day-templates were dropping 1-7 authored movements apiece, worst case
// football/linemen's muscle-gain Upper Strength day losing its entire
// neck/arm-care block). The cap no longer deletes anything (see `kept`
// below) — these are kept only as a soft, non-destructive sizing signal
// (still resolved per-sport so `applySessionOrganization`'s call site and
// any future formatting decision has an accurate "how many accessories
// does this sport normally author" number to work from), not a filter.

const MAX_ACCESSORIES = 4

// Per-sport override of MAX_ACCESSORIES — no longer load-bearing for
// content survival (see the section doc comment above), kept as an
// accurate sizing signal: baseball's rebuilt content is deliberately dense
// (up to 3 full authored pairs on Upper Strength), and the 4 Collision-
// archetype sports/positions below author 5+ movements on purpose.
const SPORT_MAX_ACCESSORIES = {
  baseball: 6,
  softball: 6,
  // Football linemen only (see resolveAccessoryCapKey below) — a day runs
  // main power lift + main strength lift + 3-4 accessories (5-6 movements
  // total), one tick above the sport-wide default of 3. Every other football
  // position (skill/hybrid/qb) still resolves to the default cap untouched.
  football_linemen: 5,
  // The other 3 sports built on the Collision/Max-Strength archetype core
  // (feat/archetype-collision) — same raised cap as Linemen, same reasoning:
  // the archetype's day layouts are authored dense on purpose. Scoped to
  // wrestling (single position) and specifically the Forwards position of
  // rugby/hockey — Rugby Backs and Hockey Defense/Goalie are untouched by
  // this archetype and keep the sport-wide default cap of 3.
  // Deliberately NOT keyed as plain "wrestling" — wrestling is a single-
  // position sport, so a bare 'wrestling' key would collide with
  // resolveAccessoryCapKey's own goal-agnostic fallthrough (`return sport`)
  // and leak the raised cap into the muscle-gain path too (caught by the
  // golden snapshot suite). "wrestling_archetype" only ever gets returned
  // by the explicit, goal-gated branch below.
  wrestling_archetype: 5,
  rugby_forwards: 5,
  hockey_forwards: 5,
}

// Football's shared MAX_ACCESSORIES sizing signal is raised for linemen
// (and, identically, for Wrestling/Rugby Forwards/Hockey Forwards) —
// PREVIOUSLY gated to `goal !== 'muscle_gain'` on the assumption that each
// sport's older, pre-archetype muscle-gain template (fbLinemenMGSess,
// wrestlingSess, rugbyForwardsSess, hockeyForwardsSess) was "already
// calibrated against the default cap." feat/fix-silent-accessory-drops's
// full-codebase audit proved that assumption wrong: football/linemen's
// muscle-gain Upper Strength day alone authors 7 accessory-shaped
// movements — the single worst silent-drop case found (BB Row, Face
// Pulls, both neck directions, Lateral Raises, and Tricep Pushdowns were
// all being deleted under the old default-cap gate). Since the cap no
// longer deletes anything either way (see the section doc comment above),
// closing this gate is pure correctness with no remaining downside — both
// goals now resolve to the same, more-accurate sizing key. Both call sites
// that organize a football blueprint (auto-assign below, and
// blueprintController.js's manual "build from template" tool) must resolve
// the same key for the same inputs, so this is the one place that decision
// is made.
function resolveAccessoryCapKey(sport, posId, goal) {
  if (sport === 'football' && posId === 'linemen') return 'football_linemen'
  if (sport === 'wrestling') return 'wrestling_archetype'
  if (sport === 'rugby' && posId === 'forwards') return 'rugby_forwards'
  if (sport === 'hockey' && posId === 'forwards') return 'hockey_forwards'
  return sport
}

// Change 4's per-sport phase-rotation lookup key. SPORT_ACCESSORY_ROTATION/
// applyAccessoryProgression's `extraRotation`/`phaseRotation` params are only
// ever resolved once per sport at the call site (no posId in the lookup) —
// fine for baseball/basketball/soccer, where every position shares
// content-compatible accessory names, but football is NOT uniform: skill/
// hybrid/qb are the 3 positions this rebuild targets, while linemen (any
// goal) runs the fully separate Collision/Max-Strength archetype engine
// (generateLinemenWeeks, collisionPhaseInfo) and must never see Change 4's
// phase table — it
// already has its own pre-existing wip-based ACCESSORY_ROTATION rotation
// (e.g. "Single Leg RDL" -> Good Mornings/Romanian Deadlift) that must stay
// exactly as merged. Returning null here (rather than 'football') for any
// non-skill/hybrid/qb posId is what keeps that guarantee.
function resolvePhaseRotationKey(sport, posId) {
  if (sport === 'football') {
    return (posId === 'skill' || posId === 'hybrid' || posId === 'qb') ? 'football' : null
  }
  return sport
}

// Generic isolation/filler work — cut first when a day needs trimming,
// regardless of sport. Nothing sport-specific here (arm-care, rotational
// power, etc.) — those are protected via the calling sport's own
// SPORT_ACCESSORY_ROTATION anchor keys (protectedNames param below).
const GENERIC_FILLER = new Set([
  'tricep pushdowns', 'tricep extensions', 'bicep curls', 'hammer curls',
  'db curl', 'bench curls', 'forearm curls', 'forearm curls (both ways)',
  'wrist curls', 'reverse wrist curls', 'neck flexion', 'neck extension',
  'lateral neck flexion',
])

function isPowerFocusDay(focus) {
  return /power/i.test(focus || '')
}

// A live-testing PROTOCOL line — currently just linemen's AMRAP pull-up
// chart (see LINEMEN_AMRAP_PULLUP) — prescribes a real primary movement
// whose actual work-set volume depends on the athlete's own Set-1 result,
// so it's deliberately written as prose rather than a fixed "Name: NxR"
// figure the generator could fabricate. That prose shape means it would
// otherwise fall all the way to the bottom of a session (the generic
// "otherLines" bucket, after every accessory) — this classifier instead
// gives it the same "stands early, right after the main lift(s), exempt
// from the accessory cap/rotation/deload-volume-reduction" treatment as an
// Olympic lift, without needing a name-specific special case. No existing
// non-linemen template contains this phrase, so it's inert everywhere else.
const PROTOCOL_LINE_RE = /:\s*Set 1 = AMRAP\b/

function isProtocolLine(line) {
  return PROTOCOL_LINE_RE.test(line.replace(SUPERSET_MARKER_RE, ''))
}

// One session's description -> reorganized description.
function organizeSessionDescription(description, focus, protectedNames, maxAccessories = MAX_ACCESSORIES) {
  const rawLines = description.split('\n')

  const preamble = []       // leading unclassified lines (e.g. an inline "X Warm-up: ..." line) — untouched, always first
  const olyLiftLines = []   // technical Olympic-lift lines (Power Clean, Hang Clean, ...) — always solo, never paired with plyo
  const rampedLiftLines = [] // the true %-ramped main lift(s) — the ONLY thing plyo can pair with
  const plyoLines = []      // { line, idx } — idx shared with candidates so original order is comparable across both
  const protocolLines = []  // live-testing protocol lines (e.g. AMRAP pull-up chart) — stand early, exempt from the cap
  const otherLines = []     // anything unclassified once we're past the preamble — untouched, kept after accessories
  const conditioningLines = []
  const coreLines = []      // "Core — ..." blocks through to the next blank line — untouched, always last
  const candidates = []     // { kind: 'pair'|'single', lines: [...bare text], priority, weight, idx }

  let seenWorkingLine = false
  let inCoreBlock = false
  let lastCoreHeaderWord = null
  let idxCounter = 0
  let i = 0

  while (i < rawLines.length) {
    const raw = rawLines[i]
    const bare = raw.replace(SUPERSET_MARKER_RE, '')
    if (bare.trim() === '') { inCoreBlock = false; i++; continue }
    // "Arm Care — ...:" is the same kind of exempt finishing block as
    // "Core — ...:" — a standalone circuit (baseball's Upper Strength day),
    // never paired, never counted against the accessory cap. Reuses the
    // same coreLines bucket/output-position (always last) since a day is
    // never supposed to have both (the "never arm-care + core same day"
    // rule), so there's no real ambiguity in sharing it. "Neck — ...:"
    // (linemen's short 4-way armor block, every session) gets the identical
    // treatment — a fixed, always-kept finisher, never trimmed by the
    // accessory cap. "Conditioning — ...:" (the Repeat-Sprint/Field
    // archetype's own phase-varying conditioning finisher — see
    // conditioningBlock) gets it too, for the same reason: its own drill
    // lines are hand-authored per phase and per deload state, and must
    // survive as a single always-kept unit rather than being cut down by
    // the accessory cap the way a loose conditioning line elsewhere in a
    // session still correctly is.
    //
    // A day can now genuinely carry TWO of these blocks (feat/finisher-
    // engine — e.g. Collision's fixed Neck armor PLUS the engine's own
    // rotating finisher) — blank lines between blocks in the original
    // template are otherwise stripped by this pass entirely (see the blank-
    // line branch above), so without this, two different header types would
    // render back to back with no visual separation. Insert one only when
    // the header WORD actually changes, so a single block's own multi-line
    // content is untouched.
    if (/^(Core|Arm Care|Conditioning|Neck)\s*—/.test(bare)) {
      const headerWord = bare.match(/^(Core|Arm Care|Conditioning|Neck)/)[1]
      if (coreLines.length && headerWord !== lastCoreHeaderWord) coreLines.push('')
      lastCoreHeaderWord = headerWord
      inCoreBlock = true; coreLines.push(raw); i++; continue
    }
    if (inCoreBlock) { coreLines.push(raw); i++; continue }
    if (isConditioningLine(raw)) { conditioningLines.push(raw); i++; continue }

    // A pre-existing hand-authored superset group (from the template's own
    // generation-time `ss` field — e.g. baseball's press + iso-hold pair).
    // The main-lift + plyo contrast is still detected by CONTENT below, not
    // by marker (so it stays robust regardless of authoring order) — but an
    // authored pair is now allowed to include a %-ramped or Olympic-lift
    // line too (e.g. baseball's Trap Bar Deadlift + Med Ball Throw, or a
    // bench variant + its iso-hold partner): marking a ramped/Oly line with
    // `ss` used to silently break (this branch excluded it, so it fell
    // through to the ramped/Oly branches below, stripping its marker before
    // the loop ever reached its would-be partner). Only plyo stays excluded
    // here — that contrast pairing is deliberately content-detected, not
    // marker-based, and must stay the one, single mechanism for it.
    const m = raw.match(SUPERSET_MARKER_RE)
    if (m && !isPlyoLine(raw)) {
      const group = m[1]
      const pair = [bare]
      i++
      while (i < rawLines.length) {
        const nextRaw = rawLines[i]
        const nm = nextRaw.match(SUPERSET_MARKER_RE)
        if (nm && nm[1] === group) { pair.push(nextRaw.replace(SUPERSET_MARKER_RE, '')); i++ } else break
      }
      // A pre-existing pair is always priority 0 (highest) and, being a
      // deliberate 2-exercise unit, counts as 2 of the 3 accessory slots.
      candidates.push({ kind: 'pair', lines: pair, priority: 0, weight: pair.length, idx: idxCounter++ })
      seenWorkingLine = true
      continue
    }

    if (isPlyoLine(raw)) { plyoLines.push({ line: bare, idx: idxCounter++ }); seenWorkingLine = true; i++; continue }
    // Some sports' sessions carry BOTH a technical Olympic lift (Power
    // Clean, Hang Clean, ...) AND a separate %-ramped compound lift on the
    // same day (e.g. Power Clean + Back Squat) — only the ramped lift is
    // ever a candidate for the plyo contrast pairing; the oly lift always
    // stands alone, wherever the template places it.
    if (isRampedLiftLine(raw)) { rampedLiftLines.push(bare); seenWorkingLine = true; i++; continue }
    if (isMainLiftLine(raw)) { olyLiftLines.push(bare); seenWorkingLine = true; i++; continue }
    if (isProtocolLine(raw)) { protocolLines.push(bare); seenWorkingLine = true; i++; continue }
    if (isAccessoryLine(raw, false)) {
      const colonIdx = bare.indexOf(':')
      const name = (colonIdx > 0 ? bare.slice(0, colonIdx) : bare).toLowerCase().trim()
      const priority = protectedNames.has(name) ? 0 : GENERIC_FILLER.has(name) ? 2 : 1
      candidates.push({ kind: 'single', lines: [bare], priority, weight: 1, idx: idxCounter++ })
      seenWorkingLine = true
      i++
      continue
    }
    if (!seenWorkingLine) preamble.push(raw); else otherLines.push(raw)
    i++
  }

  // Root-cause fix: a day's anchor only used to get a FREE slot (outside the
  // 3-accessory budget) if it was %-ramped or a technical Olympic lift.
  // Anything else — a plain press, a row, a jump (e.g. baseball's Trap Bar
  // Jump) — fell into the ordinary candidates pool and competed for one of
  // the 3 accessory slots like everything else, silently under-filling the
  // day (main + 2 instead of main + 3) and mis-treating the day's own
  // primary movement as interchangeable filler. Whenever there's no oly/
  // ramped lift, promote whichever item appears FIRST in the template's own
  // authored order — a single accessory line, or (only if the day has no
  // accessory content at all) a plyo line — to that same free slot. This
  // file's universal convention is that a session's main/anchor movement is
  // always written first, so "first in authored order" reliably identifies
  // it. An authored pair is never promoted — it already gets guaranteed
  // priority-0 treatment as an atomic 2-exercise unit, and promoting half of
  // it would break the pair.
  let promotedAnchor = null
  if (olyLiftLines.length === 0 && rampedLiftLines.length === 0) {
    const firstSingle = candidates.find(c => c.kind === 'single')
    const firstPlyo = plyoLines[0] || null
    if (firstSingle && (!firstPlyo || firstSingle.idx < firstPlyo.idx)) {
      promotedAnchor = firstSingle.lines[0]
      candidates.splice(candidates.indexOf(firstSingle), 1)
    } else if (firstPlyo) {
      promotedAnchor = firstPlyo.line
      plyoLines.shift()
    }
  }

  // Nothing at all to reorganize — a genuinely non-lifting day (pure
  // conditioning/mobility/recovery, no oly/ramped lift, no promotable
  // anchor, no remaining candidates or plyo work either).
  if (!promotedAnchor && olyLiftLines.length === 0 && rampedLiftLines.length === 0 &&
      candidates.length === 0 && plyoLines.length === 0 && protocolLines.length === 0) {
    return description
  }

  let groupNum = 1
  const out = [...preamble]
  if (preamble.length) out.push('')

  // Any technical Olympic lift(s) always stand alone first, wherever the
  // template places them — never a plyo-pairing candidate.
  out.push(...olyLiftLines)

  // A promoted non-ramped/non-oly anchor (e.g. Trap Bar Jump, a flat Bench
  // Press) also stands alone, same free treatment as an Olympic lift.
  if (promotedAnchor) out.push(promotedAnchor)

  // The %-ramped main lift stands alone, UNLESS this is a power-focus day
  // with exactly one plyo/jump line — the one approved exception, bracketed
  // together, heavy lift first. Any plyo line that DOESN'T get that
  // treatment (2+ of them, a non-power day, or no ramped lift to pair with)
  // falls back into the same capped/paired accessory pool as everything
  // else, instead of being silently dropped.
  const keepPlyo = plyoLines.length === 1 && isPowerFocusDay(focus) && rampedLiftLines.length > 0
  if (keepPlyo) {
    out.push(...superset(groupNum, [...rampedLiftLines, plyoLines[0].line]))
    groupNum++
  } else {
    out.push(...rampedLiftLines)
    for (const p of plyoLines) {
      candidates.push({ kind: 'single', lines: [p.line], priority: 1, weight: 1, idx: p.idx })
    }
  }

  // A protocol line (e.g. the AMRAP pull-up chart) stands right after the
  // main lift(s), same free/exempt treatment as an Olympic lift or promoted
  // anchor — never counted against the accessory cap, never paired.
  out.push(...protocolLines)

  // Every candidate renders — no authored movement is ever silently dropped
  // (see the section doc comment above; this replaced a hard MAX_ACCESSORIES
  // budget that used to delete anything past it, the actual root cause of a
  // full-codebase silent-content-loss bug). `kept` is simply every
  // candidate, restored to original authored order; `priority` (still
  // computed above — protected/sport-specific = 0, generic filler = 2) no
  // longer influences what survives, since nothing is cut.
  //
  // feat/superset-ohp-fixes — pairing is no longer purely positional. A
  // 'pair'-kind candidate (a pre-existing hand-authored ⟦SS⟧ group — see the
  // marker branch above) is a deliberate, already-decided 2-exercise unit
  // and is emitted as-is, unconditionally; it is never reconsidered here.
  // Every run of 'single'-kind candidates BETWEEN (or around) any 'pair'
  // boundaries is matched independently by pairCompatibleSingles, which
  // guarantees no two lines sharing a primary muscle/pattern are ever
  // bracketed together — see that function's own comment for exactly how.
  const kept = [...candidates].sort((a, b) => a.idx - b.idx)

  function flushSingleRun(run) {
    for (const g of pairCompatibleSingles(run)) {
      if (g.kind === 'pair') {
        out.push(...superset(groupNum, g.lines))
        groupNum++
      } else {
        out.push(g.line)
      }
    }
  }

  let singleRun = []
  for (const c of kept) {
    if (c.kind === 'pair') {
      flushSingleRun(singleRun); singleRun = []
      out.push(...superset(groupNum, c.lines))
      groupNum++
    } else {
      singleRun.push(c)
    }
  }
  flushSingleRun(singleRun)

  out.push(...otherLines)
  out.push(...conditioningLines)
  if (coreLines.length) {
    out.push('')
    out.push(...coreLines)
  }

  return out.join('\n')
}

function applySessionOrganization(weeks, extraRotation = {}, sport = null) {
  const protectedNames = new Set(Object.keys(extraRotation))
  const maxAccessories = (sport && SPORT_MAX_ACCESSORIES[sport]) || MAX_ACCESSORIES
  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(session => ({
      ...session,
      description: organizeSessionDescription(session.description, session.focus, protectedNames, maxAccessories),
    })),
  }))
}

function isRampedLiftLine(line) {
  // "%" covers every sport whose main lift ramps with a top-set percentage.
  // Swimming has no percentage-based lifts (its Trap Bar Deadlift/Back Squat
  // lines read "@ moderate load" instead, with their own pre-existing
  // phase-based set-count progression baked into the template) — "@ moderate
  // load" is that sport's equivalent main-lift marker.
  return line.includes('%') || line.includes('@ moderate load')
}

// Olympic-lift technical variants are prescribed as low-rep, flat "Name: SxR"
// (or baseball's dual-clause "SxR warmup, SxR working") lines with no "%"
// ramp attached — isRampedLiftLine() alone doesn't catch them, but they're
// still a main/technical lift, not an accessory, and should never be
// volume-waved or rotated.
const MAIN_LIFT_KEYWORDS = /^(Power Clean(?: from floor)?|Hang Power Clean|Hang Clean|Single Arm DB Split Jerk|BB Split Jerk|Push Jerk|Split Jerk|Snatch|Hang Snatch|Power Snatch|Clean Pull|Clean and Jerk)\b/

function isMainLiftLine(line) {
  const stripped = line.replace(SUPERSET_MARKER_RE, '')
  const colonIdx = stripped.indexOf(':')
  const name = colonIdx > 0 ? stripped.slice(0, colonIdx) : stripped
  return MAIN_LIFT_KEYWORDS.test(name)
}

// Same "Name: SxR[extra]" / baseball dual-clause shapes reduceAccessoryVolume
// recognizes, generalized to an arbitrary factor instead of a fixed halving.
function scaleAccessoryLineVolume(line, factor) {
  if (factor === 1) return line

  const dual = line.match(/^(.*?):\s*(\d+)x(\d+)\s*warmup,\s*(\d+)x(\d+[a-zA-Z]*|AMAP)\s*working(.*)$/)
  if (dual) {
    const [, name, wSets, wReps, sSets, sReps, rest] = dual
    const newWSets = Math.max(1, Math.round(parseInt(wSets, 10) * factor))
    const newSSets = Math.max(1, Math.round(parseInt(sSets, 10) * factor))
    return `${name}: ${newWSets}x${wReps} warmup, ${newSSets}x${sReps} working${rest}`
  }

  const m = line.match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
  if (!m) return line
  const [, name, sets, reps, rest] = m
  const newSets = Math.max(1, Math.round(parseInt(sets, 10) * factor))
  return `${name}: ${newSets}x${reps}${rest}`
}

function isAccessoryLine(line, inCoreBlock) {
  if (!line || line.trim() === '') return false
  if (inCoreBlock) return false
  if (isConditioningLine(line) || isPlyoLine(line)) return false
  if (isRampedLiftLine(line) || isMainLiftLine(line)) return false
  const stripped = line.replace(SUPERSET_MARKER_RE, '')
  const colonIdx = stripped.indexOf(':')
  if (colonIdx <= 0) return false
  const name = stripped.slice(0, colonIdx)
  if (isMobilityCoreExempt(name)) return false
  return /^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/.test(stripped) ||
         /^(.*?):\s*(\d+)x(\d+)\s*warmup,\s*(\d+)x(\d+[a-zA-Z]*|AMAP)\s*working(.*)$/.test(stripped)
}

// feat/variety-engine — this pass NEVER renames an accessory line anymore.
// varietyEngine.js's resolveFiller() is the single authority on exercise
// NAME (anchor slots keep theirs forever; filler slots get it from a
// pool) — this function's only remaining job is SET-COUNT scaling:
// PHASE_ACCESSORY_MULT's cross-phase volume arc (Foundation = high
// volume, Peak = stripped down) for any accessory whose current name is
// still a key in the sport's own phaseRotation table (preserves that
// arc for exactly the exercises that used to carry it), or the standard
// within-phase wip wave for everything else — identical math to before,
// minus the rename.
//
// `extraRotation` is accepted (existing call sites still pass it) but is
// now unused — SPORT_ACCESSORY_ROTATION/ACCESSORY_ROTATION never had a
// volume role distinct from the standard wip wave, only a naming one, and
// naming is retired. The parameter stays for backward compatibility with
// existing call sites rather than a signature churn across every caller.
function applyAccessoryProgression(weeks, _extraRotation = {}, phaseRotation = {}) {
  return weeks.map(week => {
    const wip = ((week.week_number - 1) % 4) + 1
    if (wip === 4) return week // deload weeks: applyDeloadAdjustments handles volume on its own, separately

    const volumeFactor = ACCESSORY_VOLUME_WAVE[wip]
    // Phase (not just wip) drives volume for any key present in
    // phaseRotation. Same phase math as getPhaseInfo (capped at 4).
    const phaseNum = Math.min(4, Math.floor((week.week_number - 1) / 4) + 1)

    return {
      ...week,
      sessions: week.sessions.map(session => {
        let inCoreBlock = false
        const lines = session.description.split('\n').map(line => {
          const bareLine = line.replace(SUPERSET_MARKER_RE, '')
          if (/^Core\s*—/.test(bareLine)) { inCoreBlock = true; return line }
          if (line === '') { inCoreBlock = false; return line }
          if (!isAccessoryLine(line, inCoreBlock)) return line

          return withMarkerPreserved(line, stripped => {
            const colonIdx = stripped.indexOf(':')
            const name = stripped.slice(0, colonIdx)

            const mult = hasPhaseAccessoryEntry(name, phaseRotation)
              ? PHASE_ACCESSORY_MULT[phaseNum]
              : volumeFactor
            return scaleAccessoryLineVolume(stripped, mult)
          })
        })
        return { ...session, description: lines.join('\n') }
      }),
    }
  })
}

// ─── Real deload weeks ─────────────────────────────────────────────────────────
// Previously the only thing that changed on a deload week was one compound
// lift's top-set percentage (a flat 60%, unrelated to what the athlete had
// actually been lifting) — every accessory set/rep count, all conditioning,
// and all plyometric work stayed identical to every other week. A real
// deload cuts total volume 40-60%, not just one number on one lift.
//
// The top-set percentage itself is already fixed at the source: getPhaseInfo()
// (used by football/basketball/soccer/wrestling/volleyball/track/lacrosse/
// rugby/tennis/golf/hockey/general), generateBaseballWeeks/
// generatePitcherBaseballWeeks (their own BASEBALL_PHASE_PCTS system), and
// generateXCWeeks (its static "65-70%" range) all now compute the deload
// week's percentage as 15-20% below the immediately preceding week, instead
// of a flat number. Swimming has no percentage-based lifts, so there's
// nothing to change there.
//
// Everything else — halving accessory volume, stripping conditioning and
// plyometric work entirely, and the session note — is sport-agnostic text
// applied here in one pass over the LAST generated week (every sport/position/
// goal combination in this file produces exactly 16 weeks, and the deload/
// taper week is always the last one), exactly like applyExperienceAdjustments
// and applyInjuryAdjustments above.

const CONDITIONING_HEADER_RE = /^[\w &]*Conditioning:$/
// feat/day-layout-engine — "Acceleration Sprints" is the day-layout
// engine's own universal SPEED-tag text (Field/Speed-Power/Vertical-Court
// archetype packs), replacing what used to be each sport's own named
// sprint drill reused verbatim from that same sport's finisher bank (a
// real duplication risk — see buildFieldRenderers/buildSpeedPowerRenderers'
// own doc comments). Classified as conditioning here for the exact same
// reason every other named sprint drill already was — same exempt
// treatment (silent-drop guarantee, accessory cap, deload handling) the
// SPEED slot's content always had before the rename.
const CONDITIONING_EXERCISE_RE = /^(Acceleration Sprints|Sprint Work|Sprint Ladder|Sprint \+ Close Out|Sprint \+ Jog Ladder|Repeat Sprint|300 Yard Shuttle|Flying 20s|17s Drill|Baseline Sprint|Defensive Slide(?: Sprint)?|Post Sprint|Box Out Drill|Shuffle Step|Full Court Sprint|V Drill|Star Drill|200m Intervals|400m [Rr]epeats|Isometric (?:Squat|Pull) Hold|Weighted Carries(?: Medley)?|Farmer Carr(?:y|ies)|Battle Rope|Wrestle-Outs|Sled Push|Sled Sprint|Sled Drag|Pro Agility(?: Drill)?|5-10-5(?: Shuttle)?|Cone Drill(?:\s*\(5-10-5\))?|Deceleration Drill|Lateral Shuffle(?: Sprint)?|T-Drill|Aerobic Finish|Tempo [Rr]un|Sprint Tempo Protocol|Bike Ladder)\b/

// Exercise names that are unambiguously mobility/warm-up/prehab work wherever
// they appear (exact match on the trimmed, lowercased name before the colon —
// not a substring match, so e.g. "Bird Dog Row" — a loaded accessory that
// merely shares two words with the "Bird Dog" stability drill — is never
// caught by this).
const MOBILITY_EXACT_EXEMPT = new Set([
  'dead bug', 'ab wheel', 'plank', 'pallof press', 'half kneeling cable press',
  'cable woodchop', 'copenhagen adductor', 'suitcase carry', 'bird dog',
  'glute bridge', 'glute bridge hold', 'single leg glute bridge',
  'ytw series', 'ytw shoulder series', 'band external rotation', 'band pull-aparts',
  'hip 90/90 hold', 'hip 90/90 stretch', 'hip 90/90 rotations', 'ankle circles',
  'ankle mobility circles', 'cat-cow', 'downward dog',
])

function isMobilityCoreExempt(name) {
  const n = name.toLowerCase().trim()
  if (MOBILITY_EXACT_EXEMPT.has(n)) return true
  return /stretch|mobility|foam roll/i.test(n)
}

const DELOAD_NOTE = 'Deload Week. Reduce load and focus on movement quality and recovery. This week is intentional.'

function isConditioningLine(line) {
  const stripped = line.replace(SUPERSET_MARKER_RE, '')
  return CONDITIONING_HEADER_RE.test(stripped) || CONDITIONING_EXERCISE_RE.test(stripped)
}

function isPlyoLine(line) {
  const colonIdx = line.indexOf(':')
  const name = colonIdx > 0 ? line.slice(0, colonIdx) : line
  return PLYO_KEYWORDS.test(name)
}

// Halves accessory set counts (4 -> 2, 3 -> 2) and cuts reps 20-30% (25%
// midpoint). Never called on lines the caller has already decided are exempt
// (mobility/core work, or anything without a plain "Name: SxR" shape — ramps,
// warm-up preambles, AMAP-only cues all pass through reduceAccessoryVolume
// unchanged since they don't match the patterns below).
function reduceAccessoryVolume(line) {
  // Baseball's dual-prescription format, e.g. "Power Clean: 2x2 warmup, 3x2
  // working" — the plain-SxR regex below only ever matches the first clause,
  // silently leaving the actual working sets (the part that matters) at full
  // volume. Reduce the set count on both clauses; reps stay as-is since these
  // are already low (2-3 reps) technical-lift prescriptions.
  const dual = line.match(/^(.*?):\s*(\d+)x(\d+)\s*warmup,\s*(\d+)x(\d+[a-zA-Z]*|AMAP)\s*working(.*)$/)
  if (dual) {
    const [, name, wSets, wReps, sSets, sReps, rest] = dual
    const newWSets = Math.max(1, Math.round(parseInt(wSets, 10) * 0.50))
    const newSSets = Math.max(1, Math.round(parseInt(sSets, 10) * 0.50))
    return `${name}: ${newWSets}x${wReps} warmup, ${newSSets}x${sReps} working${rest}`
  }

  const m = line.match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
  if (!m) return line
  const [, name, sets, reps, rest] = m

  const newSets = Math.max(1, Math.round(parseInt(sets, 10) * 0.50))
  let newReps = reps
  if (reps !== 'AMAP') {
    const repsNum  = parseInt(reps, 10)
    const suffix   = reps.replace(/^\d+/, '') // trailing unit glued to the number, e.g. "20m"
    newReps = `${Math.max(1, Math.round(repsNum * 0.75))}${suffix}`
  }
  return `${name}: ${newSets}x${newReps}${rest}`
}

// A handful of exercise names (Med Ball Rotational Throw, Cable Woodchop,
// etc.) are genuinely ambiguous — coreBlock() uses them as core/rotational-
// stability work, but some sports also prescribe the same movement as a
// standalone power accessory outside any core section. Rather than guess by
// name alone, track whether we're inside a "Core — ..." labeled block (which
// always runs until the next blank line in every session this file
// generates) and only exempt on that basis for anything not already covered
// by the unambiguous MOBILITY_EXACT_EXEMPT list above.
function applyDeloadVolumeReduction(description) {
  const rawLines = description.split('\n')
  let inCoreBlock = false
  const kept = []

  for (const line of rawLines) {
    const bareLine = line.replace(SUPERSET_MARKER_RE, '')
    // "Arm Care — ...:" / "Neck — ...:" / "Conditioning — ...:" get the
    // same exempt-block treatment as "Core — ...:" (see
    // organizeSessionDescription) — a standalone circuit finisher isn't
    // volume-waved or deload-reduced any more than the core block is.
    // Checked BEFORE the blanket conditioning/plyo-line removal below —
    // deliberately reordered from this function's own prior shape — so a
    // Conditioning finisher's own drill lines (which necessarily match
    // isConditioningLine/isPlyoLine by name, same as any other sprint/jump
    // drill) survive as the deliberately-authored, already phase-tapered
    // content the archetype puts there, instead of being stripped to
    // nothing the way a bare conditioning line elsewhere in a session
    // (outside any exempt header) still correctly is. Provably a no-op for
    // every existing Core/Arm Care/Neck block in the file today — none of
    // their own content matches either regex — so this reordering only
    // ever changes behavior for the new Conditioning block.
    if (/^(Core|Arm Care|Conditioning|Neck)\s*—/.test(bareLine)) {
      inCoreBlock = true
      kept.push(line)
      continue
    }
    if (line === '') {
      inCoreBlock = false
      kept.push(line)
      continue
    }
    if (inCoreBlock) {
      kept.push(line)
      continue
    }
    if (isConditioningLine(line) || isPlyoLine(line)) continue

    const colonIdx = bareLine.indexOf(':')
    const name = colonIdx > 0 ? bareLine.slice(0, colonIdx) : bareLine
    if (isMobilityCoreExempt(name)) {
      kept.push(line)
      continue
    }
    kept.push(reduceAccessoryVolume(line))
  }

  // Collapse any doubled-up blank lines left behind by removed blocks, and
  // drop a trailing blank line.
  const collapsed = []
  for (const line of kept) {
    if (line === '' && collapsed[collapsed.length - 1] === '') continue
    collapsed.push(line)
  }
  while (collapsed.length && collapsed[collapsed.length - 1] === '') collapsed.pop()

  return `${DELOAD_NOTE}\n\n${collapsed.join('\n')}`
}

function applyDeloadAdjustments(weeks) {
  if (weeks.length === 0) return weeks
  // Every phase ends in a deload (weeks 4, 8, 12, 16 in the standard 16-week /
  // 4-phase layout), not just the final week of the whole plan. A week counts
  // as a deload if it's the last week of the array (covers plans whose total
  // length isn't a multiple of 4, e.g. a truncated preview) OR its week number
  // lands on a phase boundary (week_number % 4 === 0).
  const lastWeekNumber = weeks[weeks.length - 1].week_number
  const isDeloadWeek = (weekNumber) => weekNumber === lastWeekNumber || weekNumber % 4 === 0

  return weeks.map(week => {
    if (!isDeloadWeek(week.week_number)) return week
    return {
      ...week,
      sessions: week.sessions.map(session => ({
        ...session,
        description: applyDeloadVolumeReduction(session.description),
      })),
    }
  })
}

// ─── Build human-readable title ───────────────────────────────────────────────

const SPORT_LABELS = {
  football: 'Football', basketball: 'Basketball', soccer: 'Soccer',
  baseball: 'Baseball', hockey: 'Hockey', wrestling: 'Wrestling',
  volleyball: 'Volleyball', track: 'Track & Field', cross_country: 'Cross Country',
  lacrosse: 'Lacrosse', swimming: 'Swimming',
  rugby: 'Rugby', tennis: 'Tennis', golf: 'Golf',
}

const POS_LABELS = {
  linemen: 'Linemen (OL/DL)', skill: 'Skill (WR/DB/RB)', hybrid: 'Hybrid (LB/TE/FB)', qb: 'QB',
  guards: 'Guards (PG/SG)', wings: 'Wings (SF/PF)', bigs: 'Bigs (C)',
  forwards: 'Forwards', defense: 'Defense', goalie: 'Goalie',
  sprint: 'Sprinters', throw: 'Throwers', jump: 'Jumpers',
  pitcher: 'Pitcher',
  backs: 'Backs',
  rugby_forwards: 'Forwards (Prop/Hooker/Lock/Flanker/No.8)', rugby_backs: 'Backs (SH/FH/Centre/Wing/FB)',
  goalkeeper: 'Goalkeeper', center_back: 'Center Back', fullback: 'Fullback',
  midfielder: 'Midfielder', winger: 'Winger', striker: 'Striker',
  tennis: 'All Players', golf: 'All Players',
}

function buildBlueprintTitle(sport, posId, goal) {
  const sportLabel = SPORT_LABELS[sport] || sport
  const posLabel   = POS_LABELS[posId]
  const goalSuffix = goal === 'muscle_gain' ? ' — Muscle Gain' : ''
  const posPart    = posLabel && posLabel !== sportLabel ? ` (${posLabel})` : ''
  return `${sportLabel}${posPart} — 16-Week Offseason${goalSuffix}`
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Given a survey_responses row, generate a full blueprint.
 * Returns { title, description, num_weeks, weeks } or null if sport unknown.
 */
function generateBlueprintForAthlete(survey) {
  const sport      = normalizeSport(survey.sport)
  const goal       = normalizeGoal(survey.primary_goal)
  const posId      = normalizePosition(sport || 'general', survey.position)
  const days       = parseInt(survey.time_per_week, 10) || 4
  const experience = normalizeExperience(survey.experience_level)

  let weeks

  if (sport === 'football')      weeks = generateFootballWeeks(posId, goal, days)
  else if (sport === 'basketball') weeks = generateBasketballWeeks(posId, goal, days)
  else if (sport === 'soccer')   weeks = generateSoccerWeeks(posId, goal, days)
  else if (sport === 'wrestling') weeks = generateWrestlingWeeks(posId, goal, days)
  else if (sport === 'volleyball') weeks = generateVolleyballWeeks(posId, goal, days)
  else if (sport === 'track')    weeks = generateTrackWeeks(posId, goal, days)
  else if (sport === 'cross_country') weeks = generateXCWeeks(posId, goal, days)
  else if (sport === 'lacrosse') weeks = generateLacrosseWeeks(posId, goal, days)
  else if (sport === 'swimming') weeks = generateSwimmingWeeks(posId, goal, days)
  else if (sport === 'baseball') {
    weeks = posId === 'pitcher'
      ? generatePitcherBaseballWeeks(goal, days)
      : generateBaseballWeeks(posId, goal, days)
  }
  else if (sport === 'hockey')   weeks = generateHockeyWeeks(posId, goal, days)
  else if (sport === 'rugby')    weeks = generateRugbyWeeks(posId, goal, days)
  else if (sport === 'tennis')   weeks = generateTennisWeeks(posId, goal, days)
  else if (sport === 'golf')     weeks = generateGolfWeeks(posId, goal, days)
  else                           weeks = generateGeneralWeeks(posId, goal, days)

  weeks = applySessionOrganization(weeks, SPORT_ACCESSORY_ROTATION[sport] || {}, resolveAccessoryCapKey(sport, posId, goal))
  weeks = applyAccessoryProgression(
    weeks,
    SPORT_ACCESSORY_ROTATION[sport] || {},
    SPORT_PHASE_ACCESSORY_ROTATION[resolvePhaseRotationKey(sport, posId)] || {}, // Change 4
  )
  weeks = applyExperienceAdjustments(weeks, experience)
  weeks = applyInjuryAdjustments(weeks, survey.injury_areas)
  weeks = applyDeloadAdjustments(weeks)

  const title = sport
    ? buildBlueprintTitle(sport, posId, goal)
    : `General Athletic Performance — 16-Week Offseason${goal === 'muscle_gain' ? ' — Muscle Gain' : ''}`

  const description = sport
    ? `Auto-generated 16-week offseason program for ${SPORT_LABELS[sport] || sport}. Customize sessions, adjust loading, or replace with a different blueprint at any time.`
    : `Auto-generated 16-week general athletic performance program. Customize sessions or replace with a sport-specific blueprint at any time.`

  return { title, description, num_weeks: 16, weeks }
}

// ─── Coach-facing template catalog (manual blueprint builder) ─────────────────
// This is the single source of truth for both auto-assign (generateBlueprintForAthlete
// above) and the coach's manual "build from template" tool. generateWeeks always
// calls the same safety-corrected generator functions defined in this file — there
// is no separate client-side copy of the exercise-selection logic.

const TEMPLATE_GOALS = [
  {
    id: 'standard',
    label: 'Standard Training',
    desc: 'Sport-specific power, speed, and strength per the full template design',
  },
  {
    id: 'muscle_gain',
    label: 'Muscle Gain',
    desc: 'Higher volume (8–12 reps), +1–2 sets, added isolation work, 65–78% loading',
  },
]

const SPORT_TEMPLATES = [
  {
    id: 'baseball',
    label: 'Baseball',
    daysPerWeekPicker: true,
    templateDescription: '16-week phase-based offseason program for baseball athletes. Phase 1 Foundation (70%) → Phase 2 Development (75%) → Phase 3 Strength (80%) → Phase 4 Peak Taper (70%, backs off from Phase 3\'s peak so the athlete enters the season fresh). Squat and Trap Bar Deadlift weights auto-calculate from logged maxes.',
    daysOptions: [
      { days: 3, desc: 'Full Body split (3 sessions)' },
      { days: 4, desc: 'Upper/Lower split (4 sessions)' },
      { days: 5, desc: 'Upper/Lower + Arm Care' },
      { days: 6, desc: 'Upper/Lower + Arm Care + Light Day' },
    ],
    positions: [
      { id: 'baseball', label: 'Position Player', sublabel: '16-Week Offseason', desc: 'Catcher, 1B, 2B, 3B, SS, Outfield, DH — 4-phase program. Squat and Trap Bar Deadlift weights auto-calculate from logged maxes.' },
      { id: 'pitcher',  label: 'Pitcher',          sublabel: '16-Week Offseason', desc: 'No overhead pressing. Enhanced hip stability and arm care every session. 4-phase program. Squat and Trap Bar Deadlift weights auto-calculate from logged maxes.' },
    ],
    phases: [
      { num: 1, label: 'Foundation',  pct: '70%', weeks: '1–4'   },
      { num: 2, label: 'Development', pct: '75%', weeks: '5–8'   },
      { num: 3, label: 'Strength',    pct: '80%', weeks: '9–12'  },
      { num: 4, label: 'Peak Taper',  pct: '70%', weeks: '13–16' },
    ],
    generateWeeks: (posId, goal, daysPerWeek) =>
      posId === 'pitcher'
        ? generatePitcherBaseballWeeks(goal, daysPerWeek)
        : generateBaseballWeeks(posId, goal, daysPerWeek),
  },
  {
    id: 'softball',
    label: 'Softball',
    daysPerWeekPicker: true,
    // Softball uses the same core programming as baseball (no dedicated softball
    // session set exists server-side) — this keeps the manual builder consistent
    // with what auto-assign already does for softball survey responses.
    templateDescription: '16-week phase-based offseason program for softball athletes, built on the same core programming as our baseball template. Phase 1 Foundation (70%) → Phase 2 Development (75%) → Phase 3 Strength (80%) → Phase 4 Peak Taper (70%, backs off from Phase 3\'s peak so the athlete enters the season fresh). Squat and Trap Bar Deadlift weights auto-calculate from logged maxes.',
    daysOptions: [
      { days: 3, desc: 'Full Body split (3 sessions)' },
      { days: 4, desc: 'Upper/Lower split (4 sessions)' },
      { days: 5, desc: 'Upper/Lower + Arm Care' },
      { days: 6, desc: 'Upper/Lower + Arm Care + Light Day' },
    ],
    positions: [
      { id: 'softball', label: 'Softball', sublabel: '16-Week Offseason', desc: '4-phase program built for softball athletes. Squat and Trap Bar Deadlift weights auto-calculate from logged maxes.' },
    ],
    phases: [
      { num: 1, label: 'Foundation',  pct: '70%', weeks: '1–4'   },
      { num: 2, label: 'Development', pct: '75%', weeks: '5–8'   },
      { num: 3, label: 'Strength',    pct: '80%', weeks: '9–12'  },
      { num: 4, label: 'Peak Taper',  pct: '70%', weeks: '13–16' },
    ],
    generateWeeks: (posId, goal, daysPerWeek) => generateBaseballWeeks(posId, goal, daysPerWeek),
  },
  {
    id: 'football',
    label: 'Football',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Upper + Lower (2 sessions)' },
      { days: 3, desc: 'Upper + Lower + Power (3 sessions)' },
      { days: 4, desc: 'Full 4-day split (recommended)' },
      { days: 5, desc: '4-day + Speed & Conditioning' },
      { days: 6, desc: '5-day + Active Recovery' },
    ],
    positions: [
      { id: 'linemen', label: 'Linemen',  sublabel: 'OL / DL',         desc: 'Maximum strength and size' },
      { id: 'skill',   label: 'Skill',    sublabel: 'WR / DB / RB',    desc: 'Speed, explosion, change of direction' },
      { id: 'hybrid',  label: 'Hybrid',   sublabel: 'LB / TE / FB',    desc: 'Strength plus athleticism' },
      { id: 'qb',      label: 'QB',       sublabel: 'Quarterback',     desc: 'Rotational power, arm health, lower body' },
    ],
    // Applies to Skill/Hybrid/QB (all 3 share FB_PHASES). Linemen runs a
    // fully separate, bespoke engine (Accumulation/Intensification/Peak/
    // Peak, its own rep schemes) not represented by this table at all.
    phases: [
      { num: 1, label: 'Accumulation',   pct: '65–75%', weeks: '1–4'   },
      { num: 2, label: 'Strength Build', pct: '75–82%', weeks: '5–8'   },
      { num: 3, label: 'Peak Strength',  pct: '82–88%', weeks: '9–12'  },
      { num: 4, label: 'Peak Taper',     pct: '65–75%', weeks: '13–16' },
    ],
    generateWeeks: generateFootballWeeks,
  },
  {
    id: 'basketball',
    label: 'Basketball',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper (2 sessions)' },
      { days: 3, desc: 'Lower + Upper + Explosion (3 sessions)' },
      { days: 4, desc: 'Full 4-day split (recommended)' },
      { days: 5, desc: '4-day + Court Conditioning' },
      { days: 6, desc: '5-day + Active Recovery' },
    ],
    positions: [
      { id: 'guards', label: 'Guards',           sublabel: 'PG / SG', desc: 'Lateral quickness, first-step acceleration, defensive slide, change of direction' },
      { id: 'wings',  label: 'Wings / Forwards', sublabel: 'SF / PF', desc: 'Vertical power, multi-directional movement, approach jumps, reactive strength' },
      { id: 'bigs',   label: 'Bigs',             sublabel: 'C',       desc: 'Force production, jumping, contact durability, post conditioning' },
    ],
    phases: [
      { num: 1, label: 'Foundation',       pct: '65–72%', weeks: '1–4'   },
      { num: 2, label: 'Strength',         pct: '72–80%', weeks: '5–8'   },
      { num: 3, label: 'Power Conversion', pct: '78–85%', weeks: '9–12'  },
      { num: 4, label: 'Peak Taper',       pct: '65–72%', weeks: '13–16' },
    ],
    generateWeeks: generateBasketballWeeks,
  },
  {
    id: 'soccer',
    label: 'Soccer',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper (2 sessions)' },
      { days: 3, desc: 'Lower + Upper + Full Body Power (3 sessions)' },
      { days: 4, desc: 'Full 4-day split (recommended)' },
      { days: 5, desc: '4-day + Speed & COD' },
      { days: 6, desc: '5-day + Active Recovery' },
    ],
    positions: [
      { id: 'goalkeeper',  label: 'Goalkeeper',  sublabel: 'GK',        desc: 'Explosive lateral power, butterfly mechanics, hip mobility, reactive lateral movement, shoulder durability' },
      { id: 'center_back', label: 'Center Back', sublabel: 'CB',        desc: 'Max strength, aerial ability, deceleration, physical contact, neck work' },
      { id: 'fullback',    label: 'Fullback',    sublabel: 'LB / RB',   desc: 'Repeat sprint ability, acceleration, hip mobility, lateral speed' },
      { id: 'midfielder',  label: 'Midfielder',  sublabel: 'CM / DM / AM', desc: 'Aerobic capacity, change of direction, high work capacity, all-around conditioning' },
      { id: 'winger',      label: 'Winger',      sublabel: 'LW / RW',   desc: 'Top-end speed, reactive acceleration, elasticity, game-pace sprint conditioning' },
      { id: 'striker',     label: 'Striker',     sublabel: 'ST / CF',   desc: 'Explosive power, jump height, shot power, approach jumps, game-speed conditioning' },
    ],
    phases: [
      { num: 1, label: 'Foundation',     pct: '65–72%', weeks: '1–4'   },
      { num: 2, label: 'Strength',       pct: '72–80%', weeks: '5–8'   },
      { num: 3, label: 'Power-Strength', pct: '78–85%', weeks: '9–12'  },
      { num: 4, label: 'Peak Taper',     pct: '65–72%', weeks: '13–16' },
    ],
    generateWeeks: generateSoccerWeeks,
  },
  {
    id: 'hockey',
    label: 'Hockey',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper (2 sessions)' },
      { days: 3, desc: 'Lower + Upper + Explosion (3 sessions)' },
      { days: 4, desc: 'Full 4-day split (recommended)' },
      { days: 5, desc: '4-day + Lateral Conditioning' },
      { days: 6, desc: '5-day + Active Recovery & Hip Care' },
    ],
    positions: [
      { id: 'forwards', label: 'Forwards', sublabel: 'F', desc: 'First-step explosiveness, acceleration, puck battle strength, lower body power, sled sprints, split squat jumps' },
      { id: 'defense',  label: 'Defense',  sublabel: 'D', desc: 'Lateral mobility, crossover strength, backward skating mechanics, hip mobility, Cossack squats, Copenhagen planks, lateral sled drags' },
      { id: 'goalie',   label: 'Goalie',   sublabel: 'G', desc: 'Butterfly recovery mechanics, lateral explosive power, hip mobility, reactive lateral movement, shoulder protection' },
    ],
    phases: [
      { num: 1, label: 'Foundation',  pct: '65–73%', weeks: '1–4'   },
      { num: 2, label: 'Strength',    pct: '73–80%', weeks: '5–8'   },
      { num: 3, label: 'Power Build', pct: '78–85%', weeks: '9–12'  },
      { num: 4, label: 'Peak',        pct: '82–88%', weeks: '13–16' },
    ],
    generateWeeks: generateHockeyWeeks,
  },
  {
    id: 'rugby',
    label: 'Rugby',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper (2 sessions)' },
      { days: 3, desc: 'Lower + Upper + Explosion (3 sessions)' },
      { days: 4, desc: 'Full 4-day split (recommended)' },
      { days: 5, desc: '4-day + Power Conditioning' },
      { days: 6, desc: '5-day + Active Recovery' },
    ],
    positions: [
      { id: 'forwards', label: 'Forwards', sublabel: 'Prop · Hooker · Lock · Flanker · No.8', desc: 'Maximum strength, contact durability, scrummaging power. Neck work, sled, and farmer carries emphasis.' },
      { id: 'backs',    label: 'Backs',    sublabel: 'SH · FH · Centre · Wing · Fullback',    desc: 'Speed, explosion, and agility. Sprint work replaces sled on Days 1 & 3. Lateral bounds added to Day 3.' },
    ],
    phases: [
      { num: 1, label: 'Accumulation',   pct: '65–75%', weeks: '1–4'   },
      { num: 2, label: 'Strength Build', pct: '75–82%', weeks: '5–8'   },
      { num: 3, label: 'Peak Strength',  pct: '82–88%', weeks: '9–12'  },
      { num: 4, label: 'Maximum Output', pct: '88–93%', weeks: '13–16' },
    ],
    generateWeeks: generateRugbyWeeks,
  },
  {
    id: 'tennis',
    label: 'Tennis',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper (2 sessions)' },
      { days: 3, desc: 'Lower + Upper + Explosion (3 sessions)' },
      { days: 4, desc: 'Full 4-day split (recommended)' },
      { days: 5, desc: '4-day + Lateral Movement & Wrist Health' },
      { days: 6, desc: '5-day + Active Recovery & Shoulder Care' },
    ],
    positions: [
      { id: 'tennis', label: 'All Players', sublabel: 'Singles & Doubles', desc: 'Lateral power, rotational strength, shoulder health, wrist and forearm conditioning. 4-day program built around court demands.' },
    ],
    phases: [
      { num: 1, label: 'Foundation',  pct: '65–72%', weeks: '1–4'   },
      { num: 2, label: 'Strength',    pct: '72–80%', weeks: '5–8'   },
      { num: 3, label: 'Power Build', pct: '78–85%', weeks: '9–12'  },
      { num: 4, label: 'Peak',        pct: '82–88%', weeks: '13–16' },
    ],
    generateWeeks: generateTennisWeeks,
  },
  {
    id: 'golf',
    label: 'Golf',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper/Rotational (2 sessions)' },
      { days: 3, desc: 'Full 3-day split (recommended)' },
      { days: 4, desc: '3-day + Mobility & Rotation Maintenance' },
      { days: 5, desc: '4-day + Rotational Power Peak' },
      { days: 6, desc: '5-day + Active Recovery & Mobility' },
    ],
    positions: [
      { id: 'golf', label: 'All Players', sublabel: 'Golfers of all levels', desc: 'Ground force power, rotational strength, landmine work, anti-rotation core. Program designed around swing mechanics.' },
    ],
    phases: [
      { num: 1, label: 'Foundation',     pct: '60–70%', weeks: '1–4'   },
      { num: 2, label: 'Strength Build', pct: '70–78%', weeks: '5–8'   },
      { num: 3, label: 'Power Build',    pct: '75–82%', weeks: '9–12'  },
      { num: 4, label: 'Peak',           pct: '80–85%', weeks: '13–16' },
    ],
    generateWeeks: generateGolfWeeks,
  },
  {
    id: 'wrestling',
    label: 'Wrestling',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper (2 sessions)' },
      { days: 3, desc: 'Lower + Upper + Explosive Power (3 sessions)' },
      { days: 4, desc: 'Full 4-day split (recommended)' },
      { days: 5, desc: '4-day + Mat Conditioning' },
      { days: 6, desc: '5-day + Recovery & Maintenance' },
    ],
    positions: [
      { id: 'wrestling', label: 'Wrestling', sublabel: 'All weight classes', desc: 'Maximal strength, isometric holds, weight class management' },
    ],
    phases: [
      { num: 1, label: 'Accumulation',   pct: '70–80%', weeks: '1–4'   },
      { num: 2, label: 'Strength Build', pct: '80–87%', weeks: '5–8'   },
      { num: 3, label: 'Peak Strength',  pct: '87–92%', weeks: '9–12'  },
      { num: 4, label: 'Max Strength',   pct: '88–95%', weeks: '13–16' },
    ],
    generateWeeks: generateWrestlingWeeks,
  },
  {
    id: 'volleyball',
    label: 'Volleyball',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper (2 sessions)' },
      { days: 3, desc: 'Full 3-day split (recommended)' },
      { days: 4, desc: '3-day + Shoulder Health & Conditioning' },
      { days: 5, desc: '4-day + Jump Training & Court Work' },
      { days: 6, desc: '5-day + Active Recovery' },
    ],
    positions: [
      { id: 'volleyball', label: 'Volleyball', sublabel: 'All positions', desc: 'Vertical jump, shoulder durability, elastic power' },
    ],
    phases: [
      { num: 1, label: 'Foundation',       pct: '65–72%', weeks: '1–4'   },
      { num: 2, label: 'Strength',         pct: '72–80%', weeks: '5–8'   },
      { num: 3, label: 'Power Conversion', pct: '78–85%', weeks: '9–12'  },
      { num: 4, label: 'Peak',             pct: '80–88%', weeks: '13–16' },
    ],
    generateWeeks: generateVolleyballWeeks,
  },
  {
    id: 'track',
    label: 'Track & Field',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper (2 sessions)' },
      { days: 3, desc: 'Lower + Upper + Explosion (3 sessions)' },
      { days: 4, desc: 'Full 4-day split (recommended)' },
      { days: 5, desc: '4-day + Speed/Power/Jump Work' },
      { days: 6, desc: '5-day + Active Recovery' },
    ],
    positions: [
      { id: 'sprint', label: 'Sprinters', sublabel: '100m – 400m',            desc: 'Power, posterior chain, elastic speed' },
      { id: 'throw',  label: 'Throwers',  sublabel: 'Shot · Discus · Javelin', desc: 'Maximum strength plus rotational power' },
      { id: 'jump',   label: 'Jumpers',   sublabel: 'HJ · LJ · TJ',            desc: 'Single leg power and elastic strength' },
    ],
    phases: [
      { num: 1, label: 'Foundation',  pct: '65–73%', weeks: '1–4'   },
      { num: 2, label: 'Strength',    pct: '73–80%', weeks: '5–8'   },
      { num: 3, label: 'Power Blend', pct: '78–85%', weeks: '9–12'  },
      { num: 4, label: 'Peak',        pct: '82–88%', weeks: '13–16' },
    ],
    generateWeeks: generateTrackWeeks,
  },
  {
    id: 'cross_country',
    label: 'Cross Country',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Full 2-day split (recommended for high mileage)' },
      { days: 3, desc: '2-day + Injury Prevention & Prehab' },
    ],
    positions: [
      { id: 'cross_country', label: 'Cross Country', sublabel: 'All distances', desc: 'Injury prevention, aerobic support, minimal lifting fatigue' },
    ],
    phases: [
      { num: 1, label: 'Injury Prevention', pct: '65–70%', weeks: '1–4'   },
      { num: 2, label: 'Base Strength',     pct: '65–70%', weeks: '5–8'   },
      { num: 3, label: 'Maintenance',       pct: '65–70%', weeks: '9–12'  },
      { num: 4, label: 'Pre-Season Taper',  pct: '60–65%', weeks: '13–16' },
    ],
    generateWeeks: generateXCWeeks,
  },
  {
    id: 'lacrosse',
    label: 'Lacrosse',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Lower + Upper (2 sessions)' },
      { days: 3, desc: 'Lower + Upper + Explosion (3 sessions)' },
      { days: 4, desc: 'Full 4-day split (recommended)' },
      { days: 5, desc: '4-day + Lacrosse Conditioning' },
      { days: 6, desc: '5-day + Active Recovery' },
    ],
    positions: [
      { id: 'lacrosse', label: 'Lacrosse', sublabel: 'All positions', desc: 'Power, conditioning, COD — full sport-specific program' },
    ],
    phases: [
      { num: 1, label: 'Foundation',     pct: '65–73%', weeks: '1–4'   },
      { num: 2, label: 'Strength Build', pct: '73–80%', weeks: '5–8'   },
      { num: 3, label: 'Power Blend',    pct: '78–85%', weeks: '9–12'  },
      { num: 4, label: 'Peak',           pct: '82–88%', weeks: '13–16' },
    ],
    generateWeeks: generateLacrosseWeeks,
  },
  {
    id: 'swimming',
    label: 'Swimming',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 2, desc: 'Upper + Core (2 sessions)' },
      { days: 3, desc: 'Full 3-day dryland split (recommended)' },
      { days: 4, desc: '3-day + Core & Anti-Rotation' },
      { days: 5, desc: '4-day + Explosive Upper & Shoulder Health' },
      { days: 6, desc: '5-day + Active Recovery' },
    ],
    positions: [
      { id: 'swimming', label: 'Swimming', sublabel: 'Dryland only', desc: 'Shoulder stability, core strength, lat development' },
    ],
    phases: [
      { num: 1, label: 'Base Dryland',     pct: 'Bodyweight', weeks: '1–4'   },
      { num: 2, label: 'Build Dryland',    pct: 'Bodyweight', weeks: '5–8'   },
      { num: 3, label: 'Strength Dryland', pct: 'Bodyweight', weeks: '9–12'  },
      { num: 4, label: 'Peak Dryland',     pct: 'Bodyweight', weeks: '13–16' },
    ],
    generateWeeks: generateSwimmingWeeks,
  },
]

module.exports = { generateBlueprintForAthlete, SPORT_TEMPLATES, TEMPLATE_GOALS, applyDeloadAdjustments, applyAccessoryProgression, applySessionOrganization, superset, SUPERSET_MARKER_RE, SPORT_ACCESSORY_ROTATION, SPORT_MAX_ACCESSORIES, resolveAccessoryCapKey, SPORT_PHASE_ACCESSORY_ROTATION, resolvePhaseRotationKey }
