// ─── Utilities ────────────────────────────────────────────────────────────────

function pct(f) { return `${Math.round(f * 100)}%` }

function getPhaseInfo(weekNum, phases) {
  const idx  = Math.min(3, Math.floor((weekNum - 1) / 4))
  const ph   = phases[idx]
  const wip  = ((weekNum - 1) % 4) + 1
  const t    = (wip - 1) / 3
  const f    = ph.low + (ph.high - ph.low) * t
  const deload = !!ph.deload && wip === 4
  const f2   = deload ? 0.60 : Math.round(f * 100) / 100
  return { phaseNum: idx + 1, phaseLabel: ph.label, f: f2, pct: pct(f2), wip, deload }
}

function buildWeeks(n, phases, sessionsFn) {
  return Array.from({ length: n }, (_, i) => {
    const w    = i + 1
    const info = getPhaseInfo(w, phases)
    return {
      week_number: w,
      objective: info.deload
        ? `Phase ${info.phaseNum} — Deload (60%) · Week ${info.wip} of 4`
        : `Phase ${info.phaseNum} — ${info.phaseLabel} (${info.pct}) · Week ${info.wip} of 4`,
      sessions: sessionsFn(info),
    }
  })
}

// Generic muscle-gain overlay note appended to any session description
function mgNote() {
  return '\n\nMuscle Gain additions: +1-2 sets on all compounds · Rep ranges 8-12 for compounds / 12-15 for accessories · Add Bicep Curls 3x12, Tricep Extensions 3x12, Lateral Raises 3x15, Calf Raises 3x15'
}

// ─── Phase configs ────────────────────────────────────────────────────────────

// Standard sport phases
const FB_PHASES = [
  { label: 'Accumulation',   low: 0.65, high: 0.75 },
  { label: 'Strength Build', low: 0.75, high: 0.82 },
  { label: 'Peak Strength',  low: 0.82, high: 0.88 },
  { label: 'Maximum Output', low: 0.88, high: 0.93, deload: true },
]
const BB_PHASES = [
  { label: 'Foundation',        low: 0.65, high: 0.72 },
  { label: 'Strength',          low: 0.72, high: 0.80 },
  { label: 'Power Conversion',  low: 0.78, high: 0.85 },
  { label: 'Peak',              low: 0.80, high: 0.88, deload: true },
]
const SOC_PHASES = [
  { label: 'Foundation',     low: 0.65, high: 0.72 },
  { label: 'Strength',       low: 0.72, high: 0.80 },
  { label: 'Power-Strength', low: 0.78, high: 0.85 },
  { label: 'Peak',           low: 0.82, high: 0.88, deload: true },
]
const WR_PHASES = [
  { label: 'Accumulation',   low: 0.70, high: 0.80 },
  { label: 'Strength Build', low: 0.80, high: 0.87 },
  { label: 'Peak Strength',  low: 0.87, high: 0.92 },
  { label: 'Max Strength',   low: 0.88, high: 0.95, deload: true },
]
const STD_PHASES = [  // volleyball, track, lacrosse
  { label: 'Foundation',   low: 0.65, high: 0.72 },
  { label: 'Strength',     low: 0.72, high: 0.80 },
  { label: 'Power Blend',  low: 0.78, high: 0.85 },
  { label: 'Peak',         low: 0.82, high: 0.88, deload: true },
]

// Muscle-gain phase config — all sports (65-78%, lower to support volume)
const MG_PHASES = [
  { label: 'Hypertrophy Base',   low: 0.65, high: 0.68 },
  { label: 'Volume Build',       low: 0.68, high: 0.72 },
  { label: 'Strength-Volume',    low: 0.72, high: 0.76 },
  { label: 'Peak Volume',        low: 0.76, high: 0.78, deload: true },
]

// ─── Football ─────────────────────────────────────────────────────────────────

const WU = 'Warm-up Complex: RDL x5 · Hang Clean x5 · Front Squat x5 · Back Squat x5\n\n'
const SPRINT_STD  = '\n\nSprint Work: 10x10 yds · 6x20 yds · 4x40 yds'
const SPRINT_SKILL = '\n\nSprint Work: 10x10 yds · 8x20 yds · 6x40 yds @ 95%'

