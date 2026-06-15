import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BoltIcon } from '../components/Icons'

const LOGO   = '/Offseaz_Logo__White_Letter__Dark_PNG.png'
const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

// ── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    num: '01', color: ORANGE, tag: 'Assessment',
    icon: ClipboardIcon,
    title: 'Full Athlete Intake',
    body: 'Athletes complete a detailed needs-analysis covering goals, position, injury history, and available equipment — giving coaches the full picture before writing a single rep.',
  },
  {
    num: '02', color: BLUE, tag: 'Blueprint',
    icon: BlueprintIcon,
    title: 'Sport-Specific Programs',
    body: 'Build periodized training plans with position-tailored templates, percentage-based loading, and week-by-week progression that scales with every athlete.',
  },
  {
    num: '03', color: YELLOW, tag: 'Accountability',
    icon: CheckCircleIcon,
    title: 'Live Workout Tracking',
    body: 'Athletes log every session with effort scores and notes. Coaches see real-time completion rates, flagged injuries, and roster-wide accountability at a glance.',
  },
  {
    num: '04', color: BLUE, tag: 'Coach Connect',
    icon: MessageIcon,
    title: 'Coach–Athlete Messaging',
    body: 'Keep momentum going all offseason. Send team announcements or direct messages — answer questions, give feedback, and stay connected from last game to first practice.',
  },
]

const COACH_BENEFITS = [
  'Create periodized programs in minutes, not hours',
  "Monitor every athlete's compliance in real time",
  'Catch injury flags before they become problems',
  'Send team-wide or individual messages instantly',
  'Auto-generated weekly accountability reports',
  "Know who's working and who's falling behind",
]

const ATHLETE_BENEFITS = [
  'Receive a program built specifically for your position',
  'Log workouts from anywhere with your phone',
  'Get direct feedback from your coach all offseason',
  'Build a documented training history your coach can see',
  'Track strength gains and performance metrics week to week',
  'Enter next season ahead of the competition',
]

const SPORTS = [
  { emoji: '🏈', name: 'Football' },
  { emoji: '🏀', name: 'Basketball' },
  { emoji: '⚾', name: 'Baseball' },
  { emoji: '🥎', name: 'Softball' },
  { emoji: '⚽', name: 'Soccer' },
  { emoji: '🏒', name: 'Hockey' },
  { emoji: '🏉', name: 'Rugby' },
  { emoji: '🎾', name: 'Tennis' },
  { emoji: '⛳', name: 'Golf' },
  { emoji: '🤼', name: 'Wrestling' },
  { emoji: '🏐', name: 'Volleyball' },
  { emoji: '🏃', name: 'Track & Field' },
  { emoji: '🌲', name: 'Cross Country' },
  { emoji: '🥍', name: 'Lacrosse' },
]

// ── Icon components (inline SVG) ─────────────────────────────────────────────

function ClipboardIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
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

function CheckIcon({ color = ORANGE }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="8" cy="8" r="8" fill={color} fillOpacity="0.15"/>
      <polyline points="4.5,8 7,10.5 11.5,5.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7h10M8 3l4 4-4 4"/>
    </svg>
  )
}

// ── Dual-panel hero mockup: Coach left, Athlete right ─────────────────────────

