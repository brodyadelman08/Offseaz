import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const ORANGE = '#F75709'

// Admin-only view of /feedback survey responses. There is no admin role in
// this app (CLAUDE.md: "Two roles only: coach and athlete") — any logged-in
// coach or athlete can reach this route client-side, but GET /api/feedback
// on the server only returns data for the single hardcoded ADMIN_EMAIL
// (see server/src/controllers/feedbackController.js). Everyone else gets a
// 403, shown below as "Not authorized."
const ROLE_OPTIONS = ['Athlete', 'Coach', 'Parent', 'Trainer', 'Just interested', 'Other']

const CSV_COLUMNS = [
  { key: 'created_at',       label: 'Submitted' },
  { key: 'role',              label: 'Role' },
  { key: 'role_other',        label: 'Role (Other)' },
  { key: 'sport',             label: 'Sport' },
  { key: 'level',             label: 'Level' },
  { key: 'level_other',       label: 'Level (Other)' },
  { key: 'offseason',         label: 'Offseason Training' },
  { key: 'offseason_other',   label: 'Offseason (Other)' },
  { key: 'has_coach',         label: 'Strength Coach?' },
  { key: 'heard_about',       label: 'Heard About Us' },
  { key: 'heard_about_other', label: 'Heard About (Other)' },
  { key: 'email',             label: 'Email' },
  { key: 'feedback',          label: 'Feedback' },
]

