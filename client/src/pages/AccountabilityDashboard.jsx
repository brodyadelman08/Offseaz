import { useState, useEffect } from 'react'
import api from '../services/api'
import { ClipboardIcon, FlameIcon } from '../components/Icons'

const ORANGE = '#F75709'
const YELLOW = '#F0BE24'

const STATUS = {
  logged:    { label: 'Logged',     color: '#2e7d32', bg: '#e8f5e9', border: '#2e7d32' },
  notLogged: { label: 'Not logged', color: '#b45309', bg: '#fef3c7', border: '#d97706' },
}

const LOG_STATUS = {
  completed: { label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
  partial:   { label: 'Partial',   color: '#b45309', bg: '#fef3c7' },
  skipped:   { label: 'Skipped',   color: '#888',    bg: '#f0f0f0' },
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'logged',    label: 'Logged this week' },
  { key: 'notLogged', label: 'Not logged' },
]

export default function AccountabilityDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/api/workouts/accountability')
      .then(res => setData(res.data))
      .catch(() => setData({ athletes: [], logs: [] }))
      .finally(() => setLoading(false))
  }, [])

  const athletes = data?.athletes || []
  const logs = data?.logs || []

  const filtered = athletes.filter(a => {
    if (filter === 'logged')    return a.logged_this_week
    if (filter === 'notLogged') return !a.logged_this_week
    return true
  })

  const loggedCount    = athletes.filter(a => a.logged_this_week).length
  const notLoggedCount = athletes.length - loggedCount
  const filterCounts   = { all: athletes.length, logged: loggedCount, notLogged: notLoggedCount }

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Accountability</h1>
        {!loading && athletes.length > 0 && (
          <p style={styles.pageSubtitle}>
            <span style={{ color: loggedCount > 0 ? '#2e7d32' : 'var(--text-3)', fontWeight: 700 }}>
              {loggedCount}
            </span>
            {' of '}
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{athletes.length}</span>
            {' athletes logged this week'}
          </p>
        )}
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading…</p>
      ) : athletes.length === 0 ? (
        <div style={styles.emptyState}>
          <ClipboardIcon size={40} color="var(--text-3)" />
          <h2 style={styles.emptyTitle}>No athletes yet</h2>
          <p style={styles.emptyDesc}>Share your invite link so athletes can join your team.</p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div style={styles.filterBar}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                style={{
                  ...styles.filterBtn,
                  ...(filter === f.key ? { borderColor: ORANGE, color: ORANGE } : {}),
                }}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span style={{
                  ...styles.filterCount,
                  ...(filter === f.key ? { background: ORANGE, color: '#fff' } : {}),
                }}>
                  {filterCounts[f.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Athlete grid */}
          {filtered.length === 0 ? (
            <p style={styles.emptyFilter}>No athletes match this filter.</p>
          ) : (
            <div style={styles.athleteGrid}>
              {filtered.map(a => {
                const s = a.logged_this_week ? STATUS.logged : STATUS.notLogged
                return (
                  <div key={a.id} style={{ ...styles.athleteCard, borderLeftColor: s.border }}>
                    <div style={styles.cardTop}>
                      <div style={styles.avatarRow}>
                        <div style={styles.avatar}>{initials(a.full_name)}</div>
                        <span style={styles.athleteName}>{a.full_name}</span>
                      </div>
                      <span style={{ ...styles.statusBadge, color: s.color, background: s.bg }}>
                        {s.label}
                      </span>
                    </div>

                    <div style={styles.statsRow}>
                      <div style={styles.statItem}>
                        <span style={styles.statVal}>
                          {a.sessions_this_week > 0 ? a.sessions_this_week : '—'}
                        </span>
                        <span style={styles.statLabel}>this week</span>
                      </div>
                      <div style={styles.statDivider} />
                      <div style={styles.statItem}>
                        <span style={{
                          ...styles.statVal,
                          color: a.streak_weeks > 0 ? YELLOW : 'var(--text)',
                          textShadow: a.streak_weeks > 0 ? '0 0 14px rgba(240,190,36,0.65)' : 'none',
                        }}>
                          {a.streak_weeks > 0 ? `${a.streak_weeks}w` : '—'}
                        </span>
                        <div style={styles.statLabelRow}>
                          <span style={styles.statLabel}>streak</span>
                          {a.streak_weeks > 0 && <FlameIcon size={11} color={YELLOW} />}
                        </div>
                      </div>
                      <div style={styles.statDivider} />
                      <div style={styles.statItem}>
                        <span style={styles.statVal}>
                          {a.avg_effort_this_week != null ? a.avg_effort_this_week : '—'}
                        </span>
                        <span style={styles.statLabel}>avg effort</span>
                      </div>
                    </div>

                    <p style={styles.lastLogged}>Last logged {timeAgo(a.last_logged_at)}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Activity feed */}
          <div style={styles.feedSection}>
            <h2 style={styles.feedTitle}>Recent Activity</h2>
            {logs.length === 0 ? (
              <p style={styles.emptyFeed}>No sessions logged yet.</p>
            ) : (
              <div style={styles.feedList}>
                {logs.map(log => {
                  const ls = LOG_STATUS[log.status]
                  return (
                    <div key={log.id} style={styles.feedRow}>
                      <div style={styles.feedLeft}>
                        <span style={styles.feedName}>{log.athlete_name}</span>
                        <span style={styles.feedFocus}>{log.session_focus || 'Session'}</span>
                        {log.week_number && (
                          <span style={styles.feedWeek}>Wk {log.week_number}</span>
                        )}
                      </div>
                      <div style={styles.feedRight}>
                        <span style={{ ...styles.feedBadge, color: ls.color, background: ls.bg }}>
                          {ls.label}{log.effort ? ` · ${log.effort}` : ''}
                        </span>
                        <span style={styles.feedTime}>{timeAgo(log.logged_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 900, margin: '0 auto' },

  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' },
  pageSubtitle: { fontSize: 14, color: 'var(--text-2)', margin: 0 },
  loadingText: { color: 'var(--text-3)', fontSize: 15 },

  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 },
  emptyDesc: { color: 'var(--text-2)', fontSize: 14, margin: 0 },

  filterBar: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '2px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--text-2)', transition: 'border-color 0.15s, color 0.15s' },
  filterCount: { fontSize: 12, fontWeight: 700, background: 'var(--border)', color: 'var(--text-3)', borderRadius: 10, padding: '1px 7px', transition: 'background 0.15s, color 0.15s' },
  emptyFilter: { color: 'var(--text-3)', fontSize: 14, paddingTop: 8 },

  athleteGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginBottom: 36 },
  athleteCard: { background: 'var(--card)', border: '1px solid var(--border)', borderLeft: '4px solid', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatarRow: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: ORANGE, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  athleteName: { fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusBadge: { fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 },

  statsRow: { display: 'flex', alignItems: 'center', gap: 12 },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
  statVal: { fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  statLabel: { fontSize: 11, color: 'var(--text-3)', marginTop: 2 },
  statLabelRow: { display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 },
  statDivider: { width: 1, height: 28, background: 'var(--border)' },
  lastLogged: { fontSize: 12, color: 'var(--text-3)', margin: 0 },

  feedSection: { borderTop: '1px solid var(--border)', paddingTop: 28 },
  feedTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 },
  emptyFeed: { color: 'var(--text-3)', fontSize: 14 },
  feedList: { display: 'flex', flexDirection: 'column' },
  feedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)', gap: 12 },
  feedLeft: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 },
  feedName: { fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' },
  feedFocus: { fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  feedWeek: { fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' },
  feedRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  feedBadge: { fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' },
  feedTime: { fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' },
}