function DualDashboardMockup() {
  return (
    <div style={mk.shell}>
      {/* Browser chrome */}
      <div style={mk.chrome}>
        <div style={mk.dots}>
          <span style={{ ...mk.dot, background: '#FF5F57' }} />
          <span style={{ ...mk.dot, background: '#FEBC2E' }} />
          <span style={{ ...mk.dot, background: '#28C840' }} />
        </div>
        <div style={mk.urlBar}>offseaz.app / dashboard</div>
        <div style={{ width: 54 }} />
      </div>

      {/* Split body */}
      <div className="mock-body" style={mk.body}>

        {/* ── LEFT: Coach accountability view ── */}
        <div className="mock-panel" style={mk.panel}>
          {/* Panel tab */}
          <div style={{ ...mk.panelTab, borderBottom: `2px solid ${ORANGE}` }}>
            <div style={{ ...mk.tabDot, background: ORANGE }} />
            <span style={{ ...mk.tabLabel, color: ORANGE }}>Coach View</span>
          </div>

          {/* Sidebar stub */}
          <div style={mk.miniSidebar}>
            {[ORANGE, BLUE, '#3A3A3A', '#3A3A3A', '#3A3A3A'].map((c, i) => (
              <div key={i} style={{
                ...mk.sideRow,
                borderLeft: i === 0 ? `2px solid ${c}` : '2px solid transparent',
                background: i === 0 ? c + '14' : 'transparent',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: i < 2 ? c : '#2E2E2E', flexShrink: 0 }} />
                <div style={{ height: 4, borderRadius: 2, background: i < 2 ? c + '55' : '#222', flex: 1 }} />
              </div>
            ))}
          </div>

          {/* Main area */}
          <div className="mock-panel-main" style={mk.panelMain}>
            {/* Top stats */}
            <div style={mk.statsRow}>
              {[
                { v: '18', l: 'Athletes', c: ORANGE },
                { v: '84%', l: 'Avg Rate',  c: BLUE   },
                { v: '3',   l: 'Flagged',   c: YELLOW },
              ].map((s, i) => (
                <div key={i} style={mk.miniStatBox}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: s.c, lineHeight: 1, fontFamily: 'Calibri, sans-serif' }}>{s.v}</span>
                  <span style={{ fontSize: 7, color: '#444', letterSpacing: 0.2 }}>{s.l}</span>
                </div>
              ))}
            </div>

            {/* Section label */}
            <div style={mk.sectionTag}>ROSTER ACCOUNTABILITY</div>

            {/* Athlete rows */}
            {[
              { name: 'J. Smith',  pct: 92, streak: 8,  color: ORANGE, done: true  },
              { name: 'M. Davis',  pct: 100,streak: 12, color: BLUE,   done: true  },
              { name: 'K. Jones',  pct: 58, streak: 0,  color: YELLOW, done: false },
              { name: 'T. Brown',  pct: 83, streak: 5,  color: ORANGE, done: true  },
              { name: 'A. Wilson', pct: 75, streak: 3,  color: BLUE,   done: true  },
            ].map((a, i) => (
              <div key={i} style={mk.athleteRow}>
                <div style={{ ...mk.ava, background: a.color + '28', border: `1px solid ${a.color}44`, flexShrink: 0 }}>
                  <span style={{ fontSize: 7, color: a.color, fontWeight: 700 }}>{a.name[0]}{a.name.split(' ')[1][0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#DDD' }}>{a.name}</span>
                    <span style={{ fontSize: 7, fontWeight: 800, color: a.done ? a.color : '#666' }}>{a.pct}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: '#1E1E1E', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${a.pct}%`, background: a.color + 'AA', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  {a.streak > 0 ? (
                    <>
                      <span style={{ fontSize: 8 }}>🔥</span>
                      <span style={{ fontSize: 7, color: YELLOW, fontWeight: 700 }}>{a.streak}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 8 }}>⚑</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mock-divider" style={mk.divider} />

        {/* ── RIGHT: Athlete blueprint view ── */}
        <div className="mock-panel" style={mk.panel}>
          <div style={{ ...mk.panelTab, borderBottom: `2px solid ${BLUE}` }}>
            <div style={{ ...mk.tabDot, background: BLUE }} />
            <span style={{ ...mk.tabLabel, color: BLUE }}>Athlete View</span>
          </div>

          <div className="mock-panel-main" style={mk.panelMain}>
            {/* Blueprint header */}
            <div style={mk.blueprintHeader}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: BLUE, letterSpacing: 0.8, marginBottom: 2 }}>WEEK 4 OF 8</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#E8E8E8', fontFamily: 'Calibri, sans-serif' }}>Strength Block</div>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[1,2,3,4,5,6,7,8].map(w => (
                  <div key={w} style={{ width: 6, height: 6, borderRadius: 1, background: w <= 4 ? BLUE + 'BB' : '#1E1E1E' }} />
                ))}
              </div>
            </div>

            {/* Day label */}
            <div style={mk.sectionTag}>MONDAY — LOWER BODY</div>

            {/* Workout cards */}
            {[
              { exercise: 'Back Squat',          sets: '4×5', pct: '75%', lbs: '225 lbs' },
              { exercise: 'Romanian Deadlift',   sets: '3×8', pct: '65%', lbs: '185 lbs' },
              { exercise: 'Bulgarian Split Squat',sets: '3×6', pct: '60%', lbs: '80 lbs'  },
            ].map((w, i) => (
              <div key={i} style={mk.workoutCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#DDD' }}>{w.exercise}</span>
                  <div style={{ ...mk.pctBadge, color: BLUE, background: BLUE + '18', border: `1px solid ${BLUE}33` }}>
                    {w.pct}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 8, color: '#555', fontWeight: 600 }}>{w.sets}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, color: ORANGE }}>{w.lbs}</span>
                </div>
                <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: '#1A1A1A', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${parseInt(w.pct)}%`, background: BLUE + '66', borderRadius: 2 }} />
                </div>
              </div>
            ))}

            {/* Log button */}
            <div style={mk.logBtn}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28C840' }} />
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
    background: '#111',
    border: '1px solid #252525',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)',
    width: '100%',
    maxWidth: 820,
  },
  chrome: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 16px',
    background: '#0A0A0A',
    borderBottom: '1px solid #1C1C1C',
  },
  dots: { display: 'flex', gap: 5 },
  dot:  { width: 9, height: 9, borderRadius: '50%' },
  urlBar: {
    fontSize: 9, color: '#3A3A3A', fontFamily: 'monospace',
    background: '#161616', border: '1px solid #222',
    borderRadius: 5, padding: '3px 12px', letterSpacing: 0.3,
  },
  body: { display: 'flex' },

  // Panel
  panel:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  panelTab:  { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#0F0F0F' },
  tabDot:    { width: 7, height: 7, borderRadius: '50%' },
  tabLabel:  { fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  divider:   { background: '#1E1E1E', flexShrink: 0 },

  // Mini sidebar (coach panel)
  miniSidebar: {
    width: 70, background: '#0D0D0D', borderRight: '1px solid #1A1A1A',
    padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2,
    position: 'absolute', // not absolute — we'll inline it differently
  },
  sideRow: {
    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', borderRadius: 5,
  },

  panelMain:  { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  statsRow:   { display: 'flex', gap: 5 },
  miniStatBox: {
    flex: 1, background: '#1A1A1A', border: '1px solid #222',
    borderRadius: 7, padding: '6px 8px',
    display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
  },
  sectionTag: {
    fontSize: 7, fontWeight: 700, letterSpacing: 1.2, color: '#444',
    textTransform: 'uppercase', paddingBottom: 2, borderBottom: '1px solid #1A1A1A',
  },

  // Athlete rows (coach view)
  athleteRow: {
    display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0',
  },
  ava: {
    width: 20, height: 20, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Blueprint (athlete view)
  blueprintHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    background: '#171717', border: '1px solid #222',
    borderRadius: 8, padding: '8px 10px',
  },

  workoutCard: {
    background: '#171717', border: '1px solid #222',
    borderRadius: 8, padding: '7px 9px',
  },
  pctBadge: {
    fontSize: 7, fontWeight: 800, padding: '2px 6px', borderRadius: 8,
    letterSpacing: 0.3,
  },
  logBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: '#0D1A0D', border: '1px solid #1A3A1A',
    borderRadius: 7, padding: '6px 10px', marginTop: 'auto',
  },
}

// Overwrite miniSidebar to be normal flow
mk.miniSidebar = {
  background: '#0D0D0D', borderRight: '1px solid #1A1A1A',
  padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2,
  width: 62, flexShrink: 0,
}
// panel needs flex-row internally
mk.panel = { display: 'flex', overflow: 'hidden' }
mk.panelInner = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }

// ── Team Feed Mockup ──────────────────────────────────────────────────────────

