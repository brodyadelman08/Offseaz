import { Link } from 'react-router-dom'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

const LOGO = '/OFFSEAZ_LOGO_PNG.png'

export default function About() {
  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <Link to="/" style={s.navLogo}>
          <img src="/OFFSEAZ_LOGO_PNG.png" alt="Offseaz" style={{ height: 36 }} />
        </Link>
        <div style={s.navLinks}>
          <Link to="/contact" style={s.navLink}>Contact</Link>
          <Link to="/login" style={s.navBtn}>Sign In</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <img src={LOGO} alt="Offseaz" style={s.logoImg} />
        <p style={s.tagline}>The offseason platform for serious teams.</p>
      </section>

      {/* Mission */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <h2 style={s.h2}>What We're Building</h2>
          <p style={s.body}>
            Offseaz is a training platform built for coaches and athletes who treat the offseason as
            seriously as the season itself. We give coaches the tools to build structured, week-by-week
            training blueprints — then put those programs directly in athletes' hands with zero friction.
          </p>
          <p style={s.body}>
            The gap between a coach's vision and what an athlete actually does in the gym is too wide.
            Programs get lost in group chats. Athletes train blind. Coaches have no visibility.
            Offseaz closes that gap.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section style={{ ...s.section, background: 'rgba(255,255,255,0.03)' }}>
        <div style={s.sectionInner}>
          <h2 style={s.h2}>Built Around Three Pillars</h2>
          <div style={s.pillars}>
            <div style={s.pillar}>
              <div style={{ ...s.pillarDot, background: ORANGE }} />
              <h3 style={s.pillarTitle}>Blueprint Builder</h3>
              <p style={s.pillarBody}>
                Coaches design multi-week training programs with day-by-day sessions, exercise progressions,
                and percentage-based lifts — all in a purpose-built editor.
              </p>
            </div>
            <div style={s.pillar}>
              <div style={{ ...s.pillarDot, background: BLUE }} />
              <h3 style={s.pillarTitle}>Athlete Experience</h3>
              <p style={s.pillarBody}>
                Athletes see exactly what to do each week, get auto-generated plans from their survey
                while they wait, and track their lifting PRs over time.
              </p>
            </div>
            <div style={s.pillar}>
              <div style={{ ...s.pillarDot, background: YELLOW }} />
              <h3 style={s.pillarTitle}>Coach Visibility</h3>
              <p style={s.pillarBody}>
                Coaches see the full roster at a glance — who has a plan, who doesn't, individual
                progress reports, and team activity feeds all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <h2 style={s.h2}>Why Offseaz Exists</h2>
          <p style={s.body}>
            Most athletes have a coach they trust but no real structure for the months between seasons.
            Most coaches have great ideas but no efficient way to deliver individualized programs to a
            full roster. Offseaz was built because that problem deserved a real solution — not a
            spreadsheet, not a PDF, not another generic fitness app.
          </p>
          <p style={s.body}>
            We're building for the teams who are serious about the work that happens when the season ends —
            because that's where the real improvement comes from.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={s.cta}>
        <h2 style={s.ctaTitle}>Ready to build your offseason?</h2>
        <div style={s.ctaButtons}>
          <Link to="/register" style={{ ...s.ctaBtn, background: ORANGE, boxShadow: `0 4px 20px rgba(247,87,9,0.35)` }}>
            Get Started Free
          </Link>
          <Link to="/contact" style={{ ...s.ctaBtn, background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: '#ccc' }}>
            Contact Us
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <Link to="/" style={s.footerLink}>Home</Link>
        <span style={s.dot}>·</span>
        <Link to="/contact" style={s.footerLink}>Contact</Link>
        <span style={s.dot}>·</span>
        <Link to="/privacy" style={s.footerLink}>Privacy</Link>
        <span style={s.dot}>·</span>
        <Link to="/terms" style={s.footerLink}>Terms</Link>
        <p style={s.copy}>© {new Date().getFullYear()} Offseaz. All rights reserved.</p>
      </footer>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#0A0A0A',
    color: '#EFEFEF',
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },

  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 56px)', height: 64,
    background: 'rgba(10,10,10,0.92)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  navLogo: { display: 'flex', alignItems: 'center', textDecoration: 'none' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 20 },
  navLink: { fontSize: 14, fontWeight: 600, color: '#aaa', textDecoration: 'none' },
  navBtn: {
    fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none',
    background: ORANGE, padding: '7px 18px', borderRadius: 10,
    boxShadow: '0 2px 10px rgba(247,87,9,0.3)',
  },

  hero: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '80px 24px 56px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  logoImg: { width: 'min(520px, 80vw)', height: 'auto', objectFit: 'contain', marginBottom: 28 },
  tagline: { fontSize: 'clamp(18px, 3vw, 24px)', color: '#888', fontWeight: 500, textAlign: 'center', margin: 0 },

  section: { padding: 'clamp(56px, 8vw, 96px) 24px' },
  sectionInner: { maxWidth: 760, margin: '0 auto' },
  h2: { fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 700, color: '#fff', margin: '0 0 24px', lineHeight: 1.2 },
  body: { fontSize: 'clamp(15px, 2vw, 17px)', color: '#aaa', lineHeight: 1.8, margin: '0 0 18px' },

  pillars: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, marginTop: 8 },
  pillar: { display: 'flex', flexDirection: 'column', gap: 10 },
  pillarDot: { width: 10, height: 10, borderRadius: '50%' },
  pillarTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  pillarBody: { fontSize: 15, color: '#888', lineHeight: 1.7, margin: 0 },

  cta: {
    padding: 'clamp(64px, 8vw, 100px) 24px',
    textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  ctaTitle: { fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: '#fff', margin: '0 0 32px' },
  ctaButtons: { display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  ctaBtn: {
    display: 'inline-block', textDecoration: 'none',
    padding: '14px 32px', borderRadius: 14,
    fontSize: 16, fontWeight: 700, color: '#fff',
    transition: 'opacity 0.2s',
  },

  footer: {
    padding: '36px 24px', textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  footerLink: { fontSize: 13, color: '#555', textDecoration: 'none' },
  dot: { color: '#333', fontSize: 13 },
  copy: { width: '100%', fontSize: 12, color: '#333', margin: '12px 0 0' },
}
