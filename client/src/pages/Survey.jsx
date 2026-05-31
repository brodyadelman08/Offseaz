import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  FootballIcon, BasketballIcon, BaseballIcon, SoftballIcon,
  SoccerIcon, HockeyIcon, VolleyballIcon, WrestlingIcon,
  RunningIcon, CrossCountryIcon, LacrosseIcon, SwimmingIcon, SportOtherIcon,
  DumbbellIcon, BarChartIcon, BoltIcon, TrophyIcon,
  SeedlingIcon, FlameIcon, BarbellIcon, UserIcon,
} from '../components/Icons'

const ORANGE = '#F75709'
const TOTAL_STEPS = 10

// ─── Static data ──────────────────────────────────────────────────────────────

const SPORTS = [
  { key: 'Football',        Icon: FootballIcon,    iconSize: 40 },
  { key: 'Basketball',      Icon: BasketballIcon,  iconSize: 40 },
  { key: 'Baseball',        Icon: BaseballIcon,    iconSize: 40 },
  { key: 'Softball',        Icon: SoftballIcon,    iconSize: 40 },
  { key: 'Soccer',          Icon: SoccerIcon,      iconSize: 40 },
  { key: 'Hockey',          Icon: HockeyIcon,      iconSize: 40 },
  { key: 'Volleyball',      Icon: VolleyballIcon,  iconSize: 40 },
  { key: 'Wrestling',       Icon: WrestlingIcon,   iconSize: 40 },
  { key: 'Track and Field', Icon: RunningIcon,     iconSize: 40 },
  { key: 'Cross Country',   Icon: CrossCountryIcon, iconSize: 40 },
  { key: 'Lacrosse',        Icon: LacrosseIcon,    iconSize: 40 },
  { key: 'Swimming',        Icon: SwimmingIcon,    iconSize: 40 },
  { key: 'Other',           Icon: SportOtherIcon,  iconSize: 40 },
]

const POSITIONS = {
  Football:          ['QB', 'RB', 'WR', 'OL', 'DL', 'LB', 'DB', 'TE', 'K/P'],
  Basketball:        ['PG', 'SG', 'SF', 'PF', 'C'],
  Baseball:          ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop', 'Outfield', 'DH'],
  Softball:          ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop', 'Outfield', 'DH'],
  Soccer:            ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
  Hockey:            ['Goalie', 'Defenseman', 'Center', 'Left Wing', 'Right Wing'],
  Volleyball:        ['Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Right Side'],
  Wrestling:         ['106', '113', '120', '126', '132', '138', '144', '150', '157', '165', '175', '190', '215', '285'],
  'Track and Field': ['Sprints', 'Distance', 'Jumps', 'Throws', 'Multi-event'],
}

function getPositions(sport) {
  return POSITIONS[sport] || ['General Position']
}

// ─── Reusable selection components ───────────────────────────────────────────

function SelectCard({ options, value, onChange, cols = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {options.map(opt => {
        const key      = typeof opt === 'string' ? opt : opt.key
        const label    = typeof opt === 'string' ? opt : (opt.label || opt.key)
        const sub      = typeof opt === 'object' ? opt.sub      : null
        const Icon     = typeof opt === 'object' ? opt.Icon     : null
        const iconSize = typeof opt === 'object' ? (opt.iconSize || 22) : 22
        const sel      = value === key
        return (
          <button
            key={key}
            onClick={() => onChange(sel ? '' : key)}
            style={{
              padding: (sub || iconSize > 22) ? '16px 12px 14px' : '13px 10px',
              borderRadius: 12,
              border: `2px solid ${sel ? ORANGE : 'var(--border)'}`,
              background: sel ? 'rgba(247,87,9,0.08)' : 'var(--card-inner)',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'border-color 0.15s',
            }}
          >
            {Icon && (
              <div style={{ marginBottom: 8, lineHeight: 1, opacity: sel ? 1 : 0.45, display: 'flex', justifyContent: 'center' }}>
                <Icon size={iconSize} color={sel ? ORANGE : 'var(--text-3)'} />
              </div>
            )}
            <div style={{ fontSize: iconSize > 22 ? 12 : 14, fontWeight: 700, color: sel ? ORANGE : 'var(--text)', lineHeight: 1.3 }}>{label}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4, textAlign: 'left' }}>{sub}</div>}
          </button>
        )
      })}
    </div>
  )
}

