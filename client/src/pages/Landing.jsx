import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGO  = '/Offseaz_logo__DARK_-removebg-preview.png'
const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

// ── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '4×',   label: 'More coach visibility',      color: ORANGE },
  { value: '100%', label: 'Structured offseason plans',  color: BLUE   },
  { value: '2×',   label: 'Faster athlete development',  color: YELLOW },
  { value: '0',    label: 'Missed workouts go unnoticed',color: ORANGE },
]

const FEATURES = [
  {
    num: '01', color: ORANGE, tag: 'Assessment',
    icon: ClipboardIcon,
    title: 'Full Athlete Intake',
    body: 'Athletes complete a detailed needs-analysis covering goals, position, injury history, and available equipment — giving coaches the context to prescribe precisely.',
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
  'Show recruiters a documented training history',
  'Track strength gains and performance metrics',
  'Enter next season ahead of the competition',
]

// ── Icon components (inline SVG — no external deps) ──────────────────────────

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

// ── Product Mockup (div-art dashboard preview) ────────────────────────────────

function ProductMockup() {
  return (
    <div style={mock.shell}>
      {/* Window chrome */}
      <div style={mock.chrome}>
        <div style={mock.dots}>
          <span style={{ ...mock.dot, background: '#FF5F57' }} />
          <span style={{ ...mock.dot, background: '#FEBC2E' }} />
          <span style={{ ...mock.dot, background: '#28C840' }} />
        </div>
        <div style={mock.urlBar}>offseaz.app / coach / dashboard</div>
        <div style={{ width: 54 }} />
      </div>

      {/* Dashboard body */}
      <div style={mock.body}>
        {/* Sidebar */}
        <div style={mock.sidebar}>
          <div style={mock.sideLogoRow}>
            <div style={mock.sideLogoDot} />
            <div style={mock.sideLabelWide} />
          </div>
          {[ORANGE, BLUE, '#444', '#444', '#444'].map((c, i) => (
            <div key={i} style={{ ...mock.sideItem, background: i < 2 ? `${c}18` : 'transparent', borderLeft: i === 0 ? `2px solid ${c}` : '2px solid transparent' }}>
              <div style={{ ...mock.sideItemDot, background: i < 2 ? c : '#3A3A3A' }} />
              <div style={{ ...mock.sideLabel, background: i < 2 ? c + '55' : '#2A2A2A', width: i === 0 ? 52 : 40 }} />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={mock.main}>
          {/* Top row — stat cards */}
          <div style={mock.statRow}>
            {[
              { val: '18', sub: 'Athletes Active', color: ORANGE },
              { val: '94%', sub: 'Completion Rate', color: BLUE },
              { val: '3', sub: 'Injury Flags', color: YELLOW },
            ].map((s, i) => (
              <div key={i} style={mock.statBox}>
                <span style={{ ...mock.statVal, color: s.color }}>{s.val}</span>
                <span style={mock.statSub}>{s.sub}</span>
              </div>
            ))}
          </div>

          {/* Roster rows */}
          <div style={mock.card}>
            <div style={mock.cardHeader}>
              <div style={mock.cardTitle} />
              <div style={{ ...mock.pill, background: ORANGE + '22', border: `1px solid ${ORANGE}44` }}>
                <div style={{ ...mock.pillDot, background: ORANGE }} />
              </div>
            </div>
            {[ORANGE, BLUE, BLUE, YELLOW, '#555'].map((c, i) => (
              <div key={i} style={mock.rosterRow}>
                <div style={{ ...mock.avatar, background: c + '33', border: `1px solid ${c}55` }} />
                <div style={mock.rosterMeta}>
                  <div style={{ ...mock.rosterName, width: [72, 60, 80, 56, 64][i] }} />
                  <div style={{ ...mock.rosterSub, width: [48, 52, 44, 50, 42][i] }} />
                </div>
                <div style={{ ...mock.rosterBadge, background: c === '#555' ? '#2A2A2A' : c + '22', border: `1px solid ${c === '#555' ? '#333' : c + '44'}` }}>
                  <div style={{ ...mock.badgeDot, background: c === '#555' ? '#444' : c }} />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom row */}
          <div style={mock.bottomRow}>
            <div style={{ ...mock.miniCard, flex: 1.4 }}>
              <div style={mock.miniTitle} />
              {[65, 80, 50, 90].map((w, i) => (
                <div key={i} style={mock.barTrack}>
                  <div style={{ ...mock.barFill, width: `${w}%`, background: [ORANGE, BLUE, YELLOW, ORANGE][i] + 'BB' }} />
                </div>
              ))}
            </div>
            <div style={{ ...mock.miniCard, flex: 1 }}>
              <div style={mock.miniTitle} />
              <div style={mock.messagePreview}>
                {[ORANGE, BLUE, BLUE].map((c, i) => (
                  <div key={i} style={{ ...mock.msgRow, justifyContent: i === 1 ? 'flex-end' : 'flex-start' }}>
                    <div style={{ ...mock.msgBubble, background: i === 1 ? BLUE + '33' : '#2A2A2A', border: `1px solid ${i === 1 ? BLUE + '44' : '#333'}`, maxWidth: ['55%','50%','60%'][i] }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const mock = {
  shell: {
    background: '#141414',
    border: '1px solid #2A2A2A',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 40px 80px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04)',
    width: '100%',
    maxWidth: 680,
  },
  chrome: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px',
    background: '#0F0F0F',
    borderBottom: '1px solid #222',
  },
  dots: { display: 'flex', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: '50%' },
  urlBar: {
    fontSize: 10, color: '#444', fontFamily: 'monospace',
    background: '#1A1A1A', border: '1px solid #2A2A2A',
    borderRadius: 5, padding: '3px 10px',
  },
  body: { display: 'flex', height: 320 },
  sidebar: {
    width: 110, background: '#0F0F0F',
    borderRight: '1px solid #1E1E1E',
    padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: 2,
  },
  sideLogoRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', marginBottom: 10 },
  sideLogoDot: { width: 16, height: 16, borderRadius: 4, background: ORANGE + '88', flexShrink: 0 },
  sideLabelWide: { height: 6, borderRadius: 3, background: '#2A2A2A', flex: 1 },
  sideItem: { display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', borderRadius: 6 },
  sideItemDot: { width: 8, height: 8, borderRadius: 2, flexShrink: 0 },
  sideLabel: { height: 5, borderRadius: 3 },
  main: { flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' },
  statRow: { display: 'flex', gap: 8 },
  statBox: {
    flex: 1, background: '#1A1A1A', border: '1px solid #252525',
    borderRadius: 10, padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  statVal: { fontSize: 18, fontWeight: 800, lineHeight: 1, fontFamily: 'Calibri, sans-serif' },
  statSub: { fontSize: 8, color: '#555', letterSpacing: 0.3 },
  card: {
    background: '#1A1A1A', border: '1px solid #252525',
    borderRadius: 10, padding: '10px 12px', flex: 1,
  },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { height: 6, width: 60, borderRadius: 3, background: '#2E2E2E' },
  pill: { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 20 },
  pillDot: { width: 5, height: 5, borderRadius: '50%' },
  rosterRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' },
  avatar: { width: 20, height: 20, borderRadius: 6, flexShrink: 0 },
  rosterMeta: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  rosterName: { height: 5, borderRadius: 3, background: '#2E2E2E' },
  rosterSub: { height: 4, borderRadius: 2, background: '#232323' },
  rosterBadge: { padding: '3px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 },
  badgeDot: { width: 5, height: 5, borderRadius: '50%' },
  bottomRow: { display: 'flex', gap: 8 },
  miniCard: {
    background: '#1A1A1A', border: '1px solid #252525',
    borderRadius: 10, padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  miniTitle: { height: 5, width: 55, borderRadius: 3, background: '#2E2E2E', marginBottom: 2 },
  barTrack: { height: 5, borderRadius: 3, background: '#222', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  messagePreview: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1, justifyContent: 'center' },
  msgRow: { display: 'flex' },
  msgBubble: { height: 14, borderRadius: '3px 8px 8px 8px', minWidth: 20 },
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
        {/* Ambient glows */}
        <div style={{ ...s.glow, top: '30%', left: '50%', width: 1000, height: 600,
          background: 'radial-gradient(ellipse, rgba(247,87,9,0.13) 0%, rgba(48,142,189,0.05) 40%, transparent 65%)' }} />
        <div style={{ ...s.glow, top: '60%', left: '20%', width: 500, height: 500,
          background: 'radial-gradient(ellipse, rgba(48,142,189,0.07) 0%, transparent 60%)' }} />

        <div style={s.heroInner}>
          {/* Eyebrow badge */}
          <div style={s.heroBadge}>
            <span style={s.heroBadgeDot} />
            <span style={s.heroBadgeText}>Offseason Training Platform</span>
          </div>

          {/* Headline */}
          <h1 style={s.headline}>
            Train Smarter.<br />
            <span style={s.headlineAccent}>Get Recruited Faster.</span>
          </h1>

          <p style={s.heroSub}>
            The complete offseason platform for coaches and athletes. Structured programs, live accountability, and direct communication — everything you need to turn the offseason into your biggest competitive advantage.
          </p>

          {/* CTAs */}
          <div style={s.heroCtas}>
            <Link to="/register" className="land-cta-orange" style={s.ctaPrimary}>
              Start for Free
            </Link>
            <Link to="/login" className="land-cta-ghost" style={s.ctaSecondary}>
              Sign In <ArrowRight />
            </Link>
          </div>

          {/* Trust micro-line */}
          <p style={s.heroTrust}>
            Free to start · No credit card required · Built for coaches and athletes
          </p>

          {/* Divider to mockup */}
          <div style={s.heroScrollLine} />

          {/* Product mockup */}
          <div style={s.mockupWrap}>
            <div style={s.mockupGlow} />
            <ProductMockup />
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
              {
                color: ORANGE,
                title: 'Athletes Drift Without Structure',
                body: 'No plan means no progress. Athletes train randomly or not at all — showing up to the next season less prepared than they could have been.',
              },
              {
                color: BLUE,
                title: 'Coaches Lose All Visibility',
                body: 'After the final game, coaches have no way to monitor effort, track compliance, or guide development in real time. The offseason is a black box.',
              },
              {
                color: YELLOW,
                title: 'The Gap Costs You Games',
                body: 'The athletes who win championships are the ones who closed the offseason gap. Your competitors are training smart — is your roster?',
              },
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

      {/* ── For Coaches / For Athletes ─────────────────────────────────── */}
      <section style={s.audienceSection}>
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
              <Link to="/register" className="land-cta-orange" style={{ ...s.audienceCta, background: ORANGE, boxShadow: `0 4px 20px ${ORANGE}44` }}>
                Start as a Coach
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
              <p style={{ ...s.cardBody, marginBottom: 24 }}>
                Get a structured program built for your position, track every workout, and give recruiters tangible proof of your offseason commitment.
              </p>
              <ul style={s.benefitList}>
                {ATHLETE_BENEFITS.map((b, i) => (
                  <li key={i} style={s.benefitItem}>
                    <CheckIcon color={BLUE} />
                    <span style={s.benefitText}>{b}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="land-cta-blue" style={{ ...s.audienceCta, background: 'transparent', color: BLUE, border: `1.5px solid ${BLUE}66` }}>
                Start as an Athlete
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
            <div style={s.ctaBtns}>
              <Link to="/register" className="land-cta-orange" style={{ ...s.ctaPrimary, fontSize: 16, padding: '15px 40px' }}>
                Create Your Free Account
              </Link>
              <Link to="/login" className="land-cta-ghost" style={{ ...s.ctaSecondary, fontSize: 15 }}>
                Sign In <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerLeft}>
            <img src={LOGO} alt="Offseaz" style={{ height: 26, display: 'block', marginBottom: 10 }} />
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

  // ── Navbar
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 56px)', height: 64,
    background: 'rgba(10,10,10,0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
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

  // ── Utility
  glow: {
    position: 'absolute', pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%', zIndex: 0,
  },
  inner: { maxWidth: 1120, margin: '0 auto' },

  // ── Hero
  hero: {
    position: 'relative', overflow: 'hidden',
    minHeight: '100vh',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    paddingTop: 64,
  },
  heroInner: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 900,
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
  ctaPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 30px', fontSize: 15, fontWeight: 700,
    borderRadius: 10, letterSpacing: 0.1,
    background: ORANGE, color: '#fff', textDecoration: 'none',
    boxShadow: '0 4px 28px rgba(247,87,9,0.40)',
  },
  ctaSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 24px', fontSize: 15, fontWeight: 600,
    borderRadius: 10, letterSpacing: 0.1,
    background: 'transparent', color: '#888', textDecoration: 'none',
    border: '1.5px solid rgba(255,255,255,0.12)',
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
    width: 600, height: 300, pointerEvents: 'none',
    background: 'radial-gradient(ellipse, rgba(247,87,9,0.10) 0%, transparent 65%)',
    borderRadius: '50%',
  },

  // ── Stats bar
  statsBar: {
    background: '#0F0F0F',
    borderTop: '1px solid #1A1A1A',
    borderBottom: '1px solid #1A1A1A',
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
    padding: '20px 16px',
    borderRadius: 12,
    background: '#141414', border: '1px solid #1E1E1E',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    cursor: 'default',
  },
  statValue: {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em',
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
  },
  statLabel: {
    fontSize: 12, color: '#555', letterSpacing: 0.3, textAlign: 'center', lineHeight: 1.4,
  },

  // ── Sections
  section: {
    padding: 'clamp(72px, 9vw, 120px) clamp(20px, 5vw, 56px)',
    background: '#0A0A0A',
  },
  problemSection: {
    padding: 'clamp(72px, 9vw, 120px) clamp(20px, 5vw, 56px)',
    background: '#0F0F0F',
    borderTop: '1px solid #181818',
    borderBottom: '1px solid #181818',
  },
  audienceSection: {
    padding: 'clamp(72px, 9vw, 120px) clamp(20px, 5vw, 56px)',
    background: '#0F0F0F',
    borderTop: '1px solid #181818',
  },
  sectionHead: {
    maxWidth: 600, marginBottom: 56,
  },
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
  sectionP: {
    fontSize: 17, color: '#666', lineHeight: 1.8,
  },

  // ── Problem cards
  problemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px,100%), 1fr))',
    gap: 16,
  },
  problemCard: {
    background: '#141414', border: '1px solid #202020',
    borderRadius: 16, padding: '28px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
    cursor: 'default',
  },

  // ── Feature cards
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
  featureNum: {
    fontSize: 13, fontWeight: 800, letterSpacing: 1,
  },
  featureTag: {
    fontSize: 11, fontWeight: 700, letterSpacing: 1.8,
    textTransform: 'uppercase', marginBottom: 10, display: 'block',
  },
  featureTitle: {
    fontSize: 17, fontWeight: 700, color: '#E8E8E8', marginBottom: 12,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    letterSpacing: '-0.01em',
  },
  cardTitle: {
    fontSize: 17, fontWeight: 700, color: '#E8E8E8', marginBottom: 10,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    letterSpacing: '-0.01em',
  },
  cardBody: {
    fontSize: 14, color: '#666', lineHeight: 1.75,
  },

  // ── Audience
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
  audienceIcon: {
    width: 44, height: 44, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  audiencePill: {
    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    textTransform: 'uppercase', padding: '5px 12px', borderRadius: 100,
  },
  audienceTitle: {
    fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 800,
    color: '#E8E8E8', marginBottom: 14,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    letterSpacing: '-0.02em', lineHeight: 1.25,
  },
  benefitList: {
    listStyle: 'none', padding: 0, margin: '0 0 32px',
    display: 'flex', flexDirection: 'column', gap: 11, flex: 1,
  },
  benefitItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
  },
  benefitText: { fontSize: 14, color: '#888', lineHeight: 1.55 },
  audienceCta: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px 24px', fontSize: 14, fontWeight: 700,
    borderRadius: 10, textDecoration: 'none', letterSpacing: 0.1,
    alignSelf: 'flex-start',
  },

  // ── CTA section
  ctaSection: {
    position: 'relative', overflow: 'hidden',
    padding: 'clamp(80px, 10vw, 140px) clamp(20px, 5vw, 56px)',
    background: '#0A0A0A',
    borderTop: '1px solid #181818',
  },
  ctaInner: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },
  ctaHeadline: {
    fontSize: 'clamp(30px, 5vw, 58px)',
    fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em',
    color: '#EFEFEF', marginBottom: 20,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
  },
  ctaSub: {
    fontSize: 17, color: '#666', lineHeight: 1.75,
    maxWidth: 520, marginBottom: 44,
  },
  ctaBtns: {
    display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
  },

  // ── Footer
  footer: {
    padding: 'clamp(40px, 5vw, 64px) clamp(20px, 5vw, 56px) clamp(24px, 3vw, 36px)',
    background: '#080808',
    borderTop: '1px solid #141414',
  },
  footerInner: {
    maxWidth: 1120, margin: '0 auto',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 24, marginBottom: 40,
  },
  footerLeft: { display: 'flex', flexDirection: 'column' },
  footerTagline: { fontSize: 13, color: '#3A3A3A', margin: 0 },
  footerRight: { display: 'flex', gap: 24, alignItems: 'center' },
  footerLink: {
    fontSize: 13, color: '#3A3A3A', textDecoration: 'none', fontWeight: 500,
  },
  footerBottom: {
    maxWidth: 1120, margin: '0 auto',
    paddingTop: 20, borderTop: '1px solid #141414',
  },
  footerCopy: { fontSize: 12, color: '#2A2A2A', margin: 0 },
}
