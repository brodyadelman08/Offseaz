import { createContext, useContext, useState, useLayoutEffect } from 'react'

const ThemeContext = createContext()

const VARS = {
  light: {
    '--bg':           '#FFFFFF',
    '--card':         '#F7F7F7',
    '--card-inner':   '#FFFFFF',
    '--border':       '#E5E5E5',
    '--border-light': '#F0F0F0',
    '--text':         '#0A0A0A',
    '--text-2':       '#555555',
    '--text-3':       '#999999',
    '--input-bg':     '#FFFFFF',
    '--input-border': '#CCCCCC',
    '--btn-neutral':       '#0A0A0A',
    '--btn-neutral-text':  '#FFFFFF',
    '--shadow':       '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  },
  dark: {
    '--bg':           '#0F0F0F',
    '--card':         '#1A1A1A',
    '--card-inner':   '#252525',
    '--border':       '#2A2A2A',
    '--border-light': '#222222',
    '--text':         '#EFEFEF',
    '--text-2':       '#AAAAAA',
    '--text-3':       '#666666',
    '--input-bg':     '#252525',
    '--input-border': '#3A3A3A',
    '--btn-neutral':       '#2A2A2A',
    '--btn-neutral-text':  '#EFEFEF',
    '--shadow':       '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
  },
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('offseaz-theme') || 'light' }
    catch { return 'light' }
  })

  useLayoutEffect(() => {
    const root = document.documentElement
    Object.entries(VARS[mode]).forEach(([k, v]) => root.style.setProperty(k, v))
    root.setAttribute('data-theme', mode)
  }, [mode])

  function toggle() {
    setMode(m => {
      const next = m === 'light' ? 'dark' : 'light'
      try { localStorage.setItem('offseaz-theme', next) } catch {}
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
