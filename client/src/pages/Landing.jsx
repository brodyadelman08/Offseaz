import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGO = '/Offseaz_logo__DARK_-removebg-preview.png'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const PURPLE = '#8B5CF6'

const PILLARS = [
  {
    n: '01', color: ORANGE, label: 'Assessment',
    title: 'Start with the Full Picture',
    body: 'Athletes complete a detailed intake covering goals, position, injury history, and available equipment — giving coaches the context they need before writing a single rep.',
  },
  {
    n: '02', color: BLUE, label: 'Blueprint',
    title: 'Build Sport-Specific Programs',
    body: 'Coaches create periodized training plans with sport and position-tailored templates. Week-by-week progression, percentage-based loading, and auto-generated workouts.',
  },
  {
    n: '03', color: YELLOW, label: 'Accountability',
    title: 'Track Every Session',
    body: 'Athletes log each workout with effort scores and notes. Coaches see live completion rates, flagged injuries, and roster-wide accountability at a glance.',
  },
  {
    n: '04', color: PURPLE, label: 'Coach Connect',
    title: 'Stay Connected All Offseason',
    body: 'Direct messaging keeps coaches and athletes in sync. Answer questions, send encouragement, and keep momentum going from the last game to the first practice.',
  },
]

const PROBLEMS = [
  {
    n: '01', color: ORANGE,
    title: 'Athletes Drift Without Structure',
    body: 'No plan means no progress. Athletes train randomly or not at all, showing up to the next season less prepared than they could have been.',
  },
  {
    n: '02', color: BLUE,
    title: 'Coaches Lose Visibility',
    body: "After the final whistle, coaches have no way to monitor effort, track compliance, or guide development in real time.",
  },
  {
    n: '03', color: YELLOW,
    title: 'The Gap Costs You Games',
    body: "The athletes who close the offseason gap are the ones who win. Your competitors are training smart — are yours?",
  },
]

