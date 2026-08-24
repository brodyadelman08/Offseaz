'use strict'

// ─── Regression test: a coach must be viewing the SAME team a blueprint
// belongs to — owning it is not enough ───────────────────────────────────────
//
// The actual bug behind "Team B's assign flow shows Team A's players" (after
// #29 fixed the roster fetch itself and #30 fixed the blueprint list) was
// that detail()/assign()/bulkAssign() authorized a head coach with
// `isOwner || isSameTeam` — and a head coach owns every blueprint across ALL
// of their teams, so `isOwner` alone let them open, view, and assign a
// blueprint belonging to a team OTHER than the one currently active,
// whenever a stale list render, a bookmark, or browser back/forward put them
// on that blueprint's URL. Every downstream fetch (roster included) was then
// scoped correctly to that blueprint's real team — just not the coach's
// active one.
//
// Fix: require blueprint.team_id === the resolved (active) team's id,
// unconditionally. This test drives detail()/assign()/bulkAssign() through
// the real controller + service layers (only supabaseAdmin is mocked) with
// a head coach who owns two teams, and asserts a blueprint from the
// inactive team is rejected outright rather than served or written to.
//
// Dummy Supabase env vars so requiring these modules (which construct a
// client at module load time via ../config/supabase) doesn't throw when no
// real .env is loaded.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

// ─── Minimal fake Supabase query builder, shared shape with the other
// service tests, extended with .insert() since bulkAssign writes rows ──────
class FakeQuery {
  constructor(table, db) {
    this.table = table
    this.db = db
    this.rows = (db[table] || []).slice()
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
  insert(rowsToInsert) {
    const arr = (Array.isArray(rowsToInsert) ? rowsToInsert : [rowsToInsert])
      .map((r, i) => ({ id: `${this.table}-generated-${this.db[this.table]?.length || 0}-${i}`, ...r }))
    if (!this.db[this.table]) this.db[this.table] = []
    this.db[this.table].push(...arr)
    this.rows = arr
    return this
  }
  update() { return this } // not exercised by these tests
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

const { create, detail, assign, bulkAssign } = require('./blueprintController')

// ─── Fixture: one head coach, two teams, one blueprint per team ────────────
const COACH_ID = 'coach-1'
const TEAM_A_ID = 'team-A' // NOT active in these tests
const TEAM_B_ID = 'team-B' // the coach's active team

function freshDb() {
  return {
    profiles: [{ id: COACH_ID, role: 'coach' }],
    teams: [
      { id: TEAM_A_ID, coach_id: COACH_ID, name: 'Team A' },
      { id: TEAM_B_ID, coach_id: COACH_ID, name: 'Team B' },
    ],
    team_members: [
      { team_id: TEAM_B_ID, athlete_id: 'bob', access_level: 'athlete' }, // only on Team B
    ],
    blueprints: [
      { id: 'bp-a1', title: 'Team A Plan', coach_id: COACH_ID, team_id: TEAM_A_ID, num_weeks: 4, locked: false },
      { id: 'bp-b1', title: 'Team B Plan', coach_id: COACH_ID, team_id: TEAM_B_ID, num_weeks: 4, locked: false },
    ],
    blueprint_weeks: [],
    blueprint_assignments: [],
    team_posts: [],
  }
}

function mockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.send = jest.fn().mockReturnValue(res)
  return res
}

let db
beforeEach(() => {
  db = freshDb()
  supabaseAdmin.from.mockImplementation(table => new FakeQuery(table, db))
})

// ─── Regression test: create() must land the new blueprint under the
// caller's ACTIVE team, not silently their first-created one ───────────────
//
// Bug found right after the above fix shipped: BlueprintBuilder.jsx never
// sent team_id when saving, so create() always fell back to the coach's
// first-created team regardless of which team was active in the builder.
// Before this fix's detail()/assign()/bulkAssign() change, that mismatch
// was invisible (the isOwner bypass tolerated it) — so a coach building a
// blueprint from Team B silently got a Team A blueprint back and could
// still open it. Once isOwner was removed, the immediate post-save
// redirect into the new blueprint started hitting the SAME strict
// active-team check and got rejected — which read as "saving does
// nothing" even though a (wrongly-scoped) row really was created.
describe('create() — must land under the caller\'s active team, not their first-created one', () => {
  function validPayload(extra = {}) {
    return {
      title: 'New Plan', description: null, num_weeks: 1,
      weeks: [{ week_number: 1, objective: '', sessions: [] }],
      ...extra,
    }
  }

  test('a coach whose active team is Team B (not their first team) gets the blueprint created under Team B when team_id is sent', async () => {
    const req = { body: validPayload({ team_id: TEAM_B_ID }), query: {}, user: { id: COACH_ID } }
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    const created = db.blueprints.find(b => b.title === 'New Plan')
    expect(created.team_id).toBe(TEAM_B_ID)
  })

  test('team_id also works via query string, matching how list()/detail() take it', async () => {
    const req = { body: validPayload(), query: { team_id: TEAM_B_ID }, user: { id: COACH_ID } }
    const res = mockRes()
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(db.blueprints.find(b => b.title === 'New Plan').team_id).toBe(TEAM_B_ID)
  })
})

describe('detail() — must match the active team, not just be owned by the coach', () => {
  test('a Team A blueprint is rejected while Team B is active, even though the coach owns it', async () => {
    const req = { params: { id: 'bp-a1' }, query: { team_id: TEAM_B_ID }, user: { id: COACH_ID } }
    const res = mockRes()
    await detail(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'wrong_team' }))
  })

  test('the Team B blueprint IS served while Team B is active', async () => {
    const req = { params: { id: 'bp-b1' }, query: { team_id: TEAM_B_ID }, user: { id: COACH_ID } }
    const res = mockRes()
    await detail(req, res)
    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      blueprint: expect.objectContaining({ id: 'bp-b1' }),
    }))
  })
})

describe('assign() — same guard on the single-athlete assign path', () => {
  test('rejects assigning a Team A blueprint while Team B is active', async () => {
    const req = {
      params: { id: 'bp-a1' },
      body: { assign_to: 'athlete', athlete_id: 'bob', team_id: TEAM_B_ID },
      query: {},
      user: { id: COACH_ID },
    }
    const res = mockRes()
    await assign(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'wrong_team' }))
    expect(db.blueprint_assignments).toHaveLength(0)
  })
})

describe('bulkAssign() — same guard on the bulk-assign path used by the assign UI', () => {
  test('rejects assigning a Team A blueprint to athletes while Team B is active — no write happens', async () => {
    const req = {
      params: { id: 'bp-a1' },
      body: { athlete_ids: ['bob'], team_id: TEAM_B_ID },
      query: {},
      user: { id: COACH_ID },
    }
    const res = mockRes()
    await bulkAssign(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'wrong_team' }))
    expect(db.blueprint_assignments).toHaveLength(0)
  })

  test('the Team B blueprint CAN be bulk-assigned to Team B athletes while Team B is active', async () => {
    const req = {
      params: { id: 'bp-b1' },
      body: { athlete_ids: ['bob'], team_id: TEAM_B_ID },
      query: {},
      user: { id: COACH_ID },
    }
    const res = mockRes()
    await bulkAssign(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(db.blueprint_assignments).toHaveLength(1)
    expect(db.blueprint_assignments[0].athlete_id).toBe('bob')
  })
})
