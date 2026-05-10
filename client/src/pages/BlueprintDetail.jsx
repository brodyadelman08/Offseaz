import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

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

  function today() {
    return new Date().toISOString().split('T')[0]
  }

  useEffect(() => {
    Promise.all([
      api.get(`/api/blueprints/${id}`),
      api.get('/api/survey/team'),
    ]).then(([bpRes, teamRes]) => {
      setBlueprint(bpRes.data.blueprint)
      setAssignments(bpRes.data.assignments || [])
      setAthletes(teamRes.data.athletes || [])
    }).catch(() => navigate('/coach'))
    .finally(() => setLoading(false))
  }, [id, navigate])

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
      // Refresh assignments
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
      <button style={styles.backLink} onClick={() => navigate('/coach')}>← Back to dashboard</button>

      <div style={styles.titleRow}>
        <div>
          <h1 style={styles.pageTitle}>{blueprint.title}</h1>
          {blueprint.description && <p style={styles.pageDesc}>{blueprint.description}</p>}
          <p style={styles.meta}>{blueprint.num_weeks} {blueprint.num_weeks === 1 ? 'week' : 'weeks'}</p>
        </div>
      </div>

      {/* Weeks accordion */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Plan content</h2>
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
                      {s.description && <p style={styles.sessionDesc}>{s.description}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assignment panel */}
      <div style={{ ...styles.card, marginTop: 20 }}>
        <h2 style={styles.sectionTitle}>Assign this plan</h2>

        <form onSubmit={handleAssign} style={styles.assignForm}>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="team"
                checked={assignTo === 'team'}
                onChange={() => setAssignTo('team')}
              />
              Entire team
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="athlete"
                checked={assignTo === 'athlete'}
                onChange={() => setAssignTo('athlete')}
              />
              Specific athlete
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

          <label style={styles.inputLabel}>Start date</label>
          <input
            style={styles.input}
            type="date"
            value={startsOn}
            onChange={e => setStartsOn(e.target.value)}
            required
          />

          {assignError && <p style={styles.error}>{assignError}</p>}
          {assignSuccess && <p style={styles.success}>{assignSuccess}</p>}

          <button style={styles.primaryBtn} type="submit" disabled={assigning}>
            {assigning ? 'Assigning…' : 'Assign plan'}
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
                <span style={styles.assignmentDate}>
                  Starts {a.starts_on}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  center: { display: 'flex', justifyContent: 'center', paddingTop: 120, fontSize: 16 },
  container: { maxWidth: 720, margin: '0 auto', padding: '32px 20px' },
  backLink: { background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'block' },
  titleRow: { marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: 700, marginBottom: 4 },
  pageDesc: { color: '#555', fontSize: 15, marginBottom: 4 },
  meta: { color: '#999', fontSize: 13 },
  card: { background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 10, padding: 24 },
  sectionTitle: { fontSize: 17, fontWeight: 700, marginBottom: 16 },
  weekBlock: { borderBottom: '1px solid #e5e5e5' },
  weekToggle: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  weekLabel: { fontSize: 14, fontWeight: 700, minWidth: 60 },
  weekObjective: { flex: 1, fontSize: 13, color: '#555', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  weekChevron: { fontSize: 11, color: '#aaa' },
  weekContent: { paddingBottom: 12 },
  emptyWeek: { color: '#bbb', fontSize: 13, padding: '8px 0' },
  sessionCard: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, padding: 12, marginBottom: 8 },
  sessionMeta: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  sessionDay: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' },
  sessionFocus: { fontSize: 14, fontWeight: 600 },
  sessionDesc: { fontSize: 13, color: '#555', margin: 0 },
  assignForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  radioGroup: { display: 'flex', gap: 24 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' },
  inputLabel: { fontSize: 13, fontWeight: 600, color: '#444', marginBottom: -4 },
  input: { padding: '10px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' },
  primaryBtn: { padding: '10px 24px', fontSize: 14, fontWeight: 600, borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer', alignSelf: 'flex-start' },
  error: { color: '#c0392b', fontSize: 13 },
  success: { color: '#2e7d32', fontSize: 13 },
  assignedLabel: { fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 },
  assignmentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f0f0f0', fontSize: 14 },
  assignmentWho: { fontWeight: 600 },
  assignmentType: { fontWeight: 400, color: '#888' },
  assignmentDate: { color: '#888', fontSize: 13 },
}
