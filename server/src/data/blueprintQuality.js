'use strict'

// ─── Blueprint Quality Analysis Engine ──────────────────────────────────
// Read-only. Never mutates blueprintTemplates.js/varietyEngine.js/
// dayLayoutEngine.js or their output — it only generates blueprints with
// the existing, unmodified generator and inspects the result.
//
// This is deliberately NOT the golden snapshot suite. Golden proves "this
// week's exact text didn't change since last time I looked" — it has no
// opinion on whether that text was ever correct. This module proves "this
// output obeys the actual design rules" by re-deriving the ground truth
// from the same structural source the generator itself uses
// (dayLayoutEngine's tag/anchor templates) wherever possible, and falling
// back to conservative, clearly-documented text heuristics only where a
// TAG-level ground truth genuinely isn't recoverable from outside the
// generator (see each check's own comment for exactly which case that is).
//
// Consumed by blueprintQuality.test.js (asserts each check found zero
// violations) and by a one-off summary script (prints the pass/fail table).
// Every check function returns an ARRAY of violation objects — empty means
// pass. Violation objects always carry enough context (sport/position/
// days/goal/week/detail) to act on without re-running anything.

const {
  generateBlueprintForAthlete, SPORT_TEMPLATES, applyDeloadAdjustments,
  SPORT_MAX_ACCESSORIES, resolveAccessoryCapKey,
} = require('./blueprintTemplates')
const dayLayoutEngine = require('./dayLayoutEngine')

const SUPERSET_MARKER_RE = /^⟦SS\d+⟧/
function stripMarker(line) { return line.replace(SUPERSET_MARKER_RE, '') }

// ─── Sport -> archetype mapping ─────────────────────────────────────────
// Verified against each generateXWeeks wrapper's own generate<Archetype>
// WeeksFromPack call in blueprintTemplates.js (grepped, not guessed) —
// see the PR that introduced this file for the exact call sites checked.
function archetypeFor(sportId, posId) {
  switch (sportId) {
    case 'football':
      if (posId === 'linemen') return 'collision'
      if (posId === 'qb') return 'rotational'
      return 'speedpower' // skill, hybrid
    case 'baseball': case 'softball': return 'rotational'
    case 'wrestling': return 'collision'
    case 'rugby': return posId === 'forwards' ? 'collision' : 'field' // backs
    case 'hockey': return posId === 'forwards' ? 'collision' : 'field' // defense, goalie
    case 'soccer': return 'field'
    case 'lacrosse': return 'field'
    case 'tennis': case 'golf': return 'rotational'
    case 'basketball': case 'volleyball': return 'speedpower'
    case 'track':
      if (posId === 'throw') return 'rotational'
      return 'speedpower' // sprint, jump
    case 'cross_country': case 'swimming': return 'endurance'
    default: return null
  }
}

const MAIN_TAGS = new Set(['MAIN_SQUAT', 'MAIN_HINGE', 'MAIN_PRESS_H', 'MAIN_PRESS_V', 'MAIN_OLY'])
const POOLED_TAGS = new Set([
  'ACC_SQUAT', 'ACC_HINGE', 'ACC_UNILATERAL_LOWER', 'ACC_POSTERIOR',
  'ACC_PULL_H', 'ACC_PULL_V', 'ACC_PRESS', 'ACC_SHOULDER', 'ACC_CALF_GRIP',
])
const NULLABLE_TAGS = new Set(['ACC_CORE']) // always renders null, every archetype, by design

// ─── Text-level parsing helpers ─────────────────────────────────────────

// Every "Name: SxR..." line in a description, in slot-render order, tagged
// with whether it's inside a finisher family block (Core/Conditioning/Arm
// Care/Neck) and whether it's a ramped main-lift line (contains "%" or
// endurance's "@ moderate load" marker). Block headers themselves and the
// "Deload Week." banner are recognized but excluded from the returned line
// list (available separately via the `headers`/`hasDeloadBanner` result).
function parseDescription(description) {
  const lines = []
  const headers = []
  let hasDeloadBanner = false
  let inBlock = false
  let blockKind = null
  for (const raw of description.split('\n')) {
    const line = stripMarker(raw)
    if (line.trim() === '') { inBlock = false; blockKind = null; continue }
    if (/^Deload Week\./.test(line)) { hasDeloadBanner = true; continue }
    const headerMatch = line.match(/^(Core|Conditioning|Arm Care|Neck)\s*—/)
    if (headerMatch) { inBlock = true; blockKind = headerMatch[1]; headers.push({ raw, kind: blockKind }); continue }
    const colonIdx = line.indexOf(':')
    if (colonIdx <= 0) continue
    const name = line.slice(0, colonIdx).trim()
    const isRamped = /%[×x]/.test(line) || /@ moderate load/.test(line) || /@\s*\d+%/.test(line)
    lines.push({ raw, name, isRamped, inBlock, blockKind })
  }
  return { lines, headers, hasDeloadBanner }
}

