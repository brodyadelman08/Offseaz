import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCoachAccess } from '../context/CoachAccessContext'
import { useTeam } from '../context/TeamContext'
import PreviewBanner from '../components/PreviewBanner'
import api from '../services/api'
import AvatarUpload from '../components/AvatarUpload'
import { HeartIcon, HeartFilledIcon, MessageIcon, AlertIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'

// ── Shared design tokens ──────────────────────────────────────────────────────
const T = {
  card:       'var(--card)',
  cardInner:  'var(--card-inner)',
  shadowBase: '0 2px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
  shadowHov:  '0 8px 28px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06)',
  trans:      'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
}

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

// ── Camera icon (inline SVG) ──────────────────────────────────────────────────
function CameraIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="2" x2="12" y2="12"/>
      <line x1="12" y1="2" x2="2" y2="12"/>
    </svg>
  )
}

// ── Client-side image compression using Canvas ────────────────────────────────
async function compressImage(file, maxDim = 1200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale  = Math.min(1, maxDim / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')) }
    img.src = objectUrl
  })
}

// ── Comment item ──────────────────────────────────────────────────────────────
function CommentItem({ comment, currentUserId, role, onDelete }) {
  return (
    <div style={st.comment}>
      <AvatarUpload
        name={comment.author?.full_name}
        avatarUrl={comment.author?.avatar_url}
        size={28} color={BLUE} editable={false}
      />
      <div style={st.commentBubble}>
        <div style={st.commentHeader}>
          <span style={st.commentAuthor}>{comment.author?.full_name}</span>
          <span style={st.commentTime}>{timeAgo(comment.created_at)}</span>
        </div>
        <p style={st.commentText}>{comment.content}</p>
      </div>
      {(role === 'coach' || comment.author_id === currentUserId) && (
        <button style={st.deleteSmall} onClick={() => onDelete(comment.id)} title="Delete">×</button>
      )}
    </div>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId, role, onDelete, onLike, onComment, onDeleteComment }) {
  const [showComments, setShowComments]  = useState(false)
  const [commentText, setCommentText]    = useState('')
  const [submitting, setSubmitting]      = useState(false)
  const [likeAnim, setLikeAnim]          = useState(false)
  const [imgExpanded, setImgExpanded]    = useState(false)
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
    if (!showComments) setTimeout(() => inputRef.current?.focus(), 60)
  }

  function handleLikeClick() {
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 350)
    onLike(post.id)
  }

  const canDelete = role === 'coach' || post.author_id === currentUserId

  return (
    <div className="feed-post-card" style={st.postCard}>
      {/* Header */}
      <div style={st.postHeader}>
        <AvatarUpload
          name={post.author?.full_name}
          avatarUrl={post.author?.avatar_url}
          size={40} color={ORANGE} editable={false}
        />
        <div style={st.postMeta}>
          <span style={st.postAuthor}>{post.author?.full_name}</span>
          <span style={st.postTime}>{timeAgo(post.created_at)}</span>
        </div>
        {canDelete && (
          <button style={st.deleteBtn} onClick={() => onDelete(post.id)} title="Delete post">×</button>
        )}
      </div>

      {/* Text content */}
      {post.content && (
        <p style={st.postContent}>{post.content}</p>
      )}

      {/* Photo */}
      {post.photo_url && (
        <div
          style={{
            ...st.postPhotoWrap,
            ...(post.content ? {} : { marginTop: 0 }),
          }}
          onClick={() => setImgExpanded(v => !v)}
          title={imgExpanded ? 'Collapse' : 'Expand'}
        >
          <img
            src={post.photo_url}
            alt="Post photo"
            style={{
              ...st.postPhoto,
              maxHeight: imgExpanded ? 600 : 320,
            }}
          />
        </div>
      )}

      {/* Action bar */}
      <div style={st.postActions}>
        <button
          style={{ ...st.actionBtn, color: post.liked_by_me ? ORANGE : 'var(--text-3)' }}
          onClick={handleLikeClick}
        >
          <span style={{
            display: 'inline-flex',
            transform: likeAnim ? 'scale(1.5)' : 'scale(1)',
            transition: likeAnim ? 'none' : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {post.liked_by_me
              ? <HeartFilledIcon size={17} color={ORANGE} />
              : <HeartIcon       size={17} color="var(--text-3)" />}
          </span>
          {post.like_count > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700 }}>{post.like_count}</span>
          )}
          <span>Like</span>
        </button>
        <button style={st.actionBtn} onClick={toggleComments}>
          <MessageIcon size={16} color="var(--text-3)" />
          {post.comments.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700 }}>{post.comments.length}</span>
          )}
          <span>{showComments ? 'Hide' : 'Comment'}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={st.commentsSection}>
          {post.comments.length > 0 && (
            <div style={st.commentsList}>
              {post.comments.map(c => (
                <CommentItem
                  key={c.id} comment={c}
                  currentUserId={currentUserId} role={role}
                  onDelete={onDeleteComment}
                />
              ))}
            </div>
          )}
          <form onSubmit={handleComment} style={st.commentForm}>
            <input
              ref={inputRef}
              style={st.commentInput}
              placeholder="Write a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              maxLength={500}
            />
            <button
              type="submit"
              style={{ ...st.commentSubmit, opacity: submitting || !commentText.trim() ? 0.45 : 1 }}
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Feed() {
  const { profile }      = useAuth()
  // Feed is shared between /coach/feed (CoachAccessProvider present) and
  // /athlete/feed (no provider — hook returns null).  Guard every access.
  const coachCtx         = useCoachAccess()
  const coachTeam        = coachCtx?.team ?? null
  const activeTeam       = useTeam()?.activeTeam ?? null
  // Derive the active team ID for whichever role is viewing
  const teamId = profile?.role === 'coach' ? coachTeam?.id : activeTeam?.id

  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [composeText, setComposeText]   = useState('')
  const [posting, setPosting]           = useState(false)
  const [composeFocused, setComposeFocused] = useState(false)
  const [feedBetaDismissed, setFeedBetaDismissed] = useState(
    () => localStorage.getItem('offseaz_feed_beta_dismissed') === '1'
  )

  // Photo state
  const [photoPreview, setPhotoPreview] = useState(null)   // data URL for preview
  const [photoDataUrl, setPhotoDataUrl] = useState(null)   // compressed data URL to upload
  const [photoMime, setPhotoMime]       = useState('image/jpeg')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoErr, setPhotoErr]         = useState('')
  const photoInputRef = useRef(null)

  useEffect(() => {
    const url = teamId ? `/api/feed?teamId=${teamId}` : '/api/feed'
    api.get(url)
      .then(r => setPosts(r.data.posts || []))
      .catch(err => setError(err.response?.data?.error || 'Could not load feed.'))
      .finally(() => setLoading(false))
  }, [teamId])

  async function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoErr('')
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
    if (!allowed.includes(file.type)) {
      setPhotoErr('Only JPEG, PNG, WebP, or GIF images are supported.')
      if (photoInputRef.current) photoInputRef.current.value = ''
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setPhotoErr('Image must be under 20 MB.')
      if (photoInputRef.current) photoInputRef.current.value = ''
      return
    }
    try {
      const compressed = await compressImage(file)
      setPhotoPreview(compressed)
      setPhotoDataUrl(compressed)
      setPhotoMime('image/jpeg')
      setComposeFocused(true)
    } catch {
      setPhotoErr('Failed to process image. Please try another file.')
    }
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  function removePhoto() {
    setPhotoPreview(null)
    setPhotoDataUrl(null)
    setPhotoErr('')
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!composeText.trim() && !photoDataUrl) return
    setPosting(true)
    setPhotoErr('')
    try {
      let uploadedPhotoUrl = null

      // Upload photo first if present
      if (photoDataUrl) {
        setPhotoUploading(true)
        try {
          const res = await api.post('/api/feed/photos', { dataUrl: photoDataUrl, mimeType: photoMime })
          uploadedPhotoUrl = res.data.url
        } finally {
          setPhotoUploading(false)
        }
      }

      const res = await api.post(`/api/feed${teamId ? `?teamId=${teamId}` : ''}`, {
        content:   composeText.trim(),
        photo_url: uploadedPhotoUrl,
      })
      const newPost = {
        ...res.data.post,
        author:      { full_name: profile?.full_name, avatar_url: profile?.avatar_url },
        like_count:  0,
        liked_by_me: false,
        comments:    [],
      }
      setPosts(prev => [newPost, ...prev])
      setComposeText('')
      setPhotoPreview(null)
      setPhotoDataUrl(null)
      setComposeFocused(false)
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

  const canPost = !posting && (composeText.trim().length > 0 || photoDataUrl !== null)
  // Athletes without a team see a locked preview instead of the live feed
  const isAthleteNoTeam = profile?.role === 'athlete' && !activeTeam

  if (isAthleteNoTeam) {
    return (
      <div style={st.container}>
        <div style={st.pageHeader}>
          <h1 style={st.pageTitle}>Team Feed</h1>
          <p style={st.pageSub}>Stay connected with your team.</p>
        </div>
        <PreviewBanner noun="team feed" />
        {/* Ghost posts to show what the feed looks like */}
        {[1, 2, 3].map(i => (
          <div key={i} style={st.ghostPost}>
            <div style={st.ghostAvatar} />
            <div style={st.ghostContent}>
              <div style={{ ...st.ghostLine, width: `${40 + i * 15}%` }} />
              <div style={{ ...st.ghostLine, width: `${60 + i * 10}%`, marginTop: 8 }} />
              {i === 1 && <div style={{ ...st.ghostLine, width: '45%', marginTop: 8 }} />}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={st.container}>
      {/* Header */}
      <div style={st.pageHeader}>
        <h1 style={st.pageTitle}>Team Feed</h1>
        <p style={st.pageSub}>Stay connected with your team.</p>
      </div>

      {/* Beta notice */}
      {!feedBetaDismissed && (
        <div style={st.feedBetaBanner}>
          <span style={st.feedBetaText}>
            <span style={st.feedBetaBadge}>BETA</span>
            Offseaz is currently in beta — photo storage is limited. Keep photos under 5MB for best performance.{' '}
            <span style={st.feedBetaHighlight}>Video posting is coming soon.</span>
          </span>
          <button
            style={st.feedBetaClose}
            onClick={() => {
              setFeedBetaDismissed(true)
              localStorage.setItem('offseaz_feed_beta_dismissed', '1')
            }}
            aria-label="Dismiss"
          >
            <XIcon size={12} />
          </button>
        </div>
      )}

      {/* Compose box */}
      <form onSubmit={handlePost} style={{
        ...st.composeCard,
        borderColor: composeFocused ? 'rgba(247,87,9,0.35)' : 'var(--border)',
        boxShadow: composeFocused
          ? '0 0 0 3px rgba(247,87,9,0.08), 0 4px 20px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 4px 20px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={st.composeRow}>
          <AvatarUpload
            name={profile?.full_name}
            avatarUrl={profile?.avatar_url}
            size={38} color={ORANGE} editable={false}
          />
          <textarea
            style={st.composeInput}
            placeholder="Share an update with your team…"
            value={composeText}
            onChange={e => setComposeText(e.target.value)}
            onFocus={() => setComposeFocused(true)}
            onBlur={() => setComposeFocused(false)}
            rows={composeText.split('\n').length > 2 ? 4 : 2}
            maxLength={1000}
          />
        </div>

        {/* Photo preview */}
        {photoPreview && (
          <div style={st.previewWrap}>
            <img src={photoPreview} alt="Preview" style={st.previewImg} />
            <button type="button" style={st.previewRemove} onClick={removePhoto} title="Remove photo">
              <XIcon size={12} />
            </button>
          </div>
        )}

        {photoErr && (
          <p style={st.photoErr}><AlertIcon size={14} color="#c73820" /> {photoErr}</p>
        )}

        {/* Hidden file input */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={handlePhotoSelect}
        />

        {(composeFocused || composeText.length > 0 || photoPreview) && (
          <div style={st.composeFooter}>
            {/* Attach photo button */}
            <button
              type="button"
              style={st.photoBtn}
              onClick={() => photoInputRef.current?.click()}
              title="Attach photo"
              disabled={posting}
            >
              <CameraIcon size={16} color={photoPreview ? ORANGE : 'var(--text-3)'} />
              <span style={{ color: photoPreview ? ORANGE : 'var(--text-3)' }}>
                {photoPreview ? 'Change photo' : 'Add photo'}
              </span>
            </button>

            <span style={st.charCount}>{composeText.length}/1000</span>

            <button
              type="submit"
              style={{ ...st.postBtn, opacity: canPost ? 1 : 0.45 }}
              disabled={!canPost}
            >
              {posting ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span className="survey-spinner-sm" />
                  {photoUploading ? 'Uploading…' : 'Posting…'}
                </span>
              ) : 'Post to team'}
            </button>
          </div>
        )}

        {/* Show photo button even when compose is collapsed */}
        {!composeFocused && composeText.length === 0 && !photoPreview && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)', display: 'flex' }}>
            <button
              type="button"
              style={st.photoBtn}
              onClick={() => { photoInputRef.current?.click(); setComposeFocused(true) }}
              title="Attach photo"
            >
              <CameraIcon size={16} color="var(--text-3)" />
              <span style={{ color: 'var(--text-3)' }}>Add photo</span>
            </button>
          </div>
        )}
      </form>

      {error && <div style={st.errorMsg}><AlertIcon size={14} color="#c73820" /> {error}</div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ width: '45%', height: 14 }} />
                  <div className="skeleton" style={{ width: '25%', height: 12 }} />
                </div>
              </div>
              <div className="skeleton" style={{ width: '80%', height: 14, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: '60%', height: 14 }} />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={st.emptyState}>
          <div style={st.emptyIcon}>
            <MessageIcon size={32} color={ORANGE} />
          </div>
          <p style={st.emptyTitle}>No posts yet</p>
          <p style={st.emptySub}>Be the first to post — share a workout, PR, or update with your team.</p>
        </div>
      ) : (
        <div style={st.feedList}>
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

// ── Styles ────────────────────────────────────────────────────────────────────
const st = {
  container:  { maxWidth: 640, margin: '0 auto' },

  pageHeader: { marginBottom: 24 },
  pageTitle:  { fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', letterSpacing: -0.4 },
  pageSub:    { fontSize: 14, color: 'var(--text-2)', margin: 0 },

  loadingWrap: { display: 'flex', justifyContent: 'center', paddingTop: 48 },
  errorMsg: {
    background: 'rgba(199,56,32,0.08)',
    border: '1px solid rgba(199,56,32,0.22)',
    color: '#c73820',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },

  // ── Compose ──
  composeCard: {
    background: `linear-gradient(145deg, rgba(247,87,9,0.04) 0%, var(--card) 100%)`,
    border: '1.5px solid var(--border)',
    borderRadius: 18,
    padding: '18px 20px 16px',
    marginBottom: 24,
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  },
  composeRow: { display: 'flex', gap: 13, alignItems: 'flex-start' },
  composeInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 14,
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--card-inner)',
    color: 'var(--text)',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.6,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },

  // Photo preview
  previewWrap: {
    position: 'relative',
    marginTop: 12,
    display: 'inline-block',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  previewImg: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: 220,
    objectFit: 'cover',
    borderRadius: 12,
  },
  previewRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.72)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'background 0.14s',
  },
  photoErr: {
    marginTop: 8, fontSize: 12, color: '#c73820', margin: '8px 0 0',
  },

  composeFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid var(--border-light)',
    flexWrap: 'wrap',
  },
  photoBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text-3)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 11px',
    borderRadius: 8,
    transition: 'border-color 0.14s, background 0.14s',
  },
  charCount: { fontSize: 12, color: 'var(--text-3)', flex: 1, textAlign: 'right' },
  postBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 800,
    borderRadius: 10,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: 0.2,
    boxShadow: '0 2px 16px rgba(247,87,9,0.38), 0 1px 4px rgba(0,0,0,0.20)',
    transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
    whiteSpace: 'nowrap',
  },

  // ── Empty / loading ──
  emptyState: { textAlign: 'center', paddingTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  emptyIcon:  { width: 64, height: 64, borderRadius: '50%', background: 'var(--card-inner)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 },
  emptySub:   { fontSize: 14, color: 'var(--text-3)', margin: 0 },

  feedList: { display: 'flex', flexDirection: 'column', gap: 14 },

  // ── Post card ──
  postCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: '18px 20px',
    boxShadow: T.shadowBase,
    transition: T.trans,
    cursor: 'default',
  },
  postHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  postMeta:   { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  postAuthor: { fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  postTime:   { fontSize: 12, color: 'var(--text-3)' },
  deleteBtn: {
    background: 'none', border: 'none', color: 'var(--text-3)',
    fontSize: 22, cursor: 'pointer', lineHeight: 1,
    padding: '6px 8px', borderRadius: 6, alignSelf: 'flex-start',
    opacity: 0.6, transition: 'opacity 0.12s',
    minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  postContent: { fontSize: 15, color: 'var(--text)', lineHeight: 1.65, margin: '0 0 14px', whiteSpace: 'pre-wrap' },

  // Post photo
  postPhotoWrap: {
    marginTop: 0,
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid var(--border)',
    cursor: 'zoom-in',
    lineHeight: 0,
  },
  postPhoto: {
    width: '100%',
    objectFit: 'cover',
    display: 'block',
    borderRadius: 12,
    transition: 'max-height 0.3s ease',
  },

  postActions: {
    display: 'flex',
    gap: 4,
    paddingTop: 10,
    borderTop: '1px solid var(--border-light)',
  },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none',
    color: 'var(--text-3)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', padding: '6px 12px', borderRadius: 8,
    transition: 'background 0.14s, color 0.14s',
  },

  // ── Comments ──
  commentsSection: {
    marginTop: 12,
    borderTop: '1px solid var(--border-light)',
    paddingTop: 14,
  },
  commentsList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 },
  comment: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  commentBubble: {
    flex: 1,
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: '4px 12px 12px 12px',
    padding: '8px 12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  },
  commentHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  commentTime:   { fontSize: 11, color: 'var(--text-3)' },
  commentText:   { fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  deleteSmall: {
    background: 'none', border: 'none', color: 'var(--text-3)',
    fontSize: 18, cursor: 'pointer', lineHeight: 1,
    padding: '6px 6px', flexShrink: 0, opacity: 0.5,
    minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  commentForm:   { display: 'flex', gap: 8 },
  commentInput: {
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
  commentSubmit: {
    padding: '9px 18px',
    fontSize: 13, fontWeight: 700,
    borderRadius: 10, border: 'none',
    background: BLUE, color: '#fff', cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 10px rgba(48,142,189,0.32)',
    transition: 'opacity 0.15s',
  },

  // ── Locked preview ghost posts ────────────────────────────────────────────
  ghostPost: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '18px 20px', marginBottom: 14,
    opacity: 0.45, pointerEvents: 'none',
  },
  ghostAvatar: {
    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
    background: 'var(--border)',
  },
  ghostContent: { flex: 1 },
  ghostLine: {
    height: 12, borderRadius: 6, background: 'var(--border)',
  },

  // ── Feed beta notice ──────────────────────────────────────────────────────
  feedBetaBanner: {
    width: '100%',
    background: '#111',
    border: '1px solid rgba(247,87,9,0.25)',
    borderRadius: 10,
    padding: '9px 4px 9px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  feedBetaText: {
    fontSize: 13,
    color: '#AAAAAA',
    lineHeight: 1.5,
    flex: 1,
  },
  feedBetaBadge: {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1,
    color: ORANGE,
    background: 'rgba(247,87,9,0.15)',
    border: '1px solid rgba(247,87,9,0.35)',
    padding: '2px 7px',
    borderRadius: 4,
    marginRight: 8,
    verticalAlign: 'middle',
  },
  feedBetaHighlight: {
    color: ORANGE,
    fontWeight: 600,
  },
  feedBetaClose: {
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    color: '#555',
    cursor: 'pointer',
    padding: '6px 10px',
    lineHeight: 1,
    borderRadius: 6,
    transition: 'color 0.15s',
    minWidth: 32,
    minHeight: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
