import { Link } from 'react-router-dom'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const STATS = [
  { value: '3 Years',  label: 'Varsity Baseball',     color: ORANGE },
  { value: '2× Team',  label: 'Captain',               color: BLUE   },
  { value: 'MN ExCEL', label: 'Award Winner',          color: YELLOW },
  { value: 'Schulze',  label: 'Innovation Scholar',    color: ORANGE },
]

const PILLARS = [
  {
    num: '01', name: 'Assessment', color: ORANGE,
    desc: "Athletes complete a detailed needs-analysis covering sport, position, goals, injury history, and available equipment — giving coaches the full picture before writing a single rep.",
  },
  {
    num: '02', name: 'Blueprint', color: BLUE,
    desc: "Build periodized training plans with sport-specific templates, percentage-based loading, and week-by-week progression that scales with every athlete on the roster.",
  },
  {
    num: '03', name: 'Accountability', color: YELLOW,
    desc: "Athletes log every session with effort scores and notes. Coaches see real-time completion rates, flagged injuries, and roster-wide accountability at a glance.",
  },
  {
    num: '04', name: 'Coach Connect', color: ORANGE,
    desc: "Keep the whole team aligned all offseason. Send announcements or direct messages — answer questions, give feedback, and stay connected from last game to first practice.",
  },
]

