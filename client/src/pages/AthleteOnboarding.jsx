import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  UsersIcon, ClipboardIcon, DumbbellIcon, BoltIcon,
  CheckCircleIcon, TrophyIcon, CheckIcon,
} from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const TOTAL_STEPS = 5

const LIFTS = [
  { key: 'bench_press',       label: 'Bench Press' },
  { key: 'squat',             label: 'Squat' },
  { key: 'deadlift',          label: 'Deadlift' },
  { key: 'trap_bar_deadlift', label: 'Trap Bar Deadlift' },
  { key: 'overhead_press',    label: 'Overhead Press' },
  { key: 'power_clean',       label: 'Power Clean' },
  { key: 'hang_clean',        label: 'Hang Clean' },
  { key: 'clean',             label: 'Clean' },
  { key: 'front_squat',       label: 'Front Squat' },
  { key: 'romanian_deadlift', label: 'Romanian Deadlift' },
  { key: 'reverse_lunge',     label: 'Reverse Lunge' },
]

const FEATURES = [
  { icon: UsersIcon,    color: BLUE,   bg: 'rgba(48,142,189,0.12)',  text: 'Join your team' },
  { icon: ClipboardIcon, color: YELLOW, bg: 'rgba(240,190,36,0.12)', text: 'Complete your Needs Analysis' },
  { icon: DumbbellIcon,  color: ORANGE, bg: 'rgba(247,87,9,0.12)',   text: 'Log your lifting PRs' },
  { icon: BoltIcon,      color: ORANGE, bg: 'rgba(247,87,9,0.12)',   text: 'Access your training plan' },
]

