import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import SessionDescription from '../components/SessionDescription'

const ORANGE = '#F75709'
const GREEN  = '#2e7d32'

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function BlueprintDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [blueprint, setBlueprint] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedWeek, setExpandedWeek] = useState(1)

  const [assignTo, setAssignTo] = useState('team')
  const [athleteId, setAthleteId] = useState('')
  const [startsOn, setStartsOn] = useState(today())
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignSuccess, setAssignSuccess] = useState('')
  const [locking, setLocking] = useState(false)

  useEffect(() => {
    // Blueprint fetch is critical — redirect if it fails
    api.get(`/api/blueprints/${id}`)
      .then(bpRes => {
        setBlueprint(bpRes.data.blueprint)
        setAssignments(bpRes.data.assignments || [])
      })
      .catch(() => navigate('/coach'))
      .finally(() => setLoading(false))

    // Athlete list is only needed for the "assign to specific athlete" dropdown
    // If this fails, the page still works (team-wide assignment is unaffected)
    api.get('/api/survey/team')
      .then(teamRes => setAthletes(teamRes.data.athletes || []))
      .catch(() => {})
  }, [id, navigate])

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

  async function handleAssign(e) {
    e.preventDefault()
    setAssignError('')
    setAssignSuccess('')
    setAssigning(true)
    try {
      await api.post(`/api/blueprints/${id}/assign`, {
        assign_to: assignTo,
        athlete_id: assignTo === 'athlete' ? athleteId : null,
        starts_on: startsOn,
      })
      setAssignSuccess(assignTo === 'team' ? 'Plan assigned to entire team.' : 'Plan assigned to athlete.')
      const res = await api.get(`/api/blueprints/${id}`)
      setAssignments(res.data.assignments || [])
    } catch (err) {
      setAssignError(err.response?.data?.error || 'Assignment failed.')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return <div style={styles.center}>Loading…</div>
  if (!blueprint) return null

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={() => navigate('/coach/blueprints')}>
        ← Blueprints
      </button>

      {/* Blueprint title */}
      <div style={styles.titleRow}>
        <div style={{ flex: 1 }}>
          <p style={styles.breadcrumb}>Blueprint</p>
          <h1 style={styles.pageTitle}>{blueprint.title}</h1>
          {blueprint.description && <p style={styles.pageDesc}>{blueprint.description}</p>}
          <p style={styles.meta}>{blueprint.num_weeks} {blueprint.num_weeks === 1 ? 'week' : 'weeks'}</p>
        </div>
        <div style={styles.lockWrap}>
          {blueprint.locked && (
            <span style={styles.lockedBadge}>🔒 Locked</span>
          )}
          <button
            style={{ ...styles.lockBtn, ...(blueprint.locked ? styles.lockBtnUnlock : {}) }}
            onClick={handleLockToggle}
            disabled={locking}
          >
            {locking ? '…' : blueprint.locked ? 'Unlock plan' : 'Lock plan'}
          </button>
        </div>
      </div>

      {/* Weeks accordion */}
      <div style={styles.card}>
        <p style={styles.cardLabel}>Plan Content</p>
        {blueprint.weeks.map(week => (
          <div key={week.week_number} style={styles.weekBlock}>
            <button
              style={styles.weekToggle}
              onClick={() => setExpandedWeek(expandedWeek === week.week_number ? null : week.week_number)}
            >
              <span style={styles.weekLabel}>Week {week.week_number}</span>
              {week.objective && <span style={styles.weekObjective}>{week.objective}</span>}
              <span style={styles.weekChevron}>{expandedWeek === week.week_number ? '▲' : '▼'}</span>
            </button>

            {expandedWeek === week.week_number && (
              <div style={styles.weekContent}>
                {week.sessions.length === 0 ? (
                  <p style={styles.emptyWeek}>No sessions added for this week.</p>
                ) : (
                  week.sessions.map((s, si) => (
                    <div key={si} style={styles.sessionCard}>
                      <div style={styles.sessionMeta}>
                        <span style={styles.sessionDay}>{s.day || `Session ${si + 1}`}</span>
                        <span style={styles.sessionFocus}>{s.focus}</span>
                      </div>
                      {s.description && <SessionDescription description={s.description} style={styles.sessionDesc} />}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assignment panel */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <p style={styles.cardLabel}>Assign This Plan</p>

        <form onSubmit={handleAssign} style={styles.assignForm}>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="team"
                checked={assignTo === 'team'}
                onChange={() => setAssignTo('team')}
                style={{ accentColor: ORANGE }}
              />
              <span>Entire team</span>
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="athlete"
                checked={assignTo === 'athlete'}
                onChange={() => setAssignTo('athlete')}
                style={{ accentColor: ORANGE }}
              />
              <span>Specific athlete</span>
            </label>
          </div>

          {assignTo === 'athlete' && (
            <select
              style={styles.input}
              value={athleteId}
              onChange={e => setAthleteId(e.target.value)}
              required
            >
              <option value="">Select an athlete…</option>
              {athletes.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          )}

          <div>
            <label style={styles.inputLabel}>Start date</label>
            <input
              style={styles.input}
              type="date"
              value={startsOn}
              onChange={e => setStartsOn(e.target.value)}
              required
            />
          </div>

          {assignError && <div style={styles.errorBox}>{assignError}</div>}
          {assignSuccess && <div style={styles.successBox}>{assignSuccess}</div>}

          <button style={styles.primaryBtn} type="submit" disabled={assigning}>
            {assigning ? 'Assigning…' : 'Assign plan →'}
          </button>
        </form>

        {assignments.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={styles.assignedLabel}>Current assignments</p>
            {assignments.map(a => (
              <div key={a.id} style={styles.assignmentRow}>
                <span style={styles.assignmentWho}>
                  {a.profiles?.full_name || a.teams?.name || '—'}
                  <span style={styles.assignmentType}>
                    {a.athlete_id ? ' (individual)' : ' (team)'}
                  </span>
                </span>
                <span style={styles.assignmentDate}>Starts {a.starts_on}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  center: { color: 'var(--text-3)', fontSize: 15 },
  container: { maxWidth: 740, margin: '0 auto' },

  backLink: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px' },

  titleRow: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  lockWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, paddingTop: 24, flexShrink: 0 },
  lockedBadge: { fontSize: 12, fontWeight: 700, color: '#b45309', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, padding: '3px 10px' },
  lockBtn: { padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: `1px solid ${ORANGE}`, background: 'transparent', color: ORANGE, cursor: 'pointer' },
  lockBtnUnlock: { borderColor: GREEN, color: GREEN },
  breadcrumb: { fontSize: 12, fontWeight: 600, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 6px' },
  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  pageDesc: { color: 'var(--text-2)', fontSize: 15, marginBottom: 4 },
  meta: { color: 'var(--text-3)', fontSize: 13 },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
  cardLabel: { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 16px' },

  weekBlock: { borderBottom: '1px solid var(--border-light)' },
  weekToggle: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  weekLabel: { fontSize: 14, fontWeight: 700, color: 'var(--text)', minWidth: 60 },
  weekObjective: { flex: 1, fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  weekChevron: { fontSize: 11, color: 'var(--text-3)' },
  weekContent: { paddingBottom: 12 },
  emptyWeek: { color: 'var(--text-3)', fontSize: 13, padding: '8px 0' },
  sessionCard: { background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 8 },
  sessionMeta: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  sessionDay: { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase' },
  sessionFocus: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  sessionDesc: { fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 },

  assignForm: { display: 'flex', flexDirection: 'column', gap: 14 },
  radioGroup: { display: 'flex', gap: 24 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: 'var(--text)' },
  inputLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 },
  input: { padding: '10px 14px', fontSize: 14, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', width: '100%', boxSizing: 'border-box', outline: 'none' },
  primaryBtn: { padding: '11px 24px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', alignSelf: 'flex-start', letterSpacing: 0.2 },
  errorBox: { background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820', borderRadius: 8, padding: '10px 14px', fontSize: 13 },
  successBox: { background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#2e7d32', borderRadius: 8, padding: '10px 14px', fontSize: 13 },

  assignedLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  assignmentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border-light)', fontSize: 14 },
  assignmentWho: { fontWeight: 600, color: 'var(--text)' },
  assignmentType: { fontWeight: 400, color: 'var(--text-3)' },
  assignmentDate: { color: 'var(--text-3)', fontSize: 13 },
}
