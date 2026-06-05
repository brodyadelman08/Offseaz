import { useState } from 'react'
import { Link } from 'react-router-dom'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const LOGO   = '/Offseaz_logo__DARK_-removebg-preview.png'

// ── Inline SVG social icons ───────────────────────────────────────────────────

function XIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="1" fill={color} stroke="none" />
    </svg>
  )
}

function FacebookIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function TikTokIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.35 6.35 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.15a8.24 8.24 0 004.83 1.55V7.28a4.85 4.85 0 01-1.06-.59z" />
    </svg>
  )
}

// ── Social link data ──────────────────────────────────────────────────────────

const SOCIALS = [
  {
    label: 'X / Twitter',
    handle: '@Offseaz',
    url: 'https://x.com/Offseaz',
    Icon: XIcon,
    color: '#fff',
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.12)',
  },
  {
    label: 'Instagram',
    handle: '@0ffseaz',
    url: 'https://instagram.com/0ffseaz',
    Icon: InstagramIcon,
    color: ORANGE,
    bg: 'rgba(247,87,9,0.08)',
    border: 'rgba(247,87,9,0.22)',
  },
  {
    label: 'Facebook',
    handle: 'Offseaz',
    url: 'https://facebook.com/Offseaz',
    Icon: FacebookIcon,
    color: BLUE,
    bg: 'rgba(48,142,189,0.08)',
    border: 'rgba(48,142,189,0.22)',
  },
  {
    label: 'TikTok',
    handle: '@0ffseaz',
    url: 'https://tiktok.com/@0ffseaz',
    Icon: TikTokIcon,
    color: YELLOW,
    bg: 'rgba(240,190,36,0.08)',
    border: 'rgba(240,190,36,0.22)',
  },
]

// ── Pillar data ───────────────────────────────────────────────────────────────

