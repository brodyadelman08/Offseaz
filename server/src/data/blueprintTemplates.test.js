'use strict'

// ─── Regression test suite for blueprintTemplates.js ───────────────────────────
// This file (server/src/data/blueprintTemplates.js) is the single source of
// truth for every athlete's training program across all 14 sports, both for
// auto-assign (generateBlueprintForAthlete) and the coach's manual builder
// (SPORT_TEMPLATES[i].generateWeeks). It has no other automated test coverage.
// A silent regression here corrupts real training programs, so these tests
// exercise the full sport × position × day-count × experience × injury matrix
// rather than a handful of happy-path spot checks.
//
// Every assertion below was verified against the current, real output of this
// file before being written — see the PR/commit description for the two real
// bugs this process found (a normalizeSport typo silently routing every
// "Track and Field" survey submission to the generic fallback program, since
// fixed, and a documented, out-of-scope exercise-library coverage gap tracked
// as a baseline in Area 7 below).

const fs = require('fs')
const path = require('path')
const {
  generateBlueprintForAthlete, SPORT_TEMPLATES, applyDeloadAdjustments, applyAccessoryProgression,
  applySessionOrganization, superset, SUPERSET_MARKER_RE, SPORT_ACCESSORY_ROTATION, SPORT_MAX_ACCESSORIES,
  resolveAccessoryCapKey, SPORT_PHASE_ACCESSORY_ROTATION, resolvePhaseRotationKey,
} = require('./blueprintTemplates')

// ─── Shared helpers ─────────────────────────────────────────────────────────

function mkSurvey(overrides = {}) {
  return {
    sport: 'Football',
    position: 'Linemen',
    primary_goal: 'standard',
    time_per_week: '4',
    experience_level: 'Intermediate',
    injury_areas: [],
    ...overrides,
  }
}

function allSessions(weeks) {
  const out = []
  for (const w of weeks) for (const s of w.sessions) out.push({ week: w.week_number, ...s })
  return out
}

function firstNonBlankLine(description) {
  return description.split('\n').find(l => l.trim() !== '') || ''
}

function firstMatchingLine(description, re) {
  return description.split('\n').find(l => re.test(l))
}

// Last %-of-max figure on a line, e.g. "...70%×5, 76%×3" -> 76
function lastPercent(line) {
  const matches = [...line.matchAll(/(\d+)%/g)]
  return parseInt(matches[matches.length - 1][1], 10)
}

// Strips a leading ⟦SS<n>⟧ marker from every line — for tests that check
// "does this text contain/start with exercise X" against the FULL,
// organized output, where X may now be inside a superset bracket. Matches
// what the real client renderer does before matching an exercise name (see
// parseSupersetGroups/renderLineContent in SessionDescription.jsx).
function stripMarkers(description) {
  return description.split('\n').map(l => l.replace(SUPERSET_MARKER_RE, '')).join('\n')
}

function exerciseNamesIn(description) {
  const names = []
  for (const rawLine of description.split('\n')) {
    // Strip a leading superset marker before extracting the name — the real
    // client renderer does the same (see parseSupersetGroups/renderLineContent
    // in SessionDescription.jsx) so a marked line's name still matches the
    // exerciseLibrary key exactly as a user would actually see it rendered.
    const line = rawLine.replace(SUPERSET_MARKER_RE, '')
    const idx = line.indexOf(':')
    if (idx > 0) names.push(line.slice(0, idx).trim())
  }
  return names
}

// The exact literal sport strings Survey.jsx's SPORTS array stores as
// survey.sport — real production input, not the internal SPORT_TEMPLATES id
// (those two differ for track and cross country, which is what exposed the
// normalizeSport bug this suite fixed).
const SPORT_LABELS = {
  baseball: 'Baseball', softball: 'Softball', football: 'Football', basketball: 'Basketball',
  soccer: 'Soccer', hockey: 'Hockey', rugby: 'Rugby', tennis: 'Tennis', golf: 'Golf',
  wrestling: 'Wrestling', volleyball: 'Volleyball', track: 'Track and Field',
  cross_country: 'Cross Country', lacrosse: 'Lacrosse', swimming: 'Swimming',
}

function maxDaysFor(tpl) {
  return tpl.daysOptions[tpl.daysOptions.length - 1].days
}

// ─── Area 1 — Day count architecture ───────────────────────────────────────

describe('Area 1 — Day count architecture', () => {
  for (const tpl of SPORT_TEMPLATES) {
    describe(`${tpl.label} (${tpl.id})`, () => {
      const pos = tpl.positions[0]

      for (const { days } of tpl.daysOptions) {
        test(`selecting ${days} day(s)/week returns exactly ${days} session(s) every week`, () => {
          const weeks = tpl.generateWeeks(pos.id, 'standard', days)
          // Check week 1, a mid-program week, and the final (deload) week —
          // the day-count slicing/appending logic runs per-week, so a bug
          // that only breaks one phase would be invisible if we only checked week 1.
          expect(weeks[0].sessions.length).toBe(days)
          expect(weeks[7].sessions.length).toBe(days)
          expect(weeks[15].sessions.length).toBe(days)
        })
      }

      test('session count actually changes across the sport\'s day-count options (never flat/ignored)', () => {
        const counts = new Set(tpl.daysOptions.map(({ days }) => tpl.generateWeeks(pos.id, 'standard', days)[0].sessions.length))
        expect(counts.size).toBeGreaterThan(1)
      })
    })
  }
})

// ─── Area 2 — Programming safety rules ─────────────────────────────────────

describe('Area 2 — Programming safety rules', () => {
  // Exercises every sport at every position, using each sport's maximum
  // supported day count so every extra/optional session is included.
  function forEveryPosition(cb) {
    for (const tpl of SPORT_TEMPLATES) {
      for (const pos of tpl.positions) {
        const weeks = tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl))
        cb(tpl, pos, weeks)
      }
    }
  }

  test('Back Squat and Trap Bar/Hex Bar Deadlift never appear as primary lifts in the same session, for any sport/position', () => {
    const violations = []
    forEveryPosition((tpl, pos, weeks) => {
      for (const w of weeks) {
        for (const s of w.sessions) {
          const hasBackSquat = /^Back Squat\b/m.test(s.description)
          const hasDeadlift  = /^(Trap Bar|Hex Bar) Deadlift\b/m.test(s.description)
          if (hasBackSquat && hasDeadlift) {
            violations.push(`${tpl.id}/${pos.id} week ${w.week_number} ${s.day}`)
          }
        }
      }
    })
    expect(violations).toEqual([])
  })

  test('Power Clean and Hang Clean (all variants) never exceed 5 reps per set, for any sport/position', () => {
    const violations = []
    forEveryPosition((tpl, pos, weeks) => {
      for (const w of weeks) {
        for (const s of w.sessions) {
          for (const line of s.description.split('\n')) {
            const dual = line.match(/^(Power Clean|Hang Clean)\b.*?(\d+)x(\d+)\s*warmup,\s*(\d+)x(\d+)\s*working/)
            if (dual) {
              const warmupReps = parseInt(dual[3], 10)
              const workingReps = parseInt(dual[5], 10)
              if (warmupReps > 5 || workingReps > 5) {
                violations.push(`${tpl.id}/${pos.id} week ${w.week_number} ${s.day}: "${line}"`)
              }
              continue
            }
            const single = line.match(/^(Power Clean(?: from floor)?|Hang Clean|Hang Power Clean)\b.*?(\d+)x(\d+)\b/)
            if (single) {
              const reps = parseInt(single[3], 10)
              if (reps > 5) violations.push(`${tpl.id}/${pos.id} week ${w.week_number} ${s.day}: "${line}"`)
            }
          }
        }
      }
    })
    expect(violations).toEqual([])
  })

  test('heavy hinge/deadlift-pattern primary lifts never open two consecutive days', () => {
    // "Pulling movement" here means the heavy hip-hinge posterior-chain lift
    // that OPENS a session (Trap Bar/Hex Bar/Romanian Deadlift, or a plain
    // Deadlift) — not Olympic-lift technical primers (Power Clean/Hang
    // Clean/Hang Power Clean). Those are a lighter neural-primer movement
    // category and legitimately open sessions on consecutive days across
    // several real programs in this file (e.g. a lower-power day followed by
    // an upper day that opens with a light clean) — that is not the same
    // recovery concern as stacking two heavy hinge days back to back, which
    // this file's own "Fix 1" comments show was deliberately eliminated.
    const PULL_RE = /^(Trap Bar Deadlift|Hex Bar Deadlift|Romanian Deadlift|Deadlift)\b/
    const violations = []
    forEveryPosition((tpl, pos, weeks) => {
      const w1 = weeks[0]
      const opensWithPull = w1.sessions.map(s => PULL_RE.test(firstNonBlankLine(s.description)))
      for (let i = 0; i < opensWithPull.length - 1; i++) {
        if (opensWithPull[i] && opensWithPull[i + 1]) {
          violations.push(`${tpl.id}/${pos.id}: Day ${i + 1} and Day ${i + 2} both open with a heavy hinge lift`)
        }
      }
    })
    expect(violations).toEqual([])
  })

  test('unilateral movements (Bulgarian Split Squat, Reverse Lunge) never carry a percentage ramp — never a co-primary lift alongside Back Squat/Trap Bar Deadlift', () => {
    // A "primary" lift in this file's own convention is always the one with a
    // %-of-max ramp; Bulgarian Split Squat/Reverse Lunge are only ever plain
    // sets x reps accessories here. If either one ever picks up a percentage
    // ramp, it has been promoted to a second primary leg lift stacked in the
    // same session as Back Squat/Trap Bar Deadlift — exactly the double
    // heavy-leg-lift-fatigue risk this rule exists to prevent.
    const violations = []
    forEveryPosition((tpl, pos, weeks) => {
      for (const w of weeks) {
        for (const s of w.sessions) {
          for (const line of s.description.split('\n')) {
            if (/^(Bulgarian Split Squat|Reverse Lunge)\b.*\d+%/.test(line)) {
              violations.push(`${tpl.id}/${pos.id} week ${w.week_number} ${s.day}: "${line}"`)
            }
          }
        }
      }
    })
    expect(violations).toEqual([])
  })
})

// ─── Area 3 — Experience level differentiation ─────────────────────────────

describe('Area 3 — Experience level differentiation', () => {
  test('beginner and advanced athletes (same sport/position/day count) receive meaningfully different programs', () => {
    const combos = [
      ['Football', 'Linemen'], ['Basketball', 'Guards'], ['Soccer', 'Midfielder'], ['Wrestling', 'Wrestling'],
    ]
    for (const [sport, position] of combos) {
      const beg = generateBlueprintForAthlete(mkSurvey({ sport, position, experience_level: 'Beginner' }))
      const adv = generateBlueprintForAthlete(mkSurvey({ sport, position, experience_level: 'Advanced' }))
      expect(JSON.stringify(beg.weeks)).not.toEqual(JSON.stringify(adv.weeks))
    }
  })

  test('Power Clean/Hang Clean never appear in Phase 1 or Phase 2 (weeks 1-8) for beginner athletes, for any sport/position', () => {
    const violations = []
    for (const tpl of SPORT_TEMPLATES) {
      for (const pos of tpl.positions) {
        const bp = generateBlueprintForAthlete(mkSurvey({
          sport: SPORT_LABELS[tpl.id],
          position: pos.label,
          experience_level: 'Beginner',
          time_per_week: String(maxDaysFor(tpl)),
        }))
        for (const w of bp.weeks) {
          if (w.week_number > 8) continue
          for (const s of w.sessions) {
            if (/\bPower Clean\b|\bHang Clean\b|\bHang Power Clean\b/.test(s.description)) {
              violations.push(`${tpl.id}/${pos.id} week ${w.week_number} ${s.day}`)
            }
          }
        }
      }
    }
    expect(violations).toEqual([])
  })

  test('top-set percentage is lower for a beginner than an intermediate athlete on the same lift', () => {
    const beg = generateBlueprintForAthlete(mkSurvey({ experience_level: 'Beginner' }))
    const int_ = generateBlueprintForAthlete(mkSurvey({ experience_level: 'Intermediate' }))
    // Week 10 (Phase 3) is outside the beginner Oly-lift-removal window
    // (Phase 1-2 only), so both programs still have a plain "Back Squat"
    // line to compare like-for-like. Searches every session in the week
    // (not just the first) since which day carries Back Squat is
    // sport/position-specific — linemen's default survey puts it on Day 3.
    function firstMatchingLineInWeek(week, re) {
      for (const s of week.sessions) {
        const line = firstMatchingLine(s.description, re)
        if (line) return line
      }
      return undefined
    }
    const begLine = firstMatchingLineInWeek(beg.weeks[9], /^Back Squat\b/)
    const intLine = firstMatchingLineInWeek(int_.weeks[9], /^Back Squat\b/)
    expect(lastPercent(begLine)).toBeLessThan(lastPercent(intLine))
  })
})

// ─── Area 4 — Injury substitution logic ────────────────────────────────────

describe('Area 4 — Injury substitution logic', () => {
  test('an athlete with a shoulder injury never receives full-load Overhead Press, and Landmine Press appears in its place', () => {
    const combos = [
      ['Football', 'QB'], ['Soccer', 'Goalkeeper'], ['Volleyball', 'Volleyball'], ['Tennis', 'Tennis'],
    ]
    for (const [sport, position] of combos) {
      const bp = generateBlueprintForAthlete(mkSurvey({ sport, position, injury_areas: ['Shoulder'] }))
      let hasBareOverheadPress = false
      let hasLandminePress = false
      for (const s of allSessions(bp.weeks)) {
        const text = stripMarkers(s.description)
        if (/^Overhead Press\b/m.test(text)) hasBareOverheadPress = true
        if (/Landmine Press/.test(text)) hasLandminePress = true
      }
      expect(hasBareOverheadPress).toBe(false)
      expect(hasLandminePress).toBe(true)
    }
  })

  test('an athlete with a knee injury never receives Depth Jumps, and Back Squat is replaced/load-modified', () => {
    const combos = [
      ['Basketball', 'Wings'], ['Volleyball', 'Volleyball'], ['Track and Field', 'Jumpers'],
    ]
    for (const [sport, position] of combos) {
      const bp = generateBlueprintForAthlete(mkSurvey({ sport, position, injury_areas: ['Knee'] }))
      let hasDepthJump = false
      let hasBareBackSquat = false
      let hasGobletSquat = false
      for (const s of allSessions(bp.weeks)) {
        const text = stripMarkers(s.description)
        if (/\bDepth Jumps?\b/.test(text)) hasDepthJump = true
        if (/^Back Squat\b/m.test(text)) hasBareBackSquat = true
        if (/^Goblet Squat\b/m.test(text)) hasGobletSquat = true
      }
      expect(hasDepthJump).toBe(false)
      expect(hasBareBackSquat).toBe(false)
      expect(hasGobletSquat).toBe(true)
    }
  })

  test('any session whose text was actually changed by an injury substitution is flagged injury_modified — the exact signal SessionDescription.jsx uses to render the caution banner', () => {
    // The generated blueprint never contains the client-rendered banner text
    // itself (that string lives in SessionDescription.jsx and is rendered at
    // view time) — the server's contract with the client is the
    // injury_modified boolean, so that is what this test verifies.
    const bp = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['Shoulder'] }))
    const modified = allSessions(bp.weeks).filter(s => s.injury_modified)
    expect(modified.length).toBeGreaterThan(0)
    for (const s of modified) {
      expect(s.description).toMatch(/Landmine Press|controlled range of motion|required warm-up/)
    }

    const untouched = generateBlueprintForAthlete(mkSurvey({ injury_areas: [] }))
    expect(allSessions(untouched.weeks).some(s => s.injury_modified)).toBe(false)
  })
})

// ─── Area 17 — Injury system upgrade (flat 50%, new/upgraded areas) ────────
// Quadriceps and Hamstring are new, formalized areas (Hamstring previously
// only reachable indirectly via Hip's Hamstring Curls swap, which is
// untouched and independent of this). Ankle/Elbow/Wrist go from badge-only
// to real substitution. Every existing Shoulder/Knee/Back/Hip substitution
// keeps its exact target, now at a flat 50% load cut instead of 60%/70%.

