import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  GridIcon, UsersIcon, LayoutIcon, MessageIcon, BarChartIcon,
  HomeIcon, CalendarIcon, EditIcon, UserIcon, SignOutIcon, FeedIcon,
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

// ─── Nav config ───────────────────────────────────────────────────────────────

const COACH_NAV = [
  { path: '/coach',               label: 'Dashboard',     Icon: GridIcon,    exact: true },
  { path: '/coach/athletes',      label: 'Athletes',      Icon: UsersIcon,   exact: false },
  { path: '/coach/blueprints',    label: 'Blueprints',    Icon: LayoutIcon,  exact: false },
  { path: '/coach/feed',          label: 'Feed',          Icon: FeedIcon,    exact: false },
  { path: '/coach/messages',      label: 'Messages',      Icon: MessageIcon, exact: false },
  { path: '/coach/accountability',label: 'Accountability',Icon: BarChartIcon,exact: false },
]

const ATHLETE_NAV = [
  { path: '/athlete',          label: 'Home',        Icon: HomeIcon,     exact: true },
  { path: '/athlete/plan',     label: 'My Plan',     Icon: CalendarIcon, exact: false },
  { path: '/athlete/log',      label: 'Log Workout', Icon: EditIcon,     exact: false },
  { path: '/athlete/feed',     label: 'Feed',        Icon: FeedIcon,     exact: false },
  { path: '/athlete/roster',   label: 'Roster',      Icon: UsersIcon,    exact: false },
  { path: '/athlete/messages', label: 'Messages',    Icon: MessageIcon,  exact: false },
  { path: '/athlete/profile',  label: 'My Profile',  Icon: UserIcon,     exact: false },
]

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar({ nav, profile, signOut }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function isActive(path, exact) {
    if (exact) return pathname === path
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <nav style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <img
          src="/Offseaz_logo__DARK_-removebg-preview.png"
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
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
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
          <SignOutIcon size={15} color="var(--text-3)" />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  )
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────

function BottomBar({ nav }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function isActive(path, exact) {
    if (exact) return pathname === path
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <div style={styles.bottomBar}>
      {nav.map(({ path, label, Icon, exact }, i) => {
        const active = isActive(path, exact)
        const accent = ACCENTS[i % 3]
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={styles.tabItem}
          >
            <Icon size={22} color={active ? accent : 'var(--text-3)'} />
            <span style={{ ...styles.tabLabel, color: active ? accent : 'var(--text-3)' }}>
              {label.split(' ')[0]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Sidebar (main export) ────────────────────────────────────────────────────

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const isMobile = useIsMobile()
  const nav = profile?.role === 'coach' ? COACH_NAV : ATHLETE_NAV

  if (isMobile) return <BottomBar nav={nav} />
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
    padding: '10px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },

  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 16px 0 0',
    height: 44,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    position: 'relative',
    transition: 'background 0.12s',
    borderRadius: 0,
  },
  navItemActive: {
    background: 'rgba(247,87,9,0.08)',
  },

  navBorder: (active, color = ORANGE) => ({
    width: 3,
    alignSelf: 'stretch',
    background: active ? color : 'transparent',
    flexShrink: 0,
    borderRadius: '0 2px 2px 0',
    marginRight: 13,
    transition: 'background 0.12s',
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
    padding: '8px 16px',
    width: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-3)',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'left',
    transition: 'color 0.12s',
  },

  // Mobile bottom bar
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    background: '#111111',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'stretch',
    zIndex: 50,
  },
  tabItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.2,
    lineHeight: 1,
  },
}
