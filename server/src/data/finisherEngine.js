// ─── Shared Finisher Engine (feat/finisher-engine) ─────────────────────────
// ONE system that selects the single finisher block every training day ends
// in, for every sport archetype — replacing the ad hoc per-archetype
// finisher logic that used to live separately in the Collision archetype
// (a fixed Neck block only, no rotation) and the Repeat-Sprint archetype
// (a 2-family Conditioning/Core alternation, see blueprintTemplates.js git
// history on feat/archetype-repeat-sprint).
//
// CONCEPT: every day ends with ONE finisher block (6-12 min) built from a
// PRIMARY family and an OPTIONAL SECONDARY (a short 1-2 set accessory from
// an under-represented family). Five families: Sprint, Energy-system, Core,
// Rotational Power, Arm Care. Every sport gets all 5 across 16 weeks — only
// the WEIGHTING (how often each shows up as primary vs. secondary) changes
// by archetype, phase, and position.
//
// Pipeline: normalizedWeights (base × phase multiplier, renormalized) ->
// allocateSlots (largest-remainder apportionment across training days) ->
// scheduleFamilies (spread identical families apart) -> assignSecondaries
// (fill in families that got zero primary slots) -> buildFinisher (render
// the actual text via a per-sport content bank).

const FAMILIES = ['sprint', 'energy', 'core', 'rotation', 'arm']

const FAMILY_LABELS = {
  sprint: 'Sprint',
  energy: 'Energy System',
  core: 'Core',
  rotation: 'Rotational Power',
  arm: 'Arm Care',
}

// ── 1. Base weighting per archetype (out of 100) ────────────────────────────
const BASE_WEIGHTS = {
  rotational: { sprint: 15, energy: 20, core: 15, rotation: 30, arm: 20 }, // baseball, softball, tennis, golf, QB, track throwers
  field:      { sprint: 30, energy: 30, core: 15, rotation: 15, arm: 10 }, // soccer, lacrosse, hockey
  collision:  { sprint: 15, energy: 20, core: 25, rotation: 25, arm: 15 }, // linemen, rugby forwards, wrestling
  speedpower: { sprint: 30, energy: 15, core: 15, rotation: 30, arm: 10 }, // football skill/hybrid, track sprinters, basketball guards
  endurance:  { sprint: 15, energy: 45, core: 25, rotation: 10, arm: 5  }, // cross country, swimming
  // feat/finisher-engine-rollout — landing-mechanics/explosive-jump sports:
  // basketball wings/bigs, volleyball, track jumpers. Core is the highest
  // of any archetype (landing control/anti-rotation is these sports' real
  // injury-prevention need); Energy is the lowest of the "team sport"
  // archetypes since a jumper's or big's actual conditioning demand is
  // repeat-explosive, not sustained running the way field/speed-power is.
  vertical:   { sprint: 25, energy: 15, core: 30, rotation: 20, arm: 10 }, // basketball wings/bigs, volleyball, track jumpers
}

// Arm Care is NOT universal — restricted to throwing/overhead sports and
// positions. The engine itself stays sport-agnostic (same as
// `isFieldSport` below) — the CALLER (blueprintTemplates.js) decides
// `hasArmCare: true/false` per sport/position and passes it in; see each
// sport's own *_FINISHERS wiring for which ones qualify (baseball,
// softball, tennis, football QB only, volleyball, swimming, track
// throwers — every other sport/position defaults to false).

// ── 2. Phase multipliers (apply to every archetype identically) ────────────
const PHASE_MULTIPLIERS = {
  sprint:   [0.80, 1.00, 1.20, 1.15],
  energy:   [1.20, 1.05, 0.80, 0.55],
  core:     [1.20, 1.05, 1.00, 1.00],
  rotation: [0.80, 1.10, 1.30, 1.20],
  arm:      [1.25, 1.10, 0.90, 1.10],
}
// Field sports (soccer/lacrosse/hockey) keep sport-specific conditioning
// present into Peak/Taper — their season starts right after, unlike a
// weight-room-only offseason — so Energy backs off to 0.80 there instead of
// the standard 0.55 every other archetype uses in Phase 4.
const FIELD_ENERGY_PHASE4_MULTIPLIER = 0.80

