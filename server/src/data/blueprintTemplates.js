// ─── Server-side blueprint template generator (CommonJS) ──────────────────────
// Single source of truth for both auto-assign (generateBlueprintForAthlete) and
// the coach's manual "build from template" tool (SPORT_TEMPLATES, below).

const finisherEngine = require('./finisherEngine')

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

// Change 4 — phase-keyed accessory rotation. Resolves a name/volume by
// PHASE (constant across all non-deload weeks of that phase) instead of the
// existing wip-based ACCESSORY_ROTATION/ACCESSORY_VOLUME_WAVE (which still
// runs unchanged for every sport, and for every accessory NOT listed in a
// sport's phase table below — see applyAccessoryProgression). Every phase
// table below reuses names already vetted as safe substitutes by the
// existing wip-based ACCESSORY_ROTATION/BASEBALL_ACCESSORY_ROTATION tables
// (no new exercise names invented). Shape per key: phase 1 (Foundation) and
// phase 4 (Peak) both show the base/anchor name — Foundation at the highest
// volume (work-capacity), Peak at the lowest (stripped down); phase 2
// (Development) and phase 3 (Strength/Power) show the already-vetted
// alternate names, treated respectively as the "heavier/more focused" and
// "explosive/specific/more unilateral" slots.
const PHASE_ACCESSORY_MULT = { 1: 1.3, 2: 1.0, 3: 0.85, 4: 0.5 }

// A phase entry is normally a plain name string (unchanged every week of
// that phase). It may instead be a function `(weekNumber) => name` for a
// phase that needs week-to-week texture within itself — e.g. a low-
// frequency 3rd rotation option that shouldn't show every week of that
// phase. weekNumber is always a "normal" (non-deload) week here —
// applyAccessoryProgression never calls this for a wip-4 week at all.
function resolvePhaseAccessory(name, phaseNum, phaseRotation, weekNumber) {
  const entry = phaseRotation[name.toLowerCase().trim()]
  if (!entry) return null
  const raw = entry[phaseNum]
  const resolved = typeof raw === 'function' ? raw(weekNumber) : raw
  return { name: resolved || name, mult: PHASE_ACCESSORY_MULT[phaseNum] }
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

// ─── Collision/Max-Strength archetype core (feat/archetype-collision) ─────
// Extracted from Football Linemen, the archetype's original, benchmark
// implementation (see the Blueprint Architecture Audit). This section is
// the reusable CORE — the rep-scheme math, the autoregulated Oly-lift
// prescription, the phase/deload cadence, and the day-count-aware assembly
// logic (generateCollisionArchetypeWeeks below) — shared by every sport
// that joins this archetype. Linemen's own day content (linemenDay1Lower
// etc., further below) is completely UNCHANGED by this extraction; it now
// just calls these shared functions by their new name instead of owning a
// private copy, and is assembled by the shared orchestrator instead of its
// own bespoke one. Wrestling/Rugby Forwards/Hockey Forwards each author
// their OWN day-content functions against this same core — see their own
// sections further below.
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
//   4. Day-count-aware, hand-designed layouts (3/4/5/6 days) rather than a
//      generic slice-to-N fallback — see generateCollisionArchetypeWeeks.

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

function collisionMainLiftScheme(phaseNum, deload) {
  if (deload) return COLLISION_MAIN_LIFT_SCHEMES.deload
  if (phaseNum <= 1) return COLLISION_MAIN_LIFT_SCHEMES.accumulation
  if (phaseNum === 2) return COLLISION_MAIN_LIFT_SCHEMES.intensification
  return COLLISION_MAIN_LIFT_SCHEMES.peak // Phase 3 AND 4 hold at Peak
}

// Returns just the ramp text (no exercise name) — e.g.
// "40%×10, 50%×8, 60%×6, 70%×5, 80%×5-8" for an Accumulation-phase week, or
// "40%×10, 70%×5" (fixed, no open window) for a deload week.
function buildCollisionMainLiftRamp(phaseNum, deload) {
  const s = collisionMainLiftScheme(phaseNum, deload)
  const steps = s.pcts.slice(0, -1).map((p, i) => `${p}%×${s.reps[i]}`)
  const topPct = s.pcts[s.pcts.length - 1]
  return `${steps.join(', ')}, ${topPct}%×${s.top}`
}

// Olympic-lift autoregulated prescription — "start light and build," never a
// forced percentage. Rep scheme descends by phase: Accumulation 5x3,
// Intensification down to heavy doubles (3,3,2,2), Peak heavy singles off a
// triple (3,2,2,1,1), deload 3x3 lighter (no build).
function collisionOlyScheme(phaseNum, deload) {
  // Deliberately NOT written as a leading "3x3" — every branch here is
  // prose specifically so it never matches the shared "Name: NxR" accessory
  // shape (isAccessoryLine's regex requires digits immediately after the
  // colon). That keeps every Oly-lift line naturally exempt from the
  // accessory-rotation/volume-wave/deload-reduction passes, which is the
  // correct outcome for an autoregulated lift — but it means the number
  // can't lead the string, or reduceAccessoryVolume would still halve it
  // out from under this already-deloaded prescription.
  if (deload) return 'lighter, no build — 3x3'
  if (phaseNum <= 1) return 'build to a top set of 5x3 — start light and build'
  if (phaseNum === 2) return 'build to heavy doubles — 3,3,2,2, start light and build'
  return 'build to a heavy single off a triple — 3,2,2,1,1, start light and build'
}

function collisionPhaseInfo(weekNumber) {
  const phaseNum = Math.min(4, Math.floor((weekNumber - 1) / 4) + 1)
  const wip = ((weekNumber - 1) % 4) + 1
  const deload = wip === 4
  const labels = ['Accumulation', 'Intensification', 'Peak', 'Peak']
  return { week: weekNumber, phaseNum, phaseLabel: labels[phaseNum - 1], wip, deload }
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

// Single entry point for every Collision-archetype sport's day-count
// handling. `dayFns` supplies the sport's own content:
//   anchor4Day(info) -> [4 sessions]   (required — the source-faithful anchor)
//   threeDay(info)   -> [3 sessions]   (required — hand-consolidated, NOT a
//                                       slice of the anchor; every anchor
//                                       movement still appears somewhere)
//   day5(info)       -> session        (5-day: anchor + this)
//   lowerC(info)     -> session        (6-day: relabeled anchor + this)
//   upperC(info)     -> session        (6-day: relabeled anchor + this)
//   sixDayLabels     -> string[4]      (defaults to Lower A/Upper A/Lower B/Upper B)
// daysPerWeek < 3 falls back to the first 2 days of the 4-day anchor (no
// dedicated layout for 2 days — same "slice the anchor" fallback every
// other sport already uses for its own low day-count options).
function generateCollisionArchetypeWeeks(dayFns, daysPerWeek = 4) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = collisionPhaseInfo(w)
    let sessions
    if (daysPerWeek <= 2) {
      sessions = dayFns.anchor4Day(info).slice(0, 2)
    } else if (daysPerWeek === 3) {
      sessions = dayFns.threeDay(info)
    } else if (daysPerWeek === 4) {
      sessions = dayFns.anchor4Day(info)
    } else if (daysPerWeek === 5) {
      sessions = [...dayFns.anchor4Day(info), dayFns.day5(info)]
    } else {
      sessions = [
        ...relabelDays(dayFns.anchor4Day(info), dayFns.sixDayLabels || ['Lower A', 'Upper A', 'Lower B', 'Upper B']),
        dayFns.lowerC(info),
        dayFns.upperC(info),
      ]
    }
    // The main-lift scheme's own top percentage (80/85/90, or 70 on a
    // deload) as the one representative number for the week — every main
    // strength lift in a given phase shares the same top %, unlike the
    // open rep WINDOW on that top set, which is genuinely different per
    // lift-scheme and isn't a single scalar worth summarizing here.
    const topScheme = collisionMainLiftScheme(info.phaseNum, info.deload)
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

// ─── Football — Linemen (standard goal only; see fbLinemenMGSess below for
// the muscle-gain variant, which is untouched by this rebuild) ─────────────
// Adapted from a real D1 4-day upper/lower linemen program — the 4-day
// layout (linemenAnchor4Day) is the source-faithful anchor; 3/5/6-day layouts
// keep that same core with additional movements to fill the extra frequency,
// per the program design. This is the archetype's reference implementation —
// see generateLinemenWeeks below, which now just plugs these day functions
// into the shared generateCollisionArchetypeWeeks orchestrator.

const LINEMEN_WU_LOWER = 'Empty BB Warm-Up Complex: RDL x5 · Hang Clean x5 · Front Squat x5 · Back Squat x5\n\n'
const LINEMEN_WU_UPPER = 'Upper Body Warm-Up Series: Prone Swimmers x5 · Push-Up to Pike x5 · Band Pull-Aparts x20\n\n'

// AMRAP Pull-Up special protocol (kept exactly, every week — this is a fixed
// live-testing protocol, not something that progresses by phase). Set 1 is
// AMRAP; the athlete looks up their own result on this chart for the
// remaining work sets. Neutral grip.
const LINEMEN_AMRAP_PULLUP =
  'Neutral-Grip Pull-Ups: Set 1 = AMRAP (record reps), then 5 work sets per your Set-1 result — ' +
  '1-5 reps→5x1 · 6-10→5x2 · 11-15→5x3 · 16-20→5x4 · 21+→5x5'

// ── 4-day anchor (source-faithful) — reused verbatim by 5-day (+Day 5) and
// 6-day (relabeled Lower A/Upper A/Lower B/Upper B, +Lower C/Upper C) ──────

function linemenDay1Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 1', focus: 'Lower Power',
    description: `${LINEMEN_WU_LOWER}Power Clean: ${collisionOlyScheme(ph, dl)} (from floor, catch quarter squat)\n` +
      `Front Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
      `Barbell RDL: 3x8\nGoblet Lateral Lunge: 3x4 each leg\nPlate Overhead Sit-Ups: 2x8-10\nDouble Leg Calf Raise: 2x10\n${COLLISION_NECK}\n\n${collisionFinisher(LINEMEN_FINISHERS, 0, 4, info)}`,
  }
}

function linemenDay2Upper(info) {
  const { phaseNum: ph, deload: dl } = info
  // Standing BB OHP is this day's ONLY pressing lift (no separate bench
  // elsewhere in the session), so it gets the same wave-loaded, open-rep-
  // window main-lift treatment as Front/Back Squat and Close Grip Bench —
  // it must render in the main-lift slot right after the power opener, not
  // read like just another accessory. Contrast with the 3-day merged upper
  // day below, where Close Grip Bench is already that day's wave-loaded
  // main and OHP stays a secondary "10/8/6/6 building" press instead.
  return {
    day: 'Day 2', focus: 'Upper Strength',
    description: `${LINEMEN_WU_UPPER}Single Arm DB Split Jerk: ${collisionOlyScheme(ph, dl)}, each arm\n` +
      `Standing BB OHP: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `${LINEMEN_AMRAP_PULLUP}\nSingle Arm DB Bench: 3x10 each arm\nInverted BB Row: 2x5 + 1 AMRAP\n${COLLISION_NECK}\n\n${collisionFinisher(LINEMEN_FINISHERS, 1, 4, info)}`,
  }
}

function linemenDay3Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 3', focus: 'Lower Strength',
    description: `${LINEMEN_WU_LOWER}Hang Clean Above the Knee: ${collisionOlyScheme(ph, dl)} (start at hip crease, hinge to above kneecaps, explode)\n` +
      `Back Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
      `Single Leg RDL: 3x8 each leg (2 DB)\nDB Step-Ups: 2x6 each leg (box below knee)\nDB Suitcase Carries: 2x20 yds each side\nSingle Leg Calf Raise: 2x10 each leg\n${COLLISION_NECK}\n\n${collisionFinisher(LINEMEN_FINISHERS, 2, 4, info)}`,
  }
}

function linemenDay4Upper(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 4', focus: 'Upper Power',
    description: `${LINEMEN_WU_UPPER}BB Split Jerk: ${collisionOlyScheme(ph, dl)}\n` +
      `Close Grip Bench Press: ${buildCollisionMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
      `Bent Over BB Row: 3x10\nSeated Single Arm DB Overhead Press: 3x10 each arm\nSeated Cable Lat Pulldown: 3x12 (underhand grip)\n${COLLISION_NECK}\n\n${collisionFinisher(LINEMEN_FINISHERS, 3, 4, info)}`,
  }
}

function linemenAnchor4Day(info) {
  return [linemenDay1Lower(info), linemenDay2Upper(info), linemenDay3Lower(info), linemenDay4Upper(info)]
}

// ── 3-day (card core consolidated — every anchor movement still appears
// somewhere across the week, just regrouped into 3 sessions) ──────────────

