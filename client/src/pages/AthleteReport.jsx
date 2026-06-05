import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ArrowUpIcon, ArrowDownIcon, FileTextIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const LOGO   = '/OFFSEAZ_LOGO_PNG.png'

const LIFTS_ORDER = [
  'bench_press','squat','deadlift','trap_bar_deadlift','overhead_press',
  'power_clean','hang_clean','clean','front_squat','romanian_deadlift','reverse_lunge',
]

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function fmtShortDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Filled orange circle with white check  (completed goal)
function GoalDoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="9" r="9" fill={ORANGE} />
      <polyline points="5,9 8,12 13,6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Outlined blue circle (in-progress goal)
function GoalPendingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="9" r="8" fill="none" stroke={BLUE} strokeWidth="2" />
    </svg>
  )
}

function StatBox({ label, value, accent }) {
  return (
    <div style={{ ...styles.statBox, borderTop: `3px solid ${accent}` }}>
      <span style={{ ...styles.statVal, color: accent }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  )
}

export default function AthleteReport() {
  const { id: athleteId } = useParams()
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

  if (loading) return <div style={styles.center}>Generating report...</div>
  if (error) return (
    <div style={styles.center}>
      <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>{error}</p>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>Back</button>
    </div>
  )
  if (!report) return null

  const { athlete, survey, maxImprovements, stats, goals, coachNote, coachName, generatedAt } = report

  const improvementsWithData = LIFTS_ORDER
    .filter(k => maxImprovements?.[k])
    .map(k => maxImprovements[k])

  const goalsCompleted = goals.filter(g => g.completed)
  const goalsPending   = goals.filter(g => !g.completed)

  return (
    <>
      <style>{`
        @media print {
          :root {
            --bg: #ffffff !important;
            --card: #ffffff !important;
            --card-inner: #f9f9f9 !important;
            --border: #e0e0e0 !important;
            --border-light: #eeeeee !important;
            --text: #111111 !important;
            --text-2: #444444 !important;
            --text-3: #888888 !important;
          }
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .report-root { padding: 24px !important; max-width: 100% !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div className="report-root" style={styles.page}>

        {/* ── Toolbar (screen only) ── */}
        <div className="no-print" style={styles.toolbar}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            Back to Profile
          </button>
          <button style={styles.exportBtn} onClick={() => window.print()}>
            <FileTextIcon size={14} color="#fff" />
            Export PDF
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════
            REPORT HEADER — logo left, athlete right
        ══════════════════════════════════════════════════════════ */}
        <div style={styles.reportHeader}>
          <div style={styles.headerLeft}>
            <img src={LOGO} alt="Offseaz" style={styles.headerLogo} />
            <p style={styles.reportTitle}>End of Offseason Report</p>
          </div>
          <div style={styles.headerRight}>
            {athlete.avatar_url ? (
              <img src={athlete.avatar_url} alt={athlete.full_name} style={styles.athleteAvatar} />
            ) : (
              <div style={styles.avatarFallback}>
                <span style={styles.avatarInitial}>{athlete.full_name?.charAt(0) || 'A'}</span>
              </div>
            )}
            <div style={styles.headerAthleteMeta}>
              <h1 style={styles.athleteName}>{athlete.full_name}</h1>
              {survey && (
                <p style={styles.athleteSub}>
                  {[survey.sport, survey.position].filter(Boolean).join(' · ')}
                  {survey.time_per_week ? ` · ${survey.time_per_week} days/wk` : ''}
                </p>
              )}
              <p style={styles.reportDate}>Generated {fmtShortDate(generatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Orange divider */}
        <div style={styles.orangeDivider} />

        {/* ══════════════════════════════════════════════════════════
            STATS GRID
        ══════════════════════════════════════════════════════════ */}
        <div style={styles.statsGrid}>
          <StatBox label="Total Sessions"   value={stats.totalSessions}                    accent={BLUE}   />
          <StatBox label="Completed"        value={stats.completedSessions}                accent={ORANGE} />
          <StatBox label="Completion Rate"  value={`${stats.completionRate}%`}             accent={YELLOW} />
          <StatBox label="Best Streak"      value={`${stats.maxStreak}`}                   accent={BLUE}   />
          <StatBox label="Goals Completed"  value={`${stats.goalsCompleted}/${stats.goalsTotal}`} accent={ORANGE} />
        </div>

        {/* ══════════════════════════════════════════════════════════
            ATHLETE PROFILE
        ══════════════════════════════════════════════════════════ */}
        {survey && (
          <div style={styles.card}>
            <p style={{ ...styles.cardLabel, color: BLUE }}>Athlete Profile</p>
            <div style={styles.surveyGrid}>
              {survey.sport     && <div><p style={styles.fieldLabel}>Sport</p>    <p style={styles.fieldValue}>{survey.sport}</p></div>}
              {survey.position  && <div><p style={styles.fieldLabel}>Position</p> <p style={styles.fieldValue}>{survey.position}</p></div>}
              {survey.height_feet != null && (
                <div>
                  <p style={styles.fieldLabel}>Height</p>
                  <p style={styles.fieldValue}>{survey.height_feet}' {survey.height_inches ?? 0}"</p>
                </div>
              )}
              {survey.weight_lbs != null && (
                <div>
                  <p style={styles.fieldLabel}>Weight</p>
                  <p style={styles.fieldValue}>{survey.weight_lbs} lbs</p>
                </div>
              )}
              {survey.experience_level && (
                <div>
                  <p style={styles.fieldLabel}>Experience</p>
                  <p style={styles.fieldValue}>{survey.experience_level}</p>
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

        {/* ══════════════════════════════════════════════════════════
            LIFTING PRs & IMPROVEMENTS
        ══════════════════════════════════════════════════════════ */}
        <div style={styles.card}>
          <p style={{ ...styles.cardLabel, color: YELLOW }}>Lifting PRs &amp; Progress</p>
          {improvementsWithData.length === 0 ? (
            <p style={styles.empty}>No lifting maxes recorded this offseason.</p>
          ) : (
            <div style={styles.liftGrid}>
              {improvementsWithData.map(({ label, start, current, improvement }) => (
                <div key={label} style={styles.liftBox}>
                  <p style={styles.liftName}>{label}</p>
                  <p style={styles.liftCurrent}>
                    {current}
                    <span style={styles.liftUnit}> lbs</span>
                  </p>
                  <div style={styles.liftImprovRow}>
                    {improvement > 0 ? (
                      <>
                        <ArrowUpIcon size={13} color={ORANGE} />
                        <span style={styles.improvPos}>+{improvement} lbs</span>
                      </>
                    ) : improvement < 0 ? (
                      <>
                        <ArrowDownIcon size={13} color="#c73820" />
                        <span style={styles.improvNeg}>{improvement} lbs</span>
                      </>
                    ) : (
                      <span style={styles.improvNeutral}>No change</span>
                    )}
                  </div>
                  <p style={styles.liftStart}>Started: {start} lbs</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            GOALS
        ══════════════════════════════════════════════════════════ */}
        {goals.length > 0 && (
          <div style={styles.card}>
            <p style={{ ...styles.cardLabel, color: ORANGE }}>Offseason Goals</p>

            {goalsCompleted.length > 0 && (
              <div style={{ marginBottom: goalsPending.length > 0 ? 16 : 0 }}>
                <p style={styles.goalGroupLabel}>Completed ({goalsCompleted.length})</p>
                {goalsCompleted.map(g => (
                  <div key={g.id} style={styles.goalRow}>
                    <GoalDoneIcon />
                    <div style={styles.goalContent}>
                      <span style={styles.goalTitleDone}>{g.title}</span>
                      {g.target && <span style={styles.goalTarget}>{g.target}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {goalsPending.length > 0 && (
              <div>
                <p style={styles.goalGroupLabel}>In Progress ({goalsPending.length})</p>
                {goalsPending.map(g => (
                  <div key={g.id} style={styles.goalRow}>
                    <GoalPendingIcon />
                    <div style={styles.goalContent}>
                      <span style={styles.goalTitlePending}>{g.title}</span>
                      {g.target && <span style={styles.goalTarget}>{g.target}</span>}
                      {g.due_date && <span style={styles.goalDue}>Due {fmtShortDate(g.due_date)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            COACH NOTE + SIGNATURE
        ══════════════════════════════════════════════════════════ */}
        <div style={styles.card}>
          <p style={{ ...styles.cardLabel, color: '#c73820' }}>Coach Note</p>
          <div style={styles.coachNoteBody}>
            {coachNote ? (
              <p style={styles.coachNoteText}>{coachNote}</p>
            ) : (
              <p style={styles.empty}>No coach note recorded.</p>
            )}
          </div>

          {/* Signature line */}
          <div style={styles.signatureSection}>
            <div style={styles.signatureLine}>
              <div style={styles.signatureRule} />
              <div style={styles.signatureRule} />
            </div>
            <div style={styles.signatureLabels}>
              <span style={styles.sigLabel}>
                {coachName}
                <span style={styles.sigRole}> — Head Coach</span>
              </span>
              <span style={styles.sigLabel}>{fmtDate(generatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <img src={LOGO} alt="Offseaz" style={styles.footerLogo} />
          <span style={styles.footerText}>Offseaz Performance Platform · {fmtDate(generatedAt)}</span>
        </div>
      </div>
    </>
  )
}

const styles = {
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', paddingTop: 60, color: 'var(--text-3)', fontSize: 15,
  },
  page: { maxWidth: 780, margin: '0 auto', paddingBottom: 48 },

  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28,
  },
  backBtn: {
    padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 10,
    border: '1px solid var(--border)', background: 'none', color: 'var(--text-2)', cursor: 'pointer',
  },
  exportBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '8px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10,
    border: 'none', background: BLUE, color: '#fff', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(48,142,189,0.28)',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  reportHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px 16px 0 0',
    padding: '28px 32px 24px',
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: 6 },
  headerLogo: { height: 40, display: 'block' },
  reportTitle: { fontSize: 12, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 1, margin: 0 },

  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  athleteAvatar: { width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${ORANGE}` },
  avatarFallback: {
    width: 68, height: 68, borderRadius: '50%', border: `2px solid ${ORANGE}`,
    background: 'rgba(247,87,9,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarInitial: { fontSize: 28, fontWeight: 800, color: ORANGE },
  headerAthleteMeta: { textAlign: 'right' },
  athleteName: { fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.1 },
  athleteSub: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 4px' },
  reportDate: { fontSize: 12, color: 'var(--text-3)', margin: 0 },

  // Orange horizontal rule
  orangeDivider: {
    height: 4, background: ORANGE,
    borderRadius: '0 0 2px 2px', marginBottom: 20,
  },

  // ── Stats ────────────────────────────────────────────────────────────────────
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 10, marginBottom: 16,
  },
  statBox: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '14px 10px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4,
    boxShadow: '0 1px 4px rgba(0,0,0,0.14)',
  },
  statVal:   { fontSize: 24, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4 },

  // ── Shared card ──────────────────────────────────────────────────────────────
  card: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
    padding: '22px 24px', marginBottom: 14,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  cardLabel: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 0.8, margin: '0 0 14px',
  },
  empty: { color: 'var(--text-3)', fontSize: 14, margin: 0 },

  // ── Survey ───────────────────────────────────────────────────────────────────
  surveyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 14, marginBottom: 4 },
  fieldLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 3px' },
  fieldValue: { fontSize: 14, color: 'var(--text)', lineHeight: 1.5, margin: 0 },

  // ── Lifts ─────────────────────────────────────────────────────────────────────
  liftGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 10 },
  liftBox: {
    background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 3,
    boxShadow: '0 1px 4px rgba(0,0,0,0.14)',
  },
  liftName:    { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 },
  liftCurrent: { fontSize: 22, fontWeight: 800, color: ORANGE, lineHeight: 1.1, margin: 0 },
  liftUnit:    { fontSize: 12, fontWeight: 600, color: 'var(--text-3)' },
  liftImprovRow: { display: 'flex', alignItems: 'center', gap: 4, margin: '1px 0' },
  improvPos:     { fontSize: 12, fontWeight: 700, color: ORANGE },
  improvNeg:     { fontSize: 12, fontWeight: 700, color: '#c73820' },
  improvNeutral: { fontSize: 11, color: 'var(--text-3)' },
  liftStart:   { fontSize: 11, color: 'var(--text-3)', margin: 0 },

  // ── Goals ─────────────────────────────────────────────────────────────────────
  goalGroupLabel: {
    fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase',
    letterSpacing: 0.4, margin: '0 0 8px',
  },
  goalRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-light)' },
  goalContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  goalTitleDone: { fontSize: 14, fontWeight: 600, color: 'var(--text-3)', textDecoration: 'line-through' },
  goalTitlePending: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  goalTarget: { fontSize: 13, color: 'var(--text-2)' },
  goalDue:    { fontSize: 12, color: 'var(--text-3)' },

  // ── Coach note + signature ────────────────────────────────────────────────────
  coachNoteBody: { minHeight: 80, marginBottom: 28 },
  coachNoteText: { fontSize: 14, color: 'var(--text)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' },

  signatureSection: { borderTop: '1px solid var(--border-light)', paddingTop: 20 },
  signatureLine: { display: 'flex', gap: 32, marginBottom: 8 },
  signatureRule: { flex: 1, height: 1, background: 'var(--text-3)', marginTop: 22 },
  signatureLabels: { display: 'flex', justifyContent: 'space-between' },
  sigLabel: { fontSize: 13, color: 'var(--text-2)', fontWeight: 500 },
  sigRole:  { fontSize: 12, color: 'var(--text-3)', fontWeight: 400 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 32 },
  footerLogo: { height: 22, opacity: 0.6 },
  footerText: { fontSize: 12, color: 'var(--text-3)' },
}