function MultiCards({ options, value = [], onChange }) {
  function toggle(key) {
    if (key === 'None') {
      onChange(value.includes('None') ? [] : ['None'])
      return
    }
    const cleared = value.filter(v => v !== 'None')
    onChange(cleared.includes(key) ? cleared.filter(v => v !== key) : [...cleared, key])
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {options.map(opt => {
        const key   = typeof opt === 'string' ? opt : opt.key
        const label = typeof opt === 'string' ? opt : opt.label
        const sel   = value.includes(key)
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: `2px solid ${sel ? ORANGE : 'var(--border)'}`,
              background: sel ? 'rgba(247,87,9,0.08)' : 'var(--card-inner)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'border-color 0.15s',
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: `2px solid ${sel ? ORANGE : 'var(--text-3)'}`,
              background: sel ? ORANGE : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {sel && <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', lineHeight: 1 }}>✓</span>}
            </span>
            <span style={{ fontSize: 14, fontWeight: sel ? 700 : 500, color: sel ? ORANGE : 'var(--text)' }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Survey ───────────────────────────────────────────────────────────────────

export default function Survey() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const isRetake = location.state?.retake === true

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [checkingExisting, setCheckingExisting] = useState(true)

  const [form, setForm] = useState({
    full_name:        '',
    age:              '',
    height_feet:      '',
    height_inches:    '0',
    weight_lbs:       '',
    grade:            '',
    sport:            '',
    position:         '',
    primary_goal:     '',
    experience_level: '',
    days_per_week:    '',
    equipment_tier:   '',
    injury_areas:     [],
    injury_other:     '',
    injury_notes:     '',
    weakness_areas:   [],
    offseason_goals:  [],
  })

  useEffect(() => {
    api.get('/api/survey/my')
      .then(res => {
        const existing = res.data.survey
        if (existing && !isRetake) {
          // Survey already done and not retaking — go to dashboard
          navigate('/athlete', { replace: true })
        } else {
          if (existing && isRetake) {
            // Pre-fill the form with current answers so the athlete can edit
            setForm({
              full_name:        profile?.full_name || '',
              age:              existing.age              ? String(existing.age)           : '',
              height_feet:      existing.height_feet      ? String(existing.height_feet)   : '',
              height_inches:    existing.height_inches != null ? String(existing.height_inches) : '0',
              weight_lbs:       existing.weight_lbs      ? String(existing.weight_lbs)    : '',
              grade:            existing.grade            || '',
              sport:            existing.sport            || '',
              position:         existing.position         || '',
              primary_goal:     existing.primary_goal     || '',
              experience_level: existing.experience_level || '',
              days_per_week:    existing.time_per_week    ? existing.time_per_week : '',
              equipment_tier:   existing.equipment_tier   || '',
              injury_areas:     existing.injury_areas     || [],
              injury_other:     existing.injury_other     || '',
              injury_notes:     existing.injury_notes     || '',
              weakness_areas:   existing.weakness_areas   || [],
              offseason_goals:  existing.offseason_goals  || [],
            })
          }
          setCheckingExisting(false)
        }
      })
      .catch(() => setCheckingExisting(false))
  }, [navigate, isRetake])

  function set(field, val) { setForm(prev => ({ ...prev, [field]: val })) }

  function canAdvance() {
    if (step === 1) return form.full_name.trim().length > 0
    if (step === 2) return form.sport !== ''
    if (step === 4) return form.primary_goal !== ''
    if (step === 5) return form.experience_level !== ''
    if (step === 6) return form.days_per_week !== ''
    if (step === 7) return form.equipment_tier !== ''
    return true
  }

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      if (isRetake) {
        await api.put('/api/survey', form)
      } else {
        await api.post('/api/survey', form)
      }
      navigate('/athlete', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.')
      setSubmitting(false)
    }
  }

  if (checkingExisting) return <div style={st.center}>Loading…</div>

  const progressPct = ((step - 1) / TOTAL_STEPS) * 100

  return (
    <div style={st.page}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={st.topBar}>
        <img src="/Offseaz_logo__DARK_-removebg-preview.png" alt="Offseaz" style={st.logo} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={st.stepCount}>{step} of {TOTAL_STEPS}</span>
          <button style={st.skipBtn} onClick={() => navigate('/athlete/profile')}>
            {isRetake ? 'Cancel' : 'Skip'}
          </button>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div style={st.progressTrack}>
        <div style={{ ...st.progressFill, width: `${progressPct}%` }} />
      </div>

      <div style={st.container}>

        {/* ── Step 1: Basic Info ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <p style={st.tag}>Basic Info</p>
            <h2 style={st.title}>Let's get to know you</h2>
            <p style={st.desc}>Tell us a bit about yourself to personalize your profile.</p>

            <label style={st.label}>Name *</label>
            <input
              style={st.input}
              type="text"
              placeholder="Your full name"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              autoFocus
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={st.label}>Age</label>
                <select style={st.input} value={form.age} onChange={e => set('age', e.target.value)}>
                  <option value="">—</option>
                  {Array.from({ length: 13 }, (_, i) => i + 13).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={st.label}>Grade</label>
                <select style={st.input} value={form.grade} onChange={e => set('grade', e.target.value)}>
                  <option value="">—</option>
                  {['8th', '9th', '10th', '11th', '12th', 'College'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <label style={st.label}>Height</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <select style={{ ...st.input, flex: 1 }} value={form.height_feet} onChange={e => set('height_feet', e.target.value)}>
                <option value="">ft</option>
                {[4, 5, 6, 7].map(f => <option key={f} value={f}>{f} ft</option>)}
              </select>
              <select style={{ ...st.input, flex: 1 }} value={form.height_inches} onChange={e => set('height_inches', e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{i} in</option>
                ))}
              </select>
            </div>

            <label style={st.label}>Weight (lbs)</label>
            <input
              style={st.input}
              type="number"
              placeholder="e.g. 175"
              value={form.weight_lbs}
              onChange={e => set('weight_lbs', e.target.value)}
            />
          </>
        )}

        {/* ── Step 2: Sport ──────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <p style={st.tag}>Sport</p>
            <h2 style={st.title}>What's your sport?</h2>
            <p style={st.desc}>Select the sport you're training for this offseason.</p>
            <SelectCard
              options={SPORTS}
              value={form.sport}
              onChange={v => { set('sport', v); set('position', '') }}
              cols={3}
            />
          </>
        )}

        {/* ── Step 3: Position ───────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <p style={st.tag}>Position</p>
            <h2 style={st.title}>
              {form.sport === 'Wrestling' ? 'Weight class' : 'Your position'}
            </h2>
            <p style={st.desc}>
              {form.sport === 'Wrestling'
                ? 'Select your competition weight class.'
                : `Select your position${form.sport ? ` in ${form.sport}` : ''}.`}
            </p>
            <SelectCard
              options={getPositions(form.sport)}
              value={form.position}
              onChange={v => set('position', v)}
              cols={form.sport === 'Wrestling' ? 4 : 3}
            />
          </>
        )}

        {/* ── Step 4: Primary Goal ───────────────────────────────────────── */}
        {step === 4 && (
          <>
            <p style={st.tag}>Primary Goal</p>
            <h2 style={st.title}>What's your main focus?</h2>
            <p style={st.desc}>Choose your primary training goal this offseason.</p>
            <SelectCard
              options={[
                { key: 'Strength and Power',           label: 'Strength & Power',            sub: 'Maximal force and explosiveness',      Icon: DumbbellIcon },
                { key: 'Muscle Gain and Size',         label: 'Muscle Gain & Size',           sub: 'Build mass and fill out your frame',   Icon: BarChartIcon },
                { key: 'Speed and Conditioning',       label: 'Speed & Conditioning',         sub: 'Faster, leaner, more athletic',        Icon: BoltIcon },
                { key: 'General Athletic Performance', label: 'General Athletic Performance', sub: 'Well-rounded sport readiness',         Icon: TrophyIcon },
              ]}
              value={form.primary_goal}
              onChange={v => set('primary_goal', v)}
              cols={2}
            />
          </>
        )}

        {/* ── Step 5: Experience ─────────────────────────────────────────── */}
        {step === 5 && (
          <>
            <p style={st.tag}>Experience</p>
            <h2 style={st.title}>Training experience</h2>
            <p style={st.desc}>How long have you been seriously lifting or training?</p>
            <SelectCard
              options={[
                { key: 'Beginner',     label: 'Beginner',     sub: 'Less than 1 year of serious training',  Icon: SeedlingIcon },
                { key: 'Intermediate', label: 'Intermediate', sub: '1 to 3 years of training',               Icon: FlameIcon },
                { key: 'Advanced',     label: 'Advanced',     sub: '3+ years of consistent training',        Icon: TrophyIcon },
              ]}
              value={form.experience_level}
              onChange={v => set('experience_level', v)}
              cols={1}
            />
          </>
        )}

        {/* ── Step 6: Days per week ──────────────────────────────────────── */}
        {step === 6 && (
          <>
            <p style={st.tag}>Schedule</p>
            <h2 style={st.title}>Days per week</h2>
            <p style={st.desc}>How many days can you commit to training each week?</p>
            <div style={st.dayGrid}>
              {[3, 4, 5, 6].map(d => {
                const sel = form.days_per_week === d
                return (
                  <button
                    key={d}
                    style={{ ...st.dayBtn, ...(sel ? st.dayBtnOn : {}) }}
                    onClick={() => set('days_per_week', d)}
                  >
                    <span style={{ fontSize: 40, fontWeight: 800, color: sel ? ORANGE : 'var(--text)', lineHeight: 1 }}>{d}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>days / wk</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ── Step 7: Equipment ──────────────────────────────────────────── */}
        {step === 7 && (
          <>
            <p style={st.tag}>Equipment</p>
            <h2 style={st.title}>What's your setup?</h2>
            <p style={st.desc}>Choose the option that best describes your access to training equipment.</p>
            <SelectCard
              options={[
                { key: 'Full',    label: 'Full Gym',    sub: 'Barbell rack, plates, cables, machines — the full setup', Icon: BarbellIcon },
                { key: 'Partial', label: 'Partial Gym', sub: 'Dumbbells, some machines, limited barbell access',        Icon: DumbbellIcon },
                { key: 'Minimal', label: 'Minimal',     sub: 'Bands, light dumbbells, and bodyweight only',             Icon: UserIcon },
              ]}
              value={form.equipment_tier}
              onChange={v => set('equipment_tier', v)}
              cols={1}
            />
          </>
        )}

        {/* ── Step 8: Injury History ─────────────────────────────────────── */}
        {step === 8 && (
          <>
            <p style={st.tag}>Health</p>
            <h2 style={st.title}>Injury history</h2>
            <p style={st.desc}>Select any areas your coach should know about. Helps build a safer program.</p>
            <MultiCards
              options={['Shoulder', 'Knee', 'Back', 'Hip', 'Ankle', 'None', 'Other']}
              value={form.injury_areas}
              onChange={v => set('injury_areas', v)}
            />
            {form.injury_areas.includes('Other') && (
              <>
                <label style={st.label}>Describe the injury</label>
                <input
                  style={st.input}
                  type="text"
                  placeholder="Brief description…"
                  value={form.injury_other}
                  onChange={e => set('injury_other', e.target.value)}
                />
              </>
            )}
            <label style={{ ...st.label, marginTop: 20 }}>Additional notes (optional)</label>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 8px' }}>
              Any surgeries, hardware, specific movements that cause discomfort, or anything your coach should know.
            </p>
            <textarea
              style={{ ...st.input, minHeight: 90, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              placeholder="e.g. Had ACL surgery in March, still rebuilding quad strength. Avoid deep squats below parallel."
              value={form.injury_notes}
              onChange={e => set('injury_notes', e.target.value)}
            />
          </>
        )}

        {/* ── Step 9: Weaknesses ─────────────────────────────────────────── */}
        {step === 9 && (
          <>
            <p style={st.tag}>Self-Assessment</p>
            <h2 style={st.title}>Your weaknesses</h2>
            <p style={st.desc}>Be honest — select every area where you want to get better.</p>
            <MultiCards
              options={[
                'Speed', 'Strength', 'Endurance', 'Explosiveness', 'Mobility',
                'Upper body strength', 'Lower body strength', 'Core strength',
                'Size and muscle mass', 'Overall conditioning',
              ]}
              value={form.weakness_areas}
              onChange={v => set('weakness_areas', v)}
            />
          </>
        )}

        {/* ── Step 10: Offseason Goals ───────────────────────────────────── */}
        {step === 10 && (
          <>
            <p style={st.tag}>Goals</p>
            <h2 style={st.title}>Goals this offseason</h2>
            <p style={st.desc}>Check everything you want to accomplish before the season starts.</p>
            <MultiCards
              options={[
                'Gain weight', 'Lose weight', 'Get faster', 'Get stronger',
                'Improve vertical', 'Build muscle', 'Stay healthy', 'Make varsity', 'Get recruited',
              ]}
              value={form.offseason_goals}
              onChange={v => set('offseason_goals', v)}
            />
          </>
        )}

        {error && <p style={st.error}>{error}</p>}

        {/* ── Navigation ───────────────────────────────────────────────────── */}
        <div style={st.nav}>
          {step > 1 && (
            <button style={st.backBtn} onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              style={{ ...st.nextBtn, opacity: canAdvance() ? 1 : 0.4, cursor: canAdvance() ? 'pointer' : 'not-allowed' }}
              onClick={() => canAdvance() && setStep(s => s + 1)}
              disabled={!canAdvance()}
            >
              Next →
            </button>
          ) : (
            <button style={st.nextBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Complete Profile →'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

const st = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-2)' },
  page:   { minHeight: '100vh', background: 'var(--bg)' },

  topBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--border)' },
  logo:      { height: 28 },
  stepCount: { fontSize: 13, fontWeight: 600, color: 'var(--text-3)' },
  skipBtn:   { fontSize: 13, color: 'var(--text-3)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' },

  progressTrack: { height: 4, background: 'var(--border)' },
  progressFill:  { height: '100%', background: ORANGE, transition: 'width 0.3s ease' },

  container: { maxWidth: 560, margin: '0 auto', padding: '32px 20px 80px' },

  tag:   { fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 4px' },
  title: { fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' },
  desc:  { fontSize: 14, color: 'var(--text-2)', margin: '0 0 22px' },

  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', margin: '16px 0 6px' },
  input: { width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', boxSizing: 'border-box', outline: 'none' },

  dayGrid:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  dayBtn:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 8px', borderRadius: 14, border: '2px solid var(--border)', background: 'var(--card-inner)', cursor: 'pointer', transition: 'all 0.15s' },
  dayBtnOn: { border: `2px solid ${ORANGE}`, background: 'rgba(247,87,9,0.1)' },

  nav:     { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 36 },
  backBtn: { padding: '12px 22px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-inner)', color: 'var(--text)', cursor: 'pointer' },
  nextBtn: { padding: '13px 32px', fontSize: 15, fontWeight: 800, borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', cursor: 'pointer', letterSpacing: 0.2 },
  error:   { color: '#c73820', fontSize: 13, marginTop: 12 },
}
