import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { FlameIcon, CalendarIcon, EditIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE = '#308EBD'
const YELLOW = '#F0BE24'

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

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function AthleteMyProfile() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState(null)
  const [plan, setPlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/survey/my').then(r => r.data.survey).catch(() => null),
      api.get('/api/blueprints/my-plan').then(r => r.data.plan).catch(() => null),
      api.get('/api/workouts/mine').then(r => r.data.logs).catch(() => []),
    ]).then(([s, p, l]) => {
      setSurvey(s)
      setPlan(p)
      setLogs(l)
    }).finally(() => setLoading(false))
  }, [])

  const completedSessions = logs.filter(l => l.status === 'completed').length
  const avgEffort = logs.filter(l => l.effort != null).length > 0
    ? (logs.filter(l => l.effort != null).reduce((a, b) => a + b.effort, 0) /
       logs.filter(l => l.effort != null).length).toFixed(1)
    : null

  if (loading) return <div style={styles.loading}>Loading…</div>

  return (
    <div style={styles.container}>
      <div style={styles.profileHeader}>
        <div style={styles.avatar}>{initials(profile?.full_name)}</div>
        <div>
          <h1 style={styles.name}>{profile?.full_name}</h1>
          {survey && (
            <p style={styles.subline}>
              {[survey.sport, survey.position, survey.time_per_week ? `${survey.time_per_week} days/wk` : null]
                .filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderLeft: `3px solid ${ORANGE}` }}>
          <span style={styles.statVal}>{logs.length}</span>
          <span style={styles.statLabel}>Total sessions</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: `3px solid ${BLUE}` }}>
          <span style={{ ...styles.statVal, color: completedSessions > 0 ? BLUE : 'var(--text)' }}>
            {completedSessions}
          </span>
          <span style={styles.statLabel}>Completed</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: `3px solid ${YELLOW}` }}>
          <span style={{ ...styles.statVal, color: avgEffort ? YELLOW : 'var(--text)', textShadow: avgEffort ? '0 0 12px rgba(240,190,36,0.5)' : 'none' }}>
            {avgEffort ?? '—'}
          </span>
          <span style={styles.statLabel}>Avg effort</span>
        </div>
      </div>

      {/* Survey card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <p style={styles.cardLabel}>Athlete Survey</p>
          <button style={styles.editBtn} onClick={() => navigate('/survey')}>
            <EditIcon size={14} color={BLUE} />
            Retake
          </button>
        </div>
        {!survey ? (
          <div style={styles.emptyAction}>
            <p style={styles.emptyText}>Survey not completed yet.</p>
            <button style={styles.primaryBtn} onClick={() => navigate('/survey')}>
              Complete profile
            </button>
          </div>
        ) : (
          <>
            {[
              { label: 'Goals',          val: survey.goals },
              { label: 'Weaknesses',     val: survey.weaknesses },
              { label: 'Injury History', val: survey.injury_history },
            ].map(f => f.val ? (
              <div key={f.label} style={styles.surveyField}>
                <p style={styles.fieldLabel}>{f.label}</p>
                <p style={styles.fieldValue}>{f.val}</p>
              </div>
            ) : null)}
            {survey.equipment?.length > 0 && (
              <div style={styles.surveyField}>
                <p style={styles.fieldLabel}>Equipment</p>
                <div style={styles.pillRow}>
                  {survey.equipment.map((eq, i) => (
                    <span key={i} style={styles.pill}>{eq}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Current plan */}
      {plan && (
        <div style={{ ...styles.card, marginTop: 14 }}>
          <div style={styles.cardHeader}>
            <p style={{ ...styles.cardLabel, color: BLUE }}>Current Plan</p>
            <button style={styles.editBtn} onClick={() => navigate('/athlete/plan')}>
              <CalendarIcon size={14} color={BLUE} />
              View plan
            </button>
          </div>
          <p style={styles.planName}>{plan.title}</p>
          {plan.description && <p style={styles.planDesc}>{plan.description}</p>}
          <p style={styles.planMeta}>
            {plan.num_weeks}-week plan · Started {fmtDate(plan.starts_on)}
          </p>
        </div>
      )}

      {/* Session log */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <div style={styles.cardHeader}>
          <p style={{ ...styles.cardLabel, color: YELLOW }}>Session Log</p>
          {logs.length > 0 && (
            <span style={styles.logCount}>{logs.length} sessions</span>
          )}
        </div>
        {logs.length === 0 ? (
          <p style={styles.emptyText}>No sessions logged yet.</p>
        ) : (
          <div style={styles.logList}>
            {logs.map((log, i) => {
              const s = LOG_STATUS[log.status] || LOG_STATUS.skipped
              return (
                <div
                  key={log.id}
                  style={{
                    ...styles.logRow,
                    borderTop: i > 0 ? '1px solid var(--border-light)' : 'none',
                  }}
                >
                  <div style={styles.logTop}>
                    <span style={{ ...styles.logBadge, color: s.color, background: s.bg }}>
                      {s.label}
                    </span>
                    {log.session_focus && (
                      <span style={styles.logFocus}>{log.session_focus}</span>
                    )}
                    {log.effort != null && (
                      <span style={styles.logEffort}>{log.effort}/10</span>
                    )}
                    {log.week_number != null && (
                      <span style={styles.logWeek}>Wk {log.week_number}</span>
                    )}
                    <span style={styles.logDate}>{fmtDate(log.logged_at)}</span>
                  </div>
                  {log.note && <p style={styles.logNote}>"{log.note}"</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  loading: { color: 'var(--text-3)', fontSize: 15 },
  container: { maxWidth: 700, margin: '0 auto' },

  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    marginBottom: 28,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: ORANGE,
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subline: { fontSize: 14, color: 'var(--text-2)', margin: 0 },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  statVal: { fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  statLabel: { fontSize: 12, color: 'var(--text-3)' },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    margin: 0,
  },
  editBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    color: BLUE,
    background: 'none',
    border: `1px solid ${BLUE}`,
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  logCount: { fontSize: 13, color: 'var(--text-3)' },

  emptyAction: { display: 'flex', flexDirection: 'column', gap: 14 },
  emptyText: { color: 'var(--text-3)', fontSize: 14, margin: 0 },
  primaryBtn: {
    alignSelf: 'flex-start',
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
  },

  surveyField: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    margin: '0 0 4px',
  },
  fieldValue: { fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: 0 },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: {
    fontSize: 12,
    fontWeight: 600,
    background: 'var(--border)',
    color: 'var(--text-2)',
    padding: '3px 10px',
    borderRadius: 12,
  },

  planName: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  planDesc: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 6px' },
  planMeta: { fontSize: 13, color: 'var(--text-3)', margin: 0 },

  logList: { display: 'flex', flexDirection: 'column' },
  logRow: { padding: '12px 0' },
  logTop: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  logBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
  },
  logFocus: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  logEffort: { fontSize: 13, color: 'var(--text-2)' },
  logWeek: {
    fontSize: 11,
    color: 'var(--text-3)',
    background: 'var(--border)',
    padding: '2px 6px',
    borderRadius: 3,
  },
  logDate: { fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' },
  logNote: {
    fontSize: 13,
    color: 'var(--text-2)',
    fontStyle: 'italic',
    margin: '6px 0 0',
    lineHeight: 1.5,
  },
}