// The full matrix this suite sweeps: every SPORT_TEMPLATES sport/position,
// every day-count that sport actually offers, both goals. Mirrors the
// golden suite's own target set (the 32-target matrix) rather than
// inventing a different one.
function* matrix({ goals = ['standard', 'muscle_gain'] } = {}) {
  for (const tpl of SPORT_TEMPLATES) {
    for (const pos of tpl.positions) {
      for (const opt of tpl.daysOptions) {
        for (const goal of goals) {
          yield { sportId: tpl.id, sportLabel: tpl.label, posId: pos.id, posLabel: pos.label, days: opt.days, goal, tpl }
        }
      }
    }
  }
}

function generate(entry) {
  return entry.tpl.generateWeeks(entry.posId, entry.goal, entry.days)
}

function ctxLabel(entry, extra = '') {
  return `${entry.sportId}/${entry.posId} ${entry.days}d ${entry.goal}${extra}`
}

// ═══════════════════════════════════════════════════════════════════════
// Check 1 — Movement pattern coverage
// ═══════════════════════════════════════════════════════════════════════
// Ground truth: dayLayoutEngine.getTemplate(archetype, days) IS the
// authoritative definition of which patterns an archetype/day-count
// provides — it's the same template the generator itself renders from.
// This check therefore runs once per (archetype, day-count) — 5
// archetypes x 4 day-counts = 20 cases, not per-sport — since every sport
// sharing an archetype+day-count shares the identical pattern manifest by
// construction. Combined with Check 5 (nothing dropped), this transitively
// proves every individual sport/position delivers full pattern coverage
// without needing per-sport name-matching (which would require guessing
// an exhaustive movement-name vocabulary and risks false negatives).
//
// "Both squat patterns" = MAIN_SQUAT (the main lift) AND a genuine second
// squat-family movement (ACC_SQUAT or the unilateral ACC_UNILATERAL_LOWER)
// both present somewhere in the week.
function checkMovementPatternCoverage() {
  const violations = []
  for (const arch of ['collision', 'rotational', 'field', 'speedpower', 'endurance']) {
    for (const days of [3, 4, 5, 6]) {
      const tpl = dayLayoutEngine.getTemplate(arch, days)
      const tags = new Set()
      for (const day of tpl) for (const s of day.slots) tags.add(s.tag)
      const has = t => tags.has(t)
      const required = {
        'squat pattern': has('MAIN_SQUAT') || has('ACC_SQUAT') || has('ACC_UNILATERAL_LOWER'),
        'second squat pattern (both squat patterns)': has('MAIN_SQUAT') && (has('ACC_SQUAT') || has('ACC_UNILATERAL_LOWER')),
        'hinge pattern': has('MAIN_HINGE') || has('ACC_HINGE') || has('ACC_POSTERIOR'),
        'horizontal push': has('MAIN_PRESS_H') || has('ACC_PRESS'),
        'vertical push': has('MAIN_PRESS_V'),
        'horizontal pull': has('ACC_PULL_H'),
        'vertical pull': has('ACC_PULL_V'),
      }
      const missing = Object.entries(required).filter(([, ok]) => !ok).map(([k]) => k)
      if (missing.length) {
        violations.push({ check: 'movement-patterns', archetype: arch, days, missing, detail: `${arch}/${days}d template has no slot for: ${missing.join(', ')}` })
      }
    }
  }
  return violations
}

