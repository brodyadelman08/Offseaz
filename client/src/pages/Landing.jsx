import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  ArrowRightIcon, FlameIcon, HeartIcon, HeartFilledIcon, MessageIcon as ChatBubbleIcon,
  CalendarIcon, StatusInjuryIcon,
  FootballIcon, BasketballIcon, BaseballIcon, SoftballIcon, SoccerIcon, HockeyIcon,
  RugbyIcon, TennisIcon, GolfIcon, WrestlingIcon, VolleyballIcon, RunningIcon,
  CrossCountryIcon, LacrosseIcon,
} from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const LOGO   = '/Offseaz-Logo-White-Letter-Dark.png'

// ── Data ─────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    num: '01', color: ORANGE, tag: 'Assessment',
    title: 'Full Athlete Intake',
    body: 'Athletes complete a detailed needs-analysis survey covering goals, position, injury history, and available equipment.',
    Icon: ClipboardIcon,
  },
  {
    num: '02', color: BLUE, tag: 'Blueprint',
    title: 'Sport-Specific Programs',
    body: 'Periodized training plans with position-tailored templates, percentage-based loading, and week-by-week progression.',
    Icon: BlueprintIcon,
  },
  {
    num: '03', color: YELLOW, tag: 'Accountability',
    title: 'Live Workout Tracking',
    body: 'Athletes log every session with effort scores and notes. Coaches see real-time completion rates and injury flags at a glance.',
    Icon: CheckCircleIcon,
  },
  {
    num: '04', color: BLUE, tag: 'Coach Connect',
    title: 'Coach–Athlete Messaging',
    body: 'Send team announcements or direct messages — answer questions, give feedback, and stay connected all offseason.',
    Icon: MessageIcon,
  },
]

const NAV_IDS = ['coaches', 'athletes', 'program', 'how-it-works', 'story']

const SPORTS = [
  { Icon: FootballIcon,     name: 'Football'      },
  { Icon: BasketballIcon,   name: 'Basketball'    },
  { Icon: BaseballIcon,     name: 'Baseball'      },
  { Icon: SoftballIcon,     name: 'Softball'      },
  { Icon: SoccerIcon,       name: 'Soccer'        },
  { Icon: HockeyIcon,       name: 'Hockey'        },
  { Icon: RugbyIcon,        name: 'Rugby'         },
  { Icon: TennisIcon,       name: 'Tennis'        },
  { Icon: GolfIcon,         name: 'Golf'          },
  { Icon: WrestlingIcon,    name: 'Wrestling'     },
  { Icon: VolleyballIcon,   name: 'Volleyball'    },
  { Icon: RunningIcon,      name: 'Track & Field' },
  { Icon: CrossCountryIcon, name: 'Cross Country' },
  { Icon: LacrosseIcon,     name: 'Lacrosse'      },
]

// ── Icons ─────────────────────────────────────────────────────────────────────

function ClipboardIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )
}

function BlueprintIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
    </svg>
  )
}

function CheckCircleIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function MessageIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}


// ── Dual-panel hero mockup ─────────────────────────────────────────────────────

