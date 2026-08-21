import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { CheckIcon, TrashIcon, AlertIcon, UsersIcon } from '../components/Icons'
import AvatarUpload from '../components/AvatarUpload'
import { useIsMobile } from '../components/Sidebar'
import { useCoachAccess } from '../context/CoachAccessContext'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

// ─── Access level display config ──────────────────────────────────────────────
const ACCESS_CONFIG = {
  head_coach:  { label: 'Head Coach',  color: ORANGE, bg: 'rgba(247,87,9,0.12)' },
  admin_coach: { label: 'Admin',       color: BLUE,   bg: 'rgba(48,142,189,0.12)' },
  view_only:   { label: 'View Only',   color: '#888', bg: '#f0f0f0' },
}

// ─── Athletes tab helpers ──────────────────────────────────────────────────────

const LIFT_ABBREVS = [
  { key: 'bench_press',    abbrev: 'BP' },
  { key: 'squat',          abbrev: 'SQ' },
  { key: 'power_clean',    abbrev: 'PC' },
  { key: 'overhead_press', abbrev: 'OHP' },
]

const SORT_OPTIONS = [
  { key: 'name',     label: 'Name A–Z' },
  { key: 'position', label: 'Position' },
  { key: 'joined',   label: 'Join Date' },
]

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function MaxesCell({ maxes }) {
  const logged = LIFT_ABBREVS.filter(l => maxes[l.key])
  if (logged.length === 0) return <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {logged.map(l => (
        <span key={l.key} style={styles.maxChip}>
          {l.abbrev} {maxes[l.key].weight_lbs}
          {maxes[l.key].reps > 1 ? `×${maxes[l.key].reps}` : ''}
        </span>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CoachAthletes() {
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()
  const { team, isHeadCoach, loading: contextLoading, refresh: refreshAccess } = useCoachAccess()

  const [activeTab, setActiveTab] = useState('athletes')

  // ── Athletes tab state ──────────────────────────────────────────────────────
  const [athletes,   setAthletes]   = useState([])
  const [athLoading, setAthLoading] = useState(true)
  const [sort,       setSort]       = useState('name')
  const [checkinMap, setCheckinMap] = useState({}) // athleteId → { readiness_score }

  // ── Coaches tab state ──────────────────────────────────────────────────────
  const [coaches,    setCoaches]    = useState([])
  const [headCoachId, setHeadCoachId] = useState(null)
  const [coachLoading, setCoachLoading] = useState(false)
  const [coachAccess,  setCoachAccess]  = useState(null) // my_access_level from API
  const [toggling,  setToggling]    = useState(null)   // coachId being updated
  const [removing,  setRemoving]    = useState(null)   // coachId being removed
  const [confirmRemove, setConfirmRemove] = useState(null)

  // ── Load athletes + today's check-ins ─────────────────────────────────────
  useEffect(() => {
    // CoachAccessContext's `teams` (and therefore `team`) starts empty on
    // every fresh mount until its first /api/teams/my-coach-teams fetch
    // resolves — a direct load of /coach/athletes (full refresh, deep link)
    // can fire this fetch with team?.id still undefined during that window,
    // defaulting server-side to the coach's first team, and that request
    // can resolve after the correct one and overwrite it with the wrong
    // team's roster. Waiting for context to settle before ever fetching
    // avoids the race instead of just usually winning it — same pattern as
    // Leaderboard.jsx/AccountabilityDashboard.jsx/Feed.jsx/Messages.jsx.
    if (contextLoading) return
    setAthLoading(true)
    Promise.all([
      api.get(`/api/roster${team?.id ? `?team_id=${team.id}` : ''}`).then(r => r.data.roster || []).catch(() => []),
      api.get(`/api/checkins/team${team?.id ? `?team_id=${team.id}` : ''}`).then(r => r.data.checkins || []).catch(() => []),
    ]).then(([roster, checkins]) => {
      setAthletes(roster)
      const map = {}
      for (const c of checkins) map[c.athlete_id] = c
      setCheckinMap(map)
    }).finally(() => setAthLoading(false))
  }, [team?.id, contextLoading])

  // ── Load coaches ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'coaches') return
    setCoachLoading(true)
    api.get(`/api/teams/coaches${team?.id ? `?team_id=${team.id}` : ''}`)
      .then(r => {
        setCoaches(r.data.coaches || [])
        setHeadCoachId(r.data.head_coach_id || null)
        setCoachAccess(r.data.my_access_level || null)
      })
      .catch(() => {})
      .finally(() => setCoachLoading(false))
  }, [activeTab, team?.id])

  // ── Coach access management ────────────────────────────────────────────────
  async function handleToggleAccess(coachId, currentLevel) {
    const newLevel = currentLevel === 'admin_coach' ? 'view_only' : 'admin_coach'
    setToggling(coachId)
    try {
      await api.patch(`/api/teams/coaches/${coachId}/access${team?.id ? `?team_id=${team.id}` : ''}`, { access_level: newLevel })
      setCoaches(prev => prev.map(c => c.id === coachId ? { ...c, access_level: newLevel } : c))
    } catch (err) {
      console.error('[CoachAthletes] toggle access error:', err)
    } finally {
      setToggling(null)
    }
  }

  async function handleRemoveCoach(coach) {
    setRemoving(coach.id)
    setConfirmRemove(null)
    try {
      await api.delete(`/api/teams/coaches/${coach.id}${team?.id ? `?team_id=${team.id}` : ''}`)
      setCoaches(prev => prev.filter(c => c.id !== coach.id))
      refreshAccess()
    } catch (err) {
      console.error('[CoachAthletes] remove coach error:', err)
    } finally {
      setRemoving(null)
    }
  }

  // ── Athlete sort ───────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const list = [...athletes]
    if (sort === 'name') {
      list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
    } else if (sort === 'position') {
      list.sort((a, b) => {
        const pa = a.survey?.position || a.survey?.sport || ''
        const pb = b.survey?.position || b.survey?.sport || ''
        return pa.localeCompare(pb)
      })
    } else if (sort === 'joined') {
      list.sort((a, b) => new Date(b.joined_at || 0) - new Date(a.joined_at || 0))
    }
    return list
  }, [athletes, sort])

  const surveyCount = useMemo(() => athletes.filter(a => a.survey).length, [athletes])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Team Roster</h1>
          {!athLoading && athletes.length > 0 && activeTab === 'athletes' && (
            <p style={styles.subtitle}>
              {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} ·{' '}
              <span style={{ color: BLUE }}>{surveyCount} survey complete</span>
            </p>
          )}
          {activeTab === 'coaches' && (
            <p style={styles.subtitle}>
              {coaches.length + 1} coach{coaches.length !== 0 ? 'es' : ''} total
              {' · '}Head Coach + {coaches.length} assistant{coaches.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Sort controls — athletes tab only */}
        {activeTab === 'athletes' && (
          <div style={styles.sortRow}>
            {SORT_OPTIONS.map(o => (
              <button
                key={o.key}
                style={{
                  ...styles.sortBtn,
                  background: sort === o.key ? ORANGE : 'var(--card-inner)',
                  color: sort === o.key ? '#fff' : 'var(--text-2)',
                  border: `1px solid ${sort === o.key ? ORANGE : 'var(--border)'}`,
                  boxShadow: sort === o.key ? '0 2px 8px rgba(247,87,9,0.30)' : '0 1px 3px rgba(0,0,0,0.10)',
                }}
                onClick={() => setSort(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'athletes' ? styles.tabBtnActive : {}) }}
          onClick={() => setActiveTab('athletes')}
        >
          Athletes
          {athletes.length > 0 && (
            <span style={{ ...styles.tabCount, ...(activeTab === 'athletes' ? styles.tabCountActive : {}) }}>
              {athletes.length}
            </span>
          )}
        </button>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'coaches' ? styles.tabBtnActive : {}) }}
          onClick={() => setActiveTab('coaches')}
        >
          Coaches
          {coaches.length > 0 && (
            <span style={{ ...styles.tabCount, ...(activeTab === 'coaches' ? styles.tabCountActive : {}) }}>
              {coaches.length + 1}
            </span>
          )}
        </button>
      </div>

      {/* ── Athletes tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'athletes' && (
        athLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div className="skeleton" style={{ width: '40%', height: 14 }} />
                  <div className="skeleton" style={{ width: '55%', height: 12 }} />
                </div>
                <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ ...styles.emptyState, gap: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(247,87,9,0.08)', border: '1px solid rgba(247,87,9,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <UsersIcon size={32} color={ORANGE} />
            </div>
            <p style={styles.emptyTitle}>No athletes yet</p>
            <p style={styles.emptyDesc}>
              Share your athlete invite code from the dashboard to get your first athlete on the roster.
            </p>
            <button
              style={{ padding: '10px 22px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 10px rgba(247,87,9,0.30)' }}
              onClick={() => navigate('/coach')}
            >
              Get My Invite Code
            </button>
          </div>
        ) : isMobile ? (
          /* Mobile card layout */
          <div style={styles.mobileList}>
            {sorted.map(a => (
              <div
                key={a.id}
                style={styles.mobileCard}
                onClick={() => navigate(`/coach/athletes/${a.id}`)}
              >
                <div style={styles.mobileCardTop}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <AvatarUpload name={a.full_name} avatarUrl={a.avatar_url} size={38} color={ORANGE} editable={false} />
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.mobileAthleteNameRow}>
                        <span style={styles.athleteName}>{a.full_name}</span>
                        {a.has_recent_injury && (
                          <span style={styles.injuryFlag}>
                            <AlertIcon size={11} color="#c73820" /> Injury
                          </span>
                        )}
                        {checkinMap[a.id]?.readiness_score != null && checkinMap[a.id].readiness_score < 40 && (
                          <span style={styles.readinessCaution}>⚠ Low</span>
                        )}
                      </div>
                      {a.survey?.sport && (
                        <span style={styles.mobileSport}>{a.survey.sport}{a.survey.position ? ` · ${a.survey.position}` : ''}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    {a.survey ? <span style={styles.badgeComplete}><CheckIcon size={11} color="#2e7d32" /> Done</span> : <span style={styles.badgePending}>Pending</span>}
                    <span style={styles.mobileJoined}>{fmtDate(a.joined_at)}</span>
                  </div>
                </div>
                {a.maxes && LIFT_ABBREVS.some(l => a.maxes[l.key]) && <div style={styles.mobileMaxes}><MaxesCell maxes={a.maxes} /></div>}
                <span style={styles.mobileChevron}>›</span>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop table */
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Athlete</th>
                  <th style={styles.th}>Sport / Position</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Survey</th>
                  <th style={styles.th}>Lifting PRs</th>
                  <th style={styles.th}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(a => (
                  <tr key={a.id}
                    style={{
                      ...styles.tr,
                      ...(a.has_recent_injury ? { borderLeft: '3px solid #c73820' } : {}),
                    }}
                    onClick={() => navigate(`/coach/athletes/${a.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AvatarUpload name={a.full_name} avatarUrl={a.avatar_url} size={34} color={ORANGE} editable={false} />
                        <span style={styles.athleteName}>{a.full_name}</span>
                        {a.has_recent_injury && (
                          <span style={styles.injuryFlag}>
                            <AlertIcon size={11} color="#c73820" /> Injury
                          </span>
                        )}
                        {checkinMap[a.id]?.readiness_score != null && checkinMap[a.id].readiness_score < 40 && (
                          <span style={styles.readinessCaution}>⚠ Low</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {a.survey?.sport ? (
                        <div>
                          <span style={styles.sport}>{a.survey.sport}</span>
                          {a.survey.position && <span style={styles.position}>{a.survey.position}</span>}
                        </div>
                      ) : <span style={styles.dash}>—</span>}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {a.survey ? <span style={styles.badgeComplete}><CheckIcon size={11} color="#2e7d32" /> Done</span> : <span style={styles.badgePending}>Pending</span>}
                    </td>
                    <td style={styles.td}><MaxesCell maxes={a.maxes} /></td>
                    <td style={{ ...styles.td, color: 'var(--text-3)', fontSize: 13 }}>{fmtDate(a.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Coaches tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'coaches' && (
        coachLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: 80, height: 11 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.coachesPanel}>
            {/* Explanation for view-only coaches */}
            {coachAccess === 'view_only' && (
              <div style={styles.viewOnlyBanner}>
                👁 You have <strong>view-only</strong> access. The head coach can promote you to Admin from this page.
              </div>
            )}
            {coachAccess === 'admin_coach' && (
              <div style={styles.adminBanner}>
                ✓ You have <strong>admin</strong> access. You can assign blueprints, message athletes, and edit plans.
              </div>
            )}

            {/* Head coach row — always at top */}
            <HeadCoachRow headCoachId={headCoachId} />

            {/* Assistant coaches */}
            {coaches.length === 0 ? (
              <div style={styles.emptyCoachState}>
                <p style={styles.emptyTitle}>No assistant coaches yet</p>
                <p style={styles.emptyDesc}>
                  Share the Coach Code from your Dashboard with other coaches to invite them.
                </p>
              </div>
            ) : (
              coaches.map(coach => (
                <div key={coach.id} style={styles.coachRow}>
                  {/* Avatar + info */}
                  <div style={styles.coachLeft}>
                    <div style={styles.coachAvatar}>
                      {coach.avatar_url
                        ? <img src={coach.avatar_url} alt="" style={styles.coachAvatarImg} />
                        : <span style={styles.coachInitial}>{(coach.full_name || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <div style={styles.coachInfo}>
                      <span style={styles.coachName}>{coach.full_name}</span>
                      <span style={styles.coachJoined}>Joined {fmtDate(coach.joined_at)}</span>
                    </div>
                  </div>

                  {/* Access level badge */}
                  <AccessBadge level={coach.access_level} />

                  {/* Head coach controls */}
                  {isHeadCoach && (
                    <div style={styles.coachControls}>
                      {confirmRemove === coach.id ? (
                        <div style={styles.confirmRow}>
                          <span style={styles.confirmText}>Remove?</span>
                          <button style={styles.confirmYes} onClick={() => handleRemoveCoach(coach)} disabled={removing === coach.id}>Yes</button>
                          <button style={styles.confirmNo}  onClick={() => setConfirmRemove(null)}>No</button>
                        </div>
                      ) : (
                        <>
                          <button
                            style={{
                              ...styles.accessToggleBtn,
                              ...(coach.access_level === 'admin_coach'
                                ? styles.accessToggleDemote
                                : styles.accessTogglePromote),
                            }}
                            onClick={() => handleToggleAccess(coach.id, coach.access_level)}
                            disabled={toggling === coach.id}
                          >
                            {toggling === coach.id ? '…' : coach.access_level === 'admin_coach' ? 'Demote to View Only' : 'Promote to Admin'}
                          </button>
                          <button
                            style={styles.removeCoachBtn}
                            onClick={() => setConfirmRemove(coach.id)}
                            title="Remove from team"
                          >
                            <TrashIcon size={14} color="#888" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function AccessBadge({ level }) {
  const cfg = ACCESS_CONFIG[level] || ACCESS_CONFIG.view_only
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      padding: '3px 10px',
      borderRadius: 20,
      letterSpacing: 0.3,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

function HeadCoachRow({ headCoachId }) {
  const [coachProfile, setCoachProfile] = useState(null)

  useEffect(() => {
    if (!headCoachId) return
    // Fetch the head coach's profile via the auth profile endpoint
    // We use the roster endpoint to get the head coach's info from the profiles table
    // (assistant coaches already have the head coach's id, not the full profile object)
    // We'll call the /api/auth/profile for the current user if they are the head coach;
    // otherwise we'll show a placeholder until the API is extended.
    // For now: the team name + "Head Coach" badge is shown with name from the notification context.
    // Since we have the headCoachId, fetch the profile directly.
    import('../services/api').then(({ default: api }) => {
      api.get('/api/auth/profile')
        .then(r => {
          // If this user IS the head coach, show their profile
          if (r.data.profile?.id === headCoachId) {
            setCoachProfile(r.data.profile)
          }
        })
        .catch(() => {})
    })
  }, [headCoachId])

  return (
    <div style={{ ...styles.coachRow, borderColor: 'rgba(247,87,9,0.2)', background: 'rgba(247,87,9,0.03)' }}>
      <div style={styles.coachLeft}>
        <div style={{ ...styles.coachAvatar, background: 'rgba(247,87,9,0.15)' }}>
          {coachProfile?.avatar_url
            ? <img src={coachProfile.avatar_url} alt="" style={styles.coachAvatarImg} />
            : <span style={{ ...styles.coachInitial, color: ORANGE }}>
                {(coachProfile?.full_name || 'HC')[0].toUpperCase()}
              </span>
          }
        </div>
        <div style={styles.coachInfo}>
          <span style={styles.coachName}>{coachProfile?.full_name || 'Head Coach'}</span>
          <span style={styles.coachJoined}>Team owner</span>
        </div>
      </div>
      <AccessBadge level="head_coach" />
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: { maxWidth: 960, margin: '0 auto' },

  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  pageTitle:  { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subtitle:   { fontSize: 14, color: 'var(--text-3)', margin: 0 },
  sortRow:    { display: 'flex', gap: 8, flexWrap: 'wrap' },
  sortBtn: {
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },

  // Tab bar
  tabBar: {
    display: 'flex',
    gap: 4,
    borderBottom: '2px solid var(--border)',
    marginBottom: 20,
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-2)',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabBtnActive: {
    color: ORANGE,
    borderBottomColor: ORANGE,
  },
  tabCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    background: 'var(--border)',
    color: 'var(--text-3)',
    fontSize: 11,
    fontWeight: 700,
    padding: '0 5px',
  },
  tabCountActive: {
    background: 'rgba(247,87,9,0.15)',
    color: ORANGE,
  },

  empty: { color: 'var(--text-3)', fontSize: 15 },
  emptyState: { textAlign: 'center', paddingTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: 'var(--text-2)', marginBottom: 20, maxWidth: 340, lineHeight: 1.55 },

  // Desktop athlete table
  card: {
    background: 'var(--card)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    fontWeight: 700,
    fontSize: 11,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1px solid var(--border)',
    background: 'var(--card-inner)',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 0.1s' },
  td: { padding: '13px 14px', color: 'var(--text)', verticalAlign: 'middle' },

  // Mobile athlete cards
  mobileList: { display: 'flex', flexDirection: 'column', gap: 8 },
  mobileCard: {
    position: 'relative',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '14px 16px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  mobileCardTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  mobileAthleteNameRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  mobileSport:  { display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 },
  mobileJoined: { fontSize: 11, color: 'var(--text-3)' },
  mobileMaxes:  { borderTop: '1px solid var(--border-light)', paddingTop: 8 },
  mobileChevron: { position: 'absolute', bottom: 14, right: 16, fontSize: 18, color: 'var(--text-3)', lineHeight: 1 },

  athleteName: { fontWeight: 600, fontSize: 14 },
  injuryFlag: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, color: '#c73820', background: '#fce8e6',
    border: '1px solid rgba(199,56,32,0.30)', padding: '2px 7px',
    borderRadius: 4, fontWeight: 700, cursor: 'default', whiteSpace: 'nowrap',
  },
  readinessCaution: {
    display: 'inline-flex', alignItems: 'center',
    fontSize: 11, color: YELLOW, background: 'rgba(240,190,36,0.12)',
    border: '1px solid rgba(240,190,36,0.25)', padding: '2px 6px',
    borderRadius: 4, fontWeight: 700, cursor: 'default', whiteSpace: 'nowrap',
  },
  sport:     { display: 'block', fontWeight: 600, color: 'var(--text)', fontSize: 13 },
  position:  { display: 'block', color: 'var(--text-3)', fontSize: 12, marginTop: 2 },
  dash:      { color: 'var(--text-3)', fontSize: 13 },
  badgeComplete: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'rgba(48,142,189,0.12)', color: BLUE,
    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
  },
  badgePending: {
    background: 'rgba(247,87,9,0.10)', color: ORANGE,
    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, display: 'inline-block',
  },
  maxChip: {
    fontSize: 11, fontWeight: 700, background: 'rgba(247,87,9,0.08)',
    color: ORANGE, border: '1px solid rgba(247,87,9,0.18)',
    padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', letterSpacing: 0.2,
  },

  // ── Coaches tab ──────────────────────────────────────────────────────────────
  coachesPanel: { display: 'flex', flexDirection: 'column', gap: 8 },

  viewOnlyBanner: {
    background: 'rgba(136,136,136,0.1)',
    border: '1px solid rgba(136,136,136,0.25)',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    color: 'var(--text-2)',
    marginBottom: 4,
  },
  adminBanner: {
    background: 'rgba(48,142,189,0.08)',
    border: '1px solid rgba(48,142,189,0.2)',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    color: BLUE,
    marginBottom: 4,
  },

  coachRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  coachLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  coachAvatar: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(48,142,189,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
  },
  coachAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  coachInitial: { fontSize: 16, fontWeight: 700, color: BLUE },
  coachInfo: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  coachName:   { fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  coachJoined: { fontSize: 12, color: 'var(--text-3)' },

  coachControls: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },

  accessToggleBtn: {
    padding: '8px 12px', fontSize: 12, fontWeight: 700,
    borderRadius: 8, border: 'none', cursor: 'pointer',
    transition: 'all 0.15s', whiteSpace: 'nowrap', minHeight: 36,
  },
  accessTogglePromote: {
    background: 'rgba(48,142,189,0.12)', color: BLUE,
    border: `1px solid rgba(48,142,189,0.3)`,
  },
  accessToggleDemote: {
    background: 'rgba(136,136,136,0.1)', color: '#666',
    border: '1px solid rgba(136,136,136,0.25)',
  },
  removeCoachBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--card)',
    cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.14s',
  },

  confirmRow:  { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  confirmText: { fontSize: 12, color: '#c73820', fontWeight: 600 },
  confirmYes: {
    padding: '4px 10px', fontSize: 12, fontWeight: 700,
    borderRadius: 6, border: 'none', background: '#c73820', color: '#fff', cursor: 'pointer',
  },
  confirmNo: {
    padding: '4px 10px', fontSize: 12, fontWeight: 600,
    borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-2)', cursor: 'pointer',
  },

  emptyCoachState: { textAlign: 'center', padding: '40px 0' },
}
