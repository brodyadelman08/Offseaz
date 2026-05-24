import { useLayoutEffect } from 'react'

// Offseaz is dark-mode only.
const DARK_VARS = {
  '--bg':           '#0F0F0F',
  '--card':         '#1A1A1A',
  '--card-inner':   '#252525',
  '--border':       '#2A2A2A',
  '--border-light': '#1E1E1E',
  '--text':         '#EFEFEF',
  '--text-2':       '#AAAAAA',
  '--text-3':       '#666666',
  '--input-bg':     '#252525',
  '--input-border': '#3A3A3A',
  '--btn-neutral':      '#2A2A2A',
  '--btn-neutral-text': '#EFEFEF',
  '--shadow':       '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
}

export function ThemeProvider({ children }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    Object.entries(DARK_VARS).forEach(([k, v]) => root.style.setProperty(k, v))
    root.setAttribute('data-theme', 'dark')
  }, [])

  return children
}
