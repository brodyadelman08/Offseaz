import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  FlameIcon, BarChartIcon, DumbbellIcon, TrophyIcon,
  FootballIcon, BasketballIcon, BaseballIcon, SoftballIcon, SoccerIcon,
  HockeyIcon, RugbyIcon, TennisIcon, GolfIcon, WrestlingIcon, VolleyballIcon,
  RunningIcon, CrossCountryIcon, LacrosseIcon, SwimmingIcon, SportOtherIcon,
} from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const SPORT_ICONS = {
  football: FootballIcon, basketball: BasketballIcon, baseball: BaseballIcon,
  softball: SoftballIcon, soccer: SoccerIcon, hockey: HockeyIcon, rugby: RugbyIcon,
  tennis: TennisIcon, golf: GolfIcon, wrestling: WrestlingIcon, volleyball: VolleyballIcon,
  'track & field': RunningIcon, track: RunningIcon, 'cross country': CrossCountryIcon,
  cross_country: CrossCountryIcon, lacrosse: LacrosseIcon, swimming: SwimmingIcon,
}
function sportIcon(sport) {
  return SPORT_ICONS[(sport || '').toLowerCase()] || SportOtherIcon
}

const TABS = [
  {
    key: 'streak',
    label: 'Streak',
    Icon: FlameIcon,
    color: YELLOW,
    unit: 'd',
    statKey: 'streak_days',
    desc: 'Current consecutive days of logged sessions. Longest active streak wins.',
    info: 'Streaks grow when you log sessions (completed, partial, or injury). They reset after 36 hours of no activity. Taking a rest day? Log a Rest Day check-in to keep your streak alive.',
    infoLabel: 'How streaks work',
  },
  {
    key: 'completion_rate',
    label: 'Completion',
    Icon: BarChartIcon,
    color: BLUE,
    unit: '%',
    statKey: 'completion_rate',
    desc: "This week's completed sessions divided by scheduled sessions.",
    info: "This is the percentage of your scheduled sessions you completed this week. 100% means you did not miss a single session. Falling below 80% puts you in the building zone. Below 50% puts you at risk.",
    infoLabel: 'How this is calculated',
  },
  {
    key: 'sessions_total',
    label: 'Sessions',
    Icon: DumbbellIcon,
    color: ORANGE,
    unit: '',
    statKey: 'sessions_total',
    desc: 'Total sessions logged this entire offseason.',
    info: "This is your total sessions logged since you joined Offseaz this offseason. Every session counts regardless of completion status. Partial and injury logs both count.",
    infoLabel: 'What counts as a session',
  },
]

const MEDAL_COLORS = { 1: '#E8B923', 2: '#B9C0C7', 3: '#C87F3A' }
function medalColorFor(rank) {
  return MEDAL_COLORS[rank] || null
}

