import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { useCoachAccess } from '../context/CoachAccessContext'
import PreviewBanner from '../components/PreviewBanner'
import api from '../services/api'
import { ArrowLeftIcon, SendIcon, MessageIcon } from '../components/Icons'

const ORANGE = '#F75709'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  return p.length === 1
    ? (p[0][0] || '?').toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function timeLabel(dateStr) {
  if (!dateStr) return ''
  const d    = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ── ConvItem ─────────────────────────────────────────────────────────────────

function ConvItem({ conv, active, onClick }) {
  const unread = conv.unreadCount > 0
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        width: '100%', padding: '10px 12px',
        border: 'none', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        background: active
          ? `linear-gradient(135deg, rgba(247,87,9,0.13) 0%, rgba(247,87,9,0.06) 100%)`
          : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: conv.type === 'group' ? 11 : 13,
        letterSpacing: conv.type === 'group' ? 0.5 : 0.4,
        background: active ? ORANGE + '22' : 'var(--card-inner)',
        border: `2px solid ${active ? ORANGE + '77' : 'var(--border)'}`,
        color: active ? ORANGE : 'var(--text-2)',
        transition: 'border-color 0.15s, background 0.15s, color 0.15s',
      }}>
        {conv.type === 'group' ? 'GRP' : initials(conv.name)}
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{
            fontSize: 14, fontWeight: unread ? 700 : 600,
            color: active ? ORANGE : 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            transition: 'color 0.15s',
          }}>
            {conv.name || (conv.type === 'group' ? 'Group Chat' : 'Direct Message')}
          </span>
          {conv.lastMessage && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
              {timeLabel(conv.lastMessage.sent_at)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 2 }}>
          <span style={{
            fontSize: 12, fontWeight: unread ? 500 : 400,
            color: unread ? 'var(--text-2)' : 'var(--text-3)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {conv.lastMessage
              ? `${conv.lastMessage.is_mine ? 'You: ' : ''}${conv.lastMessage.body}`
              : 'No messages yet'}
          </span>
          {unread && (
            <span style={{
              background: ORANGE, color: '#fff', fontSize: 10, fontWeight: 800,
              borderRadius: 10, padding: '1px 6px',
              minWidth: 18, textAlign: 'center', flexShrink: 0,
            }}>
              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({ msg, showName }) {
  if (msg.is_mine) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: 2 }}>
        <div style={{
          maxWidth: '72%',
          background: ORANGE,
          color: '#fff',
          borderRadius: '18px 4px 18px 18px',
          padding: '9px 14px',
          fontSize: 14, lineHeight: 1.5,
          boxShadow: '0 2px 8px rgba(247,87,9,0.28)',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {msg.body}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, marginRight: 4 }}>
          {timeLabel(msg.sent_at)}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 2 }}>
      {/* Avatar */}
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700,
        background: 'var(--card-inner)', border: '1px solid var(--border)',
        color: 'var(--text-3)', letterSpacing: 0.3, alignSelf: 'flex-end',
      }}>
        {msg.initials || initials(msg.sender_name)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '72%' }}>
        {showName && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, marginLeft: 2 }}>
            {msg.sender_name}
          </span>
        )}
        <div style={{
          background: 'var(--card-inner)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          borderRadius: '4px 18px 18px 18px',
          padding: '9px 14px',
          fontSize: 14, lineHeight: 1.5,
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {msg.body}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, marginLeft: 4 }}>
          {timeLabel(msg.sent_at)}
        </span>
      </div>
    </div>
  )
}

// ── Date separator ────────────────────────────────────────────────────────────

function DateSep({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '14px 0 10px', userSelect: 'none',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
      <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
    </div>
  )
}

