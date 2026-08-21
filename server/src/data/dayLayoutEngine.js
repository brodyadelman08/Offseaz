// ─── Day Layout Engine (feat/day-layout-engine, Stage 1) ───────────────────
// Replaces "only 4-day is hand-built, 3-day is a .slice(), 5/6-day are
// generic bonus days" with PURPOSE-BUILT 3/4/5/6-day templates per
// archetype. This module is the sport-AGNOSTIC half of the system — same
// relationship dayLayoutEngine.js has to blueprintTemplates.js that
// finisherEngine.js already does: this file knows the day *structure*
// (which tag goes in which slot, on which day, for which archetype/day-
// count), never a concrete exercise name. blueprintTemplates.js supplies
// per-archetype "renderers" (functions that turn a tag into real workout
// text, reusing each sport's own existing exercise selections and each
// archetype's own existing periodization math — collisionMainLiftScheme/
// collisionOlyScheme, mainLiftTopReps+getPhaseInfo's info.ramp, coreBlock,
// phasePlyo, the finisher engine, etc.) and calls buildSessionFromTemplate
// once per day.
//
// Stage 1 scope (this file): the tagged/role-flagged slot STRUCTURE for
// all 20 archetype×day-count combinations, plus the generic slot-to-line
// assembler. Tag resolution is STATIC per sport in Stage 1 (one exercise
// per tag, no phase-varying pools) — that's Stage 2's job. The `anchor`
// flag on every slot, and the `pattern` sub-property on ACC_CORE slots,
// are authored here explicitly (never inferred from array position) so
// Stage 2 has real data to build variety pools against.

// ─── Purpose tag vocabulary ─────────────────────────────────────────────
// MAIN_* — always anchor:true, always rendered before every accessory.
// ACC_*  — accessories; anchor is explicit per slot (0-2 anchor
//          accessories per day, never mandatory — see PATTERN docs below).
// PLYO/SPEED/MED_BALL — explosive/speed work; phase-varies by VOLUME via
//          each sport's existing explosiveSets/phasePlyo-style machinery,
//          never by swapping the movement name (that's still Stage 2).
// CONDITIONING — a mid-session conditioning BLOCK, distinct from FINISHER
//          (the shared finisher engine's own end-of-workout family system).
//          Defined for vocabulary completeness; none of the 20 templates
//          below currently place it (every archetype's conditioning need
//          is already covered by the finisher engine's own Energy family).
// FINISHER — exactly one per day, always last, always resolved by handing
//          the day off to the sport's own already-existing finisher-engine
//          wiring (collisionFinisher/fieldFinisher/tennisFinisher/etc.) —
//          this file never renders finisher content itself.
// NECK/ARM_CARE_FIXED/WARMUP — fixed, non-phase-varying blocks. WARMUP is
//          implicit (every day gets one, first). NECK is opt-in per day
//          via the day's own `neck: true` flag (Collision only, matching
//          existing COLLISION_NECK usage). ARM_CARE_FIXED exists for
//          vocabulary completeness but is deliberately unused by all 20
//          templates below — arm care comes ONLY from the finisher
//          engine's own hasArmCare-gated allow-list (see the arm-care
//          correction work on feat/finisher-engine-rollout and
//          feat/blueprint-cleanup); reintroducing a fixed, ungated
//          arm-care block here would silently undo that.
const TAG = {
  MAIN_SQUAT: 'MAIN_SQUAT',
  MAIN_HINGE: 'MAIN_HINGE',
  MAIN_PRESS_H: 'MAIN_PRESS_H',
  MAIN_PRESS_V: 'MAIN_PRESS_V',
  MAIN_OLY: 'MAIN_OLY',
  ACC_SQUAT: 'ACC_SQUAT',
  ACC_HINGE: 'ACC_HINGE',
  ACC_UNILATERAL_LOWER: 'ACC_UNILATERAL_LOWER',
  ACC_POSTERIOR: 'ACC_POSTERIOR',
  ACC_PULL_H: 'ACC_PULL_H',
  ACC_PULL_V: 'ACC_PULL_V',
  ACC_PRESS: 'ACC_PRESS',
  ACC_SHOULDER: 'ACC_SHOULDER',
  ACC_CORE: 'ACC_CORE',
  ACC_CALF_GRIP: 'ACC_CALF_GRIP',
  PLYO: 'PLYO',
  SPEED: 'SPEED',
  MED_BALL: 'MED_BALL',
  CONDITIONING: 'CONDITIONING',
  FINISHER: 'FINISHER',
  NECK: 'NECK',
  ARM_CARE_FIXED: 'ARM_CARE_FIXED',
  WARMUP: 'WARMUP',
}