// Renormalized 0-100 weight per family for a given archetype + phase.
// `hasArmCare` (default true, preserving every archetype's existing
// behavior): when false, Arm's adjusted weight is zeroed and redistributed
// PROPORTIONALLY across the other 4 families (each gets a share
// proportional to its own already-adjusted weight, so an archetype's
// existing emphasis — e.g. Rotation staying dominant for golf — is
// preserved rather than flattened by an even split). Arm Care is not
// universal; every sport/position that doesn't throw/serve/spike
// overhead gets its shoulder work from normal lifting instead — see each
// sport's own *_FINISHERS wiring in blueprintTemplates.js for which ones
// pass `hasArmCare: true`.
function normalizedWeights(archetype, phaseNum, { isFieldSport = false, overrides = null, hasArmCare = true } = {}) {
  const base = BASE_WEIGHTS[archetype]
  if (!base) throw new Error(`finisherEngine: unknown archetype "${archetype}"`)
  const idx = Math.min(4, Math.max(1, phaseNum)) - 1
  const adjusted = {}
  for (const fam of FAMILIES) {
    let mult = PHASE_MULTIPLIERS[fam][idx]
    if (fam === 'energy' && isFieldSport && phaseNum === 4) mult = FIELD_ENERGY_PHASE4_MULTIPLIER
    adjusted[fam] = base[fam] * mult
  }
  if (!hasArmCare) {
    const armWeight = adjusted.arm
    adjusted.arm = 0
    const others = FAMILIES.filter(f => f !== 'arm')
    const othersSum = others.reduce((s, f) => s + adjusted[f], 0)
    for (const f of others) adjusted[f] += armWeight * (adjusted[f] / othersSum)
  }
  // Position overrides (see POSITION OVERRIDES in the spec) — a flat +/-
  // delta applied to the ADJUSTED (already phase-scaled, already arm-care-
  // redistributed) weight, before renormalizing, e.g. a pitcher's extra
  // arm-care emphasis or golf's extra core/rotation emphasis.
  // Differentiates by weighting only — no sport gains a family it didn't
  // already have, no exercises are invented per position.
  if (overrides) {
    for (const fam of FAMILIES) {
      if (overrides[fam]) adjusted[fam] = Math.max(1, adjusted[fam] + overrides[fam])
    }
  }
  // hasArmCare is an absolute guarantee, not just a phase-scaling step —
  // the Math.max(1, ...) floor above exists so a position override can
  // never zero out a family entirely, but that same floor would silently
  // reintroduce a nonzero Arm weight (and defeat hasArmCare: false) for
  // any position whose own override happens to include a negative `arm`
  // delta (e.g. Hockey Goalie's HG_OVERRIDES). Re-clamped here, after
  // overrides, so nothing upstream can undo it.
  if (!hasArmCare) adjusted.arm = 0
  const sum = FAMILIES.reduce((s, f) => s + adjusted[f], 0)
  const normalized = {}
  for (const fam of FAMILIES) normalized[fam] = (adjusted[fam] / sum) * 100
  return normalized
}

// ── 3. Slot allocation — largest-remainder apportionment ───────────────────
// ideal_slots = normalized% * training_days; take the floor of each, then
// hand out the leftover slots to whichever family has the largest
// fractional remainder until primary slots == training days. A family that
// nets zero primary slots (typically anything under ~15% at low day counts)
// still gets folded in as a SECONDARY by assignSecondaries below — it's
// never deleted, just not a dedicated day.
function allocateSlots(normalized, days) {
  const ideal = {}
  const floors = {}
  let assigned = 0
  for (const fam of FAMILIES) {
    ideal[fam] = (normalized[fam] / 100) * days
    floors[fam] = Math.floor(ideal[fam])
    assigned += floors[fam]
  }
  const remainder = days - assigned
  const byFraction = [...FAMILIES].sort((a, b) => {
    const diff = (ideal[b] - floors[b]) - (ideal[a] - floors[a])
    if (Math.abs(diff) > 1e-9) return diff
    return normalized[b] - normalized[a] // tie-break: higher weight wins
  })
  const slots = { ...floors }
  for (let i = 0; i < remainder; i++) slots[byFraction[i % byFraction.length]]++
  return slots // { sprint: n, energy: n, core: n, rotation: n, arm: n } summing to `days`
}

// ── 4. Scheduling — spread identical families apart, best-effort ──────────
// Greedy "most-remaining-first, never repeat the last two days' family"
// heuristic (same shape as the classic task-scheduler problem) — reliably
// produces S-E-S-E rather than S-S-E-E without needing full workout-aware
// selection (explicitly V2 per the spec: avoiding the day's own dominant
// main-lift stress is a nice-to-have, not a hard constraint here).
const FATIGUE = { sprint: 'high', energy: 'high', rotation: 'medium', core: 'low', arm: 'low' }