function DualDashboardMockup() {
  return (
    <div style={mk.shell}>
      <div style={mk.chrome}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'block' }} />
          ))}
        </div>
        <div style={mk.urlBar}>offseaz.app / dashboard</div>
        <div style={{ width: 54 }} />
      </div>

      <div style={mk.body}>
        {/* LEFT: Coach */}
        <div style={mk.panel}>
          <div style={{ ...mk.tab, borderBottom: `2px solid ${ORANGE}` }}>
            <div style={{ ...mk.tabDot, background: ORANGE }} />
            <span style={{ ...mk.tabLabel, color: ORANGE }}>Coach View</span>
          </div>
          <div style={mk.panelMain}>
            <div style={mk.statsRow}>
              {[{ v: '18', l: 'Athletes', c: ORANGE }, { v: '84%', l: 'Avg Rate', c: BLUE }, { v: '3', l: 'Flagged', c: YELLOW }].map((s, i) => (
                <div key={i} style={mk.miniStat}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</span>
                  <span style={{ fontSize: 7, color: '#444' }}>{s.l}</span>
                </div>
              ))}
            </div>
            <div style={mk.sectionTag}>ROSTER ACCOUNTABILITY</div>
            {[
              { name: 'J. Smith',  pct: 92,  streak: 8,  c: ORANGE, ok: true  },
              { name: 'M. Davis',  pct: 100, streak: 12, c: BLUE,   ok: true  },
              { name: 'K. Jones',  pct: 58,  streak: 0,  c: YELLOW, ok: false },
              { name: 'T. Brown',  pct: 83,  streak: 5,  c: ORANGE, ok: true  },
              { name: 'A. Wilson', pct: 75,  streak: 3,  c: BLUE,   ok: true  },
            ].map((a, i) => (
              <div key={i} style={mk.athleteRow}>
                <div style={{ ...mk.ava, background: a.c + '28', border: `1px solid ${a.c}44` }}>
                  <span style={{ fontSize: 7, color: a.c, fontWeight: 700 }}>{a.name[0]}{a.name.split(' ')[1][0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#DDD' }}>{a.name}</span>
                    <span style={{ fontSize: 7, fontWeight: 800, color: a.ok ? a.c : '#666' }}>{a.pct}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: '#1E1E1E', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${a.pct}%`, background: a.c + 'AA', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  {a.streak > 0
                    ? <><FlameIcon size={8} color={ORANGE} /><span style={{ fontSize: 7, color: YELLOW, fontWeight: 700 }}>{a.streak}</span></>
                    : <StatusInjuryIcon size={8} color="#c73820" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1E1E1E', width: 1, flexShrink: 0 }} />

        {/* RIGHT: Athlete */}
        <div style={mk.panel}>
          <div style={{ ...mk.tab, borderBottom: `2px solid ${BLUE}` }}>
            <div style={{ ...mk.tabDot, background: BLUE }} />
            <span style={{ ...mk.tabLabel, color: BLUE }}>Athlete View</span>
          </div>
          <div style={mk.panelMain}>
            <div style={mk.blueprintHeader}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 700, color: BLUE, letterSpacing: 0.8, marginBottom: 2 }}>WEEK 4 OF 8</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#E8E8E8' }}>Strength Block</div>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[1,2,3,4,5,6,7,8].map(w => (
                  <div key={w} style={{ width: 6, height: 6, borderRadius: 1, background: w <= 4 ? BLUE + 'BB' : '#1E1E1E' }} />
                ))}
              </div>
            </div>
            <div style={mk.sectionTag}>MONDAY — LOWER BODY</div>
            {[
              { ex: 'Back Squat',            sets: '4×5', pct: '75%', lbs: '225 lbs' },
              { ex: 'Romanian Deadlift',     sets: '3×8', pct: '65%', lbs: '185 lbs' },
              { ex: 'Bulgarian Split Squat', sets: '3×6', pct: '60%', lbs: '80 lbs'  },
            ].map((w, i) => (
              <div key={i} style={mk.workoutCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#DDD' }}>{w.ex}</span>
                  <span style={{ fontSize: 7, fontWeight: 800, color: BLUE, background: BLUE + '18', border: `1px solid ${BLUE}33`, padding: '2px 5px', borderRadius: 6 }}>{w.pct}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 7, color: '#555' }}>{w.sets}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, color: ORANGE }}>{w.lbs}</span>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0D1A0D', border: '1px solid #1A3A1A', borderRadius: 7, padding: '6px 10px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#28C840' }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: '#28C840' }}>Log Workout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const mk = {
  shell: {
    background: '#111', border: '1px solid #252525', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)',
    width: '100%', maxWidth: 820,
  },
  chrome: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 16px', background: '#0A0A0A', borderBottom: '1px solid #1C1C1C',
  },
  urlBar: {
    fontSize: 9, color: '#3A3A3A', fontFamily: 'monospace',
    background: '#161616', border: '1px solid #222', borderRadius: 5, padding: '3px 12px',
  },
  body:    { display: 'flex', overflow: 'hidden' },
  panel:   { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  tab:     { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#0F0F0F' },
  tabDot:  { width: 7, height: 7, borderRadius: '50%' },
  tabLabel:{ fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  panelMain: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  statsRow:  { display: 'flex', gap: 5 },
  miniStat: {
    flex: 1, background: '#1A1A1A', border: '1px solid #222', borderRadius: 7, padding: '6px 8px',
    display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
  },
  sectionTag: {
    fontSize: 7, fontWeight: 700, letterSpacing: 1.2, color: '#444',
    textTransform: 'uppercase', paddingBottom: 4, borderBottom: '1px solid #1A1A1A',
  },
  athleteRow: { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' },
  ava: {
    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  blueprintHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    background: '#171717', border: '1px solid #222', borderRadius: 8, padding: '7px 9px',
  },
  workoutCard: { background: '#171717', border: '1px solid #222', borderRadius: 8, padding: '7px 9px' },
}

// ── Coach Roster Mockup ───────────────────────────────────────────────────────

function CoachRosterMockup() {
  const athletes = [
    { name: 'Jake R.',   pos: 'QB', pct: 100, streak: 12, c: ORANGE, flag: false },
    { name: 'Marcus D.', pos: 'WR', pct: 92,  streak: 8,  c: BLUE,   flag: false },
    { name: 'Tyler B.',  pos: 'LB', pct: 67,  streak: 2,  c: YELLOW, flag: false },
    { name: 'Kevin J.',  pos: 'OL', pct: 33,  streak: 0,  c: '#888', flag: true  },
    { name: 'Caleb M.',  pos: 'DB', pct: 83,  streak: 5,  c: ORANGE, flag: false },
    { name: 'Derek S.',  pos: 'TE', pct: 75,  streak: 4,  c: BLUE,   flag: false },
  ]
  return (
    <div style={cr.shell}>
      <div style={cr.chrome}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'block' }} />
          ))}
        </div>
        <div style={cr.urlBar}>offseaz.app / coach / roster</div>
        <div style={{ width: 54 }} />
      </div>
      <div style={cr.body}>
        <div style={cr.summaryRow}>
          {[
            { v: '18',  l: 'Athletes', c: ORANGE    },
            { v: '84%', l: 'Avg Rate', c: BLUE      },
            { v: '11',  l: 'Streaks',  c: YELLOW    },
            { v: '1',   l: 'Injured',  c: '#c73820' },
          ].map((s, i) => (
            <div key={i} style={cr.statBox}>
              <span style={{ fontSize: 18, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</span>
              <span style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{s.l}</span>
            </div>
          ))}
        </div>
        <div style={cr.label}>ROSTER ACCOUNTABILITY — THIS WEEK</div>
        {athletes.map((a, i) => (
          <div key={i} style={{ ...cr.row, background: a.flag ? 'rgba(199,56,32,0.05)' : '#181818', borderColor: a.flag ? 'rgba(199,56,32,0.22)' : '#232323' }}>
            <div style={{ ...cr.ava, background: a.c + '22', border: `1px solid ${a.c}44` }}>
              <span style={{ fontSize: 9, color: a.c, fontWeight: 800 }}>{a.name[0]}{a.name.split(' ')[1][0]}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#DDD' }}>{a.name}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: a.pct >= 80 ? a.c : a.pct >= 50 ? YELLOW : '#c73820' }}>{a.pct}%</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#111', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${a.pct}%`, background: (a.pct >= 80 ? a.c : a.pct >= 50 ? YELLOW : '#c73820') + 'BB', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>{a.pos}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
              {a.flag
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, background: 'rgba(199,56,32,0.15)', color: '#c73820', fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(199,56,32,0.35)', whiteSpace: 'nowrap' }}><StatusInjuryIcon size={11} color="#c73820" /> Injury</span>
                : a.streak > 0
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><FlameIcon size={12} color={ORANGE} /><span style={{ fontSize: 10, color: YELLOW, fontWeight: 700 }}>{a.streak}</span></span>
                  : <span style={{ fontSize: 10, color: '#444' }}>–</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const cr = {
  shell: {
    background: '#111', border: '1px solid #252525', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 32px 64px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04)',
    width: '100%', maxWidth: 560,
  },
  chrome: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 16px', background: '#0A0A0A', borderBottom: '1px solid #1C1C1C',
  },
  urlBar: {
    fontSize: 9, color: '#3A3A3A', fontFamily: 'monospace',
    background: '#161616', border: '1px solid #222', borderRadius: 5, padding: '3px 12px',
  },
  body:       { padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  summaryRow: { display: 'flex', gap: 8, marginBottom: 4 },
  statBox: {
    flex: 1, background: '#1A1A1A', border: '1px solid #222', borderRadius: 10,
    padding: '10px 8px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  label: {
    fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3A3A3A',
    textTransform: 'uppercase', paddingBottom: 8, borderBottom: '1px solid #1A1A1A',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 10, border: '1px solid #232323',
  },
  ava: {
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}

// ── Team Feed Mockup ──────────────────────────────────────────────────────────

function FeedMockup() {
  const posts = [
    { initials: 'JR', name: 'Jake R.',   time: '2h ago', text: 'Squatted 315 for 5 today. New PR this offseason 💪', c: ORANGE, likes: 7,  comments: 3, liked: true  },
    { initials: 'MD', name: 'Marcus D.', time: '4h ago', text: 'Week 6 check-in. Logged every session so far.',         c: BLUE,   likes: 4,  comments: 1, liked: false },
    { initials: 'KW', name: 'Kayla W.',  time: '6h ago', text: 'Morning conditioning done. 6am grind 🔥',              c: YELLOW, likes: 11, comments: 5, liked: false },
  ]
  return (
    <div style={fd.shell}>
      <div style={fd.chrome}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'block' }} />
          ))}
        </div>
        <div style={fd.urlBar}>offseaz.app / feed</div>
        <div style={{ width: 54 }} />
      </div>
      <div style={fd.body}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#E8E8E8' }}>Team Feed</span>
          <span style={{ fontSize: 11, color: '#444' }}>What the team is up to</span>
        </div>
        {posts.map((p, i) => (
          <div key={i} style={fd.card}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{ ...fd.ava, background: p.c + '28', border: `1px solid ${p.c}44` }}>
                <span style={{ fontSize: 9, color: p.c, fontWeight: 800 }}>{p.initials}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#DDD' }}>{p.name}</div>
                <div style={{ fontSize: 9, color: '#444' }}>{p.time}</div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#888', lineHeight: 1.55, margin: '0 0 8px' }}>{p.text}</p>
            <div style={{ display: 'flex', gap: 14, paddingTop: 6, borderTop: '1px solid #1E1E1E' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: p.liked ? ORANGE : '#444' }}>
                {p.liked ? <HeartFilledIcon size={11} color={ORANGE} /> : <HeartIcon size={11} color="#444" />}
                <span style={{ fontSize: 10, fontWeight: 700 }}>{p.likes}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#444' }}>
                <ChatBubbleIcon size={11} color="#444" />
                <span style={{ fontSize: 10, fontWeight: 700 }}>{p.comments}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const fd = {
  shell: {
    background: '#111', border: '1px solid #252525', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 32px 64px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04)',
    width: '100%', maxWidth: 400,
  },
  chrome: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 16px', background: '#0A0A0A', borderBottom: '1px solid #1C1C1C',
  },
  urlBar: {
    fontSize: 9, color: '#3A3A3A', fontFamily: 'monospace',
    background: '#161616', border: '1px solid #222', borderRadius: 5, padding: '3px 12px',
  },
  body: { padding: '14px 14px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#1A1A1A', border: '1px solid #232323', borderRadius: 12, padding: '12px' },
  ava: {
    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}

// ── Landing page ──────────────────────────────────────────────────────────────

export default function Landing() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [betaDismissed, setBetaDismissed] = useState(
    () => localStorage.getItem('offseaz_beta_dismissed_v1') === '1'
  )
  const [activeId, setActiveId] = useState('')

  const bannerRef = useRef(null)
  const [bannerH, setBannerH] = useState(40)

  useLayoutEffect(() => {
    if (bannerRef.current) setBannerH(bannerRef.current.offsetHeight)
  }, [betaDismissed])

  function scrollToSection(id) {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 114 + (betaDismissed ? 0 : bannerH)
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  useEffect(() => {
    if (loading) return
    if (session && profile) {
      navigate(profile.role === 'coach' ? '/coach' : '/athlete', { replace: true })
    }
  }, [loading, session, profile, navigate])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 1)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Track which section is in the viewport as the user scrolls
  useEffect(() => {
    function updateActive() {
      let current = ''
      for (const id of NAV_IDS) {
        const el = document.getElementById(id)
        if (!el) continue
        // Section top has passed the anchor nav height (≈114px) — it's active
        if (el.getBoundingClientRect().top <= 130) current = id
      }
      setActiveId(current)
    }
    window.addEventListener('scroll', updateActive, { passive: true })
    updateActive()
    return () => window.removeEventListener('scroll', updateActive)
  }, [])

  // Scroll only the nav's horizontal scroller to keep the active tab visible on mobile.
  // Never call scrollIntoView here — it triggers vertical page scroll on sticky elements.
  useEffect(() => {
    if (!activeId) return
    const btn = document.querySelector(`[data-navid="${activeId}"]`)
    if (!btn) return
    const scroller = btn.parentElement?.parentElement // anchorNavInner → anchorNav
    if (!scroller) return
    const scrollLeft = btn.offsetLeft - (scroller.offsetWidth - btn.offsetWidth) / 2
    scroller.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' })
  }, [activeId])

  return (
    <div style={s.root}>
      <style>{`
        .lp-card  { transition: border-color 0.2s ease; }
        .lp-card:hover  { border-color: #F75709 !important; }
        .lp-sport { transition: border-color 0.2s ease; }
        .lp-sport:hover { border-color: #F75709 !important; }
      `}</style>

      {/* ── Beta banner ──────────────────────────────────────────────────────── */}
      {!betaDismissed && (
        <div ref={bannerRef} style={s.betaBanner}>
          <p style={s.betaText}>
            <span style={s.betaBadge}>BETA</span>
            Offseaz is currently in free beta — features are actively being developed based on coach and athlete feedback.{' '}
            <span style={{ color: YELLOW, fontWeight: 600 }}>A paid version with additional features is coming soon.</span>
          </p>
          <button
            style={s.betaClose}
            onClick={() => { setBetaDismissed(true); localStorage.setItem('offseaz_beta_dismissed_v1', '1') }}
            aria-label="Dismiss"
          >✕</button>
        </div>
      )}

      {/* Banner spacer — preserves layout space while banner is fixed/out-of-flow */}
      <div style={{ height: betaDismissed ? 0 : bannerH, transition: 'height 0.22s ease', overflow: 'hidden' }} />

      {/* ── Fixed nav (fades in on scroll) ──────────────────────────────────── */}
      <nav style={{ ...s.nav, top: betaDismissed ? 0 : bannerH, boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.4)' : 'none' }}>
        <img src={LOGO} alt="Offseaz" style={{ height: 32, display: 'block' }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/login" style={s.navLink}>Sign In</Link>
          <Link to="/register" style={s.navCta}>Get Started</Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={s.hero}>
        <div style={s.heroGlow} />
        <div style={s.heroInner}>

          <img src={LOGO} alt="Offseaz" style={s.heroLogo} />

          <div style={s.heroBadge}>
            <span style={s.heroBadgeDot} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: ORANGE, textTransform: 'uppercase' }}>
              Offseason Training Platform
            </span>
          </div>

          <h1 style={s.headline}>
            The Weight Room<br />
            <span style={s.headlineOrange}>in an App.</span>
          </h1>

          <p style={s.heroSub}>
            Sport-specific blueprints. Real accountability. Built for coaches
            and athletes who take the offseason seriously.
          </p>

          <div style={s.heroCtas}>
            <Link to="/register" style={s.btnOrange}>Get Started as Coach</Link>
            <Link to="/register" style={s.btnBlue}>Get Started as Athlete</Link>
          </div>

          <p style={{ fontSize: 12, color: '#444', letterSpacing: 0.3, marginBottom: 52 }}>
            Free to start · No credit card required
          </p>

          <div style={{ width: 1, height: 44, background: 'linear-gradient(to bottom, rgba(247,87,9,0.5), transparent)' }} />

          <div style={s.mockupWrap}>
            <div style={s.mockupGlow} />
            <DualDashboardMockup />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STICKY ANCHOR NAV
      ══════════════════════════════════════════════════════════════════════ */}
      <nav style={{ ...s.anchorNav, top: (betaDismissed ? 0 : bannerH) + 64 }}>
        <div style={s.anchorNavInner}>
          {[
            { id: 'coaches',      label: 'For Coaches'  },
            { id: 'athletes',     label: 'For Athletes' },
            { id: 'program',      label: 'The Program'  },
            { id: 'how-it-works', label: 'How It Works' },
            { id: 'story',        label: 'Our Story'    },
          ].map(({ id, label }) => {
            const isActive = activeId === id
            return (
              <button
                key={id}
                data-navid={id}
                style={{
                  ...s.anchorLink,
                  color: isActive ? ORANGE : 'rgba(255,255,255,0.55)',
                  borderBottomColor: isActive ? ORANGE : 'transparent',
                  fontWeight: isActive ? 700 : 600,
                }}
                onClick={() => scrollToSection(id)}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = ORANGE
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          FOR COACHES
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="coaches" style={{ ...s.section, background: '#0D0D0D', borderTop: '1px solid #181818' }}>
        <div style={s.inner}>

          <div style={s.sectionHead}>
            <span style={s.eyebrow}>For Coaches</span>
            <h2 style={s.h2}>The Offseason Is No Longer a Black Box</h2>
            <p style={s.lead}>
              Real-time visibility into who is logging, who is skipping, and who flagged an injury — across your entire roster.
            </p>
          </div>

          <div style={s.mockupCenter}>
            <div style={s.coachGlow} />
            <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
              <CoachRosterMockup />
            </div>
          </div>

          <div style={s.threeGrid}>
            {[
              { color: ORANGE, title: 'Real-Time Roster Visibility',       body: 'See every athlete\'s completion rate, streak, and session logs the moment they submit. Know exactly who is working — every single day.' },
              { color: BLUE,   title: 'Injury Flags Surface Instantly',     body: 'When an athlete flags an injury during logging, it appears immediately on your accountability dashboard.' },
              { color: YELLOW, title: 'Auto-Generated Weekly Reports',      body: 'See who trained, who skipped, and who improved — with the data to have accountability conversations that change behavior.' },
            ].map((item, i) => (
              <div key={i} data-card="" style={{ ...s.card, borderTop: `2px solid ${item.color}` }}>
                <h3 style={s.cardTitle}>{item.title}</h3>
                <p style={s.cardBody}>{item.body}</p>
              </div>
            ))}
          </div>

          <div style={s.sectionCta}>
            <Link to="/register" style={s.btnOrange}>Get Started as Coach</Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOR ATHLETES
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="athletes" style={{ ...s.section, borderTop: '1px solid #181818' }}>
        <div style={s.inner}>

          <div style={s.sectionHead}>
            <span style={s.eyebrow}>For Athletes</span>
            <h2 style={s.h2}>Your Plan. Your Weights. Your Progress.</h2>
            <p style={s.lead}>
              A personalized blueprint built for your sport and position, with exact weights
              auto-calculated from your logged maxes. No guesswork. Just lift.
            </p>
          </div>

          <div style={s.threeGrid}>
            {[
              { num: '01', color: ORANGE, title: 'Complete the Needs Analysis',          body: 'Fill out a detailed intake survey: sport, position, goals, experience level, available equipment, and injury history.' },
              { num: '02', color: BLUE,   title: 'Get a Personalized Blueprint',         body: 'Offseaz builds your program from your answers. Weights are auto-calculated from your logged one-rep maxes — no math required.' },
              { num: '03', color: YELLOW, title: 'Track Streaks and Progress',           body: 'Log every session, build your streak, and watch your PRs climb. Your coach sees every rep. Teammates see your work on the feed.' },
            ].map((step, i) => (
              <div key={i} data-card="" style={{ ...s.card, borderTop: `2px solid ${step.color}` }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: step.color, display: 'block', lineHeight: 1, marginBottom: 16, letterSpacing: '-0.04em', fontFamily: "'Manrope', 'Inter', sans-serif" }}>{step.num}</span>
                <h3 style={s.cardTitle}>{step.title}</h3>
                <p style={s.cardBody}>{step.body}</p>
              </div>
            ))}
          </div>

          <div style={{ ...s.mockupCenter, margin: '56px auto 64px' }}>
            <div style={s.athleteGlow} />
            <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
              <FeedMockup />
            </div>
          </div>

          <div style={s.threeGrid}>
            {[
              { color: BLUE,   title: 'Built for Your Sport and Position',    body: 'Every program is tailored to your sport, position, goals, and equipment — not a generic one-size-fits-all plan.' },
              { color: ORANGE, title: 'Log Workouts from Anywhere',           body: 'Log every session from your phone. Effort scores, notes, and performance data all go straight to your coach.' },
              { color: YELLOW, title: 'Build a Documented Training History',  body: 'Every logged session is permanently recorded. Your coach can see your full offseason history at any time.' },
            ].map((item, i) => (
              <div key={i} data-card="" style={{ ...s.card, borderTop: `2px solid ${item.color}` }}>
                <h3 style={s.cardTitle}>{item.title}</h3>
                <p style={s.cardBody}>{item.body}</p>
              </div>
            ))}
          </div>

          <div style={s.sectionCta}>
            <Link to="/register" style={s.btnBlue}>Get Started as Athlete</Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          THE PROGRAM
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="program" style={{ ...s.section, background: '#0D0D0D', borderTop: '1px solid #181818' }}>
        <div style={s.inner}>

          <div style={s.sectionHead}>
            <span style={s.eyebrow}>The Program</span>
            <h2 style={s.h2}>Four Pillars. One Platform.</h2>
            <p style={s.lead}>
              Everything a coach needs to run an elite offseason program — and everything an athlete needs to execute one.
            </p>
          </div>

          <div style={s.fourGrid}>
            {PILLARS.map(p => (
              <div key={p.num} className="lp-card" style={s.card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: p.color + '18', border: `1px solid ${p.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p.Icon size={20} color={p.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: p.color + '44', letterSpacing: 0.5 }}>{p.num}</span>
                </div>
                <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: p.color, textTransform: 'uppercase', marginBottom: 8 }}>{p.tag}</span>
                <h3 style={s.cardTitle}>{p.title}</h3>
                <p style={s.cardBody}>{p.body}</p>
              </div>
            ))}
          </div>

          <div style={s.divider} />

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={s.eyebrow}>Sport-Specific Training</span>
            <h3 style={{ ...s.h2, fontSize: 'clamp(24px, 3.5vw, 40px)', marginBottom: 0 }}>Built for 14 Sports</h3>
          </div>

          <div style={s.sportGrid}>
            {SPORTS.map((sport, i) => (
              <div key={i} className="lp-sport" style={s.sportChip}>
                <sport.Icon size={28} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#666', textAlign: 'center', lineHeight: 1.3 }}>{sport.name}</span>
              </div>
            ))}
          </div>

          <div style={s.programNote}>
            <span style={{ flexShrink: 0 }}><CalendarIcon size={16} color={ORANGE} /></span>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: '#BBB', fontWeight: 700 }}>16-Week Periodized Structure — </strong>
              every program follows a full 16-week offseason arc with progressive overload built in from week one to week sixteen.
            </p>
          </div>

          <div style={s.statsGrid}>
            {[
              { value: '14',    label: 'Sports Supported',                color: ORANGE },
              { value: '16 Wk', label: 'Programs',                        color: BLUE   },
              { value: '80+',   label: 'Exercises Explained',             color: YELLOW },
              { value: '%',     label: 'Weights Calculated Automatically', color: ORANGE },
            ].map((stat, i) => (
              <div key={i} className="lp-stat" style={{ ...s.statItem, borderTop: `2px solid ${stat.color}` }}>
                <span style={{ fontSize: 'clamp(36px,5vw,54px)', fontWeight: 900, color: stat.color, lineHeight: 1, letterSpacing: '-0.03em', fontFamily: "'Manrope','Inter',sans-serif" }}>{stat.value}</span>
                <span style={{ fontSize: 13, color: '#555', fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ ...s.section, borderTop: '1px solid #181818' }}>
        <div style={s.inner}>

          <div style={s.sectionHead}>
            <span style={s.eyebrow}>How It Works</span>
            <h2 style={s.h2}>Up and Running in Three Steps</h2>
          </div>

          <div style={s.threeGrid}>
            {[
              { num: '01', color: ORANGE, title: 'Coach Creates a Team and Builds a Sport-Specific Blueprint',           body: 'Sign up, create your team, and build a training program using the blueprint builder. Your program is ready to assign before a single athlete joins.' },
              { num: '02', color: BLUE,   title: 'Athletes and Assistant Coaches Join With Their Invite Code',           body: 'Athletes join, complete the needs analysis, and immediately receive a personalized program with exact weights calculated from their logged maxes.' },
              { num: '03', color: YELLOW, title: 'Everyone Trains, Logs Workouts, and the Coach Sees Everything',       body: 'Athletes log every session from their phone. Coaches see real-time compliance, flag injuries, send messages, and track progress across the roster all offseason.' },
            ].map((step, i) => (
              <div key={i} data-card="" style={{ ...s.card, borderTop: `2px solid ${step.color}` }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: step.color, display: 'block', lineHeight: 1, marginBottom: 16, letterSpacing: '-0.04em', fontFamily: "'Manrope', 'Inter', sans-serif" }}>{step.num}</span>
                <h3 style={s.cardTitle}>{step.title}</h3>
                <p style={s.cardBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          OUR STORY
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="story" style={{ ...s.section, background: '#0D0D0D', borderTop: '1px solid #181818' }}>
        <div style={s.inner}>
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <span style={s.eyebrow}>Our Story</span>
            <h2 style={s.h2}>Built by an Athlete. For Athletes.</h2>
            <p style={{ fontSize: 17, color: '#666', lineHeight: 1.85, marginBottom: 16 }}>
              Offseaz was built by Brody Adelman — a multi-sport varsity athlete who watched firsthand
              how unstructured and unaccountable offseason training was for most high school athletes.
            </p>
            <p style={{ fontSize: 17, color: '#555', lineHeight: 1.85, marginBottom: 16 }}>
              No plan. No visibility. No accountability. He built the platform he wished he had.
            </p>
            <p style={{ fontSize: 17, color: '#555', lineHeight: 1.85, marginBottom: 44 }}>
              Today, Brody is a preferred walk-on for the <span style={{ fontWeight: 700, color: '#4B2D83' }}>University of St. Thomas</span> baseball program,
              a Division I program competing in the Summit League.
            </p>
            <Link to="/about" style={s.storyLink}>
              Read the full story <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={s.ctaSection}>
        <div style={s.ctaGlow} />
        <div style={{ ...s.inner, position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <span style={s.eyebrow}>Get Started Today</span>
          <h2 style={s.ctaH2}>
            Your offseason determines<br />
            <span style={{ color: ORANGE }}>your next season.</span>
          </h2>
          <p style={{ fontSize: 17, color: '#666', lineHeight: 1.75, maxWidth: 520, margin: '0 auto 44px' }}>
            Join coaches and athletes turning the offseason into their biggest competitive advantage.
            Free to start. No credit card required.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <Link to="/register" style={s.btnOrange}>Get Started as Coach</Link>
            <Link to="/register" style={s.btnBlue}>Get Started as Athlete</Link>
          </div>
          <p style={{ fontSize: 14, color: '#444' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer style={s.footer}>
        <div style={{ textAlign: 'center' }}>
          <img src={LOGO} alt="Offseaz" className="logo-footer" style={{ margin: '0 auto 14px' }} />
          <p style={{ fontSize: 13, color: '#EEE', margin: '0 0 20px' }}>
            Built for coaches and athletes who take the offseason seriously.
          </p>
          <div style={s.footerLinks}>
            {[
              ['/about',         'About'             ],
              ['/contact',       'Contact'           ],
              ['/privacy',       'Privacy Policy'    ],
              ['/terms',         'Terms & Conditions'],
              ['/refund',        'Refund Policy'     ],
              ['/accessibility', 'Accessibility'     ],
            ].map(([to, label], i, arr) => (
              <span key={to} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Link to={to} style={{ fontSize: 13, color: BLUE, textDecoration: 'none', fontWeight: 500 }}>{label}</Link>
                {i < arr.length - 1 && <span style={{ fontSize: 13, color: YELLOW }}>·</span>}
              </span>
            ))}
          </div>
          <div style={s.footerSocials}>
            {[
              { href: 'https://x.com/Offseaz',        label: '@Offseaz',  color: '#fff',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
              { href: 'https://instagram.com/0ffseaz', label: '@0ffseaz',  color: ORANGE,   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1" fill={ORANGE} stroke="none"/></svg> },
              { href: 'https://facebook.com/Offseaz',  label: 'Offseaz',   color: BLUE,     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill={BLUE}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
              { href: 'https://tiktok.com/@0ffseaz',   label: '@0ffseaz',  color: YELLOW,   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill={YELLOW}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.35 6.35 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.15a8.24 8.24 0 004.83 1.55V7.28a4.85 4.85 0 01-1.06-.59z"/></svg> },
            ].map(({ href, label, color, icon }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600, color, opacity: 0.8 }}>
                {icon}<span>{label}</span>
              </a>
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
            <a href="mailto:brody@offseaz.com" style={{ color: BLUE, textDecoration: 'none', fontWeight: 500 }}>brody@offseaz.com</a>
          </p>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>© {new Date().getFullYear()} Offseaz. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  root: {
    background: '#0A0A0A', color: '#EFEFEF',
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    overflowX: 'hidden',
  },

  // Beta banner
  betaBanner: {
    boxSizing: 'border-box', overflow: 'hidden',
    background: '#111', borderBottom: '1px solid rgba(247,87,9,0.22)',
    padding: '9px clamp(16px,4vw,40px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    position: 'fixed', left: 0, right: 0, top: 0, zIndex: 300,
  },
  betaText: {
    fontSize: 13, color: '#AAA', lineHeight: 1.5, textAlign: 'center',
    flex: 1, minWidth: 0, margin: 0,
    wordBreak: 'break-word', overflowWrap: 'break-word',
  },
  betaBadge: {
    display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: 1,
    color: ORANGE, background: 'rgba(247,87,9,0.15)', border: '1px solid rgba(247,87,9,0.35)',
    padding: '2px 7px', borderRadius: 4, marginRight: 8, verticalAlign: 'middle',
  },
  betaClose: {
    flexShrink: 0, background: 'transparent', border: 'none', color: '#555',
    fontSize: 14, cursor: 'pointer', padding: '8px 10px', borderRadius: 6,
    minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Fixed nav
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px,5vw,56px)',
    background: 'rgba(10,10,10,0.94)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    transition: 'top 0.22s ease, box-shadow 0.22s ease',
  },
  navLink: { color: '#888', fontWeight: 500, fontSize: 14, textDecoration: 'none', padding: '8px 14px', borderRadius: 8 },
  navCta: {
    display: 'inline-flex', alignItems: 'center', color: '#fff', fontWeight: 700, fontSize: 14,
    textDecoration: 'none', padding: '9px 20px', borderRadius: 9,
    background: ORANGE, boxShadow: '0 2px 14px rgba(247,87,9,0.32)',
  },

  // Anchor nav — centered on desktop, horizontally scrollable on mobile
  anchorNav: {
    position: 'sticky', top: 0, zIndex: 90,
    background: 'rgba(10,10,10,0.97)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', justifyContent: 'center',
    overflowX: 'auto', WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none', msOverflowStyle: 'none',
  },
  anchorNavInner: {
    // flex-shrink:0 means this won't compress below content width;
    // on desktop (<content width) it stays centered via the parent justify-content;
    // on mobile (>viewport width) parent overflows and becomes scrollable
    display: 'flex', flexShrink: 0, alignItems: 'stretch',
    padding: '0 clamp(8px,3vw,24px)',
  },
  anchorLink: {
    flexShrink: 0, background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent', // active tab overrides this color
    color: YELLOW,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    padding: '0 clamp(12px,2.5vw,20px)', minHeight: 48,
    display: 'flex', alignItems: 'center',
    letterSpacing: 0.2, whiteSpace: 'nowrap',
    transition: 'color 0.2s ease, border-color 0.2s ease, font-weight 0.1s',
  },

  // Hero
  hero: {
    position: 'relative', overflow: 'hidden', minHeight: '100vh',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
    width: 1000, height: 600, pointerEvents: 'none', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(247,87,9,0.13) 0%, rgba(48,142,189,0.05) 40%, transparent 65%)',
  },
  heroInner: {
    position: 'relative', zIndex: 1, width: '100%', maxWidth: 1200,
    padding: 'clamp(60px,8vw,100px) clamp(20px,5vw,40px) 0',
    margin: '0 auto',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },
  heroLogo: {
    width: 'clamp(280px, 50vw, 480px)', maxWidth: 'none', height: 'auto', objectFit: 'contain',
    display: 'block', marginBottom: 48,
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32,
    background: 'rgba(247,87,9,0.10)', border: '1px solid rgba(247,87,9,0.22)',
    borderRadius: 100, padding: '6px 16px',
  },
  heroBadgeDot: {
    display: 'block', width: 7, height: 7, borderRadius: '50%',
    background: ORANGE, boxShadow: `0 0 8px ${ORANGE}`,
  },
  headline: {
    fontSize: 'clamp(38px,7vw,80px)', fontWeight: 900, lineHeight: 1.06,
    letterSpacing: '-0.03em', color: '#EFEFEF', marginBottom: 28,
    fontFamily: "'Manrope','Inter',sans-serif",
  },
  headlineOrange: {
    background: `linear-gradient(135deg, ${ORANGE} 0%, #FF8A50 100%)`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  heroSub:  { fontSize: 'clamp(15px,2vw,18px)', color: '#777', lineHeight: 1.8, maxWidth: 580, marginBottom: 40 },
  heroCtas: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 },
  mockupWrap: {
    position: 'relative', width: '100%', overflow: 'hidden',
    display: 'flex', justifyContent: 'center',
    padding: 'clamp(24px,4vw,32px) clamp(0px,4vw,24px) 0',
  },
  mockupGlow: {
    position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
    width: 700, height: 350, pointerEvents: 'none', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(247,87,9,0.10) 0%, transparent 65%)',
  },

  // Sections
  section: { padding: 'clamp(72px,9vw,120px) clamp(20px,5vw,56px)', background: '#0A0A0A' },
  inner:   { maxWidth: 1120, margin: '0 auto' },
  sectionHead: { maxWidth: 720, margin: '0 auto 56px', textAlign: 'center' },

  eyebrow: {
    display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
    color: ORANGE, textTransform: 'uppercase', marginBottom: 16,
  },
  h2: {
    fontSize: 'clamp(28px,4vw,50px)', fontWeight: 800, letterSpacing: '-0.02em',
    color: '#EFEFEF', marginBottom: 16, lineHeight: 1.12,
    fontFamily: "'Manrope','Inter',sans-serif",
  },
  lead:   { fontSize: 17, color: '#666', lineHeight: 1.8, margin: 0 },

  mockupCenter: { position: 'relative', maxWidth: 600, margin: '0 auto 64px' },
  coachGlow: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    width: 480, height: 300, pointerEvents: 'none', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(247,87,9,0.09) 0%, transparent 65%)',
  },
  athleteGlow: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    width: 480, height: 300, pointerEvents: 'none', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(48,142,189,0.09) 0%, transparent 65%)',
  },
  sectionCta: { display: 'flex', justifyContent: 'center', marginTop: 48 },

  // Grids
  threeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px,100%), 1fr))',
    gap: 16,
  },
  fourGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px,100%), 1fr))',
    gap: 16, marginBottom: 72,
  },
  sportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(120px,100%), 1fr))',
    gap: 10, marginBottom: 40,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))',
    gap: 16,
  },

  divider: {
    height: 1, background: 'linear-gradient(to right, transparent, #2A2A2A, transparent)',
    margin: '0 0 64px',
  },

  // Cards
  card: {
    background: '#141414', border: '1px solid #202020', borderRadius: 16,
    padding: 'clamp(20px,3vw,28px)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)',
    transition: 'border-color 0.2s ease',
  },
  cardTitle: {
    fontSize: 16, fontWeight: 700, color: '#E8E8E8', marginBottom: 10,
    fontFamily: "'Manrope','Inter',sans-serif", letterSpacing: '-0.01em', lineHeight: 1.3,
  },
  cardBody: { fontSize: 14, color: '#666', lineHeight: 1.75, margin: 0 },

  sportChip: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    padding: '20px 12px', background: '#141414', border: '1px solid #202020',
    borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
    transition: 'border-color 0.2s ease',
  },

  programNote: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    background: '#111', border: '1px solid #1E1E1E', borderRadius: 14, padding: '20px 24px',
    marginBottom: 48,
  },

  statItem: {
    background: '#141414', border: '1px solid #202020', borderRadius: 16, padding: '28px 24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10,
  },

  // Buttons
  btnOrange: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 30px', fontSize: 15, fontWeight: 700, borderRadius: 10,
    background: ORANGE, color: '#fff', textDecoration: 'none',
    boxShadow: '0 4px 28px rgba(247,87,9,0.40)',
  },
  btnBlue: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 30px', fontSize: 15, fontWeight: 700, borderRadius: 10,
    background: BLUE, color: '#fff', textDecoration: 'none',
    boxShadow: '0 4px 28px rgba(48,142,189,0.40)',
  },

  // Story
  storyLink: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    color: ORANGE, fontWeight: 700, fontSize: 15, textDecoration: 'none',
    padding: '12px 28px', borderRadius: 10,
    border: '1.5px solid rgba(247,87,9,0.35)', background: 'rgba(247,87,9,0.06)',
  },

  // Final CTA
  ctaSection: {
    position: 'relative', overflow: 'hidden',
    padding: 'clamp(80px,10vw,140px) clamp(20px,5vw,56px)',
    background: '#0A0A0A', borderTop: '1px solid #181818',
  },
  ctaGlow: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    width: 900, height: 500, pointerEvents: 'none', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(247,87,9,0.14) 0%, rgba(48,142,189,0.06) 45%, transparent 65%)',
  },
  ctaH2: {
    fontSize: 'clamp(30px,5vw,58px)', fontWeight: 900, lineHeight: 1.1,
    letterSpacing: '-0.03em', color: '#EFEFEF', marginBottom: 20,
    fontFamily: "'Manrope','Inter',sans-serif",
  },

  // Footer
  footer: {
    padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,56px) clamp(28px,3vw,40px)',
    background: '#080808', borderTop: '1px solid #1A1A1A',
  },
  footerLinks: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    alignItems: 'center', gap: '6px 4px', marginBottom: 16,
  },
  footerSocials: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    gap: '10px 22px', margin: '14px 0',
  },
}