const MAIN_TAGS = new Set([TAG.MAIN_SQUAT, TAG.MAIN_HINGE, TAG.MAIN_PRESS_H, TAG.MAIN_PRESS_V, TAG.MAIN_OLY])

function isMainTag(tagName) { return MAIN_TAGS.has(tagName) }

// Structural lower/upper detection off the day's own tag composition —
// every sport's warmup line already alternates Lower/Upper Body Warm-up
// text by day character (WU_LOWER/WU_UPPER, LINEMEN_WU_LOWER/UPPER,
// RUGBY_ARCHETYPE_WU_LOWER/UPPER, ...); this lets a renderer pick the
// right one from the day's tags instead of a hardcoded day index, so it
// stays correct across every day-count template automatically. A day
// with neither a lower nor an upper MAIN_ tag (a bonus/accessory day —
// Collision's Day 5, a recovery day, ...) returns null; callers fall back
// to no warmup line or a generic one, matching existing bonus-day
// precedent (Linemen's own Day 5 has no warmup line at all).
const LOWER_MAIN_TAGS = new Set([TAG.MAIN_SQUAT, TAG.MAIN_HINGE])
const UPPER_MAIN_TAGS = new Set([TAG.MAIN_PRESS_H, TAG.MAIN_PRESS_V])
function dayLowerOrUpper(dayTemplate) {
  if (dayTemplate.slots.some(s => LOWER_MAIN_TAGS.has(s.tag))) return 'lower'
  if (dayTemplate.slots.some(s => UPPER_MAIN_TAGS.has(s.tag))) return 'upper'
  return null
}

// ─── Slot / day builders ────────────────────────────────────────────────
// Every slot's `anchor` is authored explicitly here — MAIN_* is always
// anchor:true (enforced below, callers don't need to repeat it); ACC_*/
// PLYO/SPEED/MED_BALL pass their own true/false per the spec's [A]/[F]
// tagging. `pattern` is an optional sub-property (currently only
// meaningful on ACC_CORE — anti_extension/anti_rotation/anti_lateral/
// rotational/trunk) carried through for a renderer to use; Stage 1's own
// coreBlock()-backed renderer ignores it and lets coreBlock's own phase
// rotation govern the pattern, since forcing a fixed pattern here would
// fight that already-existing, already-correct rotation.
// anchor defaults to true for MAIN_* tags (the "All MAIN_ = anchor" rule)
// and false for everything else, but the default is always overridable —
// Endurance's own templates deliberately mark a secondary main lift (e.g.
// Day 3's MAIN_PRESS_V) as filler, reflecting that archetype's "support
// only, never peaks heavy" intent even on a nominally-MAIN_ slot.
function slot(tagName, anchor, extra = {}) {
  if (!TAG[tagName]) throw new Error(`dayLayoutEngine: unknown tag "${tagName}"`)
  const resolvedAnchor = anchor === undefined ? isMainTag(tagName) : !!anchor
  return { tag: tagName, anchor: resolvedAnchor, ...extra }
}

// `focus` mirrors every existing sport's own day.focus convention (shown
// to the coach/athlete). `neck` opts this day into the fixed Collision
// neck block. `lowFatigue`/`recoveryOnly` are read by callers that need to
// know a day is deliberately light (5/6-day bonus days, Endurance's
// recovery-only day) — not consumed by the generic assembler itself.
function day(focus, slots, opts = {}) {
  return {
    focus,
    slots,
    neck: !!opts.neck,
    lowFatigue: !!opts.lowFatigue,
    recoveryOnly: !!opts.recoveryOnly,
  }
}

