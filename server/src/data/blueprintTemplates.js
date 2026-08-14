// ─── Server-side blueprint template generator (CommonJS) ──────────────────────
// Single source of truth for both auto-assign (generateBlueprintForAthlete) and
// the coach's manual "build from template" tool (SPORT_TEMPLATES, below).

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
// soccer. Football linemen (generateLinemenWeeks/linemenPhaseInfo) is a
// fully separate, bespoke engine and is never touched by anything below.

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
function coreBlock(phaseNum) {
  if (phaseNum === 1)
    return 'Core — Anti-Extension:\nDead Bug: 3x10 each side\nAb Wheel: 3x8\nPlank: 3x30 seconds'
  if (phaseNum === 2)
    return 'Core — Anti-Rotation:\nPallof Press: 3x10 each side\nHalf Kneeling Cable Press: 3x10 each side'
  if (phaseNum === 3)
    return 'Core — Rotational Power:\nMed Ball Rotational Throw: 4x6 each side\nCable Woodchop: 3x10 each side'
  return 'Core — Lateral Stability:\nCopenhagen Adductor: 3x8 each leg\nSuitcase Carry: 3x20 yds each side'
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

// ─── Football — Linemen (standard goal only; see fbLinemenMGSess below for
// the muscle-gain variant, which is untouched by this rebuild) ─────────────
// Adapted from a real D1 4-day upper/lower linemen program — the 4-day
// layout (linemenAnchor4Day) is the source-faithful anchor; 3/5/6-day layouts
// keep that same core with additional movements to fill the extra frequency,
// per the program design. Two targeted, linemen-only rule changes from the
// sport-wide defaults:
//   1. A raised accessory cap (5, see resolveAccessoryCapKey/SPORT_MAX_ACCESSORIES
//      above) so a day can run main power lift + main strength lift + 3-4
//      accessories (5-6 movements) instead of the sport-wide cap of 3.
//   2. Main strength lifts (Front/Back Squat, Close Grip Bench, and the
//      6-day Lower C's Trap Bar Deadlift) prescribe an OPEN rep WINDOW on
//      the top set (e.g. "80%×5-8") instead of a fixed rep count — see
//      buildLinemenMainLiftRamp. The window is just text appended after the
//      top-set %, so every existing %-based classifier (isRampedLiftLine,
//      the beginner/advanced experience-adjustment passes) already handles
//      it unchanged; addExtraTopSet above got one small, backward-compatible
//      fix (optional "-N" support) so an advanced athlete's extra top set
//      doesn't truncate the window.
// Olympic lifts (Power Clean, Hang Clean Above the Knee, BB/Single Arm DB
// Split Jerk, Clean Pull) are autoregulated — "start light and build" to a
// top set/double/single, never a %-of-max — so every one of their lines is
// deliberately written as prose (no "NxR" shape) rather than a parsed
// number, which keeps them naturally exempt from the accessory-rotation,
// volume-wave, and deload-reduction passes that only ever touch lines
// matching that shape (see isAccessoryLine).

const LINEMEN_WU_LOWER = 'Empty BB Warm-Up Complex: RDL x5 · Hang Clean x5 · Front Squat x5 · Back Squat x5\n\n'
const LINEMEN_WU_UPPER = 'Upper Body Warm-Up Series: Prone Swimmers x5 · Push-Up to Pike x5 · Band Pull-Aparts x20\n\n'

// Short 4-way neck block (flexion, extension, both lateral directions) on
// every linemen session — football-specific armor. The "Neck — ...:" header
// (see organizeSessionDescription/applyDeloadVolumeReduction above) keeps it
// exempt from the accessory cap, rotation, volume wave, and deload
// reduction — a fixed, always-kept dose every week, same treatment as a
// "Core — ...:" block.
const LINEMEN_NECK = 'Neck — 4-Way (band or manual resistance):\nNeck Flexion: 2x15\nNeck Extension: 2x15\nLateral Neck Flexion: 2x15 each side'
// Heavier dedicated neck dose for the 5-day plan's own Day 5 (see spec).
const LINEMEN_NECK_DEDICATED = 'Neck — Dedicated 4-Way (band or manual resistance):\nNeck Flexion: 3x12\nNeck Extension: 3x12\nLateral Neck Flexion: 3x12 each side'

// Main strength lift (Front Squat / Back Squat / Close Grip Bench / Trap Bar
// Deadlift) wave loading, off personal max, tied to the same phase/deload
// cadence every other sport uses (phase boundary every 4 weeks, deload on
// the 4th). Only 3 named tiers are prescribed (Accumulation/Intensification/
// Peak); Phase 4 holds at Peak's numbers rather than inventing a 4th tier,
// matching how several real programs keep the final block at peak intensity
// through to the end of an offseason.
const LINEMEN_MAIN_LIFT_SCHEMES = {
  accumulation:    { pcts: [40, 50, 60, 70, 80],     reps: [10, 8, 6, 5],    top: '5-8' },
  intensification: { pcts: [40, 53, 65, 75, 85],     reps: [10, 8, 6, 5],    top: '3-6' },
  peak:            { pcts: [40, 50, 60, 70, 80, 90], reps: [10, 8, 6, 5, 3], top: '1-4' },
  deload:          { pcts: [40, 70],                 reps: [10],            top: '5' },
}

function linemenMainLiftScheme(phaseNum, deload) {
  if (deload) return LINEMEN_MAIN_LIFT_SCHEMES.deload
  if (phaseNum <= 1) return LINEMEN_MAIN_LIFT_SCHEMES.accumulation
  if (phaseNum === 2) return LINEMEN_MAIN_LIFT_SCHEMES.intensification
  return LINEMEN_MAIN_LIFT_SCHEMES.peak // Phase 3 AND 4 hold at Peak
}

// Returns just the ramp text (no exercise name) — e.g.
// "40%×10, 50%×8, 60%×6, 70%×5, 80%×5-8" for an Accumulation-phase week, or
// "40%×10, 70%×5" (fixed, no open window) for a deload week.
function buildLinemenMainLiftRamp(phaseNum, deload) {
  const s = linemenMainLiftScheme(phaseNum, deload)
  const steps = s.pcts.slice(0, -1).map((p, i) => `${p}%×${s.reps[i]}`)
  const topPct = s.pcts[s.pcts.length - 1]
  return `${steps.join(', ')}, ${topPct}%×${s.top}`
}

// Olympic-lift autoregulated prescription — "start light and build," never a
// forced percentage. Rep scheme descends by phase: Accumulation 5x3,
// Intensification down to heavy doubles (3,3,2,2), Peak heavy singles off a
// triple (3,2,2,1,1), deload 3x3 lighter (no build).
function linemenOlyScheme(phaseNum, deload) {
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

// AMRAP Pull-Up special protocol (kept exactly, every week — this is a fixed
// live-testing protocol, not something that progresses by phase). Set 1 is
// AMRAP; the athlete looks up their own result on this chart for the
// remaining work sets. Neutral grip.
const LINEMEN_AMRAP_PULLUP =
  'Neutral-Grip Pull-Ups: Set 1 = AMRAP (record reps), then 5 work sets per your Set-1 result — ' +
  '1-5 reps→5x1 · 6-10→5x2 · 11-15→5x3 · 16-20→5x4 · 21+→5x5'

function linemenPhaseInfo(weekNumber) {
  const phaseNum = Math.min(4, Math.floor((weekNumber - 1) / 4) + 1)
  const wip = ((weekNumber - 1) % 4) + 1
  const deload = wip === 4
  const labels = ['Accumulation', 'Intensification', 'Peak', 'Peak']
  return { week: weekNumber, phaseNum, phaseLabel: labels[phaseNum - 1], wip, deload }
}

// ── 4-day anchor (source-faithful) — reused verbatim by 5-day (+Day 5) and
// 6-day (relabeled Lower A/Upper A/Lower B/Upper B, +Lower C/Upper C) ──────

function linemenDay1Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 1', focus: 'Lower Power',
    description: `${LINEMEN_WU_LOWER}Power Clean: ${linemenOlyScheme(ph, dl)} (from floor, catch quarter squat)\n` +
      `Front Squat: ${buildLinemenMainLiftRamp(ph, dl)} (full ROM)\n` +
      `Barbell RDL: 3x8\nGoblet Lateral Lunge: 3x4 each leg\nPlate Overhead Sit-Ups: 2x8-10\nDouble Leg Calf Raise: 2x10\n${LINEMEN_NECK}`,
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
    description: `${LINEMEN_WU_UPPER}Single Arm DB Split Jerk: ${linemenOlyScheme(ph, dl)}, each arm\n` +
      `Standing BB OHP: ${buildLinemenMainLiftRamp(ph, dl)}\n` +
      `${LINEMEN_AMRAP_PULLUP}\nSingle Arm DB Bench: 3x10 each arm\nInverted BB Row: 2x5 + 1 AMRAP\n${LINEMEN_NECK}`,
  }
}

