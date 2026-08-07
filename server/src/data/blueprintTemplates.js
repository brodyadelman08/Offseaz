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
  return { phaseNum: idx + 1, phaseLabel: ph.label, f: f2, pct: pct(f2), wip, deload, ramp: buildRamp(f2) }
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
const FB_PHASES = [
  { label: 'Accumulation',   low: 0.65, high: 0.75 },
  { label: 'Strength Build', low: 0.75, high: 0.82 },
  { label: 'Peak Strength',  low: 0.82, high: 0.88 },
  { label: 'Maximum Output', low: 0.88, high: 0.93 },
]
const BB_PHASES = [
  { label: 'Foundation',        low: 0.65, high: 0.72 },
  { label: 'Strength',          low: 0.72, high: 0.80 },
  { label: 'Power Conversion',  low: 0.80, high: 0.85 },
  { label: 'Peak',              low: 0.85, high: 0.88 },
]
const SOC_PHASES = [
  { label: 'Foundation',     low: 0.65, high: 0.72 },
  { label: 'Strength',       low: 0.72, high: 0.80 },
  { label: 'Power-Strength', low: 0.80, high: 0.85 },
  { label: 'Peak',           low: 0.85, high: 0.88 },
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

function fbLinemenSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift, added Hip Thrust for posterior chain
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WU_LOWER}Power Clean from floor: 5x3 working up, last set AMAP\nBack Squat: ${info.ramp}, ${q}×3\nHip Thrust: 4x8\nGoblet Lateral Lunge: 3x4 each leg\nDouble Leg Calf Raise: 3x15\n${coreBlock(ph)}${SPRINT_STD}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU_UPPER}Hang Clean: 4x3\nBench Press: ${info.ramp}, ${q}×3\nIncline DB Press: 4x8\nWeighted Pull-ups: 4x5\nBB Row: 4x8\nTricep Pushdowns: 3x12\nFace Pulls: 3x15${NECK}` },
    // Hinge day — separated from the Day 1 squat day; no accessory deadlift here
    { day: 'Day 3', focus: 'Lower Strength',
      description: `${WU_LOWER}Trap Bar Deadlift: ${info.ramp}, ${q}×3\nDB Step-Ups: 3x6 each leg\nDB Suitcase Carries: 3x20 yds each side\nSingle Leg Calf Raise: 3x12\nNordic Hamstring Curl: 3x5${SPRINT_STD}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU_UPPER}BB Split Jerk: 4x3 working up\nClose Grip Bench Press: ${info.ramp}, ${q}×3\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 4x8\nDB Shrugs: 3x12\nSled Push: 6x20 yds${NECK}` },
  ]
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
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift, added Hip Thrust; Fix 3: phasePlyo
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WU_LOWER}Power Clean from floor: 5x3 working up\nBack Squat: ${info.ramp}, ${q}×3\nHip Thrust: 3x8\nDB Squat Jumps: 4x5\n${phasePlyo(ph)}\nLateral Bounds: 3x5 each side\n${coreBlock(ph)}${SPRINT_SKILL}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU_UPPER}Hang Clean: 4x3\nBench Press: ${info.ramp}, ${q}×3\nDB Incline Press: 3x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand Pull-Aparts: 3x15\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo replaces multi-plyo list
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU_LOWER}Trap Bar Deadlift: ${info.ramp}, ${q}×3\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: 4x5\n${phasePlyo(ph)}\n${coreBlock(ph)}${SPRINT_SKILL}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU_UPPER}Push Press: 4x5\nWeighted Pull-ups: 4x5\nBent Over BB Row: 4x8\nBand External Rotation: 3x15\nMed Ball Chest Pass: 4x5\n${coreBlock(ph)}` },
  ]
}

function fbHybridSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift, added Hip Thrust; Fix 3: phasePlyo
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WU_LOWER}Power Clean from floor: 5x3 working up\nBack Squat: ${info.ramp}, ${q}×3\nHip Thrust: 3x8\nDB Squat Jumps: 4x5\n${phasePlyo(ph)}\nLateral Bounds: 3x5 each side\nSled Push: 4x20 yds\n${coreBlock(ph)}${SPRINT_SKILL}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU_UPPER}Hang Clean: 4x3\nBench Press: ${info.ramp}, ${q}×3\nIncline DB Press: 4x8\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand Pull-Aparts: 3x15\n${coreBlock(ph)}${NECK}` },
    // Fix 3: phasePlyo replaces multi-plyo list
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU_LOWER}Trap Bar Deadlift: ${info.ramp}, ${q}×3\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: 4x5\n${phasePlyo(ph)}\n${coreBlock(ph)}${SPRINT_SKILL}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU_UPPER}Push Press: 4x5\nWeighted Pull-ups: 4x5\nBent Over BB Row: 4x8\nBand External Rotation: 3x15\nMed Ball Chest Pass: 4x5\n${coreBlock(ph)}${NECK}` },
  ]
}

function fbQBSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  return [
    { day: 'Day 1', focus: 'Lower',
      description: `${WU_LOWER}Back Squat: ${info.ramp}, ${q}×3\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nHip Thrust: 4x8\nLateral Bounds: 3x5 each side\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper & Rotational',
      description: `${WU_UPPER}Hang Clean: 3x3\nDB Bench: 4x10\nPull-ups: 4xAMAP\nMed Ball Rotational Throw: 4x6 each side\nBand External Rotation: 4x15 each arm\nLandmine Press: 3x8 each arm\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU_LOWER}Power Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nSingle Leg Calf Raise: 3x15\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper & Shoulder Health',
      description: `${WU_UPPER}Push Press: 4x5\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nMed Ball Side Throw: 4x6 each side\nBand Pull-Aparts: 4x15\nYTW Shoulder Series: 3x10 each\n${coreBlock(ph)}` },
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
  const phases = mg ? MG_PHASES : FB_PHASES
  const fns = {
    linemen: mg ? fbLinemenMGSess : fbLinemenSess,
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
  return [
    { day: 'Day 1', focus: 'Lower Lateral & First-Step Quickness',
      description: `Back Squat: ${info.ramp}, ${q}×3\nLateral Step-Up: 4x8 each leg\nDB Squat Jumps: 4x5\nLateral Bounds: 5x5 each side\nAnkle Hops: 3x20\nCalf Raises: 4xAMAP\nDefensive Slide Sprint: 4x20 yds each direction` },
    { day: 'Day 2', focus: 'Upper',
      description: `Power Clean: 3x3\nDB Bench: 4x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Explosion, Plyos & Landing Mechanics',
      description: `${bballPlyo(ph)}\nSnap Down: 3x5\nLateral Deceleration Drill: 3x5 each side\nSingle Leg Box Jump: 2x4 each leg\nTrap Bar Deadlift: ${info.ramp}, ${q}×3\nNordic Hamstring Curl: 3x5` },
    { day: 'Day 4', focus: 'Full Body Power & Court Conditioning',
      description: `Hang Clean: 4x3\nFront Squat: ${info.ramp}, ${q}×3\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Step-Ups: 3x8 each leg\nAnkle Hops: 3x20\n${coreBlock(ph)}\n\nCourt Conditioning:\nBaseline Sprint: 10x1\nDefensive Slide: 4x full court\n17s Drill: 4x1` },
  ]
}

function bbWingsSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  return [
    { day: 'Day 1', focus: 'Lower Vertical Power',
      description: `Back Squat: ${info.ramp}, ${q}×3\nBulgarian Split Squat: 3x5 each leg\nApproach Jump: 5x5\n${bballPlyo(ph)}\nCalf Raises: 4xAMAP\nNordic Hamstring Curl: 3x5` },
    { day: 'Day 2', focus: 'Upper',
      description: `Power Clean: 3x3\nDB Bench: 4x10\nDB Chest Press (varied grip): 3x10\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x12 each arm\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Full Body Explosion, Landing Mechanics & Multi-Directional',
      description: `Hang Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×3\n${bballPlyo(ph)}\nDepth Drop: 3x5\nLateral Deceleration Drill: 3x3 each side\nLateral Bound: 4x5 each side\nBounding: 3x20m\nSingle Leg Box Jump: 3x4 each leg` },
    { day: 'Day 4', focus: 'Full Body Power & Conditioning',
      description: `Front Squat: ${info.ramp}, ${q}×3\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Step-Ups: 3x8 each leg\nAnkle Hops: 3x20\n${coreBlock(ph)}\n\nCourt Conditioning:\nFull Court Sprint: 8x1\nSprint + Close Out: 6 rounds\nBaseline Defensive Slide: 4x1` },
  ]
}