// ─── The 20 templates ───────────────────────────────────────────────────
// One entry per archetype × day-count. Every day = implicit WARMUP first +
// exactly one FINISHER last (both handled by the assembler, never listed
// in `slots` below). Day counts below 3 or above 6 fall back to the
// nearest defined count (2 -> 3-day's first 2 days via the assembler's
// own low-day-count handling below `getTemplate`; 7+ -> 6-day) — matching
// the "no dedicated layout, fall back sensibly" precedent every archetype
// already used pre-this-PR for its own edge day-counts.

const TEMPLATES = {
  // ─── Collision/Max-Strength ──────────────────────────────────────────
  collision: {
    3: [
      // Only Day 3 carries NECK in the 3-day layout — the spec's own
      // condensed week deliberately gives one dedicated neck dose across
      // the week rather than repeating it every day the way 4/5/6-day do.
      day('Lower Power', [
        slot('MAIN_OLY'), slot('MAIN_SQUAT'), slot('ACC_HINGE', true),
        slot('ACC_UNILATERAL_LOWER'), slot('ACC_CORE'),
      ]),
      day('Upper Strength', [
        slot('MAIN_OLY'), slot('MAIN_PRESS_V'), slot('ACC_PULL_V', true),
        slot('ACC_PULL_H'), slot('ACC_SHOULDER'),
      ]),
      day('Lower Strength', [
        slot('MAIN_OLY'), slot('MAIN_HINGE'), slot('ACC_SQUAT'),
        slot('ACC_CALF_GRIP'),
      ], { neck: true }),
    ],
    4: [
      day('Lower Power', [
        slot('MAIN_OLY'), slot('MAIN_SQUAT'), slot('ACC_HINGE', true),
        slot('ACC_UNILATERAL_LOWER'), slot('ACC_CORE'),
      ], { neck: true }),
      day('Upper Strength', [
        slot('MAIN_OLY'), slot('MAIN_PRESS_V'), slot('ACC_PULL_V', true),
        slot('ACC_PRESS'), slot('ACC_PULL_H'),
      ], { neck: true }),
      day('Lower Strength', [
        slot('MAIN_OLY'), slot('MAIN_SQUAT'), slot('ACC_HINGE', true),
        slot('ACC_UNILATERAL_LOWER'), slot('ACC_CALF_GRIP'),
      ], { neck: true }),
      day('Upper Power', [
        slot('MAIN_OLY'), slot('MAIN_PRESS_H'), slot('ACC_PULL_H', true),
        slot('ACC_PRESS'), slot('ACC_PULL_V'),
      ], { neck: true }),
    ],
    5: null, // filled below (COLLISION_4 + Day5)
    6: null, // filled below (COLLISION_4 + Day5/Day6 lowerC/upperC style)
  },

  // ─── Rotational/Throwing ─────────────────────────────────────────────
  rotational: {
    3: [
      day('Lower Power', [
        slot('MAIN_SQUAT'), slot('ACC_HINGE', true),
        slot('ACC_UNILATERAL_LOWER'), slot('ACC_CORE'),
      ]),
      day('Upper & Rotational', [
        slot('MAIN_PRESS_H'), slot('ACC_PULL_H', true),
        slot('ACC_PULL_V'), slot('MED_BALL'),
      ]),
      day('Lower Strength', [
        slot('MAIN_HINGE'), slot('ACC_SQUAT'), slot('MED_BALL'), slot('ACC_CORE'),
      ]),
    ],
    4: [
      day('Lower Power', [
        slot('MAIN_SQUAT'), slot('ACC_HINGE', true),
        slot('ACC_UNILATERAL_LOWER'), slot('ACC_CORE'),
      ]),
      day('Upper & Shoulder Health', [
        slot('MAIN_PRESS_V'), slot('ACC_PULL_H', true),
        slot('MED_BALL'), slot('ACC_SHOULDER'),
      ]),
      day('Lower Strength', [
        slot('MAIN_HINGE'), slot('ACC_SQUAT', true),
        slot('ACC_POSTERIOR'), slot('ACC_CORE'),
      ]),
      // Day-type lock: no lower-body work here (arm-care-eligible finisher
      // day) — same rule every other archetype's own upper days follow.
      day('Upper Power & Rotational', [
        slot('MAIN_PRESS_H'), slot('ACC_PULL_H', true), slot('ACC_PULL_V'),
      ]),
    ],
    5: null, // filled below (ROTATIONAL_4 + Day5)
    6: null, // filled below (3 Lower / 3 Upper rotation)
  },

  // ─── Repeat-Sprint/Field ─────────────────────────────────────────────
  field: {
    3: [
      day('Lower Power & Sprint', [
        slot('SPEED'), slot('MAIN_SQUAT'), slot('ACC_HINGE', true), slot('ACC_CORE'),
      ]),
      day('Upper Strength', [
        slot('MAIN_PRESS_H'), slot('ACC_PULL_H', true), slot('MED_BALL'),
      ]),
      day('Lower Explosion', [
        slot('MAIN_HINGE'), slot('ACC_UNILATERAL_LOWER'), slot('PLYO'),
      ]),
    ],
    4: [
      day('Lower Power', [
        slot('MAIN_SQUAT'), slot('ACC_HINGE', true),
        slot('ACC_UNILATERAL_LOWER'), slot('PLYO'),
      ]),
      day('Upper Strength', [
        slot('MAIN_PRESS_H'), slot('ACC_PULL_H', true),
        slot('ACC_PRESS'), slot('ACC_CORE'),
      ]),
      day('Lower Explosion', [
        slot('MAIN_SQUAT'), slot('ACC_UNILATERAL_LOWER', true),
        slot('ACC_POSTERIOR'), slot('PLYO'),
      ]),
      day('Upper Power', [
        slot('MAIN_PRESS_V'), slot('ACC_PULL_V', true),
        slot('MED_BALL'), slot('ACC_SHOULDER'),
      ]),
    ],
    5: null, // filled below (FIELD_4 + dedicated Speed/COD day)
    6: null, // filled below (FIELD_4 + Speed/COD + recovery)
  },

  // ─── Speed/Power ──────────────────────────────────────────────────────
  speedpower: {
    3: [
      day('Lower Power & Speed', [
        slot('SPEED'), slot('MAIN_SQUAT'), slot('PLYO'), slot('ACC_UNILATERAL_LOWER'),
      ]),
      day('Upper Strength', [
        slot('MAIN_PRESS_H'), slot('ACC_PULL_H', true), slot('MED_BALL'),
      ]),
      day('Lower Explosion & Speed', [
        slot('SPEED'), slot('MAIN_HINGE'), slot('PLYO'), slot('ACC_CORE'),
      ]),
    ],
    4: [
      day('Lower Power & Speed', [
        slot('SPEED'), slot('MAIN_SQUAT'), slot('PLYO'), slot('ACC_UNILATERAL_LOWER'),
      ]),
      day('Upper Strength', [
        slot('MAIN_PRESS_V'), slot('ACC_PULL_V', true),
        slot('MED_BALL'), slot('ACC_SHOULDER'),
      ]),
      day('Lower Explosion & Speed', [
        slot('SPEED'), slot('MAIN_HINGE'), slot('ACC_POSTERIOR'), slot('ACC_CORE'),
      ]),
      day('Upper Power', [
        slot('MAIN_PRESS_H'), slot('ACC_PULL_H', true),
        slot('ACC_PRESS'), slot('ACC_CORE'),
      ]),
    ],
    5: null, // filled below (SPEEDPOWER_4 + reactive Speed day)
    6: null, // filled below (SPEEDPOWER_4 + Speed + upper armor)
  },

  // ─── Endurance/Support ────────────────────────────────────────────────
  endurance: {
    3: [
      day('Full Body — Squat & Press', [
        slot('MAIN_SQUAT'), slot('MAIN_PRESS_H'), slot('ACC_HINGE'), slot('ACC_CORE'),
      ]),
      // feat/warmup-revamp — was ACC_PULL_H; both packs' own content for
      // this slot (Cross Country's "Pull-ups," Swimming's row-family pick)
      // was always a vertical-pull movement in spirit, and Endurance had
      // no ACC_PULL_V slot anywhere, so the quality suite's movement-
      // pattern check flagged a real gap. Retagging (not adding a new
      // slot) matches what the content already was/should be, rather than
      // growing the day.
      day('Full Body — Unilateral & Mobility', [
        slot('ACC_UNILATERAL_LOWER', true), slot('ACC_PULL_V'), slot('ACC_CORE'),
      ], { lowFatigue: true }),
      day('Full Body — Hinge & Press', [
        // MAIN_PRESS_V is explicitly filler here, not the "All MAIN_ =
        // anchor" default — Endurance's own spec: even a nominally-MAIN_
        // lift stays de-emphasized relative to the day's true anchor
        // (MAIN_HINGE), matching the archetype's "support only, never
        // peaks heavy" intent.
        slot('MAIN_HINGE'), slot('MAIN_PRESS_V', false), slot('PLYO'), slot('ACC_CORE'),
      ]),
    ],
    4: [
      day('Full Body — Squat & Press', [
        slot('MAIN_SQUAT'), slot('MAIN_PRESS_H'), slot('ACC_HINGE'), slot('ACC_CORE'),
      ]),
      day('Full Body — Unilateral & Pull', [
        slot('ACC_UNILATERAL_LOWER', true), slot('ACC_PULL_V'), slot('ACC_CORE'),
      ]),
      day('Full Body — Hinge & Press', [
        slot('MAIN_HINGE'), slot('MAIN_PRESS_V', false), slot('PLYO'), slot('ACC_SHOULDER'),
      ]),
      day('Low-Load — Posterior & Mobility', [
        slot('ACC_POSTERIOR'), slot('ACC_CORE'),
      ], { lowFatigue: true }),
    ],
    5: null, // filled below (ENDURANCE_4 + mobility/tissue day)
    6: null, // filled below (ENDURANCE_5 + recovery-only Day 6)
  },
}

