import { useState } from 'react'

const RED = '#DC2626'

// Generic "type a word to confirm" modal for destructive, irreversible
// actions (account deletion, team deletion). Shared so the confirmation
// affordance stays consistent across the athlete and coach delete flows.
export default function ConfirmDeleteModal({
  title, warningText, confirmWord = 'DELETE', confirmLabel = 'Delete',
  onConfirm, onCancel, loading = false, error = '',
}) {
  const [input, setInput] = useState('')
  const matches = input.trim() === confirmWord

  return (
    <div style={styles.overlay} onClick={loading ? undefined : onCancel}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>
        <h3 style={styles.headline}>{title}</h3>
        <p style={styles.body}>{warningText}</p>
        <p style={styles.instructions}>
          Type <strong style={{ color: '#fff' }}>{confirmWord}</strong> below to confirm.
        </p>
        <input
          autoFocus
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={confirmWord}
          disabled={loading}
        />
        {error && <p style={styles.error}>{error}</p>}
        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            style={{ ...styles.confirmBtn, opacity: matches && !loading ? 1 : 0.5, cursor: matches && !loading ? 'pointer' : 'not-allowed' }}
            onClick={() => matches && !loading && onConfirm()}
            disabled={!matches || loading}
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9500,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  card: {
    background: '#111111', borderRadius: 16, padding: '32px 28px',
    maxWidth: 380, width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  headline: {
    fontFamily: "'Calibri', 'Trebuchet MS', 'Segoe UI', Helvetica, Arial, sans-serif",
    fontWeight: 700, fontSize: 20, color: '#FFFFFF',
    margin: '0 0 12px', textAlign: 'center', lineHeight: 1.3,
  },
  body: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', margin: '0 0 16px', lineHeight: 1.55,
  },
  instructions: {
    fontSize: 13, color: 'rgba(255,255,255,0.65)',
    textAlign: 'center', margin: '0 0 10px',
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', fontSize: 15,
    borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.05)', color: '#fff',
    outline: 'none', marginBottom: 18, textAlign: 'center',
  },
  error: {
    fontSize: 12, color: RED, textAlign: 'center', margin: '-8px 0 14px',
  },
  btnRow: { display: 'flex', gap: 10 },
  cancelBtn: {
    flex: 1, padding: '11px 0', background: 'transparent',
    border: '1.5px solid #FFFFFF', borderRadius: 8,
    color: '#FFFFFF', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1, padding: '11px 0', background: RED, border: 'none',
    borderRadius: 8, color: '#FFFFFF', fontWeight: 700, fontSize: 14,
  },
}
