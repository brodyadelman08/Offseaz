import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { CopyIcon, CheckIcon, UsersIcon, LayoutIcon, BarChartIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const ACCENTS = [ORANGE, BLUE, YELLOW]

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

export default function CoachDashboard() {
  const { profile } = useAuth()
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
  const surveyedCount = athletes.filter(a => a.survey).length

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>
          {profile?.full_name?.split(' ')[0]
            ? `Welcome back, ${profile.full_name.split(' ')[0]}`
            : 'Dashboard'}
        </h1>
        <p style={styles.pageSub}>Here's what's happening with your team.</p>
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading…</p>
      ) : team ? (
        <>
          {/* Stats row */}
          <div style={styles.statsRow}>
            {[
              { Icon: UsersIcon,  val: athletes.length,   label: 'Athletes',   path: '/coach/athletes' },
              { Icon: LayoutIcon, val: blueprints.length,  label: 'Blueprints', path: '/coach/blueprints' },
              { Icon: BarChartIcon, val: surveyedCount,    label: 'Surveyed',   path: '/coach/athletes' },
            ].map(({ Icon, val, label, path }, i) => (
              <button
                key={label}
                style={{ ...styles.statCard, borderLeft: `3px solid ${ACCENTS[i]}` }}
                onClick={() => navigate(path)}
              >
                <Icon size={20} color={ACCENTS[i]} />
                <span style={styles.statVal}>{val}</span>
                <span style={styles.statLabel}>{label}</span>
              </button>
            ))}
          </div>

          {/* Team + invite */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={{ ...styles.cardLabel, color: BLUE }}>Your Team</p>
                <h2 style={styles.teamName}>{team.name}</h2>
              </div>
            </div>
            <p style={styles.fieldLabel}>Invite link</p>
            <div style={styles.inviteBox}>
              <span style={styles.inviteText}>{inviteLink}</span>
              <button style={styles.copyBtn} onClick={handleCopy}>
                {copied
                  ? <><CheckIcon size={13} color={BLUE} /> Copied</>
                  : <><CopyIcon size={13} color={BLUE} /> Copy</>
                }
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ ...styles.card, marginTop: 14 }}>
            <div style={styles.sectionHeader}>
              <p style={{ ...styles.cardLabel, color: YELLOW }}>Recent Activity</p>
              {activityLogs.length > 10 && (
                <button
                  style={styles.viewAllBtn}
                  onClick={() => navigate('/coach/accountability')}
                >
                  View all
                </button>
              )}
            </div>
            {activityLogs.length === 0 ? (
              <p style={styles.empty}>No sessions logged yet.</p>
            ) : (
              <div style={styles.activityList}>
                {activityLogs.slice(0, 10).map(log => {
                  const s = ACTIVITY_STATUS[log.status]
                  return (
                    <div key={log.id} style={styles.activityRow}>
                      <div style={styles.activityLeft}>
                        <span style={styles.activityName}>{log.athlete_name}</span>
                        <span style={styles.activityFocus}>
                          {log.session_focus || 'Session'}
                        </span>
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
          <p style={styles.createTeamDesc}>
            Set up your team to start adding athletes and building training plans.
          </p>
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
              {creating ? 'Creating…' : 'Create team'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 820, margin: '0 auto' },

  pageHeader: { marginBottom: 28 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  pageSub: { fontSize: 14, color: 'var(--text-2)', margin: 0 },
  loadingText: { color: 'var(--text-3)', fontSize: 15 },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '20px 12px',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  statVal: { fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 },
  statLabel: { fontSize: 12, color: 'var(--text-3)', fontWeight: 600 },

  card: {
    background: 'var(--card)',
    borderRadius: 12,
    padding: 24,
    border: '1px solid var(--border)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    margin: '0 0 4px',
  },
  teamName: { fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 0,
  },
  inviteBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
  },
  inviteText: {
    flex: 1,
    fontSize: 13,
    color: 'var(--text-2)',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 13,
    padding: '5px 12px',
    borderRadius: 6,
    border: `1px solid ${BLUE}`,
    background: 'transparent',
    color: BLUE,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontWeight: 600,
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewAllBtn: {
    fontSize: 12,
    fontWeight: 600,
    color: BLUE,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  empty: { color: 'var(--text-3)', fontSize: 14 },

  activityList: { display: 'flex', flexDirection: 'column' },
  activityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-light)',
    gap: 12,
  },
  activityLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    minWidth: 0,
  },
  activityName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
  },
  activityFocus: {
    fontSize: 13,
    color: 'var(--text-2)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  activityWeek: { fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' },
  activityRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  activityBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
  },
  activityTime: { fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' },

  createTeamTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  createTeamDesc: { fontSize: 14, color: 'var(--text-2)', marginBottom: 24 },
  errorBox: {
    background: 'rgba(199,56,32,0.08)',
    border: '1px solid rgba(199,56,32,0.25)',
    color: '#c73820',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    width: '100%',
    padding: '11px 14px',
    fontSize: 15,
    borderRadius: 8,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    padding: '11px 0',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: 0.2,
  },
}