// ═══════════════════════════════════════════════════════════════════════
// Check 2 — Main-lift reps descend across phases
// ═══════════════════════════════════════════════════════════════════════
// For every sport/position/days/goal, finds the first ramped main-lift
// line on Day 1 at week 1 (phase 1) / week 5 (phase 2) / week 9 (phase 3)
// / week 13 (phase 4), and asserts the FINAL rep count on that line is
// non-increasing phase-to-phase (phase 4 may hold level with phase 3 for
// archetypes whose own design says Peak doesn't taper down further —
// Collision's Linemen is the documented case — so phase 4 allows equal,
// not just strictly less).
function lastRepCount(line) {
  const matches = [...line.matchAll(/[×x](\d+)(?:-\d+)?(?=[^\d]|$)/g)]
  if (matches.length === 0) return null
  return parseInt(matches[matches.length - 1][1], 10)
}

function checkRepDescentAcrossPhases() {
  const violations = []
  for (const entry of matrix()) {
    let weeks
    try { weeks = generate(entry) } catch (e) { continue }
    const phaseWeeks = [1, 5, 9, 13]
    const repsByPhase = []
    for (const wn of phaseWeeks) {
      const week = weeks[wn - 1]
      if (!week) { repsByPhase.push(null); continue }
      let found = null
      for (const s of week.sessions) {
        const { lines } = parseDescription(s.description)
        const ramped = lines.find(l => l.isRamped && !l.inBlock)
        if (ramped) { found = lastRepCount(ramped.raw); break }
      }
      repsByPhase.push(found)
    }
    if (repsByPhase.some(r => r == null)) {
      violations.push({ check: 'rep-descent', ...entry, detail: `no ramped main-lift line found in one of weeks 1/5/9/13 (reps: ${repsByPhase.join(',')})` })
      continue
    }
    for (let i = 1; i < repsByPhase.length; i++) {
      if (repsByPhase[i] > repsByPhase[i - 1]) {
        violations.push({
          check: 'rep-descent', ...entry,
          detail: `phase ${i} reps (${repsByPhase[i]}) > phase ${i} 's predecessor (${repsByPhase[i - 1]}) — reps by phase: ${repsByPhase.join(' -> ')}`,
        })
        break
      }
    }
  }
  return violations
}

// ═══════════════════════════════════════════════════════════════════════
// Check 3 — Deload weeks reduce volume vs the prior week
// ═══════════════════════════════════════════════════════════════════════
// Mirrors blueprintTemplates.test.js's own Area 5 MOBILITY_EXACT_EXEMPT/
// sumNonExemptAccessorySets logic exactly, so "accessory volume" means the
// same thing here as in the production deload pass, generalized across
// the FULL matrix (every day-count/goal, not just the max day-count on
// 'standard') and every deload week (4/8/12/16, not just 16).
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
  const { lines } = parseDescription(description)
  for (const l of lines) {
    if (l.inBlock || l.isRamped || isMobilityExempt(l.name)) continue
    const m = l.raw.replace(SUPERSET_MARKER_RE, '').match(/^(.*?):\s*(\d+)x(\d+[a-zA-Z]*|AMAP)(.*)$/)
    if (!m) continue
    total += parseInt(m[2], 10)
  }
  return total
}

function checkDeloadReducesVolume() {
  const violations = []
  for (const entry of matrix()) {
    let weeks
    try { weeks = generate(entry) } catch (e) { continue }
    const deloaded = applyDeloadAdjustments(weeks)
    for (const [deloadWn, prevWn] of [[4, 3], [8, 7], [12, 11], [16, 15]]) {
      const prevWeek = weeks[prevWn - 1]
      const deloadWeek = deloaded[deloadWn - 1]
      if (!prevWeek || !deloadWeek) continue
      let prevTotal = 0, deloadTotal = 0
      for (let i = 0; i < deloadWeek.sessions.length; i++) {
        prevTotal += sumNonExemptAccessorySets(prevWeek.sessions[i].description)
        deloadTotal += sumNonExemptAccessorySets(deloadWeek.sessions[i].description)
      }
      if (!/Deload/.test(deloadWeek.objective)) {
        violations.push({ check: 'deload-volume', ...entry, week: deloadWn, detail: `week ${deloadWn} objective doesn't say Deload: "${deloadWeek.objective}"` })
        continue
      }
      if (prevTotal === 0) continue // nothing to reduce (e.g. an all-exempt day)
      const reduction = 1 - deloadTotal / prevTotal
      if (reduction < 0.40) {
        violations.push({
          check: 'deload-volume', ...entry, week: deloadWn,
          detail: `week ${deloadWn} vs week ${prevWn}: only ${(reduction * 100).toFixed(1)}% set-count reduction (want >=40%) — ${prevTotal} -> ${deloadTotal} sets`,
        })
      }
    }
  }
  return violations
}