// `dayCompatibility` (optional): array of length `days`, each entry the list
// of families allowed to be that day's PRIMARY — lets a sport enforce its
// own day-type theming (e.g. baseball's pre-existing "arm-care never on a
// lower-body day" rule) without hardcoding it into the shared engine.
// Falls back to "any family" for a day if the constraint would otherwise
// make that day impossible to fill (leftover slots still need a home
// somewhere) rather than silently dropping a family.
function scheduleFamilies(slots, days, dayCompatibility = null) {
  const remaining = { ...slots }
  const order = []
  let prev1 = null, prev2 = null
  for (let d = 0; d < days; d++) {
    const allowed = dayCompatibility ? dayCompatibility[d] : FAMILIES
    let candidates = FAMILIES.filter(f => remaining[f] > 0 && allowed.includes(f))
    if (candidates.length === 0) candidates = FAMILIES.filter(f => remaining[f] > 0)
    candidates.sort((a, b) => remaining[b] - remaining[a])
    const pick = candidates.find(f => f !== prev1 && f !== prev2)
      || candidates.find(f => f !== prev1)
      || candidates[0]
    order.push(pick)
    remaining[pick]--
    prev2 = prev1
    prev1 = pick
  }
  return order // array of length `days`, one PRIMARY family per day
}

// Families with zero primary slots still show up as a secondary somewhere
// in the week — UNLESS their normalized weight is genuinely zero (e.g. Arm
// Care for a sport with `hasArmCare: false`), in which case zero primary
// slots means "excluded by design," not "unlucky in the rounding," and it
// must not appear at all — forcing a weight-0 family in as a secondary
// would silently defeat the entire point of turning it off. `normalized`
// (optional, from normalizedWeights) is how this function tells the two
// cases apart; omit it to keep the old "every non-primary family still
// gets a secondary" behavior. Otherwise: placed on the lowest-fatigue
// primary days first (a secondary stacks fatigue onto whatever primary is
// already scheduled that day), one per day where possible; only doubles up
// on a day if there are more under-represented families than days.
// Respects the same `dayCompatibility` constraint scheduleFamilies does —
// a secondary is still that family showing up on that day, so it must be
// day-type-compatible too.
function assignSecondaries(primaryOrder, dayCompatibility = null, normalized = null) {
  const present = new Set(primaryOrder)
  const missing = FAMILIES.filter(f => !present.has(f) && (!normalized || normalized[f] > 0))
  const secondaries = primaryOrder.map(() => [])
  if (missing.length === 0) return secondaries
  const dayRank = primaryOrder
    .map((fam, i) => ({ i, fatigue: FATIGUE[fam] === 'low' ? 0 : FATIGUE[fam] === 'medium' ? 1 : 2 }))
    .sort((a, b) => a.fatigue - b.fatigue)
    .map(x => x.i)
  const isCompatible = (i, fam) => !dayCompatibility || dayCompatibility[i].includes(fam)
  let cursor = 0
  for (const fam of missing) {
    // First pass: an empty, day-type-compatible day whose primary isn't this family.
    let idx = dayRank.find((i, k) => k >= cursor && secondaries[i].length === 0 && primaryOrder[i] !== fam && isCompatible(i, fam))
    if (idx == null) idx = dayRank.find(i => secondaries[i].length === 0 && primaryOrder[i] !== fam && isCompatible(i, fam))
    if (idx == null) idx = dayRank.find(i => primaryOrder[i] !== fam && isCompatible(i, fam))
    if (idx == null) idx = dayRank.find(i => primaryOrder[i] !== fam) // last resort: ignore compatibility rather than drop the family entirely
    if (idx != null) secondaries[idx].push(fam)
    cursor++
  }
  return secondaries // array of length `days`, each entry an array (usually 0-1 items) of secondary families
}

// ── 5. Public entry point ───────────────────────────────────────────────────
// Field-sport core floor: Core's own weight reliably wins it exactly ONE
// primary slot per week at typical day counts (see finisherEngine's own
// design notes) — never zero, but also never more than one, since it's not
// "missing" the way assignSecondaries' own under-represented-family logic
// checks for. Field athletes' real trunk-work need is better served by a
// SECOND touch, so when Core lands exactly one primary slot, this
// guarantees it a secondary slot on a second day too — without changing
// any base weighting, purely a scheduling-layer floor. No-op if Core
// already picked up a secondary incidentally (e.g. paired with an
// under-represented family that happened to land on Core's own primary day
// — rare, but checked rather than assumed).
function ensureCoreFloor(primaryOrder, secondaryOrder, dayCompatibility) {
  if (secondaryOrder.some(s => s.includes('core'))) return
  const isCompatible = (i) => !dayCompatibility || dayCompatibility[i].includes('core')
  let idx = primaryOrder.findIndex((f, i) => f !== 'core' && secondaryOrder[i].length === 0 && isCompatible(i))
  if (idx < 0) idx = primaryOrder.findIndex((f, i) => f !== 'core' && isCompatible(i))
  if (idx < 0) idx = primaryOrder.findIndex(f => f !== 'core') // last resort: ignore compatibility
  if (idx >= 0) secondaryOrder[idx].push('core')
}