function toCsvField(value) {
  const str = value == null ? '' : String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function downloadCsv(rows) {
  const lines = [CSV_COLUMNS.map(c => toCsvField(c.label)).join(',')]
  for (const r of rows) {
    lines.push(CSV_COLUMNS.map(c => toCsvField(c.key === 'created_at' ? new Date(r.created_at).toISOString() : r[c.key])).join(','))
  }
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `offseaz-feedback-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AdminFeedback() {
  const { session } = useAuth()
  const [responses, setResponses] = useState(null)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    api.get('/api/feedback')
      .then(res => setResponses(res.data.responses))
      .catch(err => setError(err.response?.status === 403
        ? 'Not authorized.'
        : (err.response?.data?.error || 'Failed to load responses.')))
      .finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => {
    if (!responses?.length) return null
    const total = responses.length
    const byRole = ROLE_OPTIONS.map(role => ({
      role,
      count: responses.filter(r => r.role === role).length,
    })).filter(r => r.count > 0)
    const noCoachCount = responses.filter(r => r.has_coach === 'No').length
    const noCoachPct = Math.round((noCoachCount / total) * 1000) / 10
    return { total, byRole, noCoachPct }
  }, [responses])

  const filtered = useMemo(() => {
    if (!responses) return []
    return roleFilter === 'all' ? responses : responses.filter(r => r.role === roleFilter)
  }, [responses, roleFilter])

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Feedback Responses</h1>
        <p style={s.sub}>
          {session?.user?.email ? `Signed in as ${session.user.email}` : ''}
          {responses ? ` · ${responses.length} response${responses.length === 1 ? '' : 's'}` : ''}
        </p>
      </div>

      {loading && <p style={s.status}>Loading…</p>}
      {!loading && error && <p style={{ ...s.status, color: ORANGE }}>{error}</p>}
      {!loading && !error && responses?.length === 0 && <p style={s.status}>No responses yet.</p>}

      {!loading && !error && summary && (
        <div style={s.summaryRow}>
          <div style={s.statCard}>
            <span style={s.statValue}>{summary.total}</span>
            <span style={s.statLabel}>Total Responses</span>
          </div>
          <div style={s.statCard}>
            <span style={{ ...s.statValue, color: ORANGE }}>{summary.noCoachPct}%</span>
            <span style={s.statLabel}>No Strength Coach</span>
          </div>
          <div style={{ ...s.statCard, flex: '2 1 280px' }}>
            <span style={s.statLabel}>Breakdown by Role</span>
            <div style={s.roleBreakdown}>
              {summary.byRole.map(({ role, count }) => (
                <span key={role} style={s.roleChip}>{role} <b>{count}</b></span>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && responses?.length > 0 && (
        <div style={s.controls}>
          <label style={s.filterLabel}>
            Filter by role:&nbsp;
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={s.select}>
              <option value="all">All ({responses.length})</option>
              {ROLE_OPTIONS.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <button style={s.csvBtn} onClick={() => downloadCsv(responses)}>
            Download CSV
          </button>
        </div>
      )}

      {!loading && !error && responses?.length > 0 && (
        <div style={s.list}>
          {filtered.length === 0 && <p style={s.status}>No responses match this filter.</p>}
          {filtered.map(r => (
            <div key={r.id} style={s.card}>
              <div style={s.cardTop}>
                <span style={s.role}>
                  {r.role === 'Other' ? `Other: ${r.role_other || '—'}` : r.role}
                </span>
                <span style={s.date}>{new Date(r.created_at).toLocaleString()}</span>
              </div>

              <div style={s.grid}>
                <Field label="Sport" value={r.sport} />
                <Field label="Level" value={r.level === 'Other' ? `Other: ${r.level_other || '—'}` : r.level} />
                <Field label="Offseason training" value={r.offseason === 'Other' ? `Other: ${r.offseason_other || '—'}` : r.offseason} />
                <Field label="Has strength coach" value={r.has_coach} />
                <Field label="Heard about us via" value={r.heard_about === 'Other' ? `Other: ${r.heard_about_other || '—'}` : r.heard_about} />
                <Field label="Email" value={r.email} />
              </div>

              {r.feedback && (
                <div style={s.feedbackBlock}>
                  <span style={s.feedbackLabel}>Feedback</span>
                  <p style={s.feedbackText}>{r.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }) {
  if (!value) return null
  return (
    <div style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <span style={s.fieldValue}>{value}</span>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#0F0F0F', color: '#EFEFEF', fontFamily: "Inter, system-ui, -apple-system, sans-serif", padding: 'clamp(20px,4vw,40px)' },
  header: { maxWidth: 900, margin: '0 auto 24px' },
  title: { fontSize: 'clamp(22px,3vw,28px)', fontWeight: 800, margin: '0 0 6px' },
  sub: { fontSize: 13, color: '#888', margin: 0 },
  status: { maxWidth: 900, margin: '40px auto', textAlign: 'center', color: '#888', fontSize: 15 },

  summaryRow: { maxWidth: 900, margin: '0 auto 18px', display: 'flex', flexWrap: 'wrap', gap: 14 },
  statCard: { background: '#1A1A1A', border: '1px solid #262626', borderRadius: 14, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 160px' },
  statValue: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  roleBreakdown: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  roleChip: { fontSize: 13, color: '#CCC', background: '#222', border: '1px solid #2A2A2A', borderRadius: 8, padding: '4px 10px' },

  controls: { maxWidth: 900, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  filterLabel: { fontSize: 13, color: '#AAA' },
  select: { background: '#1A1A1A', color: '#EFEFEF', border: '1px solid #2A2A2A', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit' },
  csvBtn: { background: ORANGE, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },

  list: { maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 },
  card: { background: '#1A1A1A', border: '1px solid #262626', borderRadius: 14, padding: '18px 20px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #262626' },
  role: { fontSize: 14, fontWeight: 700, color: ORANGE },
  date: { fontSize: 12, color: '#666' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 2 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldValue: { fontSize: 14, color: '#DDD' },
  feedbackBlock: { marginTop: 14, paddingTop: 14, borderTop: '1px solid #262626' },
  feedbackLabel: { fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4 },
  feedbackText: { fontSize: 14, color: '#DDD', lineHeight: 1.6, margin: '6px 0 0', whiteSpace: 'pre-wrap' },
}
