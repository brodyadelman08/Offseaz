import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

function calcCurrentWeek(startsOn, numWeeks) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - new Date(startsOn).getTime()
  const week = Math.floor(elapsed / msPerWeek) + 1
  return Math.min(Math.max(week, 1), numWeeks)
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const LOG_STATUS = {
  completed: { label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
  partial:   { label: 'Partial',   color: '#b45309', bg: '#fef3c7' },
  skipped:   { label: 'Skipped',   color: '#888',    bg: '#f0f0f0' },
}

export default function AthleteProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [athlete, setAthlete] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/athletes/${id}`)
      .then(res => setAthlete(res.data.athlete))
      .catch(err => setError(err.response?.data?.error || 'Could not load profile.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={styles.center}>Loading…</div>
  if (error)   return <div style={styles.center}>{error}</div>
  if (!athlete) return null

  const { survey, plan, logs } = athlete
  const currentWeek = plan ? calcCurrentWeek(plan.starts_on, plan.num_weeks) : null

  const surveyFields = [
    { key: 'goals',           label: 'Goals' },
    { key: 'weaknesses',      label: 'Weaknesses' },
    { key: 'injury_history',  label: 'Injury History' },
  ]

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={() => navigate('/coach')}>← Back to dashboard</button>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.avatar}>{initials(athlete.full_name)}</div>
        <div>
          <h1 style={styles.name}>{athlete.full_name}</h1>
          {survey && (
            <p style={styles.subline}>
              {[survey.sport, survey.position, survey.time_per_week ? `${survey.time_per_week}h/week` : null]
                .filter(Boolean).join(' · ')}
            </p>
          )}
          {survey?.completed_at && (
            <p style={styles.surveyDate}>Survey completed {fmtDate(survey.completed_at)}</p>
          )}
        </div>
      </div>

      {/* Survey card */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>Athlete Survey</p>
        {!survey ? (
          <p style={styles.empty}>Survey not completed yet.</p>
        ) : (
          <>
            {surveyFields.map(f => survey[f.key] ? (
              <div key={f.key} style={styles.surveyField}>
                <p style={styles.fieldLabel}>{f.label}</p>
                <p style={styles.fieldValue}>{survey[f.key]}</p>
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

      {/* Plan card */}
      {plan && (
        <div style={{ ...styles.card, marginTop: 16 }}>
          <p style={styles.cardTitle}>Current Plan</p>
          <p style={styles.planName}>{plan.title}</p>
          {plan.description && <p style={styles.planDesc}>{plan.description}</p>}
          <p style={styles.planMeta}>
            {plan.num_weeks}-week plan · Started {fmtDate(plan.starts_on)}
            {currentWeek && ` · Currently in Week ${currentWeek}`}
          </p>
        </div>
      )}

      {/* Log history */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={styles.logHeader}>
          <p style={styles.cardTitle}>Session Log</p>
          {logs.length > 0 && (
            <span style={styles.logCount}>{logs.length} session{logs.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {logs.length === 0 ? (
          <p style={styles.empty}>No sessions logged yet.</p>
        ) : (
          <div style={styles.logList}>
            {logs.map((log, i) => {
              const s = LOG_STATUS[log.status] || LOG_STATUS.skipped
              return (
                <div key={log.id} style={{ ...styles.logRow, borderTop: i > 0 ? '1px solid #f0f0f0' : 'none' }}>
                  <div style={styles.logTop}>
                    <span style={{ ...styles.logBadge, color: s.color, background: s.bg }}>
                      {s.label}
                    </span>
                    {log.session_focus && (
                      <span style={styles.logFocus}>{log.session_focus}</span>
                    )}
                    {log.effort != null && (
                      <span style={styles.logEffort}>· {log.effort}</span>
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
  center:       { display: 'flex', justifyContent: 'center', paddingTop: 100, fontSize: 15, color: '#888' },
  container:    { maxWidth: 680, margin: '0 auto', padding: '32px 20px' },
  backLink:     { background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 24, display: 'block' },

  header:       { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  avatar:       { width: 52, height: 52, borderRadius: '50%', background: '#1a1a1a', color: '#fff', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name:         { fontSize: 24, fontWeight: 700, margin: '0 0 4px' },
  subline:      { fontSize: 14, color: '#555', margin: '0 0 2px' },
  surveyDate:   { fontSize: 12, color: '#aaa', margin: 0 },

  card:         { background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 10, padding: 24 },
  cardTitle:    { fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 16px' },
  empty:        { color: '#aaa', fontSize: 14, margin: 0 },

  surveyField:  { marginBottom: 16 },
  fieldLabel:   { fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 4px' },
  fieldValue:   { fontSize: 14, color: '#222', lineHeight: 1.6, margin: 0 },
  pillRow:      { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill:         { fontSize: 12, fontWeight: 600, background: '#e5e5e5', color: '#444', padding: '3px 10px', borderRadius: 12 },

  planName:     { fontSize: 17, fontWeight: 700, margin: '0 0 4px' },
  planDesc:     { fontSize: 14, color: '#555', margin: '0 0 6px' },
  planMeta:     { fontSize: 13, color: '#999', margin: 0 },

  logHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logCount:     { fontSize: 13, color: '#aaa' },
  logList:      { display: 'flex', flexDirection: 'column' },
  logRow:       { padding: '12px 0' },
  logTop:       { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  logBadge:     { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' },
  logFocus:     { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  logEffort:    { fontSize: 13, color: '#555' },
  logWeek:      { fontSize: 11, color: '#aaa', background: '#f0f0f0', padding: '2px 6px', borderRadius: 3 },
  logDate:      { fontSize: 12, color: '#aaa', marginLeft: 'auto' },
  logNote:      { fontSize: 13, color: '#666', fontStyle: 'italic', margin: '6px 0 0', lineHeight: 1.5 },
}