function linemen3Day(info) {
  const { phaseNum: ph, deload: dl } = info
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `${LINEMEN_WU_LOWER}Power Clean: ${collisionOlyScheme(ph, dl)} (from floor, catch quarter squat)\n` +
        `Back Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
        `Barbell RDL: 3x8\nGoblet Lateral Lunge: 3x4 each leg\nPlate Overhead Sit-Ups: 2x8-10\nDouble Leg Calf Raise: 2x10\n${COLLISION_NECK}\n\n${collisionFinisher(LINEMEN_FINISHERS, 0, 3, info)}` },
    { day: 'Day 2', focus: 'Upper (Full)',
      description: `${LINEMEN_WU_UPPER}BB Split Jerk: ${collisionOlyScheme(ph, dl)}\n` +
        `Close Grip Bench Press: ${buildCollisionMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
        `${LINEMEN_AMRAP_PULLUP}\nStanding BB OHP: 10/8/6/6 (building)\nBent Over BB Row: 3x10\n${COLLISION_NECK}\n\n${collisionFinisher(LINEMEN_FINISHERS, 1, 3, info)}` },
    { day: 'Day 3', focus: 'Lower Strength',
      description: `${LINEMEN_WU_LOWER}Hang Clean Above the Knee: ${collisionOlyScheme(ph, dl)} (start at hip crease, hinge to above kneecaps, explode)\n` +
        `Front Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
        `Single Leg RDL: 3x8 each leg (2 DB)\nDB Step-Ups: 2x6 each leg (box below knee)\nDB Suitcase Carries: 2x20 yds each side\nSingle Leg Calf Raise: 2x10 each leg\n${COLLISION_NECK}\n\n${collisionFinisher(LINEMEN_FINISHERS, 2, 3, info)}` },
  ]
}

// ── 5-day (4-day anchor + Day 5: power/athleticism/armor) ─────────────────

function linemenDay5(info) {
  return {
    day: 'Day 5', focus: 'Power, Athleticism & Armor',
    description: 'Trap Bar Jump: 4x3 (cap 155 lbs)\nBox Jumps: 3x3\nBroad Jumps: 3x3\n' +
      'Sled Push: 4x20 yds (or Prowler Push; sub Heavy Farmer Carries if unavailable)\n' +
      'Loaded Carry Mix: 3 rounds (farmer + suitcase, alternating)\n' +
      `${COLLISION_NECK_DEDICATED}\nGrip Work: 2 sets`,
  }
}

// ── 6-day (4-day anchor relabeled Lower A/Upper A/Lower B/Upper B, +
// Lower C: posterior chain/athletic, + Upper C: hypertrophy/armor) ────────

function linemenLowerC(info) {
  const { phaseNum: ph, deload: dl } = info
  const power = weeklyVariant(info.week, 'Trap Bar Jump: 4x3 (cap 155 lbs)', `Clean Pull: ${collisionOlyScheme(ph, dl)}`)
  return {
    day: 'Lower C', focus: 'Lower — Posterior Chain & Athletic',
    description: `${power}\nTrap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Bulgarian Split Squat: 3x8 each leg\nHip Thrust: 3x10\nFarmer Carries: 3x30 yds\n${COLLISION_NECK}`,
  }
}

function linemenUpperC(info) {
  const press = weeklyVariant(info.week, 'Incline DB Press: 3x10', 'Weighted Dips: 3x10')
  return {
    day: 'Upper C', focus: 'Upper — Hypertrophy & Armor',
    description: `${press}\nChest Supported Row: 3x12\nLateral Raise: 3x15\nFace Pulls: 3x15\n` +
      `${superset(1, ['Bicep Curls: 3x12', 'Tricep Pushdowns: 3x12']).join('\n')}\n${COLLISION_NECK}`,
  }
}

function relabelDays(sessions, labels) {
  return sessions.map((s, i) => ({ ...s, day: labels[i] || s.day }))
}

// Single entry point for linemen — now just plugs its own day-content
// functions into the shared archetype orchestrator (generateCollisionArchetypeWeeks
// above). The day functions themselves, and everything they produce, are
// unchanged from before this extraction.
function generateLinemenWeeks(daysPerWeek = 4) {
  return generateCollisionArchetypeWeeks({
    anchor4Day: linemenAnchor4Day,
    threeDay: linemen3Day,
    day5: linemenDay5,
    lowerC: linemenLowerC,
    upperC: linemenUpperC,
  }, daysPerWeek)
}

function fbLinemenMGSess(info) {
  const q = info.pct
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift, added Bulgarian for volume
    { day: 'Day 1', focus: 'Lower Power — Hypertrophy',
      description: `${WU_LOWER}Power Clean from floor: 4x3\nBack Squat: 6x8-10 @ ${q}\nBulgarian Split Squat: 3x10 each leg\nLeg Curl: 3x12\nDouble Leg Calf Raise: 4x15\nBicep Curls: 3x12\nTricep Extensions: 3x12` },
    { day: 'Day 2', focus: 'Upper Strength — Hypertrophy',
      description: `${WU_UPPER}Bench Press: 6x8-10 @ ${q}\nIncline DB Press: 5x10\nDB Fly: 3x12\nWeighted Pull-ups: 5x6\nBB Row: 5x10\nLateral Raises: 3x15\nFace Pulls: 4x15\nTricep Pushdowns: 4x12${NECK}` },
    { day: 'Day 3', focus: 'Lower Strength — Hypertrophy',
      description: `${WU_LOWER}Trap Bar Deadlift: 5x8-10 @ ${q}\nDB Step-Ups: 4x8 each leg\nHip Thrust: 4x12\nNordic Hamstring Curl: 3x5\nSingle Leg Calf Raise: 4x12` },
    { day: 'Day 4', focus: 'Upper Volume',
      description: `${WU_UPPER}Close Grip Bench Press: 5x8-10 @ ${q}\nWeighted Chin-ups: 5x6\nSingle Arm DB Row: 5x10 each arm\nOverhead Press: 4x10\nDB Shrugs: 4x12\nLateral Raises: 3x15\nBicep Curls: 3x12\nFace Pulls: 3x15${NECK}` },
  ]
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

function fbSkillSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'power') // Change 1 — power tier: 6/5/4/3 by phase
  const dbsj = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const mbcp = explosiveSets(4, ph)
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift, added Hip Thrust; Fix 3: phasePlyo
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WU_LOWER}Power Clean from floor: 5x3 working up\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 3x8\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\n${phasePlyo(ph)}\nLateral Bounds: 3x5 each side\n${fbSkillFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU_UPPER}Hang Clean: 4x3\nBench Press: ${info.ramp}, ${q}×${r}\nDB Incline Press: 3x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand Pull-Aparts: 3x15\n${fbSkillFinisher(1, info)}` },
    // Fix 3: phasePlyo replaces multi-plyo list
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU_LOWER}Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\n${phasePlyo(ph)}\n${fbSkillFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU_UPPER}Push Press: 4x5\nWeighted Pull-ups: 4x5\nBent Over BB Row: 4x8\nMed Ball Chest Pass: ${mbcp}x5 (${explosiveIntent(ph)})\n${fbSkillFinisher(3, info)}` },
  ]
}

function fbHybridSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'power') // Change 1 — hybrid explicitly maps to the power tier, same as skill
  const dbsj = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const mbcp = explosiveSets(4, ph)
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift, added Hip Thrust; Fix 3: phasePlyo
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WU_LOWER}Power Clean from floor: 5x3 working up\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 3x8\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\n${phasePlyo(ph)}\nLateral Bounds: 3x5 each side\nSled Push: 4x20 yds\n${fbSkillFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU_UPPER}Hang Clean: 4x3\nBench Press: ${info.ramp}, ${q}×${r}\nIncline DB Press: 4x8\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand Pull-Aparts: 3x15\n${NECK}\n\n${fbSkillFinisher(1, info)}` },
    // Fix 3: phasePlyo replaces multi-plyo list
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU_LOWER}Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\n${phasePlyo(ph)}\n${fbSkillFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU_UPPER}Push Press: 4x5\nWeighted Pull-ups: 4x5\nBent Over BB Row: 4x8\nMed Ball Chest Pass: ${mbcp}x5 (${explosiveIntent(ph)})\n${NECK}\n\n${fbSkillFinisher(3, info)}` },
  ]
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

function fbQBFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('rotational', info.phaseNum, 4, { hasArmCare: true })[dayIndex]
  return finisherEngine.renderFinisher(FOOTBALL_QB_FINISHERS, plan, info.phaseNum, info.deload)
}

function fbQBSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — rotational/speed tier: 8/6/5/4 by phase
  return [
    { day: 'Day 1', focus: 'Lower',
      description: `${WU_LOWER}Back Squat: ${info.ramp}, ${q}×${r}\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nHip Thrust: 4x8\nLateral Bounds: 3x5 each side\n${fbQBFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper & Rotational',
      description: `${WU_UPPER}Hang Clean: 3x3\nDB Bench: 4x10\nPull-ups: 4xAMAP\n${fbQBFinisher(1, info)}` },
    // Fix 3: phasePlyo
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU_LOWER}Power Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nSingle Leg Calf Raise: 3x15\n${fbQBFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Upper & Shoulder Health',
      description: `${WU_UPPER}Push Press: 4x5\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\n${fbQBFinisher(3, info)}` },
  ]
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
  // Standard-goal linemen (and the position default for any unrecognized
  // posId, matching the old fns.linemen fallback below) route to the
  // rebuilt, source-faithful linemen generator. Muscle-gain linemen keeps
  // the older, denser fbLinemenMGSess template untouched — that goal wasn't
  // part of this rebuild. Skill/hybrid/qb are completely unaffected either way.
  if (!mg && posId !== 'skill' && posId !== 'hybrid' && posId !== 'qb') {
    return generateLinemenWeeks(daysPerWeek)
  }
  const phases = mg ? MG_PHASES : FB_PHASES
  const fns = {
    linemen: fbLinemenMGSess,
    skill:   (info) => mg ? fbSkillSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })) : fbSkillSess(info),
    hybrid:  (info) => mg ? fbHybridSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })) : fbHybridSess(info),
    qb:      (info) => mg ? fbQBSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })) : fbQBSess(info),
  }
  return buildWeeksDynamic(16, phases, fns[posId] || fns.linemen, daysPerWeek, [FB_DAY5, FB_DAY6])
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

function bbGuardSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const dbsj = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Day 1', focus: 'Lower Lateral & First-Step Quickness',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nLateral Step-Up: 4x8 each leg\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\nLateral Bounds: 5x5 each side\nAnkle Hops: 3x20\nCalf Raises: 4xAMAP\n${bbGuardFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Power Clean: 3x3\nDB Bench: 4x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15\n${bbGuardFinisher(1, info)}` },
    { day: 'Day 3', focus: 'Explosion, Plyos & Landing Mechanics',
      description: `${bballPlyo(ph)}\nSnap Down: 3x5\nLateral Deceleration Drill: 3x5 each side\nSingle Leg Box Jump: 2x4 each leg\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 3x5\n${bbGuardFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Full Body Power & Court Conditioning',
      description: `Hang Clean: 4x3\nFront Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Step-Ups: 3x8 each leg\nAnkle Hops: 3x20\n${bbGuardFinisher(3, info)}` },
  ]
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

function bbWingsSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const aj = explosiveSets(5, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Day 1', focus: 'Lower Vertical Power',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x5 each leg\nApproach Jump: ${aj}x5 (${explosiveIntent(ph)})\n${bballPlyo(ph)}\nCalf Raises: 4xAMAP\nNordic Hamstring Curl: 3x5\n${bbWingFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Power Clean: 3x3\nDB Bench: 4x10\nDB Chest Press (varied grip): 3x10\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x12 each arm\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15\n${bbWingFinisher(1, info)}` },
    { day: 'Day 3', focus: 'Full Body Explosion, Landing Mechanics & Multi-Directional',
      description: `Hang Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${bballPlyo(ph)}\nDepth Drop: 3x5\nLateral Deceleration Drill: 3x3 each side\nLateral Bound: 4x5 each side\nBounding: 3x20m\nSingle Leg Box Jump: 3x4 each leg\n${bbWingFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Full Body Power & Conditioning',
      description: `Front Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Step-Ups: 3x8 each leg\nAnkle Hops: 3x20\n${bbWingFinisher(3, info)}` },
  ]
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

function bbBigsSess(info) {
  const q  = pct(Math.min(0.93, info.f + 0.05))
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const dbsj = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Day 1', focus: 'Lower Strength & Landing Mechanics',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\nSnap Down: 3x5\nDepth Drop: 3x5\nCalf Raises: 4xAMAP\n${bbBigFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper Volume',
      description: `Power Clean: 3x3\nDB Bench: 5x8\nWeighted Pull-ups: 5x5\nBB Row: 4x8\nOverhead Press: 4x8\nBand Pull-Aparts: 3x15\n${bbBigFinisher(1, info)}` },
    { day: 'Day 3', focus: 'Lower Deadlift & Unilateral',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 3xAMAP\n${bbBigFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Full Body Power & Post Conditioning',
      description: `Hang Clean: 4x3\nClose Grip Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nDB Shrugs: 3x12\n${bbBigFinisher(3, info)}` },
  ]
}

const BB_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Court Conditioning',
  description: `17s Drill: 4x1 (17 second target)\nFull Court Sprint: 8x1\nDefensive Slide: 4x full court\nSprint + Close Out: 6 rounds\n${coreBlock(info.phaseNum)}`,
})
const BB_DAY6 = {
  day: 'Day 6', focus: 'Active Recovery',
  description: `Foam Roll: Quads · IT Band · Calves — 15 minutes\nBalance Work: Single Leg Stand 3x30s each leg\nBand Work: Hip Flexor · External Rotation — 2x15 each\nStatic Stretch: Hip Flexors · Hamstrings · Hip Internal Rotation`,
}

function generateBasketballWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : BB_PHASES
  const baseFns = { guards: bbGuardSess, wings: bbWingsSess, bigs: bbBigsSess }
  const baseFn = baseFns[posId] || bbGuardSess
  const fn = mg
    ? (info) => baseFn(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : baseFn
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [BB_DAY5, BB_DAY6])
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

function soccerGoalkeeperSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const dl = info.deload
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const slbj = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Power & Explosive',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nSingle Leg RDL: 3x8 each leg\nSingle Leg Box Jump: ${slbj}x4 each leg (${explosiveIntent(ph)})\nLateral Bound: 5x5 each side\nCopenhagen Adductor: 4x10 each leg\nCalf Raises: 3xAMAP\n${fieldFinisher(GK_FINISHERS, 0, 4, info)}` },
    { day: 'Tuesday', focus: 'Upper',
      description: `DB Bench Press: 4x10\nSingle Arm DB Row: 4x8 each arm\nOverhead Press: 3x10\nFace Pulls: 3x20\nReverse Fly: 3x15\n${fieldFinisher(GK_FINISHERS, 1, 4, info)}` },
    { day: 'Thursday', focus: 'Lateral Explosion & Hip Mobility',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nLateral Squat Jump: 5x5 each side\nSingle Leg Lateral Hurdle Hop: 4x5 each leg\nCossack Squat: 4x6 each side\nResistance Band Lateral Walk: 3x20 each direction\nDB Lateral Lunge: 3x8 each leg\n${fieldFinisher(GK_FINISHERS, 2, 4, info)}` },
    { day: 'Friday', focus: 'Upper Power',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Pull-ups: 4x5\n${fieldFinisher(GK_FINISHERS, 3, 4, info)}` },
  ]
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

function soccerCenterBackSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const dl = info.deload
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const bj = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Max Lower Strength',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nNordic Hamstring Curl: 4x5\nSingle Leg RDL: 3x8 each leg\nBroad Jump: ${bj}x3 (${explosiveIntent(ph)})\nGroin Plank: 3x10 each side\n${fieldFinisher(CB_FINISHERS, 0, 4, info)}` },
    { day: 'Tuesday', focus: 'Upper Contact Strength',
      description: `DB Bench Press: 5x8\nSingle Arm DB Row: 5x8 each arm\nOverhead Press: 4x8\nNeck Strengthening: 3x12 each direction\nMB Twist Throw: 4x6 each side\nFace Pulls: 3x15\n${fieldFinisher(CB_FINISHERS, 1, 4, info)}` },
    { day: 'Thursday', focus: 'Power, Jumping & Deceleration',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nApproach Jump: 5x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nDB Lateral Lunge: 3x8 each leg\n${fieldFinisher(CB_FINISHERS, 2, 4, info)}` },
    { day: 'Friday', focus: 'Upper Power',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Pull-ups: 4x6\nNeck Strengthening: 3x12 each direction\n${fieldFinisher(CB_FINISHERS, 3, 4, info)}` },
  ]
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

function soccerFullbackSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const dl = info.deload
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const lb = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Strength & Sprint',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Bounds: ${lb}x5 each side (${explosiveIntent(ph)})\nGroin Plank: 3x10 each side\n${fieldFinisher(FB_FINISHERS, 0, 4, info)}` },
    { day: 'Tuesday', focus: 'Upper Light & Mobility',
      description: `DB Bench Press: 3x10\nSingle Arm DB Row: 3x10 each arm\nLateral Raise: 3x12\nBanded Monster Walk: 3x10 each direction\nMB Twist Throw: 3x6 each side\nHip 90/90 Hold: 3x30s each side\nCopenhagen Adductor: 3x8 each leg\n${fieldFinisher(FB_FINISHERS, 1, 4, info)}` },
    { day: 'Thursday', focus: 'Explosion & Sprint Development',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: 4x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\n${fieldFinisher(FB_FINISHERS, 2, 4, info)}` },
    { day: 'Friday', focus: 'Upper Power',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nSingle Arm DB Row: 3x10 each arm\nBanded Hip Abduction: 3x15 each side\n${fieldFinisher(FB_FINISHERS, 3, 4, info)}` },
  ]
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

function soccerMidfielderSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const dl = info.deload
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const hbj = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Strength & Aerobic Base',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 4x5\nHex Bar Jumps: ${hbj}x6 (${explosiveIntent(ph)})\nSingle Leg RDL: 3x8 each leg\nHip Thrust: 4x8\nGroin Plank: 3x10 each side\n${fieldFinisher(MF_FINISHERS, 0, 4, info)}` },
    { day: 'Tuesday', focus: 'Upper & Work Capacity',
      description: `DB Bench Press: 4x8\nSingle Arm DB Row: 4x8 each arm\nLateral Raise: 3x12\nMB Twist Throw: 4x6 each side\nKneeling Single Arm Lat Pulldown: 3x8 each arm\nBanded Monster Walk: 3x10 each direction\nPush-up: 3xAMAP\n${fieldFinisher(MF_FINISHERS, 1, 4, info)}` },
    { day: 'Thursday', focus: 'Explosion & Change of Direction',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: 4x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\n${fieldFinisher(MF_FINISHERS, 2, 4, info)}` },
    { day: 'Friday', focus: 'Upper Power',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nKneeling Single Arm Lat Pulldown: 3x8 each arm\nPush-up: 3xAMAP\n${fieldFinisher(MF_FINISHERS, 3, 4, info)}` },
  ]
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

function soccerWingerSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const dl = info.deload
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const ah = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Speed-Strength & Horizontal Force',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nReverse Lunge: 3x5 each leg\nNordic Hamstring Curl: 4x5\nAnkle Hops: ${ah}x20 (${explosiveIntent(ph)})\nLateral Bounds: 5x5 each side\nCalf Raises: 4xAMAP\n${fieldFinisher(WG_FINISHERS, 0, 4, info)}` },
    { day: 'Tuesday', focus: 'Upper Light & Accessory',
      description: `DB Bench Press: 3x10\nSingle Arm DB Row: 3x10 each arm\nLateral Raise: 3x12\nMB Twist Throw: 3x6 each side\nBanded Monster Walk: 3x10 each direction\nCopenhagen Adductor: 3x8 each leg\n${fieldFinisher(WG_FINISHERS, 1, 4, info)}` },
    { day: 'Thursday', focus: 'Vertical Strength & Reactive Speed',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nSingle Leg Lateral Hurdle Hop: 4x5 each leg\nLateral Squat Jump: 4x5\n${fieldFinisher(WG_FINISHERS, 2, 4, info)}` },
    { day: 'Friday', focus: 'Upper Power',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nSingle Arm DB Row: 3x10 each arm\nBanded Monster Walk: 3x10 each direction\n${fieldFinisher(WG_FINISHERS, 3, 4, info)}` },
  ]
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

function soccerStrikerSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const dl = info.deload
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const aj = explosiveSets(5, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Vertical Power & Jump Height',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nNordic Hamstring Curl: 4x5\nApproach Jump: ${aj}x5 (${explosiveIntent(ph)})\nSingle Leg Box Jump: 3x4 each leg\nCopenhagen Adductor: 3x8 each leg\n${fieldFinisher(SK_FINISHERS, 0, 4, info)}` },
    { day: 'Tuesday', focus: 'Upper & Rotational Power',
      description: `DB Bench Press: 4x8\nSingle Arm DB Row: 4x8 each arm\nMB Twist Throw: 4x6 each side\nMed Ball Overhead Slam: 4x8\nOverhead Press: 3x10\nBanded Monster Walk: 3x10 each direction\n${fieldFinisher(SK_FINISHERS, 1, 4, info)}` },
    { day: 'Thursday', focus: 'Explosive Speed, Horizontal Power & Shot Drive',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nHex Bar Jumps: 4x5\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: 4x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nRotational Cable Pull: 3x8 each side\n${fieldFinisher(SK_FINISHERS, 2, 4, info)}` },
    { day: 'Friday', focus: 'Upper Power',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nSingle Arm DB Row: 3x10 each arm\nMed Ball Overhead Slam: 4x8\n${fieldFinisher(SK_FINISHERS, 3, 4, info)}` },
  ]
}

const SOC_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Speed & COD',
  description: `Sprint Ladder: 10/20/30/20/10 yds — 3 rounds\nV Drill: 4x3\nStar Drill: 3x3\n300 Yard Shuttle: 2x2\nFlying 20s: 6x1\n${coreBlock(info.phaseNum)}`,
})
const SOC_DAY6 = {
  day: 'Day 6', focus: 'Active Recovery',
  description: `Foam Roll: Quads · Hamstrings · Hip Flexors — 15 minutes\nHip Mobility: Hip 90/90 Hold 3x30s each side\nHamstring Flexibility: Nordic Stretch 3x30s\nCalf Flexibility: Seated Calf Stretch 3x45s each leg`,
}

function generateSoccerWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : SOC_PHASES
  const baseFns = {
    goalkeeper: soccerGoalkeeperSess,
    center_back: soccerCenterBackSess,
    fullback: soccerFullbackSess,
    midfielder: soccerMidfielderSess,
    winger: soccerWingerSess,
    striker: soccerStrikerSess,
  }
  const baseFn = baseFns[posId] || soccerMidfielderSess
  const fn = mg
    ? (info) => baseFn(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : baseFn
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [SOC_DAY5, SOC_DAY6])
}

// ─── Wrestling ────────────────────────────────────────────────────────────────

function wrestlingSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'power') // Change 1 — collision/max-strength archetype, same tier as football skill/hybrid
  const ms = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Single Leg RDL kept as light accessory
    { day: 'Day 1', focus: 'Lower Max Strength',
      description: `Back Squat: ${info.ramp}, ${q}×${r} (top set — max effort)\nWeighted Pull-ups: 5xAMAP\nNordic Hamstring Curl: 3x5\nSingle Leg RDL: 3x8 each leg\nHip 90/90 Stretch: 3x30s each side\nCossack Squat: 3x5 each side\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper Max Strength',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Pull-ups: 5xAMAP\nBB Row: 4x6\nOverhead Press: 4x8\nNeck Strengthening: 3x12 each direction\nGrip Work: 3x30 seconds each\nBand External Rotation: 3x15 each arm\nFace Pulls: 3x15` },
    // Fix 3: phasePlyo
    { day: 'Day 3', focus: 'Explosive Power',
      description: `Power Clean: 5x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nMed Ball Slam: ${ms}x8 (${explosiveIntent(ph)})\nSprawl Drills: 3x10\nLevel Change Explosive Sprawl: 4x8` },
    { day: 'Day 4', focus: 'Conditioning & Accessory',
      description: `Weighted Carries: Farmer / Suitcase / Rack — 3 sets each\nPull-up max set x3\nPush-up max set x3\nIsometric Squat Hold: 3x30 seconds\nIsometric Pull Hold: 3x30 seconds\n400m repeats x6\nBand External Rotation: 3x15 each arm\nFace Pulls: 3x15\nYTW Shoulder Series: 3x10 each` },
  ]
}

const WR_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Mat Conditioning',
  description: `Sprawl Drills: 3x10\nWeighted Carries: Farmer / Suitcase / Rack — 3 sets each\nPull-up Max Set: x3\nPush-up Max Set: x3\nIsometric Squat Hold: 3x30s\n400m Repeats: 4x1\n${coreBlock(info.phaseNum)}`,
})
const WR_DAY6 = {
  day: 'Day 6', focus: 'Recovery & Maintenance',
  description: `Foam Roll: Full body — 15 minutes\nNeck Strengthening: 3x12 each direction\nGrip Work: 3x30s each\nHip Flexor Stretch: 3x45s each leg\nStatic Stretch: Hip Flexors · Hamstrings · Thoracic`,
}

// ─── Wrestling — Collision/Max-Strength archetype (standard goal only; see
// wrestlingSess above for the muscle-gain variant, untouched by this build,
// same precedent as Linemen's own fbLinemenMGSess) ─────────────────────────
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

function wrestlingDay1Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 1', focus: 'Lower Power',
    description: `${WRESTLING_WU_LOWER}Power Clean: ${collisionOlyScheme(ph, dl)} (from floor, catch quarter squat)\n` +
      `Back Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
      `Weighted Pull-ups: 5xAMAP\nFarmer Carries: 3x40 yds\nNordic Hamstring Curl: 3x5\nSprawl Drills: 3x10\n${COLLISION_NECK}\n\n${collisionFinisher(WRESTLING_FINISHERS, 0, 4, info)}`,
  }
}

function wrestlingDay2Upper(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 2', focus: 'Upper Strength',
    description: `${WRESTLING_WU_UPPER}Single Arm DB Split Jerk: ${collisionOlyScheme(ph, dl)}, each arm\n` +
      `Overhead Press: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Rope Climb: 3 ascents\nBB Row: 4x8\nGrip Work: 3x30s each (plate pinch · towel hang)\n${COLLISION_NECK}\n\n${collisionFinisher(WRESTLING_FINISHERS, 1, 4, info)}`,
  }
}

function wrestlingDay3Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 3', focus: 'Lower Strength',
    description: `${WRESTLING_WU_LOWER}Hang Clean Above the Knee: ${collisionOlyScheme(ph, dl)} (start at hip crease, hinge to above kneecaps, explode)\n` +
      `Trap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Single Leg RDL: 3x8 each leg (2 DB)\nBulgarian Split Squat: 3x8 each leg\nDB Suitcase Carries: 3x20 yds each side\n${COLLISION_NECK}\n\n${collisionFinisher(WRESTLING_FINISHERS, 2, 4, info)}`,
  }
}

function wrestlingDay4Upper(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 4', focus: 'Upper Power',
    description: `${WRESTLING_WU_UPPER}BB Split Jerk: ${collisionOlyScheme(ph, dl)}\n` +
      `Close Grip Bench Press: ${buildCollisionMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
      `Weighted Chin-ups: 4x6\nInverted BB Row: 3x10\nGrip Work: 3x30s each (plate pinch · towel hang)\n${COLLISION_NECK}\n\n${collisionFinisher(WRESTLING_FINISHERS, 3, 4, info)}`,
  }
}

function wrestlingArchetypeAnchor4Day(info) {
  return [wrestlingDay1Lower(info), wrestlingDay2Upper(info), wrestlingDay3Lower(info), wrestlingDay4Upper(info)]
}

// ── 3-day (consolidated — every anchor movement still appears somewhere) ──

function wrestlingArchetype3Day(info) {
  const { phaseNum: ph, deload: dl } = info
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WRESTLING_WU_LOWER}Power Clean: ${collisionOlyScheme(ph, dl)} (from floor, catch quarter squat)\n` +
        `Back Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
        `Weighted Pull-ups: 5xAMAP\nFarmer Carries: 3x40 yds\nSprawl Drills: 3x10\n${COLLISION_NECK}\n\n${collisionFinisher(WRESTLING_FINISHERS, 0, 3, info)}` },
    { day: 'Day 2', focus: 'Upper (Full)',
      description: `${WRESTLING_WU_UPPER}BB Split Jerk: ${collisionOlyScheme(ph, dl)}\n` +
        `Close Grip Bench Press: ${buildCollisionMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
        `Rope Climb: 3 ascents\nBB Row: 4x8\n${COLLISION_NECK}\n\n${collisionFinisher(WRESTLING_FINISHERS, 1, 3, info)}` },
    { day: 'Day 3', focus: 'Lower Strength',
      description: `${WRESTLING_WU_LOWER}Hang Clean Above the Knee: ${collisionOlyScheme(ph, dl)} (start at hip crease, hinge to above kneecaps, explode)\n` +
        `Trap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
        `Single Leg RDL: 3x8 each leg (2 DB)\nBulgarian Split Squat: 3x8 each leg\nDB Suitcase Carries: 3x20 yds each side\n${COLLISION_NECK}\n\n${collisionFinisher(WRESTLING_FINISHERS, 2, 3, info)}` },
  ]
}

// ── 5-day (4-day anchor + Day 5: grip/conditioning/armor) ──────────────────

function wrestlingArchetypeDay5(info) {
  return {
    day: 'Day 5', focus: 'Grip, Conditioning & Armor',
    description: 'Trap Bar Jump: 4x3 (cap 155 lbs)\nSled Push: 4x20 yds\n' +
      'Weighted Carries: Farmer / Suitcase / Rack — 3 sets each\nRope Climb: 3 ascents\n' +
      `${COLLISION_NECK_DEDICATED}\nGrip Work: 3 sets`,
  }
}

// ── 6-day (4-day anchor relabeled Lower A/Upper A/Lower B/Upper B, +
// Lower C: posterior chain/grappling, + Upper C: hypertrophy/grip armor) ──

function wrestlingArchetypeLowerC(info) {
  const { phaseNum: ph, deload: dl } = info
  const power = weeklyVariant(info.week, 'Trap Bar Jump: 4x3 (cap 155 lbs)', `Clean Pull: ${collisionOlyScheme(ph, dl)}`)
  return {
    day: 'Lower C', focus: 'Lower — Posterior Chain & Grappling',
    description: `${power}\nTrap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Single Leg RDL: 3x8 each leg\nSprawl Drills: 3x10\nDB Suitcase Carries: 3x30 yds each side\n${COLLISION_NECK}`,
  }
}

function wrestlingArchetypeUpperC(info) {
  const press = weeklyVariant(info.week, 'Incline DB Press: 3x10', 'Weighted Dips: 3x10')
  return {
    day: 'Upper C', focus: 'Upper — Hypertrophy & Grip Armor',
    description: `${press}\nChest Supported Row: 3x12\nRope Climb: 3 ascents\n` +
      `${superset(1, ['Bicep Curls: 3x12', 'Tricep Pushdowns: 3x12']).join('\n')}\n${COLLISION_NECK}`,
  }
}

function generateWrestlingArchetypeWeeks(daysPerWeek) {
  return generateCollisionArchetypeWeeks({
    anchor4Day: wrestlingArchetypeAnchor4Day,
    threeDay: wrestlingArchetype3Day,
    day5: wrestlingArchetypeDay5,
    lowerC: wrestlingArchetypeLowerC,
    upperC: wrestlingArchetypeUpperC,
  }, daysPerWeek)
}

function generateWrestlingWeeks(_, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  if (!mg) return generateWrestlingArchetypeWeeks(daysPerWeek)
  const fn = (info) => wrestlingSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
  return buildWeeksDynamic(16, MG_PHASES, fn, daysPerWeek, [WR_DAY5, WR_DAY6])
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

function volleyballSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — vertical/jump/court archetype, same tier as basketball
  const aj = explosiveSets(5, ph) // Change 3 — explosive volume by phase
  return [
    // Fix 3: phasePlyo replaces Box Jump + Depth Jump multi-list
    { day: 'Day 1', focus: 'Lower Power, Landing Mechanics & Patellar Tendon Prehab',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x5 each leg\n${phasePlyo(ph)}\nSnap Down: 3x5\nDepth Drop: 3x5\nSingle Leg Box Jump: 3x5 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 4xAMAP\n${volleyballFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper & Shoulder Health',
      description: `DB Bench: 4x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nOverhead Press: 3x10\n${volleyballFinisher(1, info)}` },
    { day: 'Day 3', focus: 'Full Body Explosion',
      description: `Power Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\nApproach Jump: ${aj}x5 (${explosiveIntent(ph)})\nHip Thrust: 4x8\nBand Pull-Aparts: 3x20\n${volleyballFinisher(2, info)}` },
  ]
}

const VB_DAY4 = (info) => ({
  day: 'Day 4', focus: 'Speed & Conditioning',
  description: `Court Sprints: 10x full court (45s rest)\nLateral Shuffle: 4x10 yds each way\nLine Jumps: 3x20s\nReactive Box Jump: 4x4\nTerminal Knee Extension: 3x15 each leg\nCore Finisher: Plank 3x45s · Dead Bug 3x10 · Hanging Knee Raise 3x12\n${coreBlock(info.phaseNum)}`,
})
const VB_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Upper Accessory & Shoulder Health',
  description: `DB Shoulder Press: 4x10\nFace Pulls: 4x15\nBand External Rotation: 3x15 each arm\nSerratus Wall Slides: 3x12\nTricep Pushdown: 3x15\nBicep Curl: 3x12\n${coreBlock(info.phaseNum)}`,
})
const VB_DAY6 = {
  day: 'Day 6', focus: 'Recovery & Mobility',
  description: `Foam Roll: Full body — 10 minutes\nDownward Dog → Runner's Lunge flow: 3x5 each side\nHip 90/90 Hold: 3x45s each side\nThoracic Rotation: 3x10 each side\nStatic Stretch: Quads · Hip Flexors · Chest · Shoulders`,
}

function generateVolleyballWeeks(_, goal, daysPerWeek = 3) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : STD_PHASES
  const fn = mg
    ? (info) => volleyballSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : volleyballSess
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [VB_DAY4, VB_DAY5, VB_DAY6])
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

function trackSprintSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — non-contact speed archetype, same tier as football QB/basketball/soccer
  const bnd = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  return [
    // Fix 3: phasePlyo replaces Box Jump + Broad Jump list
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 5x3\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\n${phasePlyo(ph)}\nSingle Leg RDL: 3x8 each leg\nCopenhagen Adductor: 3x8 each leg\nBanded Hip Flexion: 3x12 each leg\n${trackSprintFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nPull-ups: 4xAMAP\nDB Row: 3x12\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15\n${trackSprintFinisher(1, info)}` },
    // Fix 3: phasePlyo as primary; Bounding is sprint-specific, kept
    { day: 'Day 3', focus: 'Explosion',
      description: `Hang Clean: 4x3\nFront Squat: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nBounding: ${bnd}x20m (${explosiveIntent(ph)})\n${trackSprintFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Posterior Chain',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x10\nSingle Leg Calf Raise: 4xAMAP\n${trackSprintFinisher(3, info)}` },
  ]
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

function trackThrowFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('rotational', info.phaseNum, 4, { hasArmCare: true })[dayIndex]
  return finisherEngine.renderFinisher(TRACK_THROW_FINISHERS, plan, info.phaseNum, info.deload)
}

function trackThrowSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — rotational/throwing archetype, same tier as baseball/golf/tennis
  return [
    // Fix 1: Day 1 is now a squat day — Trap Bar Deadlift moved to Day 3
    { day: 'Day 1', focus: 'Lower Power — Squat',
      description: `Power Clean from floor: 5x3 working up, last set AMAP\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 3x8\nGoblet Lateral Lunge: 3x4 each leg\nDouble Leg Calf Raise: 3x15\n${trackThrowFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper Strength, Rotational & Shoulder Health',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nPull-ups: 4xAMAP\nBB Row: 4x8\nOverhead Press: 4x8\n${trackThrowFinisher(1, info)}` },
    // Trap Bar DL is primary; RDL removed (flagged: TBD + RDL); Hip Thrust replaces it
    { day: 'Day 3', focus: 'Lower Strength — Deadlift',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nDB Step-Ups: 3x6 each leg\nHip Thrust: 3x10\nNordic Hamstring Curl: 3x5\nSingle Leg Calf Raise: 3x12\n${trackThrowFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Upper Power, Rotational & Shoulder Health',
      description: `Push Press: 4x5\nClose Grip Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\n${trackThrowFinisher(3, info)}` },
  ]
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

function trackJumpSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — non-contact jump archetype, same tier as basketball
  const slbj = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  // Single Leg Depth Jump only in phases 3-4 (Fix 3 — no depth jumps ph 1-2)
  const singleLegDepth = ph >= 3 ? '\nSingle Leg Depth Jump: 4x4 each leg' : ''
  return [
    // Fix 3: phasePlyo; Single Leg Depth Jump gated to phases 3-4
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 5x3\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\n${phasePlyo(ph)}${singleLegDepth}\nSingle Leg RDL: 3x8 each leg\nTerminal Knee Extension: 3x15 each leg\n${trackJumpFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nPull-ups: 4xAMAP\nDB Row: 3x12\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15\n${trackJumpFinisher(1, info)}` },
    // Fix 3: phasePlyo as primary; jump-specific drills kept; Single Leg Broad Jump phases 2+
    { day: 'Day 3', focus: 'Explosion — Jumps Focus',
      description: `Hang Clean: 4x3\nFront Squat: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}${ph >= 2 ? '\nSingle Leg Broad Jump: 3x3 each leg' : ''}\nSingle Leg Box Jump: ${slbj}x5 each leg (${explosiveIntent(ph)})\n${trackJumpFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Posterior Chain',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x10\nSingle Leg Calf Raise: 4xAMAP\n${trackJumpFinisher(3, info)}` },
  ]
}

const TRACK_SPRINT_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Sprint Mechanics & Acceleration',
  description: `Wicket Runs: 4x40m\nBlock Start Acceleration: 6x20m\nHill Sprints: 5x40m\nResistance Band Sprint Marches: 4x20m\nAnkle Circuit: 3x20 each\n${coreBlock(info.phaseNum)}`,
})
const TRACK_THROW_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Power Accessory & Recovery',
  description: `Overhead Squat: 4x5 (technique)\nRotational Med Ball Throw: 4x6 each side\nFace Pulls: 4x15\nBand External Rotation: 3x15\nFoam Roll: 10 minutes\n${coreBlock(info.phaseNum)}`,
})
const TRACK_JUMP_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Elastic Strength & Bounding',
  description: `Ankle Hops: 4x20\nSingle Leg Bounding: 4x5 each leg\nDrop Jump: 4x5\nReactive Box Jump: 3x5\nLateral Hurdle Hops: 3x5 each side\n${coreBlock(info.phaseNum)}`,
})
const TRACK_DAY6 = {
  day: 'Day 6', focus: 'Recovery & Mobility',
  description: `Foam Roll: Full body — 15 minutes\nHip Flexor Stretch: 3x45s each leg\nHamstring Eccentric: 3x8\nCalf Raise Static Stretch: 3x45s\nThoracic Rotation: 3x10 each side\nAnkle Mobility Circles: 3x10 each`,
}

