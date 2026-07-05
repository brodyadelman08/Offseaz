import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCoachAccess } from '../context/CoachAccessContext'
import api from '../services/api'
import { CopyIcon, CheckIcon, UsersIcon, LayoutIcon, BarChartIcon, AlertIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const RED    = '#c73820'
const ACCENTS = [ORANGE, BLUE, YELLOW]

// Notification type → priority, color, category label
// Priority 0 (highest) = red injury, 1 = orange action, 2 = yellow achievement, 3 = blue info, 4 = white general
const NOTIF_PRIORITY = {
  injury_flag:        { priority: 0, color: RED,    label: 'Injury Alert' },
  program_complete:   { priority: 2, color: YELLOW, label: 'Achievement'  },
  blueprint_assigned: { priority: 3, color: BLUE,   label: 'Info'         },
  coach_joined:       { priority: 3, color: BLUE,   label: 'Info'         },
  ownership_transfer: { priority: 3, color: BLUE,   label: 'Info'         },
}
function notifCfg(type) {
  return NOTIF_PRIORITY[type] || { priority: 4, color: '#FFFFFF', label: 'Notification' }
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
  completed:       { label: 'Completed',        color: BLUE,   bg: 'rgba(48,142,189,0.12)'  },
  partial:         { label: 'Partial',          color: YELLOW, bg: 'rgba(240,190,36,0.12)'  },
  skipped:         { label: 'Skipped',          color: '#888', bg: '#f0f0f0'                },
  skipped_injury:  { label: 'Skipped — Injury', color: RED,    bg: 'rgba(199,56,32,0.10)'   },
}

const EVENT_BADGE = {
  joined:    { label: 'Joined team',   color: '#1565c0', bg: '#e3f2fd' },
  survey:    { label: 'Survey done',   color: '#2e7d32', bg: '#e8f5e9' },
  blueprint: { label: 'Plan assigned', color: '#6a1b9a', bg: '#f3e5f5' },
}

const INJURY_BADGE = { label: 'Injury', color: '#c73820', bg: '#fce8e6' }

export default function CoachDashboard() {
  const { profile } = useAuth()
  const {
    team: ctxTeam, teams, isHeadCoach, refresh: refreshAccess, setActiveTeamId,
    notifications: ctxNotifications, refreshNotifications,
  } = useCoachAccess()
  const navigate = useNavigate()

  // The dashboard owns create-team flow; other team data comes from context
  const [team, setTeam]           = useState(null)
  const [teamName, setTeamName]   = useState('')
  const [athletes, setAthletes]   = useState([])
  const [blueprints, setBlueprints] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const notifications = ctxNotifications || []
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)

  // New team modal state
  const [showNewTeamModal, setShowNewTeamModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamCreating, setNewTeamCreating] = useState(false)
  const [newTeamError, setNewTeamError] = useState('')

  // Activity feed sort mode
  const [feedSort, setFeedSort] = useState('priority') // 'priority' | 'recent'

  // Copy state for each code / link
  const [copiedAthleteCode, setCopiedAthleteCode] = useState(false)
  const [copiedCoachCode,   setCopiedCoachCode]   = useState(false)
  const [copiedLink,        setCopiedLink]        = useState(false)

  // Coach join-as-assistant (for coaches who don't have a team yet)
  const [joinCode,     setJoinCode]     = useState('')
  const [joining,      setJoining]      = useState(false)
  const [joinError,    setJoinError]    = useState('')

  // Sync team from context
  useEffect(() => { setTeam(ctxTeam) }, [ctxTeam])

  useEffect(() => {
    if (!ctxTeam) { setLoading(false); return }
    Promise.all([
      api.get(`/api/survey/team${ctxTeam?.id ? `?team_id=${ctxTeam.id}` : ''}`).then(r => r.data.athletes).catch(() => []),
      api.get(`/api/blueprints${ctxTeam?.id ? `?team_id=${ctxTeam.id}` : ''}`).then(r => r.data.blueprints).catch(() => []),
      api.get(`/api/workouts/team${ctxTeam?.id ? `?team_id=${ctxTeam.id}` : ''}`).then(r => r.data.logs).catch(() => []),
    ]).then(([athletesData, blueprintsData, logsData]) => {
      setAthletes(athletesData)
      setBlueprints(blueprintsData)
      setActivityLogs(logsData)
    }).finally(() => setLoading(false))
  }, [ctxTeam?.id])

  async function handleCreateTeam(e) {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const res = await api.post('/api/teams', { name: teamName })
      setTeam(res.data.team)
      setTeamName('')
      refreshAccess()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateNewTeam(e) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setNewTeamCreating(true)
    setNewTeamError('')
    try {
      const res = await api.post('/api/teams', { name: newTeamName.trim() })
      setNewTeamName('')
      setShowNewTeamModal(false)
      await refreshAccess()
      setActiveTeamId(res.data.team.id)
    } catch (err) {
      setNewTeamError(err.response?.data?.error || 'Failed to create team')
    } finally {
      setNewTeamCreating(false)
    }
  }

  async function handleJoinAsCoach(e) {
    e.preventDefault()
    setJoinError('')
    setJoining(true)
    try {
      const res = await api.post('/api/teams/join-as-coach', { coach_code: joinCode.trim() })
      setTeam(res.data.team)
      setJoinCode('')
      refreshAccess()
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Invalid coach code')
    } finally {
      setJoining(false)
    }
  }

  function copyAthleteCode() {
    navigator.clipboard.writeText(team.invite_code)
    setCopiedAthleteCode(true)
    setTimeout(() => setCopiedAthleteCode(false), 2000)
  }
  function copyCoachCode() {
    navigator.clipboard.writeText(team.coach_code)
    setCopiedCoachCode(true)
    setTimeout(() => setCopiedCoachCode(false), 2000)
  }
  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/join/${team.invite_code}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function handleDismissNotification(e, athleteId) {
    e.stopPropagation()
    try {
      await api.patch(`/api/notifications/dismiss-athlete/${athleteId}`)
      refreshNotifications()
    } catch (err) {
      console.error('[CoachDashboard] dismiss notification failed:', err)
    }
  }

  const inviteLink = team ? `${window.location.origin}/join/${team.invite_code}` : null
  const surveyedCount = athletes.filter(a => a.survey).length

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={styles.pageTitle}>
              {profile?.full_name?.split(' ')[0]
                ? `Welcome back, ${profile.full_name.split(' ')[0]}`
                : 'Dashboard'}
            </h1>
            <p style={styles.pageSub}>Here's what's happening with your team.</p>
          </div>
          {team && (
            <button style={styles.newTeamBtn} onClick={() => setShowNewTeamModal(true)}>
              + New Team
            </button>
          )}
        </div>
      </div>

      {showNewTeamModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNewTeamModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Create New Team</h3>
            <form onSubmit={handleCreateNewTeam}>
              <input
                style={styles.modalInput}
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="Team name"
                autoFocus
              />
              {newTeamError && <p style={styles.modalError}>{newTeamError}</p>}
              <button type="submit" style={styles.modalBtn} disabled={newTeamCreating}>
                {newTeamCreating ? 'Creating…' : 'Create Team'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stat cards skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <div className="skeleton" style={{ width: 40, height: 22 }} />
                <div className="skeleton" style={{ width: 56, height: 12 }} />
              </div>
            ))}
          </div>
          {/* Team card skeleton */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div className="skeleton" style={{ width: 80, height: 11, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 180, height: 22, marginBottom: 20 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
            </div>
          </div>
          {/* Activity skeleton */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div className="skeleton" style={{ width: 110, height: 11, marginBottom: 16 }} />
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 90, height: 14 }} />
                  <div className="skeleton" style={{ width: 60, height: 12 }} />
                </div>
                <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      ) : team ? (
        <>
          {/* Notifications — sorted by priority: red → orange → yellow → blue → white */}
          {notifications.length > 0 && (
            <div style={styles.notifSection}>
              {[...notifications]
                .sort((a, b) => {
                  const pa = notifCfg(a.type).priority
                  const pb = notifCfg(b.type).priority
                  if (pa !== pb) return pa - pb
                  return new Date(b.created_at) - new Date(a.created_at)
                })
                .map(n => {
                  const cfg = notifCfg(n.type)
                  const isInjury = n.type === 'injury_flag'
                  return (
                    <div
                      key={n.id}
                      style={{
                        ...styles.notifCard,
                        borderLeft: `3px solid ${cfg.color}`,
                        ...(isInjury ? {
                          background: 'rgba(199,56,32,0.07)',
                          boxShadow: `0 0 0 1px rgba(199,56,32,0.20), 0 2px 10px rgba(0,0,0,0.28)`,
                        } : {}),
                      }}
                    >
                      {/* Category label + badge dot */}
                      <div style={styles.notifHeader}>
                        <span style={{ ...styles.notifType, color: cfg.color }}>{cfg.label}</span>
                        <span style={{ ...styles.notifBadgeDot, background: cfg.color }} />
                      </div>
                      {/* Message */}
                      <button
                        style={styles.notifMsgBtn}
                        onClick={() => navigate(`/coach/athletes/${n.athlete_id}`)}
                      >
                        <span style={styles.notifMsg}>{n.message}</span>
                      </button>
                      {/* Actions */}
                      <div style={styles.notifActions}>
                        <span
                          style={{ ...styles.notifCta, color: cfg.color }}
                          onClick={() => navigate(`/coach/athletes/${n.athlete_id}`)}
                        >
                          View →
                        </span>
                        <span style={styles.notifTime}>{timeAgo(n.created_at)}</span>
                        <button
                          style={styles.notifDismiss}
                          onClick={e => handleDismissNotification(e, n.athlete_id)}
                          title="Dismiss"
                        >✕</button>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}

          {/* Stats row */}
          <div style={styles.statsRow}>
            {[
              { Icon: UsersIcon,  val: athletes.length,   label: 'Athletes',   path: '/coach/athletes' },
              { Icon: LayoutIcon, val: blueprints.length,  label: 'Blueprints', path: '/coach/blueprints' },
              { Icon: BarChartIcon, val: surveyedCount,    label: 'Surveyed',   path: '/coach/athletes' },
            ].map(({ Icon, val, label, path }, i) => (
              <button
                key={label}
                data-hov=""
                style={{
                  ...styles.statCard,
                  borderLeft: `3px solid ${ACCENTS[i]}`,
                  background: `linear-gradient(135deg, ${['rgba(247,87,9,0.05)','rgba(48,142,189,0.05)','rgba(240,190,36,0.05)'][i]} 0%, var(--card) 100%)`,
                }}
                onClick={() => navigate(path)}
              >
                <Icon size={20} color={ACCENTS[i]} />
                <span style={styles.statVal}>{val}</span>
                <span style={styles.statLabel}>{label}</span>
              </button>
            ))}
          </div>

          {/* Team + invite codes */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={{ ...styles.cardLabel, color: BLUE }}>Your Team</p>
                <h2 style={styles.teamName}>{team.name}</h2>
              </div>
            </div>

            {/* Two codes — stacks to single column on mobile */}
            <div className="codes-grid">
              {/* Athlete code */}
              <div style={styles.codeBlock}>
                <p style={styles.fieldLabel}>Athlete Code</p>
                <div style={styles.codeRow}>
                  <span className="code-text" style={styles.codeText}>{team.invite_code}</span>
                  <button style={styles.copyBtn} onClick={copyAthleteCode}>
                    {copiedAthleteCode
                      ? <><CheckIcon size={13} color={BLUE} /> Copied</>
                      : <><CopyIcon size={13} color={BLUE} /> Copy</>
                    }
                  </button>
                </div>
                <p style={styles.codeHint}>Share with athletes to join your roster</p>
              </div>

              {/* Coach code — only head coach sees this */}
              {isHeadCoach && (
                <div style={{ ...styles.codeBlock, borderColor: 'rgba(247,87,9,0.3)', background: 'rgba(247,87,9,0.04)' }}>
                  <p style={{ ...styles.fieldLabel, color: ORANGE }}>Coach Code</p>
                  <div style={styles.codeRow}>
                    <span className="code-text" style={{ ...styles.codeText, color: ORANGE }}>{team.coach_code || '—'}</span>
                    {team.coach_code && (
                      <button style={{ ...styles.copyBtn, borderColor: ORANGE, color: ORANGE }} onClick={copyCoachCode}>
                        {copiedCoachCode
                          ? <><CheckIcon size={13} color={ORANGE} /> Copied</>
                          : <><CopyIcon size={13} color={ORANGE} /> Copy</>
                        }
                      </button>
                    )}
                  </div>
                  <p style={styles.codeHint}>Share with assistant coaches only</p>
                </div>
              )}
            </div>

            {/* Athlete invite link */}
            <p style={{ ...styles.fieldLabel, marginTop: 20 }}>Athlete Invite Link</p>
            <div style={styles.inviteBox}>
              <span style={styles.inviteText}>{inviteLink}</span>
              <button style={styles.copyBtn} onClick={copyLink}>
                {copiedLink
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Sort toggle */}
                <div style={styles.sortToggle}>
                  {[{ key: 'priority', label: 'Priority' }, { key: 'recent', label: 'Recent' }].map(opt => (
                    <button
                      key={opt.key}
                      style={{
                        ...styles.sortToggleBtn,
                        background: feedSort === opt.key ? ORANGE : 'transparent',
                        color: feedSort === opt.key ? '#fff' : 'var(--text-3)',
                      }}
                      onClick={() => setFeedSort(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {activityLogs.length > 10 && (
                  <button
                    style={styles.viewAllBtn}
                    onClick={() => navigate('/coach/accountability')}
                  >
                    View all
                  </button>
                )}
              </div>
            </div>
            {activityLogs.length === 0 ? (
              <p style={styles.empty}>No sessions logged yet.</p>
            ) : (
              <div style={styles.activityList}>
                {(feedSort === 'recent'
                  ? [...activityLogs].sort((a, b) => new Date(b.timestamp || b.logged_at) - new Date(a.timestamp || a.logged_at))
                  : activityLogs
                ).slice(0, 10).map(log => {
                  const isWorkout   = log.type === 'workout' || !log.type
                  const isInjury    = isWorkout && log.status === 'skipped_injury'
                  const isMilestone = log.is_streak_milestone

                  const badge = isMilestone
                    ? { label: `${log.streak_days}d Streak 🔥`, color: YELLOW, bg: 'rgba(240,190,36,0.12)' }
                    : isInjury
                      ? INJURY_BADGE
                      : isWorkout
                        ? (ACTIVITY_STATUS[log.status] || { label: log.status, color: '#888', bg: '#f0f0f0' })
                        : (EVENT_BADGE[log.type] || { label: log.type, color: '#888', bg: '#f0f0f0' })

                  let subtitle = ''
                  if (isInjury) {
                    subtitle = log.injury_exercises?.length
                      ? `Can't do: ${log.injury_exercises.join(', ')}`
                      : (log.session_focus || 'Session')
                  } else if (isWorkout) {
                    subtitle = log.session_focus || 'Session'
                  } else if (log.type === 'blueprint') {
                    subtitle = log.blueprint_title || 'Training plan'
                  } else if (log.type === 'joined') {
                    subtitle = 'Joined the team'
                  } else if (log.type === 'survey') {
                    subtitle = 'Completed profile survey'
                  }

                  return (
                    <div key={log.id} style={{ ...styles.activityRow, borderLeft: `3px solid ${log.accent_color || 'transparent'}`, paddingLeft: 10 }}>
                      <div style={styles.activityLeft}>
                        <span style={styles.activityName}>{log.athlete_name}</span>
                        <span style={isInjury ? styles.activityInjurySub : styles.activityFocus}>
                          {subtitle}
                        </span>
                        {isWorkout && !isInjury && log.week_number && (
                          <span style={styles.activityWeek}>Wk {log.week_number}</span>
                        )}
                      </div>
                      <div style={styles.activityRight}>
                        <span style={{ ...styles.activityBadge, color: badge.color, background: badge.bg }}>
                          {badge.label}{isWorkout && !isInjury && log.effort ? ` · ${log.effort}` : ''}
                        </span>
                        <span style={styles.activityTime}>{timeAgo(log.timestamp || log.logged_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* No team — offer create OR join as assistant coach */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Create a new team */}
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

          {/* Join an existing team as assistant coach */}
          <div style={styles.card}>
            <p style={{ ...styles.cardLabel, color: BLUE }}>Or join as assistant coach</p>
            <p style={styles.createTeamDesc}>
              Enter the coach code from your head coach to join their team with view-only access.
            </p>
            {joinError && <div style={styles.errorBox}>{joinError}</div>}
            <form onSubmit={handleJoinAsCoach} style={styles.form}>
              <input
                style={styles.input}
                type="text"
                placeholder="Coach code (e.g. a1b2c3d4)"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                required
              />
              <button style={{ ...styles.primaryBtn, background: BLUE, boxShadow: '0 2px 10px rgba(48,142,189,0.30)' }}
                type="submit" disabled={joining}
              >
                {joining ? 'Joining…' : 'Join as coach'}
              </button>
            </form>
          </div>
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

  notifSection: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  notifCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  },
  notifHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  notifType: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 },
  notifBadgeDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  notifMsgBtn: { background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 },
  notifMsg: { fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, display: 'block' },
  notifActions: { display: 'flex', alignItems: 'center', gap: 10 },
  notifCta: { fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' },
  notifTime: { fontSize: 12, color: 'var(--text-3)', flex: 1, textAlign: 'right' },
  notifDismiss: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-3)', padding: '0 2px', flexShrink: 0, lineHeight: 1 },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 'clamp(14px, 3vw, 22px) clamp(6px, 2vw, 12px)',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  statVal: { fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700, color: 'var(--text)', lineHeight: 1 },
  statLabel: { fontSize: 'clamp(10px, 2.5vw, 12px)', color: 'var(--text-3)', fontWeight: 600, letterSpacing: 0.2, textAlign: 'center' },

  card: {
    background: 'var(--card)',
    borderRadius: 16,
    padding: 24,
    border: '1px solid var(--border)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
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
  // Responsive grid handled by .codes-grid CSS class
  codesGrid: {},
  codeBlock: {
    background: 'rgba(48,142,189,0.04)',
    border: '1px solid rgba(48,142,189,0.2)',
    borderRadius: 12,
    padding: '14px 16px',
  },
  codeHint: {
    fontSize: 11,
    color: 'var(--text-3)',
    margin: '6px 0 0',
    lineHeight: 1.3,
  },

  codeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  codeText: {
    // font-size, letter-spacing, white-space, overflow handled by .code-text CSS class
    fontFamily: 'monospace',
    fontWeight: 700,
    color: 'var(--text)',
    lineHeight: 1,
    flex: 1,
    minWidth: 0,
  },

  inviteBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: 10,
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
    padding: '6px 13px',
    borderRadius: 8,
    border: `1px solid ${BLUE}`,
    background: 'transparent',
    color: BLUE,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontWeight: 600,
    transition: 'background 0.15s, box-shadow 0.15s',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  sortToggle: {
    display: 'inline-flex',
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: 2,
    gap: 2,
  },
  sortToggleBtn: {
    padding: '4px 12px',
    borderRadius: 16,
    border: 'none',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: 0.1,
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
    alignItems: 'flex-start',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-light)',
    gap: 8,
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
  activityInjurySub: {
    fontSize: 13,
    color: '#c73820',
    fontWeight: 600,
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
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    width: '100%',
    padding: '11px 14px',
    fontSize: 15,
    borderRadius: 10,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    padding: '12px 0',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: 0.2,
    boxShadow: '0 2px 10px rgba(247,87,9,0.30)',
  },

  newTeamBtn: {
    padding: '8px 16px', background: 'transparent',
    border: `1px solid ${ORANGE}`, borderRadius: 8,
    color: ORANGE, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 28, width: 320, maxWidth: '90vw',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 18px' },
  modalInput: {
    width: '100%', padding: '10px 14px', background: 'var(--input-bg)',
    border: '1px solid var(--input-border)', borderRadius: 8,
    color: 'var(--text)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', marginBottom: 12,
  },
  modalError: { color: '#c73820', fontSize: 13, marginBottom: 10 },
  modalBtn: {
    width: '100%', padding: '11px 0', background: ORANGE, border: 'none',
    borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14,
    cursor: 'pointer',
  },
}
