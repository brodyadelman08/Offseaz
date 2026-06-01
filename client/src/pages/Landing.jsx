import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGO   = '/Offseaz_logo__DARK_-removebg-preview.png'
const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

// ── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '4×',   label: 'More coach visibility',       color: ORANGE },
  { value: '100%', label: 'Structured offseason plans',   color: BLUE   },
  { value: '2×',   label: 'Faster athlete development',   color: YELLOW },
  { value: '0',    label: 'Missed workouts go unnoticed', color: ORANGE },
]

const FEATURES = [
  {
    num: '01', color: ORANGE, tag: 'Assessment',
    icon: ClipboardIcon,
    title: 'Full Athlete Intake',
    body: 'Athletes complete a detailed needs-analysis covering goals, position, injury history, and available equipment — giving coaches the full picture before writing a single rep.',
  },
  {
    num: '02', color: BLUE, tag: 'Blueprints',
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
    num: '04', color: BLUE, tag: 'Communication',
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
      <div style={mk.body}>

        {/* ── LEFT: Coach accountability view ── */}
        <div style={mk.panel}>
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
          <div style={mk.panelMain}>
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
        <div style={mk.divider} />

        {/* ── RIGHT: Athlete blueprint view ── */}
        <div style={mk.panel}>
          <div style={{ ...mk.panelTab, borderBottom: `2px solid ${BLUE}` }}>
            <div style={{ ...mk.tabDot, background: BLUE }} />
            <span style={{ ...mk.tabLabel, color: BLUE }}>Athlete View</span>
          </div>

          <div style={mk.panelMain}>
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
  body: { display: 'flex', height: 340 },

  // Panel
  panel:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  panelTab:  { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#0F0F0F' },
  tabDot:    { width: 7, height: 7, borderRadius: '50%' },
  tabLabel:  { fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  divider:   { width: 1, background: '#1E1E1E', flexShrink: 0 },

  // Mini sidebar (coach panel)
  miniSidebar: {
    width: 70, background: '#0D0D0D', borderRight: '1px solid #1A1A1A',
    padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2,
    position: 'absolute', // not absolute — we'll inline it differently
  },
  sideRow: {
    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', borderRadius: 5,
  },

  panelMain:  { flex: 1, padding: '10px 12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 },
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
mk.panel = { flex: 1, display: 'flex', overflow: 'hidden' }
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
    { label: 'Squat 1RM',   current: 285, target: 315, unit: 'lbs', pct: 90, color: ORANGE },
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

// ── Main component ────────────────────────────────────────────────────────────

export default function Landing() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && session && profile) {
      navigate(profile.role === 'coach' ? '/coach' : '/athlete', { replace: true })
    }
  }, [loading, session, profile, navigate])

  return (
    <div style={s.root}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav style={s.nav}>
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
          <div style={s.heroBadge}>
            <span style={s.heroBadgeDot} />
            <span style={s.heroBadgeText}>Offseason Training Platform</span>
          </div>

          {/* FIX 4 — no recruiting language */}
          <h1 style={s.headline}>
            Train Smarter.<br />
            <span style={s.headlineAccent}>Dominate Next Season.</span>
          </h1>

          <p style={s.heroSub}>
            The complete offseason platform connecting coaches and athletes. Structured programs, live accountability, and direct communication — everything you need to turn the offseason into your biggest competitive advantage.
          </p>

          {/* FIX 1 — Coach CTA orange filled, Athlete CTA blue outlined */}
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

          {/* FIX 3 — Dual-panel mockup */}
          <div style={s.mockupWrap}>
            <div style={s.mockupGlow} />
            <DualDashboardMockup />
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <div style={s.statsBar}>
        <div style={s.statsInner}>
          {STATS.map((stat, i) => (
            <div key={i} className="land-stat-card" style={s.statItem}>
              <span style={{ ...s.statValue, color: stat.color }}>{stat.value}</span>
              <span style={s.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem ────────────────────────────────────────────────────── */}
      <section style={s.problemSection}>
        <div style={s.inner}>
          <div style={s.sectionHead}>
            <span style={s.eyebrow}>The Problem</span>
            <h2 style={s.sectionH2}>The Offseason Is Broken</h2>
            <p style={s.sectionP}>
              Between the final whistle and the first practice, most athletes are on their own — and most coaches have no visibility into what's happening.
            </p>
          </div>
          <div style={s.problemGrid}>
            {[
              { color: ORANGE, title: 'Athletes Drift Without Structure',
                body: 'No plan means no progress. Athletes train randomly or not at all — showing up to the next season less prepared than they could have been.' },
              { color: BLUE, title: 'Coaches Lose All Visibility',
                body: 'After the final game, coaches have no way to monitor effort, track compliance, or guide development in real time. The offseason is a black box.' },
              { color: YELLOW, title: 'The Gap Costs You Games',
                body: 'The athletes who win championships are the ones who closed the offseason gap. Your competitors are training smart — is your roster?' },
            ].map((item, i) => (
              <div key={i} className="land-feature-card" style={{ ...s.problemCard, borderTop: `2px solid ${item.color}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: item.color + '18', border: `1px solid ${item.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
                </div>
                <h3 style={s.cardTitle}>{item.title}</h3>
                <p style={s.cardBody}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section style={s.section}>
        <div style={s.inner}>
          <div style={s.sectionHead}>
            <span style={s.eyebrow}>Platform Features</span>
            <h2 style={s.sectionH2}>Four Pillars. One Platform.</h2>
            <p style={s.sectionP}>
              Everything a coach needs to run an elite offseason program — and everything an athlete needs to execute one.
            </p>
          </div>
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
        </div>
      </section>

      {/* FIX 5 ── Team Activity Feed section ──────────────────────────── */}
      <section style={{ ...s.altSection, borderTop: '1px solid #181818' }}>
        <div style={s.inner}>
          <div style={s.splitRow}>
            {/* Text side */}
            <div style={s.splitText}>
              <span style={s.eyebrow}>Team Activity Feed</span>
              <h2 style={s.sectionH2}>When Teammates See Each Other Work, Everyone Works Harder</h2>
              <p style={{ ...s.sectionP, marginBottom: 32 }}>
                The team feed turns individual effort into shared accountability. Athletes post workout photos and updates visible to the whole team — creating the kind of peer motivation that no coach can manufacture alone.
              </p>
              <div style={s.bulletList}>
                {[
                  { color: ORANGE, text: 'Athletes post workout photos directly from their phone' },
                  { color: BLUE,   text: 'The whole team sees who put in work this week' },
                  { color: YELLOW, text: 'Likes and comments build team culture across the offseason' },
                  { color: ORANGE, text: 'Coaches can post announcements and training reminders' },
                  { color: BLUE,   text: 'Peer visibility creates competition without extra pressure' },
                ].map((b, i) => (
                  <div key={i} style={s.bulletItem}>
                    <CheckIcon color={b.color} />
                    <span style={s.benefitText}>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Visual side */}
            <div style={s.splitVisual}>
              <div style={s.visualGlow} />
              <FeedMockup />
            </div>
          </div>
        </div>
      </section>

      {/* FIX 6 ── Goals & Progress section ────────────────────────────── */}
      <section style={{ ...s.section, background: '#0F0F0F', borderTop: '1px solid #181818' }}>
        <div style={s.inner}>
          <div style={{ ...s.splitRow, flexDirection: 'row-reverse' }}>
            {/* Text side */}
            <div style={s.splitText}>
              <span style={s.eyebrow}>Goal Tracking & PR Progress</span>
              <h2 style={s.sectionH2}>Set Goals in Week One. Prove the Results by Week Eight.</h2>
              <p style={{ ...s.sectionP, marginBottom: 32 }}>
                Athletes set offseason goals at the start of the program and track them week by week. Lifting PRs update automatically from logged maxes — so every athlete can see exactly how far they've come since day one.
              </p>
              <div style={s.bulletList}>
                {[
                  { color: ORANGE, text: 'Athletes set position-specific strength and performance goals' },
                  { color: BLUE,   text: 'Lifting maxes tracked with automatic percentage calculations' },
                  { color: YELLOW, text: 'Week-by-week progress charts show improvement over time' },
                  { color: ORANGE, text: 'Coaches see goal completion rates across the entire roster' },
                  { color: BLUE,   text: 'Athletes enter next season knowing exactly how much they improved' },
                ].map((b, i) => (
                  <div key={i} style={s.bulletItem}>
                    <CheckIcon color={b.color} />
                    <span style={s.benefitText}>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Visual side */}
            <div style={s.splitVisual}>
              <div style={{ ...s.visualGlow, background: 'radial-gradient(ellipse, rgba(48,142,189,0.12) 0%, transparent 65%)' }} />
              <GoalsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── For Coaches / For Athletes ─────────────────────────────────── */}
      <section style={{ ...s.audienceSection }}>
        <div style={s.inner}>
          <div style={s.audienceGrid}>

            {/* Coaches */}
            <div style={{ ...s.audienceCard, borderColor: ORANGE + '33' }}>
              <div style={s.audienceHeader}>
                <div style={{ ...s.audienceIcon, background: ORANGE + '18', border: `1px solid ${ORANGE}33` }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <span style={{ ...s.audiencePill, background: ORANGE + '18', color: ORANGE, border: `1px solid ${ORANGE}33` }}>For Coaches</span>
              </div>
              <h3 style={s.audienceTitle}>Run a world-class offseason program</h3>
              <p style={{ ...s.cardBody, marginBottom: 24 }}>
                Stop relying on hope that your athletes are working. Get the tools to build, assign, and monitor training — without adding hours to your day.
              </p>
              <ul style={s.benefitList}>
                {COACH_BENEFITS.map((b, i) => (
                  <li key={i} style={s.benefitItem}>
                    <CheckIcon color={ORANGE} />
                    <span style={s.benefitText}>{b}</span>
                  </li>
                ))}
              </ul>
              {/* FIX 1 — orange filled */}
              <Link to="/register" className="land-cta-orange" style={{ ...s.audienceCta, background: ORANGE, color: '#fff', boxShadow: `0 4px 20px ${ORANGE}44` }}>
                Get Started as Coach
              </Link>
            </div>

            {/* Athletes */}
            <div style={{ ...s.audienceCard, borderColor: BLUE + '33' }}>
              <div style={s.audienceHeader}>
                <div style={{ ...s.audienceIcon, background: BLUE + '18', border: `1px solid ${BLUE}33` }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="10 8 16 12 10 16 10 8"/>
                  </svg>
                </div>
                <span style={{ ...s.audiencePill, background: BLUE + '18', color: BLUE, border: `1px solid ${BLUE}33` }}>For Athletes</span>
              </div>
              <h3 style={s.audienceTitle}>Enter next season ahead of the competition</h3>
              {/* FIX 4 — no recruiting language */}
              <p style={{ ...s.cardBody, marginBottom: 24 }}>
                Get a structured program built for your position, track every workout, and prove your offseason commitment with documented results your coach can see.
              </p>
              <ul style={s.benefitList}>
                {ATHLETE_BENEFITS.map((b, i) => (
                  <li key={i} style={s.benefitItem}>
                    <CheckIcon color={BLUE} />
                    <span style={s.benefitText}>{b}</span>
                  </li>
                ))}
              </ul>
              {/* FIX 1 — blue outlined */}
              <Link to="/register" className="land-cta-blue" style={{ ...s.audienceCta, background: 'transparent', color: BLUE, border: `1.5px solid ${BLUE}66` }}>
                Get Started as Athlete
              </Link>
            </div>

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
            {/* FIX 1 — dual CTAs in final section too */}
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
        <div style={s.footerInner}>
          <div style={s.footerLeft}>
            {/* FIX 2 — correct logo aspect ratio */}
            <img
              src={LOGO}
              alt="Offseaz"
              style={{ height: 48, width: 'auto', display: 'block', objectFit: 'contain', marginBottom: 10 }}
            />
            <p style={s.footerTagline}>Built for coaches who take the offseason seriously.</p>
          </div>
          <div style={s.footerRight}>
            <Link to="/register" style={s.footerLink}>Get Started</Link>
            <Link to="/login"    style={s.footerLink}>Sign In</Link>
          </div>
        </div>
        <div style={s.footerBottom}>
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
    overflowX: 'hidden',
  },

  // Navbar
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 56px)', height: 64,
    background: 'rgba(10,10,10,0.88)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
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

  glow: {
    position: 'absolute', pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%', zIndex: 0,
  },
  inner: { maxWidth: 1120, margin: '0 auto' },

  // Hero
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

  // FIX 1 — Coach CTA: orange filled
  ctaCoach: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 30px', fontSize: 15, fontWeight: 700,
    borderRadius: 10, letterSpacing: 0.1,
    background: ORANGE, color: '#fff', textDecoration: 'none',
    boxShadow: '0 4px 28px rgba(247,87,9,0.40)',
    border: 'none',
  },
  // FIX 1 — Athlete CTA: blue outlined
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

  // Stats bar
  statsBar: {
    background: '#0F0F0F',
    borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A',
    padding: 'clamp(28px, 4vw, 40px) clamp(20px, 5vw, 56px)',
  },
  statsInner: {
    maxWidth: 1120, margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px,100%), 1fr))',
    gap: 2,
  },
  statItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '20px 16px', borderRadius: 12,
    background: '#141414', border: '1px solid #1E1E1E',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)', cursor: 'default',
  },
  statValue: {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em',
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
  },
  statLabel: { fontSize: 12, color: '#555', letterSpacing: 0.3, textAlign: 'center', lineHeight: 1.4 },

  // Sections
  section: {
    padding: 'clamp(72px, 9vw, 120px) clamp(20px, 5vw, 56px)',
    background: '#0A0A0A',
  },
  altSection: {
    padding: 'clamp(72px, 9vw, 120px) clamp(20px, 5vw, 56px)',
    background: '#0A0A0A',
  },
  problemSection: {
    padding: 'clamp(72px, 9vw, 120px) clamp(20px, 5vw, 56px)',
    background: '#0F0F0F',
    borderTop: '1px solid #181818', borderBottom: '1px solid #181818',
  },
  audienceSection: {
    padding: 'clamp(72px, 9vw, 120px) clamp(20px, 5vw, 56px)',
    background: '#0F0F0F',
    borderTop: '1px solid #181818',
  },
  sectionHead: { maxWidth: 600, marginBottom: 56 },
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

  // Problem
  problemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px,100%), 1fr))',
    gap: 16,
  },
  problemCard: {
    background: '#141414', border: '1px solid #202020',
    borderRadius: 16, padding: '28px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.20)', cursor: 'default',
  },

  // Features
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px,100%), 1fr))',
    gap: 16,
  },
  featureCard: {
    background: '#141414', border: '1px solid #202020',
    borderRadius: 18, padding: '28px 24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)',
    cursor: 'default',
  },
  featureNum:   { fontSize: 13, fontWeight: 800, letterSpacing: 1 },
  featureTag:   { fontSize: 11, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 10, display: 'block' },
  featureTitle: { fontSize: 17, fontWeight: 700, color: '#E8E8E8', marginBottom: 12, fontFamily: "'Calibri', 'Trebuchet MS', sans-serif", letterSpacing: '-0.01em' },
  cardTitle:    { fontSize: 17, fontWeight: 700, color: '#E8E8E8', marginBottom: 10, fontFamily: "'Calibri', 'Trebuchet MS', sans-serif", letterSpacing: '-0.01em' },
  cardBody:     { fontSize: 14, color: '#666', lineHeight: 1.75 },

  // Split layout (FIX 5 & 6)
  splitRow: {
    display: 'flex',
    gap: 'clamp(40px, 6vw, 80px)',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  splitText: {
    flex: '1 1 340px',
    minWidth: 0,
  },
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
  bulletList: { display: 'flex', flexDirection: 'column', gap: 12 },
  bulletItem: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  benefitText: { fontSize: 14, color: '#888', lineHeight: 1.55 },

  // Audience
  audienceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px,100%), 1fr))',
    gap: 20,
  },
  audienceCard: {
    background: '#141414', border: '1px solid',
    borderRadius: 20, padding: 'clamp(28px, 4vw, 40px)',
    boxShadow: '0 2px 16px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.03)',
    display: 'flex', flexDirection: 'column',
  },
  audienceHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  audienceIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  audiencePill: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '5px 12px', borderRadius: 100 },
  audienceTitle: { fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 800, color: '#E8E8E8', marginBottom: 14, fontFamily: "'Calibri', 'Trebuchet MS', sans-serif", letterSpacing: '-0.02em', lineHeight: 1.25 },
  benefitList: { listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 11, flex: 1 },
  benefitItem: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  audienceCta: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px 24px', fontSize: 14, fontWeight: 700,
    borderRadius: 10, textDecoration: 'none', letterSpacing: 0.1, alignSelf: 'flex-start',
  },

  // CTA section
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

  // Footer
  footer: {
    padding: 'clamp(40px, 5vw, 64px) clamp(20px, 5vw, 56px) clamp(24px, 3vw, 36px)',
    background: '#080808', borderTop: '1px solid #141414',
  },
  footerInner: {
    maxWidth: 1120, margin: '0 auto',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 24, marginBottom: 40,
  },
  footerLeft:    { display: 'flex', flexDirection: 'column' },
  footerTagline: { fontSize: 13, color: '#3A3A3A', margin: 0 },
  footerRight:   { display: 'flex', gap: 24, alignItems: 'center' },
  footerLink:    { fontSize: 13, color: '#3A3A3A', textDecoration: 'none', fontWeight: 500 },
  footerBottom:  { maxWidth: 1120, margin: '0 auto', paddingTop: 20, borderTop: '1px solid #141414' },
  footerCopy:    { fontSize: 12, color: '#2A2A2A', margin: 0 },
}