function generateTrackWeeks(subtype, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : STD_PHASES
  const baseFns = { sprint: trackSprintSess, throw: trackThrowSess, jump: trackJumpSess }
  const baseFn = baseFns[subtype] || trackSprintSess
  const fn = mg
    ? (info) => baseFn(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : baseFn
  const day5Fns = { sprint: TRACK_SPRINT_DAY5, throw: TRACK_THROW_DAY5, jump: TRACK_JUMP_DAY5 }
  const day5 = day5Fns[subtype] || TRACK_SPRINT_DAY5
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [day5, TRACK_DAY6])
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

function xcFinisher(dayIndex, phaseNum, deload) {
  const plan = finisherEngine.planWeekFinishers('endurance', phaseNum, 2, { hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(CROSS_COUNTRY_FINISHERS, plan, phaseNum, deload)
}

function xcSess(phaseNum, deload = false) {
  const lo = deload ? Math.round(65 * (1 - DELOAD_PCT_CUT)) : 65
  const hi = deload ? Math.round(70 * (1 - DELOAD_PCT_CUT)) : 70
  return [
    { day: 'Day 1', focus: 'Lower (Low Load)',
      description: `Back Squat: 3x8 @ ${lo}-${hi}% only — no heavy loading\nSingle Leg RDL: 3x10 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 4xAMAP\nHip Thrust: 3x12\nCopenhagen Adductor: 3x8 each leg\n${xcFinisher(0, phaseNum, deload)}` },
    { day: 'Day 2', focus: 'Full Body Light',
      description: `Trap Bar Deadlift: 3x8 @ ${lo}-${hi}% only — no heavy loading\nGoblet Squat: 3x12\nPull-ups: 3xAMAP\nPush-ups: 3xAMAP\nBand Work: Hip Abduction · External Rotation — 3x15 each\n${xcFinisher(1, phaseNum, deload)}` },
  ]
}

const XC_PHASE_LABELS = ['Injury Prevention Base', 'Base Strength', 'Maintenance', 'Pre-Season Taper']

// Change 3 — Day 3's plyo/explosive lines now vary by phase (volume + intent
// note) via the same explosiveSets/explosiveIntent mechanism every other
// sport uses, instead of being a flat const identical every week of the
// 16-week plan. Everything else on this day (Box Step-Up, Glute Bridge, Hip
// 90/90 Hold, Calf Raise, Band Hip Abduction) is untouched — Cross Country's
// deliberately light, non-%-ramped main-lift design (see xcSess/generateXCWeeks)
// means Change 1's tiered rep arc has no ramped line to attach to here.
const XC_DAY3 = (phaseNum) => ({
  day: 'Day 3', focus: 'Plyometrics & Injury Prevention',
  description: `Ankle Hops: ${explosiveSets(3, phaseNum)}x20 (${explosiveIntent(phaseNum)})\nSingle Leg Hop & Stick: ${explosiveSets(3, phaseNum)}x5 each leg (${explosiveIntent(phaseNum)})\nBox Step-Up: 3x12 each leg\nGlute Bridge: 3x15\nHip 90/90 Hold: 2x45s each side\nCalf Raise: 3xAMAP\nBand Hip Abduction: 3x15 each side`,
})
const XC_DAY4 = {
  day: 'Day 4', focus: 'Core & Hip Strength',
  description: `Glute Bridge Hold: 3x60s\nSingle Leg Glute Bridge: 3x12 each leg\nCopenhagen Adductor: 3x8 each leg\nBird Dog: 3x10 each side\nDead Bug: 3x10 each side\nSide-Lying Hip Abduction: 3x15 each\nPlank with Hip Dip: 3x10 each side`,
}
const XC_DAY5 = {
  day: 'Day 5', focus: 'Upper Body & Posterior Chain',
  description: `Pull-ups: 3xAMAP\nFace Pulls: 3x15\nBand Pull-Aparts: 3x20\nDB Row: 3x12 each arm\nPush-ups: 3xAMAP\nYTW Series: 3x10 each\nFoam Roll: Upper back — 5 minutes`,
}
const XC_DAY6 = {
  day: 'Day 6', focus: 'Active Recovery & Mobility',
  description: `Foam Roll: Full body — 10 minutes\nHip Flexor Stretch: 3x45s each leg\nHamstring Eccentric: 3x8\nAnkle Circles: 3x20 each direction\nHip 90/90 Hold: 2x45s each side\nCalf Stretch: 3x45s each leg\nLight Walking Lunge: 2x10 each leg`,
}

function generateXCWeeks(_, goal, daysPerWeek = 2) {
  return Array.from({ length: 16 }, (_, i) => {
    const w   = i + 1
    const phi = Math.min(3, Math.floor((w - 1) / 4))
    const wip = ((w - 1) % 4) + 1
    // Every phase's 4th week deloads now, not just the plan's final phase —
    // matches every other sport (see getPhaseInfo). XC's load itself stays a
    // fixed, deliberately light 65-70% range in every non-deload week
    // ("no heavy loading" is the sport's own design, not something this
    // rebuild changes) — only the deload cadence changes here.
    const isDeload = wip === 4
    const base  = xcSess(phi + 1, isDeload)
    const extra = []
    if (daysPerWeek >= 3) extra.push(XC_DAY3(phi + 1))
    if (daysPerWeek >= 4) extra.push(XC_DAY4)
    if (daysPerWeek >= 5) extra.push(XC_DAY5)
    if (daysPerWeek >= 6) extra.push(XC_DAY6)
    return {
      week_number: w,
      objective: isDeload
        ? `Phase ${phi + 1} — Deload · Week ${wip} of 4`
        : `Phase ${phi + 1} — ${XC_PHASE_LABELS[phi]} · Week ${wip} of 4`,
      sessions: daysPerWeek <= base.length ? base.slice(0, Math.max(2, daysPerWeek)) : [...base, ...extra],
    }
  })
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

function lacrosseArchetypeDay1(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r  = mainLiftTopReps(ph, 'rotational')
  const lb = explosiveSets(4, ph)
  return {
    day: 'Monday', focus: 'Lower Power & Sprint',
    description: `Back Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 3x8\nSingle Leg RDL: 3x8 each leg\nNordic Hamstring Curl: 3x5\nLateral Bounds: ${lb}x5 each side (${explosiveIntent(ph)})\n${fieldFinisher(LAX_FINISHERS, 0, 4, info)}`,
  }
}

function lacrosseArchetypeDay2(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Tuesday', focus: 'Upper & Rotational Shooting Power',
    description: `DB Bench Press: 4x8\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nMed Ball Rotational Throw: 4x6 each side\nLandmine Rotation: 3x8 each side\nCable Woodchop: 3x10 each side\nGrip Work: 3x30s each\n${fieldFinisher(LAX_FINISHERS, 1, 4, info)}`,
  }
}

function lacrosseArchetypeDay3(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r   = mainLiftTopReps(ph, 'rotational')
  const lsj = explosiveSets(4, ph)
  return {
    day: 'Thursday', focus: 'Lower Explosion & Change of Direction',
    description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: ${lsj}x5 each side (${explosiveIntent(ph)})\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nSled Sprint: 6x20 yds\n${fieldFinisher(LAX_FINISHERS, 2, 4, info)}`,
  }
}

function lacrosseArchetypeDay4(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r = mainLiftTopReps(ph, 'rotational')
  return {
    day: 'Friday', focus: 'Upper Power',
    description: `Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Pull-ups: 4x6\nGrip Work: 3x30s each\n${fieldFinisher(LAX_FINISHERS, 3, 4, info)}`,
  }
}

function lacrosseArchetypeSess(info) {
  return [lacrosseArchetypeDay1(info), lacrosseArchetypeDay2(info), lacrosseArchetypeDay3(info), lacrosseArchetypeDay4(info)]
}

function generateLacrosseArchetypeWeeks(daysPerWeek) {
  return buildWeeksDynamic(16, STD_PHASES, lacrosseArchetypeSess, daysPerWeek, [LAX_DAY5, LAX_DAY6])
}

function generateLacrosseWeeks(_, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  if (!mg) return generateLacrosseArchetypeWeeks(daysPerWeek)
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

function swimFinisher(dayIndex, phaseNum) {
  const plan = finisherEngine.planWeekFinishers('endurance', phaseNum, 3, { hasArmCare: true })[dayIndex]
  return finisherEngine.renderFinisher(SWIMMING_FINISHERS, plan, phaseNum, false)
}

function swimSess(phaseNum) {
  const sets = phaseNum <= 2 ? 3 : 4
  const s = (n) => `${sets}x${n}`
  return [
    { day: 'Day 1', focus: 'Upper & Posterior Chain',
      description: `Trap Bar Deadlift: ${s(8)} @ moderate load\nPull-ups: ${s('AMAP')}\nDB Row: ${s(12)}\nPush-ups: ${s('AMAP')}\n${swimFinisher(0, phaseNum)}` },
    { day: 'Day 2', focus: 'Lower',
      description: `Back Squat: ${s(8)} @ moderate load\nGoblet Squat: ${s(12)}\nSingle Leg RDL: ${s(10)} each leg\nHip Thrust: ${s(12)}\n${swimFinisher(1, phaseNum)}` },
    { day: 'Day 3', focus: 'Full Dryland',
      description: `Lat Pulldown: ${s(12)}\nDB Bench: ${s(12)}\nShoulder Press: ${s(12)}\nPull-ups: ${s('AMAP')}\nBand Pull-Aparts: 4x20\n${swimFinisher(2, phaseNum)}` },
  ]
}

function swimDay4(phaseNum) {
  const sets = phaseNum <= 2 ? 3 : 4
  const s = (n) => `${sets}x${n}`
  // Change 3 — the day's three genuinely explosive/power lines (med ball
  // throw, box jump, lateral bound) now use the same phase-scaled
  // explosiveSets/explosiveIntent arc every other sport's power work uses,
  // instead of the old blunt "3 sets before phase 3, 4 after" bump. The two
  // conditioning-tempo lines (Resistance Band Sprint, Ankle Hops) keep the
  // existing s() helper — swimming has no % lifting anywhere (see swimSess),
  // so Change 1's tiered rep arc has no ramped line to attach to on any day.
  const mbot = explosiveSets(4, phaseNum)
  const bj   = explosiveSets(4, phaseNum)
  const lb   = explosiveSets(4, phaseNum)
  return {
    day: 'Day 4', focus: 'Power & Explosiveness',
    description: `Medicine Ball Overhead Throw: ${mbot}x8 (${explosiveIntent(phaseNum)})\nBox Jump: ${bj}x5 (${explosiveIntent(phaseNum)})\nResistance Band Sprint: ${s(20)} yds\nAnkle Hops: ${s(20)}\nLateral Bound: ${lb}x5 each side (${explosiveIntent(phaseNum)})\n${coreBlock(phaseNum)}`,
  }
}
function swimDay5(phaseNum) {
  const sets = phaseNum <= 2 ? 3 : 4
  const s = (n) => `${sets}x${n}`
  return {
    day: 'Day 5', focus: 'Shoulder Health & Accessory',
    description: `YTW Series: ${s(12)} each\nFace Pulls: ${s(15)}\nSerratus Wall Slides: ${s(12)}\nBand External Rotation: ${s(15)} each arm\nWrist Circles & Strengthening: 3x15 each direction\n${coreBlock(phaseNum)}`,
  }
}
const SWIM_DAY6 = {
  day: 'Day 6', focus: 'Recovery & Flexibility',
  description: `Foam Roll: Full body — 10 minutes\nDownward Dog → Cobra flow: 3x10\nThoracic Rotation: 3x10 each side\nShoulder Cross-Body Stretch: 3x45s each arm\nHip 90/90 Hold: 2x45s each side`,
}

function generateSwimmingWeeks(_, goal, daysPerWeek = 3) {
  return Array.from({ length: 16 }, (_, i) => {
    const w   = i + 1
    const phi = Math.min(3, Math.floor((w - 1) / 4))
    const wip = ((w - 1) % 4) + 1
    const base = swimSess(phi + 1)
    const extra = []
    if (daysPerWeek >= 4) extra.push(swimDay4(phi + 1))
    if (daysPerWeek >= 5) extra.push(swimDay5(phi + 1))
    if (daysPerWeek >= 6) extra.push(SWIM_DAY6)
    return {
      week_number: w,
      objective: phi === 3 && wip === 4
        ? `Phase 4 — Taper · Week ${wip} of 4`
        : `Phase ${phi + 1} — ${SWIM_PHASE_LABELS[phi]} · Week ${wip} of 4`,
      sessions: daysPerWeek <= base.length ? base.slice(0, Math.max(2, daysPerWeek)) : [...base, ...extra],
    }
  })
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

// Baseball-scoped accessory rotation — merged OVER the shared global
// ACCESSORY_ROTATION table (see applyAccessoryProgression's extraRotation
// param), so these entries only ever apply to baseball's own generated
// weeks. "Med Ball Rotational Throw" etc. are also used by several OTHER
// sports' templates (football, basketball, hockey, ...) — this table
// intentionally does NOT touch the shared global one, so baseball's
// rotational-power/arm-care pool never leaks into another sport's plan.
const BASEBALL_ACCESSORY_ROTATION = {
  // Arm care pool #1 (anchor: Band External Rotation)
  'band external rotation':    { 2: 'Scap Push-Ups',  3: 'YTW Raises' },
  // Arm care pool #2 (anchor: Face Pulls)
  'face pulls':                { 2: 'Prone Swimmers', 3: 'Crossover Symmetry Band Series' },
  // Lower-body accessory pool (anchor: Calf Raises) — overrides the shared
  // global ACCESSORY_ROTATION's own 'calf raises' entry for baseball only,
  // so Tibialis Raises (wall-supported, leaning back) appears as a real
  // working accessory on lower days without touching any other sport.
  'calf raises':               { 2: 'Tibialis Raises', 3: 'Seated Calf Raise' },
  // The med-ball rotational/power pool (Med Ball Rotational Throw, Scoop
  // Toss, Shotput Throw, Overhead Slam, Broad Jump + Throw) used to rotate
  // via this table's wip-based mechanism (2 entries per 4-week phase). It's
  // now driven entirely by the deterministic weekly category-variation
  // system (medBallPoolVariant/upperPowerMedBallVariant below) instead, so
  // those 5 names are intentionally absent here — the old entries are gone,
  // not just unused, so this table can never fight the new one for control
  // of the same line on a wip-2/3 week.
  //
  // Empty overrides below block the shared global ACCESSORY_ROTATION table
  // from independently rotating names this rebuild's category-variation
  // system already controls deterministically (see rotateAccessoryName —
  // extraRotation is checked before the global table, and an entry with no
  // numbered keys always resolves to "leave the name unchanged"). Without
  // these, e.g. Reverse Lunge would randomly rename itself to Walking Lunge/
  // Bulgarian Split Squat on a wip-2/3 week, fighting the Trap Bar Deadlift/
  // Reverse Lunge weekly anchor swap.
  'bulgarian split squat':     {},
  'db bench press':            {},
  'incline db press':          {},
  'lateral raise':             {},
  'reverse lunge':             {},
  'single leg rdl':            {},
  'pull-ups':                  {},
  'goblet squat':              {},
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

// Cross Country — only 2 always-present days (extra days 3-6 are static, see
// XC_DAY3's own Change 3 update above); Single Leg RDL and Pull-ups are the
// two names guaranteed present regardless of daysPerWeek.
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
function baseballPlyo(phaseNum) {
  if (phaseNum === 1) return { name: 'Box Jumps',               sets: 4, reps: '5' }
  if (phaseNum === 2) return { name: 'Broad Jumps',              sets: 4, reps: '5' }
  if (phaseNum === 3) return { name: 'Depth Jump → Box Jump',    sets: 3, reps: '4', note: 'contrast combo — box jump immediately after depth jump' }
  return { name: 'Box Jumps', sets: 5, reps: '5' }
}

// Exact prescription — a single exercise object, spliced directly into
// whichever day's exercises array needs it. Classified as conditioning by
// CONDITIONING_EXERCISE_RE above (stripped on deload weeks, excluded from
// the accessory volume wave — baseball's conditioning is meant to be
// minimal and fixed, not something that grows across a phase).
// Still used by BASEBALL_ARM_CARE/PITCHER_ARM_CARE (the 5-day plan's own
// dedicated Day 5 — out of scope for the finisher-engine wiring, same
// "extra day stays as-is" precedent every other archetype follows). The
// 4-day layout's own Sprint finisher is now engine-driven (see
// baseballFinisherBank above) — BIKE_LADDER, which had no other use, has
// been removed as dead code.
const BASEBALL_SPRINT_PROTOCOL = {
  name: 'Sprint Tempo Protocol', sets: 5, reps: '1',
  note: '30 yds stride @ 75%, jog back @ 50%, 30 yds stride @ 75%, walk back = 1 rep',
}

// ─── Category-based lift variation (baseball only, deterministic) ─────────
// Alternates which named variant of an exercise shows on a given week while
// the %-ramp progression (info.ramp/info.pct, computed once per week by
// getPhaseInfo) stays completely untouched — only the exercise NAME varies;
// load computation is identical either way. "Every other week" = alternates
// every single week (odd vs. even), not every 2 weeks.
function weeklyVariant(weekNumber, a, b) {
  return weekNumber % 2 === 1 ? a : b
}

// Med-ball rotational/power pool. Lower Strength pulls from the base
// 4-item pool; Upper Power pulls from a 5-item pool (adds the Broad Jump +
// Throw power/plyo variant, which isn't a rotational movement) and is
// offset from Lower Strength's index so the two days don't show the same
// movement in the same week.
const MED_BALL_POOL = ['Med Ball Rotational Throw', 'Med Ball Scoop Toss', 'Shotput Med Ball Throw', 'Med Ball Overhead Slam']
function medBallPoolVariant(weekNumber) {
  return MED_BALL_POOL[(weekNumber - 1) % MED_BALL_POOL.length]
}
const UPPER_POWER_MED_BALL_POOL = [...MED_BALL_POOL, 'Med Ball Broad Jump + Throw']
function upperPowerMedBallVariant(weekNumber) {
  // +2 offset so this never lands on the same movement as Lower Strength's
  // medBallPoolVariant in the same week.
  return UPPER_POWER_MED_BALL_POOL[(weekNumber - 1 + 2) % UPPER_POWER_MED_BALL_POOL.length]
}

// Auto-rotating "choose 1" slot (interactive picker is a later follow-up —
// approved as auto-rotate + note for this build). Deterministic by week:
// the prescribed name IS this week's pick, and the note lists the other
// pool options so the athlete can see the alternatives.
function rotatingChoice(pool, weekNumber, sets, reps) {
  const idx = (weekNumber - 1) % pool.length
  const chosen = pool[idx]
  const alternatives = pool.filter((_, i) => i !== idx).join(' / ')
  return { name: chosen, sets, reps, note: `or ${alternatives}` }
}
const TRICEP_POOL = ['DB Skull Crushers', 'Diamond Push-Ups', 'Cable Pushdown']
const BICEP_POOL = ['DB Curls', 'Cable Curls', 'Incline Curls']

// Day 6 (6-day plans only) — a genuinely light mobility/prehab/movement
// day, rotating 4-at-a-time from this pool, deterministic by week (same
// rolling-window pattern the core finisher uses). Every prescription here
// is deliberately light (low sets, bodyweight or very light load) — this
// is a recovery/maintenance day, not a training stimulus day.
const DAY6_LIGHT_POOL = [
  { name: 'Cossack Squat',                sets: 2, reps: '8',    note: 'light, each side' },
  { name: "World's Greatest Stretch",     sets: 2, reps: '5',    note: 'light, each side' },
  { name: '90/90 Hip Rotations',          sets: 2, reps: '8',    note: 'light, each side' },
  { name: 'Wall Slides',                  sets: 2, reps: '10',   note: 'light' },
  { name: 'Thread the Needle',            sets: 2, reps: '8',    note: 'light, each side (T-Spine)' },
  { name: 'Tibialis Raises',              sets: 2, reps: 'AMAP', note: 'light' },
  { name: 'Ankle Cradle to Side Lunge',   sets: 2, reps: '5',    note: 'light, each side' },
  { name: 'Glute Bridge',                 sets: 2, reps: '12',   note: 'light' },
  { name: 'Copenhagen Plank',             sets: 2, reps: '15s',  note: 'light, each side' },
  { name: 'Inchworms',                    sets: 2, reps: '5',    note: 'light' },
  { name: 'Goblet Squat',                 sets: 2, reps: '10',   note: 'light' },
  { name: 'Reverse Lunge',                sets: 2, reps: '8',    note: 'light, each leg' },
  { name: 'Step-Ups',                     sets: 2, reps: '8',    note: 'light, each leg' },
]
function day6Movements(weekNumber) {
  const start = ((weekNumber - 1) * 4) % DAY6_LIGHT_POOL.length
  return [0, 1, 2, 3].map(i => DAY6_LIGHT_POOL[(start + i) % DAY6_LIGHT_POOL.length])
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

// Exact prescription, rotating pool. The "Core — ..." header makes this
// automatically exempt from both the accessory volume wave and deload
// volume reduction (see isMobilityCoreExempt's core-block tracking), same
// as every other sport's core block — it's meant to vary WHICH movements
// appear, not lose volume. The header stays generic (no fixed "4m30s"
// promise) because a week that rotates in Decline Bench Iso runs a little
// longer than an all-interval week — that deviation shows on the movement's
// own line ("3x30s hold") rather than being hidden behind an inaccurate
// total-time claim in the header.
function baseballCoreFinisher(weekNumber) {
  const exercises = [{ header: 'Core — Finisher (20s on/10s off unless noted):' }]
  for (const name of coreFinisherMovements(weekNumber)) {
    exercises.push(
      name === 'Decline Bench Iso'
        ? { name, sets: 3, reps: '30s', note: 'hold' }
        : { name, sets: 3, reps: '20s' }
    )
  }
  return exercises
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
// (arm-care work never on a lower-body day; Trap Bar Jump/total-body power
// never on an upper-body day) predates this engine and is a real, tested
// invariant, not something the engine's normally-free scheduling should
// silently break. Sprint/Energy are the lower-body-day-compatible families
// (leg-driven conditioning); Core/Arm are upper-body-day-compatible;
// Rotation fits either (already appears as an accessory on BOTH a lower day
// — Med Ball Rotational Throw on Lower Strength — and an upper day — Cable/
// Band Rotational Chop on Upper Strength — in baseball's own content).
const BASEBALL_DAY_COMPAT = [
  ['sprint', 'energy', 'rotation'], // Day 1 — Lower Power
  ['core', 'arm', 'rotation'],      // Day 2 — Upper Strength
  ['sprint', 'energy', 'rotation'], // Day 3 — Lower Strength
  ['core', 'arm', 'rotation'],      // Day 4 — Upper Power
]

// `dayIndex` slots (0-3) always plan against a 4-day week — baseball's own
// 3-day layout is a literal slice of the 4-day one (see baseball3Day below,
// same precedent as the day content itself), not a separately-authored
// consolidation the way Collision/Field's 3-day layouts are, so the
// finisher plan is computed the same way. Returned as a single {header:...}
// exercise object — formatExerciseLine renders it verbatim (embedded
// newlines and all), so the engine's already-formatted block plugs straight
// into baseball's exercises-array session shape with no reformatting.
function baseballFinisher(dayIndex, info, overrides = null) {
  const bank = baseballFinisherBank(info.week, !!overrides)
  const plan = finisherEngine.planWeekFinishers('rotational', info.phaseNum, 4, { overrides, dayCompatibility: BASEBALL_DAY_COMPAT })[dayIndex]
  return { header: finisherEngine.renderFinisher(bank, plan, info.phaseNum, info.deload) }
}

// Pitcher's own position override — "more arm care + lower rotational-throw
// volume" (per the spec's own example) — differentiates Pitcher from
// Position Player by weighting only, same content bank, no new exercises.
// ±12 is the largest delta that still respects BASEBALL_DAY_COMPAT at
// every phase — past ±12, Rotation (the lower-body days' flex family
// alongside Sprint/Energy) gets suppressed hard enough that Phase 1 can be
// left with no lower-compatible family remaining, forcing a same-day
// arm-care/lower-body violation (verified by brute-force sweep 8/10/12/14/
// 16 against every phase; 14 was the first delta to violate).
const PITCHER_FINISHER_OVERRIDES = { arm: 12, rotation: -12 }

// Formats one exercise object into its "Name: SxR (note)" line. Sport-
// agnostic — any sport's session builder can use this, not just baseball's.
// { header: '...' } renders as a bare header line (e.g. a "Core — ..."
// block label) with no SxR formatting — matches the header + exercise-lines
// shape coreBlock() already writes for every other sport, just expressed as
// an object so it can live in the same exercises array.
function formatExerciseLine(e) {
  if (e.header) return e.header
  let setsReps
  if (e.ramp) {
    setsReps = e.ramp
  } else if (e.warmup) {
    setsReps = `${e.warmup} warmup, ${e.sets}x${e.reps} working`
  } else {
    setsReps = `${e.sets}x${e.reps}`
  }
  const pctStr  = (!e.ramp && e.pct) ? ` @ ${Math.round(e.pct * 100)}%` : ''
  const noteStr = e.note ? ` (${e.note})` : ''
  return `${e.name}: ${setsReps}${pctStr}${noteStr}`
}

// Generic exercise-list -> description-text builder — sport-agnostic, not
// baseball-specific, so any future sport that adopts this same object-based
// session shape gets superset support for free. Each exercise object
// supports an optional `ss: <n>` field: consecutive exercises sharing the
// same ss number are wrapped with the ⟦SS<n>⟧ marker via superset() so they
// render as one bracketed group (see SessionDescription.jsx) instead of
// standalone lines. Exercises with no `ss` field render exactly as before.
function buildSessionDescription(exercises) {
  const lines = []
  let i = 0
  while (i < exercises.length) {
    const group = exercises[i].ss
    if (group == null) {
      lines.push(formatExerciseLine(exercises[i]))
      i++
      continue
    }
    const groupExercises = []
    while (i < exercises.length && exercises[i].ss === group) {
      groupExercises.push(exercises[i])
      i++
    }
    lines.push(...superset(group, groupExercises.map(formatExerciseLine)))
  }
  return lines.join('\n')
}

// ─── Day-type warm-up blocks (baseball only) ───────────────────────────────
// Attached as session.warmup — a SEPARATE field from `description`, not text
// woven into it, deliberately: warm-ups are fixed/consistent (never rotated,
// never volume-waved, never touched by deload) so keeping them structurally
// outside `description` means none of the line-classification passes
// (accessory rotation, deload reduction, session organization, injury
// substitution) need to know warm-ups exist at all. `blueprint_weeks.sessions`
// is a JSONB column — this needs no schema migration, and blueprintService.js
// already stores whatever's on a session object as-is. Rendered client-side
// as a collapsed, tap-to-expand block (see SessionDescription.jsx) so a long
// warm-up doesn't overwhelm the session view.
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
const WARMUP_BLOCKS = {
  upper_push: UPPER_PUSH_WARMUP,
  lower_power: LOWER_POWER_WARMUP,
  squat_hinge: SQUAT_HINGE_WARMUP,
}

function makeBaseballSession(day, focus, exercises, warmupType) {
  const description = buildSessionDescription(exercises)
  const session = { day, focus, description }
  if (warmupType && WARMUP_BLOCKS[warmupType]) session.warmup = WARMUP_BLOCKS[warmupType]
  return session
}

// ─── Baseball — Position Player ────────────────────────────────────────────
// Four day-types (Lower Power, Upper Strength, Lower Strength, Upper Power),
// shared by every day-count: the 3-day split is a slice of this same
// function (Upper Power dropped, not a separately-authored hybrid — see
// baseball3Day below), and 5/6-day append Day 5 (arm care) / Day 6 (light
// mobility) on top, unchanged either way. There is exactly one place this
// content is authored now, not four.
function baseball4Day(info) {
  const w = info.week
  const r = mainLiftTopReps(info.phaseNum, 'rotational') // Change 1 — 8/6/5/4 by phase
  return [
    // LOWER POWER — Front Squat/Back Squat alternate weekly (weeklyVariant),
    // %-ramp untouched either way; contrast-paired with the phase-gated jump
    // exactly as before (content-detected, not marker-based — unaffected by
    // which squat variant is showing). Two authored accessory pairs
    // (weight 4) plus Trap Bar Jump — the day's own standalone power-move
    // exception, naturally unpaired since it's the only leftover single
    // candidate. Finisher: Bike Ladder (conditioning) — day-type-clean, no
    // core block, so no conditioning+core collision.
    makeBaseballSession('Day 1', 'Lower Power', [
      { name: weeklyVariant(w, 'Front Squat', 'Back Squat'), ramp: `${info.ramp}, ${info.pct}×${r}` },
      baseballPlyo(info.phaseNum),
      { name: 'Bulgarian Split Squat',    sets: 3, reps: '6',    note: 'each leg', ss: 1 },
      { name: 'Calf Raises',              sets: 3, reps: 'AMAP', ss: 1 },
      { name: 'Barbell Single Leg RDL',   sets: 3, reps: '8',    note: 'each leg', ss: 2 },
      { name: 'Side X Plank',             sets: 3, reps: '30s',  note: 'each side', ss: 2 },
      { name: 'Trap Bar Jump',            sets: explosiveSets(3, info.phaseNum), reps: '3',    note: `Suggested: Keep under 155lbs — ${explosiveIntent(info.phaseNum)}` },
      baseballFinisher(0, info),
    ], 'lower_power'),
    // UPPER STRENGTH — DB Bench Press stays fixed here (the bench category
    // swap lives on Upper Power instead); this day is 3 full authored pairs
    // (weight 6, baseball's raised cap), deliberately not auto-trimmed.
    // Forearm Curls + Cable/Band Rotational Chop replaces the old loose
    // rotational-power line with a real bracketed pair. Arm care moves out
    // of any pairing entirely — a standalone, unpaired 3-move circuit
    // (Arm Care — Circuit: header, exempt from the cap and deload) that is
    // this day's ONLY finisher (no separate core block — no arm-care+core
    // collision).
    makeBaseballSession('Day 2', 'Upper Strength', [
      { name: 'DB Bench Press',           sets: 4, reps: '8',    ss: 1 },
      { name: 'Tibialis Raises',          sets: 3, reps: 'AMAP', ss: 1 },
      { name: 'Gorilla Row',              sets: 4, reps: '8',    ss: 2 },
      { name: 'Lateral Raise',            sets: 3, reps: '12',   ss: 2 },
      { name: 'Forearm Curls (Both Ways)', sets: 3, reps: '10-15', ss: 3 },
      { name: 'Cable/Band Rotational Chop', sets: 3, reps: '6',  note: 'each side', ss: 3 },
      baseballFinisher(1, info),
    ], 'upper_push'),
    // LOWER STRENGTH — Trap Bar Deadlift/Reverse Lunge alternate weekly,
    // never both the same day (whichever the week selects IS the day's only
    // anchor); authored-paired with a med-ball throw (now that a %-ramped
    // line can correctly join an authored pair — see organizeSessionDescription).
    // The glute accessory tied to which anchor is live: Glute Bridge on
    // Trap Bar Deadlift weeks, Hip Thrust on Reverse Lunge weeks. Hamstring
    // Curls intentionally absent from default content — hip-injury sub
    // only (see applyHipAdjustments/applyHipSubstitutions). Sprint Tempo
    // Protocol is the sole finisher — no core block, no conditioning+core
    // collision.
    makeBaseballSession('Day 3', 'Lower Strength', [
      {
        name: weeklyVariant(w, 'Trap Bar Deadlift', 'Reverse Lunge'),
        ...(w % 2 === 1
          ? { ramp: `${info.ramp}, ${info.pct}×${r}` }
          : { sets: 3, reps: '5', note: 'each leg' }),
        ss: 1,
      },
      { name: medBallPoolVariant(w),      sets: explosiveSets(4, info.phaseNum), reps: '6',    note: `each side — ${explosiveIntent(info.phaseNum)}`, ss: 1 },
      { name: 'Single Leg RDL',           sets: 3, reps: '8',    note: 'each leg', ss: 2 },
      { name: weeklyVariant(w, 'Glute Bridge', 'Hip Thrust'), sets: 3, reps: weeklyVariant(w, '15', '8'), ss: 2 },
      { name: 'Copenhagen Adductor',      sets: 3, reps: '8',    note: 'each leg', ss: 3 },
      { name: 'Suitcase Carry',           sets: 3, reps: '20 yds', note: 'each side', ss: 3 },
      baseballFinisher(2, info),
    ], 'squat_hinge'),
    // UPPER POWER — bench variation (DB Bench Press/Incline DB Press,
    // alternating opposite parity from Upper Strength's fixed one so the
    // two upper days read distinctly) authored-paired with its iso partner,
    // both varying together. Pull-ups authored-paired with the med-ball
    // pool (5-item, offset from Lower Strength's so the two days don't
    // repeat the same movement in the same week). Triceps/biceps choose-1
    // slots (auto-rotating, deterministic) paired together. Finisher:
    // rotating core pool — no arm-care or conditioning on this day, so no
    // collision either way.
    makeBaseballSession('Day 4', 'Upper Power', [
      { name: weeklyVariant(w, 'DB Bench Press', 'Incline DB Press'), ramp: `${info.ramp}, ${info.pct}×${r}`, ss: 1 },
      { name: weeklyVariant(w, 'Bulgarian Split Squat Iso Hold', 'Long-Lever Plank Iso'), sets: 3, reps: '30s', note: weeklyVariant(w, 'each leg', undefined), ss: 1 },
      { name: 'Pull-ups',                 sets: 3, reps: 'AMAP', ss: 2 },
      { name: upperPowerMedBallVariant(w), sets: explosiveSets(4, info.phaseNum), reps: '5',   note: `each side — ${explosiveIntent(info.phaseNum)}`, ss: 2 },
      { ...rotatingChoice(TRICEP_POOL, w, 3, '10'), ss: 3 },
      { ...rotatingChoice(BICEP_POOL, w, 3, '10'), ss: 3 },
      baseballFinisher(3, info),
    ], 'upper_push'),
  ]
}

// 3-day split: the exact same Lower Power / Upper Strength / Lower Strength
// day-functions as every other day-count, just Upper Power dropped (no room
// for a 4th day-type at this frequency). This used to be its own,
// separately-authored hybrid day that jammed Upper Power content into Day 3
// — which had drifted out of compliance with the "never arm-care + core" /
// "never conditioning + core" rules. Reusing baseball4Day directly means
// every correction made there (category variation, day-type locking, the
// finisher arrangement) applies identically here with nothing to keep in
// sync by hand.
function baseball3Day(info) {
  return baseball4Day(info).slice(0, 3)
}

// Two arm-care anchors (Band External Rotation cycles Scap Push-Ups/YTW
// Raises; Face Pulls cycles Prone Swimmers/Crossover Symmetry Band Series)
// deliver the full arm-care library across the 16-week progression without
// ever hardcoding a rotation target as a separate static line (which would
// double up with whatever that anchor rotates into on a given week).
const BASEBALL_ARM_CARE = makeBaseballSession('Day 5', 'Arm Care & Conditioning', [
  { name: 'Band External Rotation',   sets: 4, reps: '15', note: 'each arm' },
  { name: 'Face Pulls',               sets: 3, reps: '15' },
  { name: 'Band Pull-Aparts',         sets: 3, reps: '20' },
  BASEBALL_SPRINT_PROTOCOL,
  { name: 'Lateral Bounds',           sets: 4, reps: '5',  note: 'each side' },
], 'upper_push')

// Day 6 (6-day plans only) — a genuinely light mobility/prehab/movement day,
// not a training-stimulus day. Rotates 4 movements at a time from
// DAY6_LIGHT_POOL, deterministic by week (same rolling-window pattern the
// core finisher uses).
function baseballDay6Session(weekNumber) {
  return makeBaseballSession('Day 6', 'Lighter Full Body — Mobility & Prehab', day6Movements(weekNumber))
}

function generateBaseballWeeks(_, goal, daysPerWeek) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = getPhaseInfo(w, BASEBALL_PHASES)

    let sessions
    if (daysPerWeek >= 4) {
      sessions = baseball4Day(info)
      if (daysPerWeek >= 5) sessions = [...sessions, BASEBALL_ARM_CARE]
      if (daysPerWeek >= 6) sessions = [...sessions, baseballDay6Session(w)]
    } else {
      sessions = baseball3Day(info).slice(0, Math.max(2, daysPerWeek))
    }

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

// ─── Baseball — Pitcher ───────────────────────────────────────────────────────
// No overhead pressing. Position difference made visible via one swapped
// exercise per day (Landmine Press instead of the bench slot on Upper
// Strength; extra hip-stability work on Lower Power in place of the
// arm-care position players can't have there under day-type locking; more
// arm-care volume, same structure, on Upper Strength's circuit). Everything
// else — category variation, pairing, finishers — is identical to position
// player's, same as before this rebuild.

function pitcher4Day(info) {
  const w = info.week
  const r = mainLiftTopReps(info.phaseNum, 'rotational') // Change 1 — 8/6/5/4 by phase
  return [
    // LOWER POWER — identical to position player's, plus Copenhagen
    // Adductor as pitcher's "enhanced hip stability" differentiator
    // (previously delivered via an extra Face Pulls touch, which day-type
    // locking no longer allows on a lower day — Copenhagen Adductor
    // preserves the differentiation without violating the new rule).
    makeBaseballSession('Day 1', 'Lower Power', [
      { name: weeklyVariant(w, 'Front Squat', 'Back Squat'), ramp: `${info.ramp}, ${info.pct}×${r}` },
      baseballPlyo(info.phaseNum),
      { name: 'Bulgarian Split Squat',    sets: 3, reps: '6',    note: 'each leg', ss: 1 },
      { name: 'Calf Raises',              sets: 3, reps: 'AMAP', ss: 1 },
      { name: 'Barbell Single Leg RDL',   sets: 3, reps: '8',    note: 'each leg', ss: 2 },
      { name: 'Side X Plank',             sets: 3, reps: '30s',  note: 'each side', ss: 2 },
      { name: 'Copenhagen Adductor',      sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Trap Bar Jump',            sets: explosiveSets(3, info.phaseNum), reps: '3',    note: `Suggested: Keep under 155lbs — ${explosiveIntent(info.phaseNum)}` },
      baseballFinisher(0, info, PITCHER_FINISHER_OVERRIDES),
    ], 'lower_power'),
    // UPPER STRENGTH AND ARM CARE — Landmine Press replaces the bench slot
    // (lower load, no direct overhead pressing); everything else matches
    // position player's structure, with higher arm-care circuit volume
    // (pitchers' established "more volume, same structure" pattern).
    makeBaseballSession('Day 2', 'Upper Strength and Arm Care', [
      { name: 'Landmine Press',           sets: 4, reps: '8',    note: 'lower load — no direct overhead pressing', ss: 1 },
      { name: 'Tibialis Raises',          sets: 3, reps: 'AMAP', ss: 1 },
      { name: 'Gorilla Row',              sets: 4, reps: '8',    ss: 2 },
      { name: 'Lateral Raise',            sets: 3, reps: '12',   ss: 2 },
      { name: 'Forearm Curls (Both Ways)', sets: 3, reps: '10-15', ss: 3 },
      { name: 'Cable/Band Rotational Chop', sets: 3, reps: '6',  note: 'each side', ss: 3 },
      baseballFinisher(1, info, PITCHER_FINISHER_OVERRIDES),
    ], 'upper_push'),
    // LOWER STRENGTH — identical to position player's.
    makeBaseballSession('Day 3', 'Lower Strength', [
      {
        name: weeklyVariant(w, 'Trap Bar Deadlift', 'Reverse Lunge'),
        ...(w % 2 === 1
          ? { ramp: `${info.ramp}, ${info.pct}×${r}` }
          : { sets: 3, reps: '5', note: 'each leg' }),
        ss: 1,
      },
      { name: medBallPoolVariant(w),      sets: explosiveSets(4, info.phaseNum), reps: '6',    note: `each side — ${explosiveIntent(info.phaseNum)}`, ss: 1 },
      { name: 'Single Leg RDL',           sets: 3, reps: '8',    note: 'each leg', ss: 2 },
      { name: weeklyVariant(w, 'Glute Bridge', 'Hip Thrust'), sets: 3, reps: weeklyVariant(w, '15', '8'), ss: 2 },
      { name: 'Copenhagen Adductor',      sets: 3, reps: '8',    note: 'each leg', ss: 3 },
      { name: 'Suitcase Carry',           sets: 3, reps: '20 yds', note: 'each side', ss: 3 },
      baseballFinisher(2, info, PITCHER_FINISHER_OVERRIDES),
    ], 'squat_hinge'),
    // UPPER POWER AND ROTATIONAL — identical to position player's; neither
    // bench variant is an overhead movement, so both stay safe under "no
    // direct overhead pressing."
    makeBaseballSession('Day 4', 'Upper Power and Rotational', [
      { name: weeklyVariant(w, 'DB Bench Press', 'Incline DB Press'), ramp: `${info.ramp}, ${info.pct}×${r}`, ss: 1 },
      { name: weeklyVariant(w, 'Bulgarian Split Squat Iso Hold', 'Long-Lever Plank Iso'), sets: 3, reps: '30s', note: weeklyVariant(w, 'each leg', undefined), ss: 1 },
      { name: 'Pull-ups',                 sets: 3, reps: 'AMAP', ss: 2 },
      { name: upperPowerMedBallVariant(w), sets: explosiveSets(4, info.phaseNum), reps: '5',   note: `each side — ${explosiveIntent(info.phaseNum)}`, ss: 2 },
      { ...rotatingChoice(TRICEP_POOL, w, 3, '10'), ss: 3 },
      { ...rotatingChoice(BICEP_POOL, w, 3, '10'), ss: 3 },
      baseballFinisher(3, info, PITCHER_FINISHER_OVERRIDES),
    ], 'upper_push'),
  ]
}

// 3-day split: same rationale as baseball3Day — reuse pitcher4Day directly,
// Upper Power and Rotational dropped, nothing separately authored.
function pitcher3Day(info) {
  return pitcher4Day(info).slice(0, 3)
}

// More volume than BASEBALL_ARM_CARE across the board (higher sets on both
// anchors, plus an extra dedicated wrist/forearm line) — pitchers get more
// arm-care volume on this dedicated day too, not just more frequency across
// the week.
const PITCHER_ARM_CARE = makeBaseballSession('Day 5', 'Arm Care & Conditioning', [
  { name: 'Band External Rotation',   sets: 5, reps: '15', note: 'each arm' },
  { name: 'Face Pulls',               sets: 4, reps: '15' },
  { name: 'Band Pull-Aparts',         sets: 4, reps: '20' },
  { name: 'Wrist Curls',              sets: 3, reps: '15' },
  BASEBALL_SPRINT_PROTOCOL,
  { name: 'Lateral Bounds',           sets: 4, reps: '5',  note: 'each side' },
], 'upper_push')

// Same rotating light-mobility pool as position player's Day 6.
function pitcherDay6Session(weekNumber) {
  return makeBaseballSession('Day 6', 'Lighter Full Body — Mobility & Prehab', day6Movements(weekNumber))
}

function generatePitcherBaseballWeeks(goal, daysPerWeek) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = getPhaseInfo(w, BASEBALL_PHASES)

    let sessions
    if (daysPerWeek >= 4) {
      sessions = pitcher4Day(info)
      if (daysPerWeek >= 5) sessions = [...sessions, PITCHER_ARM_CARE]
      if (daysPerWeek >= 6) sessions = [...sessions, pitcherDay6Session(w)]
    } else {
      sessions = pitcher3Day(info).slice(0, Math.max(2, daysPerWeek))
    }

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

function hockeyArchetypeDay1Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 1', focus: 'Lower — First-Step Explosion',
    description: `${HOCKEY_ARCHETYPE_WU_LOWER}Hang Power Clean: ${collisionOlyScheme(ph, dl)}\n` +
      `Trap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Bulgarian Split Squat: 3x6 each leg\nCopenhagen Adductor: 3x8 each leg\nSled Sprint: 6x20 yds\nHip 90/90 Hold: 3x30s each side\n\n${collisionFinisher(HOCKEY_FORWARDS_FINISHERS, 0, 4, info)}`,
  }
}

function hockeyArchetypeDay2Upper(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 2', focus: 'Upper — Puck Battle Strength',
    description: `${HOCKEY_ARCHETYPE_WU_UPPER}Single Arm DB Split Jerk: ${collisionOlyScheme(ph, dl)}, each arm\n` +
      `Bench Press: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Weighted Pull-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\n\n${collisionFinisher(HOCKEY_FORWARDS_FINISHERS, 1, 4, info)}`,
  }
}

function hockeyArchetypeDay3Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 3', focus: 'Lower — Acceleration & COD',
    description: `${HOCKEY_ARCHETYPE_WU_LOWER}Hang Clean Above the Knee: ${collisionOlyScheme(ph, dl)}\n` +
      `Front Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
      `Lateral Bound: 5x5 each side\nSplit Squat Jump: 4x5 each leg\nCossack Squat: 3x8 each side\n\n${collisionFinisher(HOCKEY_FORWARDS_FINISHERS, 2, 4, info)}`,
  }
}

function hockeyArchetypeDay4Upper(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 4', focus: 'Upper Power & Conditioning',
    description: `${HOCKEY_ARCHETYPE_WU_UPPER}BB Split Jerk: ${collisionOlyScheme(ph, dl)}\n` +
      `Close Grip Bench Press: ${buildCollisionMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
      `Weighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nBattle Rope: 4x20s\n\n${collisionFinisher(HOCKEY_FORWARDS_FINISHERS, 3, 4, info)}`,
  }
}

function hockeyArchetypeAnchor4Day(info) {
  return [hockeyArchetypeDay1Lower(info), hockeyArchetypeDay2Upper(info), hockeyArchetypeDay3Lower(info), hockeyArchetypeDay4Upper(info)]
}

function hockeyArchetype3Day(info) {
  const { phaseNum: ph, deload: dl } = info
  return [
    { day: 'Day 1', focus: 'Lower — First-Step Explosion',
      description: `${HOCKEY_ARCHETYPE_WU_LOWER}Hang Power Clean: ${collisionOlyScheme(ph, dl)}\n` +
        `Trap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
        `Bulgarian Split Squat: 3x6 each leg\nSled Sprint: 6x20 yds\nHip 90/90 Hold: 3x30s each side\n\n${collisionFinisher(HOCKEY_FORWARDS_FINISHERS, 0, 3, info)}` },
    { day: 'Day 2', focus: 'Upper (Full) — Puck Battle Strength',
      description: `${HOCKEY_ARCHETYPE_WU_UPPER}BB Split Jerk: ${collisionOlyScheme(ph, dl)}\n` +
        `Close Grip Bench Press: ${buildCollisionMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
        `Weighted Pull-ups: 4x5\n\n${collisionFinisher(HOCKEY_FORWARDS_FINISHERS, 1, 3, info)}` },
    { day: 'Day 3', focus: 'Lower — Acceleration & COD',
      description: `${HOCKEY_ARCHETYPE_WU_LOWER}Hang Clean Above the Knee: ${collisionOlyScheme(ph, dl)}\n` +
        `Front Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
        `Lateral Bound: 5x5 each side\nCossack Squat: 3x8 each side\nCopenhagen Adductor: 3x8 each leg\n\n${collisionFinisher(HOCKEY_FORWARDS_FINISHERS, 2, 3, info)}` },
  ]
}

function hockeyArchetypeDay5(info) {
  return {
    day: 'Day 5', focus: 'On-Ice Transfer & Skating Power',
    description: 'Lateral Sled Drag: 4x20 yds each direction\nSplit Squat Jump: 4x5 each leg\n' +
      'Lateral Bound: 5x5 each side\nCopenhagen Adductor: 3x8 each leg\nHip 90/90 Hold: 3x30s each side',
  }
}

function hockeyArchetypeLowerC(info) {
  const { phaseNum: ph, deload: dl } = info
  const power = weeklyVariant(info.week, 'Trap Bar Jump: 4x3 (cap 155 lbs)', `Clean Pull: ${collisionOlyScheme(ph, dl)}`)
  return {
    day: 'Lower C', focus: 'Lower — Skating Power & Hip Mobility',
    description: `${power}\nTrap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Cossack Squat: 3x8 each side\nCopenhagen Adductor: 3x8 each leg\nSled Sprint: 6x20 yds`,
  }
}

function hockeyArchetypeUpperC(info) {
  const press = weeklyVariant(info.week, 'Incline DB Press: 3x10', 'Weighted Dips: 3x10')
  return {
    day: 'Upper C', focus: 'Upper — Hypertrophy & Shoulder Health',
    description: `${press}\nChest Supported Row: 3x12\nBand External Rotation: 3x15 each arm\n` +
      `${superset(1, ['Bicep Curls: 3x12', 'Tricep Pushdowns: 3x12']).join('\n')}`,
  }
}

function generateHockeyForwardsArchetypeWeeks(daysPerWeek) {
  return generateCollisionArchetypeWeeks({
    anchor4Day: hockeyArchetypeAnchor4Day,
    threeDay: hockeyArchetype3Day,
    day5: hockeyArchetypeDay5,
    lowerC: hockeyArchetypeLowerC,
    upperC: hockeyArchetypeUpperC,
  }, daysPerWeek)
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

function hockeyDefenseArchetypeDay1(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r  = mainLiftTopReps(ph, 'rotational')
  const lb = explosiveSets(5, ph)
  return {
    day: 'Monday', focus: 'Lower — Lateral Mobility & Single Leg Stability',
    description: `Back Squat: ${info.ramp}, ${q}×${r}\nCossack Squat: 3x8 each side\nCopenhagen Adductor: 3x8 each leg\nLateral Bound: ${lb}x5 each side (${explosiveIntent(ph)})\nSingle Leg RDL: 3x8 each leg\n${fieldFinisher(HD_FINISHERS, 0, 4, info)}`,
  }
}

function hockeyDefenseArchetypeDay2(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Tuesday', focus: 'Upper — Core Stiffness & Rotational Strength',
    description: `DB Bench Press: 4x10\nSingle Arm DB Row: 4x10 each arm\nMed Ball Rotational Throw: 4x6 each side\nPallof Press: 3x12 each side\n${fieldFinisher(HD_FINISHERS, 1, 4, info)}`,
  }
}

function hockeyDefenseArchetypeDay3(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r = mainLiftTopReps(ph, 'rotational')
  return {
    day: 'Thursday', focus: 'Lower — Crossover & Backward Skating Mechanics',
    description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nLateral Sled Drag: 4x20 yds each direction\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nResistance Band Lateral Walk: 3x20 each direction\nBulgarian Split Squat: 3x6 each leg\n${fieldFinisher(HD_FINISHERS, 2, 4, info)}`,
  }
}

function hockeyDefenseArchetypeDay4(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r = mainLiftTopReps(ph, 'rotational')
  return {
    day: 'Friday', focus: 'Upper Power',
    description: `Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Pull-ups: 4x5\n${fieldFinisher(HD_FINISHERS, 3, 4, info)}`,
  }
}

function hockeyDefenseArchetypeSess(info) {
  return [hockeyDefenseArchetypeDay1(info), hockeyDefenseArchetypeDay2(info), hockeyDefenseArchetypeDay3(info), hockeyDefenseArchetypeDay4(info)]
}

function generateHockeyDefenseArchetypeWeeks(daysPerWeek) {
  return buildWeeksDynamic(16, HOCKEY_PHASES, hockeyDefenseArchetypeSess, daysPerWeek, [HOCKEY_DAY5, HOCKEY_DAY6])
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

function hockeyGoalieArchetypeDay1(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r    = mainLiftTopReps(ph, 'rotational')
  const slbj = explosiveSets(4, ph)
  return {
    day: 'Monday', focus: 'Lower Power & Butterfly Mechanics',
    description: `Back Squat: ${info.ramp}, ${q}×${r}\nCossack Squat: 3x10 each side\nSingle Leg Box Jump: ${slbj}x4 each leg (${explosiveIntent(ph)})\nCopenhagen Adductor: 4x8 each leg\nLateral Bound: 5x5 each side\n${fieldFinisher(HG_FINISHERS, 0, 4, info, HG_OVERRIDES)}`,
  }
}

function hockeyGoalieArchetypeDay2(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Tuesday', focus: 'Upper (DB Only — Protects Shoulder Joint)',
    description: `DB Bench Press: 4x10 (DB only — protects shoulder joint)\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nFace Pulls: 4x15\n${fieldFinisher(HG_FINISHERS, 1, 4, info, HG_OVERRIDES)}`,
  }
}

function hockeyGoalieArchetypeDay3(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r   = mainLiftTopReps(ph, 'rotational')
  const lsj = explosiveSets(4, ph)
  return {
    day: 'Thursday', focus: 'Reactive Lateral & Butterfly Recovery',
    description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nLateral Squat Jump: ${lsj}x5 each side (${explosiveIntent(ph)})\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nResistance Band Lateral Walk: 3x20 each direction\nCossack Squat: 3x8 each side\n${fieldFinisher(HG_FINISHERS, 2, 4, info, HG_OVERRIDES)}`,
  }
}

function hockeyGoalieArchetypeDay4(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r = mainLiftTopReps(ph, 'rotational')
  return {
    day: 'Friday', focus: 'Upper Power (Goalie Protection)',
    description: `Incline DB Press: ${info.ramp}, ${q}×${r} (DB only — protects shoulder joint)\nWeighted Pull-ups: 4x5\nFace Pulls: 3x15\n${fieldFinisher(HG_FINISHERS, 3, 4, info, HG_OVERRIDES)}`,
  }
}

function hockeyGoalieArchetypeSess(info) {
  return [hockeyGoalieArchetypeDay1(info), hockeyGoalieArchetypeDay2(info), hockeyGoalieArchetypeDay3(info), hockeyGoalieArchetypeDay4(info)]
}

function generateHockeyGoalieArchetypeWeeks(daysPerWeek) {
  return buildWeeksDynamic(16, HOCKEY_PHASES, hockeyGoalieArchetypeSess, daysPerWeek, [HOCKEY_DAY5, HOCKEY_DAY6])
}

function generateHockeyWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  if (!mg && posId === 'forwards') return generateHockeyForwardsArchetypeWeeks(daysPerWeek)
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

function rugbyArchetypeDay1Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 1', focus: 'Lower Power — Scrummage Drive',
    description: `${RUGBY_ARCHETYPE_WU_LOWER}Power Clean from floor: ${collisionOlyScheme(ph, dl)} (from floor, catch quarter squat)\n` +
      `Back Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
      `Scrum Drive: 4x10 yds\nHip Thrust: 3x10\nNordic Hamstring Curl: 3x5\n${COLLISION_NECK}\n\n${collisionFinisher(RUGBY_FORWARDS_FINISHERS, 0, 4, info)}`,
  }
}

function rugbyArchetypeDay2Upper(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 2', focus: 'Upper Strength & Contact Prep',
    description: `${RUGBY_ARCHETYPE_WU_UPPER}Single Arm DB Split Jerk: ${collisionOlyScheme(ph, dl)}, each arm\n` +
      `Bench Press: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Weighted Pull-ups: 5xAMAP\nDB Row: 4x10 each arm\nDB Shrugs: 3x12\n${COLLISION_NECK}\n\n${collisionFinisher(RUGBY_FORWARDS_FINISHERS, 1, 4, info)}`,
  }
}

function rugbyArchetypeDay3Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 3', focus: 'Lower Explosion & Carrying',
    description: `${RUGBY_ARCHETYPE_WU_LOWER}Hang Clean Above the Knee: ${collisionOlyScheme(ph, dl)} (start at hip crease, hinge to above kneecaps, explode)\n` +
      `Trap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Bulgarian Split Squat: 3x8 each leg\nSingle Leg RDL: 3x8 each leg\nFarmer Carries: 4x20 yds\nSandbag Carry: 4x20 yds\n${COLLISION_NECK}\n\n${collisionFinisher(RUGBY_FORWARDS_FINISHERS, 2, 4, info)}`,
  }
}

function rugbyArchetypeDay4Upper(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 4', focus: 'Upper Power, Contact & Rotational',
    description: `${RUGBY_ARCHETYPE_WU_UPPER}BB Split Jerk: ${collisionOlyScheme(ph, dl)}\n` +
      `Close Grip Bench Press: ${buildCollisionMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
      `Weighted Chin-ups: 4x6\nSingle Arm DB Row: 4x10 each arm\nLandmine Rotational Press: 3x6 each side\n${COLLISION_NECK}\n\n${collisionFinisher(RUGBY_FORWARDS_FINISHERS, 3, 4, info)}`,
  }
}