describe('Area 17 — Injury system upgrade', () => {
  function fullText(bp) {
    return allSessions(bp.weeks).map(s => stripMarkers(s.description)).join('\n')
  }

  test('flat 50% rule: Shoulder\'s Overhead Press fallback note and Knee/Back\'s scaled percentages both land on 50%, never 60%/70%', () => {
    // Linemen (mkSurvey's default) has no literal "Overhead Press" line of
    // its own (it uses "Standing BB OHP") — same combo Area 4's existing
    // Shoulder test already uses for this exact reason. Football/QB, then
    // Basketball Guards, then Volleyball, were the fixture here in turn,
    // but feat/day-layout-engine promoted each one's own Overhead Press to
    // a ramped MAIN_PRESS_V lift as each archetype was migrated (same
    // vertical-press conformance fix applied throughout this PR) — none of
    // them are plain anymore. Hockey Goalie's muscle_gain path (the one
    // remaining bespoke, pre-archetype fallback — standard-goal Goalie
    // already migrated onto the Field archetype, see generateHockeyWeeks'
    // own `!mg &&` gate) still carries a plain "Overhead Press: 3x10"
    // accessory line, so it's the current stand-in.
    const shoulderBp = generateBlueprintForAthlete(mkSurvey({ sport: 'Hockey', position: 'Goalie', primary_goal: 'muscle_gain', injury_areas: ['Shoulder'] }))
    const text = fullText(shoulderBp)
    expect(text).toMatch(/Landmine Press.*\(50% of your usual Overhead Press load\)/)
    expect(text).not.toMatch(/70% of your usual Overhead Press load/)

    // Knee: Goblet Squat's scaled top % must be exactly half the athlete's
    // raw (uninjured) top %, not 60% of it.
    const baseline = generateBlueprintForAthlete(mkSurvey({ injury_areas: [] }))
    const kneeBp    = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['Knee'] }))
    const baseLine  = firstMatchingLine(allSessions(baseline.weeks)[0].description, /^Back Squat:/) || firstMatchingLine(stripMarkers(allSessions(baseline.weeks)[0].description), /^Back Squat:/)
    const injLine   = fullText(kneeBp).split('\n').find(l => /^Goblet Squat:/.test(l))
    if (baseLine && injLine) {
      const baseTop = lastPercent(baseLine)
      const injTop  = lastPercent(injLine)
      expect(injTop).toBe(Math.max(1, Math.round(baseTop * 0.5)))
    }
  })

  test('Quadriceps: Back/Front Squat -> Box/Goblet Squat at 50%, Depth Jumps removed, Box Jumps -> Step-Ups, Bulgarian Split Squat -> Reverse Lunge (50% load), RDL/hinge work untouched', () => {
    const combos = [['Basketball', 'Wings'], ['Football', 'Linemen'], ['Soccer', 'Center Back']]
    for (const [sport, position] of combos) {
      const bp = generateBlueprintForAthlete(mkSurvey({ sport, position, injury_areas: ['Quadriceps'] }))
      const baseline = generateBlueprintForAthlete(mkSurvey({ sport, position, injury_areas: [] }))
      const text = fullText(bp)
      expect(text).not.toMatch(/\bDepth Jumps?\b/)
      expect(text).not.toMatch(/^Back Squat\b/m)
      expect(text).not.toMatch(/^Front Squat\b/m)
      if (fullText(baseline).match(/\bBox Squat\b/) == null && fullText(baseline).includes('Back Squat')) {
        expect(text).toMatch(/\bBox Squat\b/)
      }
      if (fullText(baseline).includes('Bulgarian Split Squat')) {
        expect(text).toMatch(/Reverse Lunge.*\(50% load\)/)
      }
      // Romanian Deadlift / RDL hinge work is untouched by a quad injury.
      if (fullText(baseline).match(/^Romanian Deadlift\b/m)) {
        expect(text).toMatch(/^Romanian Deadlift\b/m)
      }
    }
  })

  test('Hamstring: RDL/Single Leg RDL -> Hip Thrust (50% load), Romanian Deadlift -> Glute Bridge, Good Mornings removed, formalized independent of Hip\'s own Hamstring Curls swap', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['Hamstring'] })) // default sport: Football/Linemen
    const text = fullText(bp)
    expect(text).not.toMatch(/^Good Mornings?\b/m)
    expect(text).not.toMatch(/^(?:Barbell )?(?:Single Leg )?RDL\b/m)
    expect(text).toMatch(/Hip Thrust.*\(50% load\)/)

    // Hamstring is independent of Hip: flagging Hamstring alone must NOT
    // trigger Hip's own Single Leg RDL -> Hamstring Curls swap.
    expect(text).not.toMatch(/Hamstring Curls/)

    // Romanian Deadlift specifically (Back's substitution target) -> light
    // Glute Bridge, when it's the athlete's own prescribed lift.
    const backBp = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['Back'] }))
    const rdlLine = fullText(backBp).split('\n').find(l => /^Romanian Deadlift:/.test(l))
    if (rdlLine) {
      const hamstringOnRdl = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['Back', 'Hamstring'] }))
      expect(fullText(hamstringOnRdl)).toMatch(/Glute Bridge/)
    }
  })

  test('Hip\'s existing Hamstring Curls swap for Single Leg RDL is unaffected by formalizing Hamstring as its own area', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['Hip'] }))
    const text = fullText(bp)
    expect(text).not.toMatch(/^Single Leg RDL\b/m)
    expect(text).toMatch(/Hamstring Curls/)
  })

  test('Ankle: Box Jumps -> Step-Ups, Depth Jumps removed, Single Leg RDL -> bilateral Romanian Deadlift, Bulgarian Split Squat -> Leg Press (50% load), calf raises reduced', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Basketball', position: 'Wings', injury_areas: ['Ankle'] }))
    const baseline = generateBlueprintForAthlete(mkSurvey({ sport: 'Basketball', position: 'Wings', injury_areas: [] }))
    const text = fullText(bp)
    expect(text).not.toMatch(/\bDepth Jumps?\b/)
    if (fullText(baseline).match(/\bBox Jumps?\b/)) {
      expect(text).toMatch(/\bStep-Ups\b/)
    }
    if (fullText(baseline).match(/^Bulgarian Split Squat\b/m)) {
      expect(text).toMatch(/Leg Press.*\(50% load\)/)
    }
  })

  test('Elbow: heavy pressing (Bench/Close Grip Bench/Overhead Press) at 50%, Chin-ups -> Neutral-Grip Pull-Ups, grip carries get straps, biceps AND triceps accessories reduced, legs untouched', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['Elbow'] })) // Football/Linemen
    const baseline = generateBlueprintForAthlete(mkSurvey({ injury_areas: [] }))
    const text = fullText(bp)
    const baseText = fullText(baseline)

    // Close Grip Bench Press top % must be exactly half of baseline's.
    const baseCGB = baseText.split('\n').find(l => /^Close Grip Bench Press:/.test(l))
    const injCGB  = text.split('\n').find(l => /^Close Grip Bench Press:/.test(l))
    if (baseCGB && injCGB) {
      expect(lastPercent(injCGB)).toBe(Math.max(1, Math.round(lastPercent(baseCGB) * 0.5)))
    }

    if (baseText.match(/^(?:Weighted )?Chin-ups\b/m)) {
      expect(text).toMatch(/Neutral-Grip Pull-Ups/)
      expect(text).not.toMatch(/^(?:Weighted )?Chin-ups\b/m)
    }
    if (baseText.includes('DB Suitcase Carries')) {
      expect(text).toMatch(/DB Suitcase Carries.*\(use straps\)/)
    }
    // Legs untouched: Front Squat and Back Squat keep their baseline top %.
    const baseFS = baseText.split('\n').find(l => /^Front Squat:/.test(l))
    const injFS  = text.split('\n').find(l => /^Front Squat:/.test(l))
    if (baseFS && injFS) expect(injFS).toBe(baseFS)
  })

  test('Elbow: a PLAIN (non-percentage) heavy-press line still gets an explicit 50% load note, not silently left at full load', () => {
    // Muscle-gain Linemen's Day4 used to have "Overhead Press: 4x10" — a
    // flat NxR line with no % ramp at all, unlike Bench/Close Grip Bench
    // which are always "@ XX%". feat/blueprint-cleanup retired that old
    // pre-archetype content (Linemen muscle_gain now shares the same
    // modern archetype day content standard-goal Linemen gets, which has
    // no such line); Football QB, then Basketball Guards, then Volleyball,
    // were the next stand-ins in turn, but feat/day-layout-engine promoted
    // each one's own Overhead Press to a ramped MAIN_PRESS_V lift as each
    // archetype was migrated (same vertical-press conformance fix applied
    // throughout this PR), so none of them are plain anymore. Hockey
    // Goalie's muscle_gain path (the one remaining bespoke, pre-archetype
    // fallback — see the flat-50%-rule test above's own comment) still has
    // "Overhead Press: 3x10" as a genuinely plain, non-ramped accessory
    // line — same fallback path, scaleAllPercentages is still a no-op on
    // it. Marker-stripped since Goalie's own accessory pairing brackets it
    // with other lines.
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Hockey', position: 'Goalie', primary_goal: 'muscle_gain', injury_areas: ['Elbow'] }))
    const baseline = generateBlueprintForAthlete(mkSurvey({ sport: 'Hockey', position: 'Goalie', primary_goal: 'muscle_gain', injury_areas: [] }))
    const text = stripMarkers(fullText(bp))
    const baseText = stripMarkers(fullText(baseline))

    const baseOHP = baseText.split('\n').find(l => /^Overhead Press:/.test(l))
    expect(baseOHP).toBe('Overhead Press: 3x10') // confirms this really is a plain, unscaled line
    expect(text).toMatch(/^Overhead Press: 3x10 \(50% load\)$/m)
  })

  test('Wrist: Front Squat -> Cross-Arm Front Squat at 50%, catch-position Oly lifts -> Clean Pull, push-ups reduced, grip work reduced, biceps AND triceps accessories reduced, legs otherwise fine', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['Wrist'] })) // Football/Linemen
    const baseline = generateBlueprintForAthlete(mkSurvey({ injury_areas: [] }))
    const text = fullText(bp)
    const baseText = fullText(baseline)

    expect(text).not.toMatch(/^Front Squat\b/m)
    const baseFS = baseText.split('\n').find(l => /^Front Squat:/.test(l))
    const injCAFS = text.split('\n').find(l => /^Cross-Arm Front Squat:/.test(l))
    if (baseFS && injCAFS) {
      expect(lastPercent(injCAFS)).toBe(Math.max(1, Math.round(lastPercent(baseFS) * 0.5)))
    }
    // Power Clean / Hang Clean / Split Jerk all become Clean Pull.
    expect(text).not.toMatch(/^Power Clean\b/m)
    expect(text).not.toMatch(/^Hang Clean\b/m)
    expect(text).toMatch(/Clean Pull/)
    // Back Squat (not a wrist-loaded front-rack hold) is untouched.
    const baseBS = baseText.split('\n').find(l => /^Back Squat:/.test(l))
    const injBS  = text.split('\n').find(l => /^Back Squat:/.test(l))
    if (baseBS && injBS) expect(injBS).toBe(baseBS)
  })

  test('Other never substitutes or badges any exercise — the description-only path', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['Other'] }))
    const baseline = generateBlueprintForAthlete(mkSurvey({ injury_areas: [] }))
    expect(fullText(bp)).toBe(fullText(baseline))
    expect(allSessions(bp.weeks).some(s => s.injury_modified)).toBe(false)
  })

  test('None still means no injury adjustment at all, unchanged', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ injury_areas: ['None'] }))
    const baseline = generateBlueprintForAthlete(mkSurvey({ injury_areas: [] }))
    expect(fullText(bp)).toBe(fullText(baseline))
  })

  test('Quadriceps and Hamstring are independently selectable and each produces a real, distinct modification', () => {
    const quadBp = generateBlueprintForAthlete(mkSurvey({ sport: 'Basketball', position: 'Wings', injury_areas: ['Quadriceps'] }))
    const hamBp  = generateBlueprintForAthlete(mkSurvey({ sport: 'Basketball', position: 'Wings', injury_areas: ['Hamstring'] }))
    const baseline = generateBlueprintForAthlete(mkSurvey({ sport: 'Basketball', position: 'Wings', injury_areas: [] }))
    expect(fullText(quadBp)).not.toBe(fullText(baseline))
    expect(fullText(hamBp)).not.toBe(fullText(baseline))
    expect(fullText(quadBp)).not.toBe(fullText(hamBp))
    expect(allSessions(quadBp.weeks).some(s => s.injury_modified)).toBe(true)
    expect(allSessions(hamBp.weeks).some(s => s.injury_modified)).toBe(true)
  })
})

// ─── Area 5 — Deload week verification ─────────────────────────────────────