// Linemen OL/DL
function fbLinemenSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WU}Power Clean from floor: 5x3 working up, last set AMAP\nBack Squat: 5 sets (40/50/60/70/80%) @ ${q}, last set open rep range\nTrap Bar Deadlift: 3x5 @ ${q}\nGoblet Lateral Lunge: 3x4 each leg\nPlate Overhead Sit-ups: 3x12\nDouble Leg Calf Raise: 3x15${SPRINT_STD}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU}Hang Clean: 4x3\nBench Press: 5 sets (40/50/60/70/80%) @ ${q}, last set AMAP\nIncline DB Press: 4x8\nWeighted Pull-ups: 4x5\nBB Row: 4x8\nTricep Pushdowns: 3x12\nFace Pulls: 3x15` },
    { day: 'Day 3', focus: 'Lower Strength',
      description: `${WU}Front Squat: 5 sets @ ${q}\nRomanian Deadlift: 4x6\nDB Step-Ups: 3x6 each leg\nDB Suitcase Carries: 3x20 yds each side\nSingle Leg Calf Raise: 3x12\nNordic Hamstring Curl: 3x5${SPRINT_STD}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU}BB Split Jerk: 4x3 working up\nClose Grip Bench Press: 5 sets @ ${q}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 4x8\nDB Shrugs: 3x12\nSled Push: 6x20 yds` },
  ]
}

function fbLinemenMGSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power — Hypertrophy',
      description: `${WU}Power Clean from floor: 4x3\nBack Squat: 6x8-10 @ ${q}\nTrap Bar Deadlift: 4x8 @ ${q}\nGoblet Lateral Lunge: 4x8 each leg\nLeg Curl: 3x12\nDouble Leg Calf Raise: 4x15\nBicep Curls: 3x12\nTricep Extensions: 3x12` },
    { day: 'Day 2', focus: 'Upper Strength — Hypertrophy',
      description: `${WU}Bench Press: 6x8-10 @ ${q}\nIncline DB Press: 5x10\nDB Fly: 3x12\nWeighted Pull-ups: 5x6\nBB Row: 5x10\nLateral Raises: 3x15\nFace Pulls: 4x15\nTricep Pushdowns: 4x12` },
    { day: 'Day 3', focus: 'Lower Strength — Hypertrophy',
      description: `${WU}Front Squat: 5x8-10 @ ${q}\nRomanian Deadlift: 4x10\nDB Step-Ups: 4x8 each leg\nHip Thrust: 4x12\nNordic Hamstring Curl: 3x5\nSingle Leg Calf Raise: 4x12` },
    { day: 'Day 4', focus: 'Upper Volume',
      description: `${WU}Close Grip Bench Press: 5x8-10 @ ${q}\nWeighted Chin-ups: 5x6\nSingle Arm DB Row: 5x10 each arm\nOverhead Press: 4x10\nDB Shrugs: 4x12\nLateral Raises: 3x15\nBicep Curls: 3x12\nFace Pulls: 3x15` },
  ]
}

// Skill WR/DB/RB
function fbSkillSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WU}Power Clean from floor: 5x3 working up\nBack Squat: 4 sets (50/60/70/75%) @ ${q}, last set AMAP\nTrap Bar Deadlift: 3x5 @ ${q}\nDB Squat Jumps: 4x5\nBox Jumps: 4x5\nLateral Bounds: 3x5 each side${SPRINT_SKILL}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU}Hang Clean: 4x3\nBench Press: 4 sets @ ${q}\nDB Incline Press: 3x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU}Front Squat: 4 sets @ ${q}\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: 4x5\nBroad Jumps: 5x3\nHurdle Hops: 3x6${SPRINT_SKILL}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU}BB Split Jerk: 3x3\nPush Press: 4x5\nWeighted Pull-ups: 4x5\nBent Over BB Row: 4x8\nBand External Rotation: 3x15\nMed Ball Chest Pass: 4x5` },
  ]
}

// Hybrid LB/TE/FB
function fbHybridSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `${WU}Power Clean from floor: 5x3 working up\nBack Squat: 4 sets (50/60/70/75%) @ ${q}, last set AMAP\nTrap Bar Deadlift: 3x5 @ ${q}\nDB Squat Jumps: 4x5\nWeighted Vest Box Jumps: 4x5\nLateral Bounds: 3x5 each side\nSled Push: 4x20 yds${SPRINT_SKILL}` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `${WU}Hang Clean: 4x3\nBench Press: 5 sets (40/50/60/70/80%) @ ${q}, last set AMAP\nIncline DB Press: 4x8\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU}Front Squat: 4 sets @ ${q}\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: 4x5\nBroad Jumps: 5x3\nHurdle Hops: 3x6${SPRINT_SKILL}` },
    { day: 'Day 4', focus: 'Upper Power',
      description: `${WU}BB Split Jerk: 3x3\nPush Press: 4x5\nWeighted Pull-ups: 4x5\nBent Over BB Row: 4x8\nBand External Rotation: 3x15\nMed Ball Chest Pass: 4x5` },
  ]
}

// QB
function fbQBSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower',
      description: `${WU}Back Squat: 4 sets @ ${q}\nSingle Leg RDL: 3x8 each leg\nBulgarian Split Squat: 3x6 each leg\nHip Thrust: 4x8\nLateral Bounds: 3x5 each side` },
    { day: 'Day 2', focus: 'Upper & Rotational',
      description: `${WU}Hang Clean: 3x3\nDB Bench: 4x10\nPull-ups: 4xAMAP\nMed Ball Rotational Throw: 4x6 each side\nBand External Rotation: 4x15 each arm\nLandmine Press: 3x8 each arm` },
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `${WU}Power Clean: 4x3\nFront Squat: 3 sets @ ${q}\nBox Jump: 4x5\nBroad Jump: 4x3\nSingle Leg Calf Raise: 3x15` },
    { day: 'Day 4', focus: 'Upper & Shoulder Health',
      description: `${WU}Push Press: 4x5\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nMed Ball Side Throw: 4x6 each side\nBand Pull-Aparts: 4x15\nYTW Shoulder Series: 3x10 each` },
  ]
}

function generateFootballWeeks(posId, goal) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : FB_PHASES
  const fns = {
    linemen: mg ? fbLinemenMGSess : fbLinemenSess,
    skill:   (info) => mg ? fbSkillSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })) : fbSkillSess(info),
    hybrid:  (info) => mg ? fbHybridSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })) : fbHybridSess(info),
    qb:      (info) => mg ? fbQBSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() })) : fbQBSess(info),
  }
  return buildWeeks(16, phases, fns[posId] || fns.linemen)
}

// ─── Basketball ───────────────────────────────────────────────────────────────

function bbGuardSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Strength',
      description: `Back Squat: 4 sets @ ${q}\nBulgarian Split Squat: 4x6 each leg\nKB Rhythmic Split Drop: 3x5 each leg\nDB Squat Jumps: 4x5\nCalf Raises: 4xAMAP\nLateral Bounds: 4x5 each side` },
    { day: 'Day 2', focus: 'Upper',
      description: `Power Clean: 3x3\nDB Bench: 4x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Explosion & Plyos',
      description: `Depth Jumps: 4x5\nBox Jumps: 5x5\nBroad Jumps: 4x4\nSingle Leg Box Jump: 3x4 each leg\nTrap Bar Deadlift: 3x5 @ ${q}\nNordic Hamstring Curl: 3x5` },
    { day: 'Day 4', focus: 'Full Body Power',
      description: `Hang Clean: 4x3\nFront Squat: 4 sets @ ${q}\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Step-Ups: 3x8 each leg\nAnkle Hops: 3x20` },
  ]
}

function bbWingsSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Strength',
      description: `Back Squat: 5 sets @ ${q}\nBulgarian Split Squat: 4x6 each leg\nKB Rhythmic Split Drop: 3x5 each leg\nDB Squat Jumps: 4x5\nCalf Raises: 4xAMAP\nLateral Bounds: 4x5 each side` },
    { day: 'Day 2', focus: 'Upper',
      description: `Power Clean: 3x3\nDB Bench: 4x10\nDB Chest Press (varied grip): 3x10\nWeighted Pull-ups: 4x5\nSingle Arm DB Row: 4x12 each arm\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Explosion & Plyos',
      description: `Depth Jumps: 4x5\nBox Jumps: 5x5\nBroad Jumps: 4x4\nSingle Leg Box Jump: 3x4 each leg\nTrap Bar Deadlift: 4x5 @ ${q}\nNordic Hamstring Curl: 3x5` },
    { day: 'Day 4', focus: 'Full Body Power',
      description: `Hang Clean: 4x3\nFront Squat: 4 sets @ ${q}\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nLateral Step-Ups: 3x8 each leg\nAnkle Hops: 3x20` },
  ]
}

function bbBigsSess(info) {
  // Bigs run ~5% heavier than the phase percentage, closer to Linemen scheme
  const q = pct(Math.min(0.93, info.f + 0.05))
  return [
    { day: 'Day 1', focus: 'Lower Strength',
      description: `Back Squat: 5 sets (40/50/60/70/80%) @ ${q}, last set open\nTrap Bar Deadlift: 4x5 @ ${q} (primary movement)\nBulgarian Split Squat: 3x6 each leg\nDB Squat Jumps: 3x5\nCalf Raises: 4xAMAP` },
    { day: 'Day 2', focus: 'Upper Volume',
      description: `Power Clean: 3x3\nDB Bench: 5x8\nWeighted Pull-ups: 5x5\nBB Row: 4x8\nOverhead Press: 4x8\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Lower Strength',
      description: `Front Squat: 4 sets @ ${q}\nRomanian Deadlift: 4x6\nHip Thrust: 4x8\nSingle Leg RDL: 3x8 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 3xAMAP` },
    { day: 'Day 4', focus: 'Full Body Power',
      description: `Hang Clean: 4x3\nClose Grip Bench Press: 4 sets @ ${q}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nDB Shrugs: 3x12\nAnkle Hops: 3x20` },
  ]
}

function generateBasketballWeeks(posId, goal) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : BB_PHASES
  const baseFns = { guards: bbGuardSess, wings: bbWingsSess, bigs: bbBigsSess }
  const baseFn = baseFns[posId] || bbGuardSess
  const fn = mg
    ? (info) => baseFn(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : baseFn
  return buildWeeks(16, phases, fn)
}

// ─── Soccer ───────────────────────────────────────────────────────────────────

function soccerSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Strength',
      description: `Back Squat: 4 sets @ ${q}\nTrap Bar Deadlift: 3x6 @ ${q}\nNordic Hamstring Curl: 4x5 (critical injury prevention)\nBulgarian Split Squat: 3x8 each leg\nHip Thrust: 3x10\nSingle Leg Calf Raise: 3xAMAP\n\nConditioning (separate from lifting): 200m intervals x8 @ 85% · 400m repeats x4 @ 80% · Agility ladder 3x/week` },
    { day: 'Day 2', focus: 'Full Body Power',
      description: `Power Clean: 3x3\nFront Squat: 3 sets @ ${q}\nSingle Leg RDL: 3x8 each leg\nLateral Bounds: 4x5 each side\nHurdle Hops: 3x6\nDB Bench: 3x10` },
    { day: 'Day 3', focus: 'Conditioning & Accessories',
      description: `Box Jump: 4x5\nBroad Jump: 4x4\nPull-ups: 4xAMAP\nDB Row: 3x12\nHip Abduction: 3x15 each side\nCopenhagen Adductor: 3x8 each leg` },
  ]
}

function generateSoccerWeeks(_, goal) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : SOC_PHASES
  const fn = mg
    ? (info) => soccerSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : soccerSess
  return buildWeeks(16, phases, fn)
}

// ─── Wrestling ────────────────────────────────────────────────────────────────

function wrestlingSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Max Strength',
      description: `Back Squat: 5 sets @ ${q} (highest loading — max effort)\nTrap Bar Deadlift: 4x4 @ ${q}\nWeighted Pull-ups: 5xAMAP\nNordic Hamstring Curl: 3x5\nSingle Leg RDL: 3x8 each leg` },
    { day: 'Day 2', focus: 'Upper Max Strength',
      description: `Bench Press: 5 sets @ ${q}\nWeighted Pull-ups: 5xAMAP\nBB Row: 4x6\nOverhead Press: 4x8\nNeck Strengthening: 3x12 each direction\nGrip Work: 3x30 seconds each` },
    { day: 'Day 3', focus: 'Explosive Power',
      description: `Power Clean: 5x3\nFront Squat: 4 sets @ ${q}\nBox Jump: 5x5\nMed Ball Slam: 4x8\nSprawl Drills: 3x10\nLevel Change Explosive Sprawl: 4x8` },
    { day: 'Day 4', focus: 'Conditioning & Accessory',
      description: `Weighted Carries: Farmer / Suitcase / Rack — 3 sets each\nPull-up max set x3\nPush-up max set x3\nIsometric Squat Hold: 3x30 seconds\nIsometric Pull Hold: 3x30 seconds\n400m repeats x6` },
  ]
}

function generateWrestlingWeeks(_, goal) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : WR_PHASES
  const fn = mg
    ? (info) => wrestlingSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : wrestlingSess
  return buildWeeks(16, phases, fn)
}

// ─── Volleyball ───────────────────────────────────────────────────────────────

function volleyballSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `Back Squat: 4 sets @ ${q}\nBulgarian Split Squat: 4x6 each leg\nBox Jump: 5x5\nDepth Jump: 4x5\nSingle Leg Box Jump: 3x5 each leg\nCalf Raises: 4xAMAP` },
    { day: 'Day 2', focus: 'Upper & Shoulder Health',
      description: `DB Bench: 4x10\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nBand External Rotation: 4x15 each arm\nYTW Series: 3x10 each\nOverhead Press: 3x10\nFace Pulls: 3x15` },
    { day: 'Day 3', focus: 'Full Body Explosion',
      description: `Power Clean: 4x3\nTrap Bar Deadlift: 3x6 @ ${q}\nApproach Jump: 5x5\nLateral Bounds: 4x5 each side\nHip Thrust: 4x8\nBand Pull-Aparts: 3x20` },
  ]
}

function generateVolleyballWeeks(_, goal) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : STD_PHASES
  const fn = mg
    ? (info) => volleyballSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : volleyballSess
  return buildWeeks(16, phases, fn)
}

// ─── Track & Field ────────────────────────────────────────────────────────────

function trackSprintSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 5x3\nBack Squat: 5 sets @ ${q}\nHip Thrust: 4x8\nBox Jump: 5x5\nBroad Jump: 4x4\nSingle Leg RDL: 3x8 each leg` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: 4 sets @ ${q}\nPull-ups: 4xAMAP\nDB Row: 3x12\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Explosion',
      description: `Hang Clean: 4x3\nFront Squat: 4 sets @ ${q}\nDepth Jump: 4x5\nHurdle Hops: 4x6\nBounding: 3x20m\nWicket Drills: 3x30m` },
    { day: 'Day 4', focus: 'Posterior Chain',
      description: `Trap Bar Deadlift: 4x5 @ ${q}\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x10\nSingle Leg Calf Raise: 4xAMAP\nSled Sprint: 6x20 yds` },
  ]
}

function trackThrowSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean from floor: 5x3 working up, last set AMAP\nBack Squat: 5 sets (40/50/60/70/80%) @ ${q}, last set open rep range\nTrap Bar Deadlift: 3x5 @ ${q}\nGoblet Lateral Lunge: 3x4 each leg\nDouble Leg Calf Raise: 3x15` },
    { day: 'Day 2', focus: 'Upper Strength & Rotational',
      description: `Bench Press: 5 sets @ ${q}\nPull-ups: 4xAMAP\nBB Row: 4x8\nOverhead Press: 4x8\nMed Ball Rotational Throw: 4x6 each side\nMed Ball Overhead Slam: 4x8\nRotational Cable Throw: 4x8 each side` },
    { day: 'Day 3', focus: 'Lower Strength',
      description: `Front Squat: 5 sets @ ${q}\nRomanian Deadlift: 4x6\nDB Step-Ups: 3x6 each leg\nNordic Hamstring Curl: 3x5\nSingle Leg Calf Raise: 3x12` },
    { day: 'Day 4', focus: 'Upper Power & Rotational',
      description: `BB Split Jerk: 4x3 working up\nClose Grip Bench Press: 4 sets @ ${q}\nWeighted Chin-ups: 4x5\nSingle Arm DB Row: 4x10 each arm\nMed Ball Rotational Throw: 4x6 each side\nRotational Cable Throw: 4x8 each side` },
  ]
}

function trackJumpSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 5x3\nBack Squat: 5 sets @ ${q}\nHip Thrust: 4x8\nBox Jump: 5x5\nBroad Jump: 4x4\nSingle Leg RDL: 3x8 each leg\nSingle Leg Depth Jump: 4x4 each leg\nApproach Jump Work: 3 sets` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: 4 sets @ ${q}\nPull-ups: 4xAMAP\nDB Row: 3x12\nOverhead Press: 3x10\nBand Pull-Aparts: 3x15` },
    { day: 'Day 3', focus: 'Explosion — Jumps Focus',
      description: `Hang Clean: 4x3\nFront Squat: 4 sets @ ${q}\nDepth Jump: 4x5\nHurdle Hops: 4x6\nBounding: 3x20m\nSingle Leg Broad Jump: 3x3 each leg\nSingle Leg Box Jump: 3x5 each leg\nApproach Jump Work: 3 sets` },
    { day: 'Day 4', focus: 'Posterior Chain',
      description: `Trap Bar Deadlift: 4x5 @ ${q}\nNordic Hamstring Curl: 4x5\nHip Thrust: 4x10\nSingle Leg Calf Raise: 4xAMAP\nSled Sprint: 6x20 yds` },
  ]
}

function generateTrackWeeks(subtype, goal) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : STD_PHASES
  const baseFns = { sprint: trackSprintSess, throw: trackThrowSess, jump: trackJumpSess }
  const baseFn = baseFns[subtype] || trackSprintSess
  const fn = mg
    ? (info) => baseFn(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : baseFn
  return buildWeeks(16, phases, fn)
}

// ─── Cross Country ────────────────────────────────────────────────────────────

function xcSess() {
  return [
    { day: 'Day 1', focus: 'Lower (Low Load)',
      description: `Back Squat: 3x8 @ 65-70% only — no heavy loading\nSingle Leg RDL: 3x10 each leg\nNordic Hamstring Curl: 3x5\nCalf Raises: 4xAMAP\nHip Thrust: 3x12\nCopenhagen Adductor: 3x8 each leg` },
    { day: 'Day 2', focus: 'Full Body Light',
      description: `Goblet Squat: 3x12\nPull-ups: 3xAMAP\nPush-ups: 3xAMAP\nSingle Leg RDL: 3x10 each leg\nBand Work: Hip Abduction · External Rotation — 3x15 each\nCore Circuit: 3 rounds` },
  ]
}

const XC_PHASE_LABELS = ['Injury Prevention Base', 'Base Strength', 'Maintenance', 'Pre-Season Taper']

function generateXCWeeks() {
  return Array.from({ length: 16 }, (_, i) => {
    const w   = i + 1
    const phi = Math.min(3, Math.floor((w - 1) / 4))
    const wip = ((w - 1) % 4) + 1
    return {
      week_number: w,
      objective: phi === 3 && wip === 4
        ? `Phase 4 — Taper Week · Week ${wip} of 4`
        : `Phase ${phi + 1} — ${XC_PHASE_LABELS[phi]} · Week ${wip} of 4`,
      sessions: xcSess(),
    }
  })
}

// ─── Lacrosse ─────────────────────────────────────────────────────────────────

function lacrosseSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 4x3\nBack Squat: 4 sets @ ${q}\nTrap Bar Deadlift: 3x5 @ ${q}\nSingle Leg RDL: 3x8 each leg\nNordic Hamstring Curl: 3x5\nLateral Bounds: 4x5 each side` },
    { day: 'Day 2', focus: 'Upper',
      description: `Bench Press: 4 sets @ ${q}\nPull-ups: 4xAMAP\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nMed Ball Rotational Throw: 4x6 each side\nBand External Rotation: 3x15` },
    { day: 'Day 3', focus: 'Explosion',
      description: `Hang Clean: 4x3\nFront Squat: 3 sets @ ${q}\nBox Jump: 4x5\nBroad Jump: 4x4\nHurdle Hops: 3x6\nSled Sprint: 6x20 yds` },
    { day: 'Day 4', focus: 'Conditioning',
      description: `200m intervals x8\nAgility ladder work\nChange of direction drills\nCore circuit — 3 rounds` },
  ]
}

