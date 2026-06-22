import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckIcon } from '../components/Icons'
import api from '../services/api'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'

// ── Social icons ──────────────────────────────────────────────────────────────

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

const SOCIALS = [
  { label: 'X / Twitter', handle: '@Offseaz',  url: 'https://x.com/Offseaz',        Icon: XIcon,         color: '#fff',   bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
  { label: 'Instagram',   handle: '@0ffseaz',   url: 'https://instagram.com/0ffseaz', Icon: InstagramIcon, color: ORANGE,   bg: 'rgba(247,87,9,0.08)',    border: 'rgba(247,87,9,0.22)'   },
  { label: 'Facebook',    handle: 'Offseaz',    url: 'https://facebook.com/Offseaz',  Icon: FacebookIcon,  color: BLUE,     bg: 'rgba(48,142,189,0.08)',  border: 'rgba(48,142,189,0.22)' },
  { label: 'TikTok',      handle: '@0ffseaz',   url: 'https://tiktok.com/@0ffseaz',   Icon: TikTokIcon,    color: YELLOW,   bg: 'rgba(240,190,36,0.08)',  border: 'rgba(240,190,36,0.22)' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Contact() {
  const [form, setForm]           = useState({ name: '', email: '', role: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState('')
  const [navVisible, setNavVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      if (y < 10) {
        setNavVisible(true)
      } else if (y > lastScrollY.current) {
        setNavVisible(false)
      } else {
        setNavVisible(true)
      }
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.role || !form.message.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setSending(true)
    setError('')
    try {
      await api.post('/api/contact', form)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={s.page}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={{ ...s.nav, transform: navVisible ? 'translateY(0)' : 'translateY(-100%)', transition: 'transform 200ms ease-out' }}>
        <Link to="/" style={s.navLogo}>
          <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" className="logo-nav" />
        </Link>
        <div style={s.navLinks}>
          <Link to="/about" style={s.navLink}>About</Link>
          <Link to="/login" style={s.navBtn}>Sign In</Link>
        </div>
      </nav>

      {/* ── Follow Us ────────────────────────────────────────────────────── */}
      <section style={s.socialSection}>
        <div style={s.sectionInner}>
          <span style={s.sectionTag}>Follow Us</span>
          <h2 style={s.sectionHeading}>Stay connected with Offseaz.</h2>
          <div style={s.socialGrid}>
            {SOCIALS.map(({ label, handle, url, Icon, color, bg, border }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...s.socialCard, background: bg, borderColor: border }}
              >
                <div style={{ ...s.iconWrap, background: bg, border: `1px solid ${border}` }}>
                  <Icon size={22} color={color} />
                </div>
                <div style={s.socialText}>
                  <span style={{ ...s.platform, color }}>{label}</span>
                  <span style={s.handle}>{handle}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact form ─────────────────────────────────────────────────── */}
      <section style={s.formSection}>
        <div style={s.sectionInner}>
          {submitted ? (
            <div style={s.success}>
              <div style={s.checkCircle}><CheckIcon size={28} color="#fff" /></div>
              <h2 style={s.successTitle}>Message received!</h2>
              <p style={s.successBody}>
                Thanks for reaching out. We'll get back to you at{' '}
                <strong style={{ color: '#fff' }}>{form.email}</strong> shortly.
              </p>
              <Link to="/" style={s.backLink}>← Back to Home</Link>
            </div>
          ) : (
            <>
              <h2 style={s.sectionHeading}>Get in Touch</h2>
              <p style={s.formSub}>
                Have a question, feedback, or a feature idea? We'd love to hear from you.
              </p>

              <form onSubmit={handleSubmit} style={s.form}>
                <div style={s.row2}>
                  <div style={s.field}>
                    <label style={s.label}>Name</label>
                    <input style={s.input} type="text" name="name" placeholder="Your full name"
                      value={form.name} onChange={handleChange} autoComplete="name" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Email</label>
                    <input style={s.input} type="email" name="email" placeholder="you@example.com"
                      value={form.email} onChange={handleChange} autoComplete="email" />
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>I am a…</label>
                  <select style={{ ...s.input, color: form.role ? '#fff' : '#555' }}
                    name="role" value={form.role} onChange={handleChange}>
                    <option value="" disabled style={{ color: '#555', background: '#111' }}>Select your role</option>
                    <option value="coach"   style={{ color: '#fff', background: '#111' }}>Coach</option>
                    <option value="athlete" style={{ color: '#fff', background: '#111' }}>Athlete</option>
                    <option value="other"   style={{ color: '#fff', background: '#111' }}>Other</option>
                  </select>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Message</label>
                  <textarea style={{ ...s.input, ...s.textarea }} name="message"
                    placeholder="What's on your mind?" value={form.message}
                    onChange={handleChange} rows={5} />
                </div>

                {error && <p style={s.errorMsg}>{error}</p>}

                <button type="submit" disabled={sending} style={{ ...s.submitBtn, opacity: sending ? 0.6 : 1, cursor: sending ? 'default' : 'pointer' }}>
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <Link to="/"        style={s.footerLink}>Home</Link>
        <span style={s.dot}>·</span>
        <Link to="/about"   style={s.footerLink}>About</Link>
        <span style={s.dot}>·</span>
        <Link to="/privacy" style={s.footerLink}>Privacy</Link>
        <span style={s.dot}>·</span>
        <Link to="/terms"   style={s.footerLink}>Terms</Link>
        <span style={s.dot}>·</span>
        <a href="mailto:brody@offseaz.com" style={s.footerLink}>brody@offseaz.com</a>
        <p style={s.copy}>© {new Date().getFullYear()} Offseaz. All rights reserved.</p>
      </footer>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight: '100vh', background: '#0A0A0A', color: '#EFEFEF', fontFamily: "Inter, system-ui, -apple-system, sans-serif", paddingTop: 64 },

  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 56px)', height: 64,
    background: 'rgba(10,10,10,0.92)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  navLogo:  { display: 'flex', alignItems: 'center', textDecoration: 'none' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 20 },
  navLink:  { fontSize: 14, fontWeight: 600, color: '#aaa', textDecoration: 'none' },
  navBtn:   { fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: ORANGE, padding: '7px 18px', borderRadius: 10, boxShadow: '0 2px 10px rgba(247,87,9,0.3)' },

  sectionTag: { display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: ORANGE, background: 'rgba(247,87,9,0.10)', border: '1px solid rgba(247,87,9,0.25)', padding: '4px 12px', borderRadius: 20, marginBottom: 14 },
  sectionInner:   { maxWidth: 720, margin: '0 auto' },
  sectionHeading: { fontSize: 'clamp(21px, 3.2vw, 30px)', fontWeight: 700, color: '#fff', margin: '0 0 28px', lineHeight: 1.2 },

  /* Socials */
  socialSection: { padding: 'clamp(56px, 7vw, 88px) clamp(20px, 5vw, 56px)', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  socialGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 },
  socialCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 14, border: '1px solid', textDecoration: 'none', transition: 'transform 0.15s' },
  iconWrap:   { width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  socialText: { display: 'flex', flexDirection: 'column', gap: 2 },
  platform:   { fontSize: 13, fontWeight: 700, lineHeight: 1 },
  handle:     { fontSize: 12, color: '#666', lineHeight: 1 },

  /* Form */
  formSection: { padding: 'clamp(56px, 7vw, 88px) clamp(20px, 5vw, 56px)' },
  formSub:  { fontSize: 15, color: '#888', margin: '-12px 0 28px', lineHeight: 1.6 },
  form:     { display: 'flex', flexDirection: 'column', gap: 20 },
  row2:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  field:    { display: 'flex', flexDirection: 'column', gap: 7 },
  label:    { fontSize: 13, fontWeight: 600, color: '#ccc' },
  input: {
    background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10,
    padding: '12px 16px', fontSize: 15, color: '#fff', outline: 'none',
    transition: 'border-color 0.18s', width: '100%', boxSizing: 'border-box',
    fontFamily: 'inherit', appearance: 'none',
  },
  textarea:  { resize: 'vertical', minHeight: 120 },
  errorMsg:  { fontSize: 14, color: '#c73820', margin: 0 },
  submitBtn: { padding: '14px 0', background: ORANGE, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 20px rgba(247,87,9,0.35)', transition: 'opacity 0.18s' },

  /* Success */
  success:      { textAlign: 'center', paddingTop: 20 },
  checkCircle:  { width: 56, height: 56, borderRadius: '50%', background: 'rgba(46,125,50,0.15)', border: '2px solid #2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#4caf50', margin: '0 auto 20px' },
  successTitle: { fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 10px' },
  successBody:  { fontSize: 15, color: '#aaa', lineHeight: 1.6, margin: '0 0 24px' },
  backLink:     { fontSize: 14, color: BLUE, textDecoration: 'none', fontWeight: 600 },

  /* Footer */
  footer: { padding: '36px 24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  footerLink: { fontSize: 13, color: '#555', textDecoration: 'none' },
  dot:  { color: '#333', fontSize: 13 },
  copy: { width: '100%', fontSize: 12, color: '#333', margin: '8px 0 0' },
}
