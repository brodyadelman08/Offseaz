import { useState } from 'react'
import { Link } from 'react-router-dom'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'

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
    // In a future version this will POST to /api/contact
    setSubmitted(true)
  }

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <Link to="/" style={s.navLogo}>
          <img src="/Offseaz_logo__DARK_-removebg-preview.png" alt="Offseaz" style={{ height: 36 }} />
        </Link>
        <div style={s.navLinks}>
          <Link to="/about" style={s.navLink}>About</Link>
          <Link to="/login" style={s.navBtn}>Sign In</Link>
        </div>
      </nav>

      {/* Main */}
      <main style={s.main}>
        <div style={s.card}>
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
              <h1 style={s.title}>Get in Touch</h1>
              <p style={s.subtitle}>
                Have a question, feedback, or a feature idea? We'd love to hear from you.
              </p>

              <form onSubmit={handleSubmit} style={s.form}>
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

                <div style={s.fieldGroup}>
                  <label style={s.label}>I am a…</label>
                  <select
                    style={{ ...s.input, color: form.role ? '#fff' : '#555' }}
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="" disabled style={{ color: '#555', background: '#111' }}>Select your role</option>
                    <option value="coach" style={{ color: '#fff', background: '#111' }}>Coach</option>
                    <option value="athlete" style={{ color: '#fff', background: '#111' }}>Athlete</option>
                    <option value="other" style={{ color: '#fff', background: '#111' }}>Other</option>
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
      </main>

      {/* Footer */}
      <footer style={s.footer}>
        <Link to="/" style={s.footerLink}>Home</Link>
        <span style={s.dot}>·</span>
        <Link to="/about" style={s.footerLink}>About</Link>
        <span style={s.dot}>·</span>
        <Link to="/privacy" style={s.footerLink}>Privacy</Link>
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
    display: 'flex',
    flexDirection: 'column',
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

  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 'clamp(40px, 8vw, 80px) 24px',
  },

  card: {
    width: '100%',
    maxWidth: 520,
    background: '#111',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 'clamp(28px, 5vw, 48px)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  },

  title: { fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 10px' },
  subtitle: { fontSize: 15, color: '#888', lineHeight: 1.6, margin: '0 0 32px' },

  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#aaa', letterSpacing: 0.2 },
  input: {
    padding: '12px 14px',
    fontSize: 15,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#fff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  textarea: { resize: 'vertical', minHeight: 120, lineHeight: 1.6 },
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
    transition: 'opacity 0.2s',
    width: '100%',
  },

  // Success state
  success: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 },
  checkCircle: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'rgba(46,125,50,0.15)', border: '2px solid #2e7d32',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, color: '#4caf50',
  },
  successTitle: { fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 },
  successBody: { fontSize: 15, color: '#888', lineHeight: 1.7, margin: 0 },
  backLink: { fontSize: 14, fontWeight: 600, color: BLUE, textDecoration: 'none', marginTop: 8 },

  footer: {
    padding: '28px 24px', textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  footerLink: { fontSize: 13, color: '#555', textDecoration: 'none' },
  dot: { color: '#333', fontSize: 13 },
  copy: { width: '100%', fontSize: 12, color: '#333', margin: '8px 0 0' },
}
