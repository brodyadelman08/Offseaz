import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar, { useIsMobile } from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { useCoachAccess } from '../context/CoachAccessContext'

const SIDEBAR_W = 240
const ORANGE    = '#F75709'

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function ChevronDown({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Mobile coach team switcher ───────────────────────────────────────────────
//
// Sticky bar at the very top of the content area that shows the active team
// name. Tapping it opens a slide-up sheet listing all teams. Only rendered
// on mobile for coaches with 2 or more teams.

function CoachTeamSwitcherBar({ isMobile }) {
  const { profile }                                           = useAuth()
  const { teams, activeTeamId, team: activeTeam,
          setActiveTeamId }                                   = useCoachAccess()
  const [open, setOpen]                                       = useState(false)

  // Nothing to render for athletes, desktop, or single-team coaches
  if (!isMobile || profile?.role !== 'coach' || teams.length < 2) return null

  function switchTeam(id) {
    setActiveTeamId(id)
    setOpen(false)
  }

  return (
    <>
      {/* ── Scrim ──────────────────────────────────────────────────────── */}
      {open && (
        <div style={ts.scrim} onClick={() => setOpen(false)} />
      )}

      {/* ── Slide-up team sheet ─────────────────────────────────────────── */}
      <div
        style={{
          ...ts.sheet,
          transform: open ? 'translateY(0)' : 'translateY(calc(100% + 300px))',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Handle */}
        <div style={ts.sheetHandle} />

        {/* Title */}
        <p style={ts.sheetTitle}>Switch Team</p>

        {/* Team list */}
        {teams.map(t => {
          const active = t.id === activeTeamId
          return (
            <button
              key={t.id}
              style={{
                ...ts.teamRow,
                background: active ? 'rgba(247,87,9,0.08)' : 'transparent',
              }}
              onClick={() => switchTeam(t.id)}
            >
              {/* Left active indicator */}
              {active && <div style={ts.activeBar} />}

              {/* Dot */}
              <div style={{
                ...ts.dot,
                background: active ? ORANGE : 'rgba(255,255,255,0.2)',
                boxShadow: active ? `0 0 7px ${ORANGE}88` : 'none',
              }} />

              {/* Name */}
              <span style={{ ...ts.teamName, color: active ? ORANGE : 'var(--text)' }}>
                {t.name}
              </span>

              {/* Active badge */}
              {active && <span style={ts.activeBadge}>Active</span>}
            </button>
          )
        })}
      </div>

      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      {/* Uses negative margins to break out of main's 24px top / 16px side padding
          so it sits flush against the viewport edges */}
      <button
        style={{
          ...ts.bar,
          borderBottomColor: open ? `rgba(247,87,9,0.35)` : 'rgba(255,255,255,0.07)',
        }}
        onClick={() => setOpen(prev => !prev)}
      >
        <div style={ts.barLeft}>
          <span style={ts.barEyebrow}>Active Team</span>
          <span style={ts.barTeamName}>{activeTeam?.name || 'No team'}</span>
        </div>
        <div style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease', lineHeight: 0 }}>
          <ChevronDown size={18} color={ORANGE} />
        </div>
      </button>
    </>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const isMobile = useIsMobile()

  return (
    <div style={styles.root}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          minHeight: '100vh',
          minWidth: 0,
          overflowX: 'hidden',
          marginLeft: isMobile ? 0 : SIDEBAR_W,
          padding: isMobile
            ? '24px 16px calc(80px + env(safe-area-inset-bottom))'
            : '36px 48px 60px',
        }}
      >
        {/* Team switcher bar renders above all page content on mobile */}
        <CoachTeamSwitcherBar isMobile={isMobile} />
        <Outlet />
      </main>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
  },
}

const ts = {
  // ── Scrim ──────────────────────────────────────────────────────────────────
  scrim: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.60)',
    zIndex: 48,
  },

  // ── Slide-up sheet ─────────────────────────────────────────────────────────
  sheet: {
    position: 'fixed',
    left: 0, right: 0,
    bottom: 'calc(68px + env(safe-area-inset-bottom))',
    background: '#141414',
    borderRadius: '20px 20px 0 0',
    borderTop: '1px solid rgba(255,255,255,0.10)',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 10,
    paddingBottom: 16,
    zIndex: 49,
    boxShadow: '0 -8px 40px rgba(0,0,0,0.65)',
    transition: 'transform 0.27s cubic-bezier(0.34, 1.06, 0.64, 1)',
  },

  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    background: 'rgba(255,255,255,0.18)',
    margin: '0 auto 16px',
  },

  sheetTitle: {
    fontSize: 11, fontWeight: 700,
    color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: 1.1,
    margin: '0 0 6px', padding: '0 20px',
  },

  // ── Team rows ──────────────────────────────────────────────────────────────
  teamRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    width: '100%', padding: '14px 20px',
    border: 'none', cursor: 'pointer',
    textAlign: 'left', position: 'relative',
    transition: 'background 0.12s',
  },

  activeBar: {
    position: 'absolute', left: 0, top: '15%', bottom: '15%',
    width: 3, borderRadius: '0 2px 2px 0',
    background: ORANGE,
  },

  dot: {
    width: 10, height: 10, borderRadius: '50%',
    flexShrink: 0, transition: 'background 0.15s, box-shadow 0.15s',
  },

  teamName: {
    fontSize: 16, fontWeight: 600, lineHeight: 1,
    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },

  activeBadge: {
    fontSize: 10, fontWeight: 800,
    color: ORANGE,
    background: 'rgba(247,87,9,0.14)',
    border: '1px solid rgba(247,87,9,0.30)',
    padding: '3px 8px', borderRadius: 6,
    textTransform: 'uppercase', letterSpacing: 0.6,
    flexShrink: 0,
  },

  // ── Sticky top bar ─────────────────────────────────────────────────────────
  bar: {
    // Break out of main's 24px top / 16px side padding so bar is edge-to-edge
    position: 'sticky', top: 0,
    marginLeft: -16, marginRight: -16, marginTop: -24,
    marginBottom: 16,
    width: 'calc(100% + 32px)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 20px',
    background: 'rgba(12,12,12,0.97)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid',
    border: 'none',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    cursor: 'pointer',
    zIndex: 40,
    transition: 'border-color 0.18s',
  },

  barLeft: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'flex-start', gap: 2,
  },

  barEyebrow: {
    fontSize: 10, fontWeight: 700,
    color: ORANGE, textTransform: 'uppercase', letterSpacing: 1.1,
    lineHeight: 1,
  },

  barTeamName: {
    fontSize: 15, fontWeight: 700,
    color: 'var(--text)', lineHeight: 1.2,
  },
}