// ── Collision 5/6-day (COLLISION_4 + Day5, or +Lower C/Upper C at 6) ──
TEMPLATES.collision[5] = [
  ...TEMPLATES.collision[4],
  day('Power, Athleticism & Armor', [
    slot('PLYO'), slot('MED_BALL'), slot('ACC_CALF_GRIP'),
  ], { neck: true, lowFatigue: true }),
]
TEMPLATES.collision[6] = [
  ...TEMPLATES.collision[4],
  day('Lower — Posterior Chain & Athletic', [
    slot('MAIN_HINGE'), slot('ACC_UNILATERAL_LOWER'),
    slot('ACC_POSTERIOR'), slot('ACC_CALF_GRIP'),
  ], { neck: true }),
  day('Upper — Hypertrophy & Armor', [
    slot('ACC_PRESS'), slot('ACC_PULL_H'), slot('ACC_SHOULDER'), slot('ACC_CORE'),
  ], { neck: true }),
]

// ── Rotational 5/6-day ──
TEMPLATES.rotational[5] = [
  ...TEMPLATES.rotational[4],
  day('Shoulder Health & Power Accessory', [
    slot('MED_BALL'), slot('ACC_CORE'), slot('ACC_SHOULDER'),
  ], { lowFatigue: true }),
]
// 3 Lower / 3 Upper, upper days rotating vertical/horizontal/arm-care
// emphasis, MED_BALL present on 2 of the 3 upper days.
TEMPLATES.rotational[6] = [
  day('Lower Power', [
    slot('MAIN_SQUAT'), slot('ACC_HINGE', true), slot('ACC_UNILATERAL_LOWER'), slot('ACC_CORE'),
  ]),
  day('Upper — Vertical Press Emphasis', [
    slot('MAIN_PRESS_V'), slot('ACC_PULL_V', true), slot('MED_BALL'), slot('ACC_SHOULDER'),
  ]),
  day('Lower Strength', [
    slot('MAIN_HINGE'), slot('ACC_SQUAT', true), slot('ACC_POSTERIOR'), slot('ACC_CORE'),
  ]),
  day('Upper — Horizontal Press Emphasis', [
    slot('MAIN_PRESS_H'), slot('ACC_PULL_H', true), slot('MED_BALL'), slot('ACC_CORE'),
  ]),
  day('Lower Explosion', [
    slot('MAIN_SQUAT'), slot('ACC_UNILATERAL_LOWER', true), slot('ACC_POSTERIOR'), slot('MED_BALL'),
  ]),
  day('Upper — Arm-Care Emphasis', [
    slot('ACC_PULL_H', true), slot('ACC_PULL_V'), slot('ACC_SHOULDER'), slot('ACC_CORE'),
  ]),
]

