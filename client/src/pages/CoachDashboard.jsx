import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Wordmark } from '../components/Wordmark'
import api from '../services/api'

const ORANGE = '#F75709'

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
  const { mode, toggle } = useTheme()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [athletes, setAthletes] = useState([])
  const [blueprints, setBlueprints] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

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

  function handleCopy() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inviteLink = team ? `${window.location.origin}/join/${team.invite_code}` : null
  const completedCount = athletes.filter(a => a.survey).length

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Wordmark size={22} />
          <span style={styles.roleChip}>Coach</span>
        </div>
        <div style={styles.headerRight}>
          <button onClick={toggle} style={styles.iconBtn} title="Toggle theme">
            {mode === 'dark' ? '☀' : '☾'}
          </button>
          <button onClick={signOut} style={styles.signOutBtn}>Sign out</button>
        </div>
      </div>

      <div style={styles.welcome}>
        <h1 style={styles.welcomeTitle}>
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Coach'} 👋
        </h1>
        <p style={styles.welcomeSub}>Here's what's happening with your team.</p>
      </div>

      {team && (
        <div style={styles.navRow}>
          <button style={styles.navBtn} onClick={() => navigate('/accountability')}>
            📊 Accountability
          </button>
          <button style={styles.navBtn} onClick={() => navigate('/messages')}>
            💬 Messages
          </button>
        </div>
      )}

      {loading ? (
        <p style={styles.loadingText}>Loading…</p>
      ) : team ? (
        <>
          {/* Team card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardLabel}>Your Team</p>
                <h2 style={styles.teamName}>{team.name}</h2>
              </div>
            </div>
            <p style={styles.fieldLabel}>Invite link</p>
            <div style={styles.inviteBox}>
              <span style={styles.inviteText}>{inviteLink}</span>
              <button style={styles.copyBtn} onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Athletes table */}
          <div style={{ ...styles.card, marginTop: 16 }}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.cardLabel}>Athletes</p>
                {athletes.length > 0 && (
                  <p style={styles.surveyCount}>{completedCount} of {athletes.length} surveyed</p>
                )}
              </div>
            </div>

            {athletes.length === 0 ? (
              <p style={styles.empty}>No athletes yet. Share your invite link to get started.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Athlete</th>
                      <th style={styles.th}>Sport</th>
                      <th style={styles.th}>Position</th>
                      <th style={styles.th}>Goals</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Days/wk</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {athletes.map(a => (
                      <tr
                        key={a.id}
                        style={styles.tr}
                        onClick={() => navigate(`/athletes/${a.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--border-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ ...styles.td, fontWeight: 600 }}>{a.full_name}</td>
                        <td style={styles.td}>{a.survey?.sport || '—'}</td>
                        <td style={styles.td}>{a.survey?.position || '—'}</td>
                        <td style={{ ...styles.td, maxWidth: 200 }}>{truncate(a.survey?.goals)}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{a.survey?.time_per_week ?? '—'}</td>
                        <td style={styles.td}>
                          {a.survey ? (
                            <span style={styles.badgeComplete}>
                              ✓ Complete{isNew(a.survey.completed_at) && <span style={styles.newBadge}>New</span>}
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

          {/* Blueprints */}
          <div style={{ ...styles.card, marginTop: 16 }}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.cardLabel}>Blueprints</p>
              </div>
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
                    onMouseEnter={e => e.currentTarget.style.borderColor = ORANGE}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
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

          {/* Recent Activity */}
          <div style={{ ...styles.card, marginTop: 16 }}>
            <p style={styles.cardLabel}>Recent Activity</p>
            {activityLogs.length === 0 ? (
              <p style={styles.empty}>No sessions logged yet.</p>
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
        /* Create team */
        <div style={styles.card}>
          <p style={styles.cardLabel}>Get Started</p>
          <h2 style={styles.createTeamTitle}>Create your team</h2>
          <p style={styles.createTeamDesc}>Set up your team to start adding athletes and building training plans.</p>
          {error && <div style={styles.errorBox}>{error}</div>}
          <form onSubmit={handleCreateTeam} style={styles.form}>
            <input
              style={styles.input}
              type="text"
              placeholder="Team name (e.g. Westview Varsity Football)"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              required
            />
            <button style={styles.primaryBtn} type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create team →'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 900, margin: '0 auto', padding: '0 20px 60px' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 32 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  roleChip: { fontSize: 11, fontWeight: 700, background: ORANGE, color: '#fff', padding: '3px 8px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  iconBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 34, height: 34, fontSize: 14, cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  signOutBtn: { fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 500 },

  welcome: { marginBottom: 24 },
  welcomeTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  welcomeSub: { fontSize: 14, color: 'var(--text-2)' },

  navRow: { display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' },
  navBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 14, fontWeight: 600, borderRadius: 8, border: `2px solid ${ORANGE}`, background: 'transparent', color: ORANGE, cursor: 'pointer' },

  loadingText: { color: 'var(--text-3)', fontSize: 15 },

  card: { background: 'var(--card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardLabel: { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 4px' },
  teamName: { fontSize: 20, fontWeight: 700, color: 'var(--text)' },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 16 },
  inviteBox: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' },
  inviteText: { flex: 1, fontSize: 13, color: 'var(--text-2)', wordBreak: 'break-all', fontFamily: 'monospace' },
  copyBtn: { fontSize: 13, padding: '5px 12px', borderRadius: 6, border: `1px solid ${ORANGE}`, background: 'transparent', color: ORANGE, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 },

  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  surveyCount: { fontSize: 13, color: 'var(--text-3)', margin: 0 },
  createBtn: { fontSize: 13, padding: '8px 14px', borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' },

  empty: { color: 'var(--text-3)', fontSize: 14 },

  tableWrapper: { overflowX: 'auto', margin: '0 -4px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '8px 12px', fontWeight: 700, fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 0.1s' },
  td: { padding: '11px 12px', color: 'var(--text)', verticalAlign: 'top' },
  badgeComplete: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 5 },
  newBadge: { background: ORANGE, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3, marginLeft: 4 },
  badgePending: { background: 'var(--border)', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 5 },

  blueprintGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  blueprintCard: { display: 'flex', flexDirection: 'column', gap: 6, padding: 16, borderRadius: 10, border: '2px solid var(--border)', background: 'var(--card-inner)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' },
  bpTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  bpMeta: { fontSize: 12, color: 'var(--text-3)' },

  activityList: { display: 'flex', flexDirection: 'column' },
  activityRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)', gap: 12 },
  activityLeft: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 },
  activityName: { fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' },
  activityFocus: { fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  activityWeek: { fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' },
  activityRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  activityBadge: { fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' },
  activityTime: { fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' },

  createTeamTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  createTeamDesc: { fontSize: 14, color: 'var(--text-2)', marginBottom: 24 },
  errorBox: { background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { width: '100%', padding: '11px 14px', fontSize: 15, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' },
  primaryBtn: { padding: '11px 0', fontSize: 15, fontWeight: 700, borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', letterSpacing: 0.2 },
}