function bbBigsSess(info) {
  const q  = pct(Math.min(0.93, info.f + 0.05))
  const ph = info.phaseNum
  return [
    { day: 'Day 1', focus: 'Lower Strength & Landing Mechanics',
      description: `Back Squat: ${info.ramp}, ${q}×3\nHip Thrust: 4x8\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: 3x5\nSnap Down: 3x5\nDepth Drop: 3x5\nCalf Raises: 4xAMAP` },
    { day: 'Day 2', focus: 'Upper Volume',
      description: `Power Clean: 3x3\nDB Bench: 5x8\nWeighted Pull-ups: 5x5\nBB Row: 4x8\nOverhead Press: 4x8\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Lower Deadlift & Unilateral',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×3\nBulgarian Split Squat: 3x6 each leg\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 3xAMAP` },
    { day: 'Day 4', focus: 'Full Body Power & Post Conditioning',
      description: `Hang Clean: 4x3\nClose Grip Bench Press: ${info.ramp}, ${q}×3\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nDB Shrugs: 3x12\nAnkle Hops: 3x20\n${coreBlock(ph)}\n\nPost Conditioning:\nPost Sprint: 6x1 (half court · full stop)\nBox Out Drill: 3 minutes\nShuffle Step: 4x full court` },
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
  return [
    { day: 'Monday', focus: 'Lower Power & Explosive',
      description: `Back Squat: ${info.ramp}, ${q}×3\nSingle Leg RDL: 3x8 each leg\nSingle Leg Box Jump: 4x4 each leg\nLateral Bound: 5x5 each side\nCopenhagen Adductor: 4x10 each leg\nCalf Raises: 3xAMAP\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper & Shoulder Health',
      description: `DB Bench Press: 4x10\nSingle Arm DB Row: 4x8 each arm\nOverhead Press: 3x10\nBand External Rotation: 4x15 each arm\nYTW Series: 3x10 each\nFace Pulls: 3x20\nReverse Fly: 3x15` },
    { day: 'Thursday', focus: 'Lateral Explosion & Hip Mobility',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×3\nLateral Squat Jump: 5x5 each side\nSingle Leg Lateral Hurdle Hop: 4x5 each leg\nCossack Squat: 4x6 each side\nResistance Band Lateral Walk: 3x20 each direction\nDB Lateral Lunge: 3x8 each leg\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'Reactive Power & Conditioning',
      description: `Lateral Shuffle: 8x20 yds\nReactive Lateral Bound: 4x5 each side\nSingle Leg Squat Jump: 4x5 each leg\n300 Yard Shuttle: 2x2\nFlying 20s: 4x1\nSprint + Jog Ladder: 4 rounds up to ${sy} yards` },
  ]
}

function soccerCenterBackSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  return [
    { day: 'Monday', focus: 'Max Lower Strength',
      description: `Back Squat: ${info.ramp}, ${q}×3\nHip Thrust: 4x8\nNordic Hamstring Curl: 4x5\nSingle Leg RDL: 3x8 each leg\nBroad Jump: 3x3\nGroin Plank: 3x10 each side\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper Contact Strength',
      description: `DB Bench Press: 5x8\nSingle Arm DB Row: 5x8 each arm\nOverhead Press: 4x8\nNeck Strengthening: 3x12 each direction\nMB Twist Throw: 4x6 each side\nFace Pulls: 3x15` },
    { day: 'Thursday', focus: 'Power, Jumping & Deceleration',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×3\nBulgarian Split Squat: 3x6 each leg\nApproach Jump: 5x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nDeceleration Drill: 6x20 yds (sprint 20 · brake · hold 2s)\nDB Lateral Lunge: 3x8 each leg\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'Acceleration & Conditioning',
      description: `Sled Push: 6x20 yds\nSprint Work: 6x30 yds @ max effort\n300 Yard Shuttle: 3x2\nFlying 20s: 4x1\nSprint + Jog Ladder: 4 rounds up to ${sy} yards` },
  ]
}

function soccerFullbackSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  return [
    { day: 'Monday', focus: 'Lower Strength & Sprint',
      description: `Back Squat: ${info.ramp}, ${q}×3\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Bounds: 4x5 each side\nGroin Plank: 3x10 each side\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper Light & Mobility',
      description: `DB Bench Press: 3x10\nSingle Arm DB Row: 3x10 each arm\nLateral Raise: 3x12\nBanded Monster Walk: 3x10 each direction\nMB Twist Throw: 3x6 each side\nHip 90/90 Hold: 3x30s each side\nCopenhagen Adductor: 3x8 each leg` },
    { day: 'Thursday', focus: 'Explosion & Sprint Development',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×3\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: 4x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'Repeat Sprint Conditioning',
      description: `Flying 20s: 8x1\n300 Yard Shuttle: 3x2\nSprint Ladder: 10/20/30/20/10 yds — 4 rounds\nSprint + Jog Ladder: 6 rounds up to ${sy} yards\nBanded Hip Abduction: 3x15 each side` },
  ]
}

function soccerMidfielderSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  return [
    { day: 'Monday', focus: 'Lower Strength & Aerobic Base',
      description: `Back Squat: ${info.ramp}, ${q}×3\nNordic Hamstring Curl: 4x5\nHex Bar Jumps: 4x6\nSingle Leg RDL: 3x8 each leg\nHip Thrust: 4x8\nGroin Plank: 3x10 each side\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper & Work Capacity',
      description: `DB Bench Press: 4x8\nSingle Arm DB Row: 4x8 each arm\nLateral Raise: 3x12\nMB Twist Throw: 4x6 each side\nKneeling Single Arm Lat Pulldown: 3x8 each arm\nBanded Monster Walk: 3x10 each direction\nPush-up: 3xAMAP` },
    { day: 'Thursday', focus: 'Explosion & Change of Direction',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×3\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: 4x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nV Drill: 4x3\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'High Volume Conditioning',
      description: `V Drill: 4x3\nStar Drill: 3x3\n300 Yard Shuttle: 3x2\nFlying 20s: 6x1\nSprint + Jog Ladder: 6 rounds up to ${sy} yards\nAerobic Finish: 10 min tempo run` },
  ]
}

function soccerWingerSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  return [
    { day: 'Monday', focus: 'Lower Speed-Strength & Horizontal Force',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×3\nReverse Lunge: 3x5 each leg\nNordic Hamstring Curl: 4x5\nAnkle Hops: 3x20\nLateral Bounds: 5x5 each side\nCalf Raises: 4xAMAP\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper Light & Accessory',
      description: `DB Bench Press: 3x10\nSingle Arm DB Row: 3x10 each arm\nLateral Raise: 3x12\nMB Twist Throw: 3x6 each side\nBanded Monster Walk: 3x10 each direction\nCopenhagen Adductor: 3x8 each leg` },
    { day: 'Thursday', focus: 'Vertical Strength & Reactive Speed',
      description: `Back Squat: ${info.ramp}, ${q}×3\nBulgarian Split Squat: 3x6 each leg\nSingle Leg Lateral Hurdle Hop: 4x5 each leg\nLateral Squat Jump: 4x5\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
    { day: 'Friday', focus: 'Speed & Game-Pace Conditioning',
      description: `Flying 20s: 8x1\nSprint Ladder: 10/20/30/20/10 yds — 4 rounds\n300 Yard Shuttle: 2x2\nSprint + Jog Ladder: 8 rounds up to ${sy} yards` },
  ]
}

function soccerStrikerSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  const sy = SOC_SPRINT_YARDS[Math.min(3, ph - 1)]
  return [
    { day: 'Monday', focus: 'Lower Vertical Power & Jump Height',
      description: `Back Squat: ${info.ramp}, ${q}×3\nHip Thrust: 4x8\nNordic Hamstring Curl: 4x5\nApproach Jump: 5x5\nSingle Leg Box Jump: 3x4 each leg\nCopenhagen Adductor: 3x8 each leg\n${coreBlock(ph)}` },
    { day: 'Tuesday', focus: 'Upper & Rotational Power',
      description: `DB Bench Press: 4x8\nSingle Arm DB Row: 4x8 each arm\nMB Twist Throw: 4x6 each side\nMed Ball Overhead Slam: 4x8\nOverhead Press: 3x10\nBanded Monster Walk: 3x10 each direction` },
    { day: 'Thursday', focus: 'Explosive Speed, Horizontal Power & Shot Drive',
      description: `Hex Bar Deadlift: ${info.ramp}, ${q}×3\nHex Bar Jumps: 4x5\nBulgarian Split Squat: 3x6 each leg\nLateral Squat Jump: 4x5\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nSled Sprint: 6x20 yds\nRotational Cable Pull: 3x8 each side\n${coreBlock(ph)}` },
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
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Single Leg RDL kept as light accessory
    { day: 'Day 1', focus: 'Lower Max Strength',
      description: `Back Squat: ${info.ramp}, ${q}×3 (top set — max effort)\nWeighted Pull-ups: 5xAMAP\nNordic Hamstring Curl: 3x5\nSingle Leg RDL: 3x8 each leg\nHip 90/90 Stretch: 3x30s each side\nCossack Squat: 3x5 each side\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper Max Strength',
      description: `Bench Press: ${info.ramp}, ${q}×3\nWeighted Pull-ups: 5xAMAP\nBB Row: 4x6\nOverhead Press: 4x8\nNeck Strengthening: 3x12 each direction\nGrip Work: 3x30 seconds each\nBand External Rotation: 3x15 each arm\nFace Pulls: 3x15` },
    // Fix 3: phasePlyo
    { day: 'Day 3', focus: 'Explosive Power',
      description: `Power Clean: 5x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nMed Ball Slam: 4x8\nSprawl Drills: 3x10\nLevel Change Explosive Sprawl: 4x8` },
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
  return [
    // Fix 3: phasePlyo replaces Box Jump + Depth Jump multi-list
    { day: 'Day 1', focus: 'Lower Power, Landing Mechanics & Patellar Tendon Prehab',
      description: `Back Squat: ${info.ramp}, ${q}×3\nBulgarian Split Squat: 3x5 each leg\n${phasePlyo(ph)}\nSnap Down: 3x5\nDepth Drop: 3x5\nSingle Leg Box Jump: 3x5 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 4xAMAP` },
    { day: 'Day 2', focus: 'Upper & Shoulder Health',
      description: `DB Bench: 4x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand External Rotation: 4x15 each arm\nYTW Series: 3x10 each\nOverhead Press: 3x10\nFace Pulls: 3x15` },
    { day: 'Day 3', focus: 'Full Body Explosion',
      description: `Power Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×3\nApproach Jump: 5x5\nLateral Bounds: 4x5 each side\nHip Thrust: 4x8\nBand Pull-Aparts: 3x20\n${coreBlock(ph)}` },
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
  return [
    // Fix 3: phasePlyo replaces Box Jump + Broad Jump list
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 5x3\nBack Squat: ${info.ramp}, ${q}×3\nHip Thrust: 4x8\n${phasePlyo(ph)}\nSingle Leg RDL: 3x8 each leg\nCopenhagen Adductor: 3x8 each leg\nBanded Hip Flexion: 3x12 each leg\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: ${info.ramp}, ${q}×3\nPull-ups: 4xAMAP\nDB Row: 3x12\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo as primary; Bounding + Wicket Drills are sprint-specific, kept
    { day: 'Day 3', focus: 'Explosion',
      description: `Hang Clean: 4x3\nFront Squat: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nBounding: 3x20m\nWicket Drills: 3x30m\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Posterior Chain',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×3\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x10\nSingle Leg Calf Raise: 4xAMAP\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
  ]
}

function trackThrowSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  return [
    // Fix 1: Day 1 is now a squat day — Trap Bar Deadlift moved to Day 3
    { day: 'Day 1', focus: 'Lower Power — Squat',
      description: `Power Clean from floor: 5x3 working up, last set AMAP\nBack Squat: ${info.ramp}, ${q}×3\nHip Thrust: 3x8\nGoblet Lateral Lunge: 3x4 each leg\nDouble Leg Calf Raise: 3x15\nGrip Work: 3x30s each (plate pinch · towel hang)\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper Strength, Rotational & Shoulder Health',
      description: `Bench Press: ${info.ramp}, ${q}×3\nPull-ups: 4xAMAP\nBB Row: 4x8\nOverhead Press: 4x8\nMed Ball Rotational Throw: 4x6 each side\nRotational Cable Throw: 4x8 each side\nBand External Rotation: 3x15 each arm\nYTW Shoulder Series: 3x10 each\nFace Pulls: 3x15\n${coreBlock(ph)}` },
    // Trap Bar DL is primary; RDL removed (flagged: TBD + RDL); Hip Thrust replaces it
    { day: 'Day 3', focus: 'Lower Strength — Deadlift',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×3\nDB Step-Ups: 3x6 each leg\nHip Thrust: 3x10\nNordic Hamstring Curl: 3x5\nSingle Leg Calf Raise: 3x12\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power, Rotational & Shoulder Health',
      description: `Push Press: 4x5\nClose Grip Bench Press: ${info.ramp}, ${q}×3\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Rotational Throw: 4x6 each side\nRotational Cable Throw: 4x8 each side\nBand External Rotation: 3x15 each arm\nFace Pulls: 3x15\n${coreBlock(ph)}` },
  ]
}

function trackJumpSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  // Single Leg Depth Jump only in phases 3-4 (Fix 3 — no depth jumps ph 1-2)
  const singleLegDepth = ph >= 3 ? '\nSingle Leg Depth Jump: 4x4 each leg' : ''
  return [
    // Fix 3: phasePlyo; Single Leg Depth Jump gated to phases 3-4
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 5x3\nBack Squat: ${info.ramp}, ${q}×3\nHip Thrust: 4x8\n${phasePlyo(ph)}${singleLegDepth}\nSingle Leg RDL: 3x8 each leg\nTerminal Knee Extension: 3x15 each leg\nApproach Jump Work: 3 sets\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: ${info.ramp}, ${q}×3\nPull-ups: 4xAMAP\nDB Row: 3x12\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    // Fix 3: phasePlyo as primary; jump-specific drills kept; Single Leg Broad Jump phases 2+
    { day: 'Day 3', focus: 'Explosion — Jumps Focus',
      description: `Hang Clean: 4x3\nFront Squat: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nBounding: 3x20m${ph >= 2 ? '\nSingle Leg Broad Jump: 3x3 each leg' : ''}\nSingle Leg Box Jump: 3x5 each leg\nApproach Jump Work: 3 sets\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Posterior Chain',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×3\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x10\nSingle Leg Calf Raise: 4xAMAP\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
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

const XC_DAY3 = {
  day: 'Day 3', focus: 'Plyometrics & Injury Prevention',
  description: `Ankle Hops: 3x20\nSingle Leg Hop & Stick: 3x5 each leg\nBox Step-Up: 3x12 each leg\nGlute Bridge: 3x15\nHip 90/90 Hold: 2x45s each side\nCalf Raise: 3xAMAP\nBand Hip Abduction: 3x15 each side`,
}
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
    if (daysPerWeek >= 3) extra.push(XC_DAY3)
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
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Single Leg RDL + Nordic kept as accessories
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 4x3\nBack Squat: ${info.ramp}, ${q}×3\nHip Thrust: 3x8\nSingle Leg RDL: 3x8 each leg\nNordic Hamstring Curl: 3x5\nLateral Bounds: 4x5 each side\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: ${info.ramp}, ${q}×3\nPull-ups: 4xAMAP\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nMed Ball Rotational Throw: 4x6 each side\nLandmine Rotation: 3x8 each side\nCable Woodchop: 3x10 each side\nBand External Rotation: 3x15\nGrip Work: 3x30s each` },
    // Fix 3: phasePlyo replaces multi-plyo list
    { day: 'Day 3', focus: 'Explosion',
      description: `Hang Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nSled Sprint: 6x20 yds\n${coreBlock(ph)}` },
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
  return {
    day: 'Day 4', focus: 'Power & Explosiveness',
    description: `Medicine Ball Overhead Throw: ${s(8)}\nBox Jump: ${s(5)}\nResistance Band Sprint: ${s(20)} yds\nAnkle Hops: ${s(20)}\nLateral Bound: ${s(5)} each side\n${coreBlock(phaseNum)}`,
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
const BASEBALL_PHASES = [
  { label: 'Foundation',  low: 0.65, high: 0.72 },
  { label: 'Development', low: 0.72, high: 0.78 },
  { label: 'Strength',    low: 0.78, high: 0.83 },
  { label: 'Peak',        low: 0.83, high: 0.87 },
]

function makeBaseballSession(day, focus, exercises) {
  const description = exercises.map(e => {
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
  }).join('\n')
  return { day, focus, description }
}

function baseball3Day(info) {
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift, added Bulgarian Split Squat
    makeBaseballSession('Day 1', 'Lower and Power', [
      { name: 'Back Squat',      ramp: `${info.ramp}, ${info.pct}×3` },
      { name: 'Hip Thrust',                               sets: 3, reps: '8' },
      { name: 'Box Drop',                                 sets: 3, reps: '3' },
      { name: 'Bulgarian Split Squat',                    sets: 3, reps: '6',    note: 'each leg' },
      { name: 'Calf Raises',                              sets: 3, reps: 'AMAP' },
      { name: 'Core — Cherry Pickers',                    sets: 4, reps: '15' },
      { name: 'Core — Tuck-Up',                           sets: 3, reps: 'AMAP' },
    ]),
    // Fix 4: Added Med Ball Scoop Toss + Landmine Rotation for rotational emphasis
    makeBaseballSession('Day 2', 'Upper Strength', [
      { name: 'Hang Clean',                               sets: 3, reps: '3' },
      { name: 'DB Bench Press',                           sets: 4, reps: '8' },
      { name: 'Single Arm DB Row',                        sets: 4, reps: '10',   note: 'each arm' },
      { name: 'Med Ball Scoop Toss',                      sets: 4, reps: '6',    note: 'each side' },
      { name: 'Landmine Rotation',                        sets: 3, reps: '8',    note: 'each side' },
      { name: 'Tricep Pushdowns',                         sets: 3, reps: '12' },
      { name: 'Forearm Curls (Both Ways)',                sets: 3, reps: 'AMAP' },
      { name: 'Band Pull-Aparts',                         sets: 3, reps: '20' },
      { name: 'Core — Sit-ups',                           sets: 4, reps: '12' },
    ]),
    // Reverse Lunge is primary unilateral; Bulgarian removed to avoid bilateral + double unilateral fatigue
    makeBaseballSession('Day 3', 'Lower and Upper Power', [
      { name: 'Power Clean',               warmup: '2x2', sets: 3, reps: '2' },
      { name: 'Reverse Lunge',                            sets: 3, reps: '5',    note: 'each leg — primary unilateral' },
      { name: 'Bird Dog Row',                             sets: 4, reps: '10' },
      { name: 'Med Ball Rotational Throw',                sets: 4, reps: '6',    note: 'each side' },
      { name: 'Shotput Med Ball Throw',                   sets: 4, reps: '5',    note: 'each side' },
      { name: 'RDL',                                      sets: 3, reps: '8' },
      { name: 'Copenhagen Adductor',                      sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Core — EXT/INT Rotation',                  sets: 3, reps: 'AMAP' },
    ]),
  ]
}

function baseball4Day(info) {
  const p3 = info.phaseNum >= 3
  return [
    // Day 1: Back Squat only — hinge work lives on Day 3's Trap Bar Deadlift instead
    makeBaseballSession('Day 1', 'Lower Strength', [
      { name: 'Back Squat',      ramp: `${info.ramp}, ${info.pct}×3` },
      { name: 'Box Drop',                                 sets: 3, reps: '3' },
      { name: 'Bulgarian Split Squat',                    sets: 3, reps: '6',    note: 'each leg' },
      { name: 'Weighted Hip Thrust',                      sets: 3, reps: '8' },
      { name: 'Calf Raises',                              sets: 3, reps: 'AMAP' },
      { name: 'Core — Cherry Pickers',                    sets: 4, reps: '15' },
      { name: 'Core — Tuck-Up',                           sets: 3, reps: 'AMAP' },
    ]),
    // Fix 4: Added Med Ball Scoop Toss + Landmine Rotation
    makeBaseballSession('Day 2', 'Upper Strength', [
      { name: 'Hang Clean',                               sets: 3, reps: '3',    note: 'working up' },
      { name: 'DB Bench Press',                           sets: 4, reps: p3 ? '6' : '8' },
      { name: 'Single Arm DB Row',                        sets: 4, reps: '10',   note: 'each arm' },
      { name: 'Med Ball Scoop Toss',                      sets: 4, reps: '6',    note: 'each side' },
      { name: 'Landmine Rotation',                        sets: 3, reps: '8',    note: 'each side' },
      { name: 'Tricep Pushdowns',                         sets: 3, reps: '12' },
      { name: 'Forearm Curls (Both Ways)',                sets: 3, reps: 'AMAP' },
      { name: 'Lat Raises — Side, Front, Back',           sets: 3, reps: 'AMAP' },
      { name: 'Band Pull-Aparts',                         sets: 3, reps: '20' },
      { name: 'Core — Sit-ups',                           sets: 4, reps: '12' },
      { name: 'Core — Rotate and Press',                  sets: 3, reps: '10' },
    ]),
    // Reverse Lunge is primary unilateral after Trap Bar DL; Bulgarian removed (flagged: TBD + heavy BSS)
    makeBaseballSession('Day 3', 'Lower Power', [
      { name: 'Trap Bar Deadlift', ramp: `${info.ramp}, ${info.pct}×3` },
      { name: 'Reverse Lunge',                            sets: 3, reps: '5',    note: 'each leg — primary unilateral' },
      { name: 'Single Leg RDL',                           sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Shotput Med Ball Throw',                   sets: 4, reps: '5',    note: 'each side' },
      { name: 'Hamstring Curls',                          sets: 3, reps: 'AMAP' },
      { name: 'Leg Extensions',                           sets: 3, reps: 'AMAP' },
      { name: 'Core — EXT/INT Rotation',                  sets: 3, reps: 'AMAP' },
      { name: 'Copenhagen Adductor',                      sets: 3, reps: '8',    note: 'each leg' },
    ]),
    // Fix 4: Med Ball Rotational Throw already present — keep it
    makeBaseballSession('Day 4', 'Upper Power', [
      { name: 'Power Clean',               warmup: '2x2', sets: 3, reps: '2' },
      { name: 'Lat Pulldown',                              sets: 3, reps: '8' },
      { name: 'Bird Dog Row',                             sets: 4, reps: '10' },
      { name: 'Med Ball Rotational Throw',                sets: 4, reps: '6',    note: 'each side' },
      { name: 'Bench Curls',                              sets: 3, reps: '8' },
      { name: 'Band External Rotation',                   sets: 3, reps: '15',   note: 'each arm' },
      { name: 'Core — Bird Dogs (Weighted)',              sets: 3, reps: '12' },
      { name: 'Half Baby Kip-Ups',                        sets: 3, reps: 'AMAP' },
    ]),
  ]
}

const BASEBALL_ARM_CARE = makeBaseballSession('Day 5', 'Arm Care & Conditioning', [
  { name: 'Band External Rotation',   sets: 4,  reps: '15',   note: 'each arm' },
  { name: 'YTW Series',               sets: 3,  reps: '10',   note: 'each' },
  { name: 'Band Pull-Aparts',         sets: 3,  reps: '20' },
  { name: 'Reverse Flys',             sets: 3,  reps: '15' },
  { name: '30-Yard Sprints',          sets: 10, reps: '1',    note: 'full recovery between each' },
  { name: 'Lateral Bounds',           sets: 4,  reps: '5',    note: 'each side' },
])

const BASEBALL_LIGHT_FB = makeBaseballSession('Day 6', 'Lighter Full Body', [
  { name: 'Goblet Squat',             sets: 3, reps: '10' },
  { name: 'Push-ups',                 sets: 3, reps: 'AMAP' },
  { name: 'Forearm and Grip Work',    sets: 3, reps: 'AMAP' },
  { name: 'Light Med Ball Work',      sets: 3, reps: 'AMAP' },
  { name: 'Core Circuit',             sets: 3, reps: 'AMAP' },
])

function generateBaseballWeeks(_, goal, daysPerWeek) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = getPhaseInfo(w, BASEBALL_PHASES)

    let sessions
    if (daysPerWeek >= 4) {
      sessions = baseball4Day(info)
      if (daysPerWeek >= 5) sessions = [...sessions, BASEBALL_ARM_CARE]
      if (daysPerWeek >= 6) sessions = [...sessions, BASEBALL_LIGHT_FB]
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
// No overhead pressing. Enhanced hip stability and arm care every session.
// Pulling movements separated by at least one lower-body day (48 h rule).
// Fix 4 note: Pitcher program stays as-is — already stronger on rotational work.

function pitcher3Day(info) {
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Hip Thrust, Copenhagen, Single Leg RDL remain
    makeBaseballSession('Day 1', 'Lower and Power', [
      { name: 'Back Squat',      ramp: `${info.ramp}, ${info.pct}×3` },
      { name: 'Hip Thrust',                               sets: 4, reps: '8' },
      { name: 'Copenhagen Adductor',                      sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Single Leg RDL',                           sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Core — Cherry Pickers',                    sets: 4, reps: '15' },
      { name: 'Core — EXT/INT Rotation',                  sets: 3, reps: 'AMAP' },
    ]),
    makeBaseballSession('Day 2', 'Upper Strength and Arm Care', [
      { name: 'Hang Clean',                               sets: 3, reps: '3' },
      { name: 'DB Bench Press',                           sets: 4, reps: '8',    note: 'no overhead pressing' },
      { name: 'Single Arm DB Row',                        sets: 4, reps: '10',   note: 'each arm' },
      { name: 'Band External Rotation',                   sets: 4, reps: '15',   note: 'each arm' },
      { name: 'YTW Shoulder Series',                      sets: 3, reps: '10',   note: 'each' },
      { name: 'Band Pull-Aparts',                         sets: 4, reps: '20' },
      { name: 'Core — Sit-ups',                           sets: 4, reps: '12' },
      { name: 'Core — Rotate and Press',                  sets: 3, reps: '10' },
    ]),
    // Reverse Lunge is primary unilateral; Bulgarian removed to reduce fatigue; Single Leg RDL for hip stability
    makeBaseballSession('Day 3', 'Lower and Upper Power', [
      { name: 'Power Clean',               warmup: '2x2', sets: 3, reps: '2' },
      { name: 'Reverse Lunge',                            sets: 3, reps: '5',    note: 'each leg — primary unilateral' },
      { name: 'Single Leg RDL',                           sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Bird Dog Row',                             sets: 4, reps: '10' },
      { name: 'Med Ball Rotational Throw',                sets: 4, reps: '6',    note: 'each side' },
      { name: 'Copenhagen Adductor',                      sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Band External Rotation',                   sets: 3, reps: '15',   note: 'each arm' },
      { name: 'Core — EXT/INT Rotation',                  sets: 3, reps: 'AMAP' },
    ]),
  ]
}

function pitcher4Day(info) {
  const p3 = info.phaseNum >= 3
  return [
    // Day 1: Back Squat only — hinge work lives on Day 3's Trap Bar Deadlift instead
    makeBaseballSession('Day 1', 'Lower Strength', [
      { name: 'Back Squat',      ramp: `${info.ramp}, ${info.pct}×3` },
      { name: 'Box Drop',                                 sets: 3, reps: '3' },
      { name: 'Weighted Hip Thrust',                      sets: 4, reps: '8' },
      { name: 'Copenhagen Adductor',                      sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Single Leg RDL',                           sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Core — Cherry Pickers',                    sets: 4, reps: '15' },
      { name: 'Core — EXT/INT Rotation',                  sets: 3, reps: 'AMAP' },
    ]),
    makeBaseballSession('Day 2', 'Upper Strength and Arm Care', [
      { name: 'Hang Clean',                               sets: 3, reps: '3',    note: 'working up' },
      { name: 'DB Bench Press',                           sets: 4, reps: p3 ? '6' : '8', note: 'no overhead pressing' },
      { name: 'Single Arm DB Row',                        sets: 4, reps: '10',   note: 'each arm' },
      { name: 'Band External Rotation',                   sets: 4, reps: '15',   note: 'each arm' },
      { name: 'YTW Shoulder Series',                      sets: 3, reps: '10',   note: 'each' },
      { name: 'Forearm Curls (Both Ways)',                sets: 3, reps: 'AMAP' },
      { name: 'Band Pull-Aparts',                         sets: 4, reps: '20' },
      { name: 'Core — Sit-ups',                           sets: 4, reps: '12' },
      { name: 'Core — Rotate and Press',                  sets: 3, reps: '10' },
    ]),
    // Reverse Lunge primary unilateral; Bulgarian removed (flagged: Trap Bar DL + heavy BSS); Single Leg RDL for hip stability
    makeBaseballSession('Day 3', 'Lower Power', [
      { name: 'Trap Bar Deadlift', ramp: `${info.ramp}, ${info.pct}×3` },
      { name: 'Reverse Lunge',                            sets: 3, reps: '5',    note: 'each leg — primary unilateral' },
      { name: 'Single Leg RDL',                           sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Lateral Band Walk',                        sets: 3, reps: '15',   note: 'each direction' },
      { name: 'Hamstring Curls',                          sets: 3, reps: 'AMAP' },
      { name: 'Calf Raises',                              sets: 3, reps: 'AMAP' },
      { name: 'Core — Copenhagen Adductor',               sets: 3, reps: '8',    note: 'each leg' },
      { name: 'Core — Tuck-Up',                           sets: 3, reps: 'AMAP' },
    ]),
    makeBaseballSession('Day 4', 'Upper Power and Rotational', [
      { name: 'Power Clean',               warmup: '2x2', sets: 3, reps: '2' },
      { name: 'Pull-ups',                                 sets: 3, reps: 'AMAP' },
      { name: 'Bird Dog Row',                             sets: 4, reps: '10' },
      { name: 'Med Ball Rotational Throw',                sets: 4, reps: '6',    note: 'each side' },
      { name: 'Lat Pulldown',                              sets: 3, reps: '8' },
      { name: 'Band External Rotation',                   sets: 3, reps: '15',   note: 'each arm' },
      { name: 'Core — Bird Dogs (Weighted)',              sets: 3, reps: '12' },
      { name: 'Half Baby Kip-Ups',                        sets: 3, reps: 'AMAP' },
    ]),
  ]
}

const PITCHER_ARM_CARE = makeBaseballSession('Day 5', 'Arm Care & Conditioning', [
  { name: 'Band External Rotation',   sets: 4,  reps: '15',   note: 'each arm' },
  { name: 'YTW Series',               sets: 3,  reps: '10',   note: 'each' },
  { name: 'Band Pull-Aparts',         sets: 4,  reps: '20' },
  { name: 'Reverse Flys',             sets: 3,  reps: '15' },
  { name: 'Wrist Curls',              sets: 3,  reps: '15' },
  { name: '30-Yard Sprints',          sets: 10, reps: '1',    note: 'full recovery between each' },
  { name: 'Lateral Bounds',           sets: 4,  reps: '5',    note: 'each side' },
])

const PITCHER_LIGHT_FB = makeBaseballSession('Day 6', 'Lighter Full Body and Arm Care', [
  { name: 'Goblet Squat',             sets: 3, reps: '10' },
  { name: 'Push-ups',                 sets: 3, reps: 'AMAP' },
  { name: 'Copenhagen Adductor',      sets: 2, reps: '8',    note: 'each leg' },
  { name: 'Band External Rotation',   sets: 3, reps: '15',   note: 'each arm' },
  { name: 'Forearm Curls',            sets: 3, reps: 'AMAP' },
  { name: 'Core Circuit',             sets: 3, reps: 'AMAP' },
])

function generatePitcherBaseballWeeks(goal, daysPerWeek) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const info = getPhaseInfo(w, BASEBALL_PHASES)

    let sessions
    if (daysPerWeek >= 4) {
      sessions = pitcher4Day(info)
      if (daysPerWeek >= 5) sessions = [...sessions, PITCHER_ARM_CARE]
      if (daysPerWeek >= 6) sessions = [...sessions, PITCHER_LIGHT_FB]
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
  return [
    { day: 'Day 1', focus: 'Lower — First-Step Explosion',
      description: `Hang Power Clean: 4x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nBulgarian Split Squat: 3x6 each leg\nSled Sprint: 6x20 yds\nHip Thrust: 3x8\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper — Puck Battle Strength',
      description: `Bench Press: ${info.ramp}, ${q}×3\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Chest Pass: 4x8\nBand External Rotation: 3x15 each arm\nYTW Series: 3x10 each\nFace Pulls: 3x15\nBand Pull-Aparts: 3x20\n${coreBlock(ph)}` },
    { day: 'Day 3', focus: 'Lower — Acceleration & COD',
      description: `Front Squat: ${info.ramp}, ${q}×3\nSplit Squat Jump: 4x5 each leg\nLateral Bound: 5x5 each side\nHip Thrust: 4x8\nResistance Band Sprint: 6x20 yds\n${phasePlyo(ph)}\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power & Conditioning',
      description: `Hang Clean: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×3\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Slam: 4x8\nBattle Rope: 4x20s\nFarmer Carries: 3x40 yds\n${coreBlock(ph)}` },
  ]
}

function hockeyDefenseSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  return [
    { day: 'Day 1', focus: 'Lower — Lateral Mobility & Single Leg Stability',
      description: `Back Squat: ${info.ramp}, ${q}×3\nCossack Squat: 3x8 each side\nCopenhagen Adductor: 3x8 each leg\nLateral Bound: 5x5 each side\nCopenhagen Plank: 3x20s each side\nSingle Leg RDL: 3x8 each leg\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper — Core Stiffness & Rotational Strength',
      description: `Bench Press: ${info.ramp}, ${q}×3\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Rotational Throw: 4x6 each side\nPallof Press: 3x12 each side\nBand External Rotation: 3x15 each arm\nYTW Series: 3x10 each\nFace Pulls: 3x15\n${coreBlock(ph)}` },
    { day: 'Day 3', focus: 'Lower — Crossover & Backward Skating Mechanics',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×3\nLateral Sled Drag: 4x20 yds each direction\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\n${phasePlyo(ph)}\nResistance Band Lateral Walk: 3x20 each direction\nBulgarian Split Squat: 3x6 each leg\nHip 90/90 Hold: 3x30s each side\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power & Anti-Rotation',
      description: `BB Split Jerk: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×3\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nSuitcase Carry: 4x20 yds each arm\nSingle Leg RDL: 3x8 each leg\nAnti-Rotation Press: 3x10 each side\n${coreBlock(ph)}` },
  ]
}

function hockeyGoalieSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  return [
    { day: 'Day 1', focus: 'Lower — Butterfly Mechanics & Hip Mobility',
      description: `Back Squat: ${info.ramp}, ${q}×3\nCossack Squat: 3x10 each side\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\nLateral Bound: 5x5 each side\nCopenhagen Adductor: 4x8 each leg\nSingle Leg Box Jump: 3x5 each leg\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper — Shoulder Health (Goalie Protection)',
      description: `DB Bench Press: 4x10 (DB only — protects shoulder joint)\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nBand External Rotation: 3x15 each arm\nYTW Series: 3x10 each\nFace Pulls: 4x15\n${coreBlock(ph)}` },
    { day: 'Day 3', focus: 'Lower — Reactive Lateral & Butterfly Recovery',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×3\nLateral Squat Jump: 4x5 each side\nSingle Leg Lateral Hurdle Hop: 3x5 each leg\n${phasePlyo(ph)}\nResistance Band Lateral Walk: 3x20 each direction\nLateral Shuffle: 6x20 yds\nCossack Squat: 3x8 each side\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power & Conditioning',
      description: `BB Split Jerk: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×3\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nFarmer Carries: 4x20 yds\nBattle Rope: 4x20s\nCopenhagen Plank: 3x20s each side\n${coreBlock(ph)}` },
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
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Hip Thrust + Nordic remain
    { day: 'Day 1', focus: 'Lower Max Strength & Scrummage Drive',
      description: `Power Clean from floor: 5x3 working up\nBack Squat: ${info.ramp}, ${q}×3\nHip Thrust: 4x10\nNordic Hamstring Curl: 4x5\nSled Push: 6x20 yds\nNeck Strengthening: 3x12 each direction\nMed Ball Rotational Slam: 4x8\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper Strength & Contact Prep',
      description: `Bench Press: ${info.ramp}, ${q}×3\nWeighted Pull-ups: 5x5\nDB Row: 4x10 each arm\nOverhead Press: 4x8\nDB Shrugs: 3x12\nNeck Strengthening: 3x12 each direction\nFace Pulls: 3x15\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo replaces Box Jump + Broad Jump list
    { day: 'Day 3', focus: 'Lower Explosion & Carrying',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nBulgarian Split Squat: 3x6 each leg\nSingle Leg RDL: 3x8 each leg\nFarmer Carries: 4x20 yds\nSandbag Carry: 4x20 yds\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power, Contact & Rotational',
      description: `Hang Clean: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×3\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nLandmine Rotational Press: 3x6 each side\nMed Ball Chest Pass: 4x8\nSled Push: 6x20 yds\n${coreBlock(ph)}` },
  ]
}

function rugbyBacksSess(info) {
  const q  = info.pct
  const ph = info.phaseNum
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; power and speed emphasis for backs
    { day: 'Day 1', focus: 'Lower Power & First-Step Speed',
      description: `Power Clean: 4x3\nBack Squat: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nSingle Leg RDL: 3x8 each leg\nLateral Bounds: 4x5 each side\nSprint Work: 8x40 yds\n${coreBlock(ph)}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `Bench Press: ${info.ramp}, ${q}×3\nWeighted Pull-ups: 5x5\nDB Row: 4x10 each arm\nOverhead Press: 4x8\nDB Shrugs: 3x12\nNeck Strengthening: 3x12 each direction\nFace Pulls: 3x15\n${coreBlock(ph)}` },
    // Fix 3: phasePlyo replaces Box Jump + Broad Jump list
    { day: 'Day 3', focus: 'Lower Explosion, Agility & COD',
      description: `Trap Bar Deadlift: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nBulgarian Split Squat: 3x6 each leg\nSingle Leg RDL: 3x8 each leg\nLateral Bounds: 4x5 each side\nT-Drill: 6x1\n${coreBlock(ph)}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `Hang Clean: 4x3\nClose Grip Bench: ${info.ramp}, ${q}×3\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Chest Pass: 4x8\n${coreBlock(ph)}` },
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
  return [
    // Fix 1: Squat day — removed Trap Bar Deadlift; Bulgarian + Single Leg RDL remain
    { day: 'Day 1', focus: 'Lower Strength',
      description: `Back Squat: ${info.ramp}, ${q}×3\nBulgarian Split Squat: 3x6 each leg\nSingle Leg RDL: 3x8 each leg\nLateral Bound: 4x5 each side\nCalf Raises: 3xAMAP` },
    { day: 'Day 2', focus: 'Upper Strength & Balance',
      description: `Power Clean: 3x3\nBench Press: ${info.ramp}, ${q}×3\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nBand External Rotation: 4x15 each arm\nYTW Series: 3x10 each\nForearm Curls (both directions): 3xAMAP` },
    // Fix 3: phasePlyo as primary; Lateral Squat Jump kept (sport-specific); Depth Jump removed from ph 1-2
    { day: 'Day 3', focus: 'Explosion & Lateral Power',
      description: `Hang Clean: 3x3\nTrap Bar Deadlift: ${info.ramp}, ${q}×3\n${phasePlyo(ph)}\nLateral Squat Jump: 4x5 each side\nSingle Leg Box Jump: 3x4 each leg\nMed Ball Rotational Throw: 4x6 each side` },
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
  return [
    { day: 'Day 1', focus: 'Lower Vertical Strength & Ground Force',
      description: `Back Squat: ${info.ramp}, ${q}×3 (explosive intent)\nHip Thrust: 3x10\nStep-Up: 3x6 each leg\nNordic Hamstring Curl: 3x5\nLandmine Thruster: 3x6 each side\nDB Squat Jump: 4x5\nCore Pallof Press: 3x10 each side\nDead Bug: 3x10` },
    { day: 'Day 2', focus: 'Upper & Rotational Power',
      description: `Single Arm DB Row: 4x8 each arm\nDB Bench Press: 4x8\nLandmine Press: 3x8 each arm\nSplit Stance Cable Row: 3x10 each side\nRotational Cable Pull: 4x8 each side\nMed Ball Rotational Throw: 4x6 each side\nBand Pull-Aparts: 3x20\nCore Cable Woodchop: 3x10 each side` },
    // Trap Bar Deadlift moved here from Day 1 — separated from Back Squat to avoid bilateral overload
    { day: 'Day 3', focus: 'Full Body Power & Posterior Chain',
      description: `Power Clean: 3x3 (explosive intent)\nTrap Bar Deadlift: 40%×10, 50%×8, ${q}×3\n${phasePlyo(ph)}\nLateral Bound: 4x5 each side\nSingle Leg RDL: 3x8 each leg\nRotational Med Ball Slam: 4x6 each side\nCore Bird Dog: 3x10\nAnti-Rotation Press: 3x10` },
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

function normalizePosition(sport, rawPos) {
  const p = (rawPos || '').toLowerCase().trim()

  if (sport === 'football') {
    if (/^qb$/.test(p) || /quarter/.test(p)) return 'qb'
    if (/\b(ol|dl|guard|tackle|center|centre|nose|offensive\s*line|defensive\s*line|lineman|linemen)\b/.test(p)) return 'linemen'
    if (/\b(wr|db|rb|safety|corner|cornerback|running\s*back|wide\s*rec|slot|receiver)\b/.test(p)) return 'skill'
    if (/\b(lb|te|fb|linebacker|tight\s*end|fullback)\b/.test(p)) return 'hybrid'
    return 'linemen'
  }

  if (sport === 'basketball') {
    if (/\b(c|center|centre)\b/.test(p)) return 'bigs'
    if (/\b(sf|pf|small\s*forward|power\s*forward|forward|wing)\b/.test(p)) return 'wings'
    if (/\b(pg|sg|point|shooting|point\s*guard|shooting\s*guard|guard)\b/.test(p)) return 'guards'
    return 'guards'
  }

  if (sport === 'hockey') {
    if (/\b(goalie|goaltender|g)\b/.test(p)) return 'goalie'
    if (/\b(defense|defence|d|defenseman|defenceman|def)\b/.test(p)) return 'defense'
    return 'forwards'
  }

  if (sport === 'track') {
    if (/\b(shot|discus|javelin|hammer|throw|thrower)\b/.test(p)) return 'throw'
    if (/\b(jump|jumper|hj|lj|tj|high\s*jump|long\s*jump|triple\s*jump|pole\s*vault|pv)\b/.test(p)) return 'jump'
    return 'sprint'
  }

  if (sport === 'baseball') {
    if (/\b(pitcher|p)\b/.test(p) || p === 'pitcher') return 'pitcher'
    return 'baseball'
  }

  if (sport === 'rugby') {
    if (/\b(prop|hooker|lock|flanker|number\s*8|no\.?\s*8|numbe?r?\s*eight)\b/.test(p)) return 'forwards'
    if (/\b(scrum\s*half|fly\s*half|center|centre|wing|fullback|winger|back)\b/.test(p)) return 'backs'
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
    const matches = [...line.matchAll(/\d+%×\d+/g)]
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
  return text.split('\n').map(line => {
    if (line.startsWith('Hang Power Clean')) return 'Trap Bar Deadlift' + line.slice('Hang Power Clean'.length)
    if (line.startsWith('Power Clean from floor')) return 'Trap Bar Deadlift' + line.slice('Power Clean from floor'.length)
    if (line.startsWith('Power Clean')) return 'Trap Bar Deadlift' + line.slice('Power Clean'.length)
    if (line.startsWith('Hang Clean')) return 'Romanian Deadlift' + line.slice('Hang Clean'.length)
    return line
  }).join('\n')
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
  const lines = description.split('\n').map(line => {
    if (/^Overhead Press\b/.test(line)) {
      const renamed = line.replace(/^Overhead Press/, 'Landmine Press')
      const scaled = scaleAllPercentages(renamed, 0.70)
      // Overhead Press is never percentage-ramped in these templates (plain
      // sets x reps), so there's usually no numeric max to scale — make the
      // load reduction explicit as text instead of silently doing nothing.
      return scaled === renamed ? `${renamed} (70% of your usual Overhead Press load)` : scaled
    }
    if (/^Bench Press\b/.test(line)) {
      return line.replace(/^Bench Press/, 'DB Bench Press') + ' (use a controlled range of motion)'
    }
    return line
  })
  return ensureShoulderWarmup(lines.join('\n'), focus)
}

function applyKneeAdjustments(description) {
  return description.split('\n').map(line => {
    if (/^Back Squat\b/.test(line)) {
      return scaleAllPercentages(line.replace(/^Back Squat/, 'Goblet Squat'), 0.60)
    }
    if (/\bDepth Jumps?\b/.test(line)) {
      return line.replace(/Depth Jumps?/, 'Box Step-Ups')
    }
    if (/^Bulgarian Split Squat\b/.test(line)) {
      return line.replace(/^Bulgarian Split Squat/, 'Reverse Lunge') + ' (reduced load)'
    }
    return line
  }).join('\n')
}

const SPINAL_FLEXION_RE = /^(Core — Sit-ups|Sit-ups|Ab Wheel|Good Mornings?|Weighted Sit-?ups?)\b/

function applyBackAdjustments(description) {
  return description.split('\n')
    .filter(line => !SPINAL_FLEXION_RE.test(line))
    .map(line => {
      if (/^Trap Bar Deadlift\b/.test(line)) {
        return scaleAllPercentages(line.replace(/^Trap Bar Deadlift/, 'Romanian Deadlift'), 0.70)
      }
      if (/^Hex Bar Deadlift\b/.test(line)) {
        return scaleAllPercentages(line.replace(/^Hex Bar Deadlift/, 'Romanian Deadlift'), 0.70)
      }
      return line
    }).join('\n')
}

function applyHipAdjustments(description) {
  return description.split('\n').map(line => {
    if (/^Bulgarian Split Squat\b/.test(line)) {
      return line.replace(/^Bulgarian Split Squat/, 'Single Leg Press')
    }
    const m = line.match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
    if (m && /\bLunge\b/i.test(m[1])) {
      const [, name, sets, reps, rest] = m
      const newSets = Math.max(1, Math.round(parseInt(sets, 10) * 0.50))
      return `${name}: ${newSets}x${reps}${rest}`
    }
    return line
  }).join('\n')
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
const MAIN_LIFT_KEYWORDS = /^(Power Clean(?: from floor)?|Hang Power Clean|Hang Clean|BB Split Jerk|Push Jerk|Split Jerk|Snatch|Hang Snatch|Power Snatch|Clean Pull|Clean and Jerk)\b/

function isMainLiftLine(line) {
  const colonIdx = line.indexOf(':')
  const name = colonIdx > 0 ? line.slice(0, colonIdx) : line
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
  const colonIdx = line.indexOf(':')
  if (colonIdx <= 0) return false
  const name = line.slice(0, colonIdx)
  if (isMobilityCoreExempt(name)) return false
  return /^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/.test(line) ||
         /^(.*?):\s*(\d+)x(\d+)\s*warmup,\s*(\d+)x(\d+[a-zA-Z]*|AMAP)\s*working(.*)$/.test(line)
}

function rotateAccessoryName(name, wip) {
  const entry = ACCESSORY_ROTATION[name.toLowerCase().trim()]
  if (!entry || !entry[wip]) return name
  return entry[wip]
}

function applyAccessoryProgression(weeks) {
  return weeks.map(week => {
    const wip = ((week.week_number - 1) % 4) + 1
    if (wip === 4) return week // deload weeks: applyDeloadAdjustments handles volume on its own, separately

    const volumeFactor = ACCESSORY_VOLUME_WAVE[wip]

    return {
      ...week,
      sessions: week.sessions.map(session => {
        let inCoreBlock = false
        const lines = session.description.split('\n').map(line => {
          if (/^Core\s*—/.test(line)) { inCoreBlock = true; return line }
          if (line === '') { inCoreBlock = false; return line }
          if (!isAccessoryLine(line, inCoreBlock)) return line

          const colonIdx = line.indexOf(':')
          const name = line.slice(0, colonIdx)
          const rest = line.slice(colonIdx)
          const rotated = rotateAccessoryName(name, wip)
          const renamed = rotated === name ? line : rotated + rest
          return scaleAccessoryLineVolume(renamed, volumeFactor)
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
const CONDITIONING_EXERCISE_RE = /^(Sprint Work|Sprint Ladder|Sprint \+ Close Out|Sprint \+ Jog Ladder|Repeat Sprint|300 Yard Shuttle|Flying 20s|17s Drill|Baseline Sprint|Defensive Slide(?: Sprint)?|Post Sprint|Box Out Drill|Shuffle Step|Full Court Sprint|V Drill|Star Drill|200m Intervals|400m [Rr]epeats|Isometric (?:Squat|Pull) Hold|Weighted Carries(?: Medley)?|Farmer Carr(?:y|ies)|Battle Rope|Wrestle-Outs|Sled Push|Sled Sprint|Sled Drag|Pro Agility(?: Drill)?|5-10-5(?: Shuttle)?|Cone Drill(?:\s*\(5-10-5\))?|Deceleration Drill|Lateral Shuffle(?: Sprint)?|T-Drill|Aerobic Finish|Tempo [Rr]un)\b/

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
  return CONDITIONING_HEADER_RE.test(line) || CONDITIONING_EXERCISE_RE.test(line)
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

    if (/^Core\s*—/.test(line)) {
      inCoreBlock = true
      kept.push(line)
      continue
    }
    if (line === '') {
      inCoreBlock = false
      kept.push(line)
      continue
    }

    const colonIdx = line.indexOf(':')
    const name = colonIdx > 0 ? line.slice(0, colonIdx) : line
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

  weeks = applyAccessoryProgression(weeks)
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
    templateDescription: '16-week phase-based offseason program for baseball athletes. Phase 1 (70%) → Phase 2 (75%) → Phase 3 (80%) → Phase 4 (85%). Squat and Trap Bar Deadlift weights auto-calculate from logged maxes.',
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
      { num: 4, label: 'Peak',        pct: '85%', weeks: '13–16' },
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
    templateDescription: '16-week phase-based offseason program for softball athletes, built on the same core programming as our baseball template. Phase 1 (70%) → Phase 2 (75%) → Phase 3 (80%) → Phase 4 (85%). Squat and Trap Bar Deadlift weights auto-calculate from logged maxes.',
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
      { num: 4, label: 'Peak',        pct: '85%', weeks: '13–16' },
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
    phases: [
      { num: 1, label: 'Accumulation',   pct: '65–75%', weeks: '1–4'   },
      { num: 2, label: 'Strength Build', pct: '75–82%', weeks: '5–8'   },
      { num: 3, label: 'Peak Strength',  pct: '82–88%', weeks: '9–12'  },
      { num: 4, label: 'Maximum Output', pct: '88–93%', weeks: '13–16' },
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
      { num: 4, label: 'Peak',             pct: '80–88%', weeks: '13–16' },
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
      { num: 4, label: 'Peak',           pct: '82–88%', weeks: '13–16' },
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

module.exports = { generateBlueprintForAthlete, SPORT_TEMPLATES, TEMPLATE_GOALS, applyDeloadAdjustments, applyAccessoryProgression, superset, SUPERSET_MARKER_RE }