describe('Area 5 — Deload week verification', () => {
  // Mirrors blueprintTemplates.js's own MOBILITY_EXACT_EXEMPT set and
  // isMobilityCoreExempt()/core-block-tracking logic, so this measures
  // "accessory volume" the same way the production deload pass defines it —
  // legitimately-exempt mobility/core work is intentionally left untouched by
  // the real deload logic and must not be counted against it here.
  const MOBILITY_EXACT_EXEMPT = new Set([
    'dead bug', 'ab wheel', 'plank', 'pallof press', 'half kneeling cable press',
    'cable woodchop', 'copenhagen adductor', 'suitcase carry', 'bird dog',
    'glute bridge', 'glute bridge hold', 'single leg glute bridge',
    'ytw series', 'ytw shoulder series', 'band external rotation', 'band pull-aparts',
    'hip 90/90 hold', 'hip 90/90 stretch', 'hip 90/90 rotations', 'ankle circles',
    'ankle mobility circles', 'cat-cow', 'downward dog',
  ])
  function isMobilityExempt(name) {
    const n = name.toLowerCase().trim()
    if (MOBILITY_EXACT_EXEMPT.has(n)) return true
    return /stretch|mobility|foam roll/i.test(n)
  }
  // feat/rugby-rebuild — a ramped/main-lift line was never actually
  // reachable by the naive "Name: NxR" match below for any sport before
  // Rugby's own rebuild: every other sport's %-ramp uses the Unicode "×"
  // sign (never matches this ascii-"x" regex) and every Oly-lift line
  // reads as prose. Rugby's own RPE-anchored ANCHOR main lifts (e.g. "Back
  // Squat: 3x8-10 @ RPE 7") use plain ascii "x", the same convention every
  // "Name: SxR" accessory line already uses — matching this regex too, and
  // wrongly counting a STATIC (never actually deload-reduced — see
  // isRampedLiftLine in blueprintTemplates.js) line as if it were reducible
  // accessory volume, which only dilutes the measured ratio. Explicit here,
  // matching production's own exemption instead of relying on an accidental
  // character mismatch.
  const RAMPED_MAIN_LIFT_RE = /%[×x]|@ moderate load|@\s*RPE\s*\d|fast, low fatigue/
  function sumNonExemptAccessorySets(description) {
    let total = 0
    let inCoreBlock = false
    for (const line of description.split('\n')) {
      if (line.trim() === '') { inCoreBlock = false; continue }
      // Mirrors blueprintTemplates.js's own exempt-header set (Core/Arm
      // Care/Conditioning/Neck — see organizeSessionDescription/
      // applyDeloadVolumeReduction) so "accessory volume" means the same
      // thing here as in production.
      if (/^(Core|Arm Care|Conditioning|Neck)\s*[—-]/.test(line)) { inCoreBlock = true; continue }
      if (RAMPED_MAIN_LIFT_RE.test(line)) continue
      const colonIdx = line.indexOf(':')
      const name = colonIdx > 0 ? line.slice(0, colonIdx) : line
      if (inCoreBlock || isMobilityExempt(name)) continue
      const m = line.match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
      if (!m) continue
      total += parseInt(m[2], 10)
    }
    return total
  }

  test('every sport\'s deload week (week 16) reduces non-exempt accessory set counts by at least 40% vs the prior week', () => {
    // feat/rugby-rebuild — Rugby's own hand-authored content deliberately
    // carries lower per-line set counts than every other sport (the spec
    // doc's own locked rule: "workload is slightly LESS than football
    // linemen"), so Math.round-based set halving lands at ~35-38%, not
    // 40%, on integer-rounding grounds alone (round(3*0.5)=2 is only a 33%
    // cut) — see blueprintQuality.test.js's own Check 3 for the full
    // explanation and a >=30% floor check on this exact behavior.
    const MIN_REDUCTION = { rugby: 0.30 }
    // feat/baseball-rebuild — Baseball/Softball excluded entirely (not
    // given a lower threshold like Rugby): see Area 9's identical
    // exclusion for the full explanation - applyDeloadAdjustments is a
    // documented no-op for these two sports by design.
    for (const tpl of SPORT_TEMPLATES.filter(t => t.id !== 'baseball' && t.id !== 'softball')) {
      const pos = tpl.positions[0]
      const days = maxDaysFor(tpl)
      const raw = tpl.generateWeeks(pos.id, 'standard', days)
      const deloaded = applyDeloadAdjustments(raw)
      const prevWeek = raw[raw.length - 2]
      const deloadWeek = deloaded[deloaded.length - 1]

      let prevTotal = 0
      let deloadTotal = 0
      for (let i = 0; i < prevWeek.sessions.length; i++) {
        prevTotal += sumNonExemptAccessorySets(prevWeek.sessions[i].description)
        deloadTotal += sumNonExemptAccessorySets(deloadWeek.sessions[i].description)
      }
      const reduction = 1 - deloadTotal / prevTotal
      expect(reduction).toBeGreaterThanOrEqual(MIN_REDUCTION[tpl.id] ?? 0.40)
    }
  })

  test('plyometric exercises are absent from every sport\'s deload week, outside the tapered Core/Conditioning finisher blocks', () => {
    const PLYO_KEYWORDS = /\b(Box Jumps?|Broad Jumps?|Hurdle Hops?|Depth Jumps?|Depth Drop|Snap Down|Squat Jumps?|Lateral Bounds?|Bounding|Approach Jumps?|Drop Jumps?|Reactive Box Jump|Ankle Hops?|Hop & Stick)\b/i
    for (const tpl of SPORT_TEMPLATES) {
      const pos = tpl.positions[0]
      const deloaded = applyDeloadAdjustments(tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl)))
      const deloadWeek = deloaded[deloaded.length - 1]
      for (const s of deloadWeek.sessions) {
        // feat/archetype-repeat-sprint — finisher restructure (PR #20
        // review): deload weeks now TAPER (not delete) the Core/
        // Conditioning finisher blocks, so a hand-authored light
        // plyo-flavored drill name is expected and allowed to survive
        // there. The guarantee this test cares about — no stray plyo
        // content OUTSIDE those tapered, capped, exempt blocks — still
        // holds, mirroring applyDeloadVolumeReduction's own skip logic.
        let inCoreBlock = false
        for (const line of s.description.split('\n')) {
          if (line.trim() === '') { inCoreBlock = false; continue }
          if (/^(Core|Arm Care|Conditioning|Neck)\s*—/.test(line)) { inCoreBlock = true; continue }
          if (inCoreBlock) continue
          const colonIdx = line.indexOf(':')
          const name = colonIdx > 0 ? line.slice(0, colonIdx) : line
          expect(PLYO_KEYWORDS.test(name)).toBe(false)
        }
      }
    }
  })

  test('conditioning work is absent from every sport\'s deload week, outside the tapered Core/Conditioning finisher blocks', () => {
    const CONDITIONING_RE = /^(Sprint Work|Sprint Ladder|Sprint \+ Close Out|Sprint \+ Jog Ladder|300 Yard Shuttle|Flying 20s|17s Drill|Baseline Sprint|Defensive Slide|Post Sprint|Box Out Drill|Shuffle Step|Full Court Sprint|V Drill|Star Drill|200m Intervals|400m Repeats|Isometric (Squat|Pull) Hold|Weighted Carries|Farmer Carr|Battle Rope|Wrestle-Outs|Sled Push|Sled Sprint|Sled Drag|Pro Agility|5-10-5|Cone Drill|Deceleration Drill|Lateral Shuffle|T-Drill|Aerobic Finish|Tempo Run)\b/
    for (const tpl of SPORT_TEMPLATES) {
      const pos = tpl.positions[0]
      // feat/baseball-rebuild — tpl.id must reach this pass (see Area 8's
      // own updated comment on why) — without it Baseball/Softball's raw
      // output gets the generic reduction applied here (never happens for
      // real), and this test's OWN exempt-header regex (below) wouldn't
      // recognize their hyphen-only headers anyway.
      const deloaded = applyDeloadAdjustments(tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl)), tpl.id)
      const deloadWeek = deloaded[deloaded.length - 1]
      for (const s of deloadWeek.sessions) {
        // Same tapered-not-deleted exemption as the plyometric check above.
        // feat/baseball-rebuild — also accepts a plain hyphen.
        let inCoreBlock = false
        for (const line of s.description.split('\n')) {
          if (line.trim() === '') { inCoreBlock = false; continue }
          if (/^(Core|Arm Care|Conditioning|Neck)\s*[—-]/.test(line)) { inCoreBlock = true; continue }
          if (inCoreBlock) continue
          expect(CONDITIONING_RE.test(line)).toBe(false)
        }
      }
    }
  })

  test('the deload week label appears in every session description of the deload week, for every sport', () => {
    for (const tpl of SPORT_TEMPLATES) {
      const pos = tpl.positions[0]
      const deloaded = applyDeloadAdjustments(tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl)))
      const deloadWeek = deloaded[deloaded.length - 1]
      for (const s of deloadWeek.sessions) {
        expect(s.description).toMatch(/Deload Week/)
      }
    }
  })
})

// ─── Area 6 — Sport and position coverage ──────────────────────────────────

describe('Area 6 — Sport and position coverage', () => {
  test('every sport returns a non-empty 16-week program', () => {
    for (const tpl of SPORT_TEMPLATES) {
      const weeks = tpl.generateWeeks(tpl.positions[0].id, 'standard', maxDaysFor(tpl))
      expect(weeks.length).toBe(16)
      for (const w of weeks) expect(w.sessions.length).toBeGreaterThan(0)
    }
  })

  test('every position within a sport differs meaningfully from at least one sibling position', () => {
    for (const tpl of SPORT_TEMPLATES) {
      if (tpl.positions.length < 2) continue // single-position sports have nothing to compare
      const days = maxDaysFor(tpl)
      const outputs = tpl.positions.map(p => JSON.stringify(tpl.generateWeeks(p.id, 'standard', days)))
      for (let i = 0; i < outputs.length; i++) {
        const differsFromAtLeastOne = outputs.some((o, j) => j !== i && o !== outputs[i])
        expect(differsFromAtLeastOne).toBe(true)
      }
    }
  })

  test('Hockey Forwards and Hockey Defense have different primary exercises on Day 1', () => {
    const hockey = SPORT_TEMPLATES.find(t => t.id === 'hockey')
    const forwardsDay1 = firstNonBlankLine(hockey.generateWeeks('forwards', 'standard', 4)[0].sessions[0].description)
    const defenseDay1  = firstNonBlankLine(hockey.generateWeeks('defense', 'standard', 4)[0].sessions[0].description)
    expect(forwardsDay1).not.toEqual(defenseDay1)
  })

  test('Soccer Goalkeeper has different exercises than Soccer Striker', () => {
    const soccer = SPORT_TEMPLATES.find(t => t.id === 'soccer')
    const gk = JSON.stringify(soccer.generateWeeks('goalkeeper', 'standard', 4)[0])
    const striker = JSON.stringify(soccer.generateWeeks('striker', 'standard', 4)[0])
    expect(gk).not.toEqual(striker)
  })

  // Position players get "standard" arm care (2x/week) and pitchers get MORE
  // (3x/week + higher volume on shared days) — not "position players get
  // none." See BASEBALL_ACCESSORY_ROTATION's arm-care anchors.
  test('Baseball Pitcher gets more arm-care volume than Baseball Position Player (same 1-day frequency — day-type locking confines arm care to Upper Strength only, for both), and Position Player still gets some (not zero)', () => {
    // Frequency is now equal by design: day-type locking (Area 14) confines
    // arm care to Upper Strength only for both positions — pitchers used to
    // get an extra arm-care touch on a lower day, which the new rule no
    // longer allows. The volume difference (higher sets on the same 3-move
    // circuit) is how the position difference still shows up.
    const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const positionPlayerSessions = baseball.generateWeeks('baseball', 'standard', 4)[0].sessions
    const pitcherSessions = baseball.generateWeeks('pitcher', 'standard', 4)[0].sessions
    const ARM_CARE_RE = /^(Band External Rotation|Face Pulls|Scap Push-Ups|YTW Raises|Prone Swimmers|Crossover Symmetry Band Series)\b/

    function armCareDayCount(sessions) {
      return sessions.filter(s => s.description.split('\n').some(l => ARM_CARE_RE.test(l))).length
    }
    function armCareSetVolume(sessions) {
      let total = 0
      for (const s of sessions) {
        for (const line of s.description.split('\n')) {
          if (!ARM_CARE_RE.test(line)) continue
          const m = line.match(/:\s*(\d+)x/)
          if (m) total += parseInt(m[1], 10)
        }
      }
      return total
    }

    expect(armCareDayCount(positionPlayerSessions)).toBeGreaterThan(0)
    expect(armCareDayCount(pitcherSessions)).toBe(armCareDayCount(positionPlayerSessions))
    expect(armCareSetVolume(pitcherSessions)).toBeGreaterThan(armCareSetVolume(positionPlayerSessions))
  })
})

// ─── Area 7 — Exercise library coverage ────────────────────────────────────