function generateLacrosseWeeks(_, goal) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : STD_PHASES
  const fn = mg
    ? (info) => lacrosseSess(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : lacrosseSess
  return buildWeeks(16, phases, fn)
}

// ─── Swimming ─────────────────────────────────────────────────────────────────

const SWIM_PHASE_LABELS = ['Base Dryland', 'Build Dryland', 'Strength Dryland', 'Peak Dryland']

function swimSess(phaseNum) {
  const sets = phaseNum <= 2 ? 3 : 4
  const s = (n) => `${sets}x${n}`
  return [
    { day: 'Day 1', focus: 'Upper — Lat & Shoulder Focus',
      description: `Pull-ups: ${s('AMAP')}\nDB Row: ${s(12)}\nBand External Rotation: ${s(15)} each arm\nYTW Series: ${sets}x10 each\nPush-ups: ${s('AMAP')}\nFace Pulls: ${s(15)}` },
    { day: 'Day 2', focus: 'Core & Lower',
      description: `Goblet Squat: ${s(12)}\nSingle Leg RDL: ${s(10)} each leg\nHip Thrust: ${s(12)}\nPlank variations: ${sets}x45s\nDead Bug: ${s(10)} each side\nBird Dog: ${s(10)} each side` },
    { day: 'Day 3', focus: 'Full Dryland',
      description: `Lat Pulldown: ${s(12)}\nDB Bench: ${s(12)}\nShoulder Press: ${s(12)}\nPull-ups: ${s('AMAP')}\nBand Pull-Aparts: 4x20\nCore Circuit: 3 rounds` },
  ]
}

function generateSwimmingWeeks() {
  return Array.from({ length: 16 }, (_, i) => {
    const w   = i + 1
    const phi = Math.min(3, Math.floor((w - 1) / 4))
    const wip = ((w - 1) % 4) + 1
    return {
      week_number: w,
      objective: phi === 3 && wip === 4
        ? `Phase 4 — Taper · Week ${wip} of 4`
        : `Phase ${phi + 1} — ${SWIM_PHASE_LABELS[phi]} · Week ${wip} of 4`,
      sessions: swimSess(phi + 1),
    }
  })
}

// ─── Baseball ─────────────────────────────────────────────────────────────────

const BASEBALL_PHASE_PCTS   = [0.70, 0.75, 0.80, 0.85]
const BASEBALL_PHASE_LABELS = ['Foundation', 'Development', 'Strength', 'Peak']

function makeBaseballSession(day, focus, exercises) {
  const description = exercises.map(e => {
    const setsReps = e.warmup
      ? `${e.warmup} warmup, ${e.sets}x${e.reps} working`
      : `${e.sets}x${e.reps}`
    const pctStr  = e.pct  ? ` @ ${Math.round(e.pct * 100)}%` : ''
    const noteStr = e.note ? ` (${e.note})` : ''
    return `${e.name}: ${setsReps}${pctStr}${noteStr}`
  }).join('\n')
  return { day, focus, description }
}

