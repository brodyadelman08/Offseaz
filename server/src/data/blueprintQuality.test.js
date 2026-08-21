'use strict'

// ─── Blueprint Quality Assertion Suite ──────────────────────────────────
// Separate from blueprintTemplates.golden.test.js on purpose. Golden
// proves "this week's exact text hasn't changed since I last looked" — it
// has no opinion on whether that text was ever correct, and a passing
// golden suite says nothing about whether a sport is missing a warm-up or
// silently dropped a pull pattern. This suite proves CORRECTNESS by
// programmatic rule, across the full sport x position x day-count x goal
// x phase matrix, using the same tag/template ground truth the generator
// itself renders from wherever that's recoverable (dayLayoutEngine),
// falling back to conservative text heuristics only where documented.
//
// Read-only: every check in blueprintQuality.js generates blueprints with
// the existing, unmodified generator and inspects the result. Nothing
// here ever changes what a blueprint contains.
//
// Each check's test asserts against a documented BASELINE of currently-
// known gaps (mirroring this file's own KNOWN_MISSING convention for
// exercise-library coverage) rather than a bare `toEqual([])` — a suite
// this broad, run for the first time against real production content,
// surfaces real, pre-existing findings on day one; the point is to gate
// NEW regressions, not to silently paper over what's already there. Any
// finding below is a genuine, verified fact about current output — see
// each one's own comment for what it means and why it isn't (yet) fixed
// here. If a baseline entry no longer reproduces, the test warns so it
// can be deleted (same pattern as KNOWN_MISSING's own staleness check).

const q = require('./blueprintQuality')

function keyOf(v, fields) { return fields.map(f => v[f]).join('|') }

function assertAgainstBaseline(violations, baseline, fields, label) {
  const baselineSet = new Set(baseline)
  const unexpected = violations.filter(v => !baselineSet.has(keyOf(v, fields)))
  const stillPresent = new Set(violations.map(v => keyOf(v, fields)))
  const stale = baseline.filter(k => !stillPresent.has(k))
  if (stale.length) {
    console.warn(`[${label}] These baseline entries no longer reproduce — safe to remove:\n${stale.join('\n')}`)
  }
  if (unexpected.length) {
    console.error(`[${label}] ${unexpected.length} NEW violation(s) not in the documented baseline:\n` +
      unexpected.map(v => `  ${keyOf(v, fields)}\n    ${v.detail}`).join('\n'))
  }
  expect(unexpected).toEqual([])
}

describe('Check 1 — movement pattern coverage per archetype/day-count', () => {
  test('every archetype x day-count template provides squat/hinge/H-push/V-push/H-pull/V-pull where the archetype is designed to', () => {
    const violations = q.checkMovementPatternCoverage()
    // Verified findings (not this suite's bug — dayLayoutEngine's own
    // templates, read directly):
    //  - Every 3-day template is the most condensed layout in its
    //    archetype and structurally omits at least one pattern to fit 3
    //    days — a real design tradeoff (condensed session), not a defect.
    //  - feat/warmup-revamp fixed Endurance's "no vertical pull at any day
    //    count" gap by retagging its one pull-family slot (dayLayoutEngine
    //    .js's "Full Body — Unilateral & Mobility/Pull" day) from
    //    ACC_PULL_H to ACC_PULL_V — the actual content in both packs
    //    (Cross Country's "Pull-ups," Swimming's now-"Lat Pulldown") was
    //    always a vertical-pull movement in spirit, so this corrects a
    //    tag/content mismatch rather than adding a new slot. The day only
    //    ever had room for ONE pull-family slot, so this necessarily
    //    trades "no vertical pull" for "no horizontal pull" — a real,
    //    known tradeoff, not a new regression the suite is missing.
    const baseline = [
      'collision|3', 'rotational|3', 'field|3', 'speedpower|3',
      'endurance|3', 'endurance|4', 'endurance|5', 'endurance|6',
    ]
    const unexpected = violations.filter(v => !baseline.includes(`${v.archetype}|${v.days}`))
    if (unexpected.length) console.error(unexpected.map(v => v.detail).join('\n'))
    expect(unexpected).toEqual([])
    // Confirms the 4 permanent (non-3-day) Endurance gaps are specifically
    // "no horizontal pull" now, not something broader silently regressing.
    for (const v of violations.filter(x => x.archetype === 'endurance' && x.days !== 3)) {
      expect(v.missing).toEqual(['horizontal pull'])
    }
  })
})