// ═══════════════════════════════════════════════════════════════════════
// Check 4 — Exactly one finisher, one warm-up per day
// ═══════════════════════════════════════════════════════════════════════
// Ground truth for "should this day have a warm-up" is
// dayLayoutEngine.dayLowerOrUpper() itself (the exact function the real
// renderers call) — a day with neither a lower- nor upper-body MAIN_ tag
// (a bonus/accessory/recovery day) is DESIGNED to have no warm-up line,
// so this check only requires one where dayLowerOrUpper() says one should
// exist. Every archetype (baseball included) now produces the exact same
// `session.warmup = { label, lines }` shape — see dayLayoutEngine.js's
// buildSessionFromTemplate and blueprintTemplates.js's own
// generateBaseballWeeksFromPack — so this check has one, simple, structural
// signal instead of a text heuristic.
//
// "Exactly one finisher" = exactly one family header (Core/Conditioning/
// Arm Care) as the day's only block, OR (Endurance's recoveryOnly days)
// genuine recovery content with no header at all, by design.
function checkOneFinisherOneWarmup() {
  const violations = []
  for (const entry of matrix({ goals: ['standard'] })) {
    const arch = archetypeFor(entry.sportId, entry.posId)
    if (!arch) continue
    let weeks
    try { weeks = generate(entry) } catch (e) { continue }
    const template = dayLayoutEngine.getTemplate(arch, entry.days)
    const week1 = weeks[0]
    for (let i = 0; i < week1.sessions.length; i++) {
      const s = week1.sessions[i]
      const dayTpl = template[i]
      if (!dayTpl) continue // 5/6-day sports whose template has fewer authored days than requested slots
      const expectWarmup = dayLayoutEngine.dayLowerOrUpper(dayTpl) !== null
      const hasWarmup = !!(s.warmup && Array.isArray(s.warmup.lines) && s.warmup.lines.length > 0)
      if (expectWarmup && !hasWarmup) {
        violations.push({ check: 'one-finisher-one-warmup', ...entry, day: s.day, detail: `Day "${s.day}" (${dayTpl.focus}) expected a warm-up (has a lower/upper MAIN_ tag) but none found` })
      }
      // A day with recoveryOnly:true is explicitly non-finisher content by
      // design (dayLayoutEngine.js's own recoveryOnly flag) — skip it.
      if (dayTpl.recoveryOnly) continue
      // "Neck —" is a fixed, non-phase-varying block dayLayoutEngine.js
      // documents as separate from FINISHER (rendered before the blank
      // line + finisher, on days that opt in via day.neck — see
      // buildSessionFromTemplate's assembly order) — not itself a
      // finisher, and legitimately coexists with one.
      const { headers } = parseDescription(s.description)
      const finisherHeaders = headers.filter(h => h.kind !== 'Neck')
      if (finisherHeaders.length === 0) {
        violations.push({ check: 'one-finisher-one-warmup', ...entry, day: s.day, detail: `Day "${s.day}" (${dayTpl.focus}) has no finisher block at all` })
      } else if (finisherHeaders.length > 1) {
        violations.push({ check: 'one-finisher-one-warmup', ...entry, day: s.day, detail: `Day "${s.day}" has ${finisherHeaders.length} finisher headers: ${finisherHeaders.map(h => h.raw).join(' | ')}` })
      }
    }
  }
  return violations
}