function baseball3Day(wp) {
  return [
    makeBaseballSession('Day 1', 'Full Body Strength', [
      { name: 'Squat',               warmup: '2x5', sets: 3, reps: '5', pct: wp },
      { name: 'Bench Press',                        sets: 3, reps: '8' },
      { name: 'Barbell Row',                        sets: 3, reps: '8' },
      { name: 'Core — Cherry Pickers',              sets: 4, reps: '15' },
    ]),
    makeBaseballSession('Day 2', 'Full Body Power', [
      { name: 'Power Clean',         warmup: '2x2', sets: 3, reps: '2' },
      { name: 'Trap Bar Deadlift',                  sets: 3, reps: '6', pct: wp },
      { name: 'Pull-ups',                           sets: 3, reps: 'AMAP' },
      { name: 'Hip Thrust',                         sets: 3, reps: '8' },
      { name: 'Bird Dog Row',                       sets: 4, reps: '10' },
    ]),
    makeBaseballSession('Day 3', 'Full Body Accessory', [
      { name: 'RDL',                                sets: 3, reps: '8' },
      { name: 'Single Arm DB Row',                  sets: 3, reps: '12' },
      { name: 'Bulgarian Split Squat',              sets: 3, reps: '6', note: 'each leg' },
      { name: 'Forearm Curls (Both Ways)',          sets: 3, reps: 'AMAP' },
      { name: 'EXT/INT Rotation',                   sets: 3, reps: 'AMAP' },
      { name: 'Calf Raises',                        sets: 3, reps: 'AMAP' },
    ]),
  ]
}

function baseball4Day(wp, phase) {
  const p3 = phase >= 3
  return [
    makeBaseballSession('Day 1', 'Upper Building', [
      { name: 'Hang Clean',                        sets: 3, reps: '8' },
      { name: 'DB Bench',                          sets: 3, reps: p3 ? '6' : '8' },
      { name: 'Tricep Pushdowns',                  sets: 2, reps: '8', note: '+ 1xAMAP' },
      { name: 'Bench Curls',                       sets: 3, reps: '8' },
      { name: 'Forearm Curls (Both Ways)',         sets: 3, reps: 'AMAP' },
      { name: 'Lat Raises — Side, Front, Back',   sets: 3, reps: 'AMAP' },
      { name: 'Core — Cherry Pickers',             sets: 4, reps: '15' },
      { name: 'Sit-ups',                           sets: 4, reps: '12' },
    ]),
    makeBaseballSession('Day 2', 'Lower Building', [
      { name: 'Reverse Lunge',                     sets: 3, reps: '5', note: 'each leg' },
      { name: 'Box Drop',                          sets: 3, reps: '3' },
      { name: 'Bulgarian Split Squat',             sets: 3, reps: '6', note: 'each leg' },
      { name: 'Calf Raises',                       sets: p3 ? 4 : 3, reps: 'AMAP' },
      { name: 'Hamstring Curls',                   sets: 3, reps: 'AMAP' },
      { name: 'Leg Extensions',                    sets: 3, reps: 'AMAP' },
      { name: 'Core — Tuck-Up',                    sets: 3, reps: 'AMAP' },
      { name: 'EXT/INT Rotation',                  sets: 3, reps: 'AMAP' },
    ]),
    makeBaseballSession('Day 3', 'Upper Power', [
      { name: 'Power Clean',        warmup: '2x2', sets: 3, reps: '2' },
      { name: 'Pull-ups',                          sets: p3 ? 4 : 3, reps: 'AMAP' },
      { name: 'Trap Bar Deadlift',                 sets: 3, reps: '6', pct: wp },
      { name: 'Single Arm DB Row',                 sets: p3 ? 4 : 3, reps: '12' },
      { name: 'Bird Dog Row',                      sets: 4, reps: '10' },
      { name: 'Behind Pulldowns',                  sets: 3, reps: p3 ? '5' : '6' },
      { name: 'Core — Bird Dogs',                  sets: 3, reps: '12' },
      { name: 'Weighted Half Baby Kip-Ups',        sets: 3, reps: '12' },
      { name: 'Rotate and Press',                  sets: 3, reps: '12' },
      { name: 'Triceps',                           sets: 3, reps: '12' },
    ]),
    makeBaseballSession('Day 4', 'Lower Power', [
      { name: 'Squat',              warmup: '2x5', sets: 3, reps: '5', pct: wp },
      { name: 'Box Jump',                          sets: 3, reps: '3' },
      { name: 'RDL',                               sets: 3, reps: p3 ? '6' : '8' },
      { name: 'Weighted Hip Thrust',               sets: p3 ? 4 : 3, reps: '8' },
      { name: 'Banded Pull-Aparts',                sets: 3, reps: '15' },
      { name: 'Back Extensions',                   sets: 3, reps: '12', note: 'drop set' },
      { name: 'Core — EXT/INT Rotation',           sets: 3, reps: 'AMAP' },
    ]),
  ]
}

const BASEBALL_ARM_CARE = makeBaseballSession('Day 5', 'Arm Care & Conditioning', [
  { name: 'Banded Pull-Aparts',     sets: 3,  reps: '15' },
  { name: 'Band External Rotation', sets: 3,  reps: '15' },
  { name: 'Reverse Flys',           sets: 3,  reps: '15' },
  { name: 'Core Work',              sets: 3,  reps: 'AMAP' },
  { name: '30-Yard Sprints',        sets: 10, reps: '1', note: 'full recovery between each' },
])

