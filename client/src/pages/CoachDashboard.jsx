import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

function isNew(dateStr) {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const ACTIVITY_STATUS = {
  completed: { label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
  partial:   { label: 'Partial',   color: '#b45309', bg: '#fef3c7' },
  skipped:   { label: 'Skipped',   color: '#888',    bg: '#f0f0f0' },
}

function truncate(str, n = 80) {
  if (!str) return '—'
  return str.length > n ? str.slice(0, n) + '…' : str
}

export default function CoachDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [athletes, setAthletes] = useState([])
  const [blueprints, setBlueprints] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/teams/mine').then(r => r.data.team).catch(() => null),
      api.get('/api/survey/team').then(r => r.data.athletes).catch(() => []),
      api.get('/api/blueprints').then(r => r.data.blueprints).catch(() => []),
      api.get('/api/workouts/team').then(r => r.data.logs).catch(() => []),
    ]).then(([teamData, athletesData, blueprintsData, logsData]) => {
      setTeam(teamData)
      setAthletes(athletesData)
      setBlueprints(blueprintsData)
      setActivityLogs(logsData)
    }).finally(() => setLoading(false))
  }, [])

  async function handleCreateTeam(e) {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const res = await api.post('/api/teams', { name: teamName })
      setTeam(res.data.team)
      setTeamName('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  const inviteLink = team
    ? `${window.location.origin}/join/${team.invite_code}`
    : null

  const completedCount = athletes.filter(a => a.survey).length

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Coach Dashboard</h1>
        <button onClick={signOut} style={styles.signOut}>Sign out</button>
      </div>

      <p style={styles.welcome}>Welcome, {profile?.full_name || 'Coach'}</p>

      {team && (
        <div style={styles.navBtnRow}>
          <button style={styles.accountabilityBtn} onClick={() => navigate('/accountability')}>
            Accountability →
          </button>
          <button style={styles.accountabilityBtn} onClick={() => navigate('/messages')}>
            Messages →
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : team ? (
        <>
          {/* Team card */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>{team.name}</h2>
            <p style={styles.label}>Invite link</p>
            <div style={styles.inviteBox}>
              <span style={styles.inviteText}>{inviteLink}</span>
              <button
                style={styles.copyBtn}
                onClick={() => navigator.clipboard.writeText(inviteLink)}
              >
                Copy
              </button>
            </div>
          </div>

          {/* Athletes table */}
          <div style={{ ...styles.card, marginTop: 20 }}>
            <div style={styles.tableHeader}>
              <h2 style={styles.cardTitle}>Athletes</h2>
              {athletes.length > 0 && (
                <span style={styles.surveyCount}>
                  {completedCount} / {athletes.length} surveyed
                </span>
              )}
            </div>

            {athletes.length === 0 ? (
              <p style={styles.empty}>No athletes have joined yet. Share your invite link to get started.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Athlete</th>
                      <th style={styles.th}>Sport</th>
                      <th style={styles.th}>Position</th>
                      <th style={styles.th}>Goals</th>
                      <th style={styles.th}>Hrs/wk</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {athletes.map(a => (
                      <tr key={a.id} style={{ ...styles.tr, cursor: 'pointer' }} onClick={() => navigate(`/athletes/${a.id}`)}>
                        <td style={styles.td}>{a.full_name}</td>
                        <td style={styles.td}>{a.survey?.sport || '—'}</td>
                        <td style={styles.td}>{a.survey?.position || '—'}</td>
                        <td style={{ ...styles.td, maxWidth: 200 }}>{truncate(a.survey?.goals)}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{a.survey?.time_per_week ?? '—'}</td>
                        <td style={styles.td}>
                          {a.survey ? (
                            <span style={styles.badgeComplete}>
                              Complete{isNew(a.survey.completed_at) && <span style={styles.newDot}> New</span>}
                            </span>
                          ) : (
                            <span style={styles.badgePending}>Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Blueprints section */}
          <div style={{ ...styles.card, marginTop: 20 }}>
            <div style={styles.tableHeader}>
              <h2 style={styles.cardTitle}>Blueprints</h2>
              <button style={styles.createBtn} onClick={() => navigate('/blueprints/new')}>
                + Create blueprint
              </button>
            </div>

            {blueprints.length === 0 ? (
              <p style={styles.empty}>No blueprints yet. Create one to assign training plans to your athletes.</p>
            ) : (
              <div style={styles.blueprintGrid}>
                {blueprints.map(bp => (
                  <button
                    key={bp.id}
                    style={styles.blueprintCard}
                    onClick={() => navigate(`/blueprints/${bp.id}`)}
                  >
                    <span style={styles.bpTitle}>{bp.title}</span>
                    <span style={styles.bpMeta}>
                      {bp.num_weeks} {bp.num_weeks === 1 ? 'week' : 'weeks'}
                      {bp.assignment_count > 0 && ` · ${bp.assignment_count} assigned`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity feed */}
          <div style={{ ...styles.card, marginTop: 20 }}>
            <h2 style={styles.cardTitle}>Recent Activity</h2>
            {activityLogs.length === 0 ? (
              <p style={{ ...styles.empty, marginTop: 12 }}>No sessions logged yet.</p>
            ) : (
              <div style={styles.activityList}>
                {activityLogs.map(log => {
                  const s = ACTIVITY_STATUS[log.status]
                  return (
                    <div key={log.id} style={styles.activityRow}>
                      <div style={styles.activityLeft}>
                        <span style={styles.activityName}>{log.athlete_name}</span>
                        <span style={styles.activityFocus}>{log.session_focus || 'Session'}</span>
                        {log.week_number && (
                          <span style={styles.activityWeek}>Wk {log.week_number}</span>
                        )}
                      </div>
                      <div style={styles.activityRight}>
                        <span style={{ ...styles.activityBadge, color: s.color, background: s.bg }}>
                          {s.label}{log.effort ? ` · ${log.effort}` : ''}
                        </span>
                        <span style={styles.activityTime}>{timeAgo(log.logged_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Create your team</h2>
          {error && <p style={styles.error}>{error}</p>}
          <form onSubmit={handleCreateTeam} style={styles.form}>
            <input
              style={styles.input}
              type="text"
              placeholder="Team name"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              required
            />
            <button style={styles.button} type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create team'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 860, margin: '0 auto', padding: '40px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 700 },
  signOut: { fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' },
  welcome: { color: '#555', marginBottom: 32 },
  card: { background: '#f9f9f9', borderRadius: 10, padding: 24, border: '1px solid #e5e5e5' },
  cardTitle: { fontSize: 18, fontWeight: 600, marginBottom: 0 },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  surveyCount: { fontSize: 13, color: '#888' },
  label: { fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 6, marginTop: 16 },
  inviteBox: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '8px 12px' },
  inviteText: { flex: 1, fontSize: 13, wordBreak: 'break-all' },
  copyBtn: { fontSize: 12, padding: '4px 10px', borderRadius: 4, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' },
  navBtnRow: { display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  accountabilityBtn: { display: 'inline-flex', alignItems: 'center', padding: '10px 18px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: '2px solid #1a1a1a', background: '#1a1a1a', color: '#fff', cursor: 'pointer' },
  createBtn: { fontSize: 13, padding: '7px 14px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '10px 12px', fontSize: 15, borderRadius: 6, border: '1px solid #ccc' },
  button: { padding: '10px 0', fontSize: 15, fontWeight: 600, borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer' },
  error: { color: '#c0392b', fontSize: 13 },
  empty: { color: '#888', fontSize: 14 },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 12, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #e5e5e5', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 12px', color: '#222', verticalAlign: 'top' },
  badgeComplete: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4 },
  newDot: { background: '#2e7d32', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 3 },
  badgePending: { background: '#f0f0f0', color: '#888', fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4 },
  blueprintGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  blueprintCard: { display: 'flex', flexDirection: 'column', gap: 6, padding: 16, borderRadius: 8, border: '1px solid #e5e5e5', background: '#fff', cursor: 'pointer', textAlign: 'left' },
  bpTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a1a' },
  bpMeta: { fontSize: 12, color: '#888' },
  activityList: { display: 'flex', flexDirection: 'column', marginTop: 12 },
  activityRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', gap: 12 },
  activityLeft: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 },
  activityName: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap' },
  activityFocus: { fontSize: 13, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  activityWeek: { fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' },
  activityRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  activityBadge: { fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' },
  activityTime: { fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' },
}
