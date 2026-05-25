import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { CheckIcon } from '../components/Icons'
import AvatarUpload from '../components/AvatarUpload'

const ORANGE = '#F75709'

function isNew(dateStr) {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000
}

function truncate(str, n = 80) {
  if (!str) return '—'
  return str.length > n ? str.slice(0, n) + '…' : str
}

export default function CoachAthletes() {
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/survey/team')
      .then(r => setAthletes(r.data.athletes || []))
      .catch(() => setAthletes([]))
      .finally(() => setLoading(false))
  }, [])

  const completedCount = athletes.filter(a => a.survey).length

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Athletes</h1>
        {!loading && athletes.length > 0 && (
          <p style={styles.subtitle}>
            {completedCount} of {athletes.length} survey complete
          </p>
        )}
      </div>

      {loading ? (
        <p style={styles.empty}>Loading…</p>
      ) : athletes.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No athletes yet</p>
          <p style={styles.emptyDesc}>
            Share your invite link from the Dashboard to get your team started.
          </p>
        </div>
      ) : (
        <div style={styles.card}>
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
                    onClick={() => navigate(`/coach/athletes/${a.id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AvatarUpload
                          name={a.full_name}
                          avatarUrl={a.avatar_url}
                          size={32}
                          color="#F75709"
                          editable={false}
                        />
                        <span style={{ fontWeight: 600 }}>{a.full_name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>{a.survey?.sport || '—'}</td>
                    <td style={styles.td}>{a.survey?.position || '—'}</td>
                    <td style={{ ...styles.td, maxWidth: 200 }}>{truncate(a.survey?.goals)}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {a.survey?.time_per_week ?? '—'}
                    </td>
                    <td style={styles.td}>
                      {a.survey ? (
                        <span style={styles.badgeComplete}>
                          <CheckIcon size={12} color="#2e7d32" />
                          Complete
                          {isNew(a.survey.completed_at) && (
                            <span style={styles.newBadge}>New</span>
                          )}
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
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 900, margin: '0 auto' },

  pageHeader: { marginBottom: 28 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: 'var(--text-3)', margin: 0 },

  empty: { color: 'var(--text-3)', fontSize: 15 },
  emptyState: { textAlign: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: 'var(--text-2)' },

  card: { background: 'var(--card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' },
  tableWrapper: { overflowX: 'auto', margin: '0 -4px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    fontWeight: 700,
    fontSize: 11,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border-light)',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  td: { padding: '12px 12px', color: 'var(--text)', verticalAlign: 'top' },
  badgeComplete: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: '#e8f5e9',
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: 700,
    padding: '3px 9px',
    borderRadius: 5,
  },
  newBadge: {
    background: ORANGE,
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 3,
  },
  badgePending: {
    background: 'var(--border)',
    color: 'var(--text-3)',
    fontSize: 12,
    fontWeight: 600,
    padding: '3px 9px',
    borderRadius: 5,
  },
}
