import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import SessionDescription from '../components/SessionDescription'
import AvatarUpload from '../components/AvatarUpload'
import { LockIcon } from '../components/Icons'
import { useCoachAccess } from '../context/CoachAccessContext'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const GREEN  = '#2e7d32'

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function BlueprintDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { team, loading: teamLoading } = useCoachAccess()

  const [blueprint, setBlueprint]     = useState(null)
  const [assignments, setAssignments] = useState([])
  const [athletes, setAthletes]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [expandedWeek, setExpandedWeek] = useState(1)

  // Bulk assign state
  const [checked, setChecked]                 = useState(new Set())
  const [startsOn, setStartsOn]               = useState(today())
  const [posFilter, setPosFilter]             = useState('all')
  const [onlyUnassigned, setOnlyUnassigned]   = useState(false)
  const [assigning, setAssigning]             = useState(false)
  const [assignError, setAssignError]         = useState('')
  const [assignSuccess, setAssignSuccess]     = useState('')
  const [locking, setLocking]                 = useState(false)

  // Athletes on this blueprint's team who already have an active
  // coach-assigned plan (any blueprint, not just this one) — reassigning
  // one replaces their current plan and resets them to week 1, so checking
  // any of these athletes and assigning needs a warning gate first. See
  // getTeamActivePlanAthleteIds() in blueprintService.js.
  const [activePlanIds, setActivePlanIds]     = useState(new Set())
  // True while the reassign-warning modal is up, gating handleBulkAssign.
  const [showReassignWarning, setShowReassignWarning] = useState(false)

  useEffect(() => {
    // Wait for CoachAccessContext to resolve the active team before ever
    // fetching — firing early with no team_id would let the server fall
    // back to the coach's first team, which can briefly render a different
    // team's blueprint before the correctly-scoped request lands. Same race
    // class fixed on Leaderboard/Accountability/Feed/Messages/Athletes.
    if (teamLoading) return
    api.get(`/api/blueprints/${id}?team_id=${team?.id || ''}`)
      .then(bpRes => {
        setBlueprint(bpRes.data.blueprint)
        setAssignments(bpRes.data.assignments || [])
      })
      .catch(() => {
        // blueprintController.detail() rejects a blueprint whose team_id
        // doesn't match the active team (code: 'wrong_team') rather than
        // serving it — send the coach to the (correctly team-scoped)
        // blueprint list instead of the generic dashboard.
        navigate('/coach/blueprints')
      })
      .finally(() => setLoading(false))
  }, [id, team?.id, teamLoading, navigate])

  // Roster must be scoped to the blueprint's OWN team, not just whatever team
  // is active in the sidebar — assignment always writes against blueprint.team_id
  // (see blueprintController.assign/bulkAssign), so the athlete list shown here
  // has to match that exactly or a coach could see (and think they're assigning
  // to) a roster from a different team than the one this blueprint belongs to.
  useEffect(() => {
    if (!blueprint?.team_id) return
    api.get(`/api/survey/team?team_id=${blueprint.team_id}`)
      .then(teamRes => setAthletes(teamRes.data.athletes || []))
      .catch(() => setAthletes([]))
    api.get(`/api/blueprints/active-plan-athletes?team_id=${blueprint.team_id}`)
      .then(res => setActivePlanIds(new Set(res.data.athlete_ids || [])))
      .catch(() => setActivePlanIds(new Set()))
  }, [blueprint?.team_id])

  // Athletes already individually assigned this blueprint
  const assignedSet = useMemo(
    () => new Set(assignments.filter(a => a.athlete_id).map(a => a.athlete_id)),
    [assignments]
  )

  // How many of the currently-checked athletes already have an active
  // coach-assigned plan — drives the reassign-warning gate below.
  const reassignAffectedCount = useMemo(() => {
    let n = 0
    for (const id of checked) if (activePlanIds.has(id)) n++
    return n
  }, [checked, activePlanIds])

  // Unique positions from athlete surveys (preserves insertion order)
  const uniquePositions = useMemo(() => {
    const seen = new Set()
    const out  = []
    for (const a of athletes) {
      const p = a.survey?.position
      if (p && !seen.has(p)) { seen.add(p); out.push(p) }
    }
    return out
  }, [athletes])

  // Athletes visible given current filters
  const filteredAthletes = useMemo(() => athletes.filter(a => {
    if (posFilter !== 'all' && a.survey?.position !== posFilter) return false
    if (onlyUnassigned && assignedSet.has(a.id)) return false
    return true
  }), [athletes, posFilter, onlyUnassigned, assignedSet])

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleLockToggle() {
    if (locking) return
    setLocking(true)
    try {
      const res = await api.patch(`/api/blueprints/${id}/lock`, { locked: !blueprint.locked })
      setBlueprint(res.data.blueprint)
    } catch (err) {
      console.error('Lock toggle failed:', err)
    } finally {
      setLocking(false)
    }
  }

  function toggleCheck(athleteId) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(athleteId)) next.delete(athleteId)
      else next.add(athleteId)
      return next
    })
  }

  function selectAll() {
    setChecked(prev => {
      const next = new Set(prev)
      for (const a of filteredAthletes) next.add(a.id)
      return next
    })
  }

  function clearAll() {
    setChecked(new Set())
  }

  async function handleBulkAssign() {
    if (checked.size === 0 || assigning) return
    setAssignError('')
    setAssignSuccess('')
    setAssigning(true)
    try {
      await api.post(`/api/blueprints/${id}/assign-bulk`, {
        athlete_ids: [...checked],
        starts_on: startsOn,
        team_id: team?.id,
      })
      const count = checked.size
      setAssignSuccess(`Plan assigned to ${count} athlete${count === 1 ? '' : 's'} — they'll see it in their feed and dashboard.`)
      setChecked(new Set())
      const res = await api.get(`/api/blueprints/${id}?team_id=${team?.id || ''}`)
      setAssignments(res.data.assignments || [])
      // Re-fetch: everyone just checked is now on this plan, and this
      // blueprint itself may have just become someone's "active plan" for
      // the next reassignment they're part of.
      if (blueprint?.team_id) {
        api.get(`/api/blueprints/active-plan-athletes?team_id=${blueprint.team_id}`)
          .then(r => setActivePlanIds(new Set(r.data.athlete_ids || [])))
          .catch(() => {})
      }
    } catch (err) {
      setAssignError(err.response?.data?.error || 'Assignment failed.')
    } finally {
      setAssigning(false)
    }
  }

  // Entry point for the "Assign to N athletes" button — gates the real
  // assign call behind a warning whenever any checked athlete already has
  // an active coach-assigned plan, since assigning replaces that plan and
  // resets their week progress to 1 (see getTeamActivePlanAthleteIds).
  // Athletes with no existing plan skip straight to the normal assign.
  function handleAssignClick() {
    if (checked.size === 0 || assigning) return
    if (reassignAffectedCount > 0) {
      setShowReassignWarning(true)
    } else {
      handleBulkAssign()
    }
  }

  function confirmReassign() {
    setShowReassignWarning(false)
    handleBulkAssign()
  }

  if (loading) return (
    <div style={s.container}>
      <div className="skeleton" style={{ width: 220, height: 24, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: 140, height: 14, marginBottom: 24 }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 10 }}>
          <div className="skeleton" style={{ width: 100, height: 13, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: '100%', height: 32, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  )
  if (!blueprint) return null

  const allFilteredSelected =
    filteredAthletes.length > 0 && filteredAthletes.every(a => checked.has(a.id))

  return (
    <div style={s.container}>
      <button style={s.backLink} onClick={() => navigate('/coach/blueprints')}>
        ← Blueprints
      </button>

      {/* ── Title ── */}
      <div style={s.titleRow}>
        <div style={{ flex: 1 }}>
          <p style={s.breadcrumb}>Blueprint</p>
          <h1 style={s.pageTitle}>{blueprint.title}</h1>
          {blueprint.description && <p style={s.pageDesc}>{blueprint.description}</p>}
          <p style={s.meta}>{blueprint.num_weeks} {blueprint.num_weeks === 1 ? 'week' : 'weeks'}</p>
        </div>
        <div style={s.lockWrap}>
          {blueprint.locked && (
            <span style={s.lockedBadge}><LockIcon size={13} color="#c73820" /> Locked</span>
          )}
          <button
            style={{ ...s.lockBtn, ...(blueprint.locked ? s.lockBtnUnlock : {}) }}
            onClick={handleLockToggle}
            disabled={locking}
          >
            {locking ? '…' : blueprint.locked ? 'Unlock plan' : 'Lock plan'}
          </button>
        </div>
      </div>

      {/* ── Weeks accordion ── */}
      <div style={s.card}>
        <p style={s.cardLabel}>Plan Content</p>
        {blueprint.weeks.map(week => (
          <div key={week.week_number} style={s.weekBlock}>
            <button
              style={s.weekToggle}
              onClick={() => setExpandedWeek(expandedWeek === week.week_number ? null : week.week_number)}
            >
              <span style={s.weekLabel}>Week {week.week_number}</span>
              {week.objective && <span style={s.weekObjective}>{week.objective}</span>}
              <span style={s.weekChevron}>{expandedWeek === week.week_number ? '▲' : '▼'}</span>
            </button>

            {expandedWeek === week.week_number && (
              <div style={s.weekContent}>
                {week.sessions.length === 0 ? (
                  <p style={s.emptyNote}>No sessions added for this week.</p>
                ) : (
                  week.sessions.map((sess, si) => (
                    <div key={si} style={s.sessionCard}>
                      <div style={s.sessionMeta}>
                        <span style={s.sessionDay}>{sess.day || `Session ${si + 1}`}</span>
                        <span style={s.sessionFocus}>{sess.focus}</span>
                      </div>
                      {sess.description && (
                        <SessionDescription description={sess.description} focus={sess.focus} injuryModified={sess.injury_modified} warmup={sess.warmup} style={s.sessionDesc} />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Bulk Assign Panel ── */}
      <div style={{ ...s.card, marginTop: 16 }}>
        <p style={s.cardLabel}>Assign to Athletes</p>

        {athletes.length === 0 ? (
          <p style={s.emptyNote}>No athletes on your team yet.</p>
        ) : (
          <>
            {/* Filter pills */}
            <div style={s.filterBar}>
              <button
                style={{ ...s.filterPill, ...(posFilter === 'all' ? s.filterPillActive : {}) }}
                onClick={() => setPosFilter('all')}
              >
                All
              </button>
              {uniquePositions.map(pos => (
                <button
                  key={pos}
                  style={{ ...s.filterPill, ...(posFilter === pos ? s.filterPillActive : {}) }}
                  onClick={() => setPosFilter(prev => prev === pos ? 'all' : pos)}
                >
                  {pos}
                </button>
              ))}
              <button
                style={{ ...s.filterPill, ...(onlyUnassigned ? s.filterPillBlue : {}) }}
                onClick={() => setOnlyUnassigned(p => !p)}
              >
                {onlyUnassigned ? '✓ ' : ''}Unassigned only
              </button>
            </div>

            {/* Roster checklist */}
            <div style={s.rosterList}>
              {filteredAthletes.length === 0 ? (
                <p style={s.emptyNote}>No athletes match this filter.</p>
              ) : (
                filteredAthletes.map(a => {
                  const isChecked  = checked.has(a.id)
                  const isAssigned = assignedSet.has(a.id)
                  const pos        = a.survey?.position
                  return (
                    <button
                      key={a.id}
                      style={{
                        ...s.athleteRow,
                        background: isChecked ? 'rgba(247,87,9,0.07)' : 'transparent',
                      }}
                      onClick={() => toggleCheck(a.id)}
                    >
                      {/* Checkbox */}
                      <div style={{ ...s.checkbox, ...(isChecked ? s.checkboxOn : {}) }}>
                        {isChecked && <span style={s.checkmark}>✓</span>}
                      </div>

                      {/* Avatar */}
                      <AvatarUpload
                        name={a.full_name}
                        avatarUrl={a.avatar_url}
                        size={32}
                        color={ORANGE}
                        editable={false}
                      />

                      {/* Name + position */}
                      <div style={s.athleteInfo}>
                        <span style={s.athleteName}>{a.full_name || '—'}</span>
                        {pos && <span style={s.posBadge}>{pos}</span>}
                      </div>

                      {/* Already-assigned badge */}
                      {isAssigned && <span style={s.assignedBadge}>Assigned ✓</span>}
                    </button>
                  )
                })
              )}
            </div>

            {/* Select-all row */}
            <div style={s.selectRow}>
              <button
                style={s.selectAllBtn}
                onClick={allFilteredSelected ? clearAll : selectAll}
              >
                {allFilteredSelected
                  ? 'Deselect All'
                  : `Select All (${filteredAthletes.length})`
                }
              </button>
              {checked.size > 0 && (
                <span style={s.selectedCount}>{checked.size} selected</span>
              )}
            </div>

            {/* Start date */}
            <div style={{ marginTop: 16 }}>
              <label style={s.inputLabel}>Start date</label>
              <input
                style={s.dateInput}
                type="date"
                value={startsOn}
                onChange={e => setStartsOn(e.target.value)}
              />
            </div>

            {assignError   && <div style={{ ...s.feedbackBox, ...s.errorBox }}>{assignError}</div>}
            {assignSuccess && <div style={{ ...s.feedbackBox, ...s.successBox }}>{assignSuccess}</div>}

            <button
              style={{
                ...s.primaryBtn,
                marginTop: 16,
                opacity: checked.size === 0 || assigning ? 0.5 : 1,
                cursor:  checked.size === 0 || assigning ? 'not-allowed' : 'pointer',
              }}
              onClick={handleAssignClick}
              disabled={checked.size === 0 || assigning}
            >
              {assigning
                ? 'Assigning…'
                : checked.size === 0
                  ? 'Select athletes to assign'
                  : `Assign to ${checked.size} athlete${checked.size === 1 ? '' : 's'} →`
              }
            </button>
          </>
        )}

        {/* ── Current assignments list ── */}
        {assignments.length > 0 && (
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <p style={s.assignedLabel}>Current assignments</p>
            {assignments.map(a => (
              <div key={a.id} style={s.assignmentRow}>
                <span style={s.assignmentWho}>
                  {a.profiles?.full_name || a.teams?.name || '—'}
                  <span style={s.assignmentType}>
                    {a.athlete_id ? ' (individual)' : ' (team)'}
                  </span>
                </span>
                <span style={s.assignmentDate}>Starts {a.starts_on}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reassignment warning ── */}
      {showReassignWarning && (
        <div style={s.modalOverlay} onClick={() => setShowReassignWarning(false)}>
          <div style={s.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalHeadline}>Reassign this plan?</h3>
            <p style={s.modalBody}>
              {reassignAffectedCount} of these athlete{reassignAffectedCount === 1 ? '' : 's'} already {reassignAffectedCount === 1 ? 'has' : 'have'} an active plan.
              Assigning this will replace their current plan and reset them to week 1.
            </p>
            <div style={s.modalBtnRow}>
              <button style={s.modalCancelBtn} onClick={() => setShowReassignWarning(false)}>
                Cancel
              </button>
              <button style={s.modalConfirmBtn} onClick={confirmReassign}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  center:    { color: 'var(--text-3)', fontSize: 15 },
  container: { maxWidth: 740, margin: '0 auto' },

  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 13, fontWeight: 500, color: 'var(--text-2)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px',
  },

  titleRow: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  lockWrap:  { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' },
  lockedBadge: {
    fontSize: 12, fontWeight: 700, color: '#b45309',
    background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, padding: '3px 10px',
  },
  lockBtn: {
    padding: '8px 18px', fontSize: 13, fontWeight: 700, borderRadius: 10,
    border: `1px solid ${ORANGE}`, background: 'transparent', color: ORANGE, cursor: 'pointer',
    transition: 'background 0.15s, box-shadow 0.15s',
  },
  lockBtnUnlock: { borderColor: GREEN, color: GREEN },
  breadcrumb: { fontSize: 12, fontWeight: 600, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 6px' },
  pageTitle:  { fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  pageDesc:   { color: 'var(--text-2)', fontSize: 15, marginBottom: 4 },
  meta:       { color: 'var(--text-3)', fontSize: 13 },

  card: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  cardLabel: { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 16px' },

  // Plan content
  weekBlock:     { borderBottom: '1px solid var(--border-light)' },
  weekToggle:    { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  weekLabel:     { fontSize: 14, fontWeight: 700, color: 'var(--text)', minWidth: 60 },
  weekObjective: { flex: 1, fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  weekChevron:   { fontSize: 11, color: 'var(--text-3)' },
  weekContent:   { paddingBottom: 12 },
  sessionCard:   { background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.14)' },
  sessionMeta:   { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  sessionDay:    { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase' },
  sessionFocus:  { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  sessionDesc:   { fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 },
  emptyNote:     { color: 'var(--text-3)', fontSize: 14, padding: '10px 0', margin: 0 },

  // Filter bar
  filterBar: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  filterPill: {
    padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 20,
    border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)',
    cursor: 'pointer', transition: 'all 0.13s',
  },
  filterPillActive: { background: 'rgba(247,87,9,0.12)', borderColor: `${ORANGE}88`, color: ORANGE },
  filterPillBlue:   { background: 'rgba(48,142,189,0.12)', borderColor: `${BLUE}88`, color: BLUE },

  // Roster list
  rosterList: {
    display: 'flex', flexDirection: 'column', gap: 2,
    maxHeight: 340, overflowY: 'auto',
    marginBottom: 4,
    // Subtle inner scroll shadow
    borderRadius: 10,
  },
  athleteRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '9px 10px', borderRadius: 10,
    border: 'none', cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.12s', width: '100%',
  },

  // Checkbox
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    border: '2px solid var(--border)', background: 'transparent',
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.12s',
  },
  checkboxOn: { background: ORANGE, borderColor: ORANGE },
  checkmark:  { fontSize: 11, color: '#fff', fontWeight: 700, lineHeight: 1, userSelect: 'none' },

  // Athlete row content
  athleteInfo: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
    overflow: 'hidden', minWidth: 0,
  },
  athleteName: {
    fontSize: 14, fontWeight: 600, color: 'var(--text)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  posBadge: {
    fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
    background: 'var(--card-inner)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0,
  },
  assignedBadge: {
    fontSize: 11, fontWeight: 700, color: '#2e7d32',
    background: 'rgba(46,125,50,0.12)', border: '1px solid rgba(76,175,80,0.35)',
    borderRadius: 6, padding: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap',
  },

  // Select all row
  selectRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 },
  selectAllBtn: {
    padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8,
    border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)',
    cursor: 'pointer', transition: 'border-color 0.13s',
  },
  selectedCount: { fontSize: 12, color: ORANGE, fontWeight: 700 },

  // Form
  inputLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 },
  dateInput: {
    padding: '10px 14px', fontSize: 14, borderRadius: 10,
    border: '1px solid var(--input-border)', background: 'var(--input-bg)',
    color: 'var(--text)', width: '100%', boxSizing: 'border-box', outline: 'none',
  },
  primaryBtn: {
    padding: '11px 24px', fontSize: 14, fontWeight: 700, borderRadius: 10,
    border: 'none', background: ORANGE, color: '#fff',
    letterSpacing: 0.2, boxShadow: '0 2px 10px rgba(247,87,9,0.32)',
    display: 'inline-block',
  },
  feedbackBox: { borderRadius: 10, padding: '10px 14px', fontSize: 13, marginTop: 12 },
  errorBox:   { background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820' },
  successBox: { background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(76,175,80,0.3)', color: '#2e7d32' },

  // Existing assignments list
  assignedLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 0 },
  assignmentRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderTop: '1px solid var(--border-light)', fontSize: 14,
  },
  assignmentWho:  { fontWeight: 600, color: 'var(--text)' },
  assignmentType: { fontWeight: 400, color: 'var(--text-3)' },
  assignmentDate: { color: 'var(--text-3)', fontSize: 13 },

  // Reassignment warning modal
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 9500,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
    padding: '28px 26px', maxWidth: 380, width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  modalHeadline: {
    fontSize: 18, fontWeight: 700, color: 'var(--text)',
    margin: '0 0 12px', textAlign: 'center',
  },
  modalBody: {
    fontSize: 14, color: 'var(--text-2)', textAlign: 'center',
    margin: '0 0 22px', lineHeight: 1.55,
  },
  modalBtnRow: { display: 'flex', gap: 10 },
  modalCancelBtn: {
    flex: 1, padding: '11px 0', background: 'transparent',
    border: '1.5px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  modalConfirmBtn: {
    flex: 1, padding: '11px 0', background: ORANGE, border: 'none',
    borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },
}
