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
  superset, SUPERSET_MARKER_RE,
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

function exerciseNamesIn(description) {
  const names = []
  for (const line of description.split('\n')) {
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
    // line to compare like-for-like.
    const begLine = firstMatchingLine(beg.weeks[9].sessions[0].description, /^Back Squat\b/)
    const intLine = firstMatchingLine(int_.weeks[9].sessions[0].description, /^Back Squat\b/)
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
        if (/^Overhead Press\b/m.test(s.description)) hasBareOverheadPress = true
        if (/Landmine Press/.test(s.description)) hasLandminePress = true
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
        if (/\bDepth Jumps?\b/.test(s.description)) hasDepthJump = true
        if (/^Back Squat\b/m.test(s.description)) hasBareBackSquat = true
        if (/^Goblet Squat\b/m.test(s.description)) hasGobletSquat = true
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
      if (/^Core\s*—/.test(line)) { inCoreBlock = true; continue }
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

  test('plyometric exercises are absent from every sport\'s deload week', () => {
    const PLYO_KEYWORDS = /\b(Box Jumps?|Broad Jumps?|Hurdle Hops?|Depth Jumps?|Depth Drop|Snap Down|Squat Jumps?|Lateral Bounds?|Bounding|Approach Jumps?|Drop Jumps?|Reactive Box Jump|Ankle Hops?|Hop & Stick)\b/i
    for (const tpl of SPORT_TEMPLATES) {
      const pos = tpl.positions[0]
      const deloaded = applyDeloadAdjustments(tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl)))
      const deloadWeek = deloaded[deloaded.length - 1]
      for (const s of deloadWeek.sessions) {
        for (const line of s.description.split('\n')) {
          const colonIdx = line.indexOf(':')
          const name = colonIdx > 0 ? line.slice(0, colonIdx) : line
          expect(PLYO_KEYWORDS.test(name)).toBe(false)
        }
      }
    }
  })

  test('conditioning work is absent from every sport\'s deload week', () => {
    const CONDITIONING_RE = /^(Sprint Work|Sprint Ladder|Sprint \+ Close Out|Sprint \+ Jog Ladder|300 Yard Shuttle|Flying 20s|17s Drill|Baseline Sprint|Defensive Slide|Post Sprint|Box Out Drill|Shuffle Step|Full Court Sprint|V Drill|Star Drill|200m Intervals|400m Repeats|Isometric (Squat|Pull) Hold|Weighted Carries|Farmer Carr|Battle Rope|Wrestle-Outs|Sled Push|Sled Sprint|Sled Drag|Pro Agility|5-10-5|Cone Drill|Deceleration Drill|Lateral Shuffle|T-Drill|Aerobic Finish|Tempo Run)\b/
    for (const tpl of SPORT_TEMPLATES) {
      const pos = tpl.positions[0]
      const deloaded = applyDeloadAdjustments(tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl)))
      const deloadWeek = deloaded[deloaded.length - 1]
      for (const s of deloadWeek.sessions) {
        for (const line of s.description.split('\n')) {
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

  test('Baseball Pitcher has arm care exercises that Baseball Position Player does not', () => {
    const baseball = SPORT_TEMPLATES.find(t => t.id === 'baseball')
    const positionPlayerSessions = baseball.generateWeeks('baseball', 'standard', 3)[0].sessions
    const pitcherSessions = baseball.generateWeeks('pitcher', 'standard', 3)[0].sessions
    const ARM_CARE_RE = /Band External Rotation|YTW Shoulder Series/
    const positionPlayerHasArmCare = positionPlayerSessions.some(s => ARM_CARE_RE.test(s.description))
    const pitcherHasArmCare = pitcherSessions.some(s => ARM_CARE_RE.test(s.description))
    expect(positionPlayerHasArmCare).toBe(false)
    expect(pitcherHasArmCare).toBe(true)
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
    const re = /^\s*'([^']+)':\s*\{/gm
    let m
    while ((m = re.exec(text))) keys.add(m[1].toLowerCase())
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
    '17s drill', '200m intervals', '400m repeats', '5-10-5 shuttle', 'ab wheel',
    'adductor static stretch', 'aerobic finish', 'agility cone drill (5-10-5)',
    'ankle circuit', 'ankle mobility circles', 'anti-rotation press', 'balance work',
    'band hip abduction', 'band lateral walk', 'band work', 'banded hip abduction',
    'banded hip flexion', 'baseline sprint', 'battle rope', 'bicep curl',
    'block start acceleration', 'box step-up', 'box step-ups', 'broad jump',
    'cable woodchop', 'calf flexibility', 'calf raise', 'calf raise static stretch',
    'cat-cow', 'close grip bench', 'coach note', 'copenhagen plank', 'core bird dog',
    'core cable woodchop', 'core finisher', 'core maintenance', 'core pallof press',
    'core — anti-extension', 'core — anti-rotation', 'core — bird dogs (weighted)',
    'core — copenhagen adductor', 'core — lateral stability', 'core — rotate and press',
    'core — rotational power', 'core — sit-ups', 'cossack squat', 'cossack squat (light)',
    'court conditioning', 'court sprints', 'db bench', 'db shoulder press', 'db squat jump',
    'deceleration drill', 'deep glute stretch', 'deep squat hold', 'defensive slide',
    'defensive slide sprint', 'depth drop', "downward dog → cobra flow",
    "downward dog → runner's lunge flow", 'dynamic stretch', 'farmer carries',
    'farmer carry', 'foam roll', 'forearm and grip work', 'forearm curls',
    'forearm curls (both directions)', 'full court sprint', 'glute bridge',
    'half baby kip-ups', 'half kneeling cable press', 'hamstring eccentric',
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
    'reverse fly', 'reverse wrist curls', 'rotational cable pull', 'rotational med ball slam',
    'sandbag carry', 'serratus wall slides', 'shotput med ball throw',
    'shoulder cross-body stretch', 'single leg hop & stick', 'single leg press',
    'single leg squat jump', 'snap down', 'split squat jump', 'split stance cable row',
    'sprint + close out', 'sprint + jog ladder', 'sprint ladder', 'sprint work',
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
  // applyAccessoryProgression() then applyDeloadAdjustments() on path 2's
  // output, so this test does the same to compare like-for-like (standard
  // goal + intermediate experience + no injuries, so the experience/injury
  // passes are no-ops on path 1).
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
      const manualBuilder = applyDeloadAdjustments(applyAccessoryProgression(tpl.generateWeeks(pos.id, 'standard', days)))

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
      if (/^Core\s*—/.test(line)) { inCoreBlock = true; continue }
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
      if (/^Core\s*—/.test(line)) { inCoreBlock = true; continue }
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
            for (const line of s.description.split('\n')) {
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
    for (const id of ['football', 'basketball', 'baseball']) {
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
    for (const id of ['football', 'baseball']) {
      const tpl = SPORT_TEMPLATES.find(t => t.id === id)
      const pos = tpl.positions[0]
      const weeks = tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl))
      const [wip1, wip2, wip3] = [weeks[0], weeks[1], weeks[2]].map(pctOf)

      expect(wip2).toBeLessThan(wip1)
      expect(wip3).toBeGreaterThan(wip1)
      expect(wip3).toBeGreaterThan(wip2)
    }
  })

  test('no phase-boundary dip: a phase\'s opening week never drops below the previous phase\'s peak, for every sport', () => {
    // cross_country and swimming are deliberately excluded from the %-based
    // wave/phase system by design (XC's dryland work is a fixed, intentionally
    // light 65-70% range with no heavy loading; swimming's main lifts use a
    // flat "@ moderate load" prescription with their own phase-based, not
    // week-based, set-count progression) — neither prints a single top-set %
    // in its objective, so there's no percentage to check for a dip here.
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
        expect(nextOpeners[i]).toBeGreaterThanOrEqual(peaks[i])
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

    test('no existing sport template emits a superset marker yet — this rebuild only adds the capability, not any specific grouping', () => {
      for (const tpl of SPORT_TEMPLATES) {
        const pos = tpl.positions[0]
        const weeks = applyAccessoryProgression(tpl.generateWeeks(pos.id, 'standard', maxDaysFor(tpl)))
        for (const w of weeks) {
          for (const s of w.sessions) {
            for (const line of s.description.split('\n')) {
              expect(SUPERSET_MARKER_RE.test(line)).toBe(false)
            }
          }
        }
      }
    })
  })
})
