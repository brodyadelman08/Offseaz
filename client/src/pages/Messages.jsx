import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

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
  const [type, setType] = useState('group')      // 'group' | 'individual'
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
      {/* Compose */}
      <div style={styles.card}>
        <p style={styles.cardLabel}>Compose</p>
        <div style={styles.typeRow}>
          <button
            type="button"
            style={{ ...styles.typeBtn, ...(type === 'group' ? styles.typeBtnActive : {}) }}
            onClick={() => { setType('group'); setRecipientId('') }}
          >
            Group announcement
          </button>
          <button
            type="button"
            style={{ ...styles.typeBtn, ...(type === 'individual' ? styles.typeBtnActive : {}) }}
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

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.sendRow}>
            <button style={styles.sendBtn} type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Send message →'}
            </button>
          </div>
        </form>
      </div>

      {/* Sent history */}
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
              <div key={m.id} style={{ ...styles.msgCard, borderLeftColor: m.recipient_id ? '#6b7280' : '#1a1a1a' }}>
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
        <p style={styles.empty}>No messages yet. Your coach hasn't sent anything.</p>
      ) : (
        <div style={styles.msgList}>
          {messages.map(m => {
            const isIndividual = m.recipient_id != null
            return (
              <div key={m.id} style={{ ...styles.msgCard, borderLeftColor: isIndividual ? '#6b7280' : '#1a1a1a' }}>
                <div style={styles.msgMeta}>
                  <span style={styles.msgSender}>{m.sender_name}</span>
                  <span style={{ ...styles.msgTag, background: isIndividual ? '#f1f5f9' : '#f0f0f0', color: isIndividual ? '#475569' : '#555' }}>
                    {isIndividual ? 'You' : 'Everyone'}
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

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={() => navigate(isCoach ? '/coach' : '/athlete')}>
        ← Back to dashboard
      </button>
      <h1 style={styles.pageTitle}>Messages</h1>

      {isCoach ? <CoachMessages /> : <AthleteMessages />}
    </div>
  )
}

const styles = {
  container:      { maxWidth: 640, margin: '0 auto', padding: '32px 20px' },
  backLink:       { background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'block' },
  pageTitle:      { fontSize: 26, fontWeight: 700, marginBottom: 20 },

  card:           { background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 10, padding: 24 },
  cardLabel:      { fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 14px' },

  typeRow:        { display: 'flex', gap: 10, marginBottom: 14 },
  typeBtn:        { flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, borderRadius: 6, border: '2px solid #ddd', background: '#fff', cursor: 'pointer', color: '#555' },
  typeBtnActive:  { borderColor: '#1a1a1a', background: '#1a1a1a', color: '#fff' },

  composeForm:    { display: 'flex', flexDirection: 'column', gap: 10 },
  select:         { padding: '10px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', background: '#fff' },
  textarea:       { padding: '10px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 },
  error:          { color: '#c0392b', fontSize: 13, margin: 0 },
  sendRow:        { display: 'flex', justifyContent: 'flex-end' },
  sendBtn:        { padding: '10px 20px', fontSize: 14, fontWeight: 600, borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer' },

  historyHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  msgCount:       { fontSize: 13, color: '#aaa' },

  msgList:        { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 },
  msgCard:        { background: '#fff', border: '1px solid #e5e5e5', borderLeft: '4px solid #1a1a1a', borderRadius: '0 8px 8px 0', padding: '12px 16px' },
  msgMeta:        { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  msgTo:          { fontSize: 13, fontWeight: 700, color: '#1a1a1a' },
  msgSender:      { fontSize: 13, fontWeight: 700, color: '#1a1a1a' },
  msgTag:         { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '.3px' },
  msgTime:        { fontSize: 12, color: '#aaa', marginLeft: 'auto' },
  msgBody:        { fontSize: 14, color: '#333', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' },

  empty:          { color: '#aaa', fontSize: 14 },
}