describe('Check 2 — main-lift reps descend across phases', () => {
  test('every sport/position/day-count/goal shows non-increasing top-set reps from phase 1 through phase 4', () => {
    const violations = q.checkRepDescentAcrossPhases()
    expect(violations).toEqual([])
  })
})

describe('Check 3 — deload weeks reduce volume vs the prior week', () => {
  test('every deload week (4/8/12/16), every sport/position/day-count/goal, cuts non-exempt accessory sets by >=40% vs the prior week', () => {
    const violations = q.checkDeloadReducesVolume()
    expect(violations).toEqual([])
  })
})

describe('Check 4 — exactly one finisher, one warm-up per day', () => {
  test('every day with a real finisher-eligible focus has exactly one finisher block', () => {
    const violations = q.checkOneFinisherOneWarmup()
    const finisherViolations = violations.filter(v => !v.detail.includes('expected a warm-up'))
    expect(finisherViolations).toEqual([])
  })

  // feat/warmup-revamp — FIXED. buildFieldRenderers/buildEnduranceRenderers
  // now register a WARMUP renderer (same pack.warmupLower/warmupUpper
  // mechanism SpeedPower/Rotational already used), and every pack that
  // never set those fields now does, with sport-tailored content: one
  // warm-up per SPORT (not per position — Soccer's 6 positions, Hockey's
  // Defense/Goalie, Basketball's Guards/Wings/Bigs, Rugby's Backs, and
  // Lacrosse each share a single sport-tailored warm-up across every
  // position), except Track, which gets 3 genuinely distinct warm-ups
  // (Sprinters/Throwers/Jumpers — different enough demands to not share
  // one). Baseball/Softball/Pitcher were never in this gap — they use a
  // wholly separate `session.warmup` object field, unaffected by any of
  // this and still correctly detected by the check itself.
  test('every day expecting a warm-up has one, for every sport/position/day-count', () => {
    const violations = q.checkOneFinisherOneWarmup().filter(v => v.detail.includes('expected a warm-up'))
    if (violations.length) console.error(violations.map(v => `${v.sportId}/${v.posId} ${v.days}d ${v.day}: ${v.detail}`).join('\n'))
    expect(violations).toEqual([])
  })
})

describe('Check 5 — no day exceeds the movement cap; no authored movement dropped', () => {
  test('zero authored movements are ever silently dropped, anywhere in the matrix', () => {
    const { violations } = q.checkNoDropsWithinCap()
    expect(violations).toEqual([])
  })

  // SPORT_MAX_ACCESSORIES is documented as informational, not enforced
  // (see its own comment in blueprintTemplates.js: "no longer load-bearing
  // for content survival") — reported here as a documentation-accuracy
  // signal, not a hard failure.
  test('SPORT_MAX_ACCESSORIES stays a reasonably accurate sizing signal (informational)', () => {
    const { informational } = q.checkNoDropsWithinCap()
    if (informational.length) {
      console.warn(`[cap sizing, informational only] ${informational.length} day(s) exceed their documented cap:\n` +
        informational.map(v => `  ${v.sportId}/${v.posId} ${v.days}d ${v.day}: ${v.detail}`).join('\n'))
    }
    // Not a fail — the cap is explicitly non-enforced. This just keeps a
    // record. If this list grows a lot, the documented caps are worth a
    // refresh pass.
    expect(informational.length).toBeLessThan(10)
  })
})

describe('Check 6 — arm care appears only in allow-listed spots', () => {
  // "Arm care" = the finisher engine's own dedicated 'arm' family (the
  // "Arm Care —" header block, hasArmCare + dayCompatibility-gated) — see
  // blueprintQuality.js's own comment on why this deliberately does NOT
  // name-match shoulder-health exercise vocabulary (that vocabulary is
  // also legitimate, ungated ACC_SHOULDER pool content available to every
  // sport regardless of hasArmCare).
  //
  // feat/warmup-revamp — FIXED. Football QB, Tennis, and Track Throw now
  // carry the same rotationalDayCompat + rotationalFinisherPlanDays guard
  // baseball already had (floors finisher planning to 4 "virtual" days
  // even on a 3-day/6-day plan, so the engine's own last-resort "ignore
  // compatibility" fallback never has to fire for these sports either).
  test('arm care never lands on a lower-body day, for every sport/position/day-count', () => {
    const violations = q.checkArmCareAllowListedSpots()
    if (violations.length) console.error(violations.map(v => v.detail).join('\n'))
    expect(violations).toEqual([])
  })
})