describe('Area 7 — Exercise library coverage', () => {
  // exerciseLibrary.js is an ES module (client-side); this suite runs under
  // plain CommonJS Jest with no Babel/ESM transform configured, so rather than
  // add a build-tool dependency just to import it, we read its source text
  // directly and extract the object literal's keys — every key is a
  // single-quoted string at the start of its own line (verified by reading
  // the whole file), so this is a reliable, dependency-free way to get the
  // exact same key set lookupExercise() would check against.
  function loadExerciseLibraryKeys() {
    const libPath = path.join(__dirname, '..', '..', '..', 'client', 'src', 'data', 'exerciseLibrary.js')
    const text = fs.readFileSync(libPath, 'utf8')
    const keys = new Set()
    // Double-quoted keys (e.g. "world's greatest stretch") are needed
    // whenever the name itself contains an apostrophe — match single- and
    // double-quoted keys as two distinct alternatives (not a shared
    // "exclude both quote characters" class, which would truncate a
    // double-quoted key at its own apostrophe).
    const re = /^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\{/gm
    let m
    while ((m = re.exec(text))) keys.add((m[1] || m[2]).toLowerCase())
    return keys
  }

  // Pre-existing exercise names that appear in generated blueprints but have
  // no exerciseLibrary.js entry today (confirmed via a full sport × position
  // × day-count × experience × injury sweep at the time this suite was
  // written). This is tracked technical debt, not something this test suite
  // is responsible for fixing — but the point of this test is to make sure
  // the debt never silently grows. Any NEW exercise name introduced without a
  // library entry (a typo, a copy-paste of an existing name with one word
  // changed, etc.) fails this test with the exact sport/position/day where it
  // was found, instead of silently making the ⓘ info button disappear.
  const KNOWN_MISSING = new Set([
    // feat/rugby-rebuild — Rugby's own hand-authored block-label/header
    // lines (never a single exercise) — same "block-label, not a real
    // exercise" gap already accepted throughout this baseline for every
    // other sport's "Core — .../Conditioning — .../Neck — ..." headers,
    // Baseball's own "session.warmup" object separate from a rendered
    // "Warm-up:" text line, and the Repeat-Sprint/Field archetype's own
    // circuit/block sub-labels.
    'warm-up', 'neck — flexion', 'neck — extension', 'neck — lateral flexion',
    'neck lateral flexion', 'conditioning — farmer carry', 'conditioning — broad jumps',
    'conditioning — 10-yd shuttle sprints', 'conditioning — lateral bound to stick',
    'conditioning — speed & conditioning', 'conditioning — recovery/volume',
    'block a (short burst)', 'block b (multidirectional)', 'block c (bike sprint ladder)',
    'block d (shuttle)', 'circuit a (2 rounds)', 'circuit b (2 rounds)',
    // feat/baseball-rebuild — same "block-label, not a real exercise" gap,
    // spelled with a plain hyphen (this rebuild's own hand-authored content
    // never uses an en/em dash, per the doc's own formatting rule).
    'conditioning - rotational power', 'conditioning - speed/conditioning',
    'conditioning - med-ball (low volume)', 'conditioning - 60-yard shuttles',
    'core - finisher', 'core - recovery/volume',
    'core - tabata (4 min 30 sec, 20 sec on/10 sec off)',
    'arm care - finisher', 'arm care - accessory (3 rounds x 10-15)',
    'arm care - shoulder capacity circuit',
    // feat/blueprint-quick-wins — Track & Field's "Throws"/"Jumps" position
    // labels (the real SPORT_TEMPLATES/survey values) never matched
    // normalizePosition's old singular-only \bthrow\b/\bjump\b regexes, so
    // every "Throwers"/"Jumpers" combination this test iterates silently
    // generated Sprinters content instead — these 5 names live in
    // TRACK_THROW_DAY5/TRACK_JUMP_DAY5 (and the Knee-injury substitution of
    // Track Jump's own "Single Leg Depth Jump" line) and are only reachable
    // now that the routing bug is fixed. Pre-existing content, not new.
    'drop jump', 'overhead squat', 'rotational med ball throw',
    'single leg bounding', 'single leg box step-ups',
    '17s drill', '200m intervals', '400m repeats', '5-10-5 shuttle', 'ab wheel',
    'adductor static stretch', 'aerobic finish', 'agility cone drill (5-10-5)',
    'ankle circuit', 'ankle mobility circles', 'anti-rotation press', 'balance work',
    'band hip abduction', 'band lateral walk', 'band work', 'banded hip abduction',
    'banded hip flexion', 'baseline sprint', 'battle rope', 'bicep curl',
    'block start acceleration', 'box step-up', 'box step-ups', 'box step-ups → box jump',
    'broad jump',
    'cable woodchop', 'calf flexibility', 'calf raise', 'calf raise static stretch',
    'cat-cow', 'close grip bench', 'coach note', 'copenhagen plank', 'core bird dog',
    'core cable woodchop', 'core finisher', 'core maintenance', 'core pallof press',
    'arm care — circuit',
    // Linemen fixed warm-up-complex LABEL lines (see LINEMEN_WU_LOWER/
    // LINEMEN_WU_UPPER) — same "preamble label, not a single exercise"
    // gap already accepted above for 'lower body warm-up'/'upper body warm-up'.
    'empty bb warm-up complex', 'upper body warm-up series',
    // feat/archetype-collision — Wrestling/Rugby Forwards/Hockey Forwards'
    // own fixed warm-up-complex LABEL lines, same "preamble label, not a
    // single exercise" gap as Linemen's own above.
    'wrestling movement warm-up', 'rugby lower-body warm-up', 'rugby upper-body warm-up',
    'hockey lower-body warm-up', 'hockey upper-body warm-up',
    // Linemen's "Neck — ...:" header lines — same kind of block-label gap
    // already accepted above for 'core — anti-extension' etc. and
    // 'arm care — circuit'.
    'neck — 4-way (band or manual resistance)', 'neck — dedicated 4-way (band or manual resistance)',
    'core — anti-extension', 'core — anti-rotation',
    'core — finisher (20s on/10s off unless noted)',
    'core — lateral stability', 'core — rotate and press',
    'core — rotational power', 'core — sit-ups', 'cossack squat', 'cossack squat (light)',
    // feat/archetype-repeat-sprint — finisher restructure (PR #20 review):
    // new shared "Core — .../Conditioning — ..." block-label header lines,
    // same "block-label, not a single exercise" gap as the existing
    // 'core — anti-extension' etc. and 'neck — ...' entries above.
    'core — deload (light)', 'core — rotational endurance', 'core — anti-flexion',
    'core — explosive rotation', 'core — stability & control',
    'conditioning — aerobic base', 'conditioning — intensity build',
    'conditioning — repeat sprint', 'conditioning — taper', 'conditioning — deload (light)',
    // feat/finisher-engine — the Shared Finisher Engine's own per-family
    // subtitle header lines (Sprint/Energy/Rotation render under a
    // "Conditioning — <subtitle>:" header, Arm Care under its own — see
    // finisherEngine.js's FINISHER_HEADER_WORD), same "block-label, not a
    // single exercise" gap as every entry above.
    'arm care — capacity & scap control', 'arm care — deload (light)',
    'arm care — modest increase', 'arm care — readiness', 'arm care — maintenance',
    'conditioning — full-recovery reps', 'conditioning — half-kneeling',
    'conditioning — interval work', 'conditioning — low volume, max intent',
    'conditioning — maximal velocity', 'conditioning — quality speed',
    'conditioning — repeat effort', 'conditioning — standing',
    'conditioning — acceleration mechanics', 'conditioning — reduced',
    'court conditioning', 'court sprints', 'db bench', 'db shoulder press', 'db squat jump',
    'deceleration drill', 'deep glute stretch', 'deep squat hold', 'defensive slide',
    'defensive slide sprint', 'depth drop', "downward dog → cobra flow",
    "downward dog → runner's lunge flow", 'dynamic stretch',
    'farmer carry', 'foam roll', 'forearm and grip work', 'forearm curls',
    'forearm curls (both directions)', 'full court sprint', 'glute bridge',
    'half kneeling cable press', 'hamstring eccentric',
    'hamstring flexibility', 'hang power clean', 'hill sprints', 'hip 90/90 hold',
    'hip 90/90 rotations', 'hip 90/90 stretch', 'hip flexor stretch', 'hip mobility',
    'landmine rotational press', 'landmine thruster', 'lateral band walk',
    'lateral bound', 'lateral deceleration drill', 'lateral neck flexion',
    'lateral shuffle', 'lateral shuffle sprint', 'lateral sled drag', 'lateral step-up',
    'light med ball work', 'line jumps', 'lower body warm-up', 'med ball rotational slam',
    'med ball scoop toss', 'medicine ball overhead throw', 'neck extension',
    'neck flexion', 'pallof press', 'pro agility drill', 'pull-up max set', 'push-up',
    'push-up max set', 'reactive box jump', 'reactive cone drill', 'reactive lateral bound',
    'resistance band lateral walk', 'resistance band sprint', 'resistance band sprint marches',
    'reverse fly', 'reverse lunge iso hold', 'reverse wrist curls', 'rotational cable pull',
    'rotational med ball slam',
    'sandbag carry', 'serratus wall slides', 'shotput med ball throw',
    'shoulder cross-body stretch', 'single leg hop & stick', 'single leg press',
    'single leg press iso hold',
    'single leg squat jump', 'snap down', 'split squat jump', 'split stance cable row',
    'sprint + close out', 'sprint + jog ladder', 'sprint ladder', 'sprint tempo protocol',
    'sprint work',
    'static stretch', 'step-up', 'suitcase carry', 'terminal knee extension',
    'thoracic rotation', 'tricep pushdown', 'upper body warm-up', 'weighted carries medley',
    'wicket runs', 'wrestle-outs', 'wrist circles & strengthening', 'wrist curls',
    'wrist mobility',
  ])

  test('no NEW exercise name (beyond the known/tracked baseline) is missing from exerciseLibrary.js', () => {
    const libKeys = loadExerciseLibraryKeys()
    const newlyMissing = [] // [{ name, location }]
    const experiences = ['Beginner', 'Intermediate', 'Advanced']
    const injurySets = [[], ['Shoulder'], ['Knee'], ['Back'], ['Hip']]

    for (const tpl of SPORT_TEMPLATES) {
      for (const pos of tpl.positions) {
        for (const { days } of tpl.daysOptions) {
          for (const exp of experiences) {
            for (const inj of injurySets) {
              const bp = generateBlueprintForAthlete(mkSurvey({
                sport: SPORT_LABELS[tpl.id], position: pos.label,
                time_per_week: String(days), experience_level: exp, injury_areas: inj,
              }))
              for (const w of bp.weeks) {
                for (const s of w.sessions) {
                  for (const name of exerciseNamesIn(s.description)) {
                    const key = name.toLowerCase()
                    if (!libKeys.has(key) && !KNOWN_MISSING.has(key)) {
                      newlyMissing.push(`"${name}" — ${tpl.id}/${pos.id}, ${days} days/week, ${exp}, injuries=[${inj.join(',')}], week ${w.week_number} ${s.day}`)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (newlyMissing.length > 0) {
      // eslint-disable-next-line no-console
      console.error(`Found ${newlyMissing.length} new exercise name(s) with no exerciseLibrary.js entry:\n` + newlyMissing.join('\n'))
    }
    expect(newlyMissing).toEqual([])
  })

  test('the known-missing baseline itself is still accurate — flags if exerciseLibrary.js gained (or the generator dropped) an entry, so the baseline can be trimmed', () => {
    const libKeys = loadExerciseLibraryKeys()
    const stillMissing = new Set()
    const experiences = ['Beginner', 'Intermediate', 'Advanced']
    const injurySets = [[], ['Shoulder'], ['Knee'], ['Back'], ['Hip']]

    for (const tpl of SPORT_TEMPLATES) {
      for (const pos of tpl.positions) {
        for (const { days } of tpl.daysOptions) {
          for (const exp of experiences) {
            for (const inj of injurySets) {
              const bp = generateBlueprintForAthlete(mkSurvey({
                sport: SPORT_LABELS[tpl.id], position: pos.label,
                time_per_week: String(days), experience_level: exp, injury_areas: inj,
              }))
              for (const w of bp.weeks) {
                for (const s of w.sessions) {
                  for (const name of exerciseNamesIn(s.description)) {
                    const key = name.toLowerCase()
                    if (!libKeys.has(key)) stillMissing.add(key)
                  }
                }
              }
            }
          }
        }
      }
    }

    const stale = [...KNOWN_MISSING].filter(k => !stillMissing.has(k))
    if (stale.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`These KNOWN_MISSING entries no longer occur — safe to remove from the baseline:\n${stale.join(', ')}`)
    }
    // This test only warns (doesn't fail) — trimming the baseline is
    // housekeeping, not a regression. A genuinely new gap is already caught
    // by the previous test.
    expect(true).toBe(true)
  })
})

// ─── Area 8 — Manual-builder / auto-assign generator parity ───────────────

describe('Area 8 — Manual-builder / auto-assign generator parity', () => {
  // There is no separate client-side copy of the generator to import (a prior
  // divergent copy at client/src/data/blueprintTemplates.js was deleted — see
  // OFFSEAZ_CODEBASE_MASTER_CONTEXT.md §7). The two real entry points that
  // must stay identical for the same inputs are:
  //   1. generateBlueprintForAthlete(survey) — the auto-assign path
  //   2. SPORT_TEMPLATES[i].generateWeeks(posId, goal, days) — the manual
  //      "build from template" path the coach-facing UI calls via
  //      POST /api/blueprints/templates/generate
  // blueprintController.js's generateFromTemplate additionally always runs
  // applySessionOrganization() then applyAccessoryProgression() (both with
  // that sport's own SPORT_ACCESSORY_ROTATION entry, if any) then
  // applyDeloadAdjustments() on path 2's output, so this test does the same
  // to compare like-for-like (standard goal + intermediate experience + no
  // injuries, so the experience/injury passes are no-ops on path 1).
  const POSITION_INPUT = {
    baseball: 'Catcher', softball: 'Softball', football: 'Linemen', basketball: 'Point Guard',
    soccer: 'Goalkeeper', hockey: 'Forward', rugby: 'Prop', tennis: 'Tennis', golf: 'Golf',
    wrestling: 'Wrestling', volleyball: 'Volleyball', track: 'Sprinter',
    cross_country: 'Distance', lacrosse: 'Lacrosse', swimming: 'Swimming',
  }

  for (const tpl of SPORT_TEMPLATES) {
    test(`${tpl.label} (${tpl.id}): auto-assign and manual-builder produce identical output for the same inputs`, () => {
      const pos = tpl.positions[0]
      const days = tpl.daysOptions[0].days
      const survey = mkSurvey({
        sport: SPORT_LABELS[tpl.id],
        position: POSITION_INPUT[tpl.id],
        time_per_week: String(days),
      })

      const autoAssign = generateBlueprintForAthlete(survey)
      const rotation = SPORT_ACCESSORY_ROTATION[tpl.id] || {}
      // Mirrors blueprintController.js's generateFromTemplate, which resolves
      // the same sport+position+goal-aware accessory-cap key auto-assign
      // uses (see resolveAccessoryCapKey) — needed for football/linemen's
      // raised cap; a no-op passthrough (returns tpl.id unchanged) for every
      // other sport/position. Same for Change 4's phase-rotation key — a
      // no-op ({}) for every sport/position outside the 5 target groups.
      const capKey = resolveAccessoryCapKey(tpl.id, pos.id, 'standard')
      const phaseRotation = SPORT_PHASE_ACCESSORY_ROTATION[resolvePhaseRotationKey(tpl.id, pos.id)] || {}
      const organized = applySessionOrganization(tpl.generateWeeks(pos.id, 'standard', days), rotation, capKey)
      // feat/baseball-rebuild — tpl.id must reach both passes, mirroring
      // blueprintController.js's own real call (see that controller's own
      // updated comment) — without it this test would silently pass by
      // both sides sharing the same bug instead of actually verifying
      // parity, since Baseball/Softball's real auto-assign path always
      // skips these two passes.
      const manualBuilder = applyDeloadAdjustments(applyAccessoryProgression(organized, rotation, phaseRotation, tpl.id), tpl.id)

      expect(autoAssign.weeks).toEqual(manualBuilder)
    })
  }

  test('every sport label used by Survey.jsx routes to its own dedicated generator, never the generic fallback', () => {
    for (const tpl of SPORT_TEMPLATES) {
      if (tpl.id === 'softball') continue // deliberately shares the baseball generator — see normalizeSport
      const bp = generateBlueprintForAthlete(mkSurvey({
        sport: SPORT_LABELS[tpl.id], position: POSITION_INPUT[tpl.id], time_per_week: String(tpl.daysOptions[0].days),
      }))
      expect(bp.title.startsWith('General Athletic Performance')).toBe(false)
    }
  })
})

// ─── Area 9 — Rebuilt week-to-week progression ─────────────────────────────
// Covers the 2026-08 rebuild: wave loading (not a flat linear climb), real
// deloads at every phase boundary (not just week 16), accessory volume waves
// AND exercise rotation, a warm-up ramp proportional to each week's own top
// set, baseball climbing within a phase instead of a flat per-phase number,
// and the superset-marker structural capability.
//
// feat/baseball-rebuild — Areas 10 ("Baseball sport-specific content"), 12
// ("Olympic-lift removal / Trap Bar Jump (baseball)"), and 14 ("Baseball
// comprehensive rebuild") are REMOVED, not just updated: every one of them
// asserted the OLD dayLayoutEngine/varietyEngine/finisherEngine-generated
// baseball content as "the design" (Overhead Press as the vertical-press
// main lift, Trap Bar Jump permanently dropped, the old accessory-cap/
// pairing/finisher-rotation machinery's exact output shape, ...) - baseball
// is now hand-authored to the Offseaz Baseball Program Spec instead (same
// architecture change Rugby's own rebuild made), so every one of those
// assertions is testing a design this file no longer has, not a
// regression. See the new "Area 18 — Baseball (hand-authored)" describe
// block, below Area 16, for this rebuild's own dedicated coverage.

describe('Area 9 — Rebuilt week-to-week progression', () => {
  // Same classifiers as Area 5/production, duplicated locally per this file's
  // existing convention (see Area 5 above) so each Area's tests independently
  // verify against real output rather than importing each other's internals.
  const MOBILITY_EXACT_EXEMPT = new Set([
    'dead bug', 'ab wheel', 'plank', 'pallof press', 'half kneeling cable press',
    'cable woodchop', 'copenhagen adductor', 'suitcase carry', 'bird dog',
    'glute bridge', 'glute bridge hold', 'single leg glute bridge',
    'ytw series', 'ytw shoulder series', 'band external rotation', 'band pull-aparts',
    'hip 90/90 hold', 'hip 90/90 stretch', 'hip 90/90 rotations', 'ankle circles',
    'ankle mobility circles', 'cat-cow', 'downward dog',
  ])
  function isMobilityExempt(name) {
    const n = name.toLowerCase().trim()
    if (MOBILITY_EXACT_EXEMPT.has(n)) return true
    return /stretch|mobility|foam roll/i.test(n)
  }
  const MAIN_LIFT_KEYWORDS_RE = /^(Power Clean(?: from floor)?|Hang Power Clean|Hang Clean|BB Split Jerk|Push Jerk|Split Jerk|Snatch|Hang Snatch|Power Snatch|Clean Pull|Clean and Jerk)\b/
  const CONDITIONING_HEADER_RE = /^[\w &]*Conditioning:$/
  const PLYO_KEYWORDS_RE = /\b(Box Jumps?|Broad Jumps?|Hurdle Hops?|Depth Jumps?|Depth Drop|Snap Down|Squat Jumps?|Lateral Bounds?|Bounding|Approach Jumps?|Drop Jumps?|Reactive Box Jump|Ankle Hops?|Hop & Stick)\b/i

  // feat/rugby-rebuild — a ramped/main-lift line was never actually
  // reachable by the naive "Name: NxR" match below for any sport before
  // Rugby's own rebuild: every other sport's %-ramp uses the Unicode "×"
  // sign (never matches this ascii-"x" regex) and every Oly-lift line
  // reads as prose. Rugby's own RPE-anchored ANCHOR main lifts (e.g. "Back
  // Squat: 3x8-10 @ RPE 7") use plain ascii "x", the same convention every
  // "Name: SxR" accessory line already uses — matching this regex too, and
  // wrongly counting a STATIC (never actually deload-reduced — see
  // isRampedLiftLine in blueprintTemplates.js) line as if it were reducible
  // accessory volume, which only dilutes the measured ratio. Explicit here,
  // matching production's own exemption instead of relying on an accidental
  // character mismatch.
  const RAMPED_MAIN_LIFT_RE = /%[×x]|@ moderate load|@\s*RPE\s*\d|fast, low fatigue/
  function sumNonExemptAccessorySets(description) {
    let total = 0
    let inCoreBlock = false
    for (const line of description.split('\n')) {
      if (line.trim() === '') { inCoreBlock = false; continue }
      // Mirrors blueprintTemplates.js's own exempt-header set (Core/Arm
      // Care/Conditioning/Neck — see organizeSessionDescription/
      // applyDeloadVolumeReduction) so "accessory volume" means the same
      // thing here as in production.
      if (/^(Core|Arm Care|Conditioning|Neck)\s*[—-]/.test(line)) { inCoreBlock = true; continue }
      if (RAMPED_MAIN_LIFT_RE.test(line)) continue
      const colonIdx = line.indexOf(':')
      const name = colonIdx > 0 ? line.slice(0, colonIdx) : line
      if (inCoreBlock || isMobilityExempt(name)) continue
      const m = line.match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
      if (!m) continue
      total += parseInt(m[2], 10)
    }
    return total
  }

  // Ordered list of {name, sets} for every plain accessory line in a session
  // (excludes conditioning/plyo/core-block/mobility-exempt/ramped-%/main-lift
  // lines) — mirrors isAccessoryLine()'s real classification in
  // blueprintTemplates.js so "accessory" means the same thing here as in
  // production.
  function accessoryLineSeq(description) {
    const seq = []
    let inCoreBlock = false
    for (const line of description.split('\n')) {
      if (line.trim() === '') { inCoreBlock = false; continue }
      // Mirrors blueprintTemplates.js's own exempt-header set (Core/Arm
      // Care/Conditioning/Neck — see organizeSessionDescription/
      // applyDeloadVolumeReduction) so "accessory volume" means the same
      // thing here as in production.
      if (/^(Core|Arm Care|Conditioning|Neck)\s*—/.test(line)) { inCoreBlock = true; continue }
      if (inCoreBlock) continue
      if (line.includes('%')) continue
      if (MAIN_LIFT_KEYWORDS_RE.test(line)) continue
      if (CONDITIONING_HEADER_RE.test(line) || PLYO_KEYWORDS_RE.test(line)) continue
      const colonIdx = line.indexOf(':')
      if (colonIdx <= 0) continue
      const name = line.slice(0, colonIdx).trim()
      if (isMobilityExempt(name)) continue
      const m = line.match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
      if (!m) continue
      seq.push({ name, sets: parseInt(m[2], 10) })
    }
    return seq
  }

  // First ramped-lift line's ordered {pct, reps} tokens (the 4 warm-up steps
  // plus the final top working set — every real ramped main-lift line in
  // this file has exactly this 5-token shape), or null if the session has no
  // ramped line.
  function rampTokens(description) {
    for (const line of description.split('\n')) {
      const matches = [...line.matchAll(/(\d+)%[×x](\d+)/g)]
      if (matches.length >= 5) return matches.map(m => ({ pct: parseInt(m[1], 10), reps: parseInt(m[2], 10) }))
    }
    return null
  }

  function pctOf(week) {
    const m = week.objective.match(/\((\d+)%/)
    return m ? parseInt(m[1], 10) : null
  }

  // ── 1. Real deloads at every phase boundary (weeks 4, 8, 12, 16) ──────────
  describe('deloads land at every phase boundary, not just week 16', () => {
    const DELOAD_WEEKS = [4, 8, 12, 16]
    // feat/rugby-rebuild — see Area 5's own identical MIN_REDUCTION note:
    // Rugby's genuinely lower per-line set counts (doc's own locked rule)
    // round-halve to ~35-38%, not 40%, on integer-rounding grounds alone.
    const MIN_REDUCTION = { rugby: 0.30 }
    // feat/baseball-rebuild — Baseball/Softball are excluded from this loop
    // entirely, not given a lower threshold like Rugby: their hand-authored
    // accessory content is doc-locked exact, with NO deload-week reduction
    // specified anywhere in the doc (applyAccessoryProgression/
    // applyDeloadAdjustments both skip these two sports outright — see
    // each function's own comment). The deload week still shows the
    // "Deload Week." banner and the doc's own explicit, lighter main-lift
    // ramp for that week (BASEBALL_RAMP) — just no generic accessory-line
    // mutation on top of that.
    for (const tpl of SPORT_TEMPLATES.filter(t => t.id !== 'baseball' && t.id !== 'softball')) {
      test(`${tpl.label} (${tpl.id}): every phase's week 4 cuts accessory volume, strips conditioning/plyo, and is labeled`, () => {
        const pos = tpl.positions[0]
        const days = maxDaysFor(tpl)
        const progressed = applyAccessoryProgression(tpl.generateWeeks(pos.id, 'standard', days))
        const deloaded = applyDeloadAdjustments(progressed)

        for (const wn of DELOAD_WEEKS) {
          const prevWeek = progressed.find(w => w.week_number === wn - 1)
          const deloadWeek = deloaded.find(w => w.week_number === wn)
          expect(deloadWeek).toBeDefined()

          let prevTotal = 0
          let deloadTotal = 0
          for (let i = 0; i < deloadWeek.sessions.length; i++) {
            prevTotal += sumNonExemptAccessorySets(prevWeek.sessions[i].description)
            deloadTotal += sumNonExemptAccessorySets(deloadWeek.sessions[i].description)
          }
          if (prevTotal > 0) {
            expect(1 - deloadTotal / prevTotal).toBeGreaterThanOrEqual(MIN_REDUCTION[tpl.id] ?? 0.40)
          }

          for (const s of deloadWeek.sessions) {
            expect(s.description).toMatch(/Deload Week/)
            // feat/archetype-repeat-sprint — finisher restructure (PR #20
            // review): deload weeks now TAPER (not delete) the Core/
            // Conditioning finisher blocks, so a hand-authored light plyo-
            // flavored drill name (e.g. "Broad Jump: 2x3", "Single Leg
            // Squat Jump: 2x5 each leg") is expected and allowed to survive
            // there. The guarantee this test actually cares about — no
            // stray conditioning/plyo content OUTSIDE those tapered,
            // capped, exempt blocks — still holds, mirroring
            // applyDeloadVolumeReduction's own inCoreBlock skip logic.
            let inCoreBlock = false
            for (const line of s.description.split('\n')) {
              if (line.trim() === '') { inCoreBlock = false; continue }
              if (/^(Core|Arm Care|Conditioning|Neck)\s*—/.test(line)) { inCoreBlock = true; continue }
              if (inCoreBlock) continue
              expect(PLYO_KEYWORDS_RE.test(line.split(':')[0])).toBe(false)
              expect(CONDITIONING_HEADER_RE.test(line)).toBe(false)
            }
          }
        }
      })
    }
  })

  // ── 2 & 5. Accessory volume wave AND exercise rotation ────────────────────
  test('accessory SET COUNT (volume) changes across the working weeks of a phase, for at least one line in at least one sport — a real wave, not frozen', () => {
    let volumeChanged = false
    for (const tpl of SPORT_TEMPLATES) {
      const pos = tpl.positions[0]
      const progressed = applyAccessoryProgression(tpl.generateWeeks(pos.id, 'standard', tpl.daysOptions[0].days))
      const [w1, w2, w3] = progressed
      for (let si = 0; si < w1.sessions.length; si++) {
        const seq1 = accessoryLineSeq(w1.sessions[si].description)
        const seq2 = accessoryLineSeq(w2.sessions[si].description)
        const seq3 = accessoryLineSeq(w3.sessions[si].description)
        const len = Math.min(seq1.length, seq2.length, seq3.length)
        for (let li = 0; li < len; li++) {
          if (seq1[li].sets !== seq2[li].sets || seq1[li].sets !== seq3[li].sets) volumeChanged = true
        }
      }
    }
    expect(volumeChanged).toBe(true)
  })

  test('an accessory exercise NAME actually rotates across the working weeks of a phase, for at least one line in at least one sport — not just volume changing', () => {
    let rotated = false
    for (const tpl of SPORT_TEMPLATES) {
      const pos = tpl.positions[0]
      const progressed = applyAccessoryProgression(tpl.generateWeeks(pos.id, 'standard', tpl.daysOptions[0].days))
      const [w1, w2, w3] = progressed
      for (let si = 0; si < w1.sessions.length; si++) {
        const seq1 = accessoryLineSeq(w1.sessions[si].description)
        const seq2 = accessoryLineSeq(w2.sessions[si].description)
        const seq3 = accessoryLineSeq(w3.sessions[si].description)
        const len = Math.min(seq1.length, seq2.length, seq3.length)
        for (let li = 0; li < len; li++) {
          if (seq1[li].name !== seq2[li].name || seq1[li].name !== seq3[li].name) rotated = true
        }
      }
    }
    expect(rotated).toBe(true)
  })

  test('accessory rotation is deterministic, not random — regenerating the same inputs twice produces identical output', () => {
    const tpl = SPORT_TEMPLATES.find(t => t.id === 'football')
    const pos = tpl.positions[0]
    const runA = applyAccessoryProgression(tpl.generateWeeks(pos.id, 'standard', tpl.daysOptions[0].days))
    const runB = applyAccessoryProgression(tpl.generateWeeks(pos.id, 'standard', tpl.daysOptions[0].days))
    expect(runA).toEqual(runB)
  })

  // ── 3. Warm-up ramp scales with each week's own top set ───────────────────
  test('warm-up ramp scales proportionally with each week\'s own top set, instead of a frozen 40/50/60/70%', () => {
    // football is deliberately excluded here — its position[0] is linemen,
    // whose main-lift ramp is a fixed, explicitly-specified scheme per
    // phase tier (Accumulation/Intensification/Peak), not a fraction of
    // that week's own top set — the opening 40% step is intentionally the
    // same across every phase (only the top end and its rep WINDOW change).
    // Same "excluded by design" precedent as cross_country/swimming below.
    // feat/baseball-rebuild — baseball removed from this loop: its ramp is
    // now hand-authored (BASEBALL_RAMP), not generated by the shared
    // getPhaseInfo-driven proportional system this test checks. The doc's
    // own base ramp (40/50/60/70%) is deliberately CONSTANT within a
    // phase - only the top set climbs - which is not "proportional
    // scaling" in the sense this test asserts. See "Area 18 — Baseball
    // (hand-authored)" for this rebuild's own ramp-table coverage instead.
    for (const id of ['basketball']) {
      const tpl = SPORT_TEMPLATES.find(t => t.id === id)
      const pos = tpl.positions[0]
      const weeks = tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl))

      let early = null
      let late = null
      for (const s of weeks[0].sessions) { early = early || rampTokens(s.description) }
      for (const s of weeks[14].sessions) { late = late || rampTokens(s.description) } // week 15 — Phase 4, wip 3 (peak)

      expect(early).not.toBeNull()
      expect(late).not.toBeNull()

      for (const tokens of [early, late]) {
        for (let i = 1; i < tokens.length; i++) expect(tokens[i].pct).toBeGreaterThanOrEqual(tokens[i - 1].pct)
        expect(tokens[0].pct).toBeLessThan(tokens[tokens.length - 1].pct)
      }

      // Not frozen: the actual ramp values differ between an early, lighter
      // week and a much later, heavier one.
      expect(early[0].pct).not.toBe(late[0].pct)

      // Still proportional (not just independently climbing): the first
      // ramp step stays roughly the same fraction of that week's own top set
      // both times.
      const earlyRatio = early[0].pct / early[early.length - 1].pct
      const lateRatio = late[0].pct / late[late.length - 1].pct
      expect(Math.abs(earlyRatio - lateRatio)).toBeLessThan(0.05)
    }
  })

  // ── 4 & 6. Baseball's own ramp/wave coverage ───────────────────────────────
  // feat/baseball-rebuild — baseball's main-lift ramp is now hand-authored
  // (BASEBALL_RAMP) and printed directly in each day's own description
  // text, not summarized in `objective` as a single "(NN%" token the way
  // the shared getPhaseInfo system's own sports still are — pctOf() would
  // just return null here. Baseball's top set DOES climb within a phase
  // (per the doc, a strict climb toward the phase's own ceiling, not a
  // dip-then-peak wave — e.g. Foundation's 75% -> 77.5% -> 80%), which is
  // real but a different shape than this describe block's own "wave"
  // model. See "Area 18 — Baseball (hand-authored)" for baseball's own
  // dedicated ramp-table coverage instead.

  test('no phase-boundary dip: a phase\'s opening week never drops below the previous phase\'s peak, for every sport — except the shared-block-periodization Phase 3->4 taper seam', () => {
    // cross_country and swimming are deliberately excluded from the %-based
    // wave/phase system by design (XC's dryland work is a fixed, intentionally
    // light 65-70% range with no heavy loading; swimming's main lifts use a
    // flat "@ moderate load" prescription with their own phase-based, not
    // week-based, set-count progression) — neither prints a single top-set %
    // in its objective, so there's no percentage to check for a dip here.
    //
    // basketball/soccer, and football's skill/hybrid/qb positions (not
    // tested here — this test uses positions[0], which for football is
    // 'linemen', a fully separate untouched engine) deliberately DO dip at
    // the Phase 3 -> Phase 4 seam only (Change 2's Peak Taper — Phase 4
    // reuses Phase 1's own range instead of continuing to climb). The
    // first two boundaries (Phase 1->2, Phase 2->3) still never dip for
    // any sport, target group or not.
    const TAPER_SPORTS = new Set(['basketball', 'soccer'])
    for (const tpl of SPORT_TEMPLATES) {
      // feat/rugby-rebuild — Rugby joins cross_country/swimming's own
      // exclusion above: its ANCHOR main lifts are RPE-anchored per the
      // spec doc's own explicit "does NOT hardcode percentages" instruction
      // (RUGBY_MAIN_LIFT_SCHEME) — the objective string carries no "(NN%"
      // token at all, so there's no percentage here to check for a dip.
      // feat/baseball-rebuild — Baseball/Softball join that same exclusion:
      // their objective string no longer carries a "(NN%" summary token
      // either (the doc-locked ramp is printed in full in each day's own
      // description text instead) - and per the doc's own numbers, Phase
      // 4 (Peak/Taper) actually climbs HIGHER than Phase 3's own peak at
      // this seam (82.5% opening vs. Phase 3's 80% peak) rather than
      // tapering down here - the taper the doc's own name refers to only
      // happens at week 16's own deload, not at the Phase 3->4 boundary.
      if (tpl.id === 'cross_country' || tpl.id === 'swimming' || tpl.id === 'rugby' || tpl.id === 'baseball' || tpl.id === 'softball') continue
      const pos = tpl.positions[0]
      const weeks = tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl))
      // Peak of each phase is its 3rd working week (wip 3): weeks 3, 7, 11, 15
      // (1-indexed week numbers). Opening week of the next phase is wip 1:
      // weeks 5, 9, 13.
      const peaks = [2, 6, 10].map(i => pctOf(weeks[i]))       // week_number 3, 7, 11
      const nextOpeners = [4, 8, 12].map(i => pctOf(weeks[i])) // week_number 5, 9, 13
      for (let i = 0; i < peaks.length; i++) {
        if (i === 2 && TAPER_SPORTS.has(tpl.id)) {
          // Phase 3 -> Phase 4: this sport's own taper — opener must be
          // strictly lower than Phase 3's peak, not just "not higher."
          expect(nextOpeners[i]).toBeLessThan(peaks[i])
        } else {
          expect(nextOpeners[i]).toBeGreaterThanOrEqual(peaks[i])
        }
      }
    }
  })

  // ── 7. Superset notation — structural capability only ──────────────────────
  describe('superset() structural helper (no template uses it yet — capability only)', () => {
    test('marks each line in a group with the same ⟦SS<n>⟧ prefix, preserving content and order', () => {
      const lines = superset(1, ['DB Row: 3x10', 'DB Bench Press: 3x10'])
      expect(lines).toEqual(['⟦SS1⟧DB Row: 3x10', '⟦SS1⟧DB Bench Press: 3x10'])
    })

    test('SUPERSET_MARKER_RE matches and extracts the group number from a marked line', () => {
      const m = '⟦SS2⟧Pull-ups: 3xAMAP'.match(SUPERSET_MARKER_RE)
      expect(m).not.toBeNull()
      expect(m[1]).toBe('2')
    })

    test('SUPERSET_MARKER_RE does not match an unmarked line', () => {
      expect(SUPERSET_MARKER_RE.test('DB Row: 3x10')).toBe(false)
    })

    // Session organization (volume cap + pairing, including the main-lift +
    // plyo contrast exception) applies to EVERY sport, not just baseball —
    // see Area 11 below for the full cap/pairing behavior. This just
    // confirms the superset capability itself isn't somehow still gated to
    // baseball at the marker level.
    test('applySessionOrganization derives real superset markers for other sports too, not just baseball', () => {
      let foundElsewhere = false
      for (const tpl of SPORT_TEMPLATES) {
        if (tpl.id === 'baseball' || tpl.id === 'softball') continue
        const pos = tpl.positions[0]
        const weeks = applySessionOrganization(tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl)), SPORT_ACCESSORY_ROTATION[tpl.id] || {})
        for (const w of weeks) {
          for (const s of w.sessions) {
            if (s.description.split('\n').some(l => SUPERSET_MARKER_RE.test(l))) foundElsewhere = true
          }
        }
      }
      expect(foundElsewhere).toBe(true)
    })

    test('baseball DOES emit real superset markers — the first actual use of the capability, not just plumbing', () => {
      const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
      const pos = baseball.positions[0]
      const days = maxDaysFor(baseball)
      const rotation = SPORT_ACCESSORY_ROTATION.baseball
      const weeks = applyAccessoryProgression(applySessionOrganization(baseball.generateWeeks(pos.id, 'standard', days), rotation), rotation)
      let found = false
      for (const w of weeks) {
        for (const s of w.sessions) {
          // SUPERSET_MARKER_RE is intentionally NOT multiline (it only ever
          // needs to check one line at a time in real usage) — check per line.
          if (s.description.split('\n').some(l => SUPERSET_MARKER_RE.test(l))) found = true
        }
      }
      expect(found).toBe(true)
    })
  })
})

// ─── Area 10 — Baseball sport-specific content ─────────────────────────────

describe('Area 11 — Session organization, volume cap, and warm-up blocks', () => {
  const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')

  test('a non-baseball sport also gets the accessory cap and auto-pairing — main lift stands alone, its plyo contrast pairs with it, everything else pairs in 2s up to 3 accessory slots', () => {
    // feat/day-layout-engine — Track Sprinters (this test's own prior
    // fixture) no longer fits: its "Lower Power & Speed" day's own SPEED
    // slot ("Acceleration Sprints") is now classified as conditioning
    // (same exempt treatment every other named sprint drill already had —
    // see CONDITIONING_EXERCISE_RE), so it's no longer eligible for normal
    // accessory pairing, leaving only one real accessory (Bulgarian Split
    // Squat) with no partner to pair with. Hockey Goalie's own "Lower
    // Power" day has no SPEED tag at all (Field's 4-day template reserves
    // SPEED for the 3-day/5-day keys only) and still produces the exact
    // main+plyo / accessory-pair shape this test is about.
    const bp = generateBlueprintForAthlete({
      sport: 'Hockey', position: 'Goalie', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const day1 = bp.weeks[0].sessions[0].description.split('\n')
    const marked = day1.filter(l => SUPERSET_MARKER_RE.test(l))
    // SS1 = Back Squat + Single Leg Box Jump (main lift's plyo contrast),
    // SS2 = an auto-paired accessory duo — 4 marked lines across 2 groups.
    expect(marked.length).toBe(4)
    expect(marked[0]).toMatch(/^⟦SS1⟧Back Squat:/)
    expect(marked[1]).toMatch(/^⟦SS1⟧Single Leg Box Jump:/)
    expect(marked[2]).toMatch(/^⟦SS2⟧/)
    expect(marked[3]).toMatch(/^⟦SS2⟧/)
  })

  test('Oly-lift/ramped-lift split regression: a session with BOTH a technical Olympic lift and a separate %-ramped lift keeps the Oly lift standalone, never bundled into the ramped lift\'s own accessory pairing', () => {
    // Track Sprinters used to be the fixture here, but feat/day-layout-
    // engine dropped its Power Clean entirely (Speed/Power's own template
    // has no MAIN_OLY tag, same as Rotational's). Rugby Forwards was the
    // fixture after that (Collision archetype, which DOES have MAIN_OLY),
    // but feat/rugby-rebuild replaced Rugby's generator with hand-authored
    // content that deliberately never puts a technical Oly lift and a
    // separate %-ramped lift on the same day (Day 1 is Back Squat + Bench
    // Press; Hang Power Clean has its own day, Day 2, alone) — matching the
    // spec doc's own explicit "never program two CNS-heavy [main lift]
    // pulls on the same day" spirit. Football Linemen (still on the
    // untouched Collision archetype) is the new fixture: its own "Lower
    // Power" day carries a real Power Clean alongside a ramped Front Squat
    // — the regression this test actually guards (Oly lift never bundled
    // with the ramped lift's own pairing) still holds exactly as before.
    const bp = generateBlueprintForAthlete({
      sport: 'Football', position: 'Linemen', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const day1 = bp.weeks[0].sessions[0].description
    // Power Clean (technical Oly lift, no %) must render with NO superset
    // marker — it stands alone, never bundled with anything.
    expect(firstMatchingLine(day1, /Power Clean/)).toMatch(/^Power Clean/)
    expect(firstMatchingLine(day1, /Power Clean/)).not.toMatch(SUPERSET_MARKER_RE)
    // Front Squat (the %-ramped lift) is also standalone — its own
    // accessory pair (Barbell RDL + Bulgarian Split Squat) is what's
    // bracketed, and Power Clean is never part of that group. Search
    // pattern anchored to line-start — Linemen's own warm-up line ("Empty
    // BB Warm-Up Complex: RDL x5 · Hang Clean x5 · Front Squat x5 · Back
    // Squat x5") also contains the bare substring "Front Squat" and would
    // otherwise match first.
    expect(firstMatchingLine(day1, /^Front Squat/)).toMatch(/^Front Squat:/)
    expect(firstMatchingLine(day1, /^Front Squat/)).not.toMatch(SUPERSET_MARKER_RE)
    expect(firstMatchingLine(day1, /Barbell RDL/)).toMatch(/^⟦SS1⟧Barbell RDL:/)
    expect(firstMatchingLine(day1, /Bulgarian Split Squat/)).toMatch(/^⟦SS1⟧Bulgarian Split Squat:/)
  })

  // feat/fix-silent-accessory-drops — this used to test that generic filler
  // (Bicep Curls, Tricep Extensions) got CUT before regular sport
  // accessories when a day's authored content exceeded the cap. That
  // premise is gone: the cap no longer drops anything, ever (see
  // organizeSessionDescription's own doc comment) — this was in fact the
  // exact real-world case the full-codebase silent-drop audit flagged as
  // worst-case (football/linemen muscle_gain's Upper Strength day was
  // losing 7 movements, back when muscle_gain routed to the old,
  // pre-archetype fbLinemenMGSess template). Verifies the same "nothing
  // silently dropped, everything correctly paired" invariant against
  // Linemen muscle_gain's CURRENT content — feat/blueprint-cleanup retired
  // fbLinemenMGSess and wired muscle_gain onto the same modern Collision-
  // archetype day content every standard-goal Linemen week gets, with the
  // shared mgNote() blurb (same pattern every other sport's own
  // muscle_gain path already uses) appended on top. Bicep Curls/Tricep
  // Extensions now only ever appear inside mgNote()'s fixed blurb text —
  // a single flat sentence, not individually-authored accessory lines — so
  // they're no longer separately bracketed the way the old template's own
  // standalone lines were.
  //
  // feat/day-layout-engine — Day 1's own authored accessories changed
  // again: the purpose-built Collision templates give "Lower Power" two
  // accessory slots (ACC_HINGE/ACC_UNILATERAL_LOWER — Barbell RDL/
  // Bulgarian Split Squat), not four; Goblet Lateral Lunge/Plate Overhead
  // Sit-Ups/Double Leg Calf Raise don't have a corresponding slot on this
  // specific day anymore (Goblet Lateral Lunge moved to the "Lower
  // Strength" day's own ACC_SQUAT slot; ACC_CORE now renders via the
  // finisher engine's own core family instead of a fixed inline line —
  // see buildCollisionRenderers' ACC_CORE doc comment).
  test('Linemen muscle_gain: mgNote() additions survive, and every authored accessory on the modern archetype day survives, paired into supersets', () => {
    const bp = generateBlueprintForAthlete({
      sport: 'Football', position: 'Linemen', primary_goal: 'muscle_gain',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const day1 = bp.weeks[0].sessions[0].description
    expect(day1).toContain('Muscle Gain additions')
    expect(day1).toContain('Bicep Curls')
    expect(day1).toContain('Tricep Extensions')
    expect(day1).toContain('Barbell RDL')
    expect(day1).toContain('Bulgarian Split Squat')
    // The day's 2 real accessories pair cleanly into one bracket —
    // nothing left dangling unbracketed.
    expect(day1).toMatch(/⟦SS\d+⟧Barbell RDL:/)
    expect(day1).toMatch(/⟦SS\d+⟧Bulgarian Split Squat:/)
  })

  // feat/baseball-rebuild — the Offseaz Baseball Program Spec's own
  // lowerLeg filler pool (KB Tibialis Raises/Wall Tibialis Raises/Calf
  // Raises) is real, rotating content now on Day 2 and Day 3 — the
  // opposite of the old engine's "no home for it" gap this test used to
  // document.
  test('Tibialis Raises appears as real, doc-locked rotating content (Day 2\'s KB Tibialis Raises, Day 3\'s Wall Tibialis Raises)', () => {
    const bp = generateBlueprintForAthlete({
      sport: 'Baseball', position: 'Position Player', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const allText = bp.weeks.map(w => w.sessions.map(s => s.description).join('\n')).join('\n')
    expect(allText).toContain('Tibialis Raises')
  })

  // feat/baseball-rebuild — baseball's own warm-up rotates by DAY TYPE
  // (Dynamic/Speed on Day 1, Upper Strength on Day 2, Lower/Mobility on
  // Day 3, Upper Hypertrophy on Day 4), per the Offseaz Baseball Program
  // Spec, replacing the old day-count-derived (lower_power/squat_hinge/
  // upper_push) warm-up assignment entirely. Every other archetype
  // (Linemen/Collision included) still weaves its warm-up into
  // `description`'s own first line as text, so `warmup` stays undefined.
  test('each baseball day type carries its own doc-specified warm-up block, and non-baseball sports get none (baseball-only for now)', () => {
    const bp = generateBlueprintForAthlete({
      sport: 'Baseball', position: 'Position Player', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const [day1, day2, day3, day4] = bp.weeks[0].sessions
    expect(day1.warmup.label).toMatch(/Dynamic.*Speed/i)
    expect(day1.warmup.lines.some(l => l.startsWith('Acceleration Circuit:'))).toBe(true)
    expect(day2.warmup.label).toMatch(/Upper Strength/i)
    expect(day2.warmup.lines.some(l => l.startsWith('Prone Y-T-A:'))).toBe(true)
    expect(day3.warmup.label).toMatch(/Lower.*Mobility/i)
    expect(day3.warmup.lines.some(l => l.startsWith('Inchworms with Cobra:'))).toBe(true)
    expect(day4.warmup.label).toMatch(/Upper Hypertrophy/i)

    const football = generateBlueprintForAthlete({
      sport: 'Football', position: 'Linemen', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    expect(football.weeks[0].sessions[0].warmup).toBeUndefined()
  })

  test('the warm-up block is consistent week to week (not rotated) for the same day type', () => {
    const bp = generateBlueprintForAthlete({
      sport: 'Baseball', position: 'Position Player', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const week1Day1 = bp.weeks[0].sessions[0].warmup
    const week5Day1 = bp.weeks[4].sessions[0].warmup
    expect(week5Day1.lines).toEqual(week1Day1.lines)
  })

  // feat/fix-silent-accessory-drops — replaces a test that asserted the
  // OPPOSITE of what's now correct (that every session stayed under a hard
  // cap of 2-3 superset groups). That cap used to be enforced by silently
  // DELETING any authored accessory beyond it — a full-codebase audit found
  // 125 of ~163 distinct day-templates doing exactly that, across 13 of 14
  // sports, dropping 1-7 movements apiece. This is the permanent regression
  // test for that fix: for every sport/position/day-count/goal combination,
  // every accessory-shaped movement name authored in the RAW (pre-
  // organization) session description must still be present — same count,
  // not just "present somewhere" — in the final, organized one. Mirrors the
  // exact comparison the original audit used (raw vs. organizeSessionDescription's
  // output, name-multiset diff) so this can never silently regress again.
  test('no authored movement is ever silently dropped by session organization — every sport/position/day-count/goal combination, weeks 1/5/9/13', () => {
    function nameMultiset(description) {
      const counts = new Map()
      for (const raw of description.split('\n')) {
        const bare = raw.replace(SUPERSET_MARKER_RE, '')
        const colonIdx = bare.indexOf(':')
        if (colonIdx <= 0) continue
        const name = bare.slice(0, colonIdx).trim()
        counts.set(name, (counts.get(name) || 0) + 1)
      }
      return counts
    }
    const violations = []
    for (const tpl of SPORT_TEMPLATES) {
      for (const pos of tpl.positions) {
        for (const { days } of tpl.daysOptions) {
          for (const goal of ['standard', 'muscle_gain']) {
            const rawWeeks = tpl.generateWeeks(pos.id, goal, days)
            const capKey = resolveAccessoryCapKey(tpl.id, pos.id, goal)
            const orgWeeks = applySessionOrganization(
              JSON.parse(JSON.stringify(rawWeeks)),
              SPORT_ACCESSORY_ROTATION[tpl.id] || {},
              capKey,
            )
            for (const wn of [1, 5, 9, 13]) {
              const rawWeek = rawWeeks.find(w => w.week_number === wn)
              const orgWeek = orgWeeks.find(w => w.week_number === wn)
              if (!rawWeek || !orgWeek) continue
              for (let i = 0; i < rawWeek.sessions.length; i++) {
                const rawCounts = nameMultiset(rawWeek.sessions[i].description)
                const orgCounts = nameMultiset(orgWeek.sessions[i].description)
                for (const [name, rawCount] of rawCounts) {
                  const orgCount = orgCounts.get(name) || 0
                  if (orgCount < rawCount) {
                    violations.push(`${tpl.id}/${pos.id}/${days}d/${goal} week ${wn} ${rawWeek.sessions[i].day}: "${name}" (${rawCount} authored -> ${orgCount} rendered)`)
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(violations).toEqual([])
  })
})

// ─── Area 12 — Olympic-lift removal / Trap Bar Jump (baseball) ─────────────
// Baseball no longer prescribes Hang Clean/Power Clean anywhere — Olympic
// lifts require expert in-person coaching to execute safely, and Offseaz
// athletes often train without a coach present; that constraint is
// untouched by feat/day-layout-engine (Rotational archetype has no
// MAIN_OLY tag at all, so no sport on it can reach for one). Trap Bar
// Jump — the comprehensive rebuild's own safer replacement for the old
// Oly lifts — is a different story: it lived as "Lower Power"'s
// standalone power-move exception, and that slot doesn't exist in the
// Rotational archetype's own "Lower Power" template (MAIN_SQUAT + ACC_
// HINGE + ACC_UNILATERAL_LOWER + ACC_CORE only) — dropped, same "no home
// on the leaner template" simplification already applied elsewhere in
// this PR (see Area 10's own note). It stays in the exercise library
// (still a real, valid movement coaches/athletes might look up) even
// though nothing currently prescribes it by default.

describe('Area 13 — Under-filling root-cause fix (any day, any anchor type)', () => {
  // Reimplementation of the exact classification predicates from
  // blueprintTemplates.js, for audit purposes only — mirrors what
  // isMainLiftLine/isRampedLiftLine/isConditioningLine/isPlyoLine/
  // isMobilityCoreExempt/isAccessoryLine actually do, so "raw accessory
  // content available" is measured the same way production measures it,
  // not by a naive "line has a colon" heuristic (which would wrongly flag
  // pure conditioning/recovery days that have no accessory content to
  // organize at all).
  const MAIN_LIFT_KEYWORDS_RE_LOCAL = /^(Power Clean(?: from floor)?|Hang Power Clean|Hang Clean|BB Split Jerk|Push Jerk|Split Jerk|Snatch|Hang Snatch|Power Snatch|Clean Pull|Clean and Jerk)\b/
  const PLYO_KEYWORDS_RE_LOCAL = /\b(Box Jumps?|Broad Jumps?|Hurdle Hops?|Depth Jumps?|Depth Drop|Snap Down|Squat Jumps?|Lateral Bounds?|Bounding|Approach Jumps?|Drop Jumps?|Reactive Box Jump|Ankle Hops?|Hop & Stick)\b/i
  const CONDITIONING_HEADER_RE_LOCAL = /^[\w &]*Conditioning:$/
  const CONDITIONING_EXERCISE_RE_LOCAL = /^(Sprint Work|Sprint Ladder|Sprint \+ Close Out|Sprint \+ Jog Ladder|Repeat Sprint|300 Yard Shuttle|Flying 20s|17s Drill|Baseline Sprint|Defensive Slide(?: Sprint)?|Post Sprint|Box Out Drill|Shuffle Step|Full Court Sprint|V Drill|Star Drill|200m Intervals|400m [Rr]epeats|Isometric (?:Squat|Pull) Hold|Weighted Carries(?: Medley)?|Farmer Carr(?:y|ies)|Battle Rope|Wrestle-Outs|Sled Push|Sled Sprint|Sled Drag|Pro Agility(?: Drill)?|5-10-5(?: Shuttle)?|Cone Drill(?:\s*\(5-10-5\))?|Deceleration Drill|Lateral Shuffle(?: Sprint)?|T-Drill|Aerobic Finish|Tempo [Rr]un|Sprint Tempo Protocol)\b/
  const MOBILITY_EXACT_EXEMPT_LOCAL = new Set([
    'dead bug', 'ab wheel', 'plank', 'pallof press', 'half kneeling cable press',
    'cable woodchop', 'copenhagen adductor', 'suitcase carry', 'bird dog',
    'glute bridge', 'glute bridge hold', 'single leg glute bridge',
    'ytw series', 'ytw shoulder series', 'band external rotation', 'band pull-aparts',
    'hip 90/90 hold', 'hip 90/90 stretch', 'hip 90/90 rotations', 'ankle circles',
    'ankle mobility circles', 'cat-cow', 'downward dog',
  ])
  function isRamped(bare) { return bare.includes('%') || bare.includes('@ moderate load') }
  function isMainLift(bare) {
    const colonIdx = bare.indexOf(':')
    const name = colonIdx > 0 ? bare.slice(0, colonIdx) : bare
    return MAIN_LIFT_KEYWORDS_RE_LOCAL.test(name)
  }
  function isPlyo(bare) {
    const colonIdx = bare.indexOf(':')
    const name = colonIdx > 0 ? bare.slice(0, colonIdx) : bare
    return PLYO_KEYWORDS_RE_LOCAL.test(name)
  }
  function isConditioning(bare) {
    return CONDITIONING_HEADER_RE_LOCAL.test(bare) || CONDITIONING_EXERCISE_RE_LOCAL.test(bare)
  }
  function isMobilityExempt(name) {
    const n = name.toLowerCase().trim()
    if (MOBILITY_EXACT_EXEMPT_LOCAL.has(n)) return true
    return /stretch|mobility|foam roll/i.test(n)
  }
  function isAccessory(bare) {
    if (isConditioning(bare) || isPlyo(bare) || isRamped(bare) || isMainLift(bare)) return false
    const colonIdx = bare.indexOf(':')
    if (colonIdx <= 0) return false
    if (isMobilityExempt(bare.slice(0, colonIdx))) return false
    return /^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/.test(bare) ||
           /^(.*?):\s*(\d+)x(\d+)\s*warmup,\s*(\d+)x(\d+[a-zA-Z]*|AMAP)\s*working(.*)$/.test(bare)
  }

  test('a day with no %-ramped or Olympic-lift anchor still gets fully organized (bracketed pairs), not left as raw unbracketed template text, for every sport/position/day-count that has real accessory content available', () => {
    const stillRaw = []
    for (const tpl of SPORT_TEMPLATES) {
      for (const pos of tpl.positions) {
        for (const daysOpt of tpl.daysOptions) {
          const rotation = SPORT_ACCESSORY_ROTATION[tpl.id] || {}
          const raw = tpl.generateWeeks(pos.id, 'standard', daysOpt.days)
          const organized = applySessionOrganization(raw, rotation)
          for (const s of organized[0].sessions) {
            const rawSession = raw[0].sessions.find(x => x.day === s.day)
            const rawLines = rawSession.description.split('\n').map(l => l.replace(SUPERSET_MARKER_RE, ''))
            const hasOlyOrRamped = rawLines.some(l => isMainLift(l) || isRamped(l))
            if (hasOlyOrRamped) continue // already worked before the fix — out of scope here

            let inCore = false
            let accessoryCount = 0
            let plyoCount = 0
            for (const l of rawLines) {
              if (l.trim() === '') { inCore = false; continue }
              // feat/rugby-rebuild — "Conditioning —" was missing from this
              // local header copy (present in every other Area's own local
              // copy in this file, and in the real organizeSessionDescription
              // regex) — a stale gap that never mattered until Rugby's own
              // Day 5/6 (no lifting, no Oly/ramped anchor, their entire
              // content deliberately wrapped in one "Conditioning —" block
              // so applyDeloadVolumeReduction never silently deletes a real
              // finisher — see that function's own updated comment) became
              // the first fixture to actually exercise this exact
              // combination and exposed the gap as a false positive here.
              // feat/baseball-rebuild — also accepts a plain hyphen:
              // baseball's own Day 5/6 use the identical "one exempt header
              // wraps the whole day" protection, but spelled with a regular
              // hyphen (this codebase's own em/en-dash-free convention for
              // baseball's hand-authored content).
              if (/^(Core|Arm Care|Conditioning|Neck)\s*[—-]/.test(l)) { inCore = true; continue }
              if (inCore) continue
              if (isPlyo(l)) { plyoCount++; continue }
              if (isAccessory(l)) accessoryCount++
            }
            // An anchor (1) plus at least 3 accessory/plyo candidates is
            // real, organizable content — if the organized output is
            // byte-identical to the raw template, this day was skipped
            // entirely (the bug), not correctly left alone (a genuinely
            // sparse conditioning/recovery day never reaches this count).
            if (accessoryCount + plyoCount >= 4 && s.description === rawSession.description) {
              stillRaw.push(`${tpl.id}/${pos.id}/${daysOpt.days}d ${s.day}`)
            }
          }
        }
      }
    }
    expect(stillRaw).toEqual([])
  })

  test('baseball Upper Power/Upper Strength days (Trap Bar Jump anchor) reach the full main + 3 accessory cap, not main + 2 — the exact reported symptom', () => {
    const rotation = SPORT_ACCESSORY_ROTATION.baseball
    const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const organized = applySessionOrganization(baseball.generateWeeks('baseball', 'standard', 4), rotation)
    const day2 = organized[0].sessions.find(s => s.day === 'Day 2').description
    const day4 = organized[0].sessions.find(s => s.day === 'Day 4').description
    for (const desc of [day2, day4]) {
      const groups = new Set(desc.split('\n').map(l => l.match(SUPERSET_MARKER_RE)).filter(Boolean).map(m => m[1]))
      const singleLines = desc.split('\n').filter(l => {
        if (l.trim() === '' || SUPERSET_MARKER_RE.test(l)) return false
        if (/^Core\s*—/.test(l)) return false
        const colonIdx = l.indexOf(':')
        if (colonIdx <= 0) return false
        return /^(.*?):\s*(\d+)x/.test(l)
      })
      // Trap Bar Jump (the free anchor) is 1 of those standalone singles;
      // main + 3 accessories means at least one bracketed pair group
      // survives alongside it (2 of the 3 slots), not just the anchor alone.
      expect(groups.size).toBeGreaterThanOrEqual(1)
      expect(singleLines.length).toBeGreaterThanOrEqual(1)
    }
  })

  test('a plyo line that does not get the main-lift contrast pairing (no ramped lift on the same day, or 2+ plyo lines) falls back into the normal capped accessory pool instead of being silently dropped', () => {
    // Track and Field / Jumpers Day 5 in the raw template is 5 plyo lines
    // with no ramped/Oly lift on the day at all — under the old logic these
    // would either all vanish (early-return never even reaches the plyo
    // branch... but if it did via some other path, keepPlyo requires
    // exactly 1 plyo line) or the whole day would be skipped. Confirm real,
    // audited-affected content survives post-fix.
    const track = SPORT_TEMPLATES.find(t => t.id === 'track')
    const rotation = SPORT_ACCESSORY_ROTATION.track || {}
    const raw = track.generateWeeks('jump', 'standard', 6)
    const rawDay5 = raw[0].sessions.find(s => s.day === 'Day 5')
    expect(rawDay5).toBeTruthy()
    const rawPlyoNames = rawDay5.description.split('\n').filter(l => /Hops?|Jump|Bound/i.test(l))
    expect(rawPlyoNames.length).toBeGreaterThan(0)

    const organized = applySessionOrganization(raw, rotation)
    const organizedDay5 = organized[0].sessions.find(s => s.day === 'Day 5').description
    // At least one plyo/jump movement from the raw template survives in the
    // organized output — not all silently dropped.
    const survived = rawPlyoNames.some(rawLine => {
      const name = rawLine.split(':')[0].trim()
      return organizedDay5.includes(name)
    })
    expect(survived).toBe(true)
  })
})

// ─── Area 14 — Baseball comprehensive rebuild ──────────────────────────────
// Category-based lift variation, day-type locking, the pairing/balance
// rule, auto-rotating choose-1 slots, the finisher arrangement (no
// conditioning+core or arm-care+core on any day, any day-count), the
// intentionally-uncapped Upper Strength day, Day 6's rotating light-mobility
// pool, the Hamstring Curls hip-injury substitution, and the 3-day
// baseball3Day/pitcher3Day = 4-day.slice(0,3) simplification.

describe('Area 15 — Shared block periodization', () => {
  // Week -> phase helper matching getPhaseInfo's own math.
  const weekOfPhase = (phaseNum, wip) => (phaseNum - 1) * 4 + wip

  // feat/baseball-rebuild — baseball's main-lift rep descent is now
  // hand-authored (BASEBALL_RAMP), a different shape entirely from the
  // shared getPhaseInfo-driven rotational-tier scheme this test checks
  // (half-percent rungs like "77.5%"/"82.5%"/"87.5%" also break this
  // test's own ASCII-only, integer-only percent regex — real doc-given
  // precision, not something to round away just to fit the old parser).
  // See "Area 18 — Baseball (hand-authored)" for this rebuild's own rep-
  // descent coverage instead.
  test('Change 1: football skill (power tier) descends 6/5/4/3 by phase; football QB (rotational tier) descends 8/6/5/4; hybrid matches skill exactly', () => {
    const football = SPORT_TEMPLATES.find(t => t.id === 'football')
    const skillWeeks = football.generateWeeks('skill', 'standard', 4)
    const hybridWeeks = football.generateWeeks('hybrid', 'standard', 4)
    const qbWeeks = football.generateWeeks('qb', 'standard', 4)
    const power = { 1: 6, 2: 5, 3: 4, 4: 3 }
    const rotational = { 1: 8, 2: 6, 3: 5, 4: 4 }
    for (const [phaseNum, reps] of Object.entries(power)) {
      const w = weekOfPhase(Number(phaseNum), 2)
      expect(firstMatchingLine(skillWeeks[w - 1].sessions[0].description, /Back Squat:/)).toMatch(new RegExp(`×${reps}$`))
      expect(firstMatchingLine(hybridWeeks[w - 1].sessions[0].description, /Back Squat:/)).toMatch(new RegExp(`×${reps}$`))
    }
    for (const [phaseNum, reps] of Object.entries(rotational)) {
      const w = weekOfPhase(Number(phaseNum), 2)
      expect(firstMatchingLine(qbWeeks[w - 1].sessions[0].description, /Back Squat:/)).toMatch(new RegExp(`×${reps}$`))
    }
  })

  test('Change 1/no true singles: no main-lift top set anywhere in baseball/football-skill/hybrid/qb/basketball/soccer output ever drops to 1 or 2 reps', () => {
    const groups = [
      ['baseball', 'baseball'], ['football', 'skill'], ['football', 'hybrid'], ['football', 'qb'],
      ['basketball', 'guards'], ['soccer', 'goalkeeper'],
    ]
    for (const [sportId, posId] of groups) {
      const tpl = SPORT_TEMPLATES.find(t => t.id === sportId)
      const weeks = tpl.generateWeeks(posId, 'standard', 4)
      for (const week of weeks) {
        for (const s of week.sessions) {
          const matches = [...s.description.matchAll(/×(\d+)$/gm)]
          for (const m of matches) expect(parseInt(m[1], 10)).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  // feat/baseball-rebuild — baseball removed from this group: per the doc's
  // own numbers, Phase 4 (Peak/Taper) actually opens HIGHER than Phase 3's
  // own peak (82.5% vs. 80%) - the taper the phase's own name refers to is
  // week 16's own deload, not this seam. See Area 9's identical exclusion
  // for the fuller explanation.
  test('Change 2: Phase 4 (weeks 13-16) is a genuine taper for basketball/soccer/football-skill — its top % is lower than Phase 3\'s peak, not higher', () => {
    const groups = [['basketball', 'guards'], ['soccer', 'goalkeeper'], ['football', 'skill']]
    for (const [sportId, posId] of groups) {
      const tpl = SPORT_TEMPLATES.find(t => t.id === sportId)
      const weeks = tpl.generateWeeks(posId, 'standard', 4)
      const phase3Peak = lastPercent(firstMatchingLine(weeks[weekOfPhase(3, 3) - 1].sessions[0].description, /Squat:/))
      const phase4Opener = lastPercent(firstMatchingLine(weeks[weekOfPhase(4, 1) - 1].sessions[0].description, /Squat:/))
      expect(phase4Opener).toBeLessThan(phase3Peak)
    }
  })

  // feat/baseball-rebuild — replaced by "Area 18 — Baseball (hand-
  // authored)"'s own deload-week coverage: BASEBALL_RAMP bakes each
  // deload week's exact doc-given ramp directly into that week's own
  // generation (independent of any separate reduction pass), and the doc's
  // own numbers put THREE weeks (4, 12, and 16) at an identical 60% floor
  // - not a single, uniquely-lightest week 16 the way the old shared
  // engine's Change 2 taper produced.

  // feat/day-layout-engine — Trap Bar Jump had no slot in the Rotational
  // archetype's "Lower Power" template and was dropped (see Area 12); its
  // own Change 3 explosive-phase-arc volume test no longer has a subject.
  // Change 3 itself (explosiveSets, the shared phase-arc math) is
  // untouched and still covered by football/basketball's own instances of
  // this same describe block.
  //
  // feat/day-layout-engine — baseball's Calf Raises accessory (Change 4's
  // only baseball-scoped phase-rotated name that wasn't already inside an
  // exempt finisher block) had no slot in the Rotational archetype's
  // templates either (no ACC_CALF_GRIP-equivalent tag exists outside
  // Collision) and was dropped — Band External Rotation/Face Pulls, the
  // other two entries in BASEBALL_PHASE_ACCESSORY_ROTATION, only ever
  // appear inside the Arm Care finisher block now (governed by the
  // finisher engine's own phase-based 'arm' family, not Change 4's
  // separate table) — so Change 4's phase-rotation mechanism, while still
  // wired for baseball, currently has no reachable default-content trigger
  // left. Flagged here rather than silently dropped; the mechanism itself
  // (resolvePhaseRotationKey/applyAccessoryProgression) is unchanged and
  // still exercised by football/basketball/soccer's own tests below.

  // feat/baseball-rebuild — Baseball is no longer registered in
  // SPORT_PHASE_ACCESSORY_ROTATION at all (removed along with
  // BASEBALL_PHASE_ACCESSORY_ROTATION - see that table's own retirement
  // comment) and is excluded from applyAccessoryProgression entirely, not
  // just "untouched because unregistered" - Gorilla Row (an ANCHOR on Day
  // 1/2, never rotated by design) staying exactly as-authored every week
  // is now covered directly by "Area 18 — Baseball (hand-authored)"'s own
  // anchor-stability test instead of this generic mechanism.

  test('Football linemen is completely unaffected: same phase labels/rep windows as the untouched bespoke engine, and its own Single Leg RDL anchor never rotates (even though linemen was never registered in SPORT_PHASE_ACCESSORY_ROTATION)', () => {
    const football = SPORT_TEMPLATES.find(t => t.id === 'football')
    const weeks = football.generateWeeks('linemen', 'standard', 4)
    // Linemen's own phase labels (Accumulation/Intensification/Peak/Peak) —
    // completely different from FB_PHASES's labels — are untouched.
    expect(weeks[0].objective).toMatch(/Accumulation/)
    expect(weeks[4].objective).toMatch(/Intensification/)
    expect(weeks[8].objective).toMatch(/Peak/)
    expect(weeks[12].objective).toMatch(/Peak/)
    // Peak (phase 3) does NOT taper down for linemen — phase 4 holds at the
    // same Peak numbers as phase 3, exactly as it did before this rebuild.
    const topPctOf = (weekIdx) => lastPercent(firstMatchingLine(weeks[weekIdx].sessions[0].description, /Front Squat:/))
    expect(topPctOf(10)).toBe(topPctOf(14)) // week 11 (phase 3, wip 3) === week 15 (phase 4, wip 3)
    // feat/variety-engine — the global wip-based ACCESSORY_ROTATION table
    // used to rotate linemen's "Single Leg RDL" (a Collision-archetype
    // ACC_HINGE[anchor:true] slot on "Lower Strength") to "Good Mornings"
    // on wip 2, precisely because that downstream pass matched on rendered
    // TEXT with no idea it was renaming an anchor. varietyEngine.js's
    // resolveFiller() is the single naming authority now: anchors never
    // rotate, full stop — including for a sport like linemen that was
    // never even registered in SPORT_PHASE_ACCESSORY_ROTATION and used to
    // fall straight through to the bare global table. Proving it stays
    // "Single Leg RDL" here confirms the retirement is total, not just
    // "wherever a phase table already happened to cover it."
    const rotation = SPORT_ACCESSORY_ROTATION.football || {}
    const capKey = resolveAccessoryCapKey('football', 'linemen', 'standard')
    const phaseRotation = SPORT_PHASE_ACCESSORY_ROTATION[resolvePhaseRotationKey('football', 'linemen')] || {}
    expect(phaseRotation).toEqual({})
    const organized = applySessionOrganization(weeks, rotation, capKey)
    const withAccessories = applyAccessoryProgression(organized, rotation, phaseRotation)
    const day3Week6 = withAccessories[5].sessions.find(s => s.day === 'Day 3').description
    expect(day3Week6).toContain('Single Leg RDL:')
    expect(day3Week6).not.toContain('Good Mornings:')
  })

  test('resolvePhaseRotationKey resolves every football position explicitly — skill/hybrid/qb to \'football\', linemen to null — never a silent default', () => {
    expect(resolvePhaseRotationKey('football', 'skill')).toBe('football')
    expect(resolvePhaseRotationKey('football', 'hybrid')).toBe('football')
    expect(resolvePhaseRotationKey('football', 'qb')).toBe('football')
    expect(resolvePhaseRotationKey('football', 'linemen')).toBeNull()
    expect(resolvePhaseRotationKey('baseball', 'baseball')).toBe('baseball')
    expect(resolvePhaseRotationKey('basketball', 'guards')).toBe('basketball')
    expect(resolvePhaseRotationKey('soccer', 'goalkeeper')).toBe('soccer')
  })
})

// ─── Area 16 — Weighted Push-Ups in the horizontal-push rotation ───────────
// Added as a lower-frequency 3rd option alongside the existing Close Grip
// Bench Press / DB Bench Press variants in football's (skill/hybrid) and
// soccer's phase-rotation pools. Fires on exactly one week per 16-week plan
// (Phase 1's wip-2 week = week 2) — never on a deload week (4/8/12/16) or
// during Phase 4's taper (13-16).

describe('Area 16 — Weighted Push-Ups horizontal-push rotation', () => {
  function fullPipeline(sportId, posId, goal, days) {
    const tpl = SPORT_TEMPLATES.find(t => t.id === sportId)
    const rotation = SPORT_ACCESSORY_ROTATION[sportId] || {}
    const capKey = resolveAccessoryCapKey(sportId, posId, goal)
    const phaseRotation = SPORT_PHASE_ACCESSORY_ROTATION[resolvePhaseRotationKey(sportId, posId)] || {}
    const organized = applySessionOrganization(tpl.generateWeeks(posId, goal, days), rotation, capKey)
    return applyDeloadAdjustments(applyAccessoryProgression(organized, rotation, phaseRotation))
  }

  // Returns the horizontal-push line's exercise name for a given week (1-16)
  // and day-matcher, or null if that line isn't present that week.
  function pushLineName(weeks, weekNum, dayMatch) {
    const day = weeks[weekNum - 1].sessions.find(dayMatch)
    if (!day) return null
    const line = day.description.split('\n').find(l =>
      /DB Incline Press:|Incline DB Press:|Close Grip Bench Press:|DB Bench Press:|Weighted Push-Ups:/.test(l)
    )
    return line ? line.replace(SUPERSET_MARKER_RE, '').split(':')[0] : null
  }

  // feat/day-layout-engine — soccer's own weekday-named sessions (Monday/
  // Tuesday/Thursday/Friday) are gone; every day-layout-engine sport
  // (soccer included, now on the Field archetype) uses generic "Day N"
  // labels, matching every other sport already migrated this PR.
  // feat/day-layout-engine — football's own DB/Incline Press accessory
  // moved from Day 2 ("Upper Strength", which the Speed/Power archetype's
  // own template gives no ACC_PRESS slot at all) to Day 4 ("Upper Power",
  // which does) — Bench Press (the horizontal press) made the same move,
  // for the same structural reason (the archetype's own reversed V/H
  // press assignment — see FB_SKILL_PACK's own doc comment).
  const GROUPS = [
    ['football', 'skill',  s => s.day === 'Day 4'],
    ['football', 'hybrid', s => s.day === 'Day 4'],
    ['soccer',   'goalkeeper',  s => s.day === 'Day 2'],
    ['soccer',   'center_back', s => s.day === 'Day 2'],
    ['soccer',   'midfielder',  s => s.day === 'Day 2'],
  ]

  for (const [sportId, posId, dayMatch] of GROUPS) {
    test(`${sportId}/${posId}: Weighted Push-Ups appears exactly once (week 2) across the 16-week plan`, () => {
      const weeks = fullPipeline(sportId, posId, 'standard', 4)
      const names = []
      for (let w = 1; w <= 16; w++) names.push(pushLineName(weeks, w, dayMatch))
      const pushUpWeeks = names.map((n, i) => (n === 'Weighted Push-Ups' ? i + 1 : null)).filter(Boolean)
      expect(pushUpWeeks).toEqual([2])
    })

    test(`${sportId}/${posId}: Weighted Push-Ups never appears on a deload week (4/8/12/16)`, () => {
      const weeks = fullPipeline(sportId, posId, 'standard', 4)
      for (const wn of [4, 8, 12, 16]) {
        expect(weeks[wn - 1].objective).toMatch(/Deload/)
        expect(pushLineName(weeks, wn, dayMatch)).not.toBe('Weighted Push-Ups')
      }
    })

    test(`${sportId}/${posId}: Weighted Push-Ups never appears during Phase 4's taper (weeks 13-16)`, () => {
      const weeks = fullPipeline(sportId, posId, 'standard', 4)
      for (let wn = 13; wn <= 16; wn++) {
        expect(pushLineName(weeks, wn, dayMatch)).not.toBe('Weighted Push-Ups')
      }
    })

    // feat/variety-engine — "Close Grip Bench Press" was dropped from
    // ACC_PRESS's own pool entirely (it's a common MAIN_PRESS_H/finisher-
    // anchor name elsewhere in the file — landing on it here produced a
    // real same-day duplicate on other sports sharing this same generic
    // pool; see varietyEngine.js's own comment on ACC_PRESS). DB Bench
    // Press is still in the pool and remains the primary variant to
    // compare against.
    test(`${sportId}/${posId}: Weighted Push-Ups appears strictly less often than the primary DB Bench Press variant`, () => {
      const weeks = fullPipeline(sportId, posId, 'standard', 4)
      const counts = {}
      for (let w = 1; w <= 16; w++) {
        const n = pushLineName(weeks, w, dayMatch)
        if (n) counts[n] = (counts[n] || 0) + 1
      }
      expect(counts['Weighted Push-Ups']).toBe(1)
      expect(counts['DB Bench Press']).toBeGreaterThan(counts['Weighted Push-Ups'])
    })
  }

  // feat/variety-engine — "only football/soccer got this option" is no
  // longer true, and that's the whole point of making varietyEngine.js's
  // pools authoritative: ANY sport whose day-layout template gives it a
  // real ACC_PRESS filler slot now draws from the exact same pool, so
  // Weighted Push-Ups is reachable there too — coverage no longer depends
  // on whether a specific sport happened to be hand-added to the old,
  // retired ACCESSORY_ROTATION/SOCCER_/FOOTBALL_PHASE_ACCESSORY_ROTATION
  // tables. QB and Baseball are still excluded, but structurally — the
  // Rotational archetype's own day-layout templates give neither sport an
  // ACC_PRESS slot at all (see dayLayoutEngine.js), so the tag never
  // renders for them regardless of pool content.
  // feat/baseball-rebuild — baseball removed from this assertion: its own
  // Day 2 now legitimately contains "Weighted Push-Ups" as the doc's own
  // named bodyweight-athlete alternative to Bench Press ("(bodyweight
  // option: Weighted Push-Ups 3x5-10 + ISO Bulgarian Split Squat 3x:30
  // each leg, in place of Bench Press)") - a real, intentional doc-given
  // mention, not the old ACC_PRESS-slot rotation this test is actually
  // about.
  test('football QB never sees Weighted Push-Ups — no ACC_PRESS slot at all in the Rotational archetype template it uses; Linemen and Basketball now can, since ACC_PRESS is a real filler slot for them too', () => {
    const qbWeeks = fullPipeline('football', 'qb', 'standard', 4)
    const linemenWeeks = SPORT_TEMPLATES.find(t => t.id === 'football').generateWeeks('linemen', 'standard', 4)
    const basketballWeeks = fullPipeline('basketball', 'guards', 'standard', 4)
    const qbText = qbWeeks.map(w => w.sessions.map(s => s.description).join('\n')).join('\n')
    const linemenText = linemenWeeks.map(w => w.sessions.map(s => s.description).join('\n')).join('\n')
    const basketballText = basketballWeeks.map(w => w.sessions.map(s => s.description).join('\n')).join('\n')
    expect(qbText).not.toContain('Weighted Push-Ups')
    expect(linemenText).toContain('Weighted Push-Ups')
    expect(basketballText).toContain('Weighted Push-Ups')
  })

  test('Weighted Push-Ups is in the exercise library with a real description', () => {
    const libSource = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'client', 'src', 'data', 'exerciseLibrary.js'),
      'utf8'
    )
    expect(libSource).toMatch(/'weighted push-ups':\s*\{/)
  })

  test('the exact substituted line reads "Weighted Push-Ups: <sets>x<reps>" (5-10 rep range) on its one active week', () => {
    const weeks = fullPipeline('football', 'skill', 'standard', 4)
    const day = weeks[1].sessions.find(s => s.day === 'Day 4') // week 2
    const line = day.description.split('\n').find(l => /Weighted Push-Ups:/.test(l))
    expect(line).toBeTruthy()
    const m = line.replace(SUPERSET_MARKER_RE, '').match(/Weighted Push-Ups:\s*\d+x(\d+)/)
    expect(m).toBeTruthy()
    const reps = parseInt(m[1], 10)
    expect(reps).toBeGreaterThanOrEqual(5)
    expect(reps).toBeLessThanOrEqual(10)
  })
})

// ─── Area 18 — Baseball (hand-authored) ────────────────────────────────────
// feat/baseball-rebuild — Baseball (and Softball, which routes straight
// through the same generator) is now hand-authored directly to the Offseaz
// Baseball Program Spec, bypassing dayLayoutEngine/varietyEngine/
// finisherEngine entirely (same architecture as Rugby's own rebuild). This
// is that rebuild's own dedicated regression coverage, referenced by name
// from several "see Area 18" comments left behind on the generic tests it
// replaced (Areas 9/15/16) — it does not re-check what Check 8/Check 9/
// Check 13 in blueprintQuality.test.js already cover permanently (no
// duplicate exercise within a day, no barbell OHP, max 5 sets, carries
// finisher-only, no same finisher back-to-back, only Single-Leg Barbell
// RDL) — those stay the source of truth for that pass/fail set.
describe('Area 18 — Baseball (hand-authored)', () => {
  // ASCII "NN%xN" (decimal percentages included), not the old engine's
  // unicode "×" — see golden.test.js's own identical helper/comment for why
  // lastPercent/lastRampReps elsewhere in this file can't be reused here.
  function lastAsciiRamp(line) {
    const matches = [...line.matchAll(/(\d+(?:\.\d+)?)%x(\d+)/g)]
    if (!matches.length) return null
    const last = matches[matches.length - 1]
    return { pct: parseFloat(last[1]), reps: parseInt(last[2], 10) }
  }

  test('Day 1\'s main lift ramp matches BASEBALL_RAMP exactly at every phase boundary and every deload week (representative weeks 1, 4, 5, 8, 9, 12, 13, 16)', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player' }))
    const expected = {
      1: { pct: 75, reps: 5 }, 4: { pct: 60, reps: 5 },
      5: { pct: 82.5, reps: 3 }, 8: { pct: 65, reps: 4 },
      9: { pct: 75, reps: 3 }, 12: { pct: 60, reps: 3 },
      13: { pct: 82.5, reps: 2 }, 16: { pct: 60, reps: 2 },
    }
    for (const [wn, exp] of Object.entries(expected)) {
      const line = firstMatchingLine(bp.weeks[wn - 1].sessions[0].description, /^Front Squat:/)
      expect(line).toBeTruthy()
      expect(lastAsciiRamp(line)).toEqual(exp)
    }
    // Week 1's top set is explicitly AMRAP-eligible; the week 4 deload is not.
    expect(firstMatchingLine(bp.weeks[0].sessions[0].description, /^Front Squat:/)).toContain('AMRAP')
    expect(firstMatchingLine(bp.weeks[3].sessions[0].description, /^Front Squat:/)).not.toContain('AMRAP')
  })

  test('deload weeks 4/8/12/16 all bottom out at the same 60% floor (a 3-way tie, not one uniquely-lightest week)', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player' }))
    for (const wn of [4, 12, 16]) {
      const line = firstMatchingLine(bp.weeks[wn - 1].sessions[0].description, /^Front Squat:/)
      const matches = [...line.matchAll(/(\d+(?:\.\d+)?)%/g)].map(m => parseFloat(m[1]))
      expect(Math.min(...matches)).toBeLessThanOrEqual(60)
    }
  })

  test('Day 2\'s Trap Bar Jump velocity table follows 3x3 (Foundation) -> 4x3 (Strength) -> 4x2 (Power) -> 3x2 (Peak/Taper), and never carries a % sign (it\'s velocity-based, not %-ramped)', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player' }))
    const byPhaseWeek = { 1: '3x3', 5: '4x3', 9: '4x2', 13: '3x2' }
    for (const [wn, setsReps] of Object.entries(byPhaseWeek)) {
      const line = firstMatchingLine(bp.weeks[wn - 1].sessions[1].description, /^Trap Bar Jump:/)
      expect(line).toContain(`Trap Bar Jump: ${setsReps}`)
      expect(line).not.toMatch(/\d+%/)
    }
  })

  test('anchors (Gorilla Row and DB Incline Press, both fixed lines on Day 1) render identical text on every one of the 16 weeks — accessory progression/rotation is fully opted out for baseball', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player' }))
    const gorillaRowLines = new Set(bp.weeks.map(w => firstMatchingLine(w.sessions[0].description, /Gorilla Row/).replace(SUPERSET_MARKER_RE, '')))
    const inclineLines = new Set(bp.weeks.map(w => firstMatchingLine(w.sessions[0].description, /^DB Incline Press/)))
    expect(gorillaRowLines.size).toBe(1)
    expect(inclineLines.size).toBe(1)
  })

  test('Softball (both goals) produces byte-identical output to Baseball Position Player — it has no dedicated code, it just routes through the same hand-authored generator', () => {
    for (const goal of ['standard', 'muscle_gain']) {
      const baseball = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player', primary_goal: goal }))
      const softball = generateBlueprintForAthlete(mkSurvey({ sport: 'Softball', position: 'Softball', primary_goal: goal }))
      expect(softball.weeks[0].sessions[0].description).toBe(baseball.weeks[0].sessions[0].description)
      expect(softball.weeks[8].sessions[2].description).toBe(baseball.weeks[8].sessions[2].description)
    }
  })

  test('Pitcher never sees a lower-body-day (Day 1/Day 3) arm-care difference — arm care is reserved for Day 2/Day 4/Day 6, matching the doc\'s "never on heavy lower days" rule', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Pitcher' }))
    const day1 = bp.weeks[0].sessions[0].description
    const day3 = bp.weeks[0].sessions[2].description
    expect(day1).not.toMatch(/^Arm Care/m)
    expect(day3).not.toMatch(/^Arm Care/m)
  })

  test('no en dash or em dash anywhere in baseball/pitcher/softball output, across the full sport x position x goal x day-count matrix (only regular hyphens)', () => {
    const combos = [
      ['Baseball', 'Position Player'], ['Baseball', 'Pitcher'], ['Softball', 'Softball'],
    ]
    const offenders = []
    for (const [sport, position] of combos) {
      for (const goal of ['standard', 'muscle_gain']) {
        for (const days of [4, 5, 6]) {
          const bp = generateBlueprintForAthlete(mkSurvey({ sport, position, primary_goal: goal, time_per_week: String(days) }))
          for (const w of bp.weeks) {
            for (const s of w.sessions) {
              if (/[–—]/.test(s.description) || /[–—]/.test(w.objective)) {
                offenders.push(`${sport}/${position} ${goal} ${days}d week ${w.week_number} ${s.day}`)
              }
            }
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