function rugbyArchetypeAnchor4Day(info) {
  return [rugbyArchetypeDay1Lower(info), rugbyArchetypeDay2Upper(info), rugbyArchetypeDay3Lower(info), rugbyArchetypeDay4Upper(info)]
}

function rugbyArchetype3Day(info) {
  const { phaseNum: ph, deload: dl } = info
  return [
    { day: 'Day 1', focus: 'Lower Power — Scrummage Drive',
      description: `${RUGBY_ARCHETYPE_WU_LOWER}Power Clean from floor: ${collisionOlyScheme(ph, dl)} (from floor, catch quarter squat)\n` +
        `Back Squat: ${buildCollisionMainLiftRamp(ph, dl)} (full ROM)\n` +
        `Scrum Drive: 4x10 yds\nHip Thrust: 3x10\n${COLLISION_NECK}\n\n${collisionFinisher(RUGBY_FORWARDS_FINISHERS, 0, 3, info)}` },
    { day: 'Day 2', focus: 'Upper (Full) & Contact Prep',
      description: `${RUGBY_ARCHETYPE_WU_UPPER}BB Split Jerk: ${collisionOlyScheme(ph, dl)}\n` +
        `Close Grip Bench Press: ${buildCollisionMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
        `Weighted Pull-ups: 5xAMAP\nDB Row: 4x10 each arm\n${COLLISION_NECK}\n\n${collisionFinisher(RUGBY_FORWARDS_FINISHERS, 1, 3, info)}` },
    { day: 'Day 3', focus: 'Lower Explosion & Carrying',
      description: `${RUGBY_ARCHETYPE_WU_LOWER}Hang Clean Above the Knee: ${collisionOlyScheme(ph, dl)} (start at hip crease, hinge to above kneecaps, explode)\n` +
        `Trap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
        `Bulgarian Split Squat: 3x8 each leg\nSingle Leg RDL: 3x8 each leg\nFarmer Carries: 4x20 yds\n${COLLISION_NECK}\n\n${collisionFinisher(RUGBY_FORWARDS_FINISHERS, 2, 3, info)}` },
  ]
}

