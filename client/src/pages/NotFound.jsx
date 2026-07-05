import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ORANGE = '#F75709'

export default function NotFound() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { profile } = useAuth()

  // Smart "go home" destination based on role
  function goHome() {
    if (profile?.role === 'coach')  return navigate('/coach',   { replace: true })
    if (profile?.role === 'athlete') return navigate('/athlete', { replace: true })
    navigate('/', { replace: true })
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <img
          src="/Offseaz-Logo-White-Letter-Dark.png"
          alt="Offseaz"
          style={styles.logo}
        />

        {/* Big 404 */}
        <div style={styles.codeWrap}>
          <span style={styles.code}>4</span>
          <span style={styles.codeIcon}>🏋️</span>
          <span style={styles.code}>4</span>
        </div>

        <h1 style={styles.heading}>Page Not Found</h1>
        <p style={styles.sub}>
          The page{' '}
          <span style={styles.path}>{location.pathname}</span>{' '}
          doesn't exist. It may have been moved or the link is broken.
        </p>

        <div style={styles.btns}>
          <button style={styles.primaryBtn} onClick={goHome}>
            ← Go to Dashboard
          </button>
          <button style={styles.ghostBtn} onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0A0A0A',
    padding: '40px 20px',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 0,
  },
  logo: {
    height: 40,
    display: 'block',
    marginBottom: 40,
    opacity: 0.9,
  },
  codeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  code: {
    fontSize: 88,
    fontWeight: 900,
    color: ORANGE,
    lineHeight: 1,
    fontFamily: "'Manrope','Inter',sans-serif",
    letterSpacing: '-0.04em',
  },
  codeIcon: {
    fontSize: 52,
    lineHeight: 1,
    margin: '0 2px',
    filter: 'grayscale(0.15)',
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: '#EFEFEF',
    margin: '0 0 12px',
    fontFamily: "'Manrope','Inter',sans-serif",
  },
  sub: {
    fontSize: 14,
    color: '#666',
    lineHeight: 1.6,
    margin: '0 0 32px',
  },
  path: {
    fontFamily: 'monospace',
    color: '#888',
    fontSize: 13,
    background: '#1a1a1a',
    padding: '1px 6px',
    borderRadius: 4,
  },
  btns: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryBtn: {
    padding: '11px 24px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 14px rgba(247,87,9,0.36)',
    letterSpacing: 0.1,
  },
  ghostBtn: {
    padding: '11px 22px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    border: '1px solid #2a2a2a',
    background: 'transparent',
    color: '#666',
    cursor: 'pointer',
  },
}
