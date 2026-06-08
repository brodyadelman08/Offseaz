import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  DumbbellIcon, BarChartIcon, BoltIcon, TrophyIcon,
  SeedlingIcon, FlameIcon, BarbellIcon, UserIcon,
} from '../components/Icons'

const ORANGE = '#F75709'
const TOTAL_STEPS = 10

// Sport data — emojis for universal recognition, renders natively on every platform
const SPORTS = [
  { key: 'Football',        emoji: '🏈' },
  { key: 'Basketball',      emoji: '🏀' },
  { key: 'Baseball',        emoji: '⚾' },
  { key: 'Softball',        emoji: '🥎' },
  { key: 'Soccer',          emoji: '⚽' },
  { key: 'Hockey',          emoji: '🏒' },
  { key: 'Rugby',           emoji: '🏉' },
  { key: 'Tennis',          emoji: '🎾' },
  { key: 'Golf',            emoji: '⛳' },
  { key: 'Volleyball',      emoji: '🏐' },
  { key: 'Wrestling',       emoji: '🤼' },
  { key: 'Track and Field', emoji: '🏃' },
  { key: 'Cross Country',   emoji: '🏃‍♀️' },
  { key: 'Lacrosse',        emoji: '🥍' },
  { key: 'Swimming',        emoji: '🏊' },
  { key: 'Other',           emoji: '🏋️' },
]

const POSITIONS = {
  Football:          ['QB', 'RB', 'WR', 'OL', 'DL', 'LB', 'DB', 'TE', 'K/P'],
  Basketball:        ['PG', 'SG', 'SF', 'PF', 'C'],
  Baseball:          ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop', 'Outfield', 'DH'],
  Softball:          ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop', 'Outfield', 'Utility'],
  Soccer:            ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
  Hockey:            ['Forwards', 'Defense', 'Goalie'],
  Rugby:             ['Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8', 'Scrum Half', 'Fly Half', 'Center', 'Wing', 'Fullback'],
  Tennis:            ['All Players'],
  Golf:              ['All Players'],
  Volleyball:        ['Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Right Side'],
  Wrestling:         ['106', '113', '120', '126', '132', '138', '144', '150', '157', '165', '175', '190', '215', '285'],
  'Track and Field': ['Sprints', 'Distance', 'Jumps', 'Throws', 'Multi-event'],
}

function getPositions(sport) {
  return POSITIONS[sport] || ['General Position']
}

const STEP_META = [
  null,
  { tag: 'About You',     title: "Let's build your profile",       desc: 'Tell us about yourself so your coach can personalize your program.' },
  { tag: 'Sport',         title: "What's your sport?",             desc: 'Select the sport you\'re training for this offseason.' },
  { tag: 'Position',      title: null,                             desc: null }, // dynamic
  { tag: 'Primary Goal',  title: "What's your main goal?",         desc: 'Choose your primary training objective this offseason.' },
  { tag: 'Experience',    title: 'Training experience',             desc: 'How long have you been seriously training or lifting?' },
  { tag: 'Schedule',      title: 'Weekly training days',            desc: 'How many days per week can you commit to structured training?' },
  { tag: 'Equipment',     title: 'Your training setup',             desc: 'Select the equipment you have regular access to.' },
  { tag: 'Health',        title: 'Injury history',                  desc: 'Flag any areas your coach should know about. Helps build a safer program.' },
  { tag: 'Self-Assessment', title: 'Areas to improve',              desc: 'Be honest — select every area where you want to get better.' },
  { tag: 'Goals',         title: 'Goals this offseason',            desc: 'Check everything you want to accomplish before the season starts.' },
]

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  cardSelected: `linear-gradient(145deg, rgba(247,87,9,0.11) 0%, rgba(247,87,9,0.04) 100%), var(--card-inner)`,
  cardHov:      `linear-gradient(145deg, rgba(247,87,9,0.04) 0%, transparent 100%), var(--card-inner)`,
  cardBase:     'var(--card-inner)',
  shadowBase:   '0 1px 4px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
  shadowHov:    '0 5px 18px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.05)',
  shadowSel:    '0 0 0 3px rgba(247,87,9,0.10), 0 4px 18px rgba(247,87,9,0.18), inset 0 1px 0 rgba(255,255,255,0.07)',
  transAll:     'border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, transform 0.18s ease',
}

