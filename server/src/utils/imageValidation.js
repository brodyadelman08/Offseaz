'use strict'

const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]

// Verifies the decoded buffer actually starts with the header bytes expected
// for the declared MIME type, so a renamed/mislabeled file can't slip past
// the client-side extension check.
function validateMagicBytes(buffer, mimeType) {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8
  }
  if (mimeType === 'image/png') {
    return buffer.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((b, i) => buffer[i] === b)
  }
  if (mimeType === 'image/webp') {
    // RIFF....WEBP — 'RIFF' at bytes 0-3, 'WEBP' at bytes 8-11
    return buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP'
  }
  return false
}

// Reads width/height from a JPEG's SOF (Start Of Frame) marker.
function getJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null

  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xFF) { offset++; continue }
    const marker = buffer[offset + 1]

    // Standalone markers carry no length/payload
    if (marker === 0xD8 || marker === 0xD9 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      offset += 2
      continue
    }

    const segmentLength = buffer.readUInt16BE(offset + 2)
    const isSOF = marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC

    if (isSOF) {
      const height = buffer.readUInt16BE(offset + 5)
      const width  = buffer.readUInt16BE(offset + 7)
      return { width, height }
    }

    if (marker === 0xDA) break // Start Of Scan — no more header markers follow
    offset += 2 + segmentLength
  }
  return null
}

// Reads width/height from a PNG's IHDR chunk (bytes 16-23, big-endian).
function getPngDimensions(buffer) {
  if (buffer.length < 24) return null
  const width  = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  return { width, height }
}

// Returns { width, height } or null if dimensions can't be determined
// (e.g. WEBP, which needs full chunk parsing we don't implement here).
function getImageDimensions(buffer, mimeType) {
  if (mimeType === 'image/jpeg') return getJpegDimensions(buffer)
  if (mimeType === 'image/png') return getPngDimensions(buffer)
  return null
}

module.exports = { validateMagicBytes, getImageDimensions }
