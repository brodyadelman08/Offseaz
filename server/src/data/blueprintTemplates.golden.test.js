'use strict'

// ─── Golden-output regression snapshot suite ───────────────────────────────
// Pure test infrastructure — adds no new assertions about what the "right"
// output should be beyond what's already true today. Every snapshot below
// captures whatever generateBlueprintForAthlete()/SPORT_TEMPLATES[i]
// .generateWeeks() actually produce RIGHT NOW, verbatim, via Jest's built-in
// toMatchSnapshot(). Nothing here was hand-authored or "cleaned up" — the
// first run writes the current real output as the baseline (see the
// __snapshots__/blueprintTemplates.golden.test.js.snap file this generates);
// every run after that fails loudly the moment generated output drifts from
// that baseline, whether the drift was intentional or not.
//
// Built against master AFTER both feat/blueprint-quick-wins (#17) and
// feat/injury-system-upgrade (#16) merged — so this reflects the real,
// current 9-area/flat-50%-load injury system and the real, current Change
// 1-4 coverage, not an intermediate branch state either PR was authored on.
//
// Four layers of coverage:
//   1. The full 32-target × {standard, muscle_gain} matrix (§B of the
//      Blueprint Architecture Audit) — every sport/position SPORT_TEMPLATES
//      defines, plus the "Other"/General fallback, at 8 representative weeks
//      each (one normal week, all 4 deloads, all 3 phase-boundary weeks) so
//      the full periodization arc is captured, not just week 1.
//   2. Explicit routing-regression assertions for the 3 real bugs fixed by
//      #17 — Football K/P, Track "Throws"/"Jumps", and all 6 soccer
//      positions — so a future regex change that reintroduces any of them
//      fails with a named, specific assertion, not just an unexplained
//      snapshot diff.
//   3. Explicit phase-rep-arc assertions for the 10 sport groups that got
//      Change 1/3/4 coverage in #17, so reverting that coverage for any one
//      of them fails immediately and by name.
//   4. An injury-substitution golden set covering all 9 areas #16 added —
//      Rugby/Prop (realistic, correctly-routing free-text input verified to
//      exercise all 9 substitution triggers in one blueprint) × every area
//      + None.

const {
  generateBlueprintForAthlete,
  SPORT_TEMPLATES,
  applySessionOrganization,
  applyAccessoryProgression,
  applyDeloadAdjustments,
  SPORT_ACCESSORY_ROTATION,
  SPORT_PHASE_ACCESSORY_ROTATION,
  resolveAccessoryCapKey,
  resolvePhaseRotationKey,
  SUPERSET_MARKER_RE,
} = require('./blueprintTemplates')

// ─── Shared helpers ─────────────────────────────────────────────────────────

// The exact literal sport strings Survey.jsx's SPORTS array sends as
// survey.sport — duplicated locally per this file's own established
// convention (see blueprintTemplates.test.js's identical constant) rather
// than exported from the production module, so a real survey submission is
// what's actually being exercised, not an internal id.
const SPORT_LABELS = {
  baseball: 'Baseball', softball: 'Softball', football: 'Football', basketball: 'Basketball',
  soccer: 'Soccer', hockey: 'Hockey', rugby: 'Rugby', tennis: 'Tennis', golf: 'Golf',
  wrestling: 'Wrestling', volleyball: 'Volleyball', track: 'Track and Field',
  cross_country: 'Cross Country', lacrosse: 'Lacrosse', swimming: 'Swimming',
}

function mkSurvey(overrides = {}) {
  return {
    sport: 'Football', position: 'Linemen', primary_goal: 'standard',
    time_per_week: '4', experience_level: 'Intermediate', injury_areas: [],
    ...overrides,
  }
}