// Computes the whole week's day->{primary, secondary[]} assignment once
// (call it once per week per sport, then read dayIndex out for each
// session). `days` is the count of PRIMARY-finisher training days that
// week — day counts above what the sport's own archetype restructures (a
// dedicated 5th/6th conditioning day, an off day) are handled by the caller,
// not this function. `opts.dayCompatibility` (optional): see
// scheduleFamilies/assignSecondaries above — a sport's own day-type theming
// constraint (e.g. baseball's "arm-care never on a lower-body day").
// `opts.isFieldSport` also triggers the core floor above (see
// ensureCoreFloor) — field sports only, per the spec.
function planWeekFinishers(archetype, phaseNum, days, opts = {}) {
  const normalized = normalizedWeights(archetype, phaseNum, opts)
  const slots = allocateSlots(normalized, days)
  const primaryOrder = scheduleFamilies(slots, days, opts.dayCompatibility)
  const secondaryOrder = assignSecondaries(primaryOrder, opts.dayCompatibility, normalized)
  if (opts.isFieldSport && slots.core === 1) ensureCoreFloor(primaryOrder, secondaryOrder, opts.dayCompatibility)
  return primaryOrder.map((primary, i) => ({ primary, secondary: secondaryOrder[i] }))
}

// ── 6. Rendering ─────────────────────────────────────────────────────────
// One finisher block: "<Family Label> — <subtitle>:" header (exempt from
// the accessory cap/rotation/deload-strip via the existing "Core|Arm
// Care|Conditioning|Neck —" mechanism — see organizeSessionDescription/
// applyDeloadVolumeReduction in blueprintTemplates.js, which this module
// intentionally does not duplicate) followed by the primary's lines, then
// the secondary's 1-2 lines appended directly underneath (same block, no
// second header — "ONE finisher block" per the spec).
//
// The header always reads "<Family> —" except Rotation and Sprint/Energy,
// which use "Conditioning —" for their header word so the existing
// exempt-header regex (which only lists Core/Arm Care/Conditioning/Neck,
// not "Sprint"/"Energy System"/"Rotational Power") still recognizes them
// without touching that regex a second time. Core and Arm Care keep their
// own existing header words since those are already in the regex.
const FINISHER_HEADER_WORD = {
  sprint: 'Conditioning',
  energy: 'Conditioning',
  core: 'Core',
  rotation: 'Conditioning',
  arm: 'Arm Care',
}

function buildFinisherBlock(family, entry) {
  const header = `${FINISHER_HEADER_WORD[family]} — ${entry.subtitle}:`
  return [header, ...entry.lines].join('\n')
}

// content: { primaryFn(phaseNum, deload) -> {subtitle, lines[]}, ... } keyed
// by family, supplied per sport by the caller (see the *_FINISHERS banks in
// blueprintTemplates.js, kept there so all exercise-name vocabulary stays
// next to the sport it belongs to).
function renderFinisher(contentBank, plan, phaseNum, deload) {
  const primaryEntry = contentBank[plan.primary](phaseNum, deload)
  const lines = [...primaryEntry.lines]
  for (const secFam of plan.secondary) {
    const secEntry = contentBank[secFam](phaseNum, deload)
    // Secondary is a short 1-2 set accessory, not the full primary
    // prescription — just its first line, appended into the same block.
    lines.push(secEntry.lines[0])
  }
  return buildFinisherBlock(plan.primary, { subtitle: primaryEntry.subtitle, lines })
}

// ── 7. Endurance mode — a CONTENT convention, not a math one ────────────
// Cross Country and Swimming's own sport practice (running/swimming
// mileage) already IS their energy-system training — the finisher's own
// 'energy' family must never duplicate that as a second real conditioning
// block. `endurance` archetype's own base Energy weight (45, the highest
// of any archetype) still governs how OFTEN the family gets scheduled —
// that's correct, matching how often a light touch is appropriate — but
// the CONTENT authored for it (in blueprintTemplates.js's own
// *_FINISHERS banks for cross_country/swimming) must stay a short aerobic
// flush / controlled tempo / technique-aerobic / very-short-speed / mobility
// touch, never a real interval session. This export exists so that
// intent is named and discoverable, not just a comment convention split
// across two files — pass it to a sport's *_FINISHERS bank construction
// (see cross_country/swimming's own wiring) as a reminder/marker; the
// engine's own math doesn't consume it.
const ENDURANCE_FINISHER_MODE = 'aerobic-flush-not-a-workout'

module.exports = {
  FAMILIES,
  FAMILY_LABELS,
  BASE_WEIGHTS,
  PHASE_MULTIPLIERS,
  ENDURANCE_FINISHER_MODE,
  normalizedWeights,
  allocateSlots,
  scheduleFamilies,
  assignSecondaries,
  planWeekFinishers,
  buildFinisherBlock,
  renderFinisher,
}
