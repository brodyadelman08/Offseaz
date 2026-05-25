import { useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { EditIcon } from './Icons'

const ORANGE = '#F75709'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

/**
 * AvatarUpload — shows a profile photo or colored initials circle.
 *
 * Props:
 *   name       {string}   — used for initials fallback and alt text
 *   avatarUrl  {string}   — current photo URL (null/undefined = show initials)
 *   size       {number}   — diameter in px (default 48)
 *   color      {string}   — background color for initials circle (default orange)
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
  const inputRef = useRef(null)

  const displayUrl = localUrl || avatarUrl
  const fontSize = Math.max(10, Math.floor(size * 0.36))
  const iconSize = Math.max(12, Math.floor(size * 0.3))

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file || !session?.user?.id) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) return

    setUploading(true)
    try {
      const userId = session.user.id
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type] || 'jpg'
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      // Cache-bust so browsers fetch the updated image immediately
      const finalUrl = `${publicUrl}?cb=${Date.now()}`

      await api.patch('/api/auth/avatar', { avatar_url: finalUrl })
      setLocalUrl(finalUrl)
      onUpload?.(finalUrl)
    } catch (err) {
      console.error('[AvatarUpload] upload failed:', err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
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

      {/* Hover / loading overlay — only rendered when editable */}
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
  )
}