// ═══════════════════════════════════════════════════════════════════════
// Check 5 — No day exceeds the movement cap; no authored movement dropped
// ═══════════════════════════════════════════════════════════════════════
// "No movement dropped": for each day, the rendered MAIN + accessory line
// count must equal the day template's own slot count, MINUS tags that are
// DESIGNED to render null (ACC_CORE, always; ACC_SHOULDER, only for
// hasArmCare:true packs — since pack.hasArmCare isn't visible from
// outside the generator, this check treats a day rendering LESS than the
// "everything renders" count as PASS only if the sole discrepancy is
// exactly one ACC_SHOULDER slot's worth of lines, and flags anything else
// as a genuine drop).
// "Movement cap": SPORT_MAX_ACCESSORIES is exported as documentation, not
// enforcement (see its own comment: "no longer load-bearing for content
// survival") — this check reports a day whose accessory-line count
// exceeds the documented cap as an INFORMATIONAL mismatch (the cap value
// may just be stale), not a hard failure, and labels it as such.
function checkNoDropsWithinCap() {
  const violations = []
  const informational = []
  for (const entry of matrix({ goals: ['standard'] })) {
    const arch = archetypeFor(entry.sportId, entry.posId)
    if (!arch) continue
    let weeks
    try { weeks = generate(entry) } catch (e) { continue }
    const template = dayLayoutEngine.getTemplate(arch, entry.days)
    const week1 = weeks[0]
    for (let i = 0; i < week1.sessions.length; i++) {
      const s = week1.sessions[i]
      const dayTpl = template[i]
      if (!dayTpl) continue
      const nonNullableSlots = dayTpl.slots.filter(sl => !NULLABLE_TAGS.has(sl.tag))
      const expectedMax = nonNullableSlots.length
      const expectedMin = expectedMax - (dayTpl.slots.some(sl => sl.tag === 'ACC_SHOULDER') ? 1 : 0)
      const { lines } = parseDescription(s.description)
      const contentLines = lines.filter(l => !l.inBlock)
      const actual = contentLines.length
      if (actual < expectedMin) {
        violations.push({
          check: 'no-drops', ...entry, day: s.day,
          detail: `Day "${s.day}" (${dayTpl.focus}): ${actual} rendered movement line(s), expected at least ${expectedMin} (template has ${dayTpl.slots.length} slots: ${dayTpl.slots.map(sl => sl.tag).join(', ')})`,
        })
      }
      const capKey = resolveAccessoryCapKey(entry.sportId, entry.posId, entry.goal)
      const accessoryCount = contentLines.filter(l => !l.isRamped).length
      const cap = SPORT_MAX_ACCESSORIES[capKey] ?? 4
      if (accessoryCount > cap) {
        informational.push({ check: 'no-drops (cap, informational)', ...entry, day: s.day, detail: `Day "${s.day}": ${accessoryCount} accessory lines > documented cap ${cap} for "${capKey}"` })
      }
    }
  }
  return { violations, informational }
}

// ═══════════════════════════════════════════════════════════════════════
// Check 6 — Arm care appears only in allow-listed spots
// ═══════════════════════════════════════════════════════════════════════
// "Arm care" here means specifically the finisher engine's own dedicated
// 'arm' FAMILY block (rendered under an "Arm Care —" header, gated by
// hasArmCare + dayCompatibility — see dayLayoutEngine.js's own header
// comment: "arm care comes ONLY from the finisher engine's own hasArmCare-
// gated allow-list"). This is deliberately NOT a name-match against
// shoulder-health exercise vocabulary (Band External Rotation, Face
// Pulls, Cuban Press, ...) — those same names are also legitimate,
// ordinary ACC_SHOULDER pool content available to every sport regardless
// of hasArmCare (confirmed empirically: Basketball Guards, hasArmCare:
// false, renders "Face Pulls"/"Cuban Press" from its plain ACC_SHOULDER
// slot). Matching on the header instead of the names is what correctly
// separates "the finisher's gated arm-care family" from "an ordinary
// shoulder accessory that happens to share a name" — the two are
// different content sources even though the vocabulary overlaps.
const LOWER_FOCUS_RE = /Lower|Leg/i

function checkArmCareAllowListedSpots() {
  const violations = []
  for (const entry of matrix({ goals: ['standard'] })) {
    const arch = archetypeFor(entry.sportId, entry.posId)
    if (!arch) continue
    let weeks
    try { weeks = generate(entry) } catch (e) { continue }
    const template = dayLayoutEngine.getTemplate(arch, entry.days)
    for (const wn of [1, 5, 9, 13]) {
      const week = weeks[wn - 1]
      if (!week) continue
      for (let i = 0; i < week.sessions.length; i++) {
        const s = week.sessions[i]
        const dayTpl = template[i]
        const isLowerDay = LOWER_FOCUS_RE.test(s.focus) ||
          (dayTpl && dayTpl.slots.some(sl => sl.tag === 'MAIN_SQUAT' || sl.tag === 'MAIN_HINGE'))
        const { headers } = parseDescription(s.description)
        const hasArmCareHeader = headers.some(h => h.kind === 'Arm Care')
        if (isLowerDay && hasArmCareHeader) {
          violations.push({ check: 'arm-care-spots', ...entry, week: wn, day: s.day, detail: `Day "${s.day}" (${s.focus}, a lower-body day) has an "Arm Care —" finisher block` })
        }
      }
    }
  }
  return violations
}