// Representative weeks: week 1 (a normal, non-deload week — Phase 1's
// opener), all 4 deload weeks (4/8/12/16), and the 3 phase-boundary weeks
// that open Phases 2/3/4 (5/9/13) — the full 16-week wave-loading + deload
// cadence is identical across every sport (getPhaseInfo/buildWeeks), so this
// one set of 8 week numbers captures the entire periodization arc for any
// sport without snapshotting all 16 weeks' text for every one of 64 targets.
const REPRESENTATIVE_WEEKS = [1, 4, 5, 8, 9, 12, 13, 16]

// Strips a week down to just what a content regression could plausibly
// touch — day label, focus, and the exercise text itself. Deliberately a
// plain object (not the raw week), so a snapshot diff reads as "this line of
// this day changed" rather than a wall of JSON punctuation.
function snapshotWeeks(weeks, weekNumbers = REPRESENTATIVE_WEEKS) {
  return weeks
    .filter(w => weekNumbers.includes(w.week_number))
    .map(w => ({
      week: w.week_number,
      objective: w.objective,
      sessions: w.sessions.map(s => ({
        day: s.day,
        focus: s.focus,
        description: s.description,
        ...(s.injury_modified ? { injury_modified: true } : {}),
      })),
    }))
}

// Manual-builder path — mirrors blueprintController.js's generateFromTemplate
// exactly (same helper already validated identical to auto-assign for a
// representative case in Area 8 of blueprintTemplates.test.js). Used for the
// main 32-target matrix specifically BECAUSE it takes a position by its
// internal, already-normalized id (pos.id) rather than free text run through
// normalizeSport/normalizePosition's regex layer — so the golden matrix
// captures each target's true, intended content deterministically, and stays
// independent of the free-text routing layer that sections 2-3 below test
// directly and separately.
function generateManualBuilder(tpl, posId, goal, days) {
  const rotation = SPORT_ACCESSORY_ROTATION[tpl.id] || {}
  const capKey = resolveAccessoryCapKey(tpl.id, posId, goal)
  const phaseRotation = SPORT_PHASE_ACCESSORY_ROTATION[resolvePhaseRotationKey(tpl.id, posId)] || {}
  const organized = applySessionOrganization(tpl.generateWeeks(posId, goal, days), rotation, capKey)
  // feat/baseball-rebuild — tpl.id must reach both passes, mirroring
  // blueprintController.js's own real call, so Baseball/Softball's golden
  // snapshots capture the true, doc-locked content instead of the generic
  // wave/deload-reduction these two sports are deliberately exempt from.
  return applyDeloadAdjustments(applyAccessoryProgression(organized, rotation, phaseRotation, tpl.id), tpl.id)
}

// Last %×reps figure on a ramped line, e.g. "...80%×5, 89%×4" -> 4. Used by
// the phase-rep-arc assertions below instead of a full snapshot compare, so
// a regression there fails with a specific, named number mismatch.
function lastRampReps(text) {
  const matches = [...text.matchAll(/(\d+)%×(\d+)/g)]
  if (matches.length === 0) return null
  return parseInt(matches[matches.length - 1][2], 10)
}

// Strips a leading ⟦SS<n>⟧ superset marker before matching — a line that
// got auto-paired (e.g. "⟦SS1⟧Back Squat: ...") would otherwise silently
// never match a `/^Back Squat\b/`-style anchored regex.
function firstMatchingLine(description, re) {
  return description.split('\n').find(l => re.test(l.replace(SUPERSET_MARKER_RE, '')))
}

// ─── 1. The 32-target × {standard, muscle_gain} golden matrix ─────────────

describe('Golden snapshots — every SPORT_TEMPLATES sport/position, both goals', () => {
  for (const tpl of SPORT_TEMPLATES) {
    for (const pos of tpl.positions) {
      for (const goal of ['standard', 'muscle_gain']) {
        test(`${tpl.id}/${pos.id} — ${goal}`, () => {
          const days = tpl.daysOptions[0].days
          const weeks = generateManualBuilder(tpl, pos.id, goal, days)
          expect(snapshotWeeks(weeks)).toMatchSnapshot()
        })
      }
    }
  }
})

