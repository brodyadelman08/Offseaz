import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import AvatarUpload from '../components/AvatarUpload'
import { ChevronDownIcon, ChevronUpIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const LIFTS = [
  { key: 'bench_press',       label: 'Bench Press' },
  { key: 'squat',             label: 'Squat' },
  { key: 'deadlift',          label: 'Deadlift' },
  { key: 'trap_bar_deadlift', label: 'Trap Bar Deadlift' },
  { key: 'power_clean',       label: 'Power Clean' },
  { key: 'overhead_press',    label: 'Overhead Press' },
]

function fmtShortDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: '2-digit',
  })
}

export default function AthleteTeammateProfile() {
  const { athleteId } = useParams()
  const navigate = useNavigate()
  const [athlete, setAthlete] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(
    Object.fromEntries(LIFTS.map(l => [l.key, false]))
  )

  useEffect(() => {
    api.get(`/api/roster/${athleteId}`)
      .then(r => setAthlete(r.data.athlete))
      .catch(err => {
        const msg = err.response?.data?.error || 'Could not load profile.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [athleteId])

  if (loading) return <div style={styles.center}>Loading…</div>
  if (error)   return (
    <div style={styles.center}>
      <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>{error}</p>
      <button style={styles.backBtn} onClick={() => navigate('/athlete/roster')}>
        ← Back to Roster
      </button>
    </div>
  )
  if (!athlete) return null

  const { survey, maxes, stats } = athlete
  const hasAnyMax = maxes && LIFTS.some(l => maxes[l.key]?.current)

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={() => navigate('/athlete/roster')}>
        ← Roster
      </button>

      {/* Header */}
      <div style={styles.athleteHeader}>
        <AvatarUpload
          name={athlete.full_name}
          avatarUrl={athlete.avatar_url}
          size={56}
          color={ORANGE}
          editable={false}
        />
        <div>
          <h1 style={styles.athleteName}>{athlete.full_name}</h1>
          {survey && (
            <p style={styles.subline}>
              {[survey.sport, survey.position, survey.time_per_week ? `${survey.time_per_week} days/wk` : null]
                .filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderLeft: `3px solid ${BLUE}` }}>
          <span style={styles.statVal}>{stats.total_sessions}</span>
          <span style={styles.statLabel}>Total sessions</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: `3px solid ${ORANGE}` }}>
          <span style={{ ...styles.statVal, color: stats.completed_sessions > 0 ? ORANGE : 'var(--text)' }}>
            {stats.completed_sessions}
          </span>
          <span style={styles.statLabel}>Completed</span>
        </div>
      </div>

      {/* Survey highlights */}
      {survey && (
        <div style={styles.card}>
          <p style={{ ...styles.cardLabel, color: BLUE }}>Athlete Profile</p>
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
        </div>
      )}

      {/* Lifting Maxes */}
      <div style={{ ...styles.card, marginTop: 14 }}>
        <p style={{ ...styles.cardLabel, color: YELLOW }}>Lifting PRs</p>
        {!hasAnyMax ? (
          <p style={styles.empty}>No maxes logged yet.</p>
        ) : (
          <div style={styles.maxesGrid}>
            {LIFTS.map(({ key, label }) => {
              const liftData = maxes?.[key]
              const current = liftData?.current
              const history = liftData?.history || []
              const isHistOpen = historyOpen[key]

              return (
                <div key={key} style={styles.liftCard}>
                  <div style={styles.liftTop}>
                    <span style={styles.liftLabel}>{label}</span>
                    {current ? (
                      <span style={styles.liftPR}>
                        {current.weight_lbs}{' '}
                        <span style={styles.liftUnit}>
                          lbs{current.reps > 1 ? ` x ${current.reps}` : ''}
                        </span>
                      </span>
                    ) : (
                      <span style={styles.liftNone}>—</span>
                    )}
                  </div>

                  {current ? (
                    <p style={styles.liftDate}>Set {fmtShortDate(current.logged_at)}</p>
                  ) : (
                    <p style={styles.liftEmpty}>No data</p>
                  )}

                  {history.length > 1 && (
                    <button
                      style={styles.historyToggle}
                      onClick={() => setHistoryOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                    >
                      {isHistOpen
                        ? <><ChevronUpIcon size={12} color="var(--text-3)" /> Hide</>
                        : <><ChevronDownIcon size={12} color="var(--text-3)" /> History ({history.length})</>
                      }
                    </button>
                  )}

                  {isHistOpen && (
                    <div style={styles.historyList}>
                      {[...history].reverse().map(entry => (
                        <div key={entry.id} style={styles.historyRow}>
                          <span style={{
                            ...styles.historyWeight,
                            color: entry.id === current?.id ? ORANGE : 'var(--text)',
                            fontWeight: entry.id === current?.id ? 700 : 600,
                          }}>
                            {entry.weight_lbs} lbs{entry.reps > 1 ? ` x ${entry.reps}` : ''}
                            {entry.id === current?.id && (
                              <span style={styles.prTag}> PR</span>
                            )}
                          </span>
                          <span style={styles.historyDate}>{fmtShortDate(entry.logged_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    color: 'var(--text-3)',
    fontSize: 15,
  },
  container: { maxWidth: 680, margin: '0 auto' },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-2)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 0 20px',
  },
  backBtn: {
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'none',
    color: 'var(--text-2)',
    cursor: 'pointer',
  },

  athleteHeader: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 22 },
  athleteName: { fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  subline: { fontSize: 14, color: 'var(--text-2)', margin: 0 },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 },
  statCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  statVal: { fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  statLabel: { fontSize: 12, color: 'var(--text-3)' },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
  cardLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    margin: '0 0 14px',
  },
  empty: { color: 'var(--text-3)', fontSize: 14, margin: 0 },

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

  maxesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  liftCard: {
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  liftTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  liftLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-2)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  liftPR: { fontSize: 20, fontWeight: 700, color: ORANGE, lineHeight: 1 },
  liftUnit: { fontSize: 11, fontWeight: 600, color: 'var(--text-3)' },
  liftNone: { fontSize: 18, fontWeight: 700, color: 'var(--text-3)' },
  liftDate: { fontSize: 11, color: 'var(--text-3)', margin: 0 },
  liftEmpty: { fontSize: 12, color: 'var(--text-3)', margin: 0, fontStyle: 'italic' },

  historyToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 0',
    marginTop: 2,
  },
  historyList: {
    borderTop: '1px solid var(--border-light)',
    paddingTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  historyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyWeight: { fontSize: 13, lineHeight: 1.4 },
  prTag: {
    fontSize: 10,
    fontWeight: 700,
    color: ORANGE,
    background: 'rgba(247,87,9,0.12)',
    padding: '1px 5px',
    borderRadius: 3,
  },
  historyDate: { fontSize: 11, color: 'var(--text-3)' },
}
