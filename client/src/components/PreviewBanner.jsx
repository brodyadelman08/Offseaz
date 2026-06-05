import { useNavigate } from 'react-router-dom'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'

/**
 * Shown on any page/section that requires a team when the athlete has none.
 * noun  — describes what's locked, e.g. "plan", "feed", "messages"
 * compact — tighter layout for inline use (roster, etc.)
 */
export default function PreviewBanner({ noun = 'plan', compact = false }) {
  const navigate = useNavigate()

  if (compact) {
    return (
      <div style={styles.compact}>
        <span style={styles.compactIcon}>🔒</span>
        <div style={styles.compactText}>
          <p style={styles.compactTitle}>Join your team to unlock {noun}</p>
          <p style={styles.compactSub}>Ask your coach for the invite code</p>
        </div>
        <button style={styles.compactBtn} onClick={() => navigate('/athlete')}>
          Enter Code
        </button>
      </div>
    )
  }

  return (
    <div style={styles.banner}>
      {/* Tag row */}
      <div style={styles.tagRow}>
        <span style={styles.previewTag}>👁 Preview Mode</span>
      </div>

      {/* Main message */}
      <h2 style={styles.title}>
        Join your coach's team to unlock your full personalized {noun}
      </h2>
      <p style={styles.sub}>
        Your {noun} is already generated — you're one invite code away from seeing
        the full plan with personalized weights and coaching notes.
      </p>

      {/* CTA */}
      <button style={styles.unlockBtn} onClick={() => navigate('/athlete')}>
        🔓 Enter Invite Code
      </button>
    </div>
  )
}

const styles = {
  banner: {
    background: 'linear-gradient(135deg, rgba(247,87,9,0.10) 0%, rgba(48,142,189,0.08) 100%)',
    border: '1px solid rgba(247,87,9,0.35)',
    borderRadius: 18,
    padding: '28px 28px 24px',
    marginBottom: 28,
    textAlign: 'center',
  },

  tagRow: {
    marginBottom: 12,
  },
  previewTag: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: ORANGE,
    background: 'rgba(247,87,9,0.12)',
    border: '1px solid rgba(247,87,9,0.3)',
    padding: '4px 12px',
    borderRadius: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: 800,
    color: 'var(--text)',
    lineHeight: 1.3,
    margin: '0 0 10px',
  },
  sub: {
    fontSize: 14,
    color: 'var(--text-2)',
    lineHeight: 1.65,
    margin: '0 0 22px',
    maxWidth: 440,
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  unlockBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '13px 32px',
    background: ORANGE,
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(247,87,9,0.40)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },

  // ── Compact variant ───────────────────────────────────────────────────────────
  compact: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: 'rgba(247,87,9,0.06)',
    border: '1px solid rgba(247,87,9,0.2)',
    borderRadius: 14,
    padding: '14px 18px',
    marginBottom: 20,
  },
  compactIcon: { fontSize: 22, flexShrink: 0 },
  compactText: { flex: 1, minWidth: 0 },
  compactTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 },
  compactSub:   { fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' },
  compactBtn: {
    flexShrink: 0,
    padding: '8px 16px',
    background: ORANGE,
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
}