function linemenDay3Lower(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 3', focus: 'Lower Strength',
    description: `${LINEMEN_WU_LOWER}Hang Clean Above the Knee: ${linemenOlyScheme(ph, dl)} (start at hip crease, hinge to above kneecaps, explode)\n` +
      `Back Squat: ${buildLinemenMainLiftRamp(ph, dl)} (full ROM)\n` +
      `Single Leg RDL: 3x8 each leg (2 DB)\nDB Step-Ups: 2x6 each leg (box below knee)\nDB Suitcase Carries: 2x20 yds each side\nSingle Leg Calf Raise: 2x10 each leg\n${LINEMEN_NECK}`,
  }
}

function linemenDay4Upper(info) {
  const { phaseNum: ph, deload: dl } = info
  return {
    day: 'Day 4', focus: 'Upper Power',
    description: `${LINEMEN_WU_UPPER}BB Split Jerk: ${linemenOlyScheme(ph, dl)}\n` +
      `Close Grip Bench Press: ${buildLinemenMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
      `Bent Over BB Row: 3x10\nSeated Single Arm DB Overhead Press: 3x10 each arm\nSeated Cable Lat Pulldown: 3x12 (underhand grip)\n${LINEMEN_NECK}`,
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
      description: `${LINEMEN_WU_LOWER}Power Clean: ${linemenOlyScheme(ph, dl)} (from floor, catch quarter squat)\n` +
        `Back Squat: ${buildLinemenMainLiftRamp(ph, dl)} (full ROM)\n` +
        `Barbell RDL: 3x8\nGoblet Lateral Lunge: 3x4 each leg\nPlate Overhead Sit-Ups: 2x8-10\nDouble Leg Calf Raise: 2x10\n${LINEMEN_NECK}` },
    { day: 'Day 2', focus: 'Upper (Full)',
      description: `${LINEMEN_WU_UPPER}BB Split Jerk: ${linemenOlyScheme(ph, dl)}\n` +
        `Close Grip Bench Press: ${buildLinemenMainLiftRamp(ph, dl)} (hands at shoulder width)\n` +
        `${LINEMEN_AMRAP_PULLUP}\nStanding BB OHP: 10/8/6/6 (building)\nBent Over BB Row: 3x10\n${LINEMEN_NECK}` },
    { day: 'Day 3', focus: 'Lower Strength',
      description: `${LINEMEN_WU_LOWER}Hang Clean Above the Knee: ${linemenOlyScheme(ph, dl)} (start at hip crease, hinge to above kneecaps, explode)\n` +
        `Front Squat: ${buildLinemenMainLiftRamp(ph, dl)} (full ROM)\n` +
        `Single Leg RDL: 3x8 each leg (2 DB)\nDB Step-Ups: 2x6 each leg (box below knee)\nDB Suitcase Carries: 2x20 yds each side\nSingle Leg Calf Raise: 2x10 each leg\n${LINEMEN_NECK}` },
  ]
}

// ── 5-day (4-day anchor + Day 5: power/athleticism/armor) ─────────────────

function linemenDay5(w) {
  return {
    day: 'Day 5', focus: 'Power, Athleticism & Armor',
    description: 'Trap Bar Jump: 4x3 (cap 155 lbs)\nBox Jumps: 3x3\nBroad Jumps: 3x3\n' +
      'Sled Push: 4x20 yds (or Prowler Push; sub Heavy Farmer Carries if unavailable)\n' +
      'Loaded Carry Mix: 3 rounds (farmer + suitcase, alternating)\n' +
      `${LINEMEN_NECK_DEDICATED}\nGrip Work: 2 sets`,
  }
}

// ── 6-day (4-day anchor relabeled Lower A/Upper A/Lower B/Upper B, +
// Lower C: posterior chain/athletic, + Upper C: hypertrophy/armor) ────────

function linemenLowerC(info, w) {
  const { phaseNum: ph, deload: dl } = info
  const power = weeklyVariant(w, 'Trap Bar Jump: 4x3 (cap 155 lbs)', `Clean Pull: ${linemenOlyScheme(ph, dl)}`)
  return {
    day: 'Lower C', focus: 'Lower — Posterior Chain & Athletic',
    description: `${power}\nTrap Bar Deadlift: ${buildLinemenMainLiftRamp(ph, dl)}\n` +
      `Bulgarian Split Squat: 3x8 each leg\nHip Thrust: 3x10\nFarmer Carries: 3x30 yds\n${LINEMEN_NECK}`,
  }
}

function linemenUpperC(w) {
  const press = weeklyVariant(w, 'Incline DB Press: 3x10', 'Weighted Dips: 3x10')
  return {
    day: 'Upper C', focus: 'Upper — Hypertrophy & Armor',
    description: `${press}\nChest Supported Row: 3x12\nLateral Raise: 3x15\nFace Pulls: 3x15\n` +
      `${superset(1, ['Bicep Curls: 3x12', 'Tricep Pushdowns: 3x12']).join('\n')}\n${LINEMEN_NECK}`,
  }
}

function relabelDays(sessions, labels) {
  return sessions.map((s, i) => ({ ...s, day: labels[i] || s.day }))
}

// Single entry point for every linemen day count. daysPerWeek < 3 falls back
// to the first 2 days of the 4-day anchor (no dedicated layout for 2 days is
// specified — same "slice the anchor" fallback every other sport already
// uses for its own low day-count options).
function generateLinemenWeeks(daysPerWeek = 4) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = linemenPhaseInfo(w)
    let sessions
    if (daysPerWeek <= 2) {
      sessions = linemenAnchor4Day(info).slice(0, 2)
    } else if (daysPerWeek === 3) {
      sessions = linemen3Day(info)
    } else if (daysPerWeek === 4) {
      sessions = linemenAnchor4Day(info)
    } else if (daysPerWeek === 5) {
      sessions = [...linemenAnchor4Day(info), linemenDay5(w)]
    } else {
      sessions = [
        ...relabelDays(linemenAnchor4Day(info), ['Lower A', 'Upper A', 'Lower B', 'Upper B']),
        linemenLowerC(info, w),
        linemenUpperC(w),
      ]
    }
    // The main-lift scheme's own top percentage (80/85/90, or 70 on a
    // deload) as the one representative number for the week — every main
    // strength lift in a given phase shares the same top %, unlike the
    // open rep WINDOW on that top set, which is genuinely different per
    // lift-scheme and isn't a single scalar worth summarizing here.
    const topScheme = linemenMainLiftScheme(info.phaseNum, info.deload)
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

function fbSkillSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'power') // Change 1 — power tier: 6/5/4/3 by phase
  const dbsj = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const mbcp = explosiveSets(4, ph)
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift, added Hip Thrust; Fix 3: phasePlyo
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WU_LOWER}Power Clean from floor: 5x3 working up\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 3x8\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\n${phasePlyo(ph)}\nLateral Bounds: 3x5 each side\n${coreBlock(ph)}${SPRINT_SKILL}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU_UPPER}Hang Clean: 4x3\nBench Press: ${info.ramp}, ${q}×${r}\nDB Incline Press: 3x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand Pull-Aparts: 3x15\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo replaces multi-plyo list
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU_LOWER}Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\n${phasePlyo(ph)}\n${coreBlock(ph)}${SPRINT_SKILL}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU_UPPER}Push Press: 4x5\nWeighted Pull-ups: 4x5\nBent Over BB Row: 4x8\nBand External Rotation: 3x15\nMed Ball Chest Pass: ${mbcp}x5 (${explosiveIntent(ph)})\n${coreBlock(ph)}` },
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
      description: `${WU_LOWER}Power Clean from floor: 5x3 working up\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 3x8\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\n${phasePlyo(ph)}\nLateral Bounds: 3x5 each side\nSled Push: 4x20 yds\n${coreBlock(ph)}${SPRINT_SKILL}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU_UPPER}Hang Clean: 4x3\nBench Press: ${info.ramp}, ${q}×${r}\nIncline DB Press: 4x8\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand Pull-Aparts: 3x15\n${coreBlock(ph)}${NECK}` },
    // Fix 3: phasePlyo replaces multi-plyo list
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU_LOWER}Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\n${phasePlyo(ph)}\n${coreBlock(ph)}${SPRINT_SKILL}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU_UPPER}Push Press: 4x5\nWeighted Pull-ups: 4x5\nBent Over BB Row: 4x8\nBand External Rotation: 3x15\nMed Ball Chest Pass: ${mbcp}x5 (${explosiveIntent(ph)})\n${coreBlock(ph)}${NECK}` },
  ]
}

function fbQBSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — rotational/speed tier: 8/6/5/4 by phase
  const mbrt = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const mbst = explosiveSets(4, ph)
  return [
    { day: 'Day 1', focus: 'Lower',
      description: `${WU_LOWER}Back Squat: ${info.ramp}, ${q}×${r}\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nHip Thrust: 4x8\nLateral Bounds: 3x5 each side\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper & Rotational',
      description: `${WU_UPPER}Hang Clean: 3x3\nDB Bench: 4x10\nPull-ups: 4xAMAP\nMed Ball Rotational Throw: ${mbrt}x6 each side (${explosiveIntent(ph)})\nBand External Rotation: 4x15 each arm\nLandmine Press: 3x8 each arm\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU_LOWER}Power Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nSingle Leg Calf Raise: 3x15\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper & Shoulder Health',
      description: `${WU_UPPER}Push Press: 4x5\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nMed Ball Side Throw: ${mbst}x6 each side (${explosiveIntent(ph)})\nBand Pull-Aparts: 4x15\nYTW Shoulder Series: 3x10 each\n${coreBlock(ph)}` },
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

function bbGuardSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const dbsj = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Day 1', focus: 'Lower Lateral & First-Step Quickness',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nLateral Step-Up: 4x8 each leg\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\nLateral Bounds: 5x5 each side\nAnkle Hops: 3x20\nCalf Raises: 4xAMAP\nDefensive Slide Sprint: 4x20 yds each direction` },
    { day: 'Day 2', focus: 'Upper',
      description: `Power Clean: 3x3\nDB Bench: 4x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Explosion, Plyos & Landing Mechanics',
      description: `${bballPlyo(ph)}\nSnap Down: 3x5\nLateral Deceleration Drill: 3x5 each side\nSingle Leg Box Jump: 2x4 each leg\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 3x5` },
    { day: 'Day 4', focus: 'Full Body Power & Court Conditioning',
      description: `Hang Clean: 4x3\nFront Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Step-Ups: 3x8 each leg\nAnkle Hops: 3x20\n${coreBlock(ph)}\n\nCourt Conditioning:\nBaseline Sprint: 10x1\nDefensive Slide: 4x full court\n17s Drill: 4x1` },
  ]
}

function bbWingsSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const aj = explosiveSets(5, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Day 1', focus: 'Lower Vertical Power',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x5 each leg\nApproach Jump: ${aj}x5 (${explosiveIntent(ph)})\n${bballPlyo(ph)}\nCalf Raises: 4xAMAP\nNordic Hamstring Curl: 3x5` },
    { day: 'Day 2', focus: 'Upper',
      description: `Power Clean: 3x3\nDB Bench: 4x10\nDB Chest Press (varied grip): 3x10\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x12 each arm\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Full Body Explosion, Landing Mechanics & Multi-Directional',
      description: `Hang Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${bballPlyo(ph)}\nDepth Drop: 3x5\nLateral Deceleration Drill: 3x3 each side\nLateral Bound: 4x5 each side\nBounding: 3x20m\nSingle Leg Box Jump: 3x4 each leg` },
    { day: 'Day 4', focus: 'Full Body Power & Conditioning',
      description: `Front Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Step-Ups: 3x8 each leg\nAnkle Hops: 3x20\n${coreBlock(ph)}\n\nCourt Conditioning:\nFull Court Sprint: 8x1\nSprint + Close Out: 6 rounds\nBaseline Defensive Slide: 4x1` },
  ]
}

function bbBigsSess(info) {
  const q  = pct(Math.min(0.93, info.f + 0.05))
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const dbsj = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Day 1', focus: 'Lower Strength & Landing Mechanics',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: ${dbsj}x5 (${explosiveIntent(ph)})\nSnap Down: 3x5\nDepth Drop: 3x5\nCalf Raises: 4xAMAP` },
    { day: 'Day 2', focus: 'Upper Volume',
      description: `Power Clean: 3x3\nDB Bench: 5x8\nWeighted Pull-ups: 5x5\nBB Row: 4x8\nOverhead Press: 4x8\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Lower Deadlift & Unilateral',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 3xAMAP` },
    { day: 'Day 4', focus: 'Full Body Power & Post Conditioning',
      description: `Hang Clean: 4x3\nClose Grip Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nDB Shrugs: 3x12\nAnkle Hops: 3x20\n${coreBlock(ph)}\n\nPost Conditioning:\nPost Sprint: 6x1 (half court · full stop)\nBox Out Drill: 3 minutes\nShuffle Step: 4x full court` },
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