describe('Golden snapshot — General/"Other" fallback (the 32nd target, not in SPORT_TEMPLATES)', () => {
  for (const goal of ['standard', 'muscle_gain']) {
    test(`general fallback — ${goal}`, () => {
      const bp = generateBlueprintForAthlete(mkSurvey({
        sport: 'Ultimate Frisbee', position: 'Handler', primary_goal: goal, time_per_week: '4',
      }))
      expect(bp.title.startsWith('General Athletic Performance')).toBe(true)
      expect(snapshotWeeks(bp.weeks)).toMatchSnapshot()
    })
  }
})

// ─── 2. Routing-regression coverage — the 3 bugs fixed on this branch ─────

describe('Routing regression — position-fallback bugs fixed on feat/blueprint-quick-wins', () => {
  test('Football K/P routes to Skill, never Linemen', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Football', position: 'K/P' }))
    expect(bp.title).toContain('Skill')
    expect(bp.title).not.toContain('Linemen')
    expect(snapshotWeeks(bp.weeks, [1])).toMatchSnapshot()
  })

  test('an unrecognized football position still falls back to Linemen (the fallback itself is unchanged — only K/P was redirected)', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Football', position: 'Zzyzx' }))
    expect(bp.title).toContain('Linemen')
  })

  test('Track "Throws" and "Jumps" (the real plural labels Survey.jsx/SPORT_TEMPLATES send) route to Throwers/Jumpers, never Sprinters', () => {
    const sprint = generateBlueprintForAthlete(mkSurvey({ sport: 'Track and Field', position: 'Sprints' }))
    const throwBp = generateBlueprintForAthlete(mkSurvey({ sport: 'Track and Field', position: 'Throws' }))
    const jumpBp = generateBlueprintForAthlete(mkSurvey({ sport: 'Track and Field', position: 'Jumps' }))

    expect(throwBp.title).toContain('Throwers')
    expect(jumpBp.title).toContain('Jumpers')
    expect(throwBp.title).not.toBe(sprint.title)
    expect(jumpBp.title).not.toBe(sprint.title)
    expect(throwBp.title).not.toBe(jumpBp.title)

    // Content-level guard, not just the title. feat/day-layout-engine
    // moved Throwers onto the Rotational archetype (no MAIN_OLY tag —
    // its old "Power Clean from floor" is gone) and Jumpers onto the
    // Vertical/Court group's own Speed/Power-templated structure, so the
    // markers below are each pack's own current, still-distinctive
    // content rather than the old bespoke functions' text.
    expect(throwBp.weeks[0].sessions[0].focus).toBe('Lower Power — Squat')
    expect(sprint.weeks[0].sessions[0].focus).not.toBe('Lower Power — Squat')
    expect(throwBp.weeks[0].sessions[0].description).toContain('Hip Thrust')
    expect(sprint.weeks[0].sessions[0].description).not.toContain('Hip Thrust')
    // Jumpers' own "Terminal Knee Extension" (vs. Sprinters' "Bulgarian
    // Split Squat") on the same day-index-0 accessory pair.
    expect(jumpBp.weeks[0].sessions[0].description).toContain('Terminal Knee Extension')
    expect(sprint.weeks[0].sessions[0].description).not.toContain('Terminal Knee Extension')

    expect(snapshotWeeks(sprint.weeks, [1])).toMatchSnapshot('sprinters week 1')
    expect(snapshotWeeks(throwBp.weeks, [1])).toMatchSnapshot('throwers week 1')
    expect(snapshotWeeks(jumpBp.weeks, [1])).toMatchSnapshot('jumpers week 1')
  })

  test('an unrecognized track position still falls back to Sprint (Distance/Multi-event are a separately-tracked, out-of-scope gap — see the audit)', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Track and Field', position: 'Distance' }))
    expect(bp.title).toContain('Sprinters')
  })

  test('all 6 soccer positions (Goalkeeper, Center Back, Fullback, Midfielder, Winger, Striker) generate distinct templates', () => {
    const positions = ['Goalkeeper', 'Center Back', 'Fullback', 'Midfielder', 'Winger', 'Striker']
    const blueprints = positions.map(position =>
      generateBlueprintForAthlete(mkSurvey({ sport: 'Soccer', position }))
    )

    const titles = blueprints.map(bp => bp.title)
    expect(new Set(titles).size).toBe(6) // every title distinct

    const day1Texts = blueprints.map(bp => bp.weeks[0].sessions[0].description)
    expect(new Set(day1Texts).size).toBe(6) // every Day 1 body distinct too — not just the title

    positions.forEach((position, i) => {
      expect(snapshotWeeks(blueprints[i].weeks, [1])).toMatchSnapshot(`soccer/${position} week 1`)
    })
  })
})