function rugbyArchetypeDay5(info) {
  return {
    day: 'Day 5', focus: 'Contact Conditioning & Armor',
    description: 'Scrum Drive: 5x10 yds\nSled Push: 4x20 yds\n' +
      'Weighted Carries: Farmer / Sandbag / Rack — 3 sets each\n' +
      `${COLLISION_NECK_DEDICATED}\nGrip Work: 2 sets`,
  }
}

function rugbyArchetypeLowerC(info) {
  const { phaseNum: ph, deload: dl } = info
  const power = weeklyVariant(info.week, 'Trap Bar Jump: 4x3 (cap 155 lbs)', `Clean Pull: ${collisionOlyScheme(ph, dl)}`)
  return {
    day: 'Lower C', focus: 'Lower — Posterior Chain & Carrying',
    description: `${power}\nTrap Bar Deadlift: ${buildCollisionMainLiftRamp(ph, dl)}\n` +
      `Single Leg RDL: 3x8 each leg\nScrum Drive: 4x10 yds\nSandbag Carry: 3x20 yds\n${COLLISION_NECK}`,
  }
}

function rugbyArchetypeUpperC(info) {
  const press = weeklyVariant(info.week, 'Incline DB Press: 3x10', 'Weighted Dips: 3x10')
  return {
    day: 'Upper C', focus: 'Upper — Hypertrophy & Contact Armor',
    description: `${press}\nChest Supported Row: 3x12\nLandmine Rotational Press: 3x6 each side\n` +
      `${superset(1, ['Bicep Curls: 3x12', 'Tricep Pushdowns: 3x12']).join('\n')}\n${COLLISION_NECK}`,
  }
}

