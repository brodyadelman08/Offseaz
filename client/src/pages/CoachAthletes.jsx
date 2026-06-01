import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { CheckIcon } from '../components/Icons'
import AvatarUpload from '../components/AvatarUpload'
import { useIsMobile } from '../components/Sidebar'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const LIFT_ABBREVS = [
  { key: 'bench_press',    abbrev: 'BP' },
  { key: 'squat',          abbrev: 'SQ' },
  { key: 'deadlift',       abbrev: 'DL' },
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

export default function CoachAthletes() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('name')

  useEffect(() => {
    setLoading(true)
    api.get('/api/roster')
      .then(r => setAthletes(r.data.roster || []))
      .catch(() => setAthletes([]))
      .finally(() => setLoading(false))
  }, [])

  // Client-side sort
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

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Team Roster</h1>
          {!loading && athletes.length > 0 && (
            <p style={styles.subtitle}>
              {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} ·{' '}
              <span style={{ color: BLUE }}>{surveyCount} survey complete</span>
            </p>
          )}
        </div>

        {/* Sort controls */}
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
      </div>

      {loading ? (
        <p style={styles.empty}>Loading…</p>
      ) : sorted.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No athletes yet</p>
          <p style={styles.emptyDesc}>
            Share your invite code from the Dashboard to get your team started.
          </p>
        </div>
      ) : isMobile ? (
        /* ── Mobile card layout ─────────────────────────────────────── */
        <div style={styles.mobileList}>
          {sorted.map(a => (
            <div
              key={a.id}
              style={styles.mobileCard}
              onClick={() => navigate(`/coach/athletes/${a.id}`)}
            >
              <div style={styles.mobileCardTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <AvatarUpload
                    name={a.full_name}
                    avatarUrl={a.avatar_url}
                    size={38}
                    color={ORANGE}
                    editable={false}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.mobileAthleteNameRow}>
                      <span style={styles.athleteName}>{a.full_name}</span>
                      {a.has_recent_injury && (
                        <span style={styles.injuryFlag} title="Flagged an injury in the last 7 days">⚠</span>
                      )}
                    </div>
                    {a.survey?.sport && (
                      <span style={styles.mobileSport}>
                        {a.survey.sport}{a.survey.position ? ` · ${a.survey.position}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {a.survey ? (
                    <span style={styles.badgeComplete}>
                      <CheckIcon size={11} color="#2e7d32" /> Done
                    </span>
                  ) : (
                    <span style={styles.badgePending}>Pending</span>
                  )}
                  <span style={styles.mobileJoined}>{fmtDate(a.joined_at)}</span>
                </div>
              </div>
              {a.maxes && LIFT_ABBREVS.some(l => a.maxes[l.key]) && (
                <div style={styles.mobileMaxes}>
                  <MaxesCell maxes={a.maxes} />
                </div>
              )}
              <span style={styles.mobileChevron}>›</span>
            </div>
          ))}
        </div>
      ) : (
        /* ── Desktop table layout ───────────────────────────────────── */
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
                <tr
                  key={a.id}
                  style={styles.tr}
                  onClick={() => navigate(`/coach/athletes/${a.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Athlete name + avatar */}
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AvatarUpload
                        name={a.full_name}
                        avatarUrl={a.avatar_url}
                        size={34}
                        color={ORANGE}
                        editable={false}
                      />
                      <span style={styles.athleteName}>{a.full_name}</span>
                      {a.has_recent_injury && (
                        <span style={styles.injuryFlag} title="Flagged an injury in the last 7 days">
                          ⚠
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Sport / Position */}
                  <td style={styles.td}>
                    {a.survey?.sport
                      ? (
                        <div>
                          <span style={styles.sport}>{a.survey.sport}</span>
                          {a.survey.position && (
                            <span style={styles.position}>{a.survey.position}</span>
                          )}
                        </div>
                      )
                      : <span style={styles.dash}>—</span>
                    }
                  </td>

                  {/* Survey status */}
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    {a.survey ? (
                      <span style={styles.badgeComplete}>
                        <CheckIcon size={11} color="#2e7d32" /> Done
                      </span>
                    ) : (
                      <span style={styles.badgePending}>Pending</span>
                    )}
                  </td>

                  {/* Lifting PRs */}
                  <td style={styles.td}>
                    <MaxesCell maxes={a.maxes} />
                  </td>

                  {/* Join date */}
                  <td style={{ ...styles.td, color: 'var(--text-3)', fontSize: 13 }}>
                    {fmtDate(a.joined_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 960, margin: '0 auto' },

  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: 'var(--text-3)', margin: 0 },

  sortRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  sortBtn: {
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },

  empty: { color: 'var(--text-3)', fontSize: 15 },
  emptyState: { textAlign: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: 'var(--text-2)' },

  /* Desktop table */
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
  tr: {
    borderBottom: '1px solid var(--border-light)',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  td: { padding: '13px 14px', color: 'var(--text)', verticalAlign: 'middle' },

  /* Mobile card list */
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
  mobileCardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  mobileAthleteNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  mobileSport: {
    display: 'block',
    fontSize: 12,
    color: 'var(--text-3)',
    marginTop: 2,
  },
  mobileJoined: {
    fontSize: 11,
    color: 'var(--text-3)',
  },
  mobileMaxes: {
    borderTop: '1px solid var(--border-light)',
    paddingTop: 8,
  },
  mobileChevron: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    fontSize: 18,
    color: 'var(--text-3)',
    lineHeight: 1,
  },

  athleteName: { fontWeight: 600, fontSize: 14 },
  injuryFlag: {
    fontSize: 12,
    color: '#c73820',
    background: '#fce8e6',
    border: '1px solid rgba(199,56,32,0.25)',
    padding: '2px 6px',
    borderRadius: 4,
    fontWeight: 700,
    cursor: 'default',
    whiteSpace: 'nowrap',
  },
  sport: { display: 'block', fontWeight: 600, color: 'var(--text)', fontSize: 13 },
  position: { display: 'block', color: 'var(--text-3)', fontSize: 12, marginTop: 2 },
  dash: { color: 'var(--text-3)', fontSize: 13 },

  badgeComplete: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: '#e8f5e9',
    color: '#2e7d32',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    whiteSpace: 'nowrap',
  },
  badgePending: {
    background: 'var(--border)',
    color: 'var(--text-3)',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 6,
    display: 'inline-block',
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
