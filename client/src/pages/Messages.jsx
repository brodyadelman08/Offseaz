import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { MessageIcon, BoltIcon, BroadcastIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'

// ── Shared design tokens ──────────────────────────────────────────────────────
const T = {
  shadowCard: '0 2px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
  shadowMsg:  '0 1px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Checkmark SVG for type selector ──────────────────────────────────────────
function CheckMark({ color = '#fff' }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke={color}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Chevron icon (expand / collapse) ─────────────────────────────────────────
function ChevronIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
      <polyline points="2,4 7,10 12,4" />
    </svg>
  )
}

// ── Coach compose + sent history ──────────────────────────────────────────────
function CoachMessages() {
  const [messages, setMessages]          = useState([])
  const [athletes, setAthletes]          = useState([])
  const [loading, setLoading]            = useState(true)
  const [type, setType]                  = useState('group')
  const [recipientId, setRecipientId]    = useState('')
  const [body, setBody]                  = useState('')
  const [sending, setSending]            = useState(false)
  const [error, setError]                = useState('')
  const [textareaFocused, setTextareaFocused] = useState(false)

  // Thread expansion: { [messageId]: { loading, data } }
  const [threads, setThreads]            = useState({})
  const [expandedId, setExpandedId]      = useState(null)

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

  async function handleExpand(msgId) {
    if (expandedId === msgId) {
      setExpandedId(null)
      return
    }
    setExpandedId(msgId)
    // Only fetch if not already loaded (or re-fetch to mark unread)
    setThreads(prev => ({ ...prev, [msgId]: { loading: true, data: null } }))
    try {
      const res = await api.get(`/api/messages/${msgId}/thread`)
      setThreads(prev => ({ ...prev, [msgId]: { loading: false, data: res.data } }))
      // Clear unread badge on this message
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, has_unread: false } : m
      ))
    } catch {
      setThreads(prev => ({ ...prev, [msgId]: { loading: false, data: null } }))
    }
  }

  const MSG_TYPES = [
    { key: 'group',      label: 'Team Announcement', sub: 'Send to all athletes', Icon: BroadcastIcon, color: ORANGE },
    { key: 'individual', label: 'Direct Message',     sub: 'Send to one athlete',  Icon: BoltIcon,      color: BLUE  },
  ]

  return (
    <>
      {/* ── Compose card ── */}
      <div style={st.composeCard}>
        <div style={st.sectionLabelRow}>
          <span style={st.sectionLabel}>New Message</span>
        </div>

        {/* Type selector */}
        <div style={st.typeGrid}>
          {MSG_TYPES.map(({ key, label, sub, Icon, color }) => {
            const active   = type === key
            const isOrange = color === ORANGE
            return (
              <button
                key={key}
                type="button"
                style={{
                  ...st.typeCard,
                  border: active ? `2px solid ${color}` : '2px solid var(--border)',
                  background: active
                    ? `linear-gradient(145deg, rgba(${isOrange ? '247,87,9' : '48,142,189'},0.10) 0%, var(--card-inner) 100%)`
                    : 'var(--card-inner)',
                  boxShadow: active
                    ? `0 0 0 3px rgba(${isOrange ? '247,87,9' : '48,142,189'},0.09), 0 4px 14px rgba(0,0,0,0.22)`
                    : '0 1px 4px rgba(0,0,0,0.14)',
                }}
                onClick={() => { setType(key); if (key === 'group') setRecipientId('') }}
              >
                <div style={{
                  ...st.typeIconBadge,
                  background: active ? `rgba(${isOrange ? '247,87,9' : '48,142,189'},0.15)` : 'var(--border)',
                }}>
                  <Icon size={16} color={active ? color : 'var(--text-3)'} />
                </div>
                <div style={st.typeCardText}>
                  <span style={{ ...st.typeCardLabel, color: active ? 'var(--text)' : 'var(--text-2)' }}>{label}</span>
                  <span style={st.typeCardSub}>{sub}</span>
                </div>
                {active && (
                  <div style={{ ...st.typeCheck, background: color }}><CheckMark /></div>
                )}
              </button>
            )
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSend} style={st.composeForm}>
          {type === 'individual' && (
            <div style={st.selectWrap}>
              <label style={st.inputLabel}>Recipient</label>
              <select style={st.select} value={recipientId}
                onChange={e => setRecipientId(e.target.value)} required>
                <option value="">Choose an athlete…</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={st.inputLabel}>Message</label>
            <textarea
              style={{
                ...st.textarea,
                borderColor: textareaFocused ? 'rgba(247,87,9,0.4)' : 'var(--input-border)',
                boxShadow: textareaFocused ? '0 0 0 2.5px rgba(247,87,9,0.14)' : 'none',
              }}
              placeholder={type === 'group'
                ? 'Write an announcement for the entire team…'
                : 'Write a message to this athlete…'}
              value={body}
              onChange={e => setBody(e.target.value)}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
              rows={4}
              required
            />
          </div>

          {error && <div style={st.errorBox}>{error}</div>}

          <div style={st.sendRow}>
            <button
              style={{ ...st.sendBtn, opacity: sending || !body.trim() ? 0.5 : 1 }}
              type="submit" disabled={sending || !body.trim()}
            >
              {sending ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span className="survey-spinner-sm" />Sending…
                </span>
              ) : (
                <>{type === 'group' ? 'Send to team' : 'Send message'} →</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Sent history + threads ── */}
      <div style={st.historyCard}>
        <div style={st.historyHeader}>
          <span style={st.sectionLabel}>Sent</span>
          {messages.length > 0 && (
            <span style={st.msgCount}>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
            <div className="survey-spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div style={st.emptyMsgs}>
            <MessageIcon size={28} color="var(--text-3)" />
            <p style={st.emptyText}>No messages sent yet.</p>
          </div>
        ) : (
          <div style={st.msgList}>
            {messages.map(m => {
              const isGroup  = !m.recipient_id
              const color    = isGroup ? ORANGE : BLUE
              const isOrange = isGroup
              const isOpen   = expandedId === m.id
              const thread   = threads[m.id]

              return (
                <div key={m.id} style={{ ...st.msgCard, borderLeft: `3px solid ${color}` }}>
                  {/* Top row — clickable to expand thread */}
                  <button
                    type="button"
                    style={st.msgExpandBtn}
                    onClick={() => handleExpand(m.id)}
                    aria-expanded={isOpen}
                  >
                    <div style={st.msgTopRow}>
                      <div style={st.msgLeft}>
                        <div style={{
                          ...st.msgIconBadge,
                          background: `rgba(${isOrange ? '247,87,9' : '48,142,189'},0.12)`,
                        }}>
                          {isGroup
                            ? <BroadcastIcon size={13} color={color} />
                            : <BoltIcon      size={13} color={color} />}
                        </div>
                        <span style={{ ...st.msgTo, color }}>
                          {isGroup ? 'Everyone' : m.recipient_name}
                        </span>
                        <span style={{
                          ...st.msgTypePill,
                          background: `rgba(${isOrange ? '247,87,9' : '48,142,189'},0.09)`,
                          color,
                        }}>
                          {isGroup ? 'Team' : 'Direct'}
                        </span>
                        {/* Unread dot */}
                        {m.has_unread && (
                          <span style={st.unreadDot} title="New replies" />
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={st.msgTime}>{timeAgo(m.sent_at)}</span>
                        {m.reply_count > 0 && (
                          <span style={{ ...st.replyCountPill, color, background: `rgba(${isOrange ? '247,87,9' : '48,142,189'},0.10)` }}>
                            {m.reply_count} {m.reply_count === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                        <span style={{ color: 'var(--text-3)' }}>
                          <ChevronIcon open={isOpen} />
                        </span>
                      </div>
                    </div>
                    <p style={{ ...st.msgBody, textAlign: 'left', marginBottom: 0 }}>{m.body}</p>
                  </button>

                  {/* Thread panel */}
                  {isOpen && (
                    <div style={st.threadPanel}>
                      {thread?.loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                          <div className="survey-spinner" />
                        </div>
                      ) : thread?.data ? (
                        thread.data.replies.length === 0 ? (
                          <p style={st.noReplies}>No replies yet.</p>
                        ) : (
                          <div style={st.replyList}>
                            {thread.data.replies.map(r => (
                              <div key={r.id} style={st.replyBubble}>
                                <div style={st.replyMeta}>
                                  <span style={st.replyAuthor}>{r.sender_name}</span>
                                  <span style={st.replyTime}>{timeAgo(r.sent_at)}</span>
                                </div>
                                <p style={st.replyBody}>{r.body}</p>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <p style={st.noReplies}>Could not load thread.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ── Athlete inbox with reply capability ───────────────────────────────────────
function AthleteMessages() {
  const { profile }                     = useAuth()
  const [messages, setMessages]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [replyText, setReplyText]       = useState({})  // { [msgId]: string }
  const [replySending, setReplySending] = useState({})  // { [msgId]: bool }
  const [replyError, setReplyError]     = useState({})  // { [msgId]: string }
  const replyRefs = useRef({})

  function load() {
    return api.get('/api/messages')
      .then(r => setMessages(r.data.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function setField(msgId, value) {
    setReplyText(prev => ({ ...prev, [msgId]: value }))
  }

  async function handleReply(e, msgId) {
    e.preventDefault()
    const text = (replyText[msgId] || '').trim()
    if (!text) return

    setReplySending(prev => ({ ...prev, [msgId]: true }))
    setReplyError(prev => ({ ...prev, [msgId]: '' }))
    try {
      const res = await api.post(`/api/messages/${msgId}/reply`, { body: text })
      // Append reply optimistically to the local message
      const newReply = {
        id:          res.data.message.id,
        body:        text,
        sent_at:     res.data.message.created_at,
        sender_id:   profile?.id,
        sender_name: profile?.full_name,
      }
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m
        return { ...m, replies: [...(m.replies || []), newReply] }
      }))
      setReplyText(prev => ({ ...prev, [msgId]: '' }))
    } catch (err) {
      setReplyError(prev => ({
        ...prev,
        [msgId]: err.response?.data?.error || 'Failed to send reply.',
      }))
    } finally {
      setReplySending(prev => ({ ...prev, [msgId]: false }))
    }
  }

  return (
    <div style={st.historyCard}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div className="survey-spinner" />
        </div>
      ) : messages.length === 0 ? (
        <div style={st.emptyInbox}>
          <div style={st.emptyIconWrap}>
            <MessageIcon size={28} color="var(--text-3)" />
          </div>
          <p style={st.emptyInboxTitle}>No messages yet</p>
          <p style={st.emptyText}>Your coach will send messages here.</p>
        </div>
      ) : (
        <div style={st.msgList}>
          {messages.map(m => {
            const isIndividual = m.recipient_id != null
            const color        = isIndividual ? BLUE : ORANGE
            const isOrange     = !isIndividual
            const replying     = replySending[m.id] || false
            const myReplyText  = replyText[m.id] || ''
            const err          = replyError[m.id] || ''
            const replies      = m.replies || []

            return (
              <div key={m.id} style={{ ...st.msgCard, borderLeft: `3px solid ${color}` }}>
                {/* Header */}
                <div style={st.msgTopRow}>
                  <div style={st.msgLeft}>
                    <div style={{
                      ...st.msgIconBadge,
                      background: `rgba(${isOrange ? '247,87,9' : '48,142,189'},0.12)`,
                    }}>
                      {isIndividual
                        ? <BoltIcon      size={13} color={color} />
                        : <BroadcastIcon size={13} color={color} />}
                    </div>
                    <span style={st.msgSender}>{m.sender_name}</span>
                    <span style={{
                      ...st.msgTypePill,
                      background: `rgba(${isOrange ? '247,87,9' : '48,142,189'},0.09)`,
                      color,
                    }}>
                      {isIndividual ? 'To you' : 'Everyone'}
                    </span>
                  </div>
                  <span style={st.msgTime}>{timeAgo(m.sent_at)}</span>
                </div>

                {/* Coach message body */}
                <p style={st.msgBody}>{m.body}</p>

                {/* Existing replies (full thread, chronological) */}
                {replies.length > 0 && (
                  <div style={st.threadPanel}>
                    <div style={st.replyList}>
                      {replies.map(r => {
                        const isMe = r.sender_id === profile?.id
                        return (
                          <div key={r.id} style={{ ...st.replyBubble, alignSelf: isMe ? 'flex-end' : 'flex-start', background: isMe ? `rgba(${isOrange ? '247,87,9' : '48,142,189'},0.12)` : 'var(--card-inner)', borderColor: isMe ? `rgba(${isOrange ? '247,87,9' : '48,142,189'},0.20)` : 'var(--border)' }}>
                            <div style={st.replyMeta}>
                              <span style={{ ...st.replyAuthor, color: isMe ? color : 'var(--text)' }}>
                                {isMe ? 'You' : r.sender_name}
                              </span>
                              <span style={st.replyTime}>{timeAgo(r.sent_at)}</span>
                            </div>
                            <p style={st.replyBody}>{r.body}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Reply form */}
                <div style={st.replyFormWrap}>
                  <form
                    onSubmit={e => handleReply(e, m.id)}
                    style={st.replyForm}
                  >
                    <input
                      ref={el => { replyRefs.current[m.id] = el }}
                      style={st.replyInput}
                      placeholder="Reply to your coach…"
                      value={myReplyText}
                      onChange={e => setField(m.id, e.target.value)}
                      maxLength={500}
                      disabled={replying}
                    />
                    <button
                      type="submit"
                      style={{
                        ...st.replySubmitBtn,
                        opacity: replying || !myReplyText.trim() ? 0.45 : 1,
                        background: color,
                        boxShadow: `0 2px 10px rgba(${isOrange ? '247,87,9' : '48,142,189'},0.30)`,
                      }}
                      disabled={replying || !myReplyText.trim()}
                    >
                      {replying
                        ? <span className="survey-spinner-sm" />
                        : 'Reply'}
                    </button>
                  </form>
                  {err && <p style={st.replyErr}>{err}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page wrapper ──────────────────────────────────────────────────────────────
export default function Messages() {
  const { profile } = useAuth()
  const isCoach = profile?.role === 'coach'

  return (
    <div style={st.container}>
      <div style={st.pageHeader}>
        <h1 style={st.pageTitle}>Messages</h1>
        <p style={st.pageSub}>
          {isCoach
            ? 'Send announcements or direct messages to your athletes.'
            : 'Messages from your coach — tap any message to reply.'}
        </p>
      </div>
      {isCoach ? <CoachMessages /> : <AthleteMessages />}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const st = {
  container: { maxWidth: 660, margin: '0 auto' },

  pageHeader: { marginBottom: 28 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', letterSpacing: -0.4 },
  pageSub:   { fontSize: 14, color: 'var(--text-2)', margin: 0 },

  // ── Compose card ──
  composeCard: {
    background: `linear-gradient(145deg, rgba(247,87,9,0.04) 0%, var(--card) 100%)`,
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: '24px 24px 20px',
    marginBottom: 16,
    boxShadow: T.shadowCard,
  },

  sectionLabelRow: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, color: ORANGE,
    textTransform: 'uppercase', letterSpacing: 0.9,
  },

  typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  typeCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 14px', borderRadius: 14,
    cursor: 'pointer', textAlign: 'left', position: 'relative',
    transition: 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
  },
  typeIconBadge: {
    width: 36, height: 36, borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'background 0.18s',
  },
  typeCardText:  { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 },
  typeCardLabel: { fontSize: 13, fontWeight: 700, lineHeight: 1.2, transition: 'color 0.15s' },
  typeCardSub:   { fontSize: 11, color: 'var(--text-3)', lineHeight: 1.3 },
  typeCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 18, height: 18, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, animation: 'surveyFadeIn 0.18s cubic-bezier(0.22,1,0.36,1)',
  },

  composeForm: { display: 'flex', flexDirection: 'column', gap: 14 },
  selectWrap:  { display: 'flex', flexDirection: 'column', gap: 6 },
  inputLabel:  { fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4 },
  select: {
    padding: '10px 14px', fontSize: 14, borderRadius: 10,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)', color: 'var(--text)',
    width: '100%', outline: 'none',
  },
  textarea: {
    padding: '12px 14px', fontSize: 14, borderRadius: 12,
    border: '1px solid var(--input-border)',
    background: 'var(--card-inner)', color: 'var(--text)',
    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
    width: '100%', boxSizing: 'border-box', outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    marginTop: 6,
  },
  errorBox: {
    background: 'rgba(199,56,32,0.08)', border: '1px solid rgba(199,56,32,0.25)',
    color: '#c73820', borderRadius: 10, padding: '10px 14px', fontSize: 13,
  },
  sendRow:  { display: 'flex', justifyContent: 'flex-end' },
  sendBtn: {
    padding: '12px 28px', fontSize: 14, fontWeight: 800,
    borderRadius: 10, border: 'none',
    background: ORANGE, color: '#fff', cursor: 'pointer',
    letterSpacing: 0.2,
    boxShadow: '0 2px 16px rgba(247,87,9,0.38), 0 1px 4px rgba(0,0,0,0.20)',
    transition: 'opacity 0.15s, transform 0.15s',
  },

  // ── History / inbox card ──
  historyCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: '22px 24px 20px',
    boxShadow: T.shadowCard,
    marginBottom: 16,
  },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  msgCount: { fontSize: 13, color: 'var(--text-3)' },

  emptyMsgs: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 8px', color: 'var(--text-3)' },
  emptyText: { fontSize: 14, color: 'var(--text-3)', margin: 0 },
  emptyInbox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0 8px' },
  emptyIconWrap: { width: 56, height: 56, borderRadius: '50%', background: 'var(--card-inner)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyInboxTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 },

  // ── Message cards ──
  msgList: { display: 'flex', flexDirection: 'column', gap: 10 },
  msgCard: {
    background: `linear-gradient(135deg, rgba(0,0,0,0.04) 0%, var(--card-inner) 100%)`,
    border: '1px solid var(--border)',
    borderRadius: '4px 14px 14px 14px',
    overflow: 'hidden',
    boxShadow: T.shadowMsg,
  },

  // Clickable expand button (coach)
  msgExpandBtn: {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '14px 16px', color: 'inherit',
    transition: 'background 0.14s',
  },

  msgTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  msgLeft:   { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  msgIconBadge: {
    width: 28, height: 28, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  msgTo:     { fontSize: 13, fontWeight: 700, lineHeight: 1.2 },
  msgSender: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  msgTypePill: {
    fontSize: 10, fontWeight: 700,
    padding: '2px 8px', borderRadius: 10,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  msgTime:  { fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 },
  msgBody:  { fontSize: 14, color: 'var(--text)', margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' },

  // Unread dot
  unreadDot: {
    display: 'inline-block', width: 8, height: 8,
    borderRadius: '50%', background: ORANGE,
    boxShadow: `0 0 6px ${ORANGE}`,
    flexShrink: 0,
  },

  // Reply count pill
  replyCountPill: {
    fontSize: 11, fontWeight: 700,
    padding: '2px 8px', borderRadius: 10,
  },

  // ── Thread panel ──
  threadPanel: {
    borderTop: '1px solid var(--border-light)',
    padding: '12px 16px 4px',
    background: 'rgba(0,0,0,0.08)',
  },
  noReplies: { fontSize: 13, color: 'var(--text-3)', margin: '4px 0 8px', textAlign: 'center' },

  replyList: {
    display: 'flex', flexDirection: 'column', gap: 8,
    marginBottom: 4,
  },
  replyBubble: {
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: '4px 12px 12px 12px',
    padding: '8px 12px',
    maxWidth: '85%',
  },
  replyMeta: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  replyAuthor: { fontSize: 12, fontWeight: 700, color: 'var(--text)' },
  replyTime:   { fontSize: 11, color: 'var(--text-3)' },
  replyBody:   { fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' },

  // ── Reply form (athlete) ──
  replyFormWrap: {
    borderTop: '1px solid var(--border-light)',
    padding: '10px 16px 12px',
    background: 'rgba(0,0,0,0.06)',
  },
  replyForm: { display: 'flex', gap: 8 },
  replyInput: {
    flex: 1,
    padding: '9px 13px',
    fontSize: 13,
    borderRadius: 10,
    border: '1px solid var(--input-border)',
    background: 'var(--card-inner)',
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    transition: 'border-color 0.15s',
  },
  replySubmitBtn: {
    padding: '9px 18px',
    fontSize: 13, fontWeight: 700,
    borderRadius: 10, border: 'none',
    color: '#fff', cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.15s',
    minWidth: 62,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  replyErr: {
    fontSize: 12, color: '#c73820',
    margin: '6px 0 0',
  },
}