function generateRugbyForwardsArchetypeWeeks(daysPerWeek) {
  return generateCollisionArchetypeWeeks({
    anchor4Day: rugbyArchetypeAnchor4Day,
    threeDay: rugbyArchetype3Day,
    day5: rugbyArchetypeDay5,
    lowerC: rugbyArchetypeLowerC,
    upperC: rugbyArchetypeUpperC,
  }, daysPerWeek)
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

function rugbyBacksArchetypeDay1(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r  = mainLiftTopReps(ph, 'rotational')
  const lb = explosiveSets(4, ph)
  return {
    day: 'Monday', focus: 'Lower Strength & Sprint',
    description: `Back Squat: ${info.ramp}, ${q}×${r}\nSingle Leg RDL: 3x8 each leg\nNordic Hamstring Curl: 4x5\nLateral Bounds: ${lb}x5 each side (${explosiveIntent(ph)})\nGroin Plank: 3x10 each side\n${fieldFinisher(RB_FINISHERS, 0, 4, info)}`,
  }
}

function rugbyBacksArchetypeDay2(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Tuesday', focus: 'Upper Contact Strength',
    description: `Bench Press: 4x8\nWeighted Pull-ups: 4x6\nDB Row: 4x10 each arm\nOverhead Press: 3x10\nNeck Strengthening: 3x12 each direction\nFace Pulls: 3x15\n${fieldFinisher(RB_FINISHERS, 1, 4, info)}`,
  }
}

function rugbyBacksArchetypeDay3(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r  = mainLiftTopReps(ph, 'rotational')
  const lsj = explosiveSets(4, ph)
  return {
    day: 'Thursday', focus: 'Explosion, Agility & COD',
    description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: ${lsj}x5 each side (${explosiveIntent(ph)})\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nSled Sprint: 6x20 yds\n${fieldFinisher(RB_FINISHERS, 2, 4, info)}`,
  }
}

function rugbyBacksArchetypeDay4(info) {
  const { pct: q, phaseNum: ph, deload: dl } = info
  const r = mainLiftTopReps(ph, 'rotational')
  return {
    day: 'Friday', focus: 'Upper Power',
    description: `Close Grip Bench Press: ${info.ramp}, ${q}×${r} (hands at shoulder width)\nSingle Arm DB Row: 4x10 each arm\nGrip Work: 3x30s each\n${fieldFinisher(RB_FINISHERS, 3, 4, info)}`,
  }
}

function rugbyBacksArchetypeSess(info) {
  return [rugbyBacksArchetypeDay1(info), rugbyBacksArchetypeDay2(info), rugbyBacksArchetypeDay3(info), rugbyBacksArchetypeDay4(info)]
}

function generateRugbyBacksArchetypeWeeks(daysPerWeek) {
  return buildWeeksDynamic(16, RUGBY_PHASES, rugbyBacksArchetypeSess, daysPerWeek, [RUGBY_DAY5, RUGBY_DAY6])
}

function generateRugbyWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  if (!mg && posId === 'forwards') return generateRugbyForwardsArchetypeWeeks(daysPerWeek)
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

function tennisFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('rotational', info.phaseNum, 4, { hasArmCare: true })[dayIndex]
  return finisherEngine.renderFinisher(TENNIS_FINISHERS, plan, info.phaseNum, info.deload)
}

function tennisSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const dl = info.deload
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — rotational/throwing archetype, same tier as baseball
  const lsj  = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const mbrt = explosiveSets(4, ph)
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Bulgarian + Single Leg RDL remain
    { day: 'Day 1', focus: 'Lower Strength',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nSingle Leg RDL: 3x8 each leg\nLateral Bound: 4x5 each side\nCalf Raises: 3xAMAP\n${tennisFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper Strength & Balance',
      description: `Power Clean: 3x3\nBench Press: ${info.ramp}, ${q}×${r}\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nForearm Curls (both directions): 3xAMAP\n${tennisFinisher(1, info)}` },
    // Fix 3: phasePlyo as primary; Lateral Squat Jump kept (sport-specific); Depth Jump removed from ph 1-2
    { day: 'Day 3', focus: 'Explosion & Lateral Power',
      description: `Hang Clean: 3x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nLateral Squat Jump: ${lsj}x5 each side (${explosiveIntent(ph)})\nSingle Leg Box Jump: 3x4 each leg\n${tennisFinisher(2, info)}` },
    { day: 'Day 4', focus: 'Rotational Power & Shoulder Health',
      description: `Split Stance Cable Row: 3x10 each side\nLandmine Press: 3x8 each arm\nBand Pull-Aparts: 4x20\nWrist Curls: 3x15\nReverse Wrist Curls: 3x15\nCable Woodchop: 3x10 each side\n${tennisFinisher(3, info)}` },
  ]
}

const TENNIS_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Court Speed & Agility',
  description: `5-10-5 Shuttle: 6x1\nLateral Shuffle Sprint: 4x10 yds each way\nReactive Cone Drill: 4x3\nAnkle Hops: 4x20\nSingle Leg Hop & Stick: 3x5 each leg\n${coreBlock(info.phaseNum)}`,
})
const TENNIS_DAY6 = {
  day: 'Day 6', focus: 'Recovery & Shoulder Maintenance',
  description: `Foam Roll: Full body — 10 minutes\nBand External Rotation: 3x15 each arm\nYTW Series: 2x12 each\nWrist Mobility: 3x10 each direction\nThoracic Rotation: 3x10 each side\nHip Flexor Stretch: 3x45s each leg`,
}

function generateTennisWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : TENNIS_PHASES
  const fn = mg
    ? (info) => tennisSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : tennisSess
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [TENNIS_DAY5, TENNIS_DAY6])
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

function golfFinisher(dayIndex, info) {
  const plan = finisherEngine.planWeekFinishers('rotational', info.phaseNum, 3, { hasArmCare: false })[dayIndex]
  return finisherEngine.renderFinisher(GOLF_FINISHERS, plan, info.phaseNum, info.deload)
}

function golfSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — rotational/throwing archetype, same tier as baseball
  const dsj  = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Day 1', focus: 'Lower Vertical Strength & Ground Force',
      description: `Back Squat: ${info.ramp}, ${q}×${r} (explosive intent)\nHip Thrust: 3x10\nStep-Up: 3x6 each leg\nNordic Hamstring Curl: 3x5\nLandmine Thruster: 3x6 each side\nDB Squat Jump: ${dsj}x5 (${explosiveIntent(ph)})\nCore Pallof Press: 3x10 each side\nDead Bug: 3x10\n${golfFinisher(0, info)}` },
    { day: 'Day 2', focus: 'Upper & Rotational Power',
      description: `Single Arm DB Row: 4x8 each arm\nDB Bench Press: 4x8\nLandmine Press: 3x8 each arm\nSplit Stance Cable Row: 3x10 each side\nBand Pull-Aparts: 3x20\nCore Cable Woodchop: 3x10 each side\n${golfFinisher(1, info)}` },
    // Trap Bar Deadlift moved here from Day 1 — separated from Back Squat to avoid bilateral overload
    { day: 'Day 3', focus: 'Full Body Power & Posterior Chain',
      description: `Power Clean: 3x3 (explosive intent)\nTrap Bar Deadlift: 40%×10, 50%×8, ${q}×${r}\n${phasePlyo(ph)}\nLateral Bound: 4x5 each side\nSingle Leg RDL: 3x8 each leg\nCore Bird Dog: 3x10\nAnti-Rotation Press: 3x10\n${golfFinisher(2, info)}` },
  ]
}

const GOLF_DAY4 = (info) => ({
  day: 'Day 4', focus: 'Mobility & Rotation Maintenance',
  description: `Hip 90/90 Rotations: 3x10 each side\nThoracic Rotation: 3x12 each side\nLandmine Rotation: 3x10 each side\nCable Woodchop: 3x12 each side\nGlute Bridge: 3x15\nDeep Squat Hold: 3x30s\n${coreBlock(info.phaseNum)}`,
})
const GOLF_DAY5 = (info) => ({
  day: 'Day 5', focus: 'Rotational Power Peak',
  description: `Med Ball Rotational Throw: 5x6 each side\nMed Ball Slam: 4x8\nLandmine Thruster: 3x6 each side\nCable Woodchop: 4x10 each side\nSingle Leg RDL: 3x8 each leg\n${coreBlock(info.phaseNum)}`,
})
const GOLF_DAY6 = {
  day: 'Day 6', focus: 'Active Recovery',
  description: `Foam Roll: Full body — 15 minutes\nCat-Cow: 3x10\nHip 90/90 Hold: 3x45s each side\nThoracic Rotation: 3x10 each side\nDownward Dog → Cobra flow: 3x8\nDeep Glute Stretch: 3x45s each side`,
}

function generateGolfWeeks(posId, goal, daysPerWeek = 3) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : GOLF_PHASES
  const fn = mg
    ? (info) => golfSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : golfSess
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [GOLF_DAY4, GOLF_DAY5, GOLF_DAY6])
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
const HAMSTRING_REMOVE_RE = /^Good Mornings?\b/
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
const ANKLE_CALF_RE = /^(?:Calf Raises?|Seated Calf Raise|Single Leg Calf Raise|Tibialis Raises)\b/i
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

// Curated (non-random) rotation table: base accessory name -> what it becomes
// on wip 2 / wip 3. wip 1 always shows the exercise the base session template
// already prescribes (the "anchor" name), so week 1 of every phase looks
// exactly like it does today. Only movements with a safe, equivalent
// substitute (same joint pattern / same training effect) are listed —
// anything not in this table still gets the volume wave, it just doesn't
// rotate names. Keys are matched case-insensitively against the exercise name
// with surrounding whitespace trimmed.
const ACCESSORY_ROTATION = {
  'db row':                { 2: 'Chest Supported Row',   3: 'Pull-ups' },
  'pull-ups':              { 2: 'DB Row',                3: 'Chin-ups' },
  'single leg rdl':        { 2: 'Good Mornings',         3: 'Romanian Deadlift' },
  // Note: never rotate into a name on MOBILITY_EXACT_EXEMPT (e.g. "Band
  // Pull-Aparts" / "YTW Series") — those are treated as exempt warm-up work
  // by the deload pass regardless of context, so a real accessory rotated
  // into one of those names would silently stop counting as volume, and (for
  // "YTW Series" specifically) could collide with a session that already
  // prescribes it as its own distinct warm-up line.
  'face pulls':            { 2: 'Reverse Flys',          3: 'DB Row' },
  'bulgarian split squat': { 2: 'Reverse Lunge',         3: 'Walking Lunge' },
  'walking lunge':         { 2: 'Bulgarian Split Squat', 3: 'Reverse Lunge' },
  'reverse lunge':         { 2: 'Walking Lunge',         3: 'Bulgarian Split Squat' },
  'calf raises':           { 2: 'Seated Calf Raise',     3: 'Single Leg Calf Raise' },
  'db bench press':        { 2: 'Incline DB Press',      3: 'Close Grip Bench Press' },
  'incline db press':      { 2: 'Close Grip Bench Press', 3: 'DB Bench Press' },
  'lateral raise':         { 2: 'Front Raise',           3: 'Cuban Press' },
  'goblet squat':          { 2: 'Front Squat',           3: 'Box Squat' },
  'leg curl':              { 2: 'Nordic Hamstring Curl', 3: 'Single Leg RDL' },
  'db shoulder press':     { 2: 'Arnold Press',          3: 'Push Press' },
}

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
  // longer influences what survives, since nothing is cut. The loop below
  // pairs them into brackets of 2 wherever the count allows, in that same
  // original order, with any genuinely odd leftover rendering as a single
  // line instead of a bracket.
  const kept = [...candidates].sort((a, b) => a.idx - b.idx)

  let pendingSingle = null
  for (const c of kept) {
    if (c.kind === 'pair') {
      if (pendingSingle) { out.push(pendingSingle); pendingSingle = null }
      out.push(...superset(groupNum, c.lines))
      groupNum++
    } else if (pendingSingle) {
      out.push(...superset(groupNum, [pendingSingle, c.lines[0]]))
      groupNum++
      pendingSingle = null
    } else {
      pendingSingle = c.lines[0]
    }
  }
  if (pendingSingle) out.push(pendingSingle)

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

// extraRotation lets a sport merge its own rotation entries on top of the
// shared table below, taking priority when both define the same key — see
// SPORT_ACCESSORY_ROTATION near generateBlueprintForAthlete. Scoped to
// whichever call passes it; the shared ACCESSORY_ROTATION table (and every
// other sport that doesn't pass one) is completely unaffected.
function rotateAccessoryName(name, wip, extraRotation = {}) {
  const key = name.toLowerCase().trim()
  const entry = extraRotation[key] || ACCESSORY_ROTATION[key]
  if (!entry || !entry[wip]) return name
  return entry[wip]
}

function applyAccessoryProgression(weeks, extraRotation = {}, phaseRotation = {}) {
  return weeks.map(week => {
    const wip = ((week.week_number - 1) % 4) + 1
    if (wip === 4) return week // deload weeks: applyDeloadAdjustments handles volume on its own, separately

    const volumeFactor = ACCESSORY_VOLUME_WAVE[wip]
    // Change 4 — phase (not just wip) drives rotation/volume for any key
    // present in phaseRotation. Same phase math as getPhaseInfo (capped at 4).
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
            const rest = stripped.slice(colonIdx)

            // Phase-keyed rotation takes priority over the wip-based
            // rotation/wave below for any key the sport's phaseRotation
            // table lists — every other accessory (the "stable core") keeps
            // today's exact wip-based behavior, completely untouched.
            const phaseHit = resolvePhaseAccessory(name, phaseNum, phaseRotation, week.week_number)
            if (phaseHit) {
              const renamed = phaseHit.name === name ? stripped : phaseHit.name + rest
              return scaleAccessoryLineVolume(renamed, phaseHit.mult)
            }

            const rotated = rotateAccessoryName(name, wip, extraRotation)
            const renamed = rotated === name ? stripped : rotated + rest
            return scaleAccessoryLineVolume(renamed, volumeFactor)
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
const CONDITIONING_EXERCISE_RE = /^(Sprint Work|Sprint Ladder|Sprint \+ Close Out|Sprint \+ Jog Ladder|Repeat Sprint|300 Yard Shuttle|Flying 20s|17s Drill|Baseline Sprint|Defensive Slide(?: Sprint)?|Post Sprint|Box Out Drill|Shuffle Step|Full Court Sprint|V Drill|Star Drill|200m Intervals|400m [Rr]epeats|Isometric (?:Squat|Pull) Hold|Weighted Carries(?: Medley)?|Farmer Carr(?:y|ies)|Battle Rope|Wrestle-Outs|Sled Push|Sled Sprint|Sled Drag|Pro Agility(?: Drill)?|5-10-5(?: Shuttle)?|Cone Drill(?:\s*\(5-10-5\))?|Deceleration Drill|Lateral Shuffle(?: Sprint)?|T-Drill|Aerobic Finish|Tempo [Rr]un|Sprint Tempo Protocol|Bike Ladder)\b/

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