export default function About() {

  return (
    <div style={s.page}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={s.nav}>
        <Link to="/" style={s.navLogo}>
          <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" className="logo-nav" />
        </Link>
        <div style={s.navLinks}>
          <Link to="/contact" style={s.navLink}>Contact</Link>
          <Link to="/login"   style={s.navBtn}>Sign In</Link>
        </div>
      </nav>

      {/* ── Hero — deadlift background (bg/overlay hidden on desktop via CSS) ── */}
      <section style={s.hero}>
        <img src="/about-deadlift.webp" alt="" style={s.heroBg} className="about-hero-bg" />
        <div style={s.heroOverlay} className="about-hero-overlay" />
        <div style={s.heroContent}>
          <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={s.heroLogo} className="about-hero-logo" />
          <h1 style={s.heroHeadline}>
            Built by an Athlete.<br />
            <span style={{ color: ORANGE }}>Built for Athletes.</span>
          </h1>
          <p style={s.heroSub}>The offseason platform for serious teams.</p>
        </div>
      </section>

      {/* ── Founder section ──────────────────────────────────────────────── */}
      <section style={s.founderSection}>
        <div style={s.founderInner}>

          {/* Circle headshot */}
          <div style={s.founderPhotoCol}>
            <div style={s.founderCircle}>
              <img src="/about-headshot.webp" alt="Brody Adelman" style={s.founderImg} />
            </div>
            <p style={s.founderName}>Brody Adelman</p>
            <p style={s.founderTitle}>Founder, Offseaz</p>
          </div>

          {/* Story text */}
          <div style={s.founderTextCol}>
            <span style={s.sectionTag}>The Founder</span>
            <h2 style={s.founderHeading}>From the weight room to the platform.</h2>
            <p style={s.bodyText}>
              Brody Adelman is a multi-sport athlete from Alexandria, Minnesota. A two-year varsity
              baseball captain, All-Star North Team selection, MN ExCEL Award winner, and National
              Honor Society member, Brody finished his high school career with a 565 lb trap bar
              deadlift, 415 lb squat for 5 reps, 405 lb reverse lunge for 5 reps, and a 245 lb bench press.
            </p>
            <p style={s.bodyText}>
              He started on varsity as a sophomore shortstop and went on to earn his team's captaincy
              for two straight years. He finished 2nd at State in DECA and qualified for ICDC in Atlanta.
              He is heading to the University of St. Thomas on the Schulze Innovation Scholarship.
            </p>
            <p style={s.bodyText}>
              Offseaz was built because Brody watched firsthand how unstructured and unaccountable
              offseason training was for most high school athletes. No plan. No visibility. No
              accountability. He built the platform he wished he had — sport-specific blueprints,
              personalized to each athlete, with coaches getting real-time visibility into who is
              actually putting in the work.
            </p>
          </div>

        </div>
      </section>

      {/* ── Desktop photo grid — shown only on ≥768px via CSS ───────────── */}
      <section className="about-photo-grid">
        {[
          { src: '/about-deadlift.webp', alt: '565 lb trap bar deadlift', caption: '565 lb Trap Bar Deadlift',          pos: '50% 30%'     },
          { src: '/about-baseball.webp', alt: 'Baseball batting swing',   caption: 'Starting Shortstop — 3 Years Varsity', pos: 'center center' },
        ].map(({ src, alt, caption, pos }) => (
          <div key={caption} style={s.photoGridItem}>
            <div style={s.photoGridImgWrap}>
              <img src={src} alt={alt} style={{ ...s.photoGridImg, objectPosition: pos }} />
              <div style={s.photoGridOverlay} />
            </div>
            <p style={s.photoCaption}>{caption}</p>
          </div>
        ))}
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

      {/* ── Baseball action quote — mobile only (hidden on desktop via CSS) ── */}
      <section style={s.actionSection} className="about-action-section">
        <img src="/about-baseball.webp" alt="Brody batting" style={s.actionBg} />
        <div style={s.actionOverlay} />
        <div style={s.actionContent}>
          <p style={s.quoteMarks}>"</p>
          <p style={s.quoteText}>Champions are made in the Offseaz.</p>
          <div style={s.quoteDivider} />
          <p style={s.quoteAttrib}>— Brody Adelman, Founder</p>
        </div>
      </section>

      {/* ── Mission + Pillars ─────────────────────────────────────────────── */}
      <section style={s.missionSection}>
        <div style={s.missionInner}>
          <span style={{ ...s.sectionTag, color: BLUE, background: 'rgba(48,142,189,0.10)', border: '1px solid rgba(48,142,189,0.25)' }}>
            Our Mission
          </span>
          <h2 style={s.missionHeading}>Built around four pillars.</h2>
          <p style={s.bodyText}>
            Offseaz is built around four pillars — Assessment, Blueprint, Accountability, and
            Coach Connect. Every athlete who joins gets a personalized training plan built for
            their sport, their position, and their goals. Every coach gets real-time visibility
            into their entire roster without chasing anyone.
          </p>
          <p style={s.bodyText}>
            Offseaz brings the weight room experience into a platform your whole team can access from anywhere.
          </p>
          <p style={{ ...s.bodyText, color: '#fff', fontWeight: 600, marginBottom: 48 }}>
            The offseason is where champions are made. Offseaz makes sure no athlete wastes it.
          </p>

          <div style={s.pillarsGrid}>
            {PILLARS.map(({ num, name, color, desc }) => (
              <div key={name} style={s.pillarCard}>
                <div style={{ ...s.pillarNum, color }}>{num}</div>
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
            Join coaches and athletes who are serious about the work that happens when the season ends.
          </p>
          <div style={s.ctaBtns}>
            <Link to="/register" style={{ ...s.ctaBtn, background: ORANGE, boxShadow: '0 6px 28px rgba(247,87,9,0.40)' }}>
              Get Started as Coach
            </Link>
            <Link to="/register" style={{ ...s.ctaBtn, background: BLUE, boxShadow: '0 6px 28px rgba(48,142,189,0.35)' }}>
              Get Started as Athlete
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={{ height: 26, opacity: 0.65 }} />
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
          <span style={s.dot}>·</span>
          <a href="mailto:brody@offseaz.com" style={s.footerLink}>brody@offseaz.com</a>
        </div>
        <p style={s.copy}>© {new Date().getFullYear()} Offseaz. All rights reserved.</p>
      </footer>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight: '100vh', background: '#0A0A0A', color: '#EFEFEF', fontFamily: "Inter, system-ui, -apple-system, sans-serif", overflowX: 'hidden', paddingTop: 64 },

  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 64px)', height: 64,
    background: 'rgba(10,10,10,0.90)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  navLogo:  { display: 'flex', alignItems: 'center', textDecoration: 'none' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 24 },
  navLink:  { fontSize: 14, fontWeight: 600, color: '#888', textDecoration: 'none' },
  navBtn:   { fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: ORANGE, padding: '8px 20px', borderRadius: 10, boxShadow: '0 2px 12px rgba(247,87,9,0.30)' },

  /* Hero */
  hero: { position: 'relative', minHeight: 'clamp(480px, 75vh, 720px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  heroBg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 70%', display: 'block' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.50) 0%, rgba(10,10,10,0.75) 55%, rgba(10,10,10,0.97) 100%)' },
  heroContent: { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px', gap: 18 },
  heroLogo: { width: 'clamp(280px, 42vw, 480px)', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.6))' },
  heroHeadline: { fontSize: 'clamp(28px, 5.5vw, 58px)', fontWeight: 800, lineHeight: 1.1, color: '#fff', margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.5)', fontFamily: "'Manrope','Inter',system-ui,sans-serif" },
  heroSub: { fontSize: 'clamp(14px, 2vw, 19px)', color: 'rgba(255,255,255,0.55)', fontWeight: 400, margin: 0, letterSpacing: 0.3 },

  /* Founder */
  founderSection: { padding: 'clamp(60px, 8vw, 110px) clamp(20px, 5vw, 64px)', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  founderInner: { maxWidth: 1080, margin: '0 auto', display: 'flex', gap: 'clamp(32px, 6vw, 80px)', alignItems: 'flex-start', flexWrap: 'wrap' },
  founderPhotoCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 'clamp(140px, 18vw, 200px)' },
  founderCircle: { width: 'clamp(140px, 18vw, 200px)', height: 'clamp(140px, 18vw, 200px)', borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 3px ${ORANGE}, 0 8px 40px rgba(247,87,9,0.22)`, flexShrink: 0 },
  founderImg: { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' },
  founderName: { fontSize: 15, fontWeight: 700, color: '#fff', margin: '14px 0 3px', textAlign: 'center' },
  founderTitle: { fontSize: 11, fontWeight: 700, color: ORANGE, margin: 0, textTransform: 'uppercase', letterSpacing: 1.1, textAlign: 'center' },
  founderTextCol: { flex: 1, minWidth: 260 },
  founderHeading: { fontSize: 'clamp(21px, 3.2vw, 32px)', fontWeight: 800, color: '#fff', margin: '0 0 22px', lineHeight: 1.2, fontFamily: "'Manrope','Inter',system-ui,sans-serif" },

  /* Desktop photo grid — layout handled by CSS class, styles here */
  photoGridItem: { display: 'flex', flexDirection: 'column' },
  photoGridImgWrap: { position: 'relative', height: 600, overflow: 'hidden' },
  photoGridImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  photoGridOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,0.65) 0%, rgba(10,10,10,0.15) 45%, transparent 70%)' },
  photoCaption: {
    padding: '14px 24px', background: '#0D0D0D',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    color: '#888', fontSize: 12, fontWeight: 700,
    letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', margin: 0,
  },

  /* Stats */
  statsSection: { padding: 'clamp(36px, 5vw, 60px) clamp(20px, 5vw, 64px)', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  statsGrid: { maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 18 },
  statCard: { background: '#171717', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 5 },
  statValue: { fontSize: 'clamp(20px, 2.8vw, 28px)', fontWeight: 800, lineHeight: 1, fontFamily: "'Manrope','Inter',system-ui,sans-serif" },
  statLabel: { fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6 },

  /* Action quote */
  actionSection: { position: 'relative', minHeight: 'clamp(340px, 52vh, 580px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  actionBg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%', display: 'block' },
  actionOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(10,10,10,0.84) 0%, rgba(10,10,10,0.62) 50%, rgba(10,10,10,0.82) 100%)' },
  actionContent: { position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 clamp(20px, 6vw, 80px)', maxWidth: 680 },
  quoteMarks: { fontSize: 72, lineHeight: 0.6, color: ORANGE, margin: '0 0 6px', fontFamily: 'Georgia, serif', opacity: 0.9 },
  quoteText: { fontSize: 'clamp(22px, 4.2vw, 44px)', fontWeight: 800, color: '#fff', margin: '0 0 18px', lineHeight: 1.15, textShadow: '0 2px 24px rgba(0,0,0,0.5)', fontFamily: "'Manrope','Inter',system-ui,sans-serif" },
  quoteDivider: { width: 44, height: 3, background: ORANGE, borderRadius: 2, margin: '0 auto 12px' },
  quoteAttrib: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.50)', margin: 0, letterSpacing: 0.3 },

  /* Mission */
  missionSection: { padding: 'clamp(60px, 8vw, 110px) clamp(20px, 5vw, 64px)', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  missionInner: { maxWidth: 1080, margin: '0 auto' },
  missionHeading: { fontSize: 'clamp(23px, 3.8vw, 38px)', fontWeight: 800, color: '#fff', margin: '12px 0 22px', lineHeight: 1.15, fontFamily: "'Manrope','Inter',system-ui,sans-serif" },
  pillarsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 },
  pillarCard: { background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '26px 22px' },
  pillarNum: { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 },
  pillarName: { fontSize: 18, fontWeight: 700, margin: '0 0 10px', fontFamily: "'Manrope','Inter',system-ui,sans-serif" },
  pillarDesc: { fontSize: 14, color: '#888', lineHeight: 1.7, margin: 0 },

  /* CTA */
  ctaSection: { padding: 'clamp(68px, 9vw, 120px) 24px', textAlign: 'center', background: 'linear-gradient(180deg, #0A0A0A 0%, #111 100%)' },
  ctaInner: { maxWidth: 600, margin: '0 auto' },
  ctaHeading: { fontSize: 'clamp(23px, 3.8vw, 38px)', fontWeight: 800, color: '#fff', margin: '0 0 12px', fontFamily: "'Manrope','Inter',system-ui,sans-serif" },
  ctaSub: { fontSize: 'clamp(14px, 1.7vw, 16px)', color: '#888', lineHeight: 1.7, margin: '0 0 36px' },
  ctaBtns: { display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' },
  ctaBtn: { display: 'inline-block', textDecoration: 'none', padding: 'clamp(12px, 1.3vw, 15px) clamp(22px, 2.8vw, 36px)', borderRadius: 13, fontSize: 'clamp(14px, 1.4vw, 16px)', fontWeight: 700, color: '#fff', transition: 'opacity 0.18s' },

  /* Footer */
  footer: { padding: '40px 24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  footerLinks: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  footerLink: { fontSize: 13, color: '#555', textDecoration: 'none' },
  dot:  { color: '#333', fontSize: 13 },
  copy: { fontSize: 12, color: '#333', margin: 0 },

  /* Shared */
  sectionTag: { display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: ORANGE, background: 'rgba(247,87,9,0.10)', border: '1px solid rgba(247,87,9,0.25)', padding: '4px 12px', borderRadius: 20, marginBottom: 14 },
  bodyText: { fontSize: 'clamp(14px, 1.6vw, 16px)', color: '#AAAAAA', lineHeight: 1.8, margin: '0 0 15px' },
}