// ═══════════════════════════════════════════════════════════════════════
// Check 7 — Anchors hold the same exercise across all 16 weeks
// ═══════════════════════════════════════════════════════════════════════
// Three ground-truth-certain sub-checks, none of which can produce a false
// violation:
//  7a. MAIN_ lift lines (always anchor, by dayLayoutEngine.js's own
//      isMainTag rule, no exceptions) never change exercise name across
//      all 16 weeks, for every day.
//  7b. Weeks 13/14/15 (peak/taper — the variety engine's own design
//      freezes ALL filler rotation here, and anchors never rotate at all)
//      show byte-identical accessory-line NAMES for every day.
//  7c. Every deload week (4/8/12/16) shows byte-identical accessory-line
//      NAMES vs the immediately preceding week (the variety engine
//      freezes filler rotation on deload; anchors never rotate at all).
// Together these prove the anchor invariant without needing external
// knowledge of which specific text position is anchor vs filler.
function namesAtPositions(description) {
  const { lines } = parseDescription(description)
  return lines.filter(l => !l.inBlock)
}

function checkAnchorsHoldAcross16Weeks() {
  const violations = []
  for (const entry of matrix({ goals: ['standard'] })) {
    let weeks
    try { weeks = generate(entry) } catch (e) { continue }

    // 7a — main-lift identity across all 16 weeks, per day.
    const mainNameByDay = []
    for (let dayIdx = 0; dayIdx < weeks[0].sessions.length; dayIdx++) {
      const namesAcrossWeeks = weeks.map(w => {
        const lines = namesAtPositions(w.sessions[dayIdx].description)
        const main = lines.find(l => l.isRamped)
        return main ? main.name : null
      })
      const nonNull = namesAcrossWeeks.filter(Boolean)
      const uniq = new Set(nonNull)
      if (uniq.size > 1) {
        violations.push({ check: 'anchor-identity (main lift)', ...entry, day: dayIdx, detail: `Day ${dayIdx + 1}'s main lift changed name across weeks: ${[...uniq].join(' / ')}` })
      }
    }

    // 7b — weeks 13/14/15 accessory-name stability.
    const sessSets1315 = [13, 14, 15].map(wn => weeks[wn - 1] && weeks[wn - 1].sessions).filter(Boolean)
    if (sessSets1315.length === 3) {
      for (let dayIdx = 0; dayIdx < sessSets1315[0].length; dayIdx++) {
        const perWeekNames = sessSets1315.map(sess => namesAtPositions(sess[dayIdx].description).filter(l => !l.isRamped).map(l => l.name))
        const maxLen = Math.max(...perWeekNames.map(a => a.length))
        for (let pos = 0; pos < maxLen; pos++) {
          const uniq = new Set(perWeekNames.map(a => a[pos]))
          if (uniq.size > 1) {
            violations.push({ check: 'anchor-identity (peak/taper 13-15)', ...entry, day: dayIdx, detail: `Day ${dayIdx + 1}, accessory position ${pos}: name changed across weeks 13-15: ${[...uniq].join(' / ')}` })
          }
        }
      }
    }

    // 7c — deload weeks freeze at the prior week.
    for (const [deloadWn, prevWn] of [[4, 3], [8, 7], [12, 11], [16, 15]]) {
      const deloadWeek = weeks[deloadWn - 1], prevWeek = weeks[prevWn - 1]
      if (!deloadWeek || !prevWeek) continue
      for (let dayIdx = 0; dayIdx < deloadWeek.sessions.length; dayIdx++) {
        const a = namesAtPositions(deloadWeek.sessions[dayIdx].description).filter(l => !l.isRamped).map(l => l.name)
        const b = namesAtPositions(prevWeek.sessions[dayIdx].description).filter(l => !l.isRamped).map(l => l.name)
        const len = Math.max(a.length, b.length)
        for (let pos = 0; pos < len; pos++) {
          if (a[pos] !== b[pos]) {
            violations.push({ check: 'anchor-identity (deload freeze)', ...entry, day: dayIdx, week: deloadWn, detail: `Day ${dayIdx + 1}, position ${pos}: week ${deloadWn} ("${a[pos]}") != week ${prevWn} ("${b[pos]}")` })
          }
        }
      }
    }
  }
  return violations
}