// ─── Soccer ───────────────────────────────────────────────────────────────────

const SOC_SPRINT_YARDS = [50, 60, 70, 80]

function soccerGoalkeeperSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const slbj = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Power & Explosive',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nSingle Leg RDL: 3x8 each leg\nSingle Leg Box Jump: ${slbj}x4 each leg (${explosiveIntent(ph)})\nLateral Bound: 5x5 each side\nCopenhagen Adductor: 4x10 each leg\nCalf Raises: 3xAMAP\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper & Shoulder Health',
      description: `DB Bench Press: 4x10\nSingle Arm DB Row: 4x8 each arm\nOverhead Press: 3x10\nBand External Rotation: 4x15 each arm\nYTW Series: 3x10 each\nFace Pulls: 3x20\nReverse Fly: 3x15` },
    { day: 'Thursday', focus: 'Lateral Explosion & Hip Mobility',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nLateral Squat Jump: 5x5 each side\nSingle Leg Lateral Hurdle Hop: 4x5 each leg\nCossack Squat: 4x6 each side\nResistance Band Lateral Walk: 3x20 each direction\nDB Lateral Lunge: 3x8 each leg\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'Reactive Power & Conditioning',
      description: `Lateral Shuffle: 8x20 yds\nReactive Lateral Bound: 4x5 each side\nSingle Leg Squat Jump: 4x5 each leg\n300 Yard Shuttle: 2x2\nFlying 20s: 4x1\nSprint + Jog Ladder: 4 rounds up to ${sy} yards` },
  ]
}

function soccerCenterBackSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const bj = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Max Lower Strength',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nNordic Hamstring Curl: 4x5\nSingle Leg RDL: 3x8 each leg\nBroad Jump: ${bj}x3 (${explosiveIntent(ph)})\nGroin Plank: 3x10 each side\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper Contact Strength',
      description: `DB Bench Press: 5x8\nSingle Arm DB Row: 5x8 each arm\nOverhead Press: 4x8\nNeck Strengthening: 3x12 each direction\nMB Twist Throw: 4x6 each side\nFace Pulls: 3x15` },
    { day: 'Thursday', focus: 'Power, Jumping & Deceleration',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nApproach Jump: 5x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nDeceleration Drill: 6x20 yds (sprint 20 · brake · hold 2s)\nDB Lateral Lunge: 3x8 each leg\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'Acceleration & Conditioning',
      description: `Sled Push: 6x20 yds\nSprint Work: 6x30 yds @ max effort\n300 Yard Shuttle: 3x2\nFlying 20s: 4x1\nSprint + Jog Ladder: 4 rounds up to ${sy} yards` },
  ]
}

function soccerFullbackSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const lb = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Strength & Sprint',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Bounds: ${lb}x5 each side (${explosiveIntent(ph)})\nGroin Plank: 3x10 each side\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper Light & Mobility',
      description: `DB Bench Press: 3x10\nSingle Arm DB Row: 3x10 each arm\nLateral Raise: 3x12\nBanded Monster Walk: 3x10 each direction\nMB Twist Throw: 3x6 each side\nHip 90/90 Hold: 3x30s each side\nCopenhagen Adductor: 3x8 each leg` },
    { day: 'Thursday', focus: 'Explosion & Sprint Development',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: 4x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'Repeat Sprint Conditioning',
      description: `Flying 20s: 8x1\n300 Yard Shuttle: 3x2\nSprint Ladder: 10/20/30/20/10 yds — 4 rounds\nSprint + Jog Ladder: 6 rounds up to ${sy} yards\nBanded Hip Abduction: 3x15 each side` },
  ]
}

function soccerMidfielderSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const hbj = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Strength & Aerobic Base',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 4x5\nHex Bar Jumps: ${hbj}x6 (${explosiveIntent(ph)})\nSingle Leg RDL: 3x8 each leg\nHip Thrust: 4x8\nGroin Plank: 3x10 each side\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper & Work Capacity',
      description: `DB Bench Press: 4x8\nSingle Arm DB Row: 4x8 each arm\nLateral Raise: 3x12\nMB Twist Throw: 4x6 each side\nKneeling Single Arm Lat Pulldown: 3x8 each arm\nBanded Monster Walk: 3x10 each direction\nPush-up: 3xAMAP` },
    { day: 'Thursday', focus: 'Explosion & Change of Direction',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: 4x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nV Drill: 4x3\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'High Volume Conditioning',
      description: `V Drill: 4x3\nStar Drill: 3x3\n300 Yard Shuttle: 3x2\nFlying 20s: 6x1\nSprint + Jog Ladder: 6 rounds up to ${sy} yards\nAerobic Finish: 10 min tempo run` },
  ]
}

function soccerWingerSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const ah = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Speed-Strength & Horizontal Force',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nReverse Lunge: 3x5 each leg\nNordic Hamstring Curl: 4x5\nAnkle Hops: ${ah}x20 (${explosiveIntent(ph)})\nLateral Bounds: 5x5 each side\nCalf Raises: 4xAMAP\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper Light & Accessory',
      description: `DB Bench Press: 3x10\nSingle Arm DB Row: 3x10 each arm\nLateral Raise: 3x12\nMB Twist Throw: 3x6 each side\nBanded Monster Walk: 3x10 each direction\nCopenhagen Adductor: 3x8 each leg` },
    { day: 'Thursday', focus: 'Vertical Strength & Reactive Speed',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nSingle Leg Lateral Hurdle Hop: 4x5 each leg\nLateral Squat Jump: 4x5\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'Speed & Game-Pace Conditioning',
      description: `Flying 20s: 8x1\nSprint Ladder: 10/20/30/20/10 yds — 4 rounds\n300 Yard Shuttle: 2x2\nSprint + Jog Ladder: 8 rounds up to ${sy} yards` },
  ]
}

function soccerStrikerSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — 8/6/5/4 by phase
  const aj = explosiveSets(5, ph) // Change 3 — explosive volume by phase
  return [
    { day: 'Monday', focus: 'Lower Vertical Power & Jump Height',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\nNordic Hamstring Curl: 4x5\nApproach Jump: ${aj}x5 (${explosiveIntent(ph)})\nSingle Leg Box Jump: 3x4 each leg\nCopenhagen Adductor: 3x8 each leg\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper & Rotational Power',
      description: `DB Bench Press: 4x8\nSingle Arm DB Row: 4x8 each arm\nMB Twist Throw: 4x6 each side\nMed Ball Overhead Slam: 4x8\nOverhead Press: 3x10\nBanded Monster Walk: 3x10 each direction` },
    { day: 'Thursday', focus: 'Explosive Speed, Horizontal Power & Shot Drive',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×${r}\nHex Bar Jumps: 4x5\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: 4x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nSled Sprint: 6x20 yds\nRotational Cable Pull: 3x8 each side\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'Power & Game-Speed Conditioning',
      description: `Flying 20s: 6x1\nBroad Jump: 3x3\n300 Yard Shuttle: 2x2\nSprint Ladder: 10/20/30/20/10 yds — 3 rounds\nSprint + Jog Ladder: 4 rounds up to ${sy} yards` },
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

function generateWrestlingWeeks(_, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : WR_PHASES
  const fn = mg
    ? (info) => wrestlingSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : wrestlingSess
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [WR_DAY5, WR_DAY6])
}

// ─── Volleyball ───────────────────────────────────────────────────────────────

function volleyballSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — vertical/jump/court archetype, same tier as basketball
  const aj = explosiveSets(5, ph) // Change 3 — explosive volume by phase
  return [
    // Fix 3: phasePlyo replaces Box Jump + Depth Jump multi-list
    { day: 'Day 1', focus: 'Lower Power, Landing Mechanics & Patellar Tendon Prehab',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x5 each leg\n${phasePlyo(ph)}\nSnap Down: 3x5\nDepth Drop: 3x5\nSingle Leg Box Jump: 3x5 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 4xAMAP` },
    { day: 'Day 2', focus: 'Upper & Shoulder Health',
      description: `DB Bench: 4x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand External Rotation: 4x15 each arm\nYTW Series: 3x10 each\nOverhead Press: 3x10\nFace Pulls: 3x15` },
    { day: 'Day 3', focus: 'Full Body Explosion',
      description: `Power Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\nApproach Jump: ${aj}x5 (${explosiveIntent(ph)})\nLateral Bounds: 4x5 each side\nHip Thrust: 4x8\nBand Pull-Aparts: 3x20\n${coreBlock(ph)}` },
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

function trackSprintSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — non-contact speed archetype, same tier as football QB/basketball/soccer
  const bnd = explosiveSets(3, ph) // Change 3 — explosive volume by phase
  return [
    // Fix 3: phasePlyo replaces Box Jump + Broad Jump list
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 5x3\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\n${phasePlyo(ph)}\nSingle Leg RDL: 3x8 each leg\nCopenhagen Adductor: 3x8 each leg\nBanded Hip Flexion: 3x12 each leg\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nPull-ups: 4xAMAP\nDB Row: 3x12\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo as primary; Bounding + Wicket Drills are sprint-specific, kept
    { day: 'Day 3', focus: 'Explosion',
      description: `Hang Clean: 4x3\nFront Squat: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nBounding: ${bnd}x20m (${explosiveIntent(ph)})\nWicket Drills: 3x30m\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Posterior Chain',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x10\nSingle Leg Calf Raise: 4xAMAP\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
  ]
}

function trackThrowSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — rotational/throwing archetype, same tier as baseball/golf/tennis
  const mbrt2 = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const mbrt4 = explosiveSets(4, ph)
  return [
    // Fix 1: Day 1 is now a squat day — Trap Bar Deadlift moved to Day 3
    { day: 'Day 1', focus: 'Lower Power — Squat',
      description: `Power Clean from floor: 5x3 working up, last set AMAP\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 3x8\nGoblet Lateral Lunge: 3x4 each leg\nDouble Leg Calf Raise: 3x15\nGrip Work: 3x30s each (plate pinch · towel hang)\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper Strength, Rotational & Shoulder Health',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nPull-ups: 4xAMAP\nBB Row: 4x8\nOverhead Press: 4x8\nMed Ball Rotational Throw: ${mbrt2}x6 each side (${explosiveIntent(ph)})\nRotational Cable Throw: 4x8 each side\nBand External Rotation: 3x15 each arm\nYTW Shoulder Series: 3x10 each\nFace Pulls: 3x15\n${coreBlock(ph)}` },
    // Trap Bar DL is primary; RDL removed (flagged: TBD + RDL); Hip Thrust replaces it
    { day: 'Day 3', focus: 'Lower Strength — Deadlift',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nDB Step-Ups: 3x6 each leg\nHip Thrust: 3x10\nNordic Hamstring Curl: 3x5\nSingle Leg Calf Raise: 3x12\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power, Rotational & Shoulder Health',
      description: `Push Press: 4x5\nClose Grip Bench Press: ${info.ramp}, ${q}×${r}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Rotational Throw: ${mbrt4}x6 each side (${explosiveIntent(ph)})\nRotational Cable Throw: 4x8 each side\nBand External Rotation: 3x15 each arm\nFace Pulls: 3x15\n${coreBlock(ph)}` },
  ]
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
      description: `Power Clean: 5x3\nBack Squat: ${info.ramp}, ${q}×${r}\nHip Thrust: 4x8\n${phasePlyo(ph)}${singleLegDepth}\nSingle Leg RDL: 3x8 each leg\nTerminal Knee Extension: 3x15 each leg\nApproach Jump Work: 3 sets\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: ${info.ramp}, ${q}×${r}\nPull-ups: 4xAMAP\nDB Row: 3x12\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    // Fix 3: phasePlyo as primary; jump-specific drills kept; Single Leg Broad Jump phases 2+
    { day: 'Day 3', focus: 'Explosion — Jumps Focus',
      description: `Hang Clean: 4x3\nFront Squat: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nBounding: 3x20m${ph >= 2 ? '\nSingle Leg Broad Jump: 3x3 each leg' : ''}\nSingle Leg Box Jump: ${slbj}x5 each leg (${explosiveIntent(ph)})\nApproach Jump Work: 3 sets\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Posterior Chain',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×${r}\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x10\nSingle Leg Calf Raise: 4xAMAP\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
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