export default function Leaderboard() {
  const { profile } = useAuth()
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('streak')
  const [infoOpen,  setInfoOpen]  = useState(false)

  useEffect(() => {
    api.get('/api/leaderboard')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  function switchTab(key) {
    setActiveTab(key)
    setInfoOpen(false) // collapse info box whenever tab changes
  }

  const tab    = TABS.find(t => t.key === activeTab)
  const ranked = data?.[activeTab] || []

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>Leaderboard</h1>
        <p style={s.sub}>See how your team stacks up this offseason.</p>
      </div>

      {/* Tab switcher */}
      <div style={s.tabRow}>
        {TABS.map(t => (
          <button
            key={t.key}
            style={{
              ...s.tab,
              background: activeTab === t.key ? t.color : 'var(--card-inner)',
              color:      activeTab === t.key ? '#fff' : 'var(--text-2)',
              border:     `2px solid ${activeTab === t.key ? t.color : 'var(--border)'}`,
              boxShadow:  activeTab === t.key ? `0 2px 12px ${t.color}44` : 'none',
            }}
            onClick={() => switchTab(t.key)}
          >
            <t.Icon size={16} color={activeTab === t.key ? '#fff' : t.color} />
            <span style={s.tabLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Category description + info toggle */}
      <div style={s.descRow}>
        <p style={s.descText}>{tab.desc}</p>
        <button style={s.infoToggle} onClick={() => setInfoOpen(o => !o)}>
          {infoOpen ? '▲' : 'ⓘ'} {tab.infoLabel}
        </button>
      </div>
      {infoOpen && (
        <div style={s.infoBox}>
          {tab.info}
        </div>
      )}

      {loading ? (
        <div style={s.rows}>
          {[1,2,3,4].map(i => (
            <div key={i} style={s.skeletonRow}>
              <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              <div className="skeleton" style={{ flex: 1, height: 16, marginLeft: 12 }} />
              <div className="skeleton" style={{ width: 50, height: 22 }} />
            </div>
          ))}
        </div>
      ) : !data || ranked.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyTitle}>No data yet</p>
          <p style={s.emptySub}>Rankings appear once athletes start logging sessions.</p>
        </div>
      ) : (
        <div style={s.rows}>
          {ranked.map((a, idx) => {
            const rank    = idx + 1
            const isMe    = a.id === profile?.id
            const stat        = a[tab.statKey]
            const medalColor  = medalColorFor(rank)
            const SportIcon   = sportIcon(a.sport)
            const display = tab.unit === '%' ? `${stat}%` : tab.unit ? `${stat}${tab.unit}` : String(stat)

            return (
              <div
                key={a.id}
                style={{
                  ...s.row,
                  ...(isMe ? s.myRow : {}),
                  borderLeft: isMe ? `3px solid ${ORANGE}` : '3px solid transparent',
                }}
              >
                {/* Rank */}
                <div style={s.rankCell}>
                  {medalColor
                    ? <TrophyIcon size={22} color={medalColor} />
                    : <span style={{ ...s.rankNum, color: isMe ? ORANGE : 'var(--text-3)' }}>{rank}</span>
                  }
                </div>

                {/* Sport icon + name */}
                <span style={s.sportEmoji}><SportIcon size={20} /></span>
                <span style={{ ...s.athleteName, color: isMe ? ORANGE : 'var(--text)', fontWeight: isMe ? 700 : 600 }}>
                  {a.full_name}
                  {isMe && <span style={s.youBadge}> you</span>}
                </span>

                {/* Stat */}
                <div style={s.statCell}>
                  {activeTab === 'streak' && (
                    <span style={{ marginRight: 3, display: 'inline-flex' }}><FlameIcon size={13} color={YELLOW} /></span>
                  )}
                  {activeTab === 'completion_rate' && (
                    <div style={{ ...s.compBar, width: 40, marginRight: 6 }}>
                      <div style={{ ...s.compFill, width: `${Math.min(100, stat)}%` }} />
                    </div>
                  )}
                  <span style={{ ...s.statText, color: isMe ? tab.color : 'var(--text)' }}>
                    {display}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  container: { maxWidth: 640, margin: '0 auto' },
  header:    { marginBottom: 20 },
  title:     { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  sub:       { fontSize: 14, color: 'var(--text-2)', margin: 0 },

  tabRow: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tab: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '9px 16px', borderRadius: 22, cursor: 'pointer',
    fontSize: 13, fontWeight: 700, transition: 'all 0.15s', flex: 1, justifyContent: 'center',
  },
  tabLabel: {},

  descRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, marginBottom: 6,
  },
  descText: {
    fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.45, flex: 1,
  },
  infoToggle: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: YELLOW, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', padding: 0,
    flexShrink: 0,
  },
  infoBox: {
    background: 'rgba(240,190,36,0.08)',
    border: '1px solid rgba(240,190,36,0.2)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--text-2)',
    lineHeight: 1.55,
    marginBottom: 14,
  },

  rows: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '12px 16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
    transition: 'all 0.15s',
  },
  myRow: {
    background: 'rgba(247,87,9,0.06)',
    boxShadow: `0 0 0 1px rgba(247,87,9,0.20), 0 2px 12px rgba(247,87,9,0.12)`,
  },
  skeletonRow: {
    display: 'flex', alignItems: 'center', padding: '12px 16px',
    gap: 8, background: 'var(--card)', borderRadius: 14,
  },

  rankCell: { width: 32, display: 'flex', justifyContent: 'center', flexShrink: 0 },
  rankNum:  { fontSize: 16, fontWeight: 700 },
  sportEmoji: { fontSize: 20, flexShrink: 0 },
  athleteName: { flex: 1, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  youBadge: { fontSize: 10, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.5 },

  statCell: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  statText: { fontSize: 18, fontWeight: 700, minWidth: 44, textAlign: 'right' },

  compBar:  { height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' },
  compFill: { height: '100%', background: BLUE, borderRadius: 4, transition: 'width 0.4s' },

  empty:      { textAlign: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  emptySub:   { fontSize: 14, color: 'var(--text-3)' },
}
