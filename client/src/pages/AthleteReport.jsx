import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const LOGO   = '/Offseaz_logo__DARK_-removebg-preview.png'

const LIFTS_ORDER = [
  'bench_press','squat','deadlift','trap_bar_deadlift','overhead_press',
  'power_clean','hang_clean','clean','front_squat','romanian_deadlift','reverse_lunge',
]

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatBox({ label, value, accent }) {
  return (
    <div style={{ ...styles.statBox, borderTop: `3px solid ${accent || BLUE}` }}>
      <span style={{ ...styles.statVal, color: accent || BLUE }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  )
}

export default function AthleteReport() {
  const { athleteId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/report/${athleteId}`)
      .then(r => setReport(r.data.report))
      .catch(err => setError(err.response?.data?.error || 'Could not load report.'))
      .finally(() => setLoading(false))
  }, [athleteId])

  if (loading) return <div style={styles.center}>Generating report…</div>
  if (error)   return (
    <div style={styles.center}>
      <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>{error}</p>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
    </div>
  )
  if (!report) return null

  const { athlete, survey, maxImprovements, stats, goals, coachNote, generatedAt } = report

  const improvementsWithData = LIFTS_ORDER
    .filter(k => maxImprovements?.[k])
    .map(k => maxImprovements[k])

  const goalsCompleted = goals.filter(g => g.completed)
  const goalsPending   = goals.filter(g => !g.completed)

  return (
    <>
      {/* Print-only style block */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .report-page { padding: 0 !important; max-width: 100% !important; }
          .report-card { break-inside: avoid; border: 1px solid #ddd !important; background: #fff !important; }
        }
      `}</style>

      <div className="report-page" style={styles.page}>
        {/* Toolbar — hidden on print */}
        <div className="no-print" style={styles.toolbar}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>← Back to Profile</button>
          <button style={styles.printBtn} onClick={() => window.print()}>
            ⬇ Export PDF
          </button>
        </div>

        {/* ── Report header ── */}
        <div className="report-card" style={styles.reportHeader}>
          <img src={LOGO} alt="Offseaz" style={styles.headerLogo} />
          <div style={styles.headerDivider} />

          <div style={styles.athleteRow}>
            {athlete.avatar_url ? (
              <img src={athlete.avatar_url} alt={athlete.full_name} style={styles.athleteAvatar} />
            ) : (
              <div style={{ ...styles.athleteAvatar, background: 'rgba(247,87,9,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: ORANGE }}>
                  {athlete.full_name?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <div>
              <h1 style={styles.athleteName}>{athlete.full_name}</h1>
              {survey && (
                <p style={styles.athleteSub}>
                  {[survey.sport, survey.position].filter(Boolean).join(' · ')}
                  {survey.time_per_week ? ` · ${survey.time_per_week} days/wk` : ''}
                </p>
              )}
              <p style={styles.generatedAt}>Report generated {fmtDate(generatedAt)}</p>
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div style={styles.statsGrid}>
          <StatBox label="Total Sessions" value={stats.totalSessions} accent={BLUE} />
          <StatBox label="Completed" value={stats.completedSessions} accent={ORANGE} />
          <StatBox label="Completion Rate" value={`${stats.completionRate}%`} accent={YELLOW} />
          <StatBox label="Best Streak" value={`${stats.maxStreak}`} accent={BLUE} />
          <StatBox label="Goals Completed" value={`${stats.goalsCompleted}/${stats.goalsTotal}`} accent={ORANGE} />
        </div>

        {/* ── Survey highlights ── */}
        {survey && (
          <div className="report-card" style={styles.card}>
            <p style={{ ...styles.cardLabel, color: BLUE }}>Athlete Profile</p>
            <div style={styles.surveyGrid}>
              {survey.sport && <div style={styles.surveyItem}><p style={styles.fieldLabel}>Sport</p><p style={styles.fieldValue}>{survey.sport}</p></div>}
              {survey.position && <div style={styles.surveyItem}><p style={styles.fieldLabel}>Position</p><p style={styles.fieldValue}>{survey.position}</p></div>}
              {survey.height_feet != null && (
                <div style={styles.surveyItem}>
                  <p style={styles.fieldLabel}>Height</p>
                  <p style={styles.fieldValue}>{survey.height_feet}' {survey.height_inches ?? 0}"</p>
                </div>
              )}
              {survey.weight_lbs != null && (
                <div style={styles.surveyItem}>
                  <p style={styles.fieldLabel}>Weight</p>
                  <p style={styles.fieldValue}>{survey.weight_lbs} lbs</p>
                </div>
              )}
            </div>
            {survey.goals && (
              <div style={{ marginTop: 14 }}>
                <p style={styles.fieldLabel}>Season Goals</p>
                <p style={styles.fieldValue}>{survey.goals}</p>
              </div>
            )}
            {survey.weaknesses && (
              <div style={{ marginTop: 12 }}>
                <p style={styles.fieldLabel}>Areas to Improve</p>
                <p style={styles.fieldValue}>{survey.weaknesses}</p>
              </div>
            )}
            {survey.injury_history && (
              <div style={{ marginTop: 12 }}>
                <p style={styles.fieldLabel}>Injury History</p>
                <p style={styles.fieldValue}>{survey.injury_history}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Lifting PRs & improvements ── */}
        <div className="report-card" style={styles.card}>
          <p style={{ ...styles.cardLabel, color: YELLOW }}>Lifting PRs &amp; Progress</p>
          {improvementsWithData.length === 0 ? (
            <p style={styles.empty}>No lifting maxes recorded.</p>
          ) : (
            <div style={styles.liftGrid}>
              {improvementsWithData.map(({ label, start, current, improvement }) => (
                <div key={label} style={styles.liftBox}>
                  <p style={styles.liftName}>{label}</p>
                  <p style={styles.liftCurrent}>{current} <span style={styles.liftUnit}>lbs</span></p>
                  <div style={styles.liftImprove}>
                    {improvement > 0 ? (
                      <span style={styles.improvPos}>▲ +{improvement} lbs</span>
                    ) : improvement < 0 ? (
                      <span style={styles.improvNeg}>▼ {improvement} lbs</span>
                    ) : (
                      <span style={styles.improvNeutral}>— no change</span>
                    )}
                  </div>
                  <p style={styles.liftStart}>Started at {start} lbs</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Goals ── */}
        {goals.length > 0 && (
          <div className="report-card" style={styles.card}>
            <p style={{ ...styles.cardLabel, color: ORANGE }}>Goals</p>
            {goalsCompleted.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={styles.goalsSubhead}>✅ Completed ({goalsCompleted.length})</p>
                {goalsCompleted.map(g => (
                  <div key={g.id} style={styles.goalRow}>
                    <span style={styles.goalTitle}>{g.title}</span>
                    {g.target && <span style={styles.goalTarget}>{g.target}</span>}
                  </div>
                ))}
              </div>
            )}
            {goalsPending.length > 0 && (
              <div>
                <p style={styles.goalsSubhead}>⏳ In Progress ({goalsPending.length})</p>
                {goalsPending.map(g => (
                  <div key={g.id} style={styles.goalRow}>
                    <span style={styles.goalTitle}>{g.title}</span>
                    {g.target && <span style={styles.goalTarget}>{g.target}</span>}
                    {g.due_date && <span style={styles.goalDue}>Due {fmtDate(g.due_date)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Coach Note ── */}
        <div className="report-card" style={styles.card}>
          <p style={{ ...styles.cardLabel, color: '#c73820' }}>Coach Note</p>
          {coachNote ? (
            <p style={styles.coachNoteText}>{coachNote}</p>
          ) : (
            <p style={styles.empty}>No coach note on file.</p>
          )}
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          Generated by Offseaz · {fmtDate(generatedAt)}
        </p>
      </div>
    </>
  )
}

const styles = {
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, color: 'var(--text-3)', fontSize: 15 },
  page: { maxWidth: 760, margin: '0 auto', paddingBottom: 40 },

  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer' },
  printBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: BLUE,
    color: '#fff',
    cursor: 'pointer',
  },

  // Report header
  reportHeader: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '28px 32px',
    marginBottom: 20,
  },
  headerLogo: { height: 36, marginBottom: 20, display: 'block' },
  headerDivider: { height: 1, background: 'var(--border)', marginBottom: 20 },
  athleteRow: { display: 'flex', gap: 20, alignItems: 'center' },
  athleteAvatar: { width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  athleteName: { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  athleteSub: { fontSize: 15, color: 'var(--text-2)', margin: '0 0 4px' },
  generatedAt: { fontSize: 12, color: 'var(--text-3)', margin: 0 },

  // Stats
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 20 },
  statBox: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  statVal: { fontSize: 26, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4 },

  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '22px 24px',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    margin: '0 0 16px',
  },
  empty: { color: 'var(--text-3)', fontSize: 14, margin: 0 },

  surveyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 },
  surveyItem: {},
  fieldLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 3px' },
  fieldValue: { fontSize: 14, color: 'var(--text)', lineHeight: 1.5, margin: 0 },

  // Lift boxes
  liftGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 },
  liftBox: {
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  liftName:    { fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 },
  liftCurrent: { fontSize: 22, fontWeight: 700, color: ORANGE, lineHeight: 1, margin: 0 },
  liftUnit:    { fontSize: 12, fontWeight: 600, color: 'var(--text-3)' },
  liftImprove: { margin: 0 },
  improvPos:    { fontSize: 13, fontWeight: 700, color: '#2e7d32' },
  improvNeg:    { fontSize: 13, fontWeight: 700, color: '#c73820' },
  improvNeutral:{ fontSize: 12, color: 'var(--text-3)' },
  liftStart:   { fontSize: 11, color: 'var(--text-3)', margin: 0 },

  // Goals
  goalsSubhead: { fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 8px' },
  goalRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap' },
  goalTitle:  { fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 },
  goalTarget: { fontSize: 13, color: 'var(--text-2)' },
  goalDue:    { fontSize: 12, color: 'var(--text-3)' },

  coachNoteText: { fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' },

  footer: { textAlign: 'center', fontSize: 12, color: 'var(--text-3)', marginTop: 32 },
}