const BASEBALL_LIGHT_FB = makeBaseballSession('Day 6', 'Lighter Full Body & Weak Points', [
  { name: 'Goblet Squat',   sets: 3, reps: '10' },
  { name: 'Push-ups',       sets: 3, reps: 'AMAP' },
  { name: 'Chin-ups',       sets: 3, reps: 'AMAP' },
  { name: 'Single Leg RDL', sets: 3, reps: '8' },
  { name: 'Core Circuit',   sets: 3, reps: 'AMAP' },
])

function generateBaseballWeeks(_, goal, daysPerWeek) {
  const weeks = []
  for (let w = 1; w <= 16; w++) {
    const phaseIdx    = Math.floor((w - 1) / 4)
    const phase       = phaseIdx + 1
    const wp          = BASEBALL_PHASE_PCTS[phaseIdx]
    const weekInPhase = ((w - 1) % 4) + 1

    let sessions
    if (daysPerWeek === 3) {
      sessions = baseball3Day(wp)
    } else {
      sessions = baseball4Day(wp, phase)
      if (daysPerWeek >= 5) sessions = [...sessions, BASEBALL_ARM_CARE]
      if (daysPerWeek >= 6) sessions = [...sessions, BASEBALL_LIGHT_FB]
    }

    weeks.push({
      week_number: w,
      objective: `Phase ${phase} — ${BASEBALL_PHASE_LABELS[phaseIdx]} (${Math.round(wp * 100)}% working max) · Week ${weekInPhase} of 4`,
      sessions,
    })
  }
  return weeks
}

// ─── Hockey ───────────────────────────────────────────────────────────────────

const HOCKEY_PHASES = [
  { label: 'Foundation',  low: 0.65, high: 0.73 },
  { label: 'Strength',    low: 0.73, high: 0.80 },
  { label: 'Power Build', low: 0.78, high: 0.85 },
  { label: 'Peak',        low: 0.82, high: 0.88, deload: true },
]

function hockeyForwardsSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 4x3\nBack Squat: 4 sets @ ${q}\nHip Thrust: 4x8\nLateral Bounds: 4x5 each side\nSingle Leg RDL: 3x8 each leg\nCopenhagen Adductor: 3x8 each leg` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `Bench Press: 4 sets @ ${q}\nPull-ups: 4xAMAP\nSingle Arm DB Row: 4x10 each arm\nOverhead Press: 3x10\nFace Pulls: 3x15\nBand External Rotation: 3x15` },
    { day: 'Day 3', focus: 'Lower Explosion',
      description: `Hang Clean: 4x3\nFront Squat: 3 sets @ ${q}\nBox Jump: 4x5\nLateral Step-Ups: 3x10 each leg\nBulgarian Split Squat: 3x6 each leg\nHurdle Hops: 3x6` },
    { day: 'Day 4', focus: 'Full Body Power',
      description: `Trap Bar Deadlift: 4x5 @ ${q}\nPush Press: 4x5\nWeighted Pull-ups: 4x5\nMed Ball Rotational Throw: 4x6 each side\nSled Sprint: 6x20 yds\nSkating-Stance Lateral Lunge: 3x8 each leg` },
  ]
}

function hockeyDefenseSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Lower Power',
      description: `Power Clean: 4x3\nBack Squat: 5 sets (40/50/60/70/80%) @ ${q}, last set open\nTrap Bar Deadlift: 3x5 @ ${q}\nHip Thrust: 4x8\nCopenhagen Adductor: 3x8 each leg` },
    { day: 'Day 2', focus: 'Upper Strength',
      description: `Bench Press: 5 sets @ ${q}, last set AMAP\nPull-ups: 4xAMAP\nBB Row: 4x8\nOverhead Press: 4x8\nFace Pulls: 3x15\nBand External Rotation: 3x15` },
    { day: 'Day 3', focus: 'Lower Strength',
      description: `Front Squat: 4 sets @ ${q}\nRomanian Deadlift: 4x6\nBulgarian Split Squat: 3x6 each leg\nLateral Bounds: 4x5 each side\nNordic Hamstring Curl: 3x5\nCopenhagen Adductor: 3x8 each leg` },
    { day: 'Day 4', focus: 'Full Body Power',
      description: `BB Split Jerk: 3x3\nPush Press: 4x5\nWeighted Pull-ups: 4x5\nMed Ball Rotational Throw: 4x6 each side\nSled Sprint: 6x20 yds` },
  ]
}

function hockeyGoalieSess(info) {
  const q = info.pct
  return [
    { day: 'Day 1', focus: 'Hip Mobility & Lower',
      description: `Hip 90/90 Mobility Circuit: 3x60s\nBack Squat: 3 sets @ ${q} (moderate loading)\nLateral Step-Ups: 4x10 each leg\nHip Thrust: 4x10\nCopenhagen Adductor: 4x10 each leg\nSingle Leg Calf Raise: 3xAMAP` },
    { day: 'Day 2', focus: 'Core & Rotational',
      description: `Med Ball Rotational Throw: 5x6 each side\nLandmine Rotation: 4x8 each side\nPull-ups: 4xAMAP\nSingle Arm DB Row: 3x12 each arm\nPlank variations: 3x45s\nDead Bug: 3x10 each side` },
    { day: 'Day 3', focus: 'Lower Explosion & Lateral',
      description: `Power Clean: 3x3\nBox Jump: 4x5\nLateral Bounds: 4x5 each side\nSingle Leg RDL: 3x10 each leg\nBulgarian Split Squat: 3x6 each leg\nHurdle Hops: 3x6` },
    { day: 'Day 4', focus: 'Upper & Full Body',
      description: `DB Bench: 4x10\nWeighted Pull-ups: 4x5\nPush Press: 3x5\nBand External Rotation: 4x15 each arm\nYTW Series: 3x10 each\nCore Circuit: 3 rounds` },
  ]
}

function generateHockeyWeeks(posId, goal) {
  const mg = goal === 'muscle_gain'
  const phases = mg ? MG_PHASES : HOCKEY_PHASES
  const baseFns = {
    forwards: hockeyForwardsSess,
    defense:  hockeyDefenseSess,
    goalie:   hockeyGoalieSess,
  }
  const baseFn = baseFns[posId] || hockeyForwardsSess
  const fn = mg
    ? (info) => baseFn(info).map(s => ({ ...s, focus: s.focus + ' — Hypertrophy', description: s.description + mgNote() }))
    : baseFn
  return buildWeeks(16, phases, fn)
}

// ─── Exported template groups ─────────────────────────────────────────────────

export const SPORT_TEMPLATES = [
  {
    id: 'baseball',
    label: '⚾ Baseball',
    daysPerWeekPicker: true,
    daysOptions: [
      { days: 3, desc: 'Full Body split (3 sessions)' },
      { days: 4, desc: 'Upper/Lower split (4 sessions)' },
      { days: 5, desc: 'Upper/Lower + Arm Care' },
      { days: 6, desc: 'Upper/Lower + Arm Care + Light Day' },
    ],
    positions: [
      { id: 'baseball', label: 'Baseball', sublabel: '16-Week Offseason', desc: '4-phase program built for baseball athletes. Squat and Trap Bar Deadlift weights auto-calculate from logged maxes.' },
    ],
    phases: [
      { num: 1, label: 'Foundation',  pct: '70%', weeks: '1–4'   },
      { num: 2, label: 'Development', pct: '75%', weeks: '5–8'   },
      { num: 3, label: 'Strength',    pct: '80%', weeks: '9–12'  },
      { num: 4, label: 'Peak',        pct: '85%', weeks: '13–16' },
    ],
    generateWeeks: generateBaseballWeeks,
  },
  {
    id: 'football',
    label: '🏈 Football',
    daysPerWeek: 4,
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
    label: '🏀 Basketball',
    daysPerWeek: 4,
    positions: [
      { id: 'guards', label: 'Guards',          sublabel: 'PG / SG', desc: 'Speed, vertical, lateral quickness' },
      { id: 'wings',  label: 'Wings / Forwards', sublabel: 'SF / PF', desc: 'Vertical, strength, wingspan' },
      { id: 'bigs',   label: 'Bigs',            sublabel: 'C',       desc: 'Strength, rebounding power, contact durability' },
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
    label: '⚽ Soccer',
    daysPerWeek: 3,
    positions: [
      { id: 'soccer', label: 'Soccer', sublabel: 'All positions', desc: 'Hamstring health, repeated sprint ability, lower body durability' },
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
    label: '🏒 Hockey',
    daysPerWeek: 4,
    positions: [
      { id: 'forwards', label: 'Forwards', sublabel: 'F',       desc: 'Speed, explosion, shot power, skating stride' },
      { id: 'defense',  label: 'Defense',  sublabel: 'D',       desc: 'Strength, board battles, gap control' },
      { id: 'goalie',   label: 'Goalie',   sublabel: 'G',       desc: 'Hip mobility, lateral explosiveness, rotational strength' },
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
    id: 'wrestling',
    label: '🤼 Wrestling',
    daysPerWeek: 4,
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
    label: '🏐 Volleyball',
    daysPerWeek: 3,
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
    label: '🏃 Track & Field',
    daysPerWeek: 4,
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
    label: '🌲 Cross Country',
    daysPerWeek: 2,
    positions: [
      { id: 'cross_country', label: 'Cross Country', sublabel: 'All distances', desc: 'Injury prevention, aerobic support, minimal lifting fatigue' },
    ],
    phases: [
      { num: 1, label: 'Injury Prevention', pct: '65–70%', weeks: '1–4'   },
      { num: 2, label: 'Base Strength',     pct: '65–70%', weeks: '5–8'   },
      { num: 3, label: 'Maintenance',       pct: '65–70%', weeks: '9–12'  },
      { num: 4, label: 'Pre-Season Taper',  pct: '60–65%', weeks: '13–16' },
    ],
    generateWeeks: () => generateXCWeeks(),
  },
  {
    id: 'lacrosse',
    label: '🥍 Lacrosse',
    daysPerWeek: 4,
    positions: [
      { id: 'lacrosse', label: 'Lacrosse', sublabel: 'All positions', desc: 'Soccer conditioning with football upper body demands' },
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
    label: '🏊 Swimming',
    daysPerWeek: 3,
    positions: [
      { id: 'swimming', label: 'Swimming', sublabel: 'Dryland only', desc: 'Shoulder stability, core strength, lat development' },
    ],
    phases: [
      { num: 1, label: 'Base Dryland',     pct: 'Bodyweight', weeks: '1–4'   },
      { num: 2, label: 'Build Dryland',    pct: 'Bodyweight', weeks: '5–8'   },
      { num: 3, label: 'Strength Dryland', pct: 'Bodyweight', weeks: '9–12'  },
      { num: 4, label: 'Peak Dryland',     pct: 'Bodyweight', weeks: '13–16' },
    ],
    generateWeeks: () => generateSwimmingWeeks(),
  },
]

export const TEMPLATE_GOALS = [
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
