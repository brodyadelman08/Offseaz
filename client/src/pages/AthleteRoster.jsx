import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import api from '../services/api'
import AvatarUpload from '../components/AvatarUpload'
import PreviewBanner from '../components/PreviewBanner'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'

const LIFT_ABBREVS = [
  { key: 'bench_press',       abbrev: 'BP'  },
  { key: 'squat',             abbrev: 'SQ'  },
  { key: 'trap_bar_deadlift', abbrev: 'TBD' },
  { key: 'power_clean',       abbrev: 'PC'  },
  { key: 'overhead_press',    abbrev: 'OHP' },
]

export default function AthleteRoster() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { activeTeamId } = useTeam()
  const [team, setTeam] = useState(null)
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setTeam(null)
    setRoster([])
    const url = activeTeamId ? `/api/roster?team_id=${activeTeamId}` : '/api/roster'
    api.get(url)
      .then(r => {
        setTeam(r.data.team)
        setRoster(r.data.roster || [])
      })
      .catch(err => {
        console.error('[AthleteRoster] failed to load roster:', err?.response?.data?.error || err.message)
      })
      .finally(() => setLoading(false))
  }, [activeTeamId])

  // Split self out from teammates
  const self = roster.find(a => a.id === profile?.id)
  const teammates = roster.filter(a => a.id !== profile?.id)

  const publicCount = teammates.filter(a => a.privacy === 'public').length

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>
            {team ? team.name : 'Team Roster'}
          </h1>
          {!loading && teammates.length > 0 && (
            <p style={styles.subtitle}>
              {teammates.length} teammate{teammates.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div className="skeleton" style={{ width: '45%', height: 15 }} />
                <div className="skeleton" style={{ width: '30%', height: 12 }} />
              </div>
              <div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            </div>
          ))}
        </div>
      ) : !team ? (
        <div style={styles.emptyState}>
          <PreviewBanner noun="team roster" />
        </div>
      ) : (
        <>
          {/* Coach card — always pinned at the very top */}
          {team?.coach && (
            <>
              <div style={styles.sectionLabel}>Coach</div>
              <div style={{ ...styles.athleteCard, ...styles.coachCard, marginBottom: 20 }}>
                <AvatarUpload
                  name={team.coach.full_name}
                  avatarUrl={team.coach.avatar_url}
                  size={44}
                  color={BLUE}
                  editable={false}
                />
                <div style={styles.athleteInfo}>
                  <p style={styles.athleteName}>{team.coach.full_name}</p>
                  <p style={{ ...styles.athleteSub, color: 'var(--text-3)', fontStyle: 'italic' }}>
                    Head Coach
                  </p>
                </div>
                <span style={styles.coachBadge}>Coach</span>
              </div>
            </>
          )}

          {/* Your own card */}
          {self && (
            <>
              <div style={styles.sectionLabel}>You</div>
              <div
                style={{ ...styles.athleteCard, ...styles.selfCard }}
                onClick={() => navigate('/athlete/profile')}
              >
                <AvatarUpload
                  name={self.full_name}
                  avatarUrl={self.avatar_url}
                  size={44}
                  color={ORANGE}
                  editable={false}
                />
                <div style={styles.athleteInfo}>
                  <p style={styles.athleteName}>{self.full_name}</p>
                  {self.sport && (
                    <p style={styles.athleteSub}>
                      {self.sport}{self.position ? ` · ${self.position}` : ''}
                    </p>
                  )}
                </div>
                <span style={styles.youBadge}>You</span>
              </div>
            </>
          )}

          {/* Teammates */}
          {teammates.length === 0 ? (
            <div style={{ ...styles.emptyState, paddingTop: 24 }}>
              <p style={styles.emptyTitle}>No teammates yet</p>
              <p style={styles.emptyDesc}>
                Your coach can share the team invite code to bring more athletes in.
              </p>
            </div>
          ) : (
            <>
              <div style={{ ...styles.sectionLabel, marginTop: 20 }}>
                Teammates
                {teammates.filter(a => a.privacy === 'public').length < teammates.length && (
                  <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 8 }}>
                    · {teammates.length - teammates.filter(a => a.privacy === 'public').length} private
                  </span>
                )}
              </div>
              <div style={styles.rosterGrid}>
                {teammates.map(a => (
                  <AthleteCard
                    key={a.id}
                    athlete={a}
                    onClick={a.privacy === 'public'
                      ? () => navigate(`/athlete/roster/${a.id}`)
                      : null
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function AthleteCard({ athlete, onClick }) {
  const isPrivate = athlete.privacy === 'private'
  return (
    <div
      style={{
        ...styles.athleteCard,
        cursor: onClick ? 'pointer' : 'default',
        opacity: isPrivate ? 0.75 : 1,
      }}
      onClick={onClick || undefined}
      onMouseEnter={e => {
        if (!onClick) return
        e.currentTarget.style.borderColor = 'rgba(247,87,9,0.40)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.05)'
      }}
      onMouseLeave={e => {
        if (!onClick) return
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.04)'
      }}
    >
      <AvatarUpload
        name={athlete.full_name}
        avatarUrl={athlete.avatar_url}
        size={44}
        color={ORANGE}
        editable={false}
      />

      <div style={styles.athleteInfo}>
        <p style={styles.athleteName}>{athlete.full_name}</p>
        {!isPrivate && athlete.sport && (
          <p style={styles.athleteSub}>
            {athlete.sport}{athlete.position ? ` · ${athlete.position}` : ''}
          </p>
        )}
        {isPrivate && (
          <p style={{ ...styles.athleteSub, color: 'var(--text-3)', fontStyle: 'italic' }}>
            Private profile
          </p>
        )}
        {!isPrivate && athlete.maxes && (() => {
          const logged = LIFT_ABBREVS.filter(l => athlete.maxes[l.key])
          return logged.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
              {logged.map(l => (
                <span key={l.key} style={styles.maxChip}>
                  {l.abbrev} {athlete.maxes[l.key].weight_lbs}
                  {athlete.maxes[l.key].reps > 1 ? `×${athlete.maxes[l.key].reps}` : ''}
                </span>
              ))}
            </div>
          ) : null
        })()}
      </div>

      <div style={styles.cardRight}>
        {isPrivate ? (
          <span style={styles.privateBadge}>Private</span>
        ) : (
          <span style={styles.viewChevron}>›</span>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: 680, margin: '0 auto' },

  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: 'var(--text-3)', margin: 0 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  empty: { color: 'var(--text-3)', fontSize: 15 },
  emptyState: { textAlign: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: 'var(--text-2)', marginBottom: 20 },
  joinBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: BLUE,
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(48,142,189,0.30)',
    letterSpacing: 0.1,
  },

  rosterGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  athleteCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '14px 18px',
    marginBottom: 0,
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  selfCard: {
    borderLeft: `3px solid ${ORANGE}`,
    marginBottom: 0,
  },

  athleteInfo: { flex: 1, minWidth: 0 },
  athleteName: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
    margin: '0 0 3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  athleteSub: {
    fontSize: 13,
    color: 'var(--text-2)',
    margin: 0,
  },

  cardRight: { flexShrink: 0 },
  coachCard: {
    borderLeft: `3px solid ${BLUE}`,
  },
  coachBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: 'rgba(48,142,189,0.10)',
    color: BLUE,
    border: '1px solid rgba(48,142,189,0.22)',
    padding: '3px 9px',
    borderRadius: 6,
    letterSpacing: 0.2,
  },
  youBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: 'rgba(247,87,9,0.10)',
    color: ORANGE,
    border: '1px solid rgba(247,87,9,0.22)',
    padding: '3px 9px',
    borderRadius: 6,
    letterSpacing: 0.2,
  },
  privateBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: 'var(--border)',
    color: 'var(--text-3)',
    padding: '3px 9px',
    borderRadius: 6,
  },
  viewChevron: {
    fontSize: 20,
    color: 'var(--text-3)',
    lineHeight: 1,
  },
  maxChip: {
    fontSize: 11,
    fontWeight: 700,
    background: 'rgba(247,87,9,0.08)',
    color: ORANGE,
    border: '1px solid rgba(247,87,9,0.18)',
    padding: '2px 6px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
    letterSpacing: 0.2,
  },
}
