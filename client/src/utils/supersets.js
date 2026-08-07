// Superset marker parsing (structural capability only).
//
// Session prescription text can optionally carry a ⟦SS<n>⟧ marker at the
// start of a line, added server-side by superset() in
// server/src/data/blueprintTemplates.js — must stay in sync with that exact
// shape. Consecutive lines sharing the same marker are meant to render as one
// superset group (a single "SS" bracket spanning them) instead of standalone
// lines.
//
// No session template currently emits this marker — which specific lifts get
// paired into a superset is separately-scoped follow-up work — but every
// place that displays raw session text must still handle the marker safely
// so a stray ⟦SS1⟧ never leaks to a user once one is added: either render it
// properly (see SessionDescription.jsx) or strip it (every other raw-text
// consumer).

export const SUPERSET_MARKER_RE = /^⟦SS(\d+)⟧/

// Removes a leading marker from a single line, if present.
export function stripSupersetMarker(line) {
  return typeof line === 'string' ? line.replace(SUPERSET_MARKER_RE, '') : line
}

// Removes every marker from a block of text (all lines), for any render path
// that only needs plain text and doesn't build the bracket UI.
export function stripSupersetMarkers(text) {
  if (typeof text !== 'string') return text
  return text.split('\n').map(stripSupersetMarker).join('\n')
}

// Given an array of raw lines (e.g. description.split('\n')), returns an
// array of "chunks" for rendering: either a plain line ({ type: 'line', text })
// or a superset group ({ type: 'superset', groupNum, lines: [text, ...] }) of
// two or more consecutive lines that shared the same marker. Unmarked lines,
// or a "group" of just one marked line (nothing to bracket), pass through as
// plain lines with the marker stripped.
export function parseSupersetGroups(lines) {
  const chunks = []
  let i = 0
  while (i < lines.length) {
    const m = lines[i].match(SUPERSET_MARKER_RE)
    if (!m) {
      chunks.push({ type: 'line', text: lines[i] })
      i++
      continue
    }
    const groupNum = m[1]
    const group = []
    while (i < lines.length) {
      const gm = lines[i].match(SUPERSET_MARKER_RE)
      if (!gm || gm[1] !== groupNum) break
      group.push(stripSupersetMarker(lines[i]))
      i++
    }
    if (group.length >= 2) {
      chunks.push({ type: 'superset', groupNum, lines: group })
    } else {
      chunks.push({ type: 'line', text: group[0] })
    }
  }
  return chunks
}
