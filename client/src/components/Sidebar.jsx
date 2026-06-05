import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
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

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar({ nav, profile, signOut }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { teams, activeTeam, activeTeamId, setActiveTeamId } = useTeam()

  function isActive(path, exact) {
    if (exact) return pathname === path
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <nav style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <img
          src="/OFFSEAZ_LOGO_PNG.png"
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

function BottomBar({ nav, signOut }) {
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
      {/* Sign-out tab — always last */}
      <button style={styles.tabItem} onClick={signOut}>
        <SignOutIcon size={22} color="#c73820" />
        <span style={{ ...styles.tabLabel, color: '#c73820' }}>Sign out</span>
      </button>
    </div>
  )
}

// ─── Sidebar (main export) ────────────────────────────────────────────────────

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const isMobile = useIsMobile()
  const nav = profile?.role === 'coach' ? COACH_NAV : ATHLETE_NAV

  if (isMobile) return <BottomBar nav={nav} signOut={signOut} />
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
  teamSingleName: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    padding: '2px 4px',
  },

  // Mobile bottom bar
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    background: 'rgba(17,17,17,0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'stretch',
    zIndex: 50,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
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