const PILLARS = [
  {
    label: 'Assessment',
    color: ORANGE,
    body: "Understand each athlete's goals, strengths, limitations, and equipment before programming begins. No more one-size-fits-all.",
  },
  {
    label: 'Blueprint',
    color: BLUE,
    body: 'Coaches build week-by-week training programs personalized to sport, position, and individual needs — built to progress, not repeat.',
  },
  {
    label: 'Accountability',
    color: YELLOW,
    body: 'Track completion, effort, and lifting PRs across the entire roster so no athlete falls through the cracks.',
  },
  {
    label: 'Coach Connect',
    color: ORANGE,
    body: 'Keep the whole team aligned with messaging, feed updates, and real-time visibility into who is doing the work.',
  },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', role: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.role || !form.message.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setSubmitted(true)
  }

  return (
    <div style={s.page}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={s.nav}>
        <Link to="/" style={s.navLogo}>
          <img src="/Offseaz_logo__DARK_-removebg-preview.png" alt="Offseaz" style={{ height: 36 }} />
        </Link>
        <div style={s.navLinks}>
          <Link to="/about" style={s.navLink}>About</Link>
          <Link to="/login" style={s.navBtn}>Sign In</Link>
        </div>
      </nav>

      {/* ── About / Founder section ───────────────────────────────────────── */}
      <section style={s.aboutSection}>
        <div style={s.aboutInner}>

          {/* Logo */}
          <div style={s.logoWrap}>
            <img src={LOGO} alt="Offseaz" style={s.logoImg} />
          </div>

          {/* Headline */}
          <h1 style={s.aboutHeadline}>Built by an Athlete.<br />Built for Athletes.</h1>
          <div style={s.headlineLine} />

          {/* Founder story */}
          <div style={s.storyGrid}>
            <div style={s.storyCol}>
              <p style={s.storyText}>
                Offseaz was built by <span style={s.highlight}>Brody Adelman</span> — a multi-sport
                athlete from Alexandria, Minnesota, heading to the University of St. Thomas on the{' '}
                <span style={s.highlight}>Schulze Innovation Scholarship</span>. He finished his
                high school career with a 565 lb trap bar deadlift, 415 lb squat for 5 reps, 405 lb
                reverse lunge for 5 reps, and a 245 lb bench press.
              </p>
              <p style={s.storyText}>
                Those numbers came from years of serious offseason training and from seeing firsthand
                how much of a difference a structured program makes for an athlete who is willing to
                put in the work.
              </p>
            </div>
            <div style={s.storyCol}>
              <p style={s.storyText}>
                The platform gives coaches real visibility into what their athletes are doing in the gym —
                and gives athletes a real, structured plan to follow regardless of sport, position, or
                access to equipment.
              </p>
              <p style={s.storyText}>
                The offseason is where serious athletes separate themselves. Offseaz makes sure that work
                doesn't go to waste.
              </p>
            </div>
          </div>

          {/* Four pillars */}
          <div style={s.pillarsWrap}>
            <p style={s.pillarsLabel}>Four Pillars</p>
            <div style={s.pillarsGrid}>
              {PILLARS.map(({ label, color, body }) => (
                <div key={label} style={s.pillarCard}>
                  <div style={{ ...s.pillarDot, background: color }} />
                  <h3 style={{ ...s.pillarTitle, color }}>{label}</h3>
                  <p style={s.pillarBody}>{body}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Follow Us ────────────────────────────────────────────────────── */}
      <section style={s.socialSection}>
        <div style={s.socialInner}>
          <p style={s.socialHeading}>Follow Us</p>
          <div style={s.socialGrid}>
            {SOCIALS.map(({ label, handle, url, Icon, color, bg, border }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...s.socialCard, background: bg, borderColor: border }}
              >
                <div style={{ ...s.socialIconWrap, background: bg, border: `1px solid ${border}` }}>
                  <Icon size={24} color={color} />
                </div>
                <div style={s.socialText}>
                  <span style={{ ...s.socialPlatform, color }}>{label}</span>
                  <span style={s.socialHandle}>{handle}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact form ─────────────────────────────────────────────────── */}
      <section style={s.formSection}>
        <div style={s.formInner}>
          {submitted ? (
            <div style={s.success}>
              <div style={s.checkCircle}>✓</div>
              <h2 style={s.successTitle}>Message received!</h2>
              <p style={s.successBody}>
                Thanks for reaching out. We'll get back to you at{' '}
                <strong style={{ color: '#fff' }}>{form.email}</strong> shortly.
              </p>
              <Link to="/" style={s.backLink}>← Back to Home</Link>
            </div>
          ) : (
            <>
              <h2 style={s.formTitle}>Get in Touch</h2>
              <p style={s.formSubtitle}>
                Have a question, feedback, or a feature idea? We'd love to hear from you.
              </p>

              <form onSubmit={handleSubmit} style={s.form}>
                <div style={s.row2}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Name</label>
                    <input
                      style={s.input}
                      type="text"
                      name="name"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={handleChange}
                      autoComplete="name"
                    />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Email</label>
                    <input
                      style={s.input}
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div style={s.fieldGroup}>
                  <label style={s.label}>I am a…</label>
                  <select
                    style={{ ...s.input, color: form.role ? '#fff' : '#555' }}
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="" disabled style={{ color: '#555', background: '#111' }}>Select your role</option>
                    <option value="coach"   style={{ color: '#fff', background: '#111' }}>Coach</option>
                    <option value="athlete" style={{ color: '#fff', background: '#111' }}>Athlete</option>
                    <option value="other"   style={{ color: '#fff', background: '#111' }}>Other</option>
                  </select>
                </div>

                <div style={s.fieldGroup}>
                  <label style={s.label}>Message</label>
                  <textarea
                    style={{ ...s.input, ...s.textarea }}
                    name="message"
                    placeholder="What's on your mind?"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                  />
                </div>

                {error && <p style={s.errorMsg}>{error}</p>}

                <button type="submit" style={s.submitBtn}>
                  Send Message
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <Link to="/" style={s.footerLink}>Home</Link>
        <span style={s.dot}>·</span>
        <Link to="/about" style={s.footerLink}>About</Link>
        <span style={s.dot}>·</span>
        <Link to="/privacy" style={s.footerLink}>Privacy</Link>
        <span style={s.dot}>·</span>
        <Link to="/terms" style={s.footerLink}>Terms</Link>
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
  },

  // Nav
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

  // About section
  aboutSection: {
    padding: 'clamp(64px, 9vw, 110px) clamp(20px, 5vw, 56px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  aboutInner: { maxWidth: 900, margin: '0 auto' },

  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: 40 },
  logoImg: { width: 'min(400px, 70vw)', height: 'auto', objectFit: 'contain' },

  aboutHeadline: {
    fontSize: 'clamp(30px, 5vw, 48px)',
    fontWeight: 800,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 1.15,
    margin: '0 0 24px',
    letterSpacing: -0.5,
  },
  headlineLine: {
    width: 56, height: 4, borderRadius: 2,
    background: `linear-gradient(90deg, ${ORANGE}, ${BLUE})`,
    margin: '0 auto 48px',
  },

  storyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 'clamp(16px, 3vw, 40px)',
    marginBottom: 56,
  },
  storyCol: {},
  storyText: {
    fontSize: 'clamp(15px, 1.8vw, 17px)',
    color: '#999',
    lineHeight: 1.85,
    margin: '0 0 20px',
  },
  highlight: { color: '#fff', fontWeight: 600 },

  // Pillars
  pillarsWrap: {
    borderTop: '1px solid rgba(255,255,255,0.07)',
    paddingTop: 48,
  },
  pillarsLabel: {
    fontSize: 11, fontWeight: 700, color: '#555',
    textTransform: 'uppercase', letterSpacing: 1.2,
    margin: '0 0 24px',
  },
  pillarsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 24,
  },
  pillarCard: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '20px 20px 22px',
  },
  pillarDot: { width: 8, height: 8, borderRadius: '50%', marginBottom: 12 },
  pillarTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 8px', letterSpacing: 0.1 },
  pillarBody: { fontSize: 13, color: '#777', lineHeight: 1.7, margin: 0 },

  // Social section
  socialSection: {
    padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.015)',
  },
  socialInner: { maxWidth: 900, margin: '0 auto' },
  socialHeading: {
    fontSize: 11, fontWeight: 700, color: '#555',
    textTransform: 'uppercase', letterSpacing: 1.2,
    margin: '0 0 28px',
  },
  socialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
  },
  socialCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '18px 20px',
    borderRadius: 14,
    border: '1px solid',
    textDecoration: 'none',
    transition: 'transform 0.15s, box-shadow 0.15s',
    cursor: 'pointer',
  },
  socialIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  socialText: { display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' },
  socialPlatform: { fontSize: 13, fontWeight: 700, lineHeight: 1 },
  socialHandle: {
    fontSize: 12, color: '#666', fontWeight: 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },

  // Form section
  formSection: {
    padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)',
  },
  formInner: {
    maxWidth: 680,
    margin: '0 auto',
    background: '#111',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 'clamp(28px, 5vw, 52px)',
    boxShadow: '0 8px 48px rgba(0,0,0,0.55)',
  },
  formTitle: { fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 10px' },
  formSubtitle: { fontSize: 15, color: '#888', lineHeight: 1.6, margin: '0 0 36px' },

  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#aaa', letterSpacing: 0.2 },
  input: {
    padding: '12px 14px', fontSize: 15,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#fff', outline: 'none',
    width: '100%', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
  },
  textarea: { resize: 'vertical', minHeight: 130, lineHeight: 1.65 },
  errorMsg: {
    fontSize: 13, fontWeight: 600, color: '#c73820',
    background: 'rgba(199,56,32,0.1)', border: '1px solid rgba(199,56,32,0.3)',
    borderRadius: 8, padding: '8px 12px', margin: 0,
  },
  submitBtn: {
    padding: '14px 0', fontSize: 16, fontWeight: 700,
    background: ORANGE, color: '#fff', border: 'none',
    borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(247,87,9,0.35)',
    width: '100%',
  },

  // Success
  success: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18 },
  checkCircle: {
    width: 68, height: 68, borderRadius: '50%',
    background: 'rgba(46,125,50,0.15)', border: '2px solid #2e7d32',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 30, color: '#4caf50',
  },
  successTitle: { fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 },
  successBody: { fontSize: 15, color: '#888', lineHeight: 1.7, margin: 0 },
  backLink: { fontSize: 14, fontWeight: 600, color: BLUE, textDecoration: 'none', marginTop: 8 },

  // Footer
  footer: {
    padding: '28px 24px', textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  footerLink: { fontSize: 13, color: '#555', textDecoration: 'none' },
  dot: { color: '#333', fontSize: 13 },
  copy: { width: '100%', fontSize: 12, color: '#333', margin: '8px 0 0' },
}
