import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const STATUS = {
  logged:     { label: '✓ Logged',      color: '#2e7d32', bg: '#e8f5e9', border: '#2e7d32' },
  notLogged:  { label: '✗ Not logged',  color: '#b45309', bg: '#fef3c7', border: '#d97706' },
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
  const navigate = useNavigate()
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

  const filterCounts = { all: athletes.length, logged: loggedCount, notLogged: notLoggedCount }

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={() => navigate('/coach')}>← Back to dashboard</button>

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Accountability</h1>
        {!loading && athletes.length > 0 && (
          <p style={styles.pageSubtitle}>
            {loggedCount} of {athletes.length} logged this week
          </p>
        )}
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading…</p>
      ) : athletes.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No athletes yet</p>
          <p style={styles.emptyDesc}>Share your invite link so athletes can join your team.</p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div style={styles.filterBar}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                style={{ ...styles.filterBtn, ...(filter === f.key ? styles.filterBtnActive : {}) }}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span style={{ ...styles.filterCount, ...(filter === f.key ? styles.filterCountActive : {}) }}>
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
                      <span style={styles.stat}>
                        <span style={styles.statVal}>
                          {a.sessions_this_week > 0 ? a.sessions_this_week : '—'}
                        </span>
                        <span style={styles.statLabel}> sessions this wk</span>
                      </span>
                      <span style={styles.statDivider}>·</span>
                      <span style={styles.stat}>
                        <span style={styles.statVal}>
                          {a.streak_weeks > 0 ? `${a.streak_weeks} wk` : '—'}
                        </span>
                        <span style={styles.statLabel}> streak</span>
                      </span>
                      <span style={styles.statDivider}>·</span>
                      <span style={styles.stat}>
                        <span style={styles.statVal}>
                          {a.avg_effort_this_week != null ? a.avg_effort_this_week : '—'}
                        </span>
                        <span style={styles.statLabel}> avg effort</span>
                      </span>
                    </div>

                    <p style={styles.lastLogged}>
                      Last logged {timeAgo(a.last_logged_at)}
                    </p>
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
  container:        { maxWidth: 860, margin: '0 auto', padding: '32px 20px' },
  backLink:         { background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'block' },
  pageHeader:       { marginBottom: 24 },
  pageTitle:        { fontSize: 26, fontWeight: 700, margin: '0 0 4px' },
  pageSubtitle:     { fontSize: 14, color: '#888', margin: 0 },
  loadingText:      { color: '#aaa', fontSize: 15 },

  emptyState:       { textAlign: 'center', paddingTop: 60 },
  emptyTitle:       { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  emptyDesc:        { color: '#777', fontSize: 14 },

  filterBar:        { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn:        { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: '2px solid #e5e5e5', background: '#fff', cursor: 'pointer', color: '#555' },
  filterBtnActive:  { borderColor: '#1a1a1a', color: '#1a1a1a' },
  filterCount:      { fontSize: 12, fontWeight: 700, background: '#f0f0f0', color: '#888', borderRadius: 10, padding: '1px 7px' },
  filterCountActive:{ background: '#1a1a1a', color: '#fff' },
  emptyFilter:      { color: '#aaa', fontSize: 14, paddingTop: 8 },

  athleteGrid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginBottom: 32 },
  athleteCard:      { background: '#fff', border: '1px solid #e5e5e5', borderLeft: '4px solid #e5e5e5', borderRadius: 8, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  cardTop:          { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatarRow:        { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar:           { width: 36, height: 36, borderRadius: '50%', background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  athleteName:      { fontSize: 15, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusBadge:      { fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0 },

  statsRow:         { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  stat:             { fontSize: 13 },
  statVal:          { fontWeight: 700, color: '#1a1a1a' },
  statLabel:        { color: '#888' },
  statDivider:      { color: '#ccc', fontSize: 12 },
  lastLogged:       { fontSize: 12, color: '#aaa', margin: 0 },

  feedSection:      { borderTop: '1px solid #e5e5e5', paddingTop: 24 },
  feedTitle:        { fontSize: 17, fontWeight: 700, marginBottom: 14 },
  emptyFeed:        { color: '#aaa', fontSize: 14 },
  feedList:         { display: 'flex', flexDirection: 'column' },
  feedRow:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', gap: 12 },
  feedLeft:         { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 },
  feedName:         { fontSize: 14, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap' },
  feedFocus:        { fontSize: 13, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  feedWeek:         { fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' },
  feedRight:        { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  feedBadge:        { fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' },
  feedTime:         { fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' },
}