// ─── Spring checkmark badge ───────────────────────────────────────────────────
function CheckBadge({ visible, size = 18, top = 10, right = 10 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top,
        right,
        width: size,
        height: size,
        borderRadius: '50%',
        background: ORANGE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.25)',
        transition: 'opacity 0.15s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(247,87,9,0.45)',
        zIndex: 2,
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}

// ─── Icon badge (icon in a rounded square) ────────────────────────────────────
function IconBadge({ Icon, selected }) {
  return (
    <div style={{
      width: 44,
      height: 44,
      borderRadius: 12,
      background: selected ? 'rgba(247,87,9,0.16)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${selected ? 'rgba(247,87,9,0.25)' : 'var(--border)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'background 0.18s ease, border-color 0.18s ease',
    }}>
      <Icon size={22} color={selected ? ORANGE : 'var(--text-2)'} />
    </div>
  )
}

// ─── OptionCard — unified single-select card ─────────────────────────────────
// layout:
//   'row'   → horizontal: icon-badge left, text right, radio right  [for 1-col lists]
//   'grid'  → vertical: icon-badge top, label center                [for 2-col icon grids]
//   'plain' → compact text-only pill                                [for positions]

function OptionCard({ option, selected, onClick, layout = 'row' }) {
  const [hov, setHov] = useState(false)

  const key   = typeof option === 'string' ? option : option.key
  const label = typeof option === 'string' ? option : (option.label || option.key)
  const sub   = typeof option === 'object' ? option.sub  : null
  const Icon  = typeof option === 'object' ? option.Icon : null

  const border = `1.5px solid ${selected ? ORANGE : hov ? 'rgba(247,87,9,0.28)' : 'var(--border)'}`
  const bg     = selected ? T.cardSelected : hov ? T.cardHov : T.cardBase
  const shadow = selected ? T.shadowSel : hov ? T.shadowHov : T.shadowBase

  const baseStyle = {
    position: 'relative',
    border,
    background: bg,
    boxShadow: shadow,
    borderRadius: 14,
    cursor: 'pointer',
    outline: 'none',
    transform: hov && !selected ? 'translateY(-1px)' : 'none',
    transition: T.transAll,
  }

  if (layout === 'row') {
    return (
      <button
        style={{ ...baseStyle, display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', textAlign: 'left', width: '100%' }}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {Icon && <IconBadge Icon={Icon} selected={selected} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: selected ? ORANGE : 'var(--text)', marginBottom: sub ? 3 : 0, transition: 'color 0.15s', lineHeight: 1.3 }}>
            {label}
          </div>
          {sub && (
            <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.45 }}>
              {sub}
            </div>
          )}
        </div>
        {/* Radio indicator */}
        <div style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: `2px solid ${selected ? ORANGE : 'var(--border)'}`,
          background: selected ? ORANGE : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: selected ? '0 0 0 3px rgba(247,87,9,0.14)' : 'none',
        }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#fff',
            opacity: selected ? 1 : 0,
            transform: selected ? 'scale(1)' : 'scale(0)',
            transition: 'opacity 0.15s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />
        </div>
      </button>
    )
  }

  if (layout === 'grid') {
    return (
      <button
        style={{ ...baseStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 14px 18px', textAlign: 'center' }}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <CheckBadge visible={selected} />
        {Icon && (
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: selected ? 'rgba(247,87,9,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${selected ? 'rgba(247,87,9,0.25)' : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            transform: selected ? 'scale(1.05)' : 'scale(1)',
            transition: 'background 0.18s, transform 0.18s, border-color 0.18s',
          }}>
            <Icon size={26} color={selected ? ORANGE : 'var(--text-2)'} />
          </div>
        )}
        <div style={{ fontSize: 14, fontWeight: 700, color: selected ? ORANGE : 'var(--text)', marginBottom: sub ? 5 : 0, transition: 'color 0.15s' }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.4 }}>{sub}</div>
        )}
      </button>
    )
  }

  // plain — compact text pill for positions / weight classes
  return (
    <button
      style={{
        ...baseStyle,
        padding: '11px 8px',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: selected ? 700 : 600,
        color: selected ? ORANGE : 'var(--text-2)',
        letterSpacing: 0.1,
      }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  )
}

