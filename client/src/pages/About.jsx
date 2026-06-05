import { Link } from 'react-router-dom'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const STATS = [
  { value: '3 Years',  label: 'Varsity Baseball',          color: ORANGE },
  { value: '2× Team',  label: 'Captain',                   color: BLUE   },
  { value: 'MN ExCEL', label: 'Award Winner',              color: YELLOW },
  { value: 'Schulze',  label: 'Innovation Scholar',        color: ORANGE },
]

const PILLARS = [
  { name: 'Assessment',    color: ORANGE, desc: 'Athletes complete a detailed needs-analysis covering sport, position, goals, injury history, and available equipment — giving coaches the full picture before writing a single rep.' },
  { name: 'Blueprint',     color: BLUE,   desc: 'Build periodized training plans with sport-specific templates, percentage-based loading, and week-by-week progression that scales with every athlete on your roster.' },
  { name: 'Accountability',color: YELLOW, desc: 'Athletes log every session with effort scores and notes. Coaches see real-time completion rates, flagged injuries, and roster-wide accountability at a glance.' },
  { name: 'Coach Connect', color: ORANGE, desc: 'Keep momentum going all offseason. Send team announcements or direct messages — answer questions, give feedback, and stay connected from last game to first practice.' },
]

export default function About() {
  return (
    <div style={s.page}>

      {/* ── Sticky nav ──────────────────────────────────────────────────────── */}
      <nav style={s.nav}>
        <Link to="/" style={s.navLogo}>
          <img src="/OFFSEAZ_LOGO_PNG.png" alt="Offseaz" style={{ height: 34 }} />
        </Link>
        <div style={s.navLinks}>
          <Link to="/contact" style={s.navLink}>Contact</Link>
          <Link to="/login"   style={s.navBtn}>Sign In</Link>
        </div>
      </nav>

      {/* ── Hero — deadlift photo background ─────────────────────────────── */}
      <section style={s.hero}>
        <img src="/about-deadlift.jpg" alt="" style={s.heroBg} />
        <div style={s.heroOverlay} />
        <div style={s.heroContent}>
          <img src="/OFFSEAZ_LOGO_PNG.png" alt="Offseaz" style={s.heroLogo} />
          <h1 style={s.heroHeadline}>
            Built by an Athlete.<br />
            <span style={s.heroAccent}>Built for Athletes.</span>
          </h1>
          <p style={s.heroSub}>The offseason platform for serious teams.</p>
        </div>
      </section>

      {/* ── Founder section ──────────────────────────────────────────────── */}
      <section style={s.founderSection}>
        <div style={s.founderInner}>

          {/* Headshot */}
          <div style={s.founderImgCol}>
            <div style={s.founderImgWrap}>
              <img src="/about-headshot.jpg" alt="Brody Adelman" style={s.founderImg} />
              <div style={s.founderImgRing} />
            </div>
            <p style={s.founderName}>Brody Adelman</p>
            <p style={s.founderTitle}>Founder, Offseaz</p>
          </div>

          {/* Story */}
          <div style={s.founderTextCol}>
            <span style={s.founderTag}>The Founder</span>
            <h2 style={s.founderHeading}>From the weight room to the platform.</h2>
            <p style={s.founderBody}>
              Brody Adelman is a multi-sport athlete from Alexandria, Minnesota. A two-year
              varsity baseball captain, All-Star North Team selection, MN ExCEL Award winner,
              and National Honor Society member, Brody finished his high school career with a
              565 lb trap bar deadlift, 415 lb squat for 5 reps, 405 lb reverse lunge for 5
              reps, and a 245 lb bench press.
            </p>
            <p style={s.founderBody}>
              He started on varsity as a sophomore shortstop and went on to earn his team's
              captaincy for two straight years. He finished 2nd at State in DECA and qualified
              for ICDC in Atlanta. He is heading to the University of St. Thomas on the
              Schulze Innovation Scholarship.
            </p>
            <p style={s.founderBody}>
              Offseaz was built because Brody watched firsthand how unstructured and
              unaccountable offseason training was for most high school athletes. No plan.
              No visibility. No accountability. He built the platform he wished he had —
              sport-specific blueprints, personalized to each athlete, with coaches getting
              real-time visibility into who is actually putting in the work.
            </p>
          </div>

        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section style={s.statsSection}>
        <div style={s.statsGrid}>
          {STATS.map(({ value, label, color }) => (
            <div key={label} style={{ ...s.statCard, borderTop: `3px solid ${color}` }}>
              <span style={{ ...s.statValue, color }}>{value}</span>
              <span style={s.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Baseball action shot ─────────────────────────────────────────── */}
      <section style={s.actionSection}>
        <img src="/about-baseball.webp" alt="Brody batting" style={s.actionBg} />
        <div style={s.actionOverlay} />
        <div style={s.actionContent}>
          <p style={s.quoteMarks}>"</p>
          <p style={s.quoteText}>Champions are made in the Offseaz.</p>
          <div style={s.quoteLine} />
          <p style={s.quoteAttrib}>— Brody Adelman, Founder</p>
        </div>
      </section>

      {/* ── Mission / Pillars ────────────────────────────────────────────── */}
      <section style={s.missionSection}>
        <div style={s.missionInner}>
          <span style={s.missionTag}>Our Mission</span>
          <h2 style={s.missionHeading}>Built around four pillars.</h2>
          <p style={s.missionBody}>
            Offseaz is built around four pillars — Assessment, Blueprint, Accountability, and
            Coach Connect. Every athlete who joins gets a personalized training plan built for
            their sport, their position, and their goals. Every coach gets real-time visibility
            into their entire roster without chasing anyone.
          </p>
          <p style={s.missionBodyBold}>
            The offseason is where champions are made. Offseaz makes sure no athlete wastes it.
          </p>

          <div style={s.pillarsGrid}>
            {PILLARS.map(({ name, color, desc }, i) => (
              <div key={name} style={s.pillarCard}>
                <div style={{ ...s.pillarNumber, color }}>0{i + 1}</div>
                <h3 style={{ ...s.pillarName, color }}>{name}</h3>
                <p style={s.pillarDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={s.ctaSection}>
        <div style={s.ctaInner}>
          <h2 style={s.ctaHeading}>Ready to build your offseason?</h2>
          <p style={s.ctaSub}>
            Join coaches and athletes who are serious about the work that happens
            when the season ends.
          </p>
          <div style={s.ctaBtns}>
            <Link to="/register" style={{ ...s.ctaBtn, background: ORANGE, boxShadow: `0 6px 28px rgba(247,87,9,0.40)` }}>
              Get Started as Coach
            </Link>
            <Link to="/register" style={{ ...s.ctaBtn, background: BLUE, boxShadow: `0 6px 28px rgba(48,142,189,0.35)` }}>
              Get Started as Athlete
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <img src="/OFFSEAZ_LOGO_PNG.png" alt="Offseaz" style={s.footerLogo} />
        <div style={s.footerLinks}>
          <Link to="/"        style={s.footerLink}>Home</Link>
          <span style={s.dot}>·</span>
          <Link to="/about"   style={s.footerLink}>About</Link>
          <span style={s.dot}>·</span>
          <Link to="/contact" style={s.footerLink}>Contact</Link>
          <span style={s.dot}>·</span>
          <Link to="/privacy" style={s.footerLink}>Privacy</Link>
          <span style={s.dot}>·</span>
          <Link to="/terms"   style={s.footerLink}>Terms</Link>
        </div>
        <p style={s.copy}>© {new Date().getFullYear()} Offseaz. All rights reserved.</p>
      </footer>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100vh',
    background: '#0A0A0A',
    color: '#EFEFEF',
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    overflowX: 'hidden',
  },

  // ── Nav ──────────────────────────────────────────────────────────────────
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 64px)', height: 64,
    background: 'rgba(10,10,10,0.90)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  navLogo:  { display: 'flex', alignItems: 'center', textDecoration: 'none' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 24 },
  navLink:  { fontSize: 14, fontWeight: 600, color: '#888', textDecoration: 'none' },
  navBtn: {
    fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none',
    background: ORANGE, padding: '8px 20px', borderRadius: 10,
    boxShadow: '0 2px 12px rgba(247,87,9,0.30)',
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    position: 'relative',
    minHeight: 'clamp(480px, 75vh, 720px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  heroBg: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center 30%',
    display: 'block',
  },
  heroOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.78) 60%, rgba(10,10,10,0.96) 100%)',
  },
  heroContent: {
    position: 'relative', zIndex: 2,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', padding: '0 24px',
    gap: 20,
  },
  heroLogo: {
    width: 'clamp(200px, 30vw, 380px)',
    height: 'auto', objectFit: 'contain',
    filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.6))',
  },
  heroHeadline: {
    fontSize: 'clamp(28px, 5.5vw, 58px)',
    fontWeight: 800, lineHeight: 1.1,
    color: '#fff', margin: 0,
    textShadow: '0 2px 20px rgba(0,0,0,0.5)',
    fontFamily: "'Calibri','Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif",
  },
  heroAccent: { color: ORANGE },
  heroSub: {
    fontSize: 'clamp(15px, 2.2vw, 20px)',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 400, margin: 0,
    letterSpacing: 0.3,
  },

  // ── Founder ──────────────────────────────────────────────────────────────
  founderSection: {
    padding: 'clamp(64px, 8vw, 110px) clamp(20px, 5vw, 64px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  founderInner: {
    maxWidth: 1080,
    margin: '0 auto',
    display: 'flex',
    gap: 'clamp(32px, 6vw, 80px)',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },

  // Photo column
  founderImgCol: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    flexShrink: 0, width: 'clamp(140px, 20vw, 200px)',
  },
  founderImgWrap: {
    position: 'relative',
    width: 'clamp(140px, 20vw, 200px)',
    height: 'clamp(140px, 20vw, 200px)',
    borderRadius: '50%',
    overflow: 'hidden',
    boxShadow: `0 0 0 3px ${ORANGE}, 0 8px 40px rgba(247,87,9,0.25)`,
  },
  founderImg: {
    width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center top',
    display: 'block',
  },
  founderImgRing: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.08)',
  },
  founderName: {
    fontSize: 15, fontWeight: 700, color: '#fff', margin: '16px 0 4px',
    textAlign: 'center',
  },
  founderTitle: {
    fontSize: 12, fontWeight: 600, color: ORANGE, margin: 0,
    textTransform: 'uppercase', letterSpacing: 1,
    textAlign: 'center',
  },

  // Text column
  founderTextCol: {
    flex: 1,
    minWidth: 260,
  },
  founderTag: {
    display: 'inline-block',
    fontSize: 11, fontWeight: 800, letterSpacing: 1.4,
    textTransform: 'uppercase', color: ORANGE,
    background: 'rgba(247,87,9,0.10)',
    border: '1px solid rgba(247,87,9,0.25)',
    padding: '4px 12px', borderRadius: 20,
    marginBottom: 16,
  },
  founderHeading: {
    fontSize: 'clamp(22px, 3.5vw, 34px)',
    fontWeight: 800, color: '#fff', margin: '0 0 24px',
    lineHeight: 1.2,
    fontFamily: "'Calibri','Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif",
  },
  founderBody: {
    fontSize: 'clamp(14px, 1.6vw, 16px)',
    color: '#AAAAAA', lineHeight: 1.8, margin: '0 0 16px',
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  statsSection: {
    padding: 'clamp(40px, 6vw, 64px) clamp(20px, 5vw, 64px)',
    background: '#111',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  statsGrid: {
    maxWidth: 960,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 20,
  },
  statCard: {
    background: '#171717',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '24px 20px',
    display: 'flex', flexDirection: 'column', gap: 6,
    boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
  },
  statValue: {
    fontSize: 'clamp(22px, 3vw, 28px)',
    fontWeight: 800, lineHeight: 1,
    fontFamily: "'Calibri','Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif",
  },
  statLabel: {
    fontSize: 13, fontWeight: 600, color: '#666',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },

  // ── Baseball action ───────────────────────────────────────────────────────
  actionSection: {
    position: 'relative',
    minHeight: 'clamp(360px, 55vh, 600px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  actionBg: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center 25%',
    display: 'block',
  },
  actionOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.60) 50%, rgba(10,10,10,0.80) 100%)',
  },
  actionContent: {
    position: 'relative', zIndex: 2,
    textAlign: 'center', padding: '0 clamp(20px, 6vw, 80px)',
    maxWidth: 700,
  },
  quoteMarks: {
    fontSize: 80, lineHeight: 0.6, color: ORANGE,
    margin: '0 0 8px', fontFamily: 'Georgia, serif',
    opacity: 0.9,
  },
  quoteText: {
    fontSize: 'clamp(22px, 4.5vw, 44px)',
    fontWeight: 800, color: '#fff', margin: '0 0 20px',
    lineHeight: 1.15,
    textShadow: '0 2px 24px rgba(0,0,0,0.5)',
    fontFamily: "'Calibri','Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif",
  },
  quoteLine: {
    width: 48, height: 3, background: ORANGE,
    borderRadius: 2, margin: '0 auto 14px',
  },
  quoteAttrib: {
    fontSize: 14, fontWeight: 600,
    color: 'rgba(255,255,255,0.55)', margin: 0, letterSpacing: 0.3,
  },

  // ── Mission ───────────────────────────────────────────────────────────────
  missionSection: {
    padding: 'clamp(64px, 8vw, 110px) clamp(20px, 5vw, 64px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  missionInner: { maxWidth: 1080, margin: '0 auto' },
  missionTag: {
    display: 'inline-block',
    fontSize: 11, fontWeight: 800, letterSpacing: 1.4,
    textTransform: 'uppercase', color: BLUE,
    background: 'rgba(48,142,189,0.10)',
    border: '1px solid rgba(48,142,189,0.25)',
    padding: '4px 12px', borderRadius: 20,
    marginBottom: 16,
  },
  missionHeading: {
    fontSize: 'clamp(24px, 4vw, 38px)',
    fontWeight: 800, color: '#fff', margin: '0 0 24px',
    lineHeight: 1.15,
    fontFamily: "'Calibri','Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif",
  },
  missionBody: {
    fontSize: 'clamp(15px, 1.8vw, 17px)',
    color: '#AAAAAA', lineHeight: 1.8, margin: '0 0 16px',
    maxWidth: 780,
  },
  missionBodyBold: {
    fontSize: 'clamp(16px, 1.9vw, 19px)',
    color: '#fff', fontWeight: 700,
    lineHeight: 1.6, margin: '0 0 56px',
    maxWidth: 780,
  },
  pillarsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24,
  },
  pillarCard: {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: '28px 24px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.22)',
    transition: 'border-color 0.2s',
  },
  pillarNumber: {
    fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
    marginBottom: 10,
  },
  pillarName: {
    fontSize: 18, fontWeight: 700, margin: '0 0 10px',
    fontFamily: "'Calibri','Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif",
  },
  pillarDesc: {
    fontSize: 14, color: '#888', lineHeight: 1.7, margin: 0,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  ctaSection: {
    padding: 'clamp(72px, 9vw, 120px) 24px',
    textAlign: 'center',
    background: 'linear-gradient(180deg, #0A0A0A 0%, #111 100%)',
  },
  ctaInner: { maxWidth: 640, margin: '0 auto' },
  ctaHeading: {
    fontSize: 'clamp(24px, 4vw, 38px)',
    fontWeight: 800, color: '#fff', margin: '0 0 14px',
    fontFamily: "'Calibri','Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif",
  },
  ctaSub: {
    fontSize: 'clamp(14px, 1.8vw, 17px)',
    color: '#888', lineHeight: 1.7, margin: '0 0 40px',
  },
  ctaBtns: {
    display: 'flex', justifyContent: 'center',
    gap: 16, flexWrap: 'wrap',
  },
  ctaBtn: {
    display: 'inline-block', textDecoration: 'none',
    padding: 'clamp(12px, 1.4vw, 16px) clamp(24px, 3vw, 40px)',
    borderRadius: 14, fontSize: 'clamp(14px, 1.5vw, 16px)',
    fontWeight: 700, color: '#fff',
    transition: 'opacity 0.18s, transform 0.15s',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    padding: '44px 24px',
    textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
  },
  footerLogo: { height: 28, opacity: 0.7 },
  footerLinks: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    alignItems: 'center', gap: 8,
  },
  footerLink: { fontSize: 13, color: '#555', textDecoration: 'none' },
  dot:  { color: '#333', fontSize: 13 },
  copy: { fontSize: 12, color: '#333', margin: 0 },
}