// ─── 3. Phase-rep-arc regression — the 10 newly-upgraded sport groups ─────
// Change 1 (tiered main-lift rep arc) descends every phase for every sport
// that has it — asserting week 9 (Phase 3)'s top-set rep count is strictly
// lower than week 1 (Phase 1)'s is a direct, named check that Change 1 is
// still wired up, without hardcoding which tier (power vs rotational) each
// position uses. Cross Country and Swimming have no %-ramped main lift to
// carry Change 1 at all (by design — see their own session-builder
// comments), so they're covered by the explosive-arc check only. Rugby
// (feat/rugby-rebuild) joined that same category — its own ANCHOR main
// lifts are RPE-anchored, never %-ramped, per the spec doc's own explicit
// "does NOT hardcode percentages" instruction (RUGBY_MAIN_LIFT_SCHEME) —
// its own real, equivalent rep-descent behavior (3x8-10 -> 4x4-6 -> 5x2-4
// -> 2x3-5, verified as genuinely non-increasing TOTAL volume, not just
// raw rep count) is exhaustively covered instead by blueprintQuality.js's
// Check 2 (checkRepDescentAcrossPhases), across every position/day-count/
// goal combination, not just one fixture each.

describe('Phase-rep-arc regression — Change 1/3 coverage added on feat/blueprint-quick-wins', () => {
  const REP_ARC_CASES = [
    // feat/day-layout-engine — Hockey Forwards' own squat/hinge
    // conformance fix (the shared Collision template wants a genuine
    // second squat on "Lower Strength", not a hinge) moved Trap Bar
    // Deadlift off Day 1 entirely (now Back Squat, 3-day-only MAIN_HINGE,
    // and the 6-day "Lower — Posterior Chain & Athletic" bonus day) —
    // same pattern as every other Collision sport already listed here.
    ['Hockey', 'Forward', /^Back Squat\b/],
    ['Hockey', 'Defense', /^Back Squat\b/],
    ['Hockey', 'Goalie', /^Back Squat\b/],
    // Rugby/Prop and Rugby/Fly Half removed — see this describe block's own
    // updated header comment (feat/rugby-rebuild).
    ['Track and Field', 'Sprints', /^Back Squat\b/],
    ['Track and Field', 'Throws', /^Back Squat\b/],
    ['Track and Field', 'Jumps', /^Back Squat\b/],
    ['Wrestling', '175', /^Back Squat\b/],
    ['Volleyball', 'Outside Hitter', /^Back Squat\b/],
    ['Lacrosse', 'Attack', /^Back Squat\b/],
    ['Tennis', 'All Players', /^Back Squat\b/],
    ['Golf', 'All Players', /^Back Squat\b/],
  ]

  for (const [sport, position, lineRe] of REP_ARC_CASES) {
    test(`${sport}/${position}: top-set reps step down from Phase 1 (week 1) to Phase 3 (week 9)`, () => {
      const bp = generateBlueprintForAthlete(mkSurvey({ sport, position }))
      const week1Line = firstMatchingLine(bp.weeks[0].sessions[0].description, lineRe)
      const week9Line = firstMatchingLine(bp.weeks[8].sessions[0].description, lineRe)
      expect(week1Line).toBeTruthy()
      expect(week9Line).toBeTruthy()
      const week1Reps = lastRampReps(week1Line)
      const week9Reps = lastRampReps(week9Line)
      expect(week1Reps).not.toBeNull()
      expect(week9Reps).toBeLessThan(week1Reps)
    })
  }

  test('Cross Country: Day 3\'s explosive lines (Ankle Hops, Single Leg Hop & Stick) vary in set count between Phase 1 and Phase 3', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Cross Country', position: 'All', time_per_week: '3' }))
    const week1Day3 = bp.weeks[0].sessions[2].description
    const week9Day3 = bp.weeks[8].sessions[2].description
    expect(week1Day3).toContain('Ankle Hops')
    expect(week1Day3).not.toBe(week9Day3)
  })

  // feat/day-layout-engine — Swimming's old dedicated "Day 4" (Medicine
  // Ball Overhead Throw/Box Jump/Lateral Bound, a daysPerWeek>=4 extra) is
  // retired; a jump line survives as "Full Body — Hinge & Press"'s own
  // PLYO slot (now session index 2, not 3 — that day's own real content,
  // Trap Bar Deadlift + Shoulder Press, consolidated onto it instead of a
  // separate bolt-on day) — Broad Jump, not Box Jump, since Box Jump is
  // SWIMMING_FINISHERS' own 'sprint' family anchor and would otherwise
  // risk landing on the same day as its own finisher content twice.
  // Medicine Ball Overhead Throw/Lateral Bound have no slot and are dropped.
  test('Swimming: "Full Body — Hinge & Press"\'s Broad Jump varies between Phase 1 and Phase 3', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Swimming', position: 'All', time_per_week: '4' }))
    const week1 = bp.weeks[0].sessions[2].description
    const week9 = bp.weeks[8].sessions[2].description
    expect(week1).toContain('Broad Jump')
    expect(week1).not.toBe(week9)
  })

  test('Softball needs no dedicated coverage — it already inherits the full hand-authored Baseball ramp arc via its existing reuse of the baseball generator', () => {
    const bp = generateBlueprintForAthlete(mkSurvey({ sport: 'Softball', position: 'Pitcher' }))
    // feat/baseball-rebuild — baseball (and softball, which routes straight
    // through the same generator) is now hand-authored to the Offseaz
    // Baseball Program Spec: Day 1's Front Squat carries the doc-locked %
    // ramp in ASCII "NN%xN" form (not the old engine's unicode "×"), with
    // decimal percentages (e.g. "77.5%x5") the old `lastRampReps` helper
    // can't parse. Top-set reps step down from week 1 (Phase 1 opener,
    // 75%x5 AMRAP) to week 9 (Phase 3 opener, 75%x3, no AMRAP) per the spec.
    const week1 = firstMatchingLine(bp.weeks[0].sessions[0].description, /^Front Squat\b/)
    const week9 = firstMatchingLine(bp.weeks[8].sessions[0].description, /^Front Squat\b/)
    expect(week1).toBeTruthy()
    expect(week9).toBeTruthy()
    const lastAsciiRampReps = (text) => {
      const matches = [...text.matchAll(/(\d+(?:\.\d+)?)%x(\d+)/g)]
      if (matches.length === 0) return null
      return parseInt(matches[matches.length - 1][2], 10)
    }
    expect(lastAsciiRampReps(week9)).toBeLessThan(lastAsciiRampReps(week1))
  })
})

