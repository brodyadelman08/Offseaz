import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { EditIcon } from './Icons'

const ORANGE = '#F75709'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 4 * 1024 * 1024 // 4 MB

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * AvatarUpload — shows a profile photo or colored initials circle.
 *
 * Props:
 *   name       {string}   — used for initials fallback and alt text
 *   avatarUrl  {string}   — current photo URL (null/undefined → initials)
 *   size       {number}   — diameter in px (default 48)
 *   color      {string}   — background color for initials circle
 *   editable   {boolean}  — if true, clicking opens a file picker
 *   onUpload   {function} — called with new URL string after a successful upload
 */
export default function AvatarUpload({
  name,
  avatarUrl,
  size = 48,
  color = ORANGE,
  editable = false,
  onUpload,
}) {
  const { session } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [localUrl, setLocalUrl] = useState(null)
  const [hovered, setHovered] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef(null)

  const displayUrl = localUrl || avatarUrl
  const fontSize = Math.max(10, Math.floor(size * 0.36))
  const iconSize = Math.max(12, Math.floor(size * 0.3))

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')

    if (!session?.user?.id) {
      setUploadError('Not signed in')
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('JPEG, PNG, or WebP only')
      return
    }
    if (file.size > MAX_BYTES) {
      setUploadError('Image must be under 4 MB')
      return
    }

    setUploading(true)
    try {
      // Convert to base64 and send to server.
      // The server uploads via the service-role key, so no storage RLS is needed.
      const dataUrl = await readAsDataUrl(file)
      const res = await api.patch('/api/auth/avatar', { dataUrl, mimeType: file.type })
      const url = res.data.profile.avatar_url
      setLocalUrl(url)
      onUpload?.(url)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Upload failed'
      setUploadError(msg)
      console.error('[AvatarUpload]', msg)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0, display: 'inline-block' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          cursor: editable ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'hidden',
          background: displayUrl ? '#1a1a1a' : color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => editable && !uploading && inputRef.current?.click()}
        onMouseEnter={() => editable && setHovered(true)}
        onMouseLeave={() => editable && setHovered(false)}
        title={editable ? 'Click to change photo' : (name || '')}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={name || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize, fontWeight: 700, color: '#fff', userSelect: 'none', lineHeight: 1 }}>
            {initials(name)}
          </span>
        )}

        {/* Hover / uploading overlay */}
        {editable && (hovered || uploading) && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}>
            {uploading ? (
              <div style={{
                width: iconSize,
                height: iconSize,
                border: '2px solid rgba(255,255,255,0.5)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : (
              <EditIcon size={iconSize} color="#fff" />
            )}
          </div>
        )}

        {editable && (
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        )}
      </div>

      {/* Error message below the avatar */}
      {editable && uploadError && (
        <div style={{
          position: 'absolute',
          top: size + 6,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(199,56,32,0.95)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          {uploadError}
        </div>
      )}
    </div>
  )
}