function dayKey(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(dateStr) {
  const d   = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Messages() {
  const { profile }  = useAuth()
  // CoachAccessContext is only provided inside /coach routes.
  // On /athlete routes useCoachAccess() returns null — guard every access.
  const coachCtx     = useCoachAccess()
  const teamCtx      = useTeam()
  const activeTeam   = teamCtx?.activeTeam ?? null

  // Unified active-team ID: coaches use CoachAccessContext (multi-team),
  // athletes use TeamContext.  This drives all conversation reloads.
  const activeTeamId = profile?.role === 'coach'
    ? (coachCtx?.activeTeamId ?? null)
    : (teamCtx?.activeTeam?.id ?? null)

  const [convs, setConvs]                 = useState([])
  const [activeId, setActiveId]           = useState(null)
  const [messages, setMessages]           = useState([])
  const [text, setText]                   = useState('')
  const [sending, setSending]             = useState(false)
  const [loadingConvs, setLoadingConvs]   = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [mobileView, setMobileView]       = useState('list')   // 'list' | 'chat'
  const [sendErr, setSendErr]             = useState('')

  const threadRef        = useRef(null)
  const inputRef         = useRef(null)
  const pollRef          = useRef(null)
  const autoScrollRef    = useRef(true)       // scroll to bottom on update?
  const activeIdRef      = useRef(null)       // tracks activeId without stale closure
  const activeTeamIdRef  = useRef(activeTeamId) // tracks teamId without stale closure

  activeIdRef.current     = activeId
  activeTeamIdRef.current = activeTeamId

  // ── Scroll helpers ──────────────────────────────────────────────────────────

  const scrollBottom = useCallback(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [])

  function checkNearBottom() {
    const el = threadRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  function handleThreadScroll() {
    autoScrollRef.current = checkNearBottom()
  }

  // ── Data loaders ────────────────────────────────────────────────────────────

  // Both loaders accept an explicit teamId so they can be called with the
  // current active team without relying on a stale closure over state.

  async function loadConvs(teamId) {
    try {
      const url = teamId
        ? `/api/messages/conversations?team_id=${encodeURIComponent(teamId)}`
        : '/api/messages/conversations'
      const { data } = await api.get(url)
      const list = data.conversations || []
      // Pin group chat to the top of the list so it's always first on mobile
      list.sort((a, b) => {
        if (a.type === 'group' && b.type !== 'group') return -1
        if (b.type === 'group' && a.type !== 'group') return 1
        return 0
      })
      setConvs(list)
    } catch { /* silence */ }
  }

  async function loadThread(convId, teamId, isPoll = false) {
    if (!isPoll) setLoadingThread(true)
    try {
      const url = teamId
        ? `/api/messages/thread/${convId}?team_id=${encodeURIComponent(teamId)}`
        : `/api/messages/thread/${convId}`
      const { data } = await api.get(url)
      const incoming = data.messages || []
      setMessages(prev => {
        if (isPoll) {
          // Only update if there are new messages
          if (incoming.length === prev.length) return prev
        }
        return incoming
      })
      if (!isPoll) loadConvs(teamId)
    } catch { /* silence */ }
    finally { if (!isPoll) setLoadingThread(false) }
  }

  // ── Open a conversation ─────────────────────────────────────────────────────

  function openConv(convId) {
    setActiveId(convId)
    setMessages([])
    setSendErr('')
    setText('')
    autoScrollRef.current = true
    setMobileView('chat')
    loadThread(convId, activeTeamIdRef.current)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  // ── Send ────────────────────────────────────────────────────────────────────

  async function handleSend() {
    const content = text.trim()
    if (!content || !activeId || sending) return
    setSending(true)
    setSendErr('')
    setText('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    autoScrollRef.current = true
    try {
      const { data } = await api.post(`/api/messages/thread/${activeId}`, { content })
      setMessages(prev => [...prev, data.message])
      loadConvs(activeTeamIdRef.current)
    } catch (err) {
      setSendErr(err.response?.data?.error || 'Failed to send.')
      setText(content)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleTextInput(e) {
    setText(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Reload conversations whenever the active team changes (or on initial mount).
  // Also resets any open thread so the user isn't left viewing a conversation
  // that belongs to the previous team.
  useEffect(() => {
    // Athletes with no team see the preview banner — nothing to load
    if (profile?.role === 'athlete' && !activeTeamId) {
      setLoadingConvs(false)
      return
    }

    // Reset all chat state before loading the new team's conversations
    setActiveId(null)
    setMessages([])
    setConvs([])
    setSendErr('')
    setText('')
    setMobileView('list')
    if (pollRef.current) clearInterval(pollRef.current)

    setLoadingConvs(true)
    loadConvs(activeTeamId).finally(() => setLoadingConvs(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (autoScrollRef.current) {
      const id = setTimeout(scrollBottom, 40)
      return () => clearTimeout(id)
    }
  }, [messages, scrollBottom])

  // Poll active thread every 8 s — passes activeTeamId via ref so no stale closure
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!activeId) return
    pollRef.current = setInterval(() => {
      if (activeIdRef.current) loadThread(activeIdRef.current, activeTeamIdRef.current, true)
    }, 8000)
    return () => clearInterval(pollRef.current)
  }, [activeId])

  // ── Derived ─────────────────────────────────────────────────────────────────

  const activeConv = convs.find(c => c.id === activeId) || null

  // Build message list with date separators
  const msgNodes = []
  let lastDay = null
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const dk  = dayKey(msg.sent_at)
    if (dk !== lastDay) {
      msgNodes.push(<DateSep key={`sep-${dk}`} label={dayLabel(msg.sent_at)} />)
      lastDay = dk
    }
    const prev     = messages[i - 1]
    const showName = !msg.is_mine && activeConv?.type === 'group' &&
      (!prev || prev.sender_id !== msg.sender_id || prev.is_mine)
    msgNodes.push(<Bubble key={msg.id} msg={msg} showName={showName} />)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  // Athletes without a team see a locked preview
  if (profile?.role === 'athlete' && !activeTeam) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 0' }}>
        <PreviewBanner noun="team messaging" />
        {/* Ghost conversation list */}
        <div style={{ opacity: 0.35, pointerEvents: 'none' }}>
          {[80, 65, 55].map((w, i) => (
            <div key={i} style={st.ghostConv}>
              <div style={st.ghostAvatar2} />
              <div style={{ flex: 1 }}>
                <div style={{ ...st.ghostLine2, width: `${w}%` }} />
                <div style={{ ...st.ghostLine2, width: `${w - 20}%`, marginTop: 6, opacity: 0.6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="chat-shell">

      {/* ── Left sidebar ── */}
      <div className={`chat-sidebar${mobileView === 'chat' ? ' chat-sidebar-hidden' : ''}`}>
        <div style={st.sidebarHead}>
          <span style={st.sidebarTitle}>Messages</span>
        </div>

        {loadingConvs ? (
          <div style={{ padding: '8px' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div className="skeleton" style={{ width: '55%', height: 14 }} />
                  <div className="skeleton" style={{ width: '75%', height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : convs.length === 0 ? (
          <div style={st.emptyConvs}>
            <p style={st.emptyConvsText}>No conversations yet.</p>
            {profile?.role === 'coach' && (
              <p style={st.emptyConvsSub}>Add athletes to your team to start messaging.</p>
            )}
          </div>
        ) : (
          <div className="chat-sidebar-list" style={st.convList}>
            {convs.map(conv => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeId}
                onClick={() => openConv(conv.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Main chat panel ── */}
      <div className={`chat-main${mobileView === 'list' ? ' chat-main-hidden' : ''}`}>
        {!activeId ? (
          <div style={st.noConv}>
            <div style={st.noConvIcon}><MessageIcon size={40} color="var(--text-3)" /></div>
            <p style={st.noConvTitle}>Select a conversation</p>
            <p style={st.noConvSub}>Choose a chat from the sidebar to get started.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={st.chatHead}>
              <button className="chat-back-btn" style={st.backBtn} onClick={() => setMobileView('list')}>
                <ArrowLeftIcon size={20} />
              </button>

              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: ORANGE + '20', border: `2px solid ${ORANGE}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: activeConv?.type === 'group' ? 10 : 12,
                color: ORANGE, letterSpacing: 0.4,
              }}>
                {activeConv?.type === 'group' ? 'GRP' : initials(activeConv?.name)}
              </div>

              <div>
                <div style={st.headName}>
                  {activeConv?.name || (activeConv?.type === 'group' ? 'Group Chat' : 'Direct Message')}
                </div>
                <div style={st.headSub}>
                  {activeConv?.type === 'group' ? 'Everyone on the team' : 'Direct message'}
                </div>
              </div>
            </div>

            {/* Message thread */}
            <div
              ref={threadRef}
              style={st.thread}
              onScroll={handleThreadScroll}
            >
              {loadingThread ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 4px' }}>
                  <div className="skeleton" style={{ width: '55%', height: 36, borderRadius: 14, alignSelf: 'flex-start' }} />
                  <div className="skeleton" style={{ width: '40%', height: 36, borderRadius: 14, alignSelf: 'flex-end' }} />
                  <div className="skeleton" style={{ width: '60%', height: 36, borderRadius: 14, alignSelf: 'flex-start' }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={st.emptyThread}>
                  <p style={st.emptyThreadText}>No messages yet — say something!</p>
                </div>
              ) : (
                <div style={st.bubbleList}>
                  {msgNodes}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div style={st.inputBar}>
              {sendErr && <div style={st.sendErrBox}>{sendErr}</div>}
              <div style={st.inputRow}>
                <textarea
                  ref={inputRef}
                  style={st.input}
                  value={text}
                  onInput={handleTextInput}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message…"
                  rows={1}
                  disabled={sending}
                />
                <button
                  style={{
                    ...st.sendBtn,
                    opacity: !text.trim() || sending ? 0.38 : 1,
                    cursor:  !text.trim() || sending ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                >
                  {sending ? <span className="survey-spinner-sm" /> : <SendIcon />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = {
  // Sidebar
  sidebarHead: {
    padding: '16px 16px 12px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3,
  },
  convList: {
    flex: 1, overflowY: 'auto', padding: '8px',
  },
  emptyConvs: {
    padding: '28px 20px', textAlign: 'center',
  },
  emptyConvsText: { fontSize: 14, color: 'var(--text-2)', margin: '0 0 6px' },
  emptyConvsSub:  { fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 },

  // No conversation selected
  noConv: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', gap: 10, padding: 40,
  },
  noConvIcon:  { fontSize: 40 },
  noConvTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 },
  noConvSub:   { fontSize: 14, color: 'var(--text-3)', margin: 0, textAlign: 'center', lineHeight: 1.5 },

  // Chat header
  chatHead: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 18px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--card)',
    flexShrink: 0,
  },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-2)', padding: '4px 6px',
    borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.14s',
  },
  headName: { fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  headSub:  { fontSize: 12, color: 'var(--text-3)', marginTop: 1 },

  // Thread
  thread: {
    flex: 1, overflowY: 'auto',
    display: 'flex', flexDirection: 'column',
    background: 'var(--bg)',
  },
  bubbleList: {
    padding: '12px 18px 8px',
    display: 'flex', flexDirection: 'column',
    minHeight: '100%', justifyContent: 'flex-end',
  },
  emptyThread: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
  },
  emptyThreadText: { fontSize: 14, color: 'var(--text-3)', margin: 0 },

  // Input
  inputBar: {
    borderTop: '1px solid var(--border)',
    padding: '10px 14px',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
    background: 'var(--card)',
    flexShrink: 0,
  },
  sendErrBox: {
    fontSize: 12, color: '#c73820',
    background: 'rgba(199,56,32,0.07)',
    border: '1px solid rgba(199,56,32,0.18)',
    borderRadius: 8, padding: '6px 10px', marginBottom: 8,
  },
  inputRow: {
    display: 'flex', gap: 10, alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    padding: '10px 15px',
    fontSize: 14,
    borderRadius: 22,
    border: '1px solid var(--input-border)',
    background: 'var(--card-inner)',
    color: 'var(--text)',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    outline: 'none',
    maxHeight: 120,
    overflowY: 'auto',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    scrollbarWidth: 'none',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: '50%', border: 'none',
    background: ORANGE, color: '#fff', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 10px rgba(247,87,9,0.35)',
    transition: 'opacity 0.15s, transform 0.1s',
  },

  // ── Locked preview ghost UI ────────────────────────────────────────────────
  ghostConv: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 18px', borderBottom: '1px solid var(--border)',
  },
  ghostAvatar2: {
    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
    background: 'var(--border)',
  },
  ghostLine2: { height: 11, borderRadius: 6, background: 'var(--border)' },
}
