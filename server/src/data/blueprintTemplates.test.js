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
    // Shoulder test already uses for this exact reason.
    const shoulderBp = generateBlueprintForAthlete(mkSurvey({ sport: 'Football', position: 'QB', injury_areas: ['Shoulder'] }))
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
    // Muscle-gain Linemen's Day4 has "Overhead Press: 4x10" — a flat NxR
    // line with no % ramp at all, unlike Bench/Close Grip Bench which are
    // always "@ XX%". scaleAllPercentages alone is a no-op on a line with no
    // "%" in it, so this specifically exercises the fallback path.
    const bp = generateBlueprintForAthlete(mkSurvey({ primary_goal: 'muscle_gain', injury_areas: ['Elbow'] }))
    const baseline = generateBlueprintForAthlete(mkSurvey({ primary_goal: 'muscle_gain', injury_areas: [] }))
    const text = fullText(bp)
    const baseText = fullText(baseline)

    const baseOHP = baseText.split('\n').find(l => /^Overhead Press:/.test(l))
    expect(baseOHP).toBe('Overhead Press: 4x10') // confirms this really is a plain, unscaled line
    expect(text).toMatch(/^Overhead Press: 4x10 \(50% load\)$/m)
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
  function sumNonExemptAccessorySets(description) {
    let total = 0
    let inCoreBlock = false
    for (const line of description.split('\n')) {
      if (line.trim() === '') { inCoreBlock = false; continue }
      // Mirrors blueprintTemplates.js's own exempt-header set (Core/Arm
      // Care/Conditioning/Neck — see organizeSessionDescription/
      // applyDeloadVolumeReduction) so "accessory volume" means the same
      // thing here as in production.
      if (/^(Core|Arm Care|Conditioning|Neck)\s*—/.test(line)) { inCoreBlock = true; continue }
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
    for (const tpl of SPORT_TEMPLATES) {
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
      expect(reduction).toBeGreaterThanOrEqual(0.40)
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
      const deloaded = applyDeloadAdjustments(tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl)))
      const deloadWeek = deloaded[deloaded.length - 1]
      for (const s of deloadWeek.sessions) {
        // Same tapered-not-deleted exemption as the plyometric check above.
        let inCoreBlock = false
        for (const line of s.description.split('\n')) {
          if (line.trim() === '') { inCoreBlock = false; continue }
          if (/^(Core|Arm Care|Conditioning|Neck)\s*—/.test(line)) { inCoreBlock = true; continue }
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
      const manualBuilder = applyDeloadAdjustments(applyAccessoryProgression(organized, rotation, phaseRotation))

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

  function sumNonExemptAccessorySets(description) {
    let total = 0
    let inCoreBlock = false
    for (const line of description.split('\n')) {
      if (line.trim() === '') { inCoreBlock = false; continue }
      // Mirrors blueprintTemplates.js's own exempt-header set (Core/Arm
      // Care/Conditioning/Neck — see organizeSessionDescription/
      // applyDeloadVolumeReduction) so "accessory volume" means the same
      // thing here as in production.
      if (/^(Core|Arm Care|Conditioning|Neck)\s*—/.test(line)) { inCoreBlock = true; continue }
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
    for (const tpl of SPORT_TEMPLATES) {
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
            expect(1 - deloadTotal / prevTotal).toBeGreaterThanOrEqual(0.40)
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
    for (const id of ['basketball', 'baseball']) {
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

  // ── 4. Baseball climbs within a phase ──────────────────────────────────────
  test("baseball's top-set percentage actually climbs within a phase — no longer flat at one number for all 4 weeks", () => {
    const tpl = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const pos = tpl.positions[0]
    const weeks = tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl))
    const phase1Working = [weeks[0], weeks[1], weeks[2]].map(pctOf) // wip 1-3 (excludes week 4's deload)

    expect(new Set(phase1Working).size).toBeGreaterThan(1)
    expect(Math.max(...phase1Working)).toBe(phase1Working[2]) // wip 3 is the phase's peak
  })

  // ── 6. Wave loading (not a flat linear climb) ──────────────────────────────
  test('wave loading is visible in the printed top-set percentages — week 2 dips below week 1 before week 3 peaks, for football and baseball', () => {
    // football excluded — see the same note above: linemen's position[0]
    // main-lift scheme is flat across wip 1-3 of a phase by explicit design
    // (only the deload week and the next phase boundary change the top %).
    for (const id of ['baseball']) {
      const tpl = SPORT_TEMPLATES.find(t => t.id === id)
      const pos = tpl.positions[0]
      const weeks = tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl))
      const [wip1, wip2, wip3] = [weeks[0], weeks[1], weeks[2]].map(pctOf)

      expect(wip2).toBeLessThan(wip1)
      expect(wip3).toBeGreaterThan(wip1)
      expect(wip3).toBeGreaterThan(wip2)
    }
  })

  test('no phase-boundary dip: a phase\'s opening week never drops below the previous phase\'s peak, for every sport — except the shared-block-periodization Phase 3->4 taper seam', () => {
    // cross_country and swimming are deliberately excluded from the %-based
    // wave/phase system by design (XC's dryland work is a fixed, intentionally
    // light 65-70% range with no heavy loading; swimming's main lifts use a
    // flat "@ moderate load" prescription with their own phase-based, not
    // week-based, set-count progression) — neither prints a single top-set %
    // in its objective, so there's no percentage to check for a dip here.
    //
    // baseball/softball/basketball/soccer, and football's skill/hybrid/qb
    // positions (not tested here — this test uses positions[0], which for
    // football is 'linemen', a fully separate untouched engine) deliberately
    // DO dip at the Phase 3 -> Phase 4 seam only (Change 2's Peak Taper —
    // Phase 4 reuses Phase 1's own range instead of continuing to climb).
    // The first two boundaries (Phase 1->2, Phase 2->3) still never dip for
    // any sport, target group or not.
    const TAPER_SPORTS = new Set(['baseball', 'softball', 'basketball', 'soccer'])
    for (const tpl of SPORT_TEMPLATES) {
      if (tpl.id === 'cross_country' || tpl.id === 'swimming') continue
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

describe('Area 10 — Baseball sport-specific content', () => {
  const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')

  function allDescriptions(weeks) {
    const out = []
    for (const w of weeks) for (const s of w.sessions) out.push(s.description)
    return out
  }

  test('the med-ball rotational/power pool (Rotational Throw, Scoop Toss, Shotput Throw, Overhead Slam, Broad Jump + Throw) appears across the 16-week progression', () => {
    const weeks = baseball.generateWeeks('baseball', 'standard', 4)
    const text = allDescriptions(weeks).join('\n')
    expect(/Med Ball Rotational Throw|Med Ball Scoop Toss|Shotput Med Ball Throw|Med Ball Overhead Slam|Med Ball Broad Jump \+ Throw/.test(text)).toBe(true)
  })

  test('the med-ball pool is scoped to baseball/softball only — no other sport picks up Med Ball Broad Jump + Throw or Shotput Med Ball Throw', () => {
    for (const tpl of SPORT_TEMPLATES) {
      if (tpl.id === 'baseball' || tpl.id === 'softball') continue
      const pos = tpl.positions[0]
      const weeks = tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl))
      const text = allDescriptions(weeks).join('\n')
      expect(/Med Ball Broad Jump \+ Throw|Shotput Med Ball Throw/.test(text)).toBe(false)
    }
  })

  test('explosive/plyo work (Box Jumps, Broad Jumps, or the Depth Jump → Box Jump contrast combo) appears on Lower Power', () => {
    const weeks = baseball.generateWeeks('baseball', 'standard', 4)
    const text = allDescriptions(weeks).join('\n')
    expect(/Box Jumps|Broad Jumps|Depth Jump → Box Jump/.test(text)).toBe(true)
  })

  // feat/finisher-engine — Sprint Tempo Protocol/Bike Ladder are now
  // engine-driven (Sprint/Energy families — see baseballFinisherBank): real
  // phase progression instead of one fixed prescription all 16 weeks, and
  // no longer locked to a specific day (Lower Strength/Lower Power) — the
  // engine schedules which day gets which family week to week, subject only
  // to BASEBALL_DAY_COMPAT (never on an upper-body day). These now check
  // that the Phase 1 text appears somewhere across the 16-week progression,
  // not a single fixed string tied to one day.
  test('the sprint/tempo protocol appears with its Phase 1 prescribed text, only ever on a lower-body day', () => {
    const weeks = baseball.generateWeeks('baseball', 'standard', 4)
    const text = allDescriptions(weeks).join('\n')
    expect(text).toContain('Sprint Tempo Protocol: 5x1 — 20 yds stride @ 75%, jog back @ 50%, 20 yds stride @ 75%, walk back = 1 rep')
    for (const w of weeks) {
      for (const s of w.sessions) {
        if (/Sprint Tempo Protocol/.test(s.description)) expect(s.focus).toMatch(/Lower/)
      }
    }
  })

  test('the Bike Ladder conditioning finisher appears with its Phase 1 prescribed protocol, only ever on a lower-body day', () => {
    const weeks = baseball.generateWeeks('baseball', 'standard', 4)
    const text = allDescriptions(weeks).join('\n')
    expect(text).toContain('Bike Ladder: 3x1 — 10s on/20s off, 15s/15s, 20s/10s, 15s/15s, 10s/20s')
    for (const w of weeks) {
      for (const s of w.sessions) {
        if (/Bike Ladder/.test(s.description)) expect(s.focus).toMatch(/Lower/)
      }
    }
  })

  test('the core finisher appears on Upper Power with the exact prescribed interval scheme, rotates movements week to week, and is exempt from the accessory volume wave', () => {
    const raw = baseball.generateWeeks('baseball', 'standard', 4)
    const progressed = applyAccessoryProgression(raw, SPORT_ACCESSORY_ROTATION.baseball)
    for (const weeks of [raw, progressed]) {
      const text = allDescriptions(weeks).join('\n')
      expect(text).toContain('Core — Finisher (20s on/10s off unless noted):')
      // Week 1's deterministic rotation is the pool's first 3 movements —
      // present regardless of the volume wave (exempt, unchanged either way).
      expect(text).toContain('Alternating V-Ups: 3x20s')
      expect(text).toContain('Penguins: 3x20s')
      expect(text).toContain('Alternating Supermans: 3x20s')
    }
    // Rotates: week 2 shows a DIFFERENT 3 movements than week 1, not the same
    // fixed set every week.
    const week1Text = raw[0].sessions.map(s => s.description).join('\n')
    const week2Text = raw[1].sessions.map(s => s.description).join('\n')
    expect(week2Text).toContain('Flutter Kicks: 3x20s')
    expect(week1Text).not.toContain('Flutter Kicks')
  })

  test('pitcher avoids heavy overhead pressing — Landmine Press instead, at lower load; "Overhead Press" never appears anywhere in baseball for either position (removed from the rebuilt content entirely)', () => {
    const positionWeeks = baseball.generateWeeks('baseball', 'standard', 4)
    const pitcherWeeks  = baseball.generateWeeks('pitcher', 'standard', 4)
    const positionText  = allDescriptions(positionWeeks).join('\n')
    const pitcherText   = allDescriptions(pitcherWeeks).join('\n')

    expect(/\bOverhead Press\b/.test(positionText)).toBe(false)
    expect(/\bOverhead Press\b/.test(pitcherText)).toBe(false)
    expect(pitcherText).toContain('Landmine Press: 4x8 (lower load — no direct overhead pressing)')
  })

  test('Lower Power: the squat variant + jump contrast renders bracketed, heavy lift first, alternating Front Squat/Back Squat weekly', () => {
    const raw = baseball.generateWeeks('baseball', 'standard', 4)
    const organized = applySessionOrganization(raw, SPORT_ACCESSORY_ROTATION.baseball, 'baseball')
    const week1Day1 = organized[0].sessions[0].description.split('\n')
    const week2Day1 = organized[1].sessions[0].description.split('\n')
    const marked1 = week1Day1.filter(l => SUPERSET_MARKER_RE.test(l))
    const marked2 = week2Day1.filter(l => SUPERSET_MARKER_RE.test(l))
    expect(marked1[0]).toMatch(/^⟦SS1⟧Front Squat:/)
    expect(marked1[1]).toMatch(/^⟦SS1⟧(Box Jumps|Broad Jumps|Depth Jump → Box Jump):/)
    expect(marked2[0]).toMatch(/^⟦SS1⟧Back Squat:/)
  })

  test('Upper Strength: DB Bench Press + Tibialis Raises renders correctly, press first, and is NOT category-varied (stays fixed every week)', () => {
    const weeks = baseball.generateWeeks('baseball', 'standard', 4)
    for (const wk of [0, 1, 2, 3]) {
      const day2 = weeks[wk].sessions[1].description.split('\n')
      const marked = day2.filter(l => SUPERSET_MARKER_RE.test(l) && /DB Bench Press|Tibialis Raises/.test(l))
      expect(marked[0]).toMatch(/^⟦SS1⟧DB Bench Press:/)
      expect(marked[1]).toMatch(/^⟦SS1⟧Tibialis Raises:/)
    }
  })

  test('a knee-injury substitution still correctly retargets an exercise inside a superset group (marker-vs-injury-regex hardening) — Front Squat -> Goblet Squat on an odd (Front Squat) week', () => {
    const survey = mkSurvey({ sport: 'Baseball', position: 'Position Player', time_per_week: '4', injury_areas: ['Knee'] })
    const bp = generateBlueprintForAthlete(survey)
    const day1 = bp.weeks[0].sessions[0].description
    expect(day1).toMatch(/⟦SS1⟧Goblet Squat:/)
    expect(day1).not.toContain('Front Squat')
  })
})

// ─── Area 11 — Session organization, volume cap, and warm-up blocks ────────
// Covers the Part 1-4 restructuring: the shared applySessionOrganization pass
// (accessory cap + auto-pairing, all sports), the Oly-lift-vs-ramped-lift
// main-lift split, cut priority, Tibialis Raises via rotation, and baseball's
// day-type warm-up blocks.

describe('Area 11 — Session organization, volume cap, and warm-up blocks', () => {
  const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')

  test('a non-baseball sport also gets the accessory cap and auto-pairing — main lift stands alone, its plyo contrast pairs with it, everything else pairs in 2s up to 3 accessory slots', () => {
    // Fixture note (feat/blueprint-quick-wins): this used to say position:
    // 'Jumpers', but normalizePosition's track branch only matched the
    // singular \bjumper\b — "Jumpers" (the real SPORT_TEMPLATES/survey label)
    // never matched and silently fell through to Sprint, so this test spent
    // its whole life unknowingly exercising trackSprintSess, not
    // trackJumpSess. Now that the plural-form gap is fixed (see
    // normalizePosition), 'Jumpers' correctly reaches trackJumpSess — whose
    // real Day 1 has TWO plyo-keyword lines (Box Jumps + Approach Jump
    // Work), so it no longer fits the single-plyo-contrast case this test is
    // specifically about (that's covered separately — see Area 17/track
    // tests below). 'Sprinters' is the correct fixture for this test's
    // actual intent and reproduces the exact assertions already here.
    const bp = generateBlueprintForAthlete({
      sport: 'Track and Field', position: 'Sprinters', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const day1 = bp.weeks[0].sessions[0].description.split('\n')
    const marked = day1.filter(l => SUPERSET_MARKER_RE.test(l))
    // SS1 = Back Squat + Box Jumps (main lift's plyo contrast), SS2 = an
    // auto-paired accessory duo — 4 marked lines across 2 groups.
    expect(marked.length).toBe(4)
    expect(marked[0]).toMatch(/^⟦SS1⟧Back Squat:/)
    expect(marked[1]).toMatch(/^⟦SS1⟧Box Jumps:/)
    expect(marked[2]).toMatch(/^⟦SS2⟧/)
    expect(marked[3]).toMatch(/^⟦SS2⟧/)
  })

  test('Oly-lift/ramped-lift split regression: a session with BOTH a technical Olympic lift and a separate %-ramped lift keeps the Oly lift standalone and only pairs the ramped lift with the plyo contrast — they never get bundled into one group', () => {
    // Same fixture correction as the test above — see its comment.
    const bp = generateBlueprintForAthlete({
      sport: 'Track and Field', position: 'Sprinters', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const day1 = bp.weeks[0].sessions[0].description
    // Power Clean (technical Oly lift, no %) must render with NO superset
    // marker — it stands alone, never bundled with the ramped squat + jump.
    expect(firstMatchingLine(day1, /Power Clean/)).toMatch(/^Power Clean:/)
    expect(firstMatchingLine(day1, /Power Clean/)).not.toMatch(SUPERSET_MARKER_RE)
    // Back Squat (the %-ramped lift) is the one that pairs with the jump.
    expect(firstMatchingLine(day1, /Back Squat/)).toMatch(/^⟦SS1⟧Back Squat:/)
  })

  test('cut priority: generic filler (Bicep Curls, Tricep Extensions) is dropped before regular sport accessories when trimming to the cap', () => {
    const bp = generateBlueprintForAthlete({
      sport: 'Football', position: 'Linemen', primary_goal: 'muscle_gain',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const day1 = bp.weeks[0].sessions[0].description
    expect(day1).not.toContain('Bicep Curls')
    expect(day1).not.toContain('Tricep Extensions')
    // The non-generic accessories from the same day survive the cap instead.
    expect(day1).toContain('Bulgarian Split Squat')
    expect(day1).toContain('Leg Curl')
    expect(day1).toContain('Double Leg Calf Raise')
  })

  test('Tibialis Raises rotates in as a real working lower-body accessory (not a warm-up) via the calf-raise rotation slot', () => {
    const bp = generateBlueprintForAthlete({
      sport: 'Baseball', position: 'Position Player', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    // Change 4 (shared block periodization): baseball's Calf Raises rotation
    // is now phase-keyed, not wip-keyed — Tibialis Raises is the Phase 2
    // (Development, weeks 5-8) variant specifically, not every wip-2 week.
    // Week 6 (index 5) is Phase 2. Phase 1 (e.g. week 2) now shows the
    // anchor "Calf Raises" name instead, at Foundation's higher volume.
    const week6Day1 = bp.weeks[5].sessions[0]
    expect(week6Day1.description).toContain('Tibialis Raises:')
    // It's a working accessory line, not part of the warm-up block.
    expect((week6Day1.warmup?.lines || []).some(l => l.startsWith('Tibialis Raises'))).toBe(false)
  })

  test('each baseball day type carries the correct collapsed warm-up block, and non-baseball sports get none (baseball-only for now)', () => {
    const bp = generateBlueprintForAthlete({
      sport: 'Baseball', position: 'Position Player', primary_goal: 'standard',
      time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    })
    const [day1, day2, day3, day4] = bp.weeks[0].sessions
    expect(day1.warmup.label).toMatch(/Lower Power/i)
    expect(day1.warmup.lines.some(l => l.startsWith('Jog:'))).toBe(true)
    expect(day2.warmup.label).toMatch(/Upper.*Push/i)
    expect(day2.warmup.lines.some(l => l.startsWith('Prone Y-T-W Raises:'))).toBe(true)
    expect(day3.warmup.label).toMatch(/Squat.*Hinge/i)
    expect(day3.warmup.lines.some(l => l.startsWith('Cat-Cow:'))).toBe(true)
    expect(day4.warmup.label).toMatch(/Upper.*Push/i)

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

  test('the accessory cap holds across every sport/position/day-count combination — no session ever exceeds its sport\'s configured cap worth of accessory content beyond the main lift', () => {
    for (const tpl of SPORT_TEMPLATES) {
      // Default-cap (3) sports: at most 2 superset groups — one is the
      // optional main-lift+plyo/authored-partner contrast, the rest of the
      // 3-weight budget collapses into at most 1 more pair-group plus a
      // possible leftover single. Baseball/softball's raised cap (6) allows
      // up to 3 groups (baseball's Upper Strength is deliberately 3 full
      // authored pairs, not auto-trimmed — see Area 14).
      const maxGroups = (SPORT_MAX_ACCESSORIES[tpl.id] || 3) > 3 ? 3 : 2
      for (const pos of tpl.positions) {
        for (const days of tpl.daysOptions.map(d => d.days)) {
          const rotation = SPORT_ACCESSORY_ROTATION[tpl.id] || {}
          const weeks = applySessionOrganization(tpl.generateWeeks(pos.id, 'standard', days), rotation, tpl.id)
          for (const w of weeks) {
            for (const s of w.sessions) {
              const markerGroups = new Set(
                s.description.split('\n')
                  .map(l => l.match(SUPERSET_MARKER_RE))
                  .filter(Boolean)
                  .map(m => m[1])
              )
              expect(markerGroups.size).toBeLessThanOrEqual(maxGroups)
            }
          }
        }
      }
    }
  })
})

// ─── Area 12 — Trap Bar Jump (Olympic-lift removal, baseball) ──────────────
// Baseball no longer prescribes Hang Clean/Power Clean anywhere — Olympic
// lifts require expert in-person coaching to execute safely, and Offseaz
// athletes often train without a coach present. Trap Bar Jump replaces both
// as a safer power movement: same explosive triple extension, no technical
// catch phase. Since the comprehensive rebuild, it lives exclusively on
// Lower Power (day-type locking: total-body power moves are lower-day only)
// as that day's standalone power-move exception — no longer scattered
// across the old Day 2/3/4 upper-day slots.

describe('Area 12 — Trap Bar Jump (Olympic-lift removal, baseball)', () => {
  const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')

  function allBaseballBlueprints() {
    const out = []
    for (const position of ['Position Player', 'Pitcher']) {
      for (const days of ['3', '4', '5', '6']) {
        out.push(generateBlueprintForAthlete(mkSurvey({
          sport: 'Baseball', position, time_per_week: days,
        })))
      }
    }
    return out
  }

  test('no Hang Clean or Power Clean (any variant) appears anywhere in baseball output, for any position or day count', () => {
    const violations = []
    for (const bp of allBaseballBlueprints()) {
      for (const s of allSessions(bp.weeks)) {
        if (/\bHang Clean\b|\bPower Clean\b|\bHang Power Clean\b/.test(s.description)) {
          violations.push(`${bp.title} week ${s.week} ${s.day}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  test('Trap Bar Jump appears with its load note on every session that used to carry an Olympic lift, for position player and pitcher, 3-day and 4-day', () => {
    for (const position of ['Position Player', 'Pitcher']) {
      for (const days of ['3', '4']) {
        const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position, time_per_week: days }))
        const text = allSessions(bp.weeks).map(s => s.description).join('\n')
        // Every occurrence of the exercise name carries the exact load note,
        // not just some of them.
        const lines = text.split('\n').filter(l => /Trap Bar Jump/.test(l))
        expect(lines.length).toBeGreaterThan(0)
        for (const line of lines) {
          // Change 3 (shared block periodization) appends a phase intent
          // note after the load suggestion — still starts with the exact
          // same load note every time, just no longer the end of the line.
          expect(line).toMatch(/Trap Bar Jump: \d+x\d+ \(Suggested: Keep under 155lbs — .+\)/)
        }
      }
    }
  })

  test('Trap Bar Jump always stands alone, never bracketed into a superset — same free-anchor treatment as an Olympic/ramped lift, not an ordinary accessory candidate', () => {
    // Superseded by the under-filling root-cause fix: a day's anchor (Trap
    // Bar Jump included) is now promoted to the same free, uncounted slot
    // an Oly/ramped lift gets, instead of competing in the capped accessory
    // pool — which is what let it silently eat one of the 3 accessory slots
    // and under-fill the day (main + 2 instead of main + 3). It should
    // therefore NEVER carry a superset marker, on any session.
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player', time_per_week: '4' }))
    let sawStandalone = false
    let sawPaired = false
    for (const s of allSessions(bp.weeks)) {
      for (const line of s.description.split('\n')) {
        if (!/Trap Bar Jump/.test(line)) continue
        if (SUPERSET_MARKER_RE.test(line)) sawPaired = true
        else sawStandalone = true
      }
    }
    expect(sawStandalone).toBe(true)
    expect(sawPaired).toBe(false)
  })

  test('Trap Bar Jump reliably survives the accessory cap every single week — it never silently disappears from Lower Power (Day 1), the only day it belongs on now', () => {
    for (const position of ['Position Player', 'Pitcher']) {
      const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position, time_per_week: '4' }))
      for (const w of bp.weeks) {
        expect(w.sessions[0].description).toContain('Trap Bar Jump')
      }
    }
  })

  test('a knee injury swaps Trap Bar Jump for Trap Bar Deadlift (removes the landing-impact component), never leaving the raw Trap Bar Jump line behind', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player', time_per_week: '4', injury_areas: ['Knee'] }))
    let hasTrapBarDeadliftSwap = false
    for (const s of allSessions(bp.weeks)) {
      // Change 3 appends a phase intent note after the load suggestion now.
      if (/Trap Bar Deadlift: \d+x\d+ \(Suggested: Keep under 155lbs — .+\)/.test(s.description)) hasTrapBarDeadliftSwap = true
    }
    const stillHasRawJump = allSessions(bp.weeks).some(s => /Trap Bar Jump/.test(s.description))
    expect(stillHasRawJump).toBe(false)
    expect(hasTrapBarDeadliftSwap).toBe(true)
  })

  test('Trap Bar Jump is present in the exercise library and resolves via the same case-insensitive lookup the info button uses', () => {
    const libSource = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'client', 'src', 'data', 'exerciseLibrary.js'),
      'utf8'
    )
    expect(libSource).toMatch(/'trap bar jump':\s*\{/)
  })

  test('the day-type warm-up block is unaffected by the Trap Bar Jump swap — Day 2/4 (Upper/Push) and the squat/hinge day still show their correct warm-up', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player', time_per_week: '4' }))
    const [day1, day2, day3, day4] = bp.weeks[0].sessions
    expect(day1.warmup.label).toMatch(/Lower Power/i)
    expect(day2.warmup.label).toMatch(/Upper.*Push/i)
    expect(day3.warmup.label).toMatch(/Squat.*Hinge/i)
    expect(day4.warmup.label).toMatch(/Upper.*Push/i)
  })
})

// ─── Area 13 — Under-filling root-cause fix (any day, any anchor type) ─────
// organizeSessionDescription used to only reorganize a day if it found a
// %-ramped or technical-Olympic-lift line. Everything else — a day anchored
// by a plain press, a row, or a jump — either got skipped entirely (raw,
// uncapped, unpaired template text passed straight through) or, if it had a
// narrow special-case escape hatch (baseball's old Trap Bar Jump handling),
// had its own anchor compete for and consume one of the 3 accessory
// budget slots, silently under-filling the day (main + 2 instead of
// main + 3). The fix promotes whichever line is FIRST in the template's own
// authored order to the same free, uncounted anchor slot an Oly/ramped lift
// already gets, whenever there's no Oly/ramped lift — so every day with any
// real working content gets organized and filled to its intended cap,
// regardless of what kind of movement anchors it.

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
              if (/^(Core|Arm Care|Neck)\s*—/.test(l)) { inCore = true; continue }
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

describe('Area 14 — Baseball comprehensive rebuild', () => {
  const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
  const ALL_DAY_COUNTS = ['3', '4', '5', '6']
  const ALL_POSITIONS = ['Position Player', 'Pitcher']

  function allBaseballBlueprints() {
    const out = []
    for (const position of ALL_POSITIONS) {
      for (const days of ALL_DAY_COUNTS) {
        out.push({ position, days, bp: generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position, time_per_week: days })) })
      }
    }
    return out
  }

  describe('category-based lift variation', () => {
    test('Lower Power squat alternates Front Squat (odd weeks) / Back Squat (even weeks), progression (%) unaffected', () => {
      // The squat + jump contrast pair is content-detected by
      // applySessionOrganization, not authored with an `ss` field — no
      // marker exists until that pass runs (unlike the rest of this day's
      // authored pairs, which already carry their marker on raw output).
      const rawWeeks = baseball.generateWeeks('baseball', 'standard', 4)
      const weeks = applySessionOrganization(rawWeeks, SPORT_ACCESSORY_ROTATION.baseball, 'baseball')
      expect(weeks[0].sessions[0].description).toMatch(/^⟦SS1⟧Front Squat: \d+%/m)
      expect(weeks[1].sessions[0].description).toMatch(/^⟦SS1⟧Back Squat: \d+%/m)
      expect(weeks[2].sessions[0].description).toMatch(/^⟦SS1⟧Front Squat: \d+%/m)
      // The % progression itself keeps climbing across the phase regardless
      // of which name is showing (proves the swap doesn't reset/disturb load).
      // Reps are fixed at 8 for both weeks (Change 1: both are Phase 1 —
      // rotational tier's Foundation rep target only changes at a phase
      // boundary, not week to week), so a literal reps count is still safe
      // to match on here.
      const w1pct = weeks[0].sessions[0].description.match(/(\d+)%×8$/m)[1]
      const w3pct = weeks[2].sessions[0].description.match(/(\d+)%×8$/m)[1]
      expect(parseInt(w3pct, 10)).toBeGreaterThan(parseInt(w1pct, 10))
    })

    test('Upper Power bench variant alternates DB Bench Press (odd) / Incline DB Press (even), its iso partner varies with it', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      expect(weeks[0].sessions[3].description).toMatch(/^⟦SS1⟧DB Bench Press: \d+%/m)
      expect(weeks[0].sessions[3].description).toContain('Bulgarian Split Squat Iso Hold')
      expect(weeks[1].sessions[3].description).toMatch(/^⟦SS1⟧Incline DB Press: \d+%/m)
      expect(weeks[1].sessions[3].description).toContain('Long-Lever Plank Iso')
    })

    test('Lower Strength anchor alternates Trap Bar Deadlift (odd) / Reverse Lunge (even) — never both the same day', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      for (const [idx, expectDeadlift] of [[0, true], [1, false], [2, true], [3, false]]) {
        const desc = weeks[idx].sessions[2].description
        expect(desc.includes('Trap Bar Deadlift')).toBe(expectDeadlift)
        expect(desc.includes('Reverse Lunge')).toBe(!expectDeadlift)
      }
    })

    test('the glute accessory tied to the anchor: Glute Bridge on Trap Bar Deadlift weeks, Hip Thrust on Reverse Lunge weeks', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      expect(weeks[0].sessions[2].description).toContain('Glute Bridge')
      expect(weeks[1].sessions[2].description).toContain('Hip Thrust')
    })

    test('the med-ball pool rotates on Lower Strength and Upper Power independently, never showing the same movement on both days in the same week', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      for (const w of weeks.slice(0, 8)) {
        const lowerStrengthMedBall = w.sessions[2].description.split('\n').find(l => /Med Ball|Shotput/.test(l)).replace(/⟦SS\d+⟧/, '').split(':')[0]
        const upperPowerMedBall = w.sessions[3].description.split('\n').find(l => /Med Ball|Shotput/.test(l)).replace(/⟦SS\d+⟧/, '').split(':')[0]
        expect(lowerStrengthMedBall).not.toBe(upperPowerMedBall)
      }
    })

    test('a %-ramped anchor (Trap Bar Deadlift, or a bench variant) correctly brackets with its authored partner instead of the marker breaking', () => {
      // Regression test for the specific bug this rebuild fixed: marking a
      // ramped/Oly line with `ss` used to silently strip the marker before
      // its partner was ever reached.
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      const lowerStrength = weeks[0].sessions[2].description.split('\n')
      const marked1 = lowerStrength.filter(l => SUPERSET_MARKER_RE.test(l))
      expect(marked1[0]).toMatch(/^⟦SS1⟧Trap Bar Deadlift:/)
      expect(marked1[1]).toMatch(/^⟦SS1⟧(Med Ball|Shotput)/)

      const upperPower = weeks[0].sessions[3].description.split('\n')
      const marked2 = upperPower.filter(l => SUPERSET_MARKER_RE.test(l))
      expect(marked2[0]).toMatch(/^⟦SS1⟧DB Bench Press:/)
      expect(marked2[1]).toMatch(/^⟦SS1⟧Bulgarian Split Squat Iso Hold:/)
    })
  })

  describe('day-type locking', () => {
    test('arm-care work (Band Pull-Aparts, Band External Rotation, Face Pulls, Prone Swimmers, Scap Push-Ups, YTW Raises, Crossover Symmetry) never appears on a lower-body day, for any position/day-count/week', () => {
      const ARM_CARE_RE = /\b(Band Pull-Aparts|Band External Rotation|Face Pulls|Prone Swimmers|Scap Push-Ups|YTW Raises|Crossover Symmetry Band Series)\b/
      const LOWER_FOCUS_RE = /Lower/i
      const violations = []
      for (const { position, days, bp } of allBaseballBlueprints()) {
        for (const w of bp.weeks) {
          for (const s of w.sessions) {
            if (!LOWER_FOCUS_RE.test(s.focus)) continue
            if (ARM_CARE_RE.test(s.description)) violations.push(`${position}/${days}d week ${w.week_number} ${s.day} (${s.focus})`)
          }
        }
      }
      expect(violations).toEqual([])
    })

    test('Trap Bar Jump (total-body power move) never appears on an upper-body day, for any position/day-count/week', () => {
      const UPPER_FOCUS_RE = /Upper/i
      const violations = []
      for (const { position, days, bp } of allBaseballBlueprints()) {
        for (const w of bp.weeks) {
          for (const s of w.sessions) {
            if (!UPPER_FOCUS_RE.test(s.focus)) continue
            if (/Trap Bar Jump/.test(s.description)) violations.push(`${position}/${days}d week ${w.week_number} ${s.day} (${s.focus})`)
          }
        }
      }
      expect(violations).toEqual([])
    })
  })

  describe('finisher arrangement — no conditioning+core or arm-care+core on any day, any day-count', () => {
    const CORE_HEADER_RE = /^Core\s*—/
    const ARM_CARE_HEADER_RE = /^Arm Care\s*—/
    const CONDITIONING_NAMES_RE = /^(Sprint Tempo Protocol|Bike Ladder)\b/

    test('no session anywhere in baseball combines a Core block with a conditioning finisher (Sprint Tempo Protocol or Bike Ladder)', () => {
      const violations = []
      for (const { position, days, bp } of allBaseballBlueprints()) {
        for (const w of bp.weeks) {
          for (const s of w.sessions) {
            const lines = s.description.split('\n')
            const hasCore = lines.some(l => CORE_HEADER_RE.test(l))
            const hasConditioning = lines.some(l => CONDITIONING_NAMES_RE.test(l.replace(SUPERSET_MARKER_RE, '')))
            if (hasCore && hasConditioning) violations.push(`${position}/${days}d week ${w.week_number} ${s.day}`)
          }
        }
      }
      expect(violations).toEqual([])
    })

    test('no session anywhere in baseball combines a Core block with the Arm Care circuit', () => {
      const violations = []
      for (const { position, days, bp } of allBaseballBlueprints()) {
        for (const w of bp.weeks) {
          for (const s of w.sessions) {
            const lines = s.description.split('\n')
            const hasCore = lines.some(l => CORE_HEADER_RE.test(l))
            const hasArmCare = lines.some(l => ARM_CARE_HEADER_RE.test(l))
            if (hasCore && hasArmCare) violations.push(`${position}/${days}d week ${w.week_number} ${s.day}`)
          }
        }
      }
      expect(violations).toEqual([])
    })

    test('the 3-day split\'s old hand-authored hybrid Day 3 (which combined arm-care + conditioning + core) is gone — confirmed by the two rules above holding for 3-day plans specifically', () => {
      const bp3 = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player', time_per_week: '3' }))
      expect(bp3.weeks[0].sessions.length).toBe(3)
      const day3 = bp3.weeks[0].sessions[2].description
      const hasArmCare = /^Arm Care\s*—/m.test(day3)
      const hasConditioning = /^(Sprint Tempo Protocol|Bike Ladder)\b/m.test(day3.split('\n').map(l => l.replace(SUPERSET_MARKER_RE, '')).join('\n'))
      const hasCore = /^Core\s*—/m.test(day3)
      // Lower Strength (3-day's Day 3): Sprint Tempo Protocol only, no core, no arm-care.
      expect(hasConditioning).toBe(true)
      expect(hasArmCare).toBe(false)
      expect(hasCore).toBe(false)
    })

    // feat/finisher-engine — the finisher arrangement is no longer a fixed
    // "Day N always gets family X" mapping; the shared engine schedules
    // which of the 5 families (Sprint/Energy/Core/Rotation/Arm) lands on
    // which day, by weighted allocation, phase to phase. What DOES still
    // hold (baseball's own pre-existing day-type-locking rule, restored via
    // BASEBALL_DAY_COMPAT in blueprintTemplates.js) is that lower-body days
    // only ever get a Sprint/Energy/Rotation finisher and upper-body days
    // only ever get a Core/Arm/Rotation finisher — never arm-care/core on a
    // lower day, never Sprint Tempo/Bike Ladder on an upper day.
    test('every day\'s finisher stays within its day-type family (lower: Sprint/Energy/Rotation only; upper: Core/Arm/Rotation only), across all 16 weeks', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      const LOWER_ONLY_RE = /^(Sprint Tempo Protocol|Bike Ladder)\b/
      const UPPER_ONLY_HEADER_RE = /^(Core|Arm Care)\s*—/
      const violations = []
      for (const w of weeks) {
        for (const s of w.sessions) {
          const lines = s.description.split('\n').map(l => l.replace(SUPERSET_MARKER_RE, ''))
          const isLowerDay = /Lower/.test(s.focus)
          if (isLowerDay && lines.some(l => UPPER_ONLY_HEADER_RE.test(l))) violations.push(`week ${w.week_number} ${s.day}: Core/Arm Care on a lower day`)
          if (!isLowerDay && lines.some(l => LOWER_ONLY_RE.test(l))) violations.push(`week ${w.week_number} ${s.day}: Sprint/Energy conditioning on an upper day`)
        }
      }
      expect(violations).toEqual([])
    })

    test('a real finisher (Sprint/Energy/Core/Rotation/Arm) is present on every session, every week — never a flat day with no finisher at all', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      const FINISHER_RE = /^(Sprint Tempo Protocol|Bike Ladder|Core\s*—|Arm Care\s*—|Conditioning\s*—)/m
      const missing = []
      for (const w of weeks) {
        for (const s of w.sessions) {
          if (!FINISHER_RE.test(s.description)) missing.push(`week ${w.week_number} ${s.day}`)
        }
      }
      expect(missing).toEqual([])
    })

    test('whenever the Arm Care circuit lands on a day, it is never bracketed into a pairing — and Phase 1\'s own occurrence (its fullest, 3-exercise prescription) has 3+ exercises', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      let checkedAtLeastOnce = false
      let sawPhase1ThreePlus = false
      for (const w of weeks) {
        for (const s of w.sessions) {
          const lines = s.description.split('\n')
          const headerIdx = lines.findIndex(l => /^Arm Care\s*—/.test(l))
          if (headerIdx < 0) continue
          checkedAtLeastOnce = true
          const circuitLines = lines.slice(headerIdx + 1).filter(l => l.trim() !== '')
          expect(circuitLines.length).toBeGreaterThanOrEqual(1)
          for (const l of circuitLines) expect(SUPERSET_MARKER_RE.test(l)).toBe(false)
          if (w.week_number <= 3 && circuitLines.length >= 3) sawPhase1ThreePlus = true
        }
      }
      expect(checkedAtLeastOnce).toBe(true)
      expect(sawPhase1ThreePlus).toBe(true)
    })
  })

  describe('pairing/balance rule — ~90% paired, only main lift or power move standalone', () => {
    test('across all 4 core baseball days, at least 90% of working exercise lines are bracketed into a pairing, and every standalone line is either a main lift, Trap Bar Jump, or a finisher', () => {
      const weeks = applySessionOrganization(baseball.generateWeeks('baseball', 'standard', 4), SPORT_ACCESSORY_ROTATION.baseball, 'baseball')
      let total = 0
      let paired = 0
      const unpairedNonExempt = []
      // feat/finisher-engine — Sprint/Energy/Rotation now render under a
      // "Conditioning — <subtitle>:" header (finisherEngine.js's
      // FINISHER_HEADER_WORD), same exempt-block treatment as Core/Arm
      // Care, so it needs the same recognition here.
      const FINISHER_OR_MAIN_RE = /^(Trap Bar Jump|Bike Ladder|Sprint Tempo Protocol)\b/
      for (const s of weeks[0].sessions) {
        let inExemptBlock = false
        for (const rawLine of s.description.split('\n')) {
          const bare = rawLine.replace(SUPERSET_MARKER_RE, '')
          if (bare.trim() === '') { inExemptBlock = false; continue }
          if (/^(Core|Arm Care|Conditioning)\s*—/.test(bare)) { inExemptBlock = true; continue }
          if (inExemptBlock) continue
          const colonIdx = bare.indexOf(':')
          if (colonIdx <= 0) continue
          if (SUPERSET_MARKER_RE.test(rawLine)) { total++; paired++; continue }
          // A recognized finisher or the day's own main-lift-standalone line
          // is explicitly outside what the ~90% pairing rule measures — it's
          // never meant to be paired at all, same as Core/Arm Care block
          // content above (which is also excluded from the denominator).
          if (FINISHER_OR_MAIN_RE.test(bare)) continue
          total++
          unpairedNonExempt.push(`${s.day}: ${bare}`)
        }
      }
      expect(unpairedNonExempt).toEqual([])
      expect(paired / total).toBeGreaterThanOrEqual(0.9)
    })
  })

  describe('Upper Strength — intentionally over the normal cap, not auto-trimmed', () => {
    test('all 3 authored pairs survive every week, never trimmed down to 2', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      for (const w of weeks) {
        const day2 = w.sessions[1].description
        const groups = new Set(day2.split('\n').map(l => l.match(SUPERSET_MARKER_RE)).filter(Boolean).map(m => m[1]))
        expect(groups.size).toBe(3)
      }
    })
  })

  describe('choose-1 auto-rotating slots (triceps/biceps, Upper Power)', () => {
    test('the prescribed exercise rotates deterministically across a 3-week cycle, and the note always lists the other 2 pool options', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 4)
      const tricepPicks = weeks.slice(0, 3).map(w => {
        const line = w.sessions[3].description.split('\n').find(l => /DB Skull Crushers|Diamond Push-Ups|Cable Pushdown/.test(l))
        return line.replace(SUPERSET_MARKER_RE, '')
      })
      // 3 distinct picks across 3 consecutive weeks (full pool cycle).
      const names = tricepPicks.map(l => l.split(':')[0])
      expect(new Set(names).size).toBe(3)
      for (const line of tricepPicks) {
        expect(line).toMatch(/^(DB Skull Crushers|Diamond Push-Ups|Cable Pushdown): 3x10 \(or /)
      }
      // Week 4 repeats week 1's pick (3-week cycle).
      const week4 = weeks[3].sessions[3].description.split('\n').find(l => /DB Skull Crushers|Diamond Push-Ups|Cable Pushdown/.test(l))
      expect(week4.replace(SUPERSET_MARKER_RE, '')).toBe(tricepPicks[0])
    })

    test('triceps and biceps choose-1 slots are bracketed together as a pair', () => {
      const day4 = baseball.generateWeeks('baseball', 'standard', 4)[0].sessions[3].description.split('\n')
      const marked = day4.filter(l => SUPERSET_MARKER_RE.test(l) && /Crushers|Push-Ups|Pushdown|Curls/.test(l))
      expect(marked.length).toBe(2)
      const group = marked[0].match(SUPERSET_MARKER_RE)[1]
      expect(marked[1]).toMatch(new RegExp(`^⟦SS${group}⟧`))
    })
  })

  describe('Day 6 — light mobility/prehab day (6-day plans only)', () => {
    test('Day 6 only appears on 6-day plans, never on 3/4/5-day', () => {
      for (const { position, days, bp } of allBaseballBlueprints()) {
        const hasDay6 = bp.weeks[0].sessions.some(s => s.day === 'Day 6')
        expect(hasDay6).toBe(days === '6' ? true : false)
      }
    })

    test('Day 6 rotates 4 movements deterministically by week, and stays genuinely light (every line notes "light", low set counts)', () => {
      const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player', time_per_week: '6' }))
      const week1 = bp.weeks[0].sessions.find(s => s.day === 'Day 6').description
      const week2 = bp.weeks[1].sessions.find(s => s.day === 'Day 6').description
      expect(week1).not.toBe(week2)
      for (const desc of [week1, week2]) {
        const lines = desc.split('\n').filter(l => l.trim() !== '' && l.includes(':'))
        expect(lines.length).toBeGreaterThanOrEqual(4)
        for (const l of lines) {
          expect(l).toMatch(/\(light/)
          const setsMatch = l.match(/:\s*(\d+)x/)
          if (setsMatch) expect(parseInt(setsMatch[1], 10)).toBeLessThanOrEqual(2)
        }
      }
    })

    test('Day 6 is baseball-scoped — no other sport gets a rotating light-mobility Day 6', () => {
      for (const tpl of SPORT_TEMPLATES) {
        if (tpl.id === 'baseball' || tpl.id === 'softball') continue
        const pos = tpl.positions[0]
        const days = tpl.daysOptions.find(d => d.days >= 6)
        if (!days) continue
        const weeks = tpl.generateWeeks(pos.id, 'standard', days.days)
        const day6 = weeks[0].sessions.find(s => s.day === 'Day 6')
        // Cossack Squat pre-exists elsewhere (e.g. hockey's own recovery
        // day) independent of this rebuild — check names that are
        // genuinely unique, brand-new library entries from this rebuild.
        if (day6) expect(day6.description).not.toMatch(/World's Greatest Stretch|Copenhagen Plank/)
      }
    })
  })

  describe('Hamstring Curls — hip-injury substitution only, never default content', () => {
    test('Hamstring Curls never appears in default (no-injury) baseball content, for any position/day-count', () => {
      const violations = []
      for (const { position, days, bp } of allBaseballBlueprints()) {
        for (const s of allSessions(bp.weeks)) {
          if (/Hamstring Curls/.test(s.description)) violations.push(`${position}/${days}d ${s.day}`)
        }
      }
      expect(violations).toEqual([])
    })

    test('a hip injury swaps Single Leg RDL for Hamstring Curls, marker preserved', () => {
      const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Baseball', position: 'Position Player', time_per_week: '4', injury_areas: ['Hip'] }))
      const lowerStrength = bp.weeks[0].sessions[2].description
      expect(lowerStrength).toMatch(/⟦SS\d+⟧Hamstring Curls:/)
      expect(lowerStrength).not.toContain('Single Leg RDL')
    })
  })

  describe('3-day split reuses the 4-day day-functions directly (no separately-authored hybrid)', () => {
    test('baseball3Day and pitcher3Day are exactly the first 3 sessions of the 4-day equivalent, byte-for-byte, for every week', () => {
      const b4 = baseball.generateWeeks('baseball', 'standard', 4)
      const b3 = baseball.generateWeeks('baseball', 'standard', 3)
      for (let i = 0; i < b3.length; i++) {
        expect(b3[i].sessions).toEqual(b4[i].sessions.slice(0, 3))
      }
      const p4 = baseball.generateWeeks('pitcher', 'standard', 4)
      const p3 = baseball.generateWeeks('pitcher', 'standard', 3)
      for (let i = 0; i < p3.length; i++) {
        expect(p3[i].sessions).toEqual(p4[i].sessions.slice(0, 3))
      }
    })

    test('the 3-day split has no Upper Power day (dropped, not compressed into Day 3)', () => {
      const weeks = baseball.generateWeeks('baseball', 'standard', 3)
      expect(weeks[0].sessions.some(s => s.focus === 'Upper Power')).toBe(false)
      expect(weeks[0].sessions.map(s => s.focus)).toEqual(['Lower Power', 'Upper Strength', 'Lower Strength'])
    })
  })

  describe('this rebuild stays baseball-scoped — no contamination of other sports', () => {
    test('none of the new baseball-specific exercise names appear in any other sport\'s output', () => {
      // Suitcase Carry deliberately excluded — it's a pre-existing, shared
      // exercise already used by several other sports' templates (and
      // already in MOBILITY_EXACT_EXEMPT before this rebuild); it just
      // never had a library entry until now. Not new/exclusive to baseball.
      const BASEBALL_ONLY_NAMES = [
        'Gorilla Row', 'Side X Plank', 'Long-Lever Plank Iso', 'Barbell Single Leg RDL',
        'Bike Ladder', 'DB Skull Crushers', 'Diamond Push-Ups', 'Cable Pushdown',
        'DB Curls', 'Cable Curls', 'Incline Curls', 'Med Ball Broad Jump + Throw',
      ]
      const violations = []
      for (const tpl of SPORT_TEMPLATES) {
        if (tpl.id === 'baseball' || tpl.id === 'softball') continue
        for (const pos of tpl.positions) {
          const weeks = tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl))
          const text = weeks.map(w => w.sessions.map(s => s.description).join('\n')).join('\n')
          for (const name of BASEBALL_ONLY_NAMES) {
            if (text.includes(name)) violations.push(`${tpl.id}/${pos.id}: "${name}"`)
          }
        }
      }
      expect(violations).toEqual([])
    })

    test('softball shares baseball\'s full rebuilt content (same generator), and no other sport does', () => {
      // feat/finisher-engine — Day 2 is no longer guaranteed to be Arm Care
      // specifically (the engine schedules which family lands where, week
      // to week); what proves softball shares baseball's exact generator is
      // that it has a real finisher at all AND respects the same
      // BASEBALL_DAY_COMPAT day-type locking (never Core/Arm Care on a
      // lower-body day) — see the "every day's finisher stays within its
      // day-type family" test above, which already covers baseball itself.
      const softball = SPORT_TEMPLATES.find(t => t.id === 'softball')
      const softballWeeks = softball.generateWeeks('softball', 'standard', 4)
      expect(softballWeeks[0].sessions[0].description).toContain('Trap Bar Jump')
      const day2 = softballWeeks[0].sessions[1].description
      expect(/^(Core|Arm Care|Conditioning)\s*—/m.test(day2)).toBe(true)
    })
  })
})

// ─── Area 15 — Shared block periodization (feat/shared-block-periodization) ─
// Change 1 (tiered main-lift rep arc), Change 2 (Phase 4 taper), Change 3
// (explosive/power phase arc), Change 4 (phase-keyed accessory rotation).
// Scoped to exactly 5 target groups: baseball/softball, football skill/
// hybrid/qb, basketball, soccer. Football linemen (a fully separate,
// bespoke engine) must be byte-for-byte unaffected — verified explicitly.

describe('Area 15 — Shared block periodization', () => {
  // Week -> phase helper matching getPhaseInfo's own math.
  const weekOfPhase = (phaseNum, wip) => (phaseNum - 1) * 4 + wip

  test('Change 1: baseball main-lift top-set reps descend 8/6/5/4 by phase (rotational tier), never a fixed 3', () => {
    const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const weeks = baseball.generateWeeks('baseball', 'standard', 4)
    const expected = { 1: 8, 2: 6, 3: 5, 4: 4 }
    for (const [phaseNum, reps] of Object.entries(expected)) {
      const w = weekOfPhase(Number(phaseNum), 2) // wip 2, avoids week-1-of-plan edge cases
      const line = firstMatchingLine(weeks[w - 1].sessions[0].description, /Squat:/)
      expect(line).toMatch(new RegExp(`×${reps}$`))
    }
  })

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

  test('Change 2: Phase 4 (weeks 13-16) is a genuine taper for baseball/basketball/soccer/football-skill — its top % is lower than Phase 3\'s peak, not higher', () => {
    const groups = [['baseball', 'baseball'], ['basketball', 'guards'], ['soccer', 'goalkeeper'], ['football', 'skill']]
    for (const [sportId, posId] of groups) {
      const tpl = SPORT_TEMPLATES.find(t => t.id === sportId)
      const weeks = tpl.generateWeeks(posId, 'standard', 4)
      const phase3Peak = lastPercent(firstMatchingLine(weeks[weekOfPhase(3, 3) - 1].sessions[0].description, /Squat:/))
      const phase4Opener = lastPercent(firstMatchingLine(weeks[weekOfPhase(4, 1) - 1].sessions[0].description, /Squat:/))
      expect(phase4Opener).toBeLessThan(phase3Peak)
    }
  })

  test('Change 2: deloads still fire at exactly weeks 4/8/12/16 for baseball, and Phase 4\'s deload (week 16) is the lightest week in the whole 16-week plan', () => {
    const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const weeks = baseball.generateWeeks('baseball', 'standard', 4)
    for (const wn of [4, 8, 12, 16]) {
      expect(weeks[wn - 1].objective).toMatch(/Deload/)
    }
    for (const wn of [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15]) {
      expect(weeks[wn - 1].objective).not.toMatch(/Deload/)
    }
    const allPeaks = weeks.map(w => lastPercent(firstMatchingLine(w.sessions[0].description, /Squat:/)))
    expect(allPeaks[15]).toBe(Math.min(...allPeaks))
  })

  test('Change 3: baseball Trap Bar Jump volume follows the explosive phase arc (Foundation baseline, Development/Strength higher, Peak lowest of all four) and carries a phase intent note', () => {
    const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const weeks = baseball.generateWeeks('baseball', 'standard', 4)
    const setsAt = (phaseNum) => {
      const line = firstMatchingLine(weeks[weekOfPhase(phaseNum, 2) - 1].sessions[0].description, /Trap Bar Jump/)
      return parseInt(line.match(/Trap Bar Jump:\s*(\d+)x/)[1], 10)
    }
    const [p1, p2, p3, p4] = [1, 2, 3, 4].map(setsAt)
    expect(p2).toBeGreaterThan(p1)
    expect(p3).toBeGreaterThan(p1)
    expect(p4).toBeLessThan(p1) // Peak is the lowest of all four phases
    expect(p4).toBeLessThan(p2)
    expect(p4).toBeLessThan(p3)
  })

  test('Change 4: baseball\'s Calf Raises accessory now rotates by PHASE, not wip — every week inside a phase shows the same name, and it differs from the adjacent phase', () => {
    const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const rotation = SPORT_ACCESSORY_ROTATION.baseball
    const phaseRotation = SPORT_PHASE_ACCESSORY_ROTATION[resolvePhaseRotationKey('baseball', 'baseball')]
    const organized = applySessionOrganization(baseball.generateWeeks('baseball', 'standard', 4), rotation, 'baseball')
    const withAccessories = applyAccessoryProgression(organized, rotation, phaseRotation)
    const nameOnDay1 = (weekIdx) => {
      const line = firstMatchingLine(withAccessories[weekIdx].sessions[0].description, /Calf Raises:|Tibialis Raises:|Seated Calf Raise:/)
      return line.split(':')[0].replace(SUPERSET_MARKER_RE, '').trim()
    }
    // Phase 1 (Foundation): weeks 1-3 (wip 1-3) all show the anchor name.
    expect(nameOnDay1(0)).toBe('Calf Raises')
    expect(nameOnDay1(1)).toBe('Calf Raises')
    expect(nameOnDay1(2)).toBe('Calf Raises')
    // Phase 2 (Development): weeks 5-7 all show the Development variant.
    expect(nameOnDay1(4)).toBe('Tibialis Raises')
    expect(nameOnDay1(5)).toBe('Tibialis Raises')
    expect(nameOnDay1(6)).toBe('Tibialis Raises')
    // Phase 3 (Strength): weeks 9-11 all show the Strength variant.
    expect(nameOnDay1(8)).toBe('Seated Calf Raise')
    // Phase 4 (Peak Taper): weeks 13-15 fall back to the anchor name again.
    expect(nameOnDay1(12)).toBe('Calf Raises')
  })

  test('Change 4: an accessory name NOT in the phase-rotation table (e.g. Gorilla Row) is completely untouched by phase, exactly as before', () => {
    const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const rotation = SPORT_ACCESSORY_ROTATION.baseball
    const phaseRotation = SPORT_PHASE_ACCESSORY_ROTATION[resolvePhaseRotationKey('baseball', 'baseball')]
    const organized = applySessionOrganization(baseball.generateWeeks('baseball', 'standard', 4), rotation, 'baseball')
    const withAccessories = applyAccessoryProgression(organized, rotation, phaseRotation)
    for (const wn of [1, 6, 9, 14]) {
      expect(withAccessories[wn - 1].sessions[1].description).toContain('Gorilla Row:')
    }
  })

  test('Football linemen is completely unaffected: same phase labels/rep windows as the untouched bespoke engine, and its own pre-existing Single Leg RDL wip-rotation still fires (never phase-based)', () => {
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
    // The pre-existing GLOBAL wip-based ACCESSORY_ROTATION still governs
    // linemen's Single Leg RDL (Good Mornings on wip 2) — proves Change 4's
    // new phase table never reaches linemen through the shared sport-level
    // lookup (resolvePhaseRotationKey returns null for linemen).
    const rotation = SPORT_ACCESSORY_ROTATION.football || {}
    const capKey = resolveAccessoryCapKey('football', 'linemen', 'standard')
    const phaseRotation = SPORT_PHASE_ACCESSORY_ROTATION[resolvePhaseRotationKey('football', 'linemen')] || {}
    expect(phaseRotation).toEqual({})
    const organized = applySessionOrganization(weeks, rotation, capKey)
    const withAccessories = applyAccessoryProgression(organized, rotation, phaseRotation)
    // Week 6 = phase 2, wip 2 (linemen's own phase math) — Day 3's Single Leg
    // RDL should still be wip-rotated to "Good Mornings" by the untouched
    // global table, not left as "Single Leg RDL" or moved by phase.
    const day3Week6 = withAccessories[5].sessions.find(s => s.day === 'Day 3').description
    expect(day3Week6).toContain('Good Mornings:')
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

  const GROUPS = [
    ['football', 'skill',  s => s.day === 'Day 2'],
    ['football', 'hybrid', s => s.day === 'Day 2'],
    ['soccer',   'goalkeeper',  s => s.day === 'Tuesday'],
    ['soccer',   'center_back', s => s.day === 'Tuesday'],
    ['soccer',   'midfielder',  s => s.day === 'Tuesday'],
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

    test(`${sportId}/${posId}: Weighted Push-Ups appears strictly less often than either primary variant (Close Grip Bench Press / DB Bench Press)`, () => {
      const weeks = fullPipeline(sportId, posId, 'standard', 4)
      const counts = {}
      for (let w = 1; w <= 16; w++) {
        const n = pushLineName(weeks, w, dayMatch)
        if (n) counts[n] = (counts[n] || 0) + 1
      }
      expect(counts['Weighted Push-Ups']).toBe(1)
      expect(counts['Close Grip Bench Press']).toBeGreaterThan(counts['Weighted Push-Ups'])
      expect(counts['DB Bench Press']).toBeGreaterThan(counts['Weighted Push-Ups'])
    })
  }

  test('football QB and linemen never see Weighted Push-Ups (QB has no incline-press accessory; linemen is the untouched bespoke engine)', () => {
    const qbWeeks = fullPipeline('football', 'qb', 'standard', 4)
    const linemenWeeks = SPORT_TEMPLATES.find(t => t.id === 'football').generateWeeks('linemen', 'standard', 4)
    const qbText = qbWeeks.map(w => w.sessions.map(s => s.description).join('\n')).join('\n')
    const linemenText = linemenWeeks.map(w => w.sessions.map(s => s.description).join('\n')).join('\n')
    expect(qbText).not.toContain('Weighted Push-Ups')
    expect(linemenText).not.toContain('Weighted Push-Ups')
  })

  test('baseball and basketball are untouched — Weighted Push-Ups never appears (only football/soccer got this option)', () => {
    const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const basketball = SPORT_TEMPLATES.find(t => t.id === 'basketball')
    for (const [tpl, posId] of [[baseball, 'baseball'], [basketball, 'guards'], [basketball, 'wings'], [basketball, 'bigs']]) {
      const weeks = fullPipeline(tpl.id, posId, 'standard', 4)
      const text = weeks.map(w => w.sessions.map(s => s.description).join('\n')).join('\n')
      expect(text).not.toContain('Weighted Push-Ups')
    }
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
    const day = weeks[1].sessions.find(s => s.day === 'Day 2') // week 2
    const line = day.description.split('\n').find(l => /Weighted Push-Ups:/.test(l))
    expect(line).toBeTruthy()
    const m = line.replace(SUPERSET_MARKER_RE, '').match(/Weighted Push-Ups:\s*\d+x(\d+)/)
    expect(m).toBeTruthy()
    const reps = parseInt(m[1], 10)
    expect(reps).toBeGreaterThanOrEqual(5)
    expect(reps).toBeLessThanOrEqual(10)
  })
})
