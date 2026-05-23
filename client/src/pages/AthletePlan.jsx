import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function calcCurrentWeek(startsOn, numWeeks) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - new Date(startsOn).getTime()
  const week = Math.floor(elapsed / msPerWeek) + 1
  return Math.min(Math.max(week, 1), numWeeks)
}

const LOG_STATUS = {
  completed: { label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
  partial:   { label: 'Partial',   color: '#b45309', bg: '#fef3c7' },
  skipped:   { label: 'Skipped',   color: '#888',    bg: '#f0f0f0' },
}

export default function AthletePlan() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState(undefined)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(1)

  useEffect(() => {
    Promise.all([
      api.get('/api/blueprints/my-plan').then(r => r.data.plan).catch(() => null),
      api.get('/api/workouts/mine').then(r => r.data.logs).catch(() => []),
    ]).then(([planData, logsData]) => {
      setPlan(planData)
      setLogs(logsData)
      if (planData) setCurrentWeek(calcCurrentWeek(planData.starts_on, planData.num_weeks))
    }).finally(() => setLoading(false))
  }, [])

  function getLog(weekId, sessionIndex) {
    return logs.find(l => l.blueprint_week_id === weekId && l.session_index === sessionIndex) || null
  }

  if (loading) return <div style={styles.center}>Loading…</div>

  const week = plan?.weeks?.find(w => w.week_number === currentWeek)

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={() => navigate('/athlete')}>← Back to dashboard</button>

      {!plan ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No plan assigned yet</p>
          <p style={styles.emptyDesc}>Your coach hasn't assigned a training plan yet. Check back soon.</p>
        </div>
      ) : (
        <>
          <div style={styles.planHeader}>
            <h1 style={styles.planTitle}>{plan.title}</h1>
            {plan.description && <p style={styles.planDesc}>{plan.description}</p>}
            <p style={styles.planMeta}>
              {plan.num_weeks}-week plan · Started {new Date(plan.starts_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Week navigator */}
          <div style={styles.weekNav}>
            <button
              style={styles.navBtn}
              onClick={() => setCurrentWeek(w => Math.max(1, w - 1))}
              disabled={currentWeek === 1}
            >
              ←
            </button>
            <span style={styles.weekLabel}>Week {currentWeek} of {plan.num_weeks}</span>
            <button
              style={styles.navBtn}
              onClick={() => setCurrentWeek(w => Math.min(plan.num_weeks, w + 1))}
              disabled={currentWeek === plan.num_weeks}
            >
              →
            </button>
          </div>

          {/* Current week card */}
          <div style={styles.card}>
            {!week ? (
              <p style={styles.emptyWeek}>No content for this week yet.</p>
            ) : (
              <>
                {week.objective && (
                  <div style={styles.objectiveBlock}>
                    <p style={styles.objectiveLabel}>This week's focus</p>
                    <p style={styles.objectiveText}>{week.objective}</p>
                  </div>
                )}

                {week.sessions.length === 0 ? (
                  <p style={styles.emptyWeek}>No sessions scheduled this week.</p>
                ) : (
                  <div style={styles.sessionList}>
                    {week.sessions.map((s, i) => {
                      const logged = getLog(week.id, i)
                      const statusInfo = logged ? LOG_STATUS[logged.status] : null
                      return (
                        <div key={i} style={styles.sessionCard}>
                          <div style={styles.sessionHeader}>
                            <span style={styles.sessionDay}>{s.day || `Session ${i + 1}`}</span>
                            <span style={styles.sessionFocus}>{s.focus}</span>
                            {logged ? (
                              <span style={{ ...styles.logBadge, color: statusInfo.color, background: statusInfo.bg }}>
                                {statusInfo.label}{logged.effort ? ` · ${logged.effort}` : ''}
                              </span>
                            ) : (
                              <button
                                style={styles.logBtn}
                                onClick={() => navigate('/log', { state: { weekId: week.id, sessionIndex: i, focus: s.focus, day: s.day, description: s.description } })}
                              >
                                Log session →
                              </button>
                            )}
                          </div>
                          {s.description && <p style={styles.sessionDesc}>{s.description}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Week dots */}
          <div style={styles.weekDots}>
            {Array.from({ length: plan.num_weeks }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                style={{
                  ...styles.dot,
                  ...(n === currentWeek ? styles.dotActive : {}),
                  ...(n < calcCurrentWeek(plan.starts_on, plan.num_weeks) ? styles.dotPast : {}),
                }}
                onClick={() => setCurrentWeek(n)}
                title={`Week ${n}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  center: { display: 'flex', justifyContent: 'center', paddingTop: 120, fontSize: 16 },
  container: { maxWidth: 640, margin: '0 auto', padding: '32px 20px' },
  backLink: { background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 24, display: 'block' },
  emptyState: { textAlign: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 700, marginBottom: 8 },
  emptyDesc: { color: '#777', fontSize: 15 },
  planHeader: { marginBottom: 24 },
  planTitle: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  planDesc: { color: '#555', fontSize: 15, marginBottom: 6 },
  planMeta: { color: '#999', fontSize: 13 },
  weekNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: '8px 18px', fontSize: 18, borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', color: '#333', lineHeight: 1 },
  weekLabel: { fontSize: 16, fontWeight: 700 },
  card: { background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 12, padding: 24, marginBottom: 20 },
  objectiveBlock: { background: '#fff', borderLeft: '4px solid #1a1a1a', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: 20 },
  objectiveLabel: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', margin: '0 0 4px' },
  objectiveText: { fontSize: 15, color: '#222', margin: 0 },
  emptyWeek: { color: '#aaa', fontSize: 14, textAlign: 'center', padding: '20px 0' },
  sessionList: { display: 'flex', flexDirection: 'column', gap: 12 },
  sessionCard: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, padding: 16 },
  sessionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' },
  sessionDay: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', background: '#f0f0f0', padding: '3px 8px', borderRadius: 4 },
  sessionFocus: { fontSize: 15, fontWeight: 700 },
  sessionDesc: { fontSize: 14, color: '#444', margin: 0, lineHeight: 1.5 },
  logBtn: { marginLeft: 'auto', padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 5, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' },
  logBadge: { marginLeft: 'auto', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 5, whiteSpace: 'nowrap' },
  weekDots: { display: 'flex', justifyContent: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: '50%', background: '#ddd', border: 'none', cursor: 'pointer', padding: 0 },
  dotActive: { background: '#1a1a1a', transform: 'scale(1.3)' },
  dotPast: { background: '#aaa' },
}