// ═══════════════════════════════════════════════════════════════════════
// Check 8 — No duplicate lines within a day
// ═══════════════════════════════════════════════════════════════════════
// Every exercise NAME (main or accessory, including inside finisher
// blocks) appears at most once per day, per week. Diffed at report time
// against a documented pre-existing baseline (see blueprintQuality.test.js)
// so genuinely NEW duplicates this suite can catch are distinguished from
// already-known, out-of-scope finisher-engine content issues that predate
// the variety engine entirely.
function checkNoDuplicateLinesWithinDay() {
  const violations = []
  for (const entry of matrix({ goals: ['standard'] })) {
    let weeks
    try { weeks = generate(entry) } catch (e) { continue }
    for (const w of weeks) {
      for (const s of w.sessions) {
        const lines = s.description.split('\n').map(stripMarker).map(l => l.trim()).filter(l => l && l.includes(':'))
        const seen = new Map()
        for (const l of lines) {
          const name = l.split(':')[0].trim()
          if (seen.has(name)) {
            violations.push({ check: 'no-duplicates', ...entry, week: w.week_number, day: s.day, detail: `Day "${s.day}", week ${w.week_number}: "${name}" appears twice` })
          }
          seen.set(name, true)
        }
      }
    }
  }
  return violations
}

// ═══════════════════════════════════════════════════════════════════════
// Check 9 — No barbell Overhead Press on throwing sports
// ═══════════════════════════════════════════════════════════════════════
// Permanent guardrail (feat/baseball-ohp-superset-fix): throwing-shoulder
// health means baseball/softball must never prescribe a literal, barbell
// 'Overhead Press' — Incline DB Press is the ceiling. Matches on the exact
// exercise NAME (text before the colon), so it does NOT false-positive on
// a genuinely different, DB/unilateral movement that happens to share the
// words "overhead press" (e.g. varietyEngine's ACC_PRESS filler pool
// includes 'Seated Single Arm DB Overhead Press' for some sports — a
// distinct name, not caught here, and not in scope for this specific
// fix). Scoped to exactly baseball/softball — the two sports this rule
// has actually been enforced for — NOT the full Rotational archetype:
// Tennis/Golf/Football QB/Track Throwers still carry a literal, ramped
// 'Overhead Press' as MAIN_PRESS_V as of this check's introduction (a
// separate, confirmed, not-yet-fixed finding — see the investigation this
// fix followed). Asserting the same rule for them here would make this
// check fail immediately on an unrelated, pre-existing gap this PR did not
// touch; if/when that gap gets fixed, THROWING_SPORTS_NO_OHP is exactly
// where to add them.
const THROWING_SPORTS_NO_OHP = new Set(['baseball', 'softball'])
function checkNoBarbellOverheadPressOnThrowingSports() {
  const violations = []
  for (const entry of matrix()) {
    if (!THROWING_SPORTS_NO_OHP.has(entry.sportId)) continue
    let weeks
    try { weeks = generate(entry) } catch (e) { continue }
    for (const w of weeks) {
      for (const s of w.sessions) {
        const { lines } = parseDescription(s.description)
        const ohp = lines.find(l => l.name === 'Overhead Press')
        if (ohp) {
          violations.push({
            check: 'no-barbell-ohp-throwing', ...entry, week: w.week_number, day: s.day,
            detail: `barbell "Overhead Press" found on ${s.day}, week ${w.week_number}: "${ohp.raw.trim()}"`,
          })
        }
      }
    }
  }
  return violations
}

module.exports = {
  archetypeFor,
  matrix,
  checkMovementPatternCoverage,
  checkRepDescentAcrossPhases,
  checkDeloadReducesVolume,
  checkOneFinisherOneWarmup,
  checkNoDropsWithinCap,
  checkArmCareAllowListedSpots,
  checkAnchorsHoldAcross16Weeks,
  checkNoDuplicateLinesWithinDay,
  checkNoBarbellOverheadPressOnThrowingSports,
  __parseDescriptionForTest: parseDescription,
}