function FeedMockup() {
  const posts = [
    {
      avatar: ORANGE, initials: 'JR', name: 'Jake R.',
      time: '2h ago', text: 'Squatted 315 for 5 today. New PR this offseason 💪',
      hasPhoto: true, photoColor: '#1C2818', photoAccent: '#28C84022',
      likes: 7, comments: 3, liked: true,
    },
    {
      avatar: BLUE, initials: 'MD', name: 'Marcus D.',
      time: '4h ago', text: 'Week 6 check-in. Logged every session so far.',
      hasPhoto: false,
      likes: 4, comments: 1, liked: false,
    },
    {
      avatar: YELLOW, initials: 'KW', name: 'Kayla W.',
      time: '6h ago', text: 'Morning conditioning done. 6am grind 🔥',
      hasPhoto: true, photoColor: '#1A1C28', photoAccent: '#308EBD22',
      likes: 11, comments: 5, liked: false,
    },
  ]
  return (
    <div style={fd.shell}>
      <div style={fd.chrome}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map((c,i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'block' }} />
          ))}
        </div>
        <div style={fd.urlBar}>offseaz.app / feed</div>
        <div style={{ width: 54 }} />
      </div>
      <div style={fd.body}>
        <div style={fd.header}>
          <span style={fd.headerTitle}>Team Feed</span>
          <span style={fd.headerSub}>What the team is up to</span>
        </div>
        <div style={fd.list}>
          {posts.map((p, i) => (
            <div key={i} style={fd.card}>
              <div style={fd.cardTop}>
                <div style={{ ...fd.ava, background: p.avatar + '28', border: `1px solid ${p.avatar}44` }}>
                  <span style={{ fontSize: 8, color: p.avatar, fontWeight: 800 }}>{p.initials}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#DDD' }}>{p.name}</div>
                  <div style={{ fontSize: 8, color: '#444' }}>{p.time}</div>
                </div>
              </div>
              <p style={fd.postText}>{p.text}</p>
              {p.hasPhoto && (
                <div style={{ ...fd.photoPlaceholder, background: p.photoColor, border: `1px solid ${p.avatar}22` }}>
                  <div style={{ ...fd.photoInner, background: p.photoAccent }} />
                  <div style={fd.photoBar} />
                </div>
              )}
              <div style={fd.actions}>
                <div style={{ ...fd.action, color: p.liked ? ORANGE : '#444' }}>
                  <span style={{ fontSize: 9 }}>♥</span>
                  <span style={{ fontSize: 8, fontWeight: 700 }}>{p.likes}</span>
                </div>
                <div style={{ ...fd.action, color: '#444' }}>
                  <span style={{ fontSize: 9 }}>💬</span>
                  <span style={{ fontSize: 8, fontWeight: 700 }}>{p.comments}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const fd = {
  shell: {
    background: '#111', border: '1px solid #252525', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 24px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)',
    width: '100%', maxWidth: 320,
    flexShrink: 0,
  },
  chrome: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px', background: '#0A0A0A', borderBottom: '1px solid #1C1C1C',
  },
  urlBar: {
    fontSize: 8, color: '#3A3A3A', fontFamily: 'monospace',
    background: '#161616', border: '1px solid #222',
    borderRadius: 4, padding: '2px 10px',
  },
  body:   { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
  header: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  headerTitle: { fontSize: 11, fontWeight: 800, color: '#E8E8E8', fontFamily: 'Calibri, sans-serif' },
  headerSub:   { fontSize: 8, color: '#444' },
  list:   { display: 'flex', flexDirection: 'column', gap: 7 },
  card: {
    background: '#1A1A1A', border: '1px solid #232323',
    borderRadius: 10, padding: '8px 10px',
    display: 'flex', flexDirection: 'column', gap: 5,
  },
  cardTop: { display: 'flex', gap: 7, alignItems: 'center' },
  ava: {
    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  postText: { fontSize: 8, color: '#AAA', lineHeight: 1.5, margin: 0 },
  photoPlaceholder: {
    height: 40, borderRadius: 7, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  photoInner: {
    position: 'absolute', inset: 0,
  },
  photoBar: {
    position: 'relative', width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)',
  },
  actions: { display: 'flex', gap: 12, paddingTop: 4, borderTop: '1px solid #1E1E1E' },
  action:  { display: 'flex', alignItems: 'center', gap: 3 },
}

// ── Goals & Progress Mockup ───────────────────────────────────────────────────

function GoalsMockup() {
  const goals = [
    { label: 'Squat One Rep Max',   current: 285, target: 315, unit: 'lbs', pct: 90, color: ORANGE },
    { label: 'Sprint 40yd', current: 4.6, target: 4.4, unit: 'sec', pct: 70, color: BLUE   },
    { label: 'Workouts',    current: 38,  target: 48,  unit: 'done',pct: 79, color: YELLOW },
  ]
  const prs = [
    { lift: 'Back Squat',   weeks: [205, 225, 245, 260, 275, 285], color: ORANGE },
    { lift: 'Bench Press',  weeks: [145, 155, 160, 170, 175, 180], color: BLUE   },
  ]
  const wkLabels = ['W1','W2','W3','W4','W5','W6']

  return (
    <div style={gl.shell}>
      <div style={gl.chrome}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map((c,i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'block' }} />
          ))}
        </div>
        <div style={gl.urlBar}>offseaz.app / goals</div>
        <div style={{ width: 54 }} />
      </div>
      <div style={gl.body}>
        {/* Goals section */}
        <div style={gl.sectionTitle}>Offseason Goals</div>
        <div style={gl.goalList}>
          {goals.map((g, i) => (
            <div key={i} style={gl.goalRow}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: '#DDD' }}>{g.label}</span>
                <span style={{ fontSize: 8, color: g.color, fontWeight: 800 }}>{g.current} / {g.target} {g.unit}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#1A1A1A', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${g.pct}%`, background: g.color + 'BB', borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontSize: 7, color: '#444', marginTop: 1, display: 'block' }}>{g.pct}% to goal</span>
            </div>
          ))}
        </div>

        {/* PR chart section */}
        <div style={gl.sectionTitle}>Lifting PRs — Season Progress</div>
        {prs.map((pr, pi) => (
          <div key={pi} style={gl.prCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: '#DDD' }}>{pr.lift}</span>
              <span style={{ fontSize: 8, fontWeight: 800, color: pr.color }}>
                {pr.weeks[0]} → {pr.weeks[pr.weeks.length - 1]} lbs
              </span>
            </div>
            {/* Mini sparkline chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
              {pr.weeks.map((v, wi) => {
                const min = Math.min(...pr.weeks)
                const max = Math.max(...pr.weeks)
                const h = Math.round(8 + ((v - min) / (max - min)) * 20)
                return (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
                    <div style={{ width: '100%', height: h, borderRadius: '2px 2px 0 0', background: pr.color + (wi === pr.weeks.length - 1 ? 'EE' : '55') }} />
                    <span style={{ fontSize: 6, color: '#444' }}>{wkLabels[wi]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const gl = {
  shell: {
    background: '#111', border: '1px solid #252525', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 24px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)',
    width: '100%', maxWidth: 320, flexShrink: 0,
  },
  chrome: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px', background: '#0A0A0A', borderBottom: '1px solid #1C1C1C',
  },
  urlBar: {
    fontSize: 8, color: '#3A3A3A', fontFamily: 'monospace',
    background: '#161616', border: '1px solid #222', borderRadius: 4, padding: '2px 10px',
  },
  body: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: { fontSize: 8, fontWeight: 700, letterSpacing: 0.8, color: ORANGE, textTransform: 'uppercase' },
  goalList: { display: 'flex', flexDirection: 'column', gap: 7 },
  goalRow:  { display: 'flex', flexDirection: 'column' },
  prCard: {
    background: '#1A1A1A', border: '1px solid #232323',
    borderRadius: 9, padding: '8px 10px',
  },
}

// ── Exercise Info Mockup ──────────────────────────────────────────────────────

function ExerciseInfoMockup() {
  return (
    <div style={ei.shell}>
      <div style={ei.chrome}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'block' }} />
          ))}
        </div>
        <div style={ei.urlBar}>offseaz.app / athlete / plan</div>
        <div style={{ width: 54 }} />
      </div>

      <div style={ei.body}>
        <div style={ei.sectionTag}>WEDNESDAY — UPPER BODY</div>

        {/* Row 1: simple */}
        <div style={ei.exCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={ei.exNameRow}>
              <span style={ei.exName}>Bench Press</span>
              <span style={ei.infoBtn}>i</span>
            </div>
            <span style={ei.exMeta}>3×8 · 185 lbs</span>
          </div>
        </div>

        {/* Row 2: info panel expanded */}
        <div style={{ ...ei.exCard, borderColor: BLUE + '44', background: BLUE + '08' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={ei.exNameRow}>
              <span style={ei.exName}>Romanian Deadlift</span>
              <span style={{
                ...ei.infoBtn,
                background: BLUE + '25',
                borderColor: BLUE,
                boxShadow: `0 0 6px ${BLUE}44`,
              }}>i</span>
            </div>
            <span style={ei.exMeta}>3×10 · 155 lbs</span>
          </div>

          {/* Info panel */}
          <div style={ei.infoPanel}>
            <p style={ei.infoPanelTitle}>Exercise Info</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div>
                <span style={ei.infoLabel}>Primary Muscles</span>
                <span style={ei.infoValue}>Hamstrings · Glutes · Lower Back</span>
              </div>
              <div>
                <span style={ei.infoLabel}>Key Cue</span>
                <span style={ei.infoValue}>Hinge at hips, bar stays close to legs, soft knee bend throughout.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingTop: 5, borderTop: '1px solid #222' }}>
                <span style={{ fontSize: 8, color: BLUE }}>▶</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: BLUE }}>Watch video demo →</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: simple */}
        <div style={ei.exCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={ei.exNameRow}>
              <span style={ei.exName}>Pull-ups</span>
              <span style={ei.infoBtn}>i</span>
            </div>
            <span style={ei.exMeta}>4 sets · AMAP</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const ei = {
  shell: {
    background: '#111', border: '1px solid #252525', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 24px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)',
    width: '100%', maxWidth: 320, flexShrink: 0,
  },
  chrome: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px', background: '#0A0A0A', borderBottom: '1px solid #1C1C1C',
  },
  urlBar: {
    fontSize: 8, color: '#3A3A3A', fontFamily: 'monospace',
    background: '#161616', border: '1px solid #222', borderRadius: 4, padding: '2px 10px',
  },
  body: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 },
  sectionTag: {
    fontSize: 7, fontWeight: 700, letterSpacing: 1.2, color: '#444',
    textTransform: 'uppercase', paddingBottom: 6, borderBottom: '1px solid #1A1A1A',
    marginBottom: 1,
  },
  exCard: {
    background: '#1A1A1A', border: '1px solid #252525', borderRadius: 9, padding: '8px 10px',
  },
  exNameRow: { display: 'flex', alignItems: 'center', gap: 5 },
  exName: { fontSize: 10, fontWeight: 700, color: '#E0E0E0' },
  infoBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 14, height: 14, borderRadius: '50%',
    border: `1px solid ${BLUE}50`, background: 'transparent',
    fontSize: 8, fontWeight: 800, color: BLUE, lineHeight: 1, flexShrink: 0,
  },
  exMeta: { fontSize: 8, color: '#555', fontWeight: 600 },
  infoPanel: {
    background: '#0F0F0F', border: `1px solid ${BLUE}25`,
    borderRadius: 7, padding: '8px 10px',
  },
  infoPanelTitle: {
    fontSize: 8, fontWeight: 700, color: BLUE, letterSpacing: 0.5,
    margin: '0 0 6px', textTransform: 'uppercase',
  },
  infoLabel: {
    display: 'block', fontSize: 7, fontWeight: 700, color: BLUE,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 1,
  },
  infoValue: { fontSize: 8, color: '#888', lineHeight: 1.4 },
}

