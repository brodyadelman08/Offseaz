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
    //  - Endurance NEVER has a dedicated vertical-pull slot at ANY day
    //    count (3-6) — its 4 templates simply don't include ACC_PULL_V
    //    anywhere. Worth a second look: every other archetype gets a
    //    pull-up/lat-pulldown-family movement somewhere; Endurance
    //    (Cross Country, Swimming) never does.
    const baseline = [
      'collision|3', 'rotational|3', 'field|3', 'speedpower|3',
      'endurance|3', 'endurance|4', 'endurance|5', 'endurance|6',
    ]
    const unexpected = violations.filter(v => !baseline.includes(`${v.archetype}|${v.days}`))
    if (unexpected.length) console.error(unexpected.map(v => v.detail).join('\n'))
    expect(unexpected).toEqual([])
    // Confirms the 4 permanent (non-3-day) Endurance gaps are specifically
    // "no vertical pull," not something broader silently regressing.
    for (const v of violations.filter(x => x.archetype === 'endurance' && x.days !== 3)) {
      expect(v.missing).toEqual(['vertical pull'])
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

  // feat/blueprint-quality — a real, verified architecture finding: the
  // Field and Endurance archetype renderer factories (buildFieldRenderers/
  // buildEnduranceRenderers in blueprintTemplates.js) never register a
  // WARMUP renderer at all — `renderers.WARMUP` is only ever assigned in
  // buildCollisionRenderers (unconditional) and buildSpeedPowerRenderers/
  // buildRotationalRenderers (conditional on pack.warmupLower/warmupUpper).
  // Every Field-archetype sport therefore has ZERO warm-up text on every
  // day, at every day-count, full stop — this isn't a per-sport content
  // gap, it's that the archetype's own renderer wiring has no warm-up
  // mechanism to opt into. Endurance is the same story, but only visible
  // on days that structurally carry a lower/upper MAIN_ tag (its
  // low-fatigue/unilateral-only days never expected one anyway).
  // Separately, within the two archetypes that DO support warm-ups
  // (SpeedPower, Rotational), these specific packs simply never set
  // pack.warmupLower/warmupUpper: Basketball (all 3 positions), Volleyball,
  // Track Sprint, Track Jump (SpeedPower); Tennis, Golf (Rotational).
  // Baseball/Softball/Pitcher are NOT in this list — they use a wholly
  // separate `session.warmup` object field (see generateBaseballWeeksFromPack's
  // own doc comment), which this check already accounts for. Track Throw
  // (TRACK_THROW_PACK, Rotational archetype) also never sets warmupLower/
  // warmupUpper, same as Tennis/Golf.
  test('warm-up presence matches the known architecture gaps — Field/Endurance archetypes have no warm-up renderer at all; Basketball/Volleyball/Track (all 3 sub-events)/Tennis/Golf packs never set warmupLower/warmupUpper', () => {
    const violations = q.checkOneFinisherOneWarmup().filter(v => v.detail.includes('expected a warm-up'))
    const sportsWithNoWarmupEver = new Set([
      'soccer', 'hockey', 'rugby', 'lacrosse', // field archetype (hockey/rugby only for their field-archetype positions — see below)
      'basketball', 'volleyball', 'track', // speedpower/rotational packs with no warmupLower/Upper
      'tennis', 'golf', // rotational packs with no warmupLower/Upper
      'cross_country', 'swimming', // endurance archetype
    ])
    // hockey/rugby's Collision positions (forwards) DO have warm-ups —
    // only their Field-archetype positions (defense/goalie, backs) don't.
    const unexpected = violations.filter(v => {
      if (v.sportId === 'hockey' || v.sportId === 'rugby') return v.posId !== (v.sportId === 'hockey' ? 'defense' : 'backs') && v.posId !== 'goalie'
      return !sportsWithNoWarmupEver.has(v.sportId)
    })
    if (unexpected.length) console.error(unexpected.map(v => `${v.sportId}/${v.posId} ${v.detail}`).join('\n'))
    expect(unexpected).toEqual([])
    // Sanity: this is a big, real gap — assert it's still actually present
    // (not accidentally zero, which would mean the baseline above is stale
    // and this test should be revisited/tightened rather than silently
    // staying green for the wrong reason).
    expect(violations.length).toBeGreaterThan(0)
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
  // Verified, real finding: 3 Rotational-archetype sports/day-counts land
  // an "Arm Care —" block on a lower-body day — Football QB (3-day Day 3,
  // 6-day Day 1), Tennis (3-day Day 3, 6-day Day 1), Track Throw (3-day
  // Day 3, 6-day Day 1). All 3 are condensed day-counts (3-day: only 3
  // finisher-eligible slots for 5 families; 6-day Day 1 specifically) —
  // consistent with the finisher engine's own documented last-resort
  // fallback ("ignore compatibility rather than drop the family entirely"
  // — see scheduleFamilies/assignSecondaries in finisherEngine.js) firing
  // when there aren't enough day-compatible slots. Baseball has its own
  // explicit dayCompatibility guard (baseballDayCompat) specifically to
  // never let this fallback fire; these 3 sports don't have an equivalent
  // guard.
  test('arm care lands on a lower-body day only in the documented, condensed-day-count cases', () => {
    const violations = q.checkArmCareAllowListedSpots()
    const baseline = new Set([
      'football|qb|3', 'football|qb|6',
      'tennis|tennis|3', 'tennis|tennis|6',
      'track|throw|3', 'track|throw|6',
    ])
    const unexpected = violations.filter(v => !baseline.has(`${v.sportId}|${v.posId}|${v.days}`))
    if (unexpected.length) console.error(unexpected.map(v => v.detail).join('\n'))
    expect(unexpected).toEqual([])
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
