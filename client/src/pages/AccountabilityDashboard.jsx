import { useState, useEffect, Component } from 'react'
import api from '../services/api'
import { ClipboardIcon, FlameIcon, AlertIcon } from '../components/Icons'

const ORANGE = '#F75709'
const YELLOW = '#F0BE24'
const BLUE   = '#308EBD'

// Brand color system: blue = informational (logged, no action needed)
//                    orange = action required (not logged, coach should follow up)
const STATUS = {
  logged:    { label: 'Logged',     color: '#308EBD', bg: 'rgba(48,142,189,0.12)',  border: '#308EBD' },
  notLogged: { label: 'Not logged', color: '#F75709', bg: 'rgba(247,87,9,0.10)',    border: '#F75709' },
}

const LOG_STATUS = {
  completed:       { label: 'Completed',        color: '#2e7d32', bg: '#e8f5e9' },
  partial:         { label: 'Partial',          color: '#b45309', bg: '#fef3c7' },
  skipped:         { label: 'Skipped',          color: '#888',    bg: '#f0f0f0' },
  skipped_injury:  { label: 'Skipped — Injury', color: '#c73820', bg: '#fce8e6' },
}

// Fallback for any unexpected status value — prevents render crash
const LOG_STATUS_FALLBACK = { label: 'Logged', color: '#888', bg: '#f0f0f0' }

function getLogStatus(status) {
  const ls = LOG_STATUS[status]
  if (!ls) {
    console.warn('[AccountabilityDashboard] Unknown log status:', status)
    return LOG_STATUS_FALLBACK
  }
  return ls
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

// ── Error boundary so a render crash shows a recoverable UI instead of grey ──
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) {
    console.error('[AccountabilityDashboard] Render error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 8 }}>
            Something went wrong loading this page.
          </p>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 20 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ORANGE, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function AccountabilityDashboard() {
  return (
    <ErrorBoundary>
      <AccountabilityInner />
    </ErrorBoundary>
  )
}

function AccountabilityInner() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    console.log('[AccountabilityDashboard] Fetching accountability data…')
    api.get('/api/workouts/accountability')
      .then(res => {
        console.log('[AccountabilityDashboard] Data received:', {
          athletes: res.data?.athletes?.length,
          logs: res.data?.logs?.length,
          rawKeys: Object.keys(res.data || {}),
        })
        setData(res.data)
      })
      .catch(err => {
        console.error('[AccountabilityDashboard] API error:', err?.response?.status, err?.response?.data?.error || err.message)
        setApiError(err?.response?.data?.error || err.message || 'Failed to load')
        setData({ athletes: [], logs: [] })
      })
      .finally(() => setLoading(false))
  }, [])

  const athletes = data?.athletes || []
  const logs = data?.logs || []

  // Log unexpected data shapes that could cause render crashes
  if (!loading && data) {
    logs.forEach((log, i) => {
      if (!LOG_STATUS[log.status]) {
        console.warn(`[AccountabilityDashboard] Log[${i}] has unknown status "${log.status}" — id:`, log.id)
      }
      if (!log.id) {
        console.warn(`[AccountabilityDashboard] Log[${i}] has no id:`, log)
      }
    })
  }

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

      {/* API error banner — visible above the empty state so we can debug on device */}
      {apiError && !loading && (
        <div style={{ background: 'rgba(199,56,32,0.10)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          <AlertIcon size={14} color="#c73820" /> API error: {apiError}
        </div>
      )}

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
                        <div>
                          <span style={styles.athleteName}>{a.full_name}</span>
                          {a.today_readiness !== null && a.today_readiness < 40 && (
                            <span style={styles.cautionBadge}>⚠ Low readiness</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ ...styles.statusBadge, color: s.color, background: s.bg }}>
                          {s.label}
                        </span>
                        {a.today_is_rest_day && (
                          <span style={styles.restDayChip}>😴 Rest Day</span>
                        )}
                      </div>
                    </div>
                    {a.checked_in_today && a.today_readiness !== null && (
                      <div style={styles.readinessRow}>
                        <span style={styles.readinessLabel}>Readiness</span>
                        <div style={styles.readinessBar}>
                          <div style={{
                            ...styles.readinessFill,
                            width: `${a.today_readiness}%`,
                            background: a.today_readiness >= 70 ? BLUE : a.today_readiness >= 40 ? YELLOW : ORANGE,
                          }} />
                        </div>
                        <span style={{
                          ...styles.readinessScore,
                          color: a.today_readiness >= 70 ? BLUE : a.today_readiness >= 40 ? YELLOW : ORANGE,
                        }}>
                          {a.today_readiness}
                        </span>
                      </div>
                    )}

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
                          color: a.streak_days > 0 ? YELLOW : 'var(--text)',
                          textShadow: a.streak_days > 0 ? '0 0 14px rgba(240,190,36,0.65)' : 'none',
                        }}>
                          {a.streak_days > 0 ? `${a.streak_days}d` : '—'}
                        </span>
                        <div style={styles.statLabelRow}>
                          <span style={styles.statLabel}>streak</span>
                          {a.streak_days > 0 && <FlameIcon size={11} color={YELLOW} />}
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
                {logs.map((log, idx) => {
                  // Use getLogStatus() — safe wrapper that never returns undefined
                  const ls = getLogStatus(log.status)
                  // Use idx as fallback key if log.id is missing
                  return (
                    <div key={log.id ?? idx} style={{ ...styles.feedRow, borderLeft: `3px solid ${log.accent_color || 'transparent'}`, paddingLeft: 10 }}>
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
  filterBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '2px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--text-2)', transition: 'border-color 0.15s, color 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' },
  filterCount: { fontSize: 12, fontWeight: 700, background: 'var(--border)', color: 'var(--text-3)', borderRadius: 10, padding: '1px 7px', transition: 'background 0.15s, color 0.15s' },
  emptyFilter: { color: 'var(--text-3)', fontSize: 14, paddingTop: 8 },

  athleteGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 12, marginBottom: 36 },
  athleteCard: { background: 'var(--card)', border: '1px solid var(--border)', borderLeft: '4px solid', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.04)' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatarRow: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: ORANGE, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  athleteName: { fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' },
  cautionBadge: { display: 'inline-block', fontSize: 11, fontWeight: 700, color: YELLOW, background: 'rgba(240,190,36,0.12)', border: '1px solid rgba(240,190,36,0.25)', borderRadius: 4, padding: '1px 6px', marginTop: 3 },
  statusBadge: { fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 },
  restDayChip: { fontSize: 11, fontWeight: 600, color: BLUE, background: 'rgba(48,142,189,0.10)', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' },
  readinessRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 },
  readinessLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap', minWidth: 58 },
  readinessBar: { flex: 1, height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' },
  readinessFill: { height: '100%', borderRadius: 4, transition: 'width 0.4s' },
  readinessScore: { fontSize: 13, fontWeight: 700, minWidth: 28, textAlign: 'right' },

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
  feedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border-light)', gap: 8, flexWrap: 'wrap' },
  feedLeft: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: 1 },
  feedName: { fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' },
  feedFocus: { fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'clamp(100px, 30vw, 200px)' },
  feedWeek: { fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' },
  feedRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  feedBadge: { fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' },
  feedTime: { fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' },
}