// ── Field 5/6-day (FIELD_4 + dedicated Speed/COD day, +recovery at 6) ──
TEMPLATES.field[5] = [
  ...TEMPLATES.field[4],
  day('Speed & Change of Direction', [
    slot('SPEED'), slot('PLYO'), slot('ACC_CORE'),
  ], { lowFatigue: true }),
]
TEMPLATES.field[6] = [
  ...TEMPLATES.field[5],
  day('Recovery & Mobility', [
    slot('ACC_CORE'), slot('ACC_POSTERIOR'),
  ], { lowFatigue: true, recoveryOnly: true }),
]

// ── Speed/Power 5/6-day ──
TEMPLATES.speedpower[5] = [
  ...TEMPLATES.speedpower[4],
  day('Reactive Speed', [
    slot('SPEED'), slot('PLYO'),
  ], { lowFatigue: true }),
]
TEMPLATES.speedpower[6] = [
  ...TEMPLATES.speedpower[5],
  day('Upper Armor', [
    slot('ACC_PRESS'), slot('ACC_PULL_H'), slot('ACC_SHOULDER'), slot('ACC_CORE'),
  ], { lowFatigue: true }),
]

// ── Endurance 5/6-day — Day 6 is recommended-against; if chosen it is
// RECOVERY ONLY (no MAIN_/CONDITIONING/PLYO/SPEED whatsoever) ──
TEMPLATES.endurance[5] = [
  ...TEMPLATES.endurance[4],
  day('Hip & Tissue Mobility', [
    slot('ACC_CORE'), slot('ACC_POSTERIOR'),
  ], { lowFatigue: true }),
]
TEMPLATES.endurance[6] = [
  ...TEMPLATES.endurance[5],
  day('Recovery — Breathing, Mobility & Low-Load Trunk', [
    slot('ACC_CORE'),
  ], { lowFatigue: true, recoveryOnly: true }),
]

