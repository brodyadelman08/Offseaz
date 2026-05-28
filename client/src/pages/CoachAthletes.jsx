import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { CheckIcon } from '../components/Icons'
import AvatarUpload from '../components/AvatarUpload'

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
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('name')

  useEffect(() => {
    setLoading(true)
    api.get(`/api/roster?sort=${sort}`)
      .then(r => setAthletes(r.data.roster || []))
      .catch(() => setAthletes([]))
      .finally(() => setLoading(false))
  }, [sort])

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
      ) : athletes.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No athletes yet</p>
          <p style={styles.emptyDesc}>
            Share your invite code from the Dashboard to get your team started.
          </p>
        </div>
      ) : (
        <div style={styles.card}>
          <div style={styles.tableWrapper}>
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
                {athletes.map(a => (
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
    borderRadius: 7,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },

  empty: { color: 'var(--text-3)', fontSize: 15 },
  emptyState: { textAlign: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: 'var(--text-2)' },

  card: {
    background: 'var(--card)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  tableWrapper: { overflowX: 'auto' },
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

  athleteName: { fontWeight: 600, fontSize: 14 },
  injuryFlag: {
    fontSize: 13,
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
    borderRadius: 5,
    whiteSpace: 'nowrap',
  },
  badgePending: {
    background: 'var(--border)',
    color: 'var(--text-3)',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 5,
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
