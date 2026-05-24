import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const ORANGE = '#F75709'
const BLUE = '#308EBD'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Coach view ───────────────────────────────────────────────────────────────

function CoachMessages() {
  const [messages, setMessages] = useState([])
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('group')
  const [recipientId, setRecipientId] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/api/messages').then(r => r.data.messages).catch(() => []),
      api.get('/api/messages/athletes').then(r => r.data.athletes).catch(() => []),
    ]).then(([msgs, aths]) => {
      setMessages(msgs)
      setAthletes(aths)
    }).finally(() => setLoading(false))
  }, [])

  async function handleSend(e) {
    e.preventDefault()
    if (!body.trim()) return
    if (type === 'individual' && !recipientId) {
      setError('Please select an athlete.')
      return
    }
    setError('')
    setSending(true)
    try {
      await api.post('/api/messages', {
        recipient_id: type === 'individual' ? recipientId : null,
        body: body.trim(),
      })
      const refreshed = await api.get('/api/messages').then(r => r.data.messages)
      setMessages(refreshed)
      setBody('')
      setRecipientId('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div style={styles.card}>
        <p style={styles.cardLabel}>Compose</p>
        <div style={styles.typeRow}>
          <button
            type="button"
            style={{ ...styles.typeBtn, ...(type === 'group' ? { ...styles.typeBtnActive, borderColor: ORANGE, background: ORANGE } : {}) }}
            onClick={() => { setType('group'); setRecipientId('') }}
          >
            Group announcement
          </button>
          <button
            type="button"
            style={{ ...styles.typeBtn, ...(type === 'individual' ? { ...styles.typeBtnActive, borderColor: ORANGE, background: ORANGE } : {}) }}
            onClick={() => setType('individual')}
          >
            Individual message
          </button>
        </div>

        <form onSubmit={handleSend} style={styles.composeForm}>
          {type === 'individual' && (
            <select
              style={styles.select}
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              required
            >
              <option value="">Select an athlete…</option>
              {athletes.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          )}

          <textarea
            style={styles.textarea}
            placeholder="Type your message…"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            required
          />

          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.sendRow}>
            <button style={{ ...styles.sendBtn, background: ORANGE }} type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Send message →'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={styles.historyHeader}>
          <p style={styles.cardLabel}>Sent</p>
          {messages.length > 0 && (
            <span style={styles.msgCount}>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loading ? (
          <p style={styles.empty}>Loading…</p>
        ) : messages.length === 0 ? (
          <p style={styles.empty}>No messages sent yet.</p>
        ) : (
          <div style={styles.msgList}>
            {messages.map(m => (
              <div key={m.id} style={{ ...styles.msgCard, borderLeftColor: m.recipient_id ? '#6b7280' : ORANGE }}>
                <div style={styles.msgMeta}>
                  <span style={styles.msgTo}>
                    To: {m.recipient_name ? m.recipient_name : 'Everyone'}
                  </span>
                  <span style={styles.msgTime}>{timeAgo(m.sent_at)}</span>
                </div>
                <p style={styles.msgBody}>{m.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Athlete view ─────────────────────────────────────────────────────────────

function AthleteMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/messages')
      .then(r => setMessages(r.data.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={styles.card}>
      {loading ? (
        <p style={styles.empty}>Loading…</p>
      ) : messages.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💬</p>
          <p style={styles.emptyTitle}>No messages yet</p>
          <p style={styles.empty}>Your coach hasn't sent anything yet.</p>
        </div>
      ) : (
        <div style={styles.msgList}>
          {messages.map(m => {
            const isIndividual = m.recipient_id != null
            return (
              <div key={m.id} style={{ ...styles.msgCard, borderLeftColor: isIndividual ? BLUE : '#6b7280' }}>
                <div style={styles.msgMeta}>
                  <span style={styles.msgSender}>{m.sender_name}</span>
                  <span style={{
                    ...styles.msgTag,
                    background: isIndividual ? 'rgba(48,142,189,0.1)' : 'var(--border)',
                    color: isIndividual ? BLUE : 'var(--text-3)',
                  }}>
                    {isIndividual ? '⚡ You' : '📢 Everyone'}
                  </span>
                  <span style={styles.msgTime}>{timeAgo(m.sent_at)}</span>
                </div>
                <p style={styles.msgBody}>{m.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function Messages() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isCoach = profile?.role === 'coach'
  const accent = isCoach ? ORANGE : BLUE

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <img src="/OFFSEAZ_LOGO_PNG.png" alt="Offseaz" style={styles.logo} />
          <span style={{ ...styles.roleChip, background: accent }}>
            {isCoach ? 'Coach' : 'Athlete'}
          </span>
        </div>
        <div style={styles.headerRight}>
          <button
            style={styles.backBtn}
            onClick={() => navigate(isCoach ? '/coach' : '/athlete')}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      <h1 style={styles.pageTitle}>Messages</h1>

      {isCoach ? <CoachMessages /> : <AthleteMessages />}
    </div>
  )
}

const styles = {
  container: { maxWidth: 660, margin: '0 auto', padding: '0 20px 60px' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 32 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { height: 32, display: 'block', mixBlendMode: 'screen' },
  roleChip: { fontSize: 11, fontWeight: 700, color: '#fff', padding: '3px 8px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: { fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 500 },

  pageTitle: { fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 24 },

  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
  cardLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 14px' },

  typeRow: { display: 'flex', gap: 10, marginBottom: 14 },
  typeBtn: { flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '2px solid var(--border)', background: 'var(--card-inner)', cursor: 'pointer', color: 'var(--text-2)', transition: 'all 0.15s' },
  typeBtnActive: { color: '#fff' },

  composeForm: { display: 'flex', flexDirection: 'column', gap: 10 },
  select: { padding: '10px 14px', fontSize: 14, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', width: '100%' },
  textarea: { padding: '11px 14px', fontSize: 14, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, width: '100%', boxSizing: 'border-box', outline: 'none' },
  errorBox: { background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)', color: '#c73820', borderRadius: 8, padding: '10px 14px', fontSize: 13 },
  sendRow: { display: 'flex', justifyContent: 'flex-end' },
  sendBtn: { padding: '10px 20px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', color: '#fff', cursor: 'pointer', letterSpacing: 0.2 },

  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  msgCount: { fontSize: 13, color: 'var(--text-3)' },

  msgList: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 },
  msgCard: { background: 'var(--card-inner)', border: '1px solid var(--border)', borderLeft: '3px solid', borderRadius: '0 10px 10px 0', padding: '12px 16px' },
  msgMeta: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  msgTo: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  msgSender: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  msgTag: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  msgTime: { fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' },
  msgBody: { fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' },

  emptyState: { textAlign: 'center', padding: '24px 0' },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 },
  empty: { color: 'var(--text-3)', fontSize: 14 },
}