// ─── Template lookup ─────────────────────────────────────────────────────
// 2-or-fewer days: no dedicated layout exists (same precedent every
// archetype used before this PR) — fall back to the first 2 days of the
// 3-day template, which is itself already hand-consolidated (not a slice
// of 4), so even the fallback is real content, not a truncation.
// 7+ days: cap at 6.
function getTemplate(archetype, days) {
  const arch = TEMPLATES[archetype]
  if (!arch) throw new Error(`dayLayoutEngine: unknown archetype "${archetype}"`)
  if (days <= 2) return arch[3].slice(0, 2)
  if (days >= 6) return arch[6]
  return arch[days] || arch[4]
}

// ─── Generic slot -> line assembler ────────────────────────────────────
// `renderers` is an object keyed by tag name (plus WARMUP/NECK/FINISHER),
// each value a function. MAIN_*/ACC_*/PLYO/SPEED/MED_BALL/CONDITIONING
// renderers are `(slotDef, ctx) => string` (one rendered text line, or a
// multi-line string for something like coreBlock's own "Core — X:\n...\n..."
// shape). WARMUP is `(ctx) => string`. NECK is `(ctx) => string`. FINISHER
// is `(dayIndex, ctx) => string` — deliberately takes dayIndex directly
// (not read off ctx) since it's the one renderer every existing sport
// already calls with an explicit day index into its own finisher-engine
// wiring.
//
// Assembly order (matches the convention every existing hand-written day
// in this codebase already uses): warmup, blank line, MAIN_ lines (in
// authored slot order), accessory-family lines (ACC_*/PLYO/SPEED/MED_BALL/
// CONDITIONING, in authored slot order), NECK block (if this day opts in),
// blank line, FINISHER. The MAIN_/accessory split is structural (MAIN_
// always renders first, matching every archetype's own existing
// convention of main lift(s) before accessories) — everything downstream
// of this raw text (organizeSessionDescription's own accessory-pairing/
// cap/silent-drop pass, applied globally in generateBlueprintForAthlete)
// is completely unaffected by and unaware of this assembler; it just sees
// the same shape of "Name: SxR" lines it already parses today.
// feat/warmup-consistent-display — converts a single-line warm-up string
// ("Label: Movement 1 · Movement 2 · ...") into the exact {label, lines}
// shape baseball's own session.warmup object has always used, so every
// sport's warm-up renders through the SAME always-visible client block
// (see SessionDescription.jsx's WarmupBlock) instead of being baked into
// `description` text. `lines` here won't all have baseball's own "Name:
// SxR" per-line shape (these are prep movements, not loaded exercises),
// which is fine — the shared renderer handles plain text lines too.
function parseWarmupLine(text) {
  const colonIdx = text.indexOf(':')
  if (colonIdx < 0) return { label: 'Warm-Up', lines: [text.trim()] }
  const label = text.slice(0, colonIdx).trim()
  const rest = text.slice(colonIdx + 1).trim()
  const lines = rest.split('·').map(s => s.trim()).filter(Boolean)
  return { label, lines: lines.length > 0 ? lines : [rest] }
}