// ─── SelectCard — layout wrapper for OptionCard grid ─────────────────────────
function SelectCard({ options, value, onChange, layout = 'row', minColWidth = 140 }) {
  const gridStyle = layout === 'row'
    ? { display: 'flex', flexDirection: 'column', gap: 10 }
    : {
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`,
        gap: layout === 'plain' ? 8 : 10,
      }

  return (
    <div style={gridStyle}>
      {options.map(opt => {
        const key = typeof opt === 'string' ? opt : opt.key
        return (
          <OptionCard
            key={key}
            option={opt}
            selected={value === key}
            onClick={() => onChange(value === key ? '' : key)}
            layout={layout}
          />
        )
      })}
    </div>
  )
}

// ─── Sport Selection Grid ─────────────────────────────────────────────────────
function SportGrid({ options, value, onChange }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
      gap: 10,
    }}>
      {options.map(({ key, emoji }) => {
        const sel = value === key
        const hov = hovered === key && !sel

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(sel ? '' : key)}
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '22px 8px 16px',
              borderRadius: 16,
              border: `1.5px solid ${sel ? ORANGE : hov ? 'rgba(247,87,9,0.32)' : 'var(--border)'}`,
              background: sel ? T.cardSelected : hov ? T.cardHov : T.cardBase,
              cursor: 'pointer',
              outline: 'none',
              transform: hov ? 'translateY(-2px)' : 'none',
              boxShadow: sel ? T.shadowSel : hov ? T.shadowHov : T.shadowBase,
              transition: T.transAll,
            }}
          >
            <CheckBadge visible={sel} />
            <span style={{
              fontSize: 34,
              lineHeight: 1,
              marginBottom: 10,
              display: 'block',
              transform: sel ? 'scale(1.12)' : hov ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.2s ease',
              userSelect: 'none',
            }}>
              {emoji}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: sel ? ORANGE : 'var(--text)',
              letterSpacing: 0.2,
              textAlign: 'center',
              lineHeight: 1.3,
              transition: 'color 0.15s',
            }}>
              {key}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Multi-Select Card ────────────────────────────────────────────────────────
function MultiCard({ option, selected, onClick }) {
  const [hov, setHov] = useState(false)
  const key   = typeof option === 'string' ? option : option.key
  const label = typeof option === 'string' ? option : option.label

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        borderRadius: 12,
        border: `1.5px solid ${selected ? ORANGE : hov ? 'rgba(247,87,9,0.24)' : 'var(--border)'}`,
        background: selected ? T.cardSelected : hov ? T.cardHov : T.cardBase,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transform: hov && !selected ? 'translateY(-1px)' : 'none',
        boxShadow: selected
          ? '0 0 0 2.5px rgba(247,87,9,0.10), 0 2px 12px rgba(247,87,9,0.14), inset 0 1px 0 rgba(255,255,255,0.05)'
          : hov
            ? '0 4px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)'
            : T.shadowBase,
        transition: T.transAll,
        outline: 'none',
      }}
    >
      {/* Animated checkbox */}
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        border: `2px solid ${selected ? ORANGE : hov ? 'rgba(247,87,9,0.38)' : 'var(--text-3)'}`,
        background: selected ? ORANGE : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: selected ? '0 2px 6px rgba(247,87,9,0.32)' : 'none',
      }}>
        <svg
          width="10" height="10"
          viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="3.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: selected ? 1 : 0, transform: selected ? 'scale(1)' : 'scale(0.4)', transition: 'opacity 0.15s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <span style={{
        fontSize: 14,
        fontWeight: selected ? 700 : 500,
        color: selected ? ORANGE : hov ? 'var(--text)' : 'var(--text-2)',
        transition: 'color 0.15s',
        lineHeight: 1.3,
      }}>
        {label}
      </span>
    </button>
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: 8,
    }}>
      {options.map(opt => {
        const key = typeof opt === 'string' ? opt : opt.key
        return (
          <MultiCard
            key={key}
            option={opt}
            selected={value.includes(key)}
            onClick={() => toggle(key)}
          />
        )
      })}
    </div>
  )
}

// ─── Day Picker ───────────────────────────────────────────────────────────────
const DAY_LABELS = { 3: 'Recommended', 4: 'Standard', 5: 'Intensive', 6: 'Elite' }

function DayPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
    }}>
      {[3, 4, 5, 6].map(d => {
        const sel = value === d
        const hov = hovered === d && !sel

        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            onMouseEnter={() => setHovered(d)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '26px 12px 20px',
              borderRadius: 16,
              border: `1.5px solid ${sel ? ORANGE : hov ? 'rgba(247,87,9,0.30)' : 'var(--border)'}`,
              background: sel ? T.cardSelected : hov ? T.cardHov : T.cardBase,
              cursor: 'pointer',
              transform: hov ? 'translateY(-2px)' : 'none',
              boxShadow: sel ? T.shadowSel : hov ? T.shadowHov : T.shadowBase,
              transition: T.transAll,
              outline: 'none',
            }}
          >
            <CheckBadge visible={sel} />
            <span style={{
              fontSize: 44,
              fontWeight: 800,
              color: sel ? ORANGE : 'var(--text)',
              lineHeight: 1,
              letterSpacing: -1.5,
              fontFamily: "'Calibri', 'Trebuchet MS', 'Segoe UI', sans-serif",
              transition: 'color 0.15s',
            }}>
              {d}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-3)',
              marginTop: 7,
              letterSpacing: 0.3,
            }}>
              days/wk
            </span>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: sel ? ORANGE : 'var(--text-3)',
              marginTop: 5,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              transition: 'color 0.15s',
            }}>
              {DAY_LABELS[d]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Survey shell ─────────────────────────────────────────────────────────────
export default function Survey() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const isRetake = location.state?.retake === true

  const [step, setStep]               = useState(1)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [hasTeam, setHasTeam]         = useState(true)

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
    Promise.all([
      api.get('/api/survey/my'),
      api.get('/api/teams/my-team').catch(() => ({ data: { team: null } })),
    ])
      .then(([surveyRes, teamRes]) => {
        const existing = surveyRes.data.survey
        const team = teamRes.data.team

        // Athletes can now take the survey without a team — they'll get a locked
        // preview plan they can unlock by joining their coach's team later.
        // (team gate removed)

        if (existing && !isRetake) {
          navigate('/athlete', { replace: true })
        } else {
          if (existing && isRetake) {
            setForm({
              full_name:        profile?.full_name || '',
              age:              existing.age              ? String(existing.age)               : '',
              height_feet:      existing.height_feet      ? String(existing.height_feet)       : '',
              height_inches:    existing.height_inches != null ? String(existing.height_inches) : '0',
              weight_lbs:       existing.weight_lbs      ? String(existing.weight_lbs)        : '',
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

  if (checkingExisting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="survey-spinner" />
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 12 }}>Loading…</p>
        </div>
      </div>
    )
  }

  // hasTeam gate removed — athletes can now take the survey without a team

  const meta = STEP_META[step]

  // Dynamic title/desc for position step
  const title = step === 3
    ? (form.sport === 'Wrestling' ? 'Your weight class' : 'Your position')
    : meta.title

  const desc = step === 3
    ? (form.sport === 'Wrestling'
        ? 'Select your competition weight class.'
        : `Select your primary position${form.sport ? ` in ${form.sport}` : ''}.`)
    : meta.desc

  return (
    <div style={st.page}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={st.topBar}>
        <img src="/Offseaz_Logo__White_Letter__Dark_PNG.png" alt="Offseaz" style={st.logo} />

        <div style={st.stepPill}>
          <span style={st.stepPillName}>{meta.tag}</span>
          <span style={st.stepPillDivider} />
          <span style={st.stepPillCount}>{step}<span style={{ opacity: 0.5 }}> / {TOTAL_STEPS}</span></span>
        </div>

        <button
          style={st.skipBtn}
          onClick={() => navigate(isRetake ? '/athlete/profile' : '/athlete')}
        >
          {isRetake ? 'Cancel' : 'Skip for now'}
        </button>
      </div>

      {/* ── Segmented progress ──────────────────────────────────────────────── */}
      <div style={st.progressBar}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '100%',
              borderRadius: 2,
              background: i < step ? ORANGE : 'var(--border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div style={st.scrollArea}>
        <div style={st.container}>

          {/* Welcome message — step 1 only */}
          {step === 1 && (
            <div className="survey-step-enter" key="welcome" style={{ marginBottom: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: ORANGE, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
                Welcome to Offseaz
              </p>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginBottom: 8 }}>
                Let's build your<br />weight room plan.
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28 }}>
                Answer a few quick questions and we'll generate a sport-specific, periodized training blueprint built for you.
              </p>
            </div>
          )}

          {/* Step header */}
          <div className="survey-step-enter" key={`header-${step}`} style={st.header}>
            <div style={st.tag}>{meta.tag}</div>
            <h2 style={st.title}>{title}</h2>
            <p style={st.desc}>{desc}</p>
          </div>

          {/* ── Step body ────────────────────────────────────────────────────── */}
          <div className="survey-step-enter" key={`body-${step}`}>

            {/* Step 1 — Basic Info */}
            {step === 1 && (
              <div style={st.formCard}>

                <div style={st.fieldGroup}>
                  <label style={st.label}>
                    Full name
                    <span style={{ color: ORANGE, marginLeft: 3 }}>*</span>
                  </label>
                  <input
                    style={st.input}
                    type="text"
                    placeholder="Your full name"
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    autoFocus
                  />
                </div>

                <div style={st.twoCol}>
                  <div style={st.fieldGroup}>
                    <label style={st.label}>Age</label>
                    <select style={st.input} value={form.age} onChange={e => set('age', e.target.value)}>
                      <option value="">Select age</option>
                      {Array.from({ length: 13 }, (_, i) => i + 13).map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div style={st.fieldGroup}>
                    <label style={st.label}>Grade / Year</label>
                    <select style={st.input} value={form.grade} onChange={e => set('grade', e.target.value)}>
                      <option value="">Select grade</option>
                      {['8th', '9th', '10th', '11th', '12th', 'College'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={st.fieldGroup}>
                  <label style={st.label}>Height</label>
                  <div style={st.twoCol}>
                    <select style={st.input} value={form.height_feet} onChange={e => set('height_feet', e.target.value)}>
                      <option value="">— ft</option>
                      {[4, 5, 6, 7].map(f => <option key={f} value={f}>{f} ft</option>)}
                    </select>
                    <select style={st.input} value={form.height_inches} onChange={e => set('height_inches', e.target.value)}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>{i} in</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={st.fieldGroup}>
                  <label style={st.label}>Weight (lbs)</label>
                  <input
                    style={st.input}
                    type="number"
                    placeholder="e.g. 175"
                    value={form.weight_lbs}
                    onChange={e => set('weight_lbs', e.target.value)}
                  />
                </div>

              </div>
            )}

            {/* Step 2 — Sport */}
            {step === 2 && (
              <SportGrid
                options={SPORTS}
                value={form.sport}
                onChange={v => { set('sport', v); set('position', '') }}
              />
            )}

            {/* Step 3 — Position */}
            {step === 3 && (
              <SelectCard
                options={getPositions(form.sport)}
                value={form.position}
                onChange={v => set('position', v)}
                layout="plain"
                minColWidth={form.sport === 'Wrestling' ? 78 : 120}
              />
            )}

            {/* Step 4 — Primary Goal */}
            {step === 4 && (
              <SelectCard
                options={[
                  { key: 'Strength and Power',           label: 'Strength & Power',             sub: 'Maximal force and explosiveness',     Icon: DumbbellIcon },
                  { key: 'Muscle Gain and Size',         label: 'Muscle Gain & Size',            sub: 'Build mass and fill out your frame',  Icon: BarChartIcon },
                  { key: 'Speed and Conditioning',       label: 'Speed & Conditioning',          sub: 'Faster, leaner, more athletic',       Icon: BoltIcon },
                  { key: 'General Athletic Performance', label: 'General Athletic Performance',  sub: 'Well-rounded sport readiness',        Icon: TrophyIcon },
                ]}
                value={form.primary_goal}
                onChange={v => set('primary_goal', v)}
                layout="row"
              />
            )}

            {/* Step 5 — Experience */}
            {step === 5 && (
              <SelectCard
                options={[
                  { key: 'Beginner',     label: 'Beginner',     sub: 'Less than 1 year of structured training', Icon: SeedlingIcon },
                  { key: 'Intermediate', label: 'Intermediate', sub: '1–3 years of consistent training',        Icon: FlameIcon },
                  { key: 'Advanced',     label: 'Advanced',     sub: '3+ years — you know what you\'re doing',  Icon: TrophyIcon },
                ]}
                value={form.experience_level}
                onChange={v => set('experience_level', v)}
                layout="row"
              />
            )}

            {/* Step 6 — Days per week */}
            {step === 6 && (
              <DayPicker
                value={form.days_per_week}
                onChange={v => set('days_per_week', v)}
              />
            )}

            {/* Step 7 — Equipment */}
            {step === 7 && (
              <SelectCard
                options={[
                  { key: 'Full',    label: 'Full Gym',    sub: 'Barbell rack, plates, cables, and machines — complete setup', Icon: BarbellIcon },
                  { key: 'Partial', label: 'Partial Gym', sub: 'Dumbbells, some machines, limited barbell access',            Icon: DumbbellIcon },
                  { key: 'Minimal', label: 'Minimal',     sub: 'Bands, light dumbbells, and bodyweight only',                 Icon: UserIcon },
                ]}
                value={form.equipment_tier}
                onChange={v => set('equipment_tier', v)}
                layout="row"
              />
            )}

            {/* Step 8 — Injury History */}
            {step === 8 && (
              <>
                <MultiCards
                  options={['Shoulder', 'Knee', 'Back', 'Hip', 'Ankle', 'None', 'Other']}
                  value={form.injury_areas}
                  onChange={v => set('injury_areas', v)}
                />
                {form.injury_areas.includes('Other') && (
                  <div style={{ marginTop: 18 }}>
                    <label style={st.label}>Describe the injury</label>
                    <input
                      style={st.input}
                      type="text"
                      placeholder="Brief description…"
                      value={form.injury_other}
                      onChange={e => set('injury_other', e.target.value)}
                    />
                  </div>
                )}
                <div style={{ marginTop: 24 }}>
                  <label style={st.label}>
                    Additional notes
                    <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 12, marginLeft: 6 }}>optional</span>
                  </label>
                  <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 10px', lineHeight: 1.55 }}>
                    Surgeries, hardware, movements that cause pain, or anything your coach should know.
                  </p>
                  <textarea
                    style={{ ...st.input, minHeight: 88, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                    placeholder="e.g. ACL surgery March 2024, still rebuilding quad strength. Avoid deep squats below parallel."
                    value={form.injury_notes}
                    onChange={e => set('injury_notes', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Step 9 — Weaknesses */}
            {step === 9 && (
              <MultiCards
                options={[
                  'Speed', 'Strength', 'Endurance', 'Explosiveness', 'Mobility',
                  'Upper body strength', 'Lower body strength', 'Core strength',
                  'Size and muscle mass', 'Overall conditioning',
                ]}
                value={form.weakness_areas}
                onChange={v => set('weakness_areas', v)}
              />
            )}

            {/* Step 10 — Goals */}
            {step === 10 && (
              <MultiCards
                options={[
                  'Gain weight', 'Lose weight', 'Get faster', 'Get stronger',
                  'Improve vertical', 'Build muscle', 'Stay healthy', 'Make varsity', 'Get recruited',
                ]}
                value={form.offseason_goals}
                onChange={v => set('offseason_goals', v)}
              />
            )}

          </div>{/* /step body */}

          {/* Error */}
          {error && (
            <div style={st.errorBox}>{error}</div>
          )}

          {/* ── Navigation ──────────────────────────────────────────────────── */}
          <div style={st.nav}>
            {step > 1 ? (
              <button style={st.backBtn} onClick={() => { setError(''); setStep(s => s - 1) }}>
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <button
                style={{
                  ...st.nextBtn,
                  opacity: canAdvance() ? 1 : 0.36,
                  cursor: canAdvance() ? 'pointer' : 'not-allowed',
                  boxShadow: canAdvance()
                    ? '0 2px 16px rgba(247,87,9,0.42), 0 1px 3px rgba(0,0,0,0.20)'
                    : 'none',
                }}
                onClick={() => { if (canAdvance()) { setError(''); setStep(s => s + 1); window.scrollTo(0, 0) } }}
                disabled={!canAdvance()}
              >
                Continue →
              </button>
            ) : (
              <button
                style={{ ...st.nextBtn, minWidth: 188 }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <span className="survey-spinner-sm" />
                    Saving…
                  </span>
                ) : 'Complete Profile →'}
              </button>
            )}
          </div>

        </div>{/* /container */}
      </div>{/* /scrollArea */}

    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = {
  // Shell
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
  },

  // Top bar
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    height: 56,
    background: 'rgba(15,15,15,0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  logo: {
    height: 26,
    display: 'block',
  },

  // Step pill (center of topbar)
  stepPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: '5px 14px',
  },
  stepPillName: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: 0.3,
  },
  stepPillDivider: {
    width: 1,
    height: 12,
    background: 'var(--border)',
    display: 'block',
  },
  stepPillCount: {
    fontSize: 12,
    fontWeight: 700,
    color: ORANGE,
    letterSpacing: 0.2,
  },

  skipBtn: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-3)',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    letterSpacing: 0.1,
  },

  // Progress (segmented dots)
  progressBar: {
    display: 'flex',
    gap: 3,
    padding: '0 28px',
    height: 34,
    alignItems: 'center',
    background: 'var(--bg)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },

  // Scrollable area
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
  },
  container: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '44px 28px 100px',
  },

  // Step header
  header: {
    marginBottom: 32,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 12,
    background: 'rgba(247,87,9,0.10)',
    border: '1px solid rgba(247,87,9,0.20)',
    padding: '3px 10px',
    borderRadius: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 800,
    color: 'var(--text)',
    margin: '0 0 10px',
    lineHeight: 1.18,
    letterSpacing: -0.6,
    fontFamily: "'Calibri', 'Trebuchet MS', 'Segoe UI', Helvetica, Arial, sans-serif",
  },
  desc: {
    fontSize: 15,
    color: 'var(--text-2)',
    margin: 0,
    lineHeight: 1.65,
    maxWidth: 500,
  },

  // Form card (step 1)
  formCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: '24px 24px 20px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  fieldGroup: {
    marginBottom: 4,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-2)',
    margin: '16px 0 7px',
    letterSpacing: 0.1,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    borderRadius: 10,
    border: '1.5px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    appearance: 'none',
    WebkitAppearance: 'none',
  },

  // Navigation
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 44,
    gap: 12,
  },
  backBtn: {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    border: '1.5px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-2)',
    cursor: 'pointer',
    letterSpacing: 0.1,
    transition: 'border-color 0.15s, color 0.15s',
  },
  nextBtn: {
    padding: '13px 32px',
    fontSize: 15,
    fontWeight: 800,
    borderRadius: 10,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: 0.15,
    minWidth: 148,
    transition: 'box-shadow 0.18s ease, opacity 0.15s ease',
  },

  // Error
  errorBox: {
    background: 'rgba(199,56,32,0.10)',
    border: '1px solid rgba(199,56,32,0.28)',
    color: '#ff6b4a',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    marginTop: 20,
    lineHeight: 1.55,
  },
}
