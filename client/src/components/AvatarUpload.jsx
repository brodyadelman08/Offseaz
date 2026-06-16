import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { EditIcon } from './Icons'

const ORANGE = '#F75709'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const CROP_SIZE = 260 // diameter of the crop circle in px

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

/**
 * AvatarUpload — profile photo with drag-to-reposition crop step before upload.
 *
 * Props:
 *   name       {string}   — initials fallback and alt text
 *   avatarUrl  {string}   — current photo URL
 *   size       {number}   — diameter in px (default 48)
 *   color      {string}   — background for initials circle
 *   editable   {boolean}  — if true, clicking opens file picker → crop → upload
 *   onUpload   {function} — called with new URL after successful upload
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

  // Avatar display state
  const [uploading, setUploading]   = useState(false)
  const [localUrl, setLocalUrl]     = useState(null)
  const [hovered, setHovered]       = useState(false)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef(null)

  // Crop modal state
  const [cropSrc, setCropSrc]       = useState(null)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [cropScale, setCropScale]   = useState(1)

  // Crop refs
  const imgRef        = useRef(null)
  const containerRef  = useRef(null)
  const cropUrlRef    = useRef(null)
  const isDragging    = useRef(false)
  const lastPos       = useRef({ x: 0, y: 0 })
  const pinchDist     = useRef(null)

  const displayUrl = localUrl || avatarUrl
  const fontSize   = Math.max(10, Math.floor(size * 0.36))
  const iconSize   = Math.max(12, Math.floor(size * 0.3))

  // ── Crop helpers ─────────────────────────────────────────────────────────────

  function getMinScale() {
    const img = imgRef.current
    if (!img || !img.naturalWidth) return 0.1
    return CROP_SIZE / Math.min(img.naturalWidth, img.naturalHeight)
  }

  function clampOffset(offset, scale) {
    const img = imgRef.current
    if (!img || !img.naturalWidth) return offset
    const maxX = Math.max(0, (img.naturalWidth  * scale - CROP_SIZE) / 2)
    const maxY = Math.max(0, (img.naturalHeight * scale - CROP_SIZE) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, offset.x)),
      y: Math.min(maxY, Math.max(-maxY, offset.y)),
    }
  }

  function openCrop(file) {
    if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current)
    const url = URL.createObjectURL(file)
    cropUrlRef.current = url
    setCropSrc(url)
    setCropOffset({ x: 0, y: 0 })
    setCropScale(1)
  }

  function closeCrop() {
    if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current)
    cropUrlRef.current = null
    setCropSrc(null)
  }

  // Set initial scale so the image fills (covers) the circle on load
  function onImgLoad() {
    const scale = getMinScale()
    setCropScale(scale)
    setCropOffset({ x: 0, y: 0 })
  }

  // Non-passive wheel listener for scroll-to-zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.91
      setCropScale(prev => {
        const next = prev * factor
        return Math.min(Math.max(next, getMinScale()), 5)
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [cropSrc])

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current)
    }
  }, [])

  // ── Drag (mouse) ─────────────────────────────────────────────────────────────

  function onMouseDown(e) {
    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }

  function onMouseMove(e) {
    if (!isDragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setCropOffset(prev => clampOffset({ x: prev.x + dx, y: prev.y + dy }, cropScale))
  }

  function onMouseUp() {
    isDragging.current = false
  }

  // ── Drag + pinch (touch) ──────────────────────────────────────────────────────

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      isDragging.current = true
      pinchDist.current = null
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      isDragging.current = false
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchDist.current = Math.hypot(dx, dy)
    }
  }

  function onTouchMove(e) {
    e.preventDefault()
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastPos.current.x
      const dy = e.touches[0].clientY - lastPos.current.y
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setCropOffset(prev => clampOffset({ x: prev.x + dx, y: prev.y + dy }, cropScale))
    } else if (e.touches.length === 2 && pinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist   = Math.hypot(dx, dy)
      const factor = dist / pinchDist.current
      pinchDist.current = dist
      setCropScale(prev => {
        const next = prev * factor
        return Math.min(Math.max(next, getMinScale()), 5)
      })
    }
  }

  function onTouchEnd() {
    isDragging.current = false
    pinchDist.current  = null
  }

  // ── File selection ────────────────────────────────────────────────────────────

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return

    setUploadError('')

    if (!session?.user?.id) { setUploadError('Not signed in'); return }
    if (!ALLOWED_TYPES.includes(file.type)) { setUploadError('JPEG, PNG, or WebP only'); return }
    if (file.size > MAX_BYTES) { setUploadError('Image must be under 10 MB'); return }

    openCrop(file)
  }

  // ── Crop save ─────────────────────────────────────────────────────────────────

  async function handleCropSave() {
    const img = imgRef.current
    if (!img) return

    const canvas = document.createElement('canvas')
    canvas.width  = CROP_SIZE
    canvas.height = CROP_SIZE
    const ctx = canvas.getContext('2d')

    // Clip to circle
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()

    // The image center in the crop preview is at (CROP_SIZE/2 + offsetX, CROP_SIZE/2 + offsetY)
    const displayW = img.naturalWidth  * cropScale
    const displayH = img.naturalHeight * cropScale
    ctx.drawImage(
      img,
      CROP_SIZE / 2 + cropOffset.x - displayW / 2,
      CROP_SIZE / 2 + cropOffset.y - displayH / 2,
      displayW,
      displayH,
    )

    // Compress: target ≤ 900 KB (base64 ≤ ~1 250 000 chars)
    const TARGET = 1_250_000
    let quality = 0.88
    let dataUrl = canvas.toDataURL('image/jpeg', quality)
    while (dataUrl.length > TARGET && quality > 0.15) {
      quality = Math.max(quality - 0.12, 0.15)
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }

    closeCrop()
    setUploading(true)
    try {
      const res = await api.patch('/api/auth/avatar', { dataUrl, mimeType: 'image/jpeg' })
      const url = res.data.profile.avatar_url
      setLocalUrl(url)
      onUpload?.(url)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Upload failed'
      setUploadError(msg)
      console.error('[AvatarUpload]', msg)
    } finally {
      setUploading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Avatar circle ──────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', flexShrink: 0, display: 'inline-block' }}>
        <div
          style={{
            width: size, height: size, borderRadius: '50%',
            cursor: editable ? 'pointer' : 'default',
            position: 'relative', overflow: 'hidden',
            background: displayUrl ? '#1a1a1a' : color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => editable && !uploading && inputRef.current?.click()}
          onMouseEnter={() => editable && setHovered(true)}
          onMouseLeave={() => editable && setHovered(false)}
          title={editable ? 'Click to change photo' : (name || '')}
        >
          {displayUrl ? (
            <img src={displayUrl} alt={name || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <span style={{ fontSize, fontWeight: 700, color: '#fff', userSelect: 'none', lineHeight: 1 }}>
              {initials(name)}
            </span>
          )}

          {editable && (hovered || uploading) && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
            }}>
              {uploading ? (
                <div style={{
                  width: iconSize, height: iconSize,
                  border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <EditIcon size={iconSize} color="#fff" />
              )}
            </div>
          )}

          {editable && (
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }} onChange={handleFile} />
          )}
        </div>

        {editable && uploadError && (
          <div style={{
            position: 'absolute', top: size + 6, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(199,56,32,0.95)', color: '#fff', fontSize: 11, fontWeight: 600,
            padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none',
          }}>
            {uploadError}
          </div>
        )}
      </div>

      {/* ── Crop modal ─────────────────────────────────────────────────────── */}
      {cropSrc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: '#111', borderRadius: 20,
            border: '1px solid #252525',
            boxShadow: '0 32px 64px rgba(0,0,0,0.7)',
            padding: 24,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            maxWidth: 340, width: '100%',
          }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#EFEFEF' }}>
              Position Photo
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#555', textAlign: 'center' }}>
              Drag to reposition · Scroll or pinch to zoom
            </p>

            {/* Crop frame — square container with circular clip via box-shadow overlay */}
            <div
              ref={containerRef}
              style={{
                width: CROP_SIZE, height: CROP_SIZE,
                position: 'relative', overflow: 'hidden',
                background: '#000', flexShrink: 0,
                cursor: isDragging.current ? 'grabbing' : 'grab',
                touchAction: 'none',
                userSelect: 'none',
                borderRadius: 4,
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* The actual image — centered + offset + scaled */}
              <img
                ref={imgRef}
                src={cropSrc}
                alt="Crop preview"
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropScale})`,
                  transformOrigin: '50% 50%',
                  maxWidth: 'none', pointerEvents: 'none',
                }}
              />

              {/* Dark overlay with circular "window" showing the crop area */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                borderRadius: '50%',
                boxShadow: '0 0 0 1400px rgba(0,0,0,0.58)',
                border: '2px solid rgba(255,255,255,0.30)',
              }} />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                onClick={closeCrop}
                style={{
                  flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600,
                  borderRadius: 10, border: '1px solid #303030',
                  background: 'transparent', color: '#888', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                disabled={uploading}
                style={{
                  flex: 2, padding: '11px 0', fontSize: 14, fontWeight: 700,
                  borderRadius: 10, border: 'none',
                  background: uploading ? '#333' : ORANGE, color: '#fff',
                  cursor: uploading ? 'default' : 'pointer',
                  boxShadow: uploading ? 'none' : '0 2px 12px rgba(247,87,9,0.35)',
                }}
              >
                {uploading ? 'Saving…' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