export default function AthleteOnboarding() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(() => {
    const s = parseInt(localStorage.getItem('offseaz_onboarding_step') || '1')
    return s >= 1 && s <= TOTAL_STEPS ? s : 1
  })
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState(null)
  const [survey, setSurvey] = useState(null)
  const [plan, setPlan] = useState(null)

  // Step 2 — join team
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinedTeam, setJoinedTeam] = useState(null)

  // Step 4 — log maxes
  const [selectedLift, setSelectedLift] = useState('bench_press')
  const [liftWeight, setLiftWeight] = useState('')
  const [liftReps, setLiftReps] = useState('1')
  const [savingMax, setSavingMax] = useState(false)
  const [sessionMaxes, setSessionMaxes] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/api/teams/my-team').then(r => r.data.team).catch(() => null),
      api.get('/api/survey/my').then(r => r.data.survey).catch(() => null),
      api.get('/api/blueprints/my-plan').then(r => r.data.coach_plan || r.data.auto_plan || null).catch(() => null),
    ]).then(([t, s, p]) => {
      setTeam(t)
      setSurvey(s)
      setPlan(p)
    }).finally(() => setLoading(false))
  }, [])

  function goStep(n) {
    const next = Math.min(Math.max(n, 1), TOTAL_STEPS)
    setStep(next)
    localStorage.setItem('offseaz_onboarding_step', String(next))
  }

  function finishAndGo(path = '/athlete') {
    localStorage.setItem('offseaz_onboarding_done', 'true')
    localStorage.removeItem('offseaz_onboarding_step')
    navigate(path, { replace: true })
  }

  async function handleJoin() {
    const code = joinCode.trim().toLowerCase()
    if (!code) return
    setJoinError('')
    setJoining(true)
    try {
      const res = await api.post('/api/teams/join', { invite_code: code })
      setJoinedTeam(res.data.team)
      setTeam(res.data.team)
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Invalid code. Check with your coach.')
    } finally {
      setJoining(false)
    }
  }

  async function handleLogMax() {
    const w = parseFloat(liftWeight)
    if (!w || w <= 0) return
    setSavingMax(true)
    try {
      await api.post('/api/maxes', {
        lift: selectedLift,
        weight_lbs: w,
        reps: parseInt(liftReps) || 1,
      })
      const updated = [...sessionMaxes.filter(l => l !== selectedLift), selectedLift]
      setSessionMaxes(updated)
      setLiftWeight('')
      setLiftReps('1')
      const remaining = LIFTS.filter(l => !updated.includes(l.key))
      if (remaining.length > 0) setSelectedLift(remaining[0].key)
    } catch (err) {
      console.error('[AthleteOnboarding] logMax failed:', err)
    } finally {
      setSavingMax(false)
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Athlete'
  const currentTeam = joinedTeam || team

  if (loading) {
    return (
      <div style={styles.fullPage}>
        <div style={styles.loadingWrap}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={styles.fullPage}>

      {/* Top bar */}
      <div style={styles.topBar}>
        <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={styles.logo} />
        <button style={styles.exitBtn} onClick={() => finishAndGo('/athlete')}>
          Exit setup
        </button>
      </div>

      {/* Progress bar */}
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>

      {/* Step indicator dots */}
      <div style={styles.stepDots}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            style={{
              ...styles.dot,
              background: i + 1 < step ? BLUE : i + 1 === step ? ORANGE : 'var(--border)',
              transform: i + 1 === step ? 'scale(1.5)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div style={styles.content}>

        {/* ─── Step 1: Welcome ─── */}
        {step === 1 && (
          <div style={styles.stepWrap}>
            {/* Hero accent */}
            <div style={styles.welcomeAccent}>
              <span style={styles.welcomeAccentText}>OFFSEAZ</span>
            </div>

            <h1 style={styles.bigTitle}>
              Hey <span style={{ color: ORANGE }}>{firstName}</span>
            </h1>
            <p style={styles.bigSub}>
              Let's set up your athlete profile in a few steps so your coach can build you an elite training plan.
            </p>

            <div style={styles.featureList}>
              {FEATURES.map(({ icon: Icon, color, bg, text }, i) => (
                <div key={i} style={styles.featureRow}>
                  <div style={{ ...styles.featureIconWrap, background: bg }}>
                    <Icon size={18} color={color} />
                  </div>
                  <span style={styles.featureText}>{text}</span>
                </div>
              ))}
            </div>

            <button style={styles.primaryBtn} onClick={() => goStep(2)}>
              Get Started →
            </button>
          </div>
        )}

        {/* ─── Step 2: Join Team ─── */}
        {step === 2 && (
          <div style={styles.stepWrap}>
            <span style={styles.stepBadge}>Step 2 of {TOTAL_STEPS}</span>
            <h1 style={styles.bigTitle}>
              Join Your <span style={{ color: BLUE }}>Team</span>
            </h1>

            {currentTeam ? (
              <div style={styles.successCard}>
                <CheckCircleIcon size={28} color={BLUE} />
                <div>
                  <p style={styles.successTitle}>{currentTeam.name}</p>
                  <p style={styles.successSub}>
                    You're on the roster. Your coach can see your profile.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p style={styles.stepDesc}>
                  Your coach will share a short 8-character code with you. If you don't have it yet, no worries — come back to it later and grow with your team!
                </p>
                <p style={styles.joinLabel}>Enter the code your coach shared with you</p>
                <div style={styles.joinStack}>
                  <input
                    style={styles.codeInputLarge}
                    type="text"
                    placeholder="e.g. 2FB9A616"
                    value={joinCode.toUpperCase()}
                    onChange={e => setJoinCode(e.target.value)}
                    maxLength={8}
                    autoCapitalize="characters"
                    spellCheck={false}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                  <button
                    style={{
                      ...styles.primaryBtn,
                      alignSelf: 'stretch',
                      opacity: joining || !joinCode.trim() ? 0.55 : 1,
                    }}
                    disabled={joining || !joinCode.trim()}
                    onClick={handleJoin}
                  >
                    {joining ? 'Joining…' : 'Join Team'}
                  </button>
                </div>
                {joinError && <p style={styles.errorText}>{joinError}</p>}
                <div style={styles.noCodeWrap}>
                  <button style={styles.noCodeBtn} onClick={() => goStep(3)}>
                    I don't have a code yet — skip for now
                  </button>
                  <p style={styles.noCodeSub}>You can always join a team later from your profile.</p>
                </div>
              </>
            )}

            <div style={styles.navRow}>
              <button style={styles.backBtn} onClick={() => goStep(1)}>← Back</button>
              {currentTeam && (
                <button style={styles.primaryBtn} onClick={() => goStep(3)}>Continue →</button>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 3: Needs Analysis Survey ─── */}
        {step === 3 && (
          <div style={styles.stepWrap}>
            <span style={styles.stepBadge}>Step 3 of {TOTAL_STEPS}</span>
            <h1 style={styles.bigTitle}>
              Needs Analysis <span style={{ color: YELLOW }}>Survey</span>
            </h1>

            {survey ? (
              <>
                <div style={styles.successCard}>
                  <CheckCircleIcon size={28} color={BLUE} />
                  <div>
                    <p style={styles.successTitle}>Profile Complete</p>
                    <p style={styles.successSub}>
                      {[survey.sport, survey.position, survey.time_per_week ? `${survey.time_per_week} days/wk` : null]
                        .filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div style={styles.navRow}>
                  <button style={styles.backBtn} onClick={() => goStep(2)}>← Back</button>
                  <button style={styles.primaryBtn} onClick={() => goStep(4)}>Continue →</button>
                </div>
              </>
            ) : (
              <>
                <p style={styles.stepDesc}>
                  Your coach uses this to build a personalized plan around your sport, goals, and schedule. Takes about 3 minutes.
                </p>
                <div style={styles.surveyPreviewCard}>
                  <div style={styles.surveyIconCircle}>
                    <ClipboardIcon size={26} color={YELLOW} />
                  </div>
                  <div>
                    <p style={styles.surveyPreviewTitle}>Needs Analysis</p>
                    <p style={styles.surveyPreviewSub}>Sport · Goals · Schedule · Equipment · Injuries</p>
                  </div>
                </div>
                <button
                  style={{ ...styles.primaryBtn, background: YELLOW, color: '#1a1a1a' }}
                  onClick={() => {
                    goStep(3) // persist step 3 so we return here after survey
                    navigate('/survey')
                  }}
                >
                  Complete Survey →
                </button>
                <div style={styles.navRow}>
                  <button style={styles.backBtn} onClick={() => goStep(2)}>← Back</button>
                  <button style={styles.skipLink} onClick={() => goStep(4)}>Skip for now →</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Step 4: Lifting Maxes ─── */}
        {step === 4 && (
          <div style={styles.stepWrap}>
            <span style={styles.stepBadge}>Step 4 of {TOTAL_STEPS}</span>
            <h1 style={styles.bigTitle}>
              Your Lifting <span style={{ color: ORANGE }}>PRs</span>
            </h1>
            <p style={styles.stepDesc}>
              Your coach uses these to calibrate your training load. Log any you know — you can always add more from your profile.
            </p>

            {/* Lift tabs */}
            <div style={styles.liftTabs}>
              {LIFTS.map(l => {
                const isLogged = sessionMaxes.includes(l.key)
                const isSelected = selectedLift === l.key
                return (
                  <button
                    key={l.key}
                    style={{
                      ...styles.liftTab,
                      background: isSelected ? ORANGE : isLogged ? 'rgba(247,87,9,0.10)' : 'var(--card-inner)',
                      color: isSelected ? '#fff' : isLogged ? ORANGE : 'var(--text-2)',
                      border: `1px solid ${isSelected ? ORANGE : isLogged ? 'rgba(247,87,9,0.30)' : 'var(--border)'}`,
                    }}
                    onClick={() => setSelectedLift(l.key)}
                  >
                    {isLogged && !isSelected && <><CheckIcon size={12} color={ORANGE} />{' '}</>}{l.label}
                  </button>
                )
              })}
            </div>

            {/* Log form or "already logged" badge */}
            {sessionMaxes.includes(selectedLift) ? (
              <div style={styles.loggedBadge}>
                <CheckCircleIcon size={18} color={ORANGE} />
                <span style={{ fontSize: 14, color: ORANGE, fontWeight: 600 }}>Logged!</span>
                <button
                  style={styles.relogBtn}
                  onClick={() => {
                    setSessionMaxes(prev => prev.filter(l => l !== selectedLift))
                    setLiftWeight('')
                    setLiftReps('1')
                  }}
                >
                  Edit
                </button>
              </div>
            ) : (
              <div style={styles.maxForm}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    style={{ ...styles.maxInput, flex: 2 }}
                    type="number"
                    placeholder="Weight (lbs)"
                    min="1" max="2000" step="0.5"
                    value={liftWeight}
                    onChange={e => setLiftWeight(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogMax()}
                  />
                  <input
                    style={{ ...styles.maxInput, flex: 1 }}
                    type="number"
                    placeholder="Reps"
                    min="1" max="100"
                    value={liftReps}
                    onChange={e => setLiftReps(e.target.value)}
                  />
                </div>
                <button
                  style={{
                    ...styles.primaryBtn,
                    alignSelf: 'flex-start',
                    opacity: !liftWeight || savingMax ? 0.55 : 1,
                  }}
                  disabled={!liftWeight || savingMax}
                  onClick={handleLogMax}
                >
                  {savingMax ? 'Saving…' : 'Log PR'}
                </button>
              </div>
            )}

            {sessionMaxes.length > 0 && (
              <p style={styles.sessionSummary}>
                Logged: {sessionMaxes.map(k => LIFTS.find(l => l.key === k)?.label).join(', ')}
              </p>
            )}

            <div style={styles.navRow}>
              <button style={styles.backBtn} onClick={() => goStep(3)}>← Back</button>
              <div style={styles.navRight}>
                {sessionMaxes.length === 0
                  ? <button style={styles.skipLink} onClick={() => goStep(5)}>Skip this step →</button>
                  : <button style={styles.primaryBtn} onClick={() => goStep(5)}>Continue →</button>
                }
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 5: Launch ─── */}
        {step === 5 && (
          <div style={{ ...styles.stepWrap, alignItems: 'center' }}>
            <div style={styles.trophyBadge}>
              <TrophyIcon size={42} color={YELLOW} />
            </div>

            <h1 style={{ ...styles.bigTitle, textAlign: 'center' }}>
              You're All Set,{' '}
              <span style={{ color: ORANGE }}>{firstName}</span>!
            </h1>
            <p style={{ ...styles.bigSub, textAlign: 'center' }}>
              Your profile is ready. Time to put in the work.
            </p>

            {plan ? (
              <div style={{ ...styles.launchCard, borderColor: 'rgba(247,87,9,0.30)' }}>
                <p style={styles.launchCardLabel}>Your Blueprint is Ready</p>
                <p style={styles.launchCardTitle}>{plan.title}</p>
                <p style={styles.launchCardSub}>
                  {plan.num_weeks}-week plan assigned by your coach. Let's get to work.
                </p>
                <button
                  style={{ ...styles.primaryBtn, alignSelf: 'stretch', justifyContent: 'center' }}
                  onClick={() => finishAndGo('/athlete/plan')}
                >
                  Check Out Your Blueprint →
                </button>
              </div>
            ) : (
              <div style={{ ...styles.launchCard, borderColor: 'rgba(48,142,189,0.30)' }}>
                <p style={{ ...styles.launchCardLabel, color: BLUE }}>Almost There</p>
                <p style={styles.launchCardTitle}>Your Coach is Building Your Plan</p>
                <p style={styles.launchCardSub}>
                  Your coach is reviewing your profile. While you wait, introduce yourself to the team!
                </p>
                <button
                  style={{ ...styles.primaryBtn, background: BLUE, alignSelf: 'stretch', justifyContent: 'center' }}
                  onClick={() => finishAndGo('/athlete/messages')}
                >
                  Make Your First Post →
                </button>
              </div>
            )}

            <button style={styles.finishLink} onClick={() => finishAndGo('/athlete')}>
              Go to Dashboard →
            </button>

            <button style={styles.backBtn} onClick={() => goStep(4)}>← Back</button>
          </div>
        )}

      </div>
    </div>
  )
}

/* ─── Styles ─────────────────────────────────────────────────── */
const styles = {
  fullPage: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-3)',
    fontSize: 15,
  },

  // Top bar
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
  },
  logo: { height: 28, display: 'block' },
  exitBtn: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-3)',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
  },

  // Progress
  progressTrack: { height: 3, background: 'var(--border)' },
  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${ORANGE}, ${BLUE})`,
    transition: 'width 0.4s ease',
  },
  stepDots: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },

  // Layout
  content: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    padding: '36px 20px 80px',
  },
  stepWrap: {
    width: '100%',
    maxWidth: 520,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-3)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Typography
  bigTitle: {
    fontSize: 'clamp(26px, 8vw, 38px)',
    fontWeight: 800,
    color: 'var(--text)',
    margin: 0,
    lineHeight: 1.15,
    letterSpacing: -0.5,
  },
  bigSub: {
    fontSize: 16,
    color: 'var(--text-2)',
    lineHeight: 1.65,
    margin: 0,
  },
  stepDesc: {
    fontSize: 15,
    color: 'var(--text-2)',
    lineHeight: 1.65,
    margin: 0,
  },

  // Welcome step
  welcomeAccent: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: `linear-gradient(135deg, ${ORANGE}, ${BLUE})`,
    borderRadius: 8,
    padding: '6px 14px',
    alignSelf: 'flex-start',
  },
  welcomeAccentText: {
    fontSize: 11,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: 2,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '22px 24px',
  },
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text)',
  },

  // Success card (shared)
  successCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    background: 'rgba(48,142,189,0.07)',
    border: '1px solid rgba(48,142,189,0.22)',
    borderRadius: 14,
    padding: '20px 22px',
  },
  successTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: BLUE,
    margin: '2px 0 4px',
  },
  successSub: {
    fontSize: 14,
    color: 'var(--text-2)',
    margin: 0,
    lineHeight: 1.5,
  },

  // Step 2 — join team
  joinLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  joinStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  codeInputLarge: {
    width: '100%',
    padding: '16px 18px',
    fontSize: 26,
    fontFamily: 'monospace',
    letterSpacing: 6,
    textAlign: 'center',
    borderRadius: 12,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    textTransform: 'uppercase',
    outline: 'none',
    boxSizing: 'border-box',
  },
  noCodeWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    paddingTop: 4,
  },
  noCodeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-3)',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px 0',
  },
  noCodeSub: {
    fontSize: 12,
    color: 'var(--text-3)',
    margin: 0,
    textAlign: 'center',
  },
  errorText: {
    color: '#c73820',
    fontSize: 13,
    margin: 0,
  },

  // Step 3 — survey
  surveyPreviewCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '18px 22px',
  },
  surveyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 14,
    background: 'rgba(240,190,36,0.12)',
    border: '1px solid rgba(240,190,36,0.22)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  surveyPreviewTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
    margin: '0 0 4px',
  },
  surveyPreviewSub: {
    fontSize: 13,
    color: 'var(--text-3)',
    margin: 0,
    lineHeight: 1.5,
  },

  // Step 4 — lifting maxes
  liftTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  liftTab: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  maxForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 20,
  },
  maxInput: {
    padding: '11px 14px',
    fontSize: 15,
    borderRadius: 8,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  loggedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '13px 16px',
    background: 'rgba(247,87,9,0.07)',
    border: '1px solid rgba(247,87,9,0.22)',
    borderRadius: 10,
  },
  relogBtn: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-3)',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 5,
    padding: '3px 8px',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  sessionSummary: {
    fontSize: 13,
    fontWeight: 600,
    color: ORANGE,
    margin: 0,
  },

  // Step 5 — launch
  trophyBadge: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(247,87,9,0.15), rgba(240,190,36,0.15))',
    border: `2px solid rgba(240,190,36,0.4)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 36px rgba(240,190,36,0.22)',
    alignSelf: 'center',
  },
  launchCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    boxSizing: 'border-box',
  },
  launchCardLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    margin: 0,
  },
  launchCardTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  launchCardSub: {
    fontSize: 14,
    color: 'var(--text-2)',
    margin: 0,
    lineHeight: 1.55,
  },
  finishLink: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px 0',
    alignSelf: 'center',
  },

  // Navigation
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-3)',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 16px',
    cursor: 'pointer',
  },
  skipLink: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: 0.2,
    alignSelf: 'flex-start',
    whiteSpace: 'nowrap',
  },
}