function xcSess(deload = false) {
  const lo = deload ? Math.round(65 * (1 - DELOAD_PCT_CUT)) : 65
  const hi = deload ? Math.round(70 * (1 - DELOAD_PCT_CUT)) : 70
  return [
    { day: 'Day 1', focus: 'Lower (Low Load)',
      description: `Back Squat: 3x8 @ ${lo}-${hi}% only — no heavy loading\nSingle Leg RDL: 3x10 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 4xAMAP\nHip Thrust: 3x12\nCopenhagen Adductor: 3x8 each leg\nDead Bug: 3x10 each side\nPlank: 3x30 seconds` },
    { day: 'Day 2', focus: 'Full Body Light',
      description: `Trap Bar Deadlift: 3x8 @ ${lo}-${hi}% only — no heavy loading\nGoblet Squat: 3x12\nPull-ups: 3xAMAP\nPush-ups: 3xAMAP\nBand Work: Hip Abduction · External Rotation — 3x15 each\nCore Circuit: 3 rounds` },
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
    const base  = xcSess(isDeload)
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

function generateLacrosseWeeks(_, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : STD_PHASES
  const fn = mg
    ? (info) => lacrosseSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : lacrosseSess
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [LAX_DAY5, LAX_DAY6])
}

// ─── Swimming ─────────────────────────────────────────────────────────────────

const SWIM_PHASE_LABELS = ['Base Dryland', 'Build Dryland', 'Strength Dryland', 'Peak Dryland']

function swimSess(phaseNum) {
  const sets = phaseNum <= 2 ? 3 : 4
  const s = (n) => `${sets}x${n}`
  return [
    { day: 'Day 1', focus: 'Upper & Posterior Chain',
      description: `Trap Bar Deadlift: ${s(8)} @ moderate load\nPull-ups: ${s('AMAP')}\nDB Row: ${s(12)}\nBand External Rotation: ${s(15)} each arm\nYTW Series: ${sets}x10 each\nPush-ups: ${s('AMAP')}\nFace Pulls: ${s(15)}` },
    { day: 'Day 2', focus: 'Lower',
      description: `Back Squat: ${s(8)} @ moderate load\nGoblet Squat: ${s(12)}\nSingle Leg RDL: ${s(10)} each leg\nHip Thrust: ${s(12)}\nPlank variations: ${sets}x45s\nDead Bug: ${s(10)} each side\nBird Dog: ${s(10)} each side` },
    { day: 'Day 3', focus: 'Full Dryland',
      description: `Lat Pulldown: ${s(12)}\nDB Bench: ${s(12)}\nShoulder Press: ${s(12)}\nPull-ups: ${s('AMAP')}\nBand Pull-Aparts: 4x20\nCore Circuit: 3 rounds` },
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
const BASEBALL_SPRINT_PROTOCOL = {
  name: 'Sprint Tempo Protocol', sets: 5, reps: '1',
  note: '30 yds stride @ 75%, jog back @ 50%, 30 yds stride @ 75%, walk back = 1 rep',
}

// Conditioning finisher for Lower Power — classified as conditioning by
// CONDITIONING_EXERCISE_RE below (exempt from the accessory cap and deload
// reduction, same as Sprint Tempo Protocol). A single 3-set interval ladder,
// not a multi-exercise block — same "one real prescription is a complete
// finisher" precedent Sprint Tempo Protocol already sets.
const BIKE_LADDER = {
  name: 'Bike Ladder', sets: 3, reps: '1',
  note: '10s on/20s off, 15s/15s, 20s/10s, 15s/15s, 10s/20s',
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
      BIKE_LADDER,
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
      { header: 'Arm Care — Circuit:' },
      { name: 'Band Pull-Aparts',         sets: 3, reps: '20' },
      { name: 'Band External Rotation',   sets: 3, reps: '15',   note: 'each arm' },
      { name: 'Face Pulls',               sets: 3, reps: '15' },
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
      BASEBALL_SPRINT_PROTOCOL,
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
      ...baseballCoreFinisher(w),
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
      BIKE_LADDER,
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
      { header: 'Arm Care — Circuit:' },
      { name: 'Band Pull-Aparts',         sets: 4, reps: '20' },
      { name: 'Band External Rotation',   sets: 4, reps: '15',   note: 'each arm' },
      { name: 'Face Pulls',               sets: 4, reps: '15' },
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
      BASEBALL_SPRINT_PROTOCOL,
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
      ...baseballCoreFinisher(w),
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

function generateHockeyWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
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

function generateRugbyWeeks(posId, goal, daysPerWeek = 4) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : RUGBY_PHASES
  const baseFns = { forwards: rugbyForwardsSess, backs: rugbyBacksSess }
  const baseFn = baseFns[posId] || rugbyForwardsSess
  const fn = mg
    ? (info) => baseFn(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : baseFn
  return buildWeeksDynamic(16, phases, fn, daysPerWeek, [RUGBY_DAY5, RUGBY_DAY6])
}

// ─── Tennis ───────────────────────────────────────────────────────────────────

function tennisSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — rotational/throwing archetype, same tier as baseball
  const lsj  = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const mbrt = explosiveSets(4, ph)
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Bulgarian + Single Leg RDL remain
    { day: 'Day 1', focus: 'Lower Strength',
      description: `Back Squat: ${info.ramp}, ${q}×${r}\nBulgarian Split Squat: 3x6 each leg\nSingle Leg RDL: 3x8 each leg\nLateral Bound: 4x5 each side\nCalf Raises: 3xAMAP` },
    { day: 'Day 2', focus: 'Upper Strength & Balance',
      description: `Power Clean: 3x3\nBench Press: ${info.ramp}, ${q}×${r}\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nBand External Rotation: 4x15 each arm\nYTW Series: 3x10 each\nForearm Curls (both directions): 3xAMAP` },
    // Fix 3: phasePlyo as primary; Lateral Squat Jump kept (sport-specific); Depth Jump removed from ph 1-2
    { day: 'Day 3', focus: 'Explosion & Lateral Power',
      description: `Hang Clean: 3x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×${r}\n${phasePlyo(ph)}\nLateral Squat Jump: ${lsj}x5 each side (${explosiveIntent(ph)})\nSingle Leg Box Jump: 3x4 each leg\nMed Ball Rotational Throw: ${mbrt}x6 each side (${explosiveIntent(ph)})` },
    { day: 'Day 4', focus: 'Rotational Power & Shoulder Health',
      description: `Rotational Cable Pull: 4x8 each side\nSplit Stance Cable Row: 3x10 each side\nLandmine Press: 3x8 each arm\nBand Pull-Aparts: 4x20\nWrist Curls: 3x15\nReverse Wrist Curls: 3x15\nCore Pallof Press: 3x10 each side\nCable Woodchop: 3x10 each side` },
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

function golfSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const r  = mainLiftTopReps(ph, 'rotational') // Change 1 — rotational/throwing archetype, same tier as baseball
  const dsj  = explosiveSets(4, ph) // Change 3 — explosive volume by phase
  const rms  = explosiveSets(4, ph)
  return [
    { day: 'Day 1', focus: 'Lower Vertical Strength & Ground Force',
      description: `Back Squat: ${info.ramp}, ${q}×${r} (explosive intent)\nHip Thrust: 3x10\nStep-Up: 3x6 each leg\nNordic Hamstring Curl: 3x5\nLandmine Thruster: 3x6 each side\nDB Squat Jump: ${dsj}x5 (${explosiveIntent(ph)})\nCore Pallof Press: 3x10 each side\nDead Bug: 3x10` },
    { day: 'Day 2', focus: 'Upper & Rotational Power',
      description: `Single Arm DB Row: 4x8 each arm\nDB Bench Press: 4x8\nLandmine Press: 3x8 each arm\nSplit Stance Cable Row: 3x10 each side\nRotational Cable Pull: 4x8 each side\nMed Ball Rotational Throw: 4x6 each side\nBand Pull-Aparts: 3x20\nCore Cable Woodchop: 3x10 each side` },
    // Trap Bar Deadlift moved here from Day 1 — separated from Back Squat to avoid bilateral overload
    { day: 'Day 3', focus: 'Full Body Power & Posterior Chain',
      description: `Power Clean: 3x3 (explosive intent)\nTrap Bar Deadlift: 40%×10, 50%×8, ${q}×${r}\n${phasePlyo(ph)}\nLateral Bound: 4x5 each side\nSingle Leg RDL: 3x8 each leg\nRotational Med Ball Slam: ${rms}x6 each side (${explosiveIntent(ph)})\nCore Bird Dog: 3x10\nAnti-Rotation Press: 3x10` },
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

function applyShoulderAdjustments(description, focus) {
  const lines = description.split('\n').map(line => withMarkerPreserved(line, stripped => {
    if (/^Overhead Press\b/.test(stripped)) {
      const renamed = stripped.replace(/^Overhead Press/, 'Landmine Press')
      const scaled = scaleAllPercentages(renamed, 0.70)
      // Overhead Press is never percentage-ramped in these templates (plain
      // sets x reps), so there's usually no numeric max to scale — make the
      // load reduction explicit as text instead of silently doing nothing.
      return scaled === renamed ? `${renamed} (70% of your usual Overhead Press load)` : scaled
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
      return scaleAllPercentages(stripped.replace(/^Back Squat/, 'Goblet Squat'), 0.60)
    }
    // Front Squat carries the same knee-loading concern as Back Squat but
    // never got the same substitution — a pre-existing gap that matters
    // more now that baseball's category variation puts Front Squat into
    // regular weekly rotation. Same target, same 0.60 scale-down.
    if (/^Front Squat\b/.test(stripped)) {
      return scaleAllPercentages(stripped.replace(/^Front Squat/, 'Goblet Squat'), 0.60)
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
      return stripped.replace(/^Bulgarian Split Squat/, 'Reverse Lunge') + ' (reduced load)'
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
        return scaleAllPercentages(stripped.replace(/^Trap Bar Deadlift/, 'Romanian Deadlift'), 0.70)
      }
      if (/^Hex Bar Deadlift\b/.test(stripped)) {
        return scaleAllPercentages(stripped.replace(/^Hex Bar Deadlift/, 'Romanian Deadlift'), 0.70)
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
    // hip-related injury flag (there's no dedicated "Hamstring" injury area
    // in the app today, so this rides on the existing Hip area).
    if (/^Single Leg RDL\b/.test(stripped)) {
      return stripped.replace(/^Single Leg RDL/, 'Hamstring Curls')
    }
    const m = stripped.match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
    if (m && /\bLunge\b/i.test(m[1])) {
      const [, name, sets, reps, rest] = m
      const newSets = Math.max(1, Math.round(parseInt(sets, 10) * 0.50))
      return `${name}: ${newSets}x${reps}${rest}`
    }
    return stripped
  })).join('\n')
}

function applyInjuryAdjustments(weeks, injuryAreasRaw) {
  const areas = new Set(normalizeInjuryAreas(injuryAreasRaw))
  if (areas.size === 0) return weeks

  return weeks.map(week => ({
    ...week,
    sessions: week.sessions.map(session => {
      const original = session.description
      let description = original

      if (areas.has('Shoulder')) description = applyShoulderAdjustments(description, session.focus)
      if (areas.has('Knee'))     description = applyKneeAdjustments(description)
      if (areas.has('Back'))     description = applyBackAdjustments(description)
      if (areas.has('Hip'))      description = applyHipAdjustments(description)

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

// ─── Session organization: volume cap + pairing (all sports) ──────────────
// Every sport's session templates were authored densely — main lift plus
// 5-8+ accessories on a single day. This pass runs FIRST in the pipeline
// (before accessory rotation/wave/deload), on the fixed, freshly-generated
// template content, so a cutting decision is based on which physical
// "slot" exists in the template, not on what a line happens to be rotated
// into for a particular week — keeps the same slot surviving or getting
// cut consistently across all 16 weeks.
//
// Reorganizes each day into: any inline warm-up preamble a sport already
// writes (untouched, wherever it is), the main lift alone — UNLESS the day
// has exactly one plyo/jump line, the one approved exception: bracketed
// with the main lift as a contrast superset (heavy lift first, so it
// potentiates the jump) — up to 3 remaining accessories (a pre-existing
// hand-authored pair, e.g. baseball's press + iso-hold superset, is kept
// as an atomic, always-first-priority 2-slot unit; everything else is cut
// down by priority, least sport-specific first, then paired into brackets
// of 2), conditioning work, and the core block(s) — always last.

const MAX_ACCESSORIES = 3

// Per-sport override of MAX_ACCESSORIES. Baseball's rebuilt content is
// deliberately denser (up to 3 full authored pairs on Upper Strength,
// intentionally not auto-trimmed) — scoped to baseball/softball only, every
// other sport keeps the default cap of 3 untouched.
const SPORT_MAX_ACCESSORIES = {
  baseball: 6,
  softball: 6,
  // Football linemen only (see resolveAccessoryCapKey below) — a day runs
  // main power lift + main strength lift + 3-4 accessories (5-6 movements
  // total), one tick above the sport-wide default of 3. Every other football
  // position (skill/hybrid/qb) still resolves to the default cap untouched.
  football_linemen: 5,
}

// Football's shared MAX_ACCESSORIES cap is raised for linemen only — never
// for skill/hybrid/qb, and never for a muscle-gain linemen blueprint (that
// goal still runs the older, denser fbLinemenMGSess template, which was
// already calibrated against the default cap; leaving it there avoids
// re-tuning content this task didn't touch). Both call sites that organize
// a football blueprint (auto-assign below, and blueprintController.js's
// manual "build from template" tool) must resolve the same key for the
// same inputs, so this is the one place that decision is made.
function resolveAccessoryCapKey(sport, posId, goal) {
  if (sport === 'football' && posId === 'linemen' && goal !== 'muscle_gain') return 'football_linemen'
  return sport
}

// Change 4's per-sport phase-rotation lookup key. SPORT_ACCESSORY_ROTATION/
// applyAccessoryProgression's `extraRotation`/`phaseRotation` params are only
// ever resolved once per sport at the call site (no posId in the lookup) —
// fine for baseball/basketball/soccer, where every position shares
// content-compatible accessory names, but football is NOT uniform: skill/
// hybrid/qb are the 3 positions this rebuild targets, while linemen (any
// goal) runs the fully separate, bespoke generateLinemenWeeks/
// linemenPhaseInfo engine and must never see Change 4's phase table — it
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
    // accessory cap. No existing template emits a line starting "Neck —",
    // so this is purely additive for every other sport.
    if (/^(Core|Arm Care|Neck)\s*—/.test(bare)) { inCoreBlock = true; coreLines.push(raw); i++; continue }
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

  // Cap the combined pool of authored pairs + loose accessories to
  // MAX_ACCESSORIES total slots, by priority (0 = pre-existing pair or
  // sport-specific/protected, 1 = normal, 2 = generic filler), stable on
  // original position within a tier. Then restore original relative order
  // before re-pairing, so a kept pair's lines and any surviving loose
  // accessories still read in a sensible sequence.
  const kept = [...candidates]
    .sort((a, b) => a.priority - b.priority || a.idx - b.idx)
    .reduce((acc, c) => {
      const used = acc.reduce((sum, k) => sum + k.weight, 0)
      if (used + c.weight <= maxAccessories) acc.push(c)
      return acc
    }, [])
    .sort((a, b) => a.idx - b.idx)

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
    if (isConditioningLine(line) || isPlyoLine(line)) continue

    const bareLine = line.replace(SUPERSET_MARKER_RE, '')
    // "Arm Care — ...:" / "Neck — ...:" get the same exempt-block treatment
    // as "Core — ...:" (see organizeSessionDescription) — a standalone
    // circuit finisher isn't volume-waved or deload-reduced any more than
    // the core block is.
    if (/^(Core|Arm Care|Neck)\s*—/.test(bareLine)) {
      inCoreBlock = true
      kept.push(line)
      continue
    }
    if (line === '') {
      inCoreBlock = false
      kept.push(line)
      continue
    }

    const colonIdx = bareLine.indexOf(':')
    const name = colonIdx > 0 ? bareLine.slice(0, colonIdx) : bareLine
    if (inCoreBlock || isMobilityCoreExempt(name)) {
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
