'use strict'

// ─── Regression test: GET /api/blueprints must never mix a head coach's
// other teams into the list ─────────────────────────────────────────────────
//
// Real bug (not the earlier roster-scoping one): blueprintController.list()
// resolved `team` correctly from the caller-supplied team_id, then for head
// coaches threw it away and called getBlueprintsByCoach(coachId) — a query
// filtered ONLY by coach_id, with no team_id filter at all. A head coach who
// owns two teams got every blueprint across BOTH teams merged into one list
// no matter which team_id was requested, so a coach viewing Team B saw Team
// A's blueprints mixed in and could click straight into one — which is how
// "Team B's assign flow shows Team A's players" kept happening even after
// the assign page's own roster fetch was correctly scoped to
// blueprint.team_id: the blueprint being opened was never Team B's to begin
// with.
//
// Fix: list() now always calls getBlueprintsByTeam(team.id), the same
// query assistant coaches already used — this test locks that in by
// covering getBlueprintsByTeam directly against a fixture where one coach
// owns blueprints on two different teams.
//
// Dummy Supabase env vars so requiring blueprintService.js (which
// constructs a client at module load time via ../config/supabase) doesn't
// throw when no real .env is loaded.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

// ─── Minimal fake Supabase query builder (mirrors teamsService.test.js) ────
class FakeQuery {
  constructor(rows) {
    this.rows = rows.slice()
    this._mode = 'list'
    this._limit = null
  }
  select() { return this }
  eq(col, val) { this.rows = this.rows.filter(r => r[col] === val); return this }
  in(col, vals) { this.rows = this.rows.filter(r => vals.includes(r[col])); return this }
  order(col, { ascending = true } = {}) {
    this.rows = [...this.rows].sort((a, b) => {
      if (a[col] === b[col]) return 0
      const cmp = a[col] > b[col] ? 1 : -1
      return ascending ? cmp : -cmp
    })
    return this
  }
  limit(n) { this._limit = n; return this }
  single() { this._mode = 'single'; return this }
  maybeSingle() { this._mode = 'maybeSingle'; return this }
  then(resolve) {
    let rows = this.rows
    if (this._limit != null) rows = rows.slice(0, this._limit)
    if (this._mode === 'single') {
      return resolve(rows[0] ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116' } })
    }
    if (this._mode === 'maybeSingle') {
      return resolve({ data: rows[0] || null, error: null })
    }
    return resolve({ data: rows, error: null })
  }
}

jest.mock('../config/supabase', () => ({ from: jest.fn() }))
const supabaseAdmin = require('../config/supabase')

const { getBlueprintsByTeam } = require('./blueprintService')

// ─── Fixture: one head coach, two teams, one blueprint each ────────────────
const COACH_ID = 'coach-1'
const TEAM_A_ID = 'team-A'
const TEAM_B_ID = 'team-B'

const BLUEPRINTS = [
  { id: 'bp-a1', title: 'Team A Off-season',  team_id: TEAM_A_ID, coach_id: COACH_ID, num_weeks: 8, created_at: '2026-01-01T00:00:00Z', blueprint_assignments: [] },
  { id: 'bp-b1', title: 'Team B Off-season',  team_id: TEAM_B_ID, coach_id: COACH_ID, num_weeks: 8, created_at: '2026-02-01T00:00:00Z', blueprint_assignments: [{ id: 'a1' }] },
]

beforeEach(() => {
  supabaseAdmin.from.mockImplementation(table => new FakeQuery(table === 'blueprints' ? BLUEPRINTS : []))
})

describe('getBlueprintsByTeam — the query list() now always uses', () => {
  test('a coach viewing Team B gets ONLY Team B\'s blueprints, never Team A\'s (same coach owns both)', async () => {
    const list = await getBlueprintsByTeam(TEAM_B_ID)
    expect(list.map(b => b.id)).toEqual(['bp-b1'])
  })

  test('the same coach viewing Team A gets Team A\'s blueprint only', async () => {
    const list = await getBlueprintsByTeam(TEAM_A_ID)
    expect(list.map(b => b.id)).toEqual(['bp-a1'])
  })

  test('assignment_count is derived per blueprint, not leaked across teams', async () => {
    const list = await getBlueprintsByTeam(TEAM_B_ID)
    expect(list[0].assignment_count).toBe(1)
  })
})
