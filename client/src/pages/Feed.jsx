import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import AvatarUpload from '../components/AvatarUpload'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CommentItem({ comment, currentUserId, role, onDelete }) {
  return (
    <div style={styles.comment}>
      <AvatarUpload
        name={comment.author?.full_name}
        avatarUrl={comment.author?.avatar_url}
        size={26}
        color={BLUE}
        editable={false}
      />
      <div style={styles.commentBody}>
        <span style={styles.commentAuthor}>{comment.author?.full_name}</span>
        <span style={styles.commentTime}> · {timeAgo(comment.created_at)}</span>
        <p style={styles.commentText}>{comment.content}</p>
      </div>
      {(role === 'coach' || comment.author_id === currentUserId) && (
        <button style={styles.deleteSmall} onClick={() => onDelete(comment.id)} title="Delete">×</button>
      )}
    </div>
  )
}

function PostCard({ post, currentUserId, role, onDelete, onLike, onComment, onDeleteComment }) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  async function handleComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    await onComment(post.id, commentText.trim())
    setCommentText('')
    setSubmitting(false)
  }

  function toggleComments() {
    setShowComments(s => !s)
    if (!showComments) setTimeout(() => inputRef.current?.focus(), 50)
  }

  const canDelete = role === 'coach' || post.author_id === currentUserId

  return (
    <div style={styles.postCard}>
      {/* Header */}
      <div style={styles.postHeader}>
        <AvatarUpload
          name={post.author?.full_name}
          avatarUrl={post.author?.avatar_url}
          size={38}
          color={ORANGE}
          editable={false}
        />
        <div style={styles.postMeta}>
          <span style={styles.postAuthor}>{post.author?.full_name}</span>
          <span style={styles.postTime}>{timeAgo(post.created_at)}</span>
        </div>
        {canDelete && (
          <button style={styles.deleteBtn} onClick={() => onDelete(post.id)} title="Delete post">×</button>
        )}
      </div>

      {/* Content */}
      <p style={styles.postContent}>{post.content}</p>

      {/* Actions */}
      <div style={styles.postActions}>
        <button
          style={{ ...styles.actionBtn, color: post.liked_by_me ? ORANGE : 'var(--text-3)' }}
          onClick={() => onLike(post.id)}
        >
          <span style={{ fontSize: 16 }}>{post.liked_by_me ? '♥' : '♡'}</span>
          {post.like_count > 0 && <span>{post.like_count}</span>}
        </button>
        <button style={styles.actionBtn} onClick={toggleComments}>
          <span style={{ fontSize: 15 }}>💬</span>
          {post.comments.length > 0 && <span>{post.comments.length}</span>}
          <span>{showComments ? 'Hide' : 'Comment'}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={styles.commentsSection}>
          {post.comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              role={role}
              onDelete={onDeleteComment}
            />
          ))}
          <form onSubmit={handleComment} style={styles.commentForm}>
            <input
              ref={inputRef}
              style={styles.commentInput}
              placeholder="Write a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              maxLength={500}
            />
            <button
              type="submit"
              style={{ ...styles.commentSubmit, opacity: submitting || !commentText.trim() ? 0.5 : 1 }}
              disabled={submitting || !commentText.trim()}
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function Feed() {
  const { profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [composeText, setComposeText] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    api.get('/api/feed')
      .then(r => setPosts(r.data.posts || []))
      .catch(err => setError(err.response?.data?.error || 'Could not load feed.'))
      .finally(() => setLoading(false))
  }, [])

  async function handlePost(e) {
    e.preventDefault()
    if (!composeText.trim()) return
    setPosting(true)
    try {
      const res = await api.post('/api/feed', { content: composeText.trim() })
      const newPost = {
        ...res.data.post,
        author: { full_name: profile?.full_name, avatar_url: profile?.avatar_url },
        like_count: 0,
        liked_by_me: false,
        comments: [],
      }
      setPosts(prev => [newPost, ...prev])
      setComposeText('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post.')
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(postId) {
    if (!window.confirm('Delete this post?')) return
    try {
      await api.delete(`/api/feed/${postId}`)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete post.')
    }
  }

  async function handleLike(postId) {
    try {
      const res = await api.post(`/api/feed/${postId}/like`)
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        const delta = res.data.liked ? 1 : -1
        return { ...p, liked_by_me: res.data.liked, like_count: p.like_count + delta }
      }))
    } catch (err) {
      console.error('Like failed:', err)
    }
  }

  async function handleComment(postId, content) {
    try {
      const res = await api.post(`/api/feed/${postId}/comments`, { content })
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        return { ...p, comments: [...p.comments, res.data.comment] }
      }))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add comment.')
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await api.delete(`/api/feed/comments/${commentId}`)
      setPosts(prev => prev.map(p => ({
        ...p,
        comments: p.comments.filter(c => c.id !== commentId),
      })))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete comment.')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Team Feed</h1>
        <p style={styles.pageSub}>Stay connected with your team.</p>
      </div>

      {/* Compose */}
      <form onSubmit={handlePost} style={styles.composeCard}>
        <div style={styles.composeRow}>
          <AvatarUpload
            name={profile?.full_name}
            avatarUrl={profile?.avatar_url}
            size={36}
            color={ORANGE}
            editable={false}
          />
          <textarea
            style={styles.composeInput}
            placeholder="Share an update with your team…"
            value={composeText}
            onChange={e => setComposeText(e.target.value)}
            rows={composeText.split('\n').length > 2 ? 4 : 2}
            maxLength={1000}
          />
        </div>
        <div style={styles.composeFooter}>
          <span style={styles.charCount}>{composeText.length}/1000</span>
          <button
            type="submit"
            style={{ ...styles.postBtn, opacity: posting || !composeText.trim() ? 0.5 : 1 }}
            disabled={posting || !composeText.trim()}
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {error && <p style={styles.errorMsg}>{error}</p>}

      {loading ? (
        <p style={styles.loadingText}>Loading feed…</p>
      ) : posts.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No posts yet</p>
          <p style={styles.emptySub}>Be the first to share something with your team.</p>
        </div>
      ) : (
        <div style={styles.feedList}>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={profile?.id}
              role={profile?.role}
              onDelete={handleDelete}
              onLike={handleLike}
              onComment={handleComment}
              onDeleteComment={handleDeleteComment}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container:  { maxWidth: 640, margin: '0 auto' },
  pageHeader: { marginBottom: 20 },
  pageTitle:  { fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' },
  pageSub:    { fontSize: 14, color: 'var(--text-2)', fontStyle: 'italic', margin: 0 },
  loadingText:{ color: 'var(--text-3)', fontSize: 15 },
  errorMsg:   { color: '#c73820', fontSize: 14, marginBottom: 12 },

  // Compose
  composeCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '16px 18px',
    marginBottom: 20,
  },
  composeRow:   { display: 'flex', gap: 12, alignItems: 'flex-start' },
  composeInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 14,
    borderRadius: 8,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    outline: 'none',
    boxSizing: 'border-box',
  },
  composeFooter: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 10 },
  charCount: { fontSize: 12, color: 'var(--text-3)' },
  postBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
  },

  emptyState: { textAlign: 'center', paddingTop: 48 },
  emptyTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' },
  emptySub:   { fontSize: 14, color: 'var(--text-3)', margin: 0 },

  feedList: { display: 'flex', flexDirection: 'column', gap: 14 },

  // Post card
  postCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '16px 18px',
  },
  postHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  postMeta:   { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  postAuthor: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  postTime:   { fontSize: 12, color: 'var(--text-3)' },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-3)',
    fontSize: 20,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  postContent: { fontSize: 15, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 12px', whiteSpace: 'pre-wrap' },

  postActions: { display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px solid var(--border-light)' },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'none',
    border: 'none',
    color: 'var(--text-3)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 0',
  },

  // Comments
  commentsSection: { marginTop: 12, borderTop: '1px solid var(--border-light)', paddingTop: 12 },
  comment: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  commentTime: { fontSize: 11, color: 'var(--text-3)' },
  commentText: { fontSize: 13, color: 'var(--text-2)', margin: '3px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  deleteSmall: {
    background: 'none',
    border: 'none',
    color: 'var(--text-3)',
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
    flexShrink: 0,
  },
  commentForm: { display: 'flex', gap: 8, marginTop: 8 },
  commentInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 13,
    borderRadius: 8,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'inherit',
  },
  commentSubmit: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: BLUE,
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
}
