import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { useCoachAccess } from '../context/CoachAccessContext'
import {
  GridIcon, UsersIcon, LayoutIcon, MessageIcon, BarChartIcon,
  HomeIcon, CalendarIcon, UserIcon, SignOutIcon, FeedIcon,
} from './Icons'
import AvatarUpload from './AvatarUpload'

const ORANGE  = '#F75709'
const BLUE    = '#308EBD'
const YELLOW  = '#F0BE24'
const ACCENTS    = [ORANGE, BLUE, YELLOW]
const ACCENT_BG  = [
  'rgba(247,87,9,0.10)',
  'rgba(48,142,189,0.10)',
  'rgba(240,190,36,0.10)',
]
const SIDEBAR_W = 240

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

// ─── Inline "more" icon (three dots) ─────────────────────────────────────────

function MoreDotsIcon({ size = 26, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="5"  cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="19" cy="12" r="2.2" />
    </svg>
  )
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const COACH_NAV = [
  { path: '/coach',               label: 'Dashboard',     Icon: GridIcon,    exact: true },
  { path: '/coach/athletes',      label: 'Athletes',      Icon: UsersIcon,   exact: false },
  { path: '/coach/blueprints',    label: 'Blueprints',    Icon: LayoutIcon,  exact: false },
  { path: '/coach/feed',          label: 'Feed',          Icon: FeedIcon,    exact: false },
  { path: '/coach/messages',      label: 'Messages',      Icon: MessageIcon, exact: false },
  { path: '/coach/accountability',label: 'Accountability',Icon: BarChartIcon,exact: false },
  { path: '/coach/profile',       label: 'My Profile',    Icon: UserIcon,    exact: false },
]

const ATHLETE_NAV = [
  { path: '/athlete',          label: 'Home',        Icon: HomeIcon,     exact: true },
  { path: '/athlete/plan',     label: 'My Plan',     Icon: CalendarIcon, exact: false },
  { path: '/athlete/feed',     label: 'Feed',        Icon: FeedIcon,     exact: false },
  { path: '/athlete/roster',   label: 'Roster',      Icon: UsersIcon,    exact: false },
  { path: '/athlete/messages', label: 'Messages',    Icon: MessageIcon,  exact: false },
  { path: '/athlete/profile',  label: 'My Profile',  Icon: UserIcon,     exact: false },
]

// Mobile: 4 primary tabs + "More". Everything else lives in the More drawer.
const COACH_PRIMARY = [
  { path: '/coach',            label: 'Dashboard', Icon: GridIcon,    exact: true  },
  { path: '/coach/athletes',   label: 'Athletes',  Icon: UsersIcon,   exact: false },
  { path: '/coach/blueprints', label: 'Blueprints',Icon: LayoutIcon,  exact: false },
  { path: '/coach/messages',   label: 'Messages',  Icon: MessageIcon, exact: false },
]
const COACH_MORE = [
  { path: '/coach/feed',           label: 'Feed',           Icon: FeedIcon,    exact: false },
  { path: '/coach/accountability', label: 'Accountability', Icon: BarChartIcon,exact: false },
  { path: '/coach/profile',        label: 'My Profile',     Icon: UserIcon,    exact: false },
]

const ATHLETE_PRIMARY = [
  { path: '/athlete',          label: 'Home',     Icon: HomeIcon,     exact: true  },
  { path: '/athlete/plan',     label: 'My Plan',  Icon: CalendarIcon, exact: false },
  { path: '/athlete/feed',     label: 'Feed',     Icon: FeedIcon,     exact: false },
  { path: '/athlete/messages', label: 'Messages', Icon: MessageIcon,  exact: false },
]
const ATHLETE_MORE = [
  { path: '/athlete/roster',  label: 'Roster',     Icon: UsersIcon,   exact: false },
  { path: '/athlete/profile', label: 'My Profile', Icon: UserIcon,    exact: false },
]

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar({ nav, profile, signOut }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // TeamContext defaults to null (createContext(null)).  TeamProvider wraps the
  // whole route tree so this is always provided, but guard defensively in case
  // a future refactor or race condition ever produces a null here.
  const teamCtx = useTeam()
  const teams          = teamCtx?.teams          ?? []
  const activeTeam     = teamCtx?.activeTeam     ?? null
  const activeTeamId   = teamCtx?.activeTeamId   ?? null
  const setActiveTeamId = teamCtx?.setActiveTeamId ?? (() => {})

  // CoachAccessContext is only provided inside /coach routes.  Athlete routes
  // render Layout WITHOUT it, so useCoachAccess() returns null here.  Guard
  // every access so DesktopSidebar never crashes on athlete routes.
  const coachAccessCtx = useCoachAccess()
  const coachTeams              = coachAccessCtx?.teams              ?? []
  const activeCoachTeamId       = coachAccessCtx?.activeTeamId       ?? null
  const setActiveCoachTeamId    = coachAccessCtx?.setActiveTeamId    ?? (() => {})

  const activeCoachTeam = coachTeams.find(t => t.id === activeCoachTeamId) || coachTeams[0] || null

  function isActive(path, exact) {
    if (exact) return pathname === path
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <nav style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <img
          src="/Offseaz_Logo__White_Letter__Dark_PNG.png"
          alt="Offseaz"
          style={styles.logo}
          onClick={() => navigate(nav[0].path)}
        />
      </div>

      {/* Nav items */}
      <div style={styles.navList}>
        {nav.map(({ path, label, Icon, exact }, i) => {
          const active = isActive(path, exact)
          const accent = ACCENTS[i % 3]
          const accentBg = ACCENT_BG[i % 3]
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                ...styles.navItem,
                ...(active ? { background: accentBg } : {}),
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={styles.navBorder(active, accent)} />
              <Icon size={18} color={active ? accent : 'var(--text-3)'} />
              <span style={{ ...styles.navLabel, color: active ? 'var(--text)' : 'var(--text-2)' }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Team switcher — athletes only */}
      {profile?.role === 'athlete' && teams.length > 0 && (
        <div style={styles.teamSection}>
          <p style={styles.teamSectionLabel}>Team</p>
          {teams.length > 1 ? (
            <div style={styles.teamPills}>
              {teams.map(t => (
                <button
                  key={t.id}
                  style={{
                    ...styles.teamPill,
                    ...(t.id === activeTeamId ? styles.teamPillActive : {}),
                  }}
                  onClick={() => setActiveTeamId(t.id)}
                  title={t.name}
                >
                  {t.name}
                </button>
              ))}
            </div>
          ) : (
            <p style={styles.teamSingleName}>{activeTeam?.name || teams[0]?.name}</p>
          )}
        </div>
      )}

      {/* Team switcher — coaches */}
      {profile?.role === 'coach' && coachTeams.length > 0 && (
        <div style={styles.teamSection}>
          <p style={styles.teamSectionLabel}>Active Team</p>
          {coachTeams.length === 1 ? (
            <p style={styles.teamSingleName}>{activeCoachTeam?.name || coachTeams[0]?.name}</p>
          ) : (
            <div style={styles.teamPills}>
              {coachTeams.map(t => (
                <button
                  key={t.id}
                  style={{
                    ...styles.teamPill,
                    ...(t.id === activeCoachTeamId ? styles.teamPillCoachActive : {}),
                  }}
                  onClick={() => setActiveCoachTeamId(t.id)}
                  title={t.name}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom — user + sign out */}
      <div style={styles.bottomArea}>
        <div style={styles.userRow}>
          <AvatarUpload
            name={profile?.full_name}
            avatarUrl={profile?.avatar_url}
            size={30}
            color={ORANGE}
            editable={false}
          />
          <div style={styles.userInfo}>
            <span style={styles.userName}>{profile?.full_name || '—'}</span>
            <span style={styles.userRole}>
              {profile?.role === 'coach' ? 'Coach' : 'Athlete'}
            </span>
          </div>
        </div>
        <button style={styles.signOutBtn} onClick={signOut}>
          <SignOutIcon size={15} color="#c73820" />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  )
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────

function BottomBar({ profile, signOut }) {
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const isCoach = profile?.role === 'coach'
  const primaryNav = isCoach ? COACH_PRIMARY : ATHLETE_PRIMARY
  const moreNav    = isCoach ? COACH_MORE    : ATHLETE_MORE

  function isActive(path, exact) {
    if (exact) return pathname === path
    return pathname === path || pathname.startsWith(path + '/')
  }

  // "More" tab is highlighted if the current route lives in the More list
  const moreRouteActive = moreNav.some(({ path, exact }) => isActive(path, exact))

  function handleNavigate(path) {
    navigate(path)
    setMoreOpen(false)
  }

  return (
    <>
      {/* ── Scrim — closes drawer when tapped ─────────────────────────── */}
      {moreOpen && (
        <div
          style={styles.moreScrim}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* ── More drawer — slides up from behind the tab bar ───────────── */}
      <div
        style={{
          ...styles.moreDrawer,
          transform: moreOpen ? 'translateY(0)' : 'translateY(calc(100% + 300px))',
          pointerEvents: moreOpen ? 'auto' : 'none',
        }}
      >
        {/* Drag handle */}
        <div style={styles.moreHandle} />

        {moreNav.map(({ path, label, Icon }) => {
          const active = isActive(path, false)
          return (
            <button
              key={path}
              style={{
                ...styles.moreItem,
                background: active ? 'rgba(247,87,9,0.08)' : 'transparent',
              }}
              onClick={() => handleNavigate(path)}
            >
              <Icon size={22} color={active ? ORANGE : 'var(--text-2)'} />
              <span style={{ ...styles.moreItemLabel, color: active ? ORANGE : 'var(--text-2)' }}>
                {label}
              </span>
              {active && <div style={styles.moreActiveBar} />}
            </button>
          )
        })}

        {/* Sign out */}
        <div style={styles.moreDivider} />
        <button
          style={{ ...styles.moreItem, background: 'transparent' }}
          onClick={() => { signOut(); setMoreOpen(false) }}
        >
          <SignOutIcon size={22} color="#c73820" />
          <span style={{ ...styles.moreItemLabel, color: '#c73820' }}>Sign Out</span>
        </button>
      </div>

      {/* ── Bottom tab bar ─────────────────────────────────────────────── */}
      <div style={styles.bottomBar}>
        {primaryNav.map(({ path, label, Icon, exact }) => {
          const active = isActive(path, exact)
          return (
            <button
              key={path}
              style={styles.tabItem}
              onClick={() => handleNavigate(path)}
            >
              {/* Top indicator bar */}
              <div style={{ ...styles.tabIndicator, opacity: active ? 1 : 0 }} />
              <Icon size={26} color={active ? ORANGE : 'var(--text-3)'} />
              <span style={{ ...styles.tabLabel, color: active ? ORANGE : 'var(--text-3)' }}>
                {label}
              </span>
            </button>
          )
        })}

        {/* More tab */}
        <button
          style={styles.tabItem}
          onClick={() => setMoreOpen(prev => !prev)}
        >
          <div style={{ ...styles.tabIndicator, opacity: (moreRouteActive || moreOpen) ? 1 : 0 }} />
          <MoreDotsIcon size={26} color={(moreRouteActive || moreOpen) ? ORANGE : 'var(--text-3)'} />
          <span style={{
            ...styles.tabLabel,
            color: (moreRouteActive || moreOpen) ? ORANGE : 'var(--text-3)',
          }}>
            More
          </span>
        </button>
      </div>
    </>
  )
}

// ─── Sidebar (main export) ────────────────────────────────────────────────────

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const isMobile = useIsMobile()
  const nav = profile?.role === 'coach' ? COACH_NAV : ATHLETE_NAV

  if (isMobile) return <BottomBar profile={profile} signOut={signOut} />
  return <DesktopSidebar nav={nav} profile={profile} signOut={signOut} />
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_W,
    background: '#111111',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    overflowY: 'auto',
    boxShadow: '4px 0 24px rgba(0,0,0,0.35)',
  },

  logoArea: {
    padding: '20px 20px 14px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    height: 52,
    display: 'block',
    cursor: 'pointer',
  },

  navList: {
    flex: 1,
    padding: '10px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },

  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 12px',
    height: 40,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    position: 'relative',
    transition: 'background 0.14s ease, box-shadow 0.14s ease',
    borderRadius: 8,
  },
  navItemActive: {
    background: 'rgba(247,87,9,0.08)',
  },

  navBorder: (active, color = ORANGE) => ({
    width: 3,
    height: 16,
    background: active ? color : 'transparent',
    flexShrink: 0,
    borderRadius: 3,
    marginRight: 4,
    transition: 'background 0.15s',
    boxShadow: active ? `0 0 6px ${color}` : 'none',
  }),

  navLabel: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.1,
    lineHeight: 1,
  },

  bottomArea: {
    padding: '12px 0 16px',
    borderTop: '1px solid var(--border)',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px 12px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflow: 'hidden',
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  },
  userRole: {
    fontSize: 11,
    color: 'var(--text-3)',
    lineHeight: 1,
  },
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '4px 12px 0',
    padding: '9px 14px',
    width: 'calc(100% - 24px)',
    background: 'rgba(199,56,32,0.08)',
    border: '1px solid rgba(199,56,32,0.25)',
    borderRadius: 8,
    cursor: 'pointer',
    color: '#c73820',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'left',
    transition: 'background 0.14s, border-color 0.14s',
  },

  // Team switcher
  teamSection: {
    padding: '10px 12px 8px',
    borderTop: '1px solid var(--border)',
  },
  teamSectionLabel: {
    fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 6px',
  },
  teamPills: {
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  teamPill: {
    padding: '7px 10px', fontSize: 12, fontWeight: 600,
    borderRadius: 8, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-2)',
    cursor: 'pointer', textAlign: 'left',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    transition: 'all 0.14s',
    width: '100%',
  },
  teamPillActive: {
    background: 'rgba(48,142,189,0.12)',
    borderColor: `${BLUE}44`,
    color: BLUE,
  },
  teamPillCoachActive: {
    background: 'rgba(247,87,9,0.12)',
    borderColor: `${ORANGE}44`,
    color: ORANGE,
  },
  teamSingleName: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    padding: '2px 4px',
  },

  // ── Mobile bottom bar ────────────────────────────────────────────────────────

  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    // Height grows to include the iOS home indicator safe area so the
    // bar's background covers it — the 68px visual content sits above.
    height: 'calc(68px + env(safe-area-inset-bottom))',
    background: 'rgba(15,15,15,0.97)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'flex-start', // anchor tabs to top of bar, above safe-area padding
    paddingBottom: 'env(safe-area-inset-bottom)',
    zIndex: 50,
    boxShadow: '0 -4px 24px rgba(0,0,0,0.45)',
  },

  tabItem: {
    flex: 1,
    height: 68, // fixed 68px — never extends into safe-area padding
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 4px 8px',
    position: 'relative',
    minWidth: 0,
  },

  // Thin orange bar at the top of an active tab
  tabIndicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: '0 0 2px 2px',
    background: ORANGE,
    transition: 'opacity 0.15s',
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.15,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    paddingBottom: 2,
  },

  // ── More drawer ──────────────────────────────────────────────────────────────

  moreScrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 51,
  },

  moreDrawer: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 'calc(68px + env(safe-area-inset-bottom))', // sits above full bar height
    background: '#141414',
    borderRadius: '20px 20px 0 0',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 10,
    paddingBottom: 12,
    zIndex: 52,
    boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
    transition: 'transform 0.28s cubic-bezier(0.34, 1.10, 0.64, 1)',
  },

  moreHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.18)',
    margin: '0 auto 14px',
  },

  moreItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    padding: '14px 24px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: 0,
    position: 'relative',
    transition: 'background 0.12s',
  },

  moreItemLabel: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
  },

  moreActiveBar: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    borderRadius: '0 2px 2px 0',
    background: ORANGE,
  },

  moreDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.07)',
    margin: '8px 0',
  },
}