// ─── 4. Injury-substitution golden set ─────────────────────────────────────
// Rugby/Prop (survey-realistic free text — a real Survey.jsx Rugby position
// option — verified to correctly route to Forwards). feat/rugby-rebuild
// replaced Rugby's content with the spec doc's own hand-authored vocabulary
// (Back Squat, Front Squat, Bench Press, Trap Bar Deadlift, Bulgarian Split
// Squat, Romanian Deadlift, Farmer Carry) — 8 of the 9 substitution triggers
// still fire for real on week 1 (Shoulder/Knee/Back/Hip/Quadriceps/
// Hamstring/Elbow/Wrist); Ankle genuinely has nothing to match (no jumps,
// calf work, or sprint/COD drills in Forwards' own content — that's Backs'
// territory), see the "actually changes the text" test's own comment. A
// future change that renames one of the 8 real triggers without updating
// the matching applyXAdjustments regex will show up here as a snapshot diff
// where the substitution silently stops firing.

describe('Injury-substitution golden set — Rugby/Prop × every one of the 9 injury areas', () => {
  const AREAS = [
    'None', 'Shoulder', 'Knee', 'Back', 'Hip',
    'Quadriceps', 'Hamstring', 'Ankle', 'Elbow', 'Wrist',
  ]

  for (const area of AREAS) {
    test(`injury_areas=[${area}] — week 1, all days`, () => {
      const bp = generateBlueprintForAthlete(mkSurvey({
        sport: 'Rugby', position: 'Prop', injury_areas: area === 'None' ? [] : [area],
      }))
      const week1 = bp.weeks[0]
      expect(snapshotWeeks([week1], [1])).toMatchSnapshot()
    })
  }

  test('baseline (no injury) vs each area actually changes the text — a substitution that silently stops firing is a real regression, not just a snapshot diff', () => {
    // feat/rugby-rebuild — Rugby Forwards' content is now hand-authored to
    // the spec doc exactly, replacing the old vocabulary this describe
    // block's own header comment lists (Single Leg RDL, Box Jumps, Suitcase
    // Carry, Chin-ups, ...). The doc's real Forwards content has no
    // ankle-relevant exercise at all — no jumps, no calf work, no sprint/
    // COD drills (that's Backs' own territory: sprint/agility finishers
    // replace Forwards' neck work entirely, per the doc's own explicit
    // Forwards/Backs split) — so applyAnkleAdjustments (Depth Jumps, Single
    // Leg RDL, Calf Raises, sprint/COD volume) has nothing to match on
    // week 1, genuinely, not as a bug. Ankle is still snapshotted above
    // (an unchanged-from-baseline snapshot for Forwards is itself accurate,
    // real output) — just excluded from this specific "every area changes
    // something" assertion.
    const baseline = generateBlueprintForAthlete(mkSurvey({ sport: 'Rugby', position: 'Prop' })).weeks[0]
    for (const area of AREAS.filter(a => a !== 'None' && a !== 'Ankle')) {
      const withInjury = generateBlueprintForAthlete(mkSurvey({
        sport: 'Rugby', position: 'Prop', injury_areas: [area],
      })).weeks[0]
      const baselineText = baseline.sessions.map(s => s.description).join('\n')
      const injuryText = withInjury.sessions.map(s => s.description).join('\n')
      expect(injuryText).not.toBe(baselineText)
    }
  })

  test('"Other" and unrecognized area strings are deliberately no-ops (no automatic substitution — see surveyController.js\'s coach-notification path instead)', () => {
    const baseline = generateBlueprintForAthlete(mkSurvey({ sport: 'Rugby', position: 'Prop' })).weeks[0]
    const withOther = generateBlueprintForAthlete(mkSurvey({
      sport: 'Rugby', position: 'Prop', injury_areas: ['Other'],
    })).weeks[0]
    expect(withOther.sessions.map(s => s.description).join('\n'))
      .toBe(baseline.sessions.map(s => s.description).join('\n'))
  })
})
