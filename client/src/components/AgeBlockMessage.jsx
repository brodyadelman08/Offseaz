import { Link } from 'react-router-dom'

// Shared full-page block screen for an age-restricted account, used by
// ProtectedRoute after the existing-user confirm-age flow removes an
// underage account server-side. Deliberately dumb/presentational — no
// session logic here, so it keeps rendering no matter what happens to
// session/profile state elsewhere in the tree afterward.
export default function AgeBlockMessage({ message }) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src="/Offseaz-Logo-White-Letter-Dark.png" alt="Offseaz" style={styles.logo} />
        <div style={styles.ageBlockBox}>
          <p style={styles.ageBlockMessage}>{message}</p>
          <Link to="/terms#eligibility" style={styles.ageBlockLink}>Learn more</Link>
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
    background: '#0F0F0F',
    padding: '40px 20px',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: '32px 28px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  logo: {
    height: 40,
    display: 'block',
    marginBottom: 20,
  },
  ageBlockBox: {
    width: '100%',
    background: 'rgba(199,56,32,0.12)',
    border: '1px solid rgba(199,56,32,0.3)',
    borderRadius: 12,
    padding: '18px 18px',
    textAlign: 'center',
  },
  ageBlockMessage: {
    fontSize: 14,
    color: '#ff6b4a',
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  ageBlockLink: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-2)',
    textDecoration: 'underline',
  },
}
