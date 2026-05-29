import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import AvatarUpload from '../components/AvatarUpload'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'

const LIFT_ABBREVS = [
  { key: 'bench_press',       abbrev: 'BP'  },
  { key: 'squat',             abbrev: 'SQ'  },
  { key: 'deadlift',          abbrev: 'DL'  },
  { key: 'trap_bar_deadlift', abbrev: 'TBD' },
  { key: 'power_clean',       abbrev: 'PC'  },
  { key: 'overhead_press',    abbrev: 'OHP' },
]

export default function AthleteRoster() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/roster')
      .then(r => {
        setTeam(r.data.team)
        setRoster(r.data.roster || [])
      })
      .catch(err => {
        console.error('[AthleteRoster] failed to load roster:', err?.response?.data?.error || err.message)
      })
      .finally(() => setLoading(false))
  }, [])

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
        <p style={styles.empty}>Loading…</p>
      ) : !team ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>You're not on a team yet</p>
          <p style={styles.emptyDesc}>
            Enter a join code from your coach to join a team.
          </p>
          <button style={styles.joinBtn} onClick={() => navigate('/athlete')}>
            Go to Dashboard
          </button>
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
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'rgba(247,87,9,0.40)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'var(--border)')}
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
    borderRadius: 8,
    border: 'none',
    background: BLUE,
    color: '#fff',
    cursor: 'pointer',
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
    borderRadius: 12,
    padding: '14px 18px',
    marginBottom: 0,
    transition: 'border-color 0.15s',
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
    padding: '3px 8px',
    borderRadius: 5,
  },
  youBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: 'rgba(247,87,9,0.10)',
    color: ORANGE,
    border: '1px solid rgba(247,87,9,0.22)',
    padding: '3px 8px',
    borderRadius: 5,
  },
  privateBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: 'var(--border)',
    color: 'var(--text-3)',
    padding: '3px 8px',
    borderRadius: 5,
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