describe('Check 7 — anchors hold the same exercise across all 16 weeks', () => {
  test('main lifts never change name across all 16 weeks; peak/taper (weeks 13-15) and every deload week freeze all accessory names — for every sport/position/day-count', () => {
    const violations = q.checkAnchorsHoldAcross16Weeks()
    if (violations.length) console.error(violations.slice(0, 20).map(v => `${v.sportId}/${v.posId} ${v.days}d: ${v.detail}`).join('\n'))
    expect(violations).toEqual([])
  })
})

describe('Check 8 — no duplicate lines within a day', () => {
  // Pre-existing, all traced to the finisher engine's own content for a
  // handful of sports' 3-day layouts (a day with too few finisher-eligible
  // slots for 5 families lands the same "Med Ball Rotational Throw"/
  // "Suitcase Carry" text twice) — confirmed present on feat/day-layout-
  // engine BEFORE the variety engine existed at all, so it predates and is
  // unrelated to either variety-engine PR. Tracked here, not fixed here
  // (out of scope for a read-only quality suite; flagged as a separate,
  // real finding).
  test('zero NEW same-day duplicate exercise names beyond the documented pre-existing baseline', () => {
    const violations = q.checkNoDuplicateLinesWithinDay()
    const baseline = new Set([
      'football|qb|3|Day 2', 'soccer|goalkeeper|3|Day 3', 'hockey|defense|3|Day 3',
      'hockey|goalie|3|Day 3', 'hockey|goalie|4|Day 3', 'rugby|backs|3|Day 3',
      'tennis|tennis|3|Day 2', 'golf|golf|3|Day 3', 'golf|golf|3|Day 2',
      'golf|golf|4|Day 1', 'golf|golf|4|Day 3', 'track|throw|3|Day 2',
      'cross_country|cross_country|3|Day 3', 'lacrosse|lacrosse|3|Day 3',
      'swimming|swimming|3|Day 3',
    ])
    const unexpected = violations.filter(v => !baseline.has(`${v.sportId}|${v.posId}|${v.days}|${v.day}`))
    if (unexpected.length) console.error(unexpected.map(v => `${v.sportId}/${v.posId} ${v.days}d week ${v.week} ${v.detail}`).join('\n'))
    expect(unexpected).toEqual([])
  })
})

describe('Check 9 — no barbell Overhead Press on throwing sports', () => {
  // feat/baseball-ohp-superset-fix — permanent guardrail, not a documented-
  // baseline check like the others above: this one asserts a bare `[]`,
  // every sport/position/day-count/goal/week, because the whole point is
  // that it must fail the moment barbell Overhead Press reappears anywhere
  // in baseball or softball, with no allowance for "already-known" cases.
  test('baseball and softball never prescribe a literal, barbell "Overhead Press", at any position/day-count/goal/week', () => {
    const violations = q.checkNoBarbellOverheadPressOnThrowingSports()
    if (violations.length) console.error(violations.map(v => `${v.sportId}/${v.posId} ${v.days}d ${v.goal}: ${v.detail}`).join('\n'))
    expect(violations).toEqual([])
  })

  // Guards the check itself, not the generator — proves it actually flags
  // a literal barbell Overhead Press line rather than being a structural
  // no-op, without depending on the real generator's current content (so
  // it can't accidentally pass just because baseball happens to be clean
  // right now). Exercises the exact same parseDescription -> name-match
  // path checkNoBarbellOverheadPressOnThrowingSports itself uses.
  test('sanity: the underlying line-matching logic actually flags "Overhead Press", and does not false-positive on a same-worded DB variant', () => {
    const { lines } = q.__parseDescriptionForTest(
      'Incline DB Press: 4x8\nOverhead Press: 3x10\nSeated Single Arm DB Overhead Press: 3x10 each arm'
    )
    const flagged = lines.filter(l => l.name === 'Overhead Press')
    expect(flagged).toHaveLength(1)
    expect(flagged[0].raw).toBe('Overhead Press: 3x10')
  })
})