// ── Sports & Blueprint styles ─────────────────────────────────────────────────

const sp = {
  sportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(120px, 100%), 1fr))',
    gap: 10,
    marginBottom: 56,
  },
  sportChip: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    padding: '22px 12px',
    background: '#141414', border: '1px solid #202020',
    borderRadius: 16, cursor: 'default',
    boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
  },
  sportEmoji: { fontSize: 30, lineHeight: 1, display: 'block' },
  sportName:  { fontSize: 12, fontWeight: 600, color: '#777', letterSpacing: 0.3, textAlign: 'center', lineHeight: 1.3 },

  sectionDivider: {
    height: 1,
    background: 'linear-gradient(to right, transparent, #2A2A2A, transparent)',
    margin: '0 0 56px',
  },

  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
    gap: 16,
    marginBottom: 48,
  },
  stepCard: {
    background: '#141414', border: '1px solid #202020',
    borderRadius: 18, padding: '32px 28px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)',
  },
  stepNum: {
    fontSize: 52, fontWeight: 900, lineHeight: 1,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    letterSpacing: '-0.04em', marginBottom: 20, display: 'block',
  },
  stepTitle: {
    fontSize: 17, fontWeight: 700, color: '#E8E8E8', marginBottom: 12,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    letterSpacing: '-0.01em', lineHeight: 1.3,
  },
  stepBody: { fontSize: 14, color: '#666', lineHeight: 1.75, margin: 0 },

  callout: {
    display: 'flex', alignItems: 'flex-start', gap: 20,
    background: 'rgba(247,87,9,0.06)',
    border: '1px solid rgba(247,87,9,0.22)',
    borderLeft: `3px solid ${ORANGE}`,
    borderRadius: 16,
    padding: '28px 32px',
    marginBottom: 0,
  },
  calloutIconWrap: {
    width: 48, height: 48, borderRadius: 12, flexShrink: 0, marginTop: 2,
    background: 'rgba(247,87,9,0.12)', border: '1px solid rgba(247,87,9,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  calloutIconText:  { fontSize: 22 },
  calloutHeading:   { fontSize: 16, fontWeight: 700, color: '#E8E8E8', marginBottom: 6, fontFamily: "'Calibri', 'Trebuchet MS', sans-serif" },
  calloutBody:      { fontSize: 14, color: '#777', lineHeight: 1.7, margin: 0 },

  customNote: {
    display: 'flex', alignItems: 'flex-start', gap: 16,
    background: '#111', border: '1px solid #1E1E1E',
    borderRadius: 14, padding: '22px 28px',
    maxWidth: 700, margin: '0 auto 56px',
  },
  customNoteIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },
  customNoteText: { fontSize: 14, color: '#555', lineHeight: 1.7, margin: 0 },
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Landing() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [betaDismissed, setBetaDismissed] = useState(
    () => sessionStorage.getItem('offseaz_beta_dismissed') === '1'
  )

  function scrollToSection(id) {
    const el = document.getElementById(id)
    if (!el) return
    // Account for fixed nav (64px) + anchor nav (50px)
    const top = el.getBoundingClientRect().top + window.scrollY - 114
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
      const y = window.scrollY
      setScrolled(prev => {
        if (prev) return y > 10
        return y > 80
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={s.root}>

      {/* ── Beta banner ─────────────────────────────────────────────────── */}
      {!betaDismissed && (
        <div style={s.betaBanner}>
          <span style={s.betaText}>
            <span style={s.betaBadge}>BETA</span>
            Offseaz is currently free — features are actively being developed based on coach and athlete feedback.{' '}
            <span style={s.betaHighlight}>A paid version with additional features is coming soon.</span>
          </span>
          <button
            style={s.betaClose}
            onClick={() => {
              setBetaDismissed(true)
              sessionStorage.setItem('offseaz_beta_dismissed', '1')
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Navbar — fades in after 80px scroll ── */}
      <nav style={{
        ...s.nav,
        opacity: scrolled ? 1 : 0,
        pointerEvents: scrolled ? 'auto' : 'none',
        transition: 'opacity 0.22s ease',
      }}>
        <img src={LOGO} alt="Offseaz" style={{ height: 32, display: 'block' }} />
        <div style={s.navLinks}>
          <Link to="/login" className="land-nav-link" style={s.navLink}>Sign In</Link>
          <Link to="/register" className="land-cta-orange" style={s.navCta}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={s.hero}>
        <div style={{ ...s.glow, top: '30%', left: '50%', width: 1000, height: 600,
          background: 'radial-gradient(ellipse, rgba(247,87,9,0.13) 0%, rgba(48,142,189,0.05) 40%, transparent 65%)' }} />
        <div style={{ ...s.glow, top: '60%', left: '20%', width: 500, height: 500,
          background: 'radial-gradient(ellipse, rgba(48,142,189,0.07) 0%, transparent 60%)' }} />

        <div style={s.heroInner}>
          <img
            src={LOGO}
            alt="Offseaz"
            className="land-hero-logo"
            style={{ height: 'auto', objectFit: 'contain', display: 'block' }}
          />

          <div style={s.heroBadge}>
            <span style={s.heroBadgeDot} />
            <span style={s.heroBadgeText}>Offseason Training Platform</span>
          </div>

          <h1 style={s.headline}>
            The Weight Room<br />
            <span style={s.headlineAccent}>in an App.</span>
          </h1>

          <p style={s.heroSub}>
            Sport-specific blueprints. Real accountability. Built for coaches and athletes who take the offseason seriously.
          </p>

          <div style={s.heroCtas}>
            <Link to="/register" className="land-cta-orange" style={s.ctaCoach}>
              Get Started as Coach
            </Link>
            <Link to="/register" className="land-cta-blue" style={s.ctaAthlete}>
              Get Started as Athlete
            </Link>
          </div>

          <p style={s.heroTrust}>
            Free to start · No credit card required · Built for coaches and athletes
          </p>

          <div style={s.heroScrollLine} />

          <div style={s.mockupWrap}>
            <div style={s.mockupGlow} />
            <DualDashboardMockup />
          </div>
        </div>
      </section>

      {/* ── Sticky anchor navigation ────────────────────────────────────── */}
      <nav style={s.anchorNav}>
        <div style={s.anchorNavInner}>
          {[
            { id: 'coaches',      label: 'For Coaches'  },
            { id: 'athletes',     label: 'For Athletes' },
            { id: 'program',      label: 'The Program'  },
            { id: 'how-it-works', label: 'How It Works' },
            { id: 'story',        label: 'Our Story'    },
          ].map(({ id, label }) => (
            <button
              key={id}
              style={s.anchorLink}
              onClick={() => scrollToSection(id)}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(247,87,9,0.10)'
                e.currentTarget.style.color = ORANGE
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#888'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── For Coaches ─────────────────────────────────────────────────── */}
      <section id="coaches" style={{ ...s.section, background: '#0F0F0F', borderTop: '1px solid #181818' }}>
        <div style={s.inner}>

          <div style={{ ...s.sectionHead, maxWidth: 680, margin: '0 auto 56px', textAlign: 'center' }}>
            <span style={s.eyebrow}>For Coaches</span>
            <h2 style={s.sectionH2}>The Offseason Is No Longer a Black Box</h2>
            <p style={s.sectionP}>
              Real-time visibility into who is logging, who is skipping, and who flagged an injury —
              across your entire roster. Built for coaches who refuse to go dark between seasons.
            </p>
          </div>

          {/* Accountability dashboard mockup */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: 64 }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 350, pointerEvents: 'none', background: 'radial-gradient(ellipse, rgba(247,87,9,0.10) 0%, transparent 65%)', borderRadius: '50%', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
              <DualDashboardMockup />
            </div>
          </div>

          {/* Pain-point solution cards */}
          <div style={s.threeColGrid}>
            {[
              { color: ORANGE, title: 'Real-Time Roster Visibility',
                body: "See every athlete's completion rate, streak, and session logs the moment they submit. Know exactly who is working and who isn't — every single day." },
              { color: BLUE, title: 'Injury Flags Surface Instantly',
                body: 'When an athlete flags an injury during workout logging, it appears immediately on your accountability dashboard. Catch problems before they become season-ending.' },
              { color: YELLOW, title: 'Auto-Generated Accountability Reports',
                body: 'Weekly reports show who trained, who skipped, and who improved — giving you the data to have conversations that actually change behavior.' },
            ].map((item, i) => (
              <div key={i} className="land-feature-card" style={{ ...s.problemCard, borderTop: `2px solid ${item.color}` }}>
                <h3 style={s.cardTitle}>{item.title}</h3>
                <p style={s.cardBody}>{item.body}</p>
              </div>
            ))}
          </div>

          {/* Benefits + live dashboard stat strip */}
          <div style={{ ...s.splitRow, marginTop: 64 }}>
            <div style={s.splitText}>
              <h3 style={s.subHeading}>
                Everything you need to run a world-class offseason program
              </h3>
              <ul style={s.benefitList}>
                {COACH_BENEFITS.map((b, i) => (
                  <li key={i} style={s.benefitItem}>
                    <CheckIcon color={ORANGE} />
                    <span style={s.benefitText}>{b}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="land-cta-orange" style={{ ...s.ctaCoach, marginTop: 32, display: 'inline-flex' }}>
                Get Started as Coach
              </Link>
            </div>
            <div style={s.splitVisual}>
              <div style={s.statStripCard}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: ORANGE, textTransform: 'uppercase', marginBottom: 18, margin: '0 0 18px' }}>
                  Coach Dashboard
                </p>
                {[
                  { label: 'Athletes logged today',     val: '14 / 18', color: ORANGE  },
                  { label: 'Average completion rate',   val: '84%',     color: BLUE    },
                  { label: 'Active streaks on roster',  val: '11',      color: YELLOW  },
                  { label: 'Injuries flagged this week',val: '2',       color: '#c73820' },
                ].map((row, i, arr) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid #1E1E1E' : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: '#666' }}>{row.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: row.color }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Athletes ────────────────────────────────────────────────── */}
      <section id="athletes" style={{ ...s.section, borderTop: '1px solid #181818' }}>
        <div style={s.inner}>

          <div style={{ ...s.sectionHead, maxWidth: 680, margin: '0 auto 56px', textAlign: 'center' }}>
            <span style={s.eyebrow}>For Athletes</span>
            <h2 style={s.sectionH2}>Your Plan. Your Weights. Your Progress.</h2>
            <p style={s.sectionP}>
              A personalized blueprint built for your sport and position — with exact weights
              auto-calculated from your logged maxes. No guesswork. Just lift.
            </p>
          </div>

          {/* Survey → Blueprint flow (3 steps) */}
          <div style={{ ...sp.stepsGrid, marginBottom: 64 }}>
            {[
              { color: ORANGE, num: '01',
                title: 'Complete the Needs Analysis',
                body: 'Fill out a detailed intake survey: sport, position, goals, experience level, available equipment, and injury history.' },
              { color: BLUE, num: '02',
                title: 'Get a Personalized Blueprint',
                body: 'Offseaz builds a training program from your survey answers. Percentage-based weights are auto-calculated from your logged one-rep maxes.' },
              { color: YELLOW, num: '03',
                title: 'Track Streaks & Progress',
                body: 'Log every session, build your streak, and watch your PRs climb. Your coach sees every rep. Your teammates see your work on the feed.' },
            ].map((step, i) => (
              <div key={i} style={{ ...sp.stepCard, borderTop: `2px solid ${step.color}` }}>
                <span style={{ ...sp.stepNum, color: step.color }}>{step.num}</span>
                <h4 style={sp.stepTitle}>{step.title}</h4>
                <p style={sp.stepBody}>{step.body}</p>
              </div>
            ))}
          </div>

          {/* Team feed visual + athlete benefits */}
          <div style={s.splitRow}>
            <div style={s.splitVisual}>
              <div style={{ ...s.visualGlow, background: 'radial-gradient(ellipse, rgba(48,142,189,0.12) 0%, transparent 65%)' }} />
              <FeedMockup />
            </div>
            <div style={s.splitText}>
              <span style={s.eyebrow}>Team Feed & Streak Tracking</span>
              <h3 style={s.subHeading}>
                When teammates see each other work, everyone works harder
              </h3>
              <p style={{ ...s.cardBody, marginBottom: 28, fontSize: 15, lineHeight: 1.75, color: '#666' }}>
                The team feed turns individual effort into shared accountability.
                Post workout photos, see who put in work this week, and build team
                culture across the entire offseason.
              </p>
              <ul style={s.benefitList}>
                {ATHLETE_BENEFITS.map((b, i) => (
                  <li key={i} style={s.benefitItem}>
                    <CheckIcon color={BLUE} />
                    <span style={s.benefitText}>{b}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="land-cta-blue" style={{ ...s.ctaAthlete, marginTop: 32, display: 'inline-flex' }}>
                Get Started as Athlete
              </Link>
            </div>
          </div>

          {/* Auto-calculated weights callout */}
          <div style={{ ...sp.callout, marginTop: 64 }}>
            <div style={sp.calloutIconWrap}>
              <BoltIcon size={24} color={ORANGE} />
            </div>
            <div>
              <p style={sp.calloutHeading}>No math. No guesswork. Just lift.</p>
              <p style={sp.calloutBody}>
                Every lift shows the exact weight to use based on your personal one-rep max — calculated automatically from your logged maxes. Athletes see the number. They just lift it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Program ─────────────────────────────────────────────────── */}
      <section id="program" style={{ ...s.section, background: '#0F0F0F', borderTop: '1px solid #181818', borderBottom: '1px solid #181818' }}>
        <div style={s.inner}>

          <div style={{ ...s.sectionHead, maxWidth: 680, margin: '0 auto 56px', textAlign: 'center' }}>
            <span style={s.eyebrow}>The Program</span>
            <h2 style={s.sectionH2}>Four Pillars. One Platform.</h2>
            <p style={s.sectionP}>
              Everything a coach needs to run an elite offseason program — and everything an athlete needs to execute one.
            </p>
          </div>

          {/* Four pillars */}
          <div style={s.featuresGrid}>
            {FEATURES.map(f => (
              <div key={f.num} className="land-feature-card" style={s.featureCard}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color + '18', border: `1px solid ${f.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <f.icon size={20} color={f.color} />
                  </div>
                  <span style={{ ...s.featureNum, color: f.color + '55' }}>{f.num}</span>
                </div>
                <div style={{ ...s.featureTag, color: f.color }}>{f.tag}</div>
                <h3 style={s.featureTitle}>{f.title}</h3>
                <p style={s.cardBody}>{f.body}</p>
              </div>
            ))}
          </div>

          <div style={{ ...sp.sectionDivider, margin: '72px 0 64px' }} />

          {/* Sport grid */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={s.eyebrow}>Sport-Specific Training</span>
            <h3 style={{ ...s.sectionH2, marginBottom: 14 }}>Built for 14 Sports</h3>
            <p style={{ ...s.sectionP, maxWidth: 560, margin: '0 auto' }}>
              Templates built for every major high school and college sport — with a fully
              customizable blueprint builder for coaches who want total control.
            </p>
          </div>

          <div style={sp.sportGrid}>
            {SPORTS.map((sport, i) => (
              <div key={i} className="land-feature-card" style={sp.sportChip}>
                <span style={sp.sportEmoji}>{sport.emoji}</span>
                <span style={sp.sportName}>{sport.name}</span>
              </div>
            ))}
          </div>

          {/* 16-week program structure note */}
          <div style={sp.customNote}>
            <span style={sp.customNoteIcon}>📅</span>
            <p style={sp.customNoteText}>
              <strong style={{ color: '#CCC', fontWeight: 700 }}>16-Week Periodized Structure.</strong>{' '}
              Every program follows a full 16-week offseason arc — Foundation, Strength, Power, and Competition Prep phases — with progressive overload built in from week one to week sixteen.
            </p>
          </div>

          {/* Stats row */}
          <div style={s.platformStatsGrid}>
            {[
              { value: '14',    label: 'Sports Supported',                  color: ORANGE },
              { value: '16 Wk', label: 'Offseason Programs',                color: BLUE   },
              { value: '80+',   label: 'Exercises Explained',               color: YELLOW },
              { value: '%',     label: 'Weights Calculated Automatically',  color: ORANGE },
            ].map((stat, i) => (
              <div key={i} style={{ ...s.platformStatItem, borderTop: `2px solid ${stat.color}` }}>
                <span style={{ ...s.platformStatValue, color: stat.color }}>{stat.value}</span>
                <span style={s.platformStatLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ ...s.section, borderTop: '1px solid #181818' }}>
        <div style={s.inner}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={s.eyebrow}>How It Works</span>
            <h2 style={{ ...s.sectionH2, marginBottom: 0 }}>Up and Running in Three Steps</h2>
          </div>
          <div style={sp.stepsGrid}>
            {[
              {
                num: '01', color: ORANGE,
                title: 'Coach Creates a Team and Builds a Sport-Specific Blueprint',
                body: 'Sign up, create your team, and build a training program using the blueprint builder. Your program is ready to assign before a single athlete joins.',
              },
              {
                num: '02', color: BLUE,
                title: 'Athletes and Assistant Coaches Join With Their Unique Invite Code and Get Their Plan Instantly',
                body: 'Athletes join, complete the needs analysis, and immediately receive a personalized program with exact weights calculated from their logged maxes.',
              },
              {
                num: '03', color: YELLOW,
                title: 'Everyone Trains, Logs Workouts, and the Coach Sees Everything in Real Time',
                body: 'Athletes log every session from their phone. Coaches see real-time compliance, flag injuries, send messages, and track progress across the entire roster all offseason long.',
              },
            ].map((step, i) => (
              <div key={i} style={{ ...sp.stepCard, borderTop: `2px solid ${step.color}` }}>
                <span style={{ ...sp.stepNum, color: step.color }}>{step.num}</span>
                <h4 style={sp.stepTitle}>{step.title}</h4>
                <p style={sp.stepBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Story ───────────────────────────────────────────────────── */}
      <section id="story" style={{ ...s.section, background: '#0F0F0F', borderTop: '1px solid #181818' }}>
        <div style={s.inner}>
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <span style={s.eyebrow}>Our Story</span>
            <h2 style={{ ...s.sectionH2, marginBottom: 24 }}>Built by an Athlete. For Athletes.</h2>
            <p style={{ ...s.sectionP, marginBottom: 20 }}>
              Offseaz was built by Brody Adelman — a multi-sport varsity athlete who watched firsthand
              how unstructured and unaccountable offseason training was for most high school athletes.
              No plan. No visibility. No accountability.
            </p>
            <p style={{ fontSize: 17, color: '#555', lineHeight: 1.8, marginBottom: 40 }}>
              He built the platform he wished he had: sport-specific blueprints, personalized to each
              athlete, with coaches getting real-time visibility into who is actually putting in the work.
            </p>
            <Link to="/about" style={s.storyLink}>
              Read the full story <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section style={s.ctaSection}>
        <div style={{ ...s.glow, top: '50%', left: '50%', width: 900, height: 500,
          background: 'radial-gradient(ellipse, rgba(247,87,9,0.15) 0%, rgba(48,142,189,0.06) 45%, transparent 65%)' }} />
        <div style={{ ...s.inner, position: 'relative', zIndex: 1 }}>
          <div style={s.ctaInner}>
            <span style={{ ...s.eyebrow, textAlign: 'center' }}>Get Started Today</span>
            <h2 style={s.ctaHeadline}>
              Your offseason determines<br />
              <span style={{ color: ORANGE }}>your next season.</span>
            </h2>
            <p style={s.ctaSub}>
              Join coaches and athletes who are turning the offseason into their biggest competitive advantage. Free to start — no credit card required.
            </p>
            <div style={s.ctaBtns}>
              <Link to="/register" className="land-cta-orange" style={s.ctaCoach}>
                Get Started as Coach
              </Link>
              <Link to="/register" className="land-cta-blue" style={s.ctaAthlete}>
                Get Started as Athlete
              </Link>
            </div>
            <p style={{ marginTop: 22, fontSize: 14, color: '#444' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <div style={s.footerCenter}>
          <img
            src={LOGO}
            alt="Offseaz"
            style={{ width: 170, height: 'auto', display: 'block', objectFit: 'contain', margin: '0 auto 14px' }}
          />
          <p style={s.footerTagline}>Built for coaches and athletes who take the offseason seriously.</p>
          <div style={s.footerLinks}>
            <Link to="/about"         style={s.footerLink}>About</Link>
            <span style={s.footerDot}>·</span>
            <Link to="/contact"       style={s.footerLink}>Contact</Link>
            <span style={s.footerDot}>·</span>
            <Link to="/privacy"       style={s.footerLink}>Privacy Policy</Link>
            <span style={s.footerDot}>·</span>
            <Link to="/terms"         style={s.footerLink}>Terms &amp; Conditions</Link>
            <span style={s.footerDot}>·</span>
            <Link to="/refund"        style={s.footerLink}>Refund Policy</Link>
            <span style={s.footerDot}>·</span>
            <Link to="/accessibility" style={s.footerLink}>Accessibility</Link>
          </div>

          <div style={s.footerSocials}>
            {[
              { href: 'https://x.com/Offseaz',        label: '@Offseaz',  color: '#fff',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
              { href: 'https://instagram.com/0ffseaz', label: '@0ffseaz',  color: ORANGE,   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1" fill={ORANGE} stroke="none"/></svg> },
              { href: 'https://facebook.com/Offseaz',  label: 'Offseaz',   color: BLUE,     icon: <svg width="15" height="15" viewBox="0 0 24 24" fill={BLUE}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
              { href: 'https://tiktok.com/@0ffseaz',   label: '@0ffseaz',  color: YELLOW,   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill={YELLOW}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.35 6.35 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.15a8.24 8.24 0 004.83 1.55V7.28a4.85 4.85 0 01-1.06-.59z"/></svg> },
            ].map(({ href, label, color, icon }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" style={{ ...s.footerSocialLink, color }}>
                {icon}
                <span>{label}</span>
              </a>
            ))}
          </div>

          <p style={s.footerCopy}>© {new Date().getFullYear()} Offseaz. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  root: {
    background: '#0A0A0A',
    color: '#EFEFEF',
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },

  // ── Beta banner ────────────────────────────────────────────────────────────
  betaBanner: {
    width: '100%',
    background: '#111',
    borderBottom: `1px solid rgba(247,87,9,0.25)`,
    padding: '9px clamp(16px, 4vw, 40px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    position: 'relative',
    zIndex: 200,
  },
  betaText: {
    fontSize: 13,
    color: '#AAAAAA',
    lineHeight: 1.5,
    textAlign: 'center',
    flex: 1,
  },
  betaBadge: {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1,
    color: ORANGE,
    background: 'rgba(247,87,9,0.15)',
    border: `1px solid rgba(247,87,9,0.35)`,
    padding: '2px 7px',
    borderRadius: 4,
    marginRight: 8,
    verticalAlign: 'middle',
  },
  betaHighlight: {
    color: YELLOW,
    fontWeight: 600,
  },
  betaClose: {
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    color: '#555',
    fontSize: 14,
    cursor: 'pointer',
    padding: '8px 10px',
    lineHeight: 1,
    borderRadius: 6,
    transition: 'color 0.15s',
    minWidth: 36,
    minHeight: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Fixed scrolled navbar ──────────────────────────────────────────────────
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 56px)', height: 64,
    background: 'rgba(10,10,10,0.92)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    WebkitTransform: 'translate3d(0,0,0)',
    transform: 'translate3d(0,0,0)',
    willChange: 'opacity',
  },
  navLinks: { display: 'flex', gap: 8, alignItems: 'center' },
  navLink: {
    color: '#888', fontWeight: 500, fontSize: 14,
    textDecoration: 'none', padding: '8px 14px', borderRadius: 8,
  },
  navCta: {
    display: 'inline-flex', alignItems: 'center',
    color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
    padding: '9px 20px', borderRadius: 9, background: ORANGE,
    boxShadow: '0 2px 14px rgba(247,87,9,0.32)',
  },

  // ── Sticky anchor nav ──────────────────────────────────────────────────────
  anchorNav: {
    position: 'sticky',
    top: 0,
    zIndex: 90,
    background: 'rgba(10,10,10,0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  anchorNavInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: '0 clamp(16px, 4vw, 40px)',
    minWidth: 'max-content',
    width: '100%',
  },
  anchorLink: {
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '14px 18px',
    letterSpacing: 0.2,
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid transparent',
  },

  // ── Shared ──────────────────────────────────────────────────────────────────
  glow: {
    position: 'absolute', pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%', zIndex: 0,
  },
  inner: { maxWidth: 1120, margin: '0 auto' },

  // ── Hero ───────────────────────────────────────────────────────────────────
  hero: {
    position: 'relative', overflow: 'hidden',
    minHeight: '100vh',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    paddingTop: 64,
  },
  heroInner: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 960,
    padding: 'clamp(60px, 8vw, 100px) clamp(20px, 5vw, 40px) 0',
    margin: '0 auto',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center',
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(247,87,9,0.10)', border: '1px solid rgba(247,87,9,0.22)',
    borderRadius: 100, padding: '6px 16px', marginBottom: 32,
  },
  heroBadgeDot: {
    display: 'block', width: 7, height: 7, borderRadius: '50%', background: ORANGE,
    boxShadow: `0 0 8px ${ORANGE}`,
  },
  heroBadgeText: {
    fontSize: 12, fontWeight: 600, letterSpacing: 1, color: ORANGE, textTransform: 'uppercase',
  },
  headline: {
    fontSize: 'clamp(38px, 7vw, 80px)',
    fontWeight: 900, lineHeight: 1.06, letterSpacing: '-0.03em',
    color: '#EFEFEF', marginBottom: 28,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
  },
  headlineAccent: {
    background: `linear-gradient(135deg, ${ORANGE} 0%, #FF8A50 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    fontSize: 'clamp(15px, 2vw, 18px)',
    color: '#777', lineHeight: 1.8,
    maxWidth: 600, marginBottom: 40,
  },
  heroCtas: {
    display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20,
  },
  ctaCoach: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 30px', fontSize: 15, fontWeight: 700,
    borderRadius: 10, letterSpacing: 0.1,
    background: ORANGE, color: '#fff', textDecoration: 'none',
    boxShadow: '0 4px 28px rgba(247,87,9,0.40)',
    border: 'none',
  },
  ctaAthlete: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 30px', fontSize: 15, fontWeight: 700,
    borderRadius: 10, letterSpacing: 0.1,
    background: 'transparent', color: BLUE, textDecoration: 'none',
    border: `1.5px solid ${BLUE}`,
  },
  heroTrust: {
    fontSize: 12, color: '#444', letterSpacing: 0.5, marginBottom: 56,
  },
  heroScrollLine: {
    width: 1, height: 48, marginBottom: 0,
    background: 'linear-gradient(to bottom, rgba(247,87,9,0.5), transparent)',
  },
  mockupWrap: {
    position: 'relative', width: '100%',
    display: 'flex', justifyContent: 'center',
    padding: '24px clamp(0px, 4vw, 24px) 0',
  },
  mockupGlow: {
    position: 'absolute', top: '40%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 700, height: 350, pointerEvents: 'none',
    background: 'radial-gradient(ellipse, rgba(247,87,9,0.10) 0%, transparent 65%)',
    borderRadius: '50%',
  },

  // ── Sections ───────────────────────────────────────────────────────────────
  section: {
    padding: 'clamp(72px, 9vw, 120px) clamp(20px, 5vw, 56px)',
    background: '#0A0A0A',
  },
  sectionHead: { marginBottom: 56 },
  eyebrow: {
    display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
    color: ORANGE, textTransform: 'uppercase', marginBottom: 16,
  },
  sectionH2: {
    fontSize: 'clamp(28px, 4vw, 50px)',
    fontWeight: 800, letterSpacing: '-0.02em',
    color: '#EFEFEF', marginBottom: 16,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    lineHeight: 1.12,
  },
  sectionP: { fontSize: 17, color: '#666', lineHeight: 1.8 },

  subHeading: {
    fontSize: 'clamp(20px, 2.8vw, 28px)',
    fontWeight: 800, color: '#E8E8E8',
    marginBottom: 20, lineHeight: 1.25,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    letterSpacing: '-0.02em',
  },

  // ── Grids ──────────────────────────────────────────────────────────────────
  threeColGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
    gap: 16,
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px,100%), 1fr))',
    gap: 16,
  },
  platformStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
    gap: 16,
  },

  // ── Cards ──────────────────────────────────────────────────────────────────
  problemCard: {
    background: '#141414', border: '1px solid #202020',
    borderRadius: 16, padding: '28px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.20)', cursor: 'default',
  },
  featureCard: {
    background: '#141414', border: '1px solid #202020',
    borderRadius: 18, padding: '28px 24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)',
    cursor: 'default',
  },
  platformStatItem: {
    background: '#141414', border: '1px solid #202020',
    borderRadius: 16, padding: '32px 28px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', gap: 10,
  },
  statStripCard: {
    background: 'rgba(247,87,9,0.04)',
    border: '1px solid rgba(247,87,9,0.14)',
    borderRadius: 16, padding: '24px 28px',
    width: '100%',
  },

  // Card text
  featureNum:   { fontSize: 13, fontWeight: 800, letterSpacing: 1 },
  featureTag:   { fontSize: 11, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 10, display: 'block' },
  featureTitle: { fontSize: 17, fontWeight: 700, color: '#E8E8E8', marginBottom: 12, fontFamily: "'Calibri', 'Trebuchet MS', sans-serif", letterSpacing: '-0.01em' },
  cardTitle:    { fontSize: 17, fontWeight: 700, color: '#E8E8E8', marginBottom: 10, fontFamily: "'Calibri', 'Trebuchet MS', sans-serif", letterSpacing: '-0.01em' },
  cardBody:     { fontSize: 14, color: '#666', lineHeight: 1.75 },
  platformStatValue: {
    fontSize: 'clamp(38px, 5vw, 58px)',
    fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em',
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
  },
  platformStatLabel: { fontSize: 14, color: '#666', fontWeight: 600, lineHeight: 1.4 },

  // ── Split layout ───────────────────────────────────────────────────────────
  splitRow: {
    display: 'flex',
    gap: 'clamp(40px, 6vw, 80px)',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  splitText: { flex: '1 1 340px', minWidth: 0 },
  splitVisual: {
    flex: '0 0 auto',
    display: 'flex', justifyContent: 'center',
    position: 'relative',
    width: '100%',
    maxWidth: 340,
  },
  visualGlow: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 340, height: 260, pointerEvents: 'none',
    background: 'radial-gradient(ellipse, rgba(247,87,9,0.10) 0%, transparent 65%)',
    borderRadius: '50%', zIndex: 0,
  },

  // ── Benefit lists ──────────────────────────────────────────────────────────
  benefitList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 },
  benefitItem: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  benefitText: { fontSize: 14, color: '#888', lineHeight: 1.55 },

  // ── CTA section ────────────────────────────────────────────────────────────
  ctaSection: {
    position: 'relative', overflow: 'hidden',
    padding: 'clamp(80px, 10vw, 140px) clamp(20px, 5vw, 56px)',
    background: '#0A0A0A', borderTop: '1px solid #181818',
  },
  ctaInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  ctaHeadline: {
    fontSize: 'clamp(30px, 5vw, 58px)',
    fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em',
    color: '#EFEFEF', marginBottom: 20,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
  },
  ctaSub: { fontSize: 17, color: '#666', lineHeight: 1.75, maxWidth: 520, marginBottom: 44 },
  ctaBtns: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },

  // ── Our Story link ─────────────────────────────────────────────────────────
  storyLink: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    color: ORANGE, fontWeight: 700, fontSize: 15, textDecoration: 'none',
    padding: '12px 28px', borderRadius: 10,
    border: `1.5px solid rgba(247,87,9,0.35)`,
    background: 'rgba(247,87,9,0.06)',
    transition: 'background 0.15s',
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    padding: 'clamp(40px, 5vw, 64px) clamp(20px, 5vw, 56px) clamp(28px, 3vw, 40px)',
    background: '#080808', borderTop: '1px solid #1A1A1A',
  },
  footerCenter:   { textAlign: 'center' },
  footerTagline:  { fontSize: 13, color: '#EFEFEF', margin: '0 0 20px', fontWeight: 400, letterSpacing: 0.1 },
  footerLinks:    { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '6px 10px', marginBottom: 16 },
  footerLink:     { fontSize: 13, color: BLUE, textDecoration: 'none', fontWeight: 500 },
  footerDot:      { fontSize: 13, color: YELLOW },
  footerSocials:  { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 22px', margin: '14px 0' },
  footerSocialLink: { display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600, opacity: 0.8, transition: 'opacity 0.15s' },
  footerCopy:     { fontSize: 12, color: '#888', margin: 0 },
}