export default function Landing() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (!loading && session && profile) {
      navigate(profile.role === 'coach' ? '/coach' : '/athlete', { replace: true })
    }
  }, [loading, session, profile, navigate])

  return (
    <div style={s.root}>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav style={s.nav}>
        <img src={LOGO} alt="Offseaz" style={{ height: 34, display: 'block' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/login" style={s.navLink}>Sign In</Link>
          <Link to="/register" style={s.navCta}>Get Started</Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={s.hero}>
        <div style={s.heroGlow} />
        <div style={s.heroInner}>
          <div style={s.logoBadge}>
            <img
              src="/Offseaz_logo__DARK_-removebg-preview.png"
              alt="Offseaz"
              style={s.logoImg}
            />
          </div>

          <h1 style={s.headline}>
            Champions Are Made<br />
            <span style={{ color: ORANGE, display: 'inline-flex', alignItems: 'center', gap: 16, lineHeight: 1 }}>
              in the
              <img src={LOGO} alt="Offseaz" style={{ height: '0.85em', display: 'block' }} />
            </span>
          </h1>

          <p style={s.heroSub}>
            The all-in-one platform connecting coaches and athletes through the offseason — with structured programs, live accountability, and sport-specific training built for real results.
          </p>

          <div style={s.heroCtas}>
            <Link to="/register" style={s.ctaOrange}>Get Started as Coach</Link>
            <Link to="/register" style={s.ctaBlue}>Get Started as Athlete</Link>
          </div>

          {/* Scroll nudge */}
          <div style={s.scrollNudge}>
            <span style={s.scrollLine} />
          </div>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <section style={s.problemSection}>
        <div style={s.inner}>
          <p style={s.eyebrow}>The Problem</p>
          <h2 style={s.sectionH2}>The Offseason is Broken</h2>
          <p style={s.sectionP}>
            Between the final game and the first practice, most athletes are on their own — and most coaches are in the dark.
          </p>

          <div style={s.problemGrid}>
            {PROBLEMS.map(item => (
              <div key={item.n} style={s.problemCard}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: item.color, marginBottom: 18 }}>
                  {item.n}
                </div>
                <h3 style={s.problemTitle}>{item.title}</h3>
                <p style={s.cardBody}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section style={s.section}>
        <div style={s.inner}>
          <p style={s.eyebrow}>How It Works</p>
          <h2 style={s.sectionH2}>Four Pillars. One Platform.</h2>
          <p style={s.sectionP}>
            Everything a coach needs to run an elite offseason program — and everything an athlete needs to execute one.
          </p>

          <div style={s.pillarsGrid}>
            {PILLARS.map(p => (
              <div
                key={p.n}
                style={{
                  ...s.pillarCard,
                  borderTop: `3px solid ${p.color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 40, height: 40, borderRadius: 10,
                    fontSize: 12, fontWeight: 800, letterSpacing: 1,
                    color: p.color, background: p.color + '1A', border: `1px solid ${p.color}40`,
                  }}>
                    {p.n}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: p.color }}>
                    {p.label}
                  </span>
                </div>
                <h3 style={s.pillarTitle}>{p.title}</h3>
                <p style={s.cardBody}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section style={s.ctaSection}>
        <div style={s.ctaGlow} />
        <div style={{ ...s.inner, position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <p style={{ ...s.eyebrow, textAlign: 'center', marginBottom: 24 }}>Get Started Today</p>
          <h2 style={{ ...s.sectionH2, fontSize: 'clamp(30px, 5vw, 52px)', textAlign: 'center' }}>
            Ready to build your<br />offseason program?
          </h2>
          <p style={{ fontSize: 17, color: '#888', lineHeight: 1.7, maxWidth: 500, margin: '20px auto 44px' }}>
            Join coaches and athletes who are turning the offseason into their biggest competitive advantage.
          </p>
          <Link to="/register" style={s.bigCta}>
            Create Your Free Account →
          </Link>
          <p style={{ marginTop: 22, fontSize: 14, color: '#555' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <img src={LOGO} alt="Offseaz" style={{ height: 26, display: 'block' }} />
          <p style={s.footerText}>
            © {new Date().getFullYear()} Offseaz · Built for coaches who take the offseason seriously.
          </p>
        </div>
      </footer>

    </div>
  )
}

const s = {
  root: {
    background: '#0F0F0F',
    color: '#EFEFEF',
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    overflowX: 'hidden',
  },

  // ── Navbar
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 56px)', height: 66,
    background: 'rgba(15,15,15,0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  navLink: {
    color: '#AAAAAA', fontWeight: 600, fontSize: 14,
    textDecoration: 'none', padding: '8px 12px', borderRadius: 7,
  },
  navCta: {
    color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
    padding: '9px 20px', borderRadius: 8, background: ORANGE,
    boxShadow: `0 2px 12px rgba(247,87,9,0.30)`,
  },

  // ── Hero
  hero: {
    position: 'relative', overflow: 'hidden',
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    paddingTop: 66,
  },
  heroGlow: {
    position: 'absolute', top: '45%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 900, height: 900, pointerEvents: 'none',
    background: 'radial-gradient(ellipse, rgba(247,87,9,0.16) 0%, rgba(48,142,189,0.07) 45%, transparent 68%)',
  },
  heroInner: {
    position: 'relative', zIndex: 1, textAlign: 'center',
    maxWidth: 820, padding: '60px clamp(16px, 5vw, 40px) 80px', margin: '0 auto',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  logoBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(247,87,9,0.22) 0%, rgba(48,142,189,0.12) 100%)',
    border: '1px solid rgba(247,87,9,0.28)',
    borderRadius: 22, padding: '18px 28px', marginBottom: 40,
    boxShadow: '0 0 80px rgba(247,87,9,0.10)',
  },
  logoImg: { height: 68, display: 'block' },
  headline: {
    fontSize: 'clamp(34px, 6vw, 72px)',
    fontWeight: 900, lineHeight: 1.09, letterSpacing: -2,
    color: '#EFEFEF', marginBottom: 24,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
  },
  heroSub: {
    fontSize: 'clamp(15px, 2vw, 18px)',
    color: '#888', lineHeight: 1.75,
    maxWidth: 600, marginBottom: 44,
  },
  heroCtas: {
    display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
  },
  ctaOrange: {
    display: 'inline-block', padding: '14px 28px',
    fontSize: 15, fontWeight: 700, borderRadius: 10, letterSpacing: 0.2,
    background: ORANGE, color: '#fff', textDecoration: 'none',
    boxShadow: '0 4px 24px rgba(247,87,9,0.38)',
  },
  ctaBlue: {
    display: 'inline-block', padding: '14px 28px',
    fontSize: 15, fontWeight: 700, borderRadius: 10, letterSpacing: 0.2,
    background: 'transparent', color: BLUE, textDecoration: 'none',
    border: `1.5px solid ${BLUE}`,
  },
  scrollNudge: {
    marginTop: 64, display: 'flex', justifyContent: 'center',
  },
  scrollLine: {
    display: 'block', width: 1, height: 52,
    background: 'linear-gradient(to bottom, rgba(247,87,9,0.5), transparent)',
  },

  // ── Shared section base
  section: {
    padding: 'clamp(60px, 8vw, 112px) clamp(16px, 5vw, 48px)',
    background: '#0F0F0F',
  },
  inner: { maxWidth: 1120, margin: '0 auto' },
  eyebrow: {
    fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
    color: ORANGE, textTransform: 'uppercase', marginBottom: 14, display: 'block',
  },
  sectionH2: {
    fontSize: 'clamp(26px, 4vw, 48px)',
    fontWeight: 800, letterSpacing: -0.5, color: '#EFEFEF', marginBottom: 14,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
  },
  sectionP: {
    fontSize: 17, color: '#777', lineHeight: 1.75,
    maxWidth: 580, marginBottom: 56,
  },

  // ── Problem section
  problemSection: {
    padding: 'clamp(60px, 8vw, 112px) clamp(16px, 5vw, 48px)',
    background: '#111111',
    borderTop: '1px solid #1D1D1D',
    borderBottom: '1px solid #1D1D1D',
  },
  problemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
  },
  problemCard: {
    background: '#171717', border: '1px solid #252525',
    borderRadius: 16, padding: '32px 28px',
  },
  problemTitle: {
    fontSize: 18, fontWeight: 700, color: '#EFEFEF', marginBottom: 12,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif", letterSpacing: -0.2,
  },
  cardBody: { fontSize: 14, color: '#777', lineHeight: 1.75 },

  // ── How It Works
  pillarsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 20,
  },
  pillarCard: {
    background: '#151515', border: '1px solid #242424',
    borderRadius: 16, padding: '30px 26px',
  },
  pillarTitle: {
    fontSize: 17, fontWeight: 700, color: '#EFEFEF', marginBottom: 12,
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif", letterSpacing: -0.2,
  },

  // ── Final CTA
  ctaSection: {
    position: 'relative', overflow: 'hidden',
    padding: 'clamp(80px, 10vw, 130px) clamp(16px, 5vw, 48px)',
    background: '#111111',
    borderTop: '1px solid #1D1D1D',
  },
  ctaGlow: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800, height: 800, pointerEvents: 'none',
    background: 'radial-gradient(ellipse, rgba(247,87,9,0.14) 0%, transparent 60%)',
  },
  bigCta: {
    display: 'inline-block', padding: '17px 40px',
    fontSize: 17, fontWeight: 800, borderRadius: 12, letterSpacing: 0.3,
    background: ORANGE, color: '#fff', textDecoration: 'none',
    boxShadow: '0 6px 36px rgba(247,87,9,0.42)',
  },

  // ── Footer
  footer: {
    padding: '36px clamp(16px, 5vw, 56px)',
    borderTop: '1px solid #181818',
    background: '#0A0A0A',
  },
  footerInner: {
    maxWidth: 1120, margin: '0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12,
  },
  footerText: { fontSize: 13, color: '#3A3A3A', margin: 0 },
}
