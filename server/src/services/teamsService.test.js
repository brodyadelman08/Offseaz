'use strict'

// ─── Regression test: multi-team coaches must be scoped to the ACTIVE team ──
//
// Bug: BlueprintDetail.jsx's assign flow (and CoachProfile.jsx's roster/
// coach-list/transfer-ownership/delete-team actions, and CoachAthletes.jsx's
// check-in fetch) called team-scoped endpoints without a `team_id`. Every one
// of those endpoints falls back, when `team_id` is omitted, to
// resolveCoachTeamAndAccess(coachId, null) — which resolves to the coach's
// FIRST (oldest) owned team, not whichever team is actually selected in the
// UI. For a coach with two or more teams, that meant "assign to Team B's
// roster" silently showed and (had the assign endpoints not already scoped
// writes to blueprint.team_id independently) could have acted on Team A's
// athletes instead.
//
// This test drives resolveCoachTeamAndAccess and getTeamSurveys (the actual
// service functions behind GET /api/teams/mine and GET /api/survey/team —
// the endpoint BlueprintDetail.jsx's roster fetch hits) against a fake
// Supabase client with a coach who owns two teams with disjoint rosters, and
// asserts that passing the second team's id returns the second team's data,
// never falls back to the first.
//
// Dummy Supabase env vars so requiring these services (which construct a
// client at module load time via ../config/supabase) doesn't throw when no
// real .env is loaded.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

// ─── Minimal fake Supabase query builder ────────────────────────────────────
// Supports the subset of the fluent API these services actually use:
// .select().eq().eq().in().limit().order().maybeSingle()/.single(), and is
// itself awaitable (thenable) for calls that never terminate the chain
// explicitly (plain `await supabaseAdmin.from(x).select(...).eq(...)`).
class FakeQuery {
  constructor(rows) {
    this.rows = rows.slice()
    this._mode = 'list' // 'list' | 'single' | 'maybeSingle'
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

const { resolveCoachTeamAndAccess } = require('./teamsService')
const { getTeamSurveys } = require('./surveyService')

// ─── Fixture: one coach, two teams, disjoint rosters ────────────────────────
const COACH_ID = 'coach-1'
const TEAM_A = { id: 'team-A', coach_id: COACH_ID, name: 'Varsity (created first)', created_at: '2026-01-01T00:00:00Z' }
const TEAM_B = { id: 'team-B', coach_id: COACH_ID, name: 'JV (created second)',     created_at: '2026-02-01T00:00:00Z' }

const TEAM_MEMBERS = [
  { team_id: TEAM_A.id, athlete_id: 'alice', access_level: 'athlete' }, // Team A roster
  { team_id: TEAM_B.id, athlete_id: 'bob',    access_level: 'athlete' }, // Team B roster
]
const PROFILES = [
  { id: 'alice', full_name: 'Alice (Team A)', avatar_url: null },
  { id: 'bob',   full_name: 'Bob (Team B)',   avatar_url: null },
]
const SURVEY_RESPONSES = []

function buildTables() {
  return {
    teams: [TEAM_A, TEAM_B],
    team_members: TEAM_MEMBERS,
    profiles: PROFILES,
    survey_responses: SURVEY_RESPONSES,
  }
}

beforeEach(() => {
  const tables = buildTables()
  supabaseAdmin.from.mockImplementation(table => new FakeQuery(tables[table] || []))
})

describe('resolveCoachTeamAndAccess — multi-team scoping', () => {
  test('with an explicit team_id, resolves to that team, not the coach\'s first-created team', async () => {
    const { team, accessLevel } = await resolveCoachTeamAndAccess(COACH_ID, TEAM_B.id)
    expect(team.id).toBe(TEAM_B.id)
    expect(accessLevel).toBe('head_coach')
  })

  test('without a team_id, falls back to the first-created team (documents the fallback the bug relied on)', async () => {
    const { team } = await resolveCoachTeamAndAccess(COACH_ID, null)
    expect(team.id).toBe(TEAM_A.id)
  })
})

describe('getTeamSurveys — the roster query behind the blueprint-assign flow', () => {
  test('coach with two teams, viewing Team B: assign-flow roster contains ONLY Team B athletes', async () => {
    const roster = await getTeamSurveys(COACH_ID, TEAM_B.id)
    const ids = roster.map(a => a.id)
    expect(ids).toEqual(['bob'])
    expect(ids).not.toContain('alice')
  })

  test('the same coach viewing Team A gets Team A athletes only', async () => {
    const roster = await getTeamSurveys(COACH_ID, TEAM_A.id)
    expect(roster.map(a => a.id)).toEqual(['alice'])
  })

  test('a team_id the coach does not own is rejected, not silently redirected to their own team', async () => {
    await expect(getTeamSurveys(COACH_ID, 'someone-elses-team')).rejects.toMatchObject({ status: 403 })
  })
})