function buildSessionFromTemplate(dayTemplate, dayIndex, renderers, ctx) {
  // Enriched per-day context — dayIndex and the day's own template (so a
  // sport's renderer closures can pick per-day content, e.g. which
  // Olympic lift belongs on THIS day, or detect lower-vs-upper for a
  // warmup line, from the day's own tag composition) without every
  // renderer needing its own bespoke signature.
  const dayCtx = { ...ctx, dayIndex, dayTemplate }
  const mainLines = []
  const accLines = []
  for (const slotDef of dayTemplate.slots) {
    const renderer = renderers[slotDef.tag]
    if (!renderer) throw new Error(`dayLayoutEngine: no renderer for tag "${slotDef.tag}"`)
    const rendered = renderer(slotDef, dayCtx)
    if (rendered == null || rendered === '') continue
    if (isMainTag(slotDef.tag)) mainLines.push(rendered)
    else accLines.push(rendered)
  }

  // feat/warmup-consistent-display — warm-up is no longer woven into
  // `description` text (it used to be the day's first line + a blank
  // line). It's returned as its own `session.warmup` field instead,
  // matching baseball's own pre-existing, already-correct shape — one
  // unified always-visible presentation for every sport, not two
  // different ones depending on which archetype generated the day.
  const parts = []
  const warmupText = renderers.WARMUP ? renderers.WARMUP(dayCtx) : null
  parts.push(...mainLines, ...accLines)
  if (dayTemplate.neck && renderers.NECK) parts.push(renderers.NECK(dayCtx))

  const finisher = renderers.FINISHER ? renderers.FINISHER(dayIndex, dayCtx) : null
  let description = parts.join('\n')
  if (finisher) description += `\n\n${finisher}`

  const session = { day: `Day ${dayIndex + 1}`, focus: dayTemplate.focus, description }
  if (warmupText) session.warmup = parseWarmupLine(warmupText)
  return session
}

// Builds every session for one week from an archetype's template at a
// given day count. `renderers` and `ctx` are as above; ctx typically
// carries the week's phase info (phaseNum/deload/pct/ramp/mg/...) plus
// whatever a sport's own renderers need to pick exercise names.
function buildWeekSessions(archetype, days, renderers, ctx) {
  const template = getTemplate(archetype, days)
  return template.map((dayTemplate, i) => buildSessionFromTemplate(dayTemplate, i, renderers, ctx))
}

module.exports = {
  TAG,
  slot,
  day,
  TEMPLATES,
  getTemplate,
  buildSessionFromTemplate,
  buildWeekSessions,
  isMainTag,
  dayLowerOrUpper,
}
