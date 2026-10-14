import { Link } from 'react-router-dom'

const ORANGE = '#F75709'

const navStyles = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 56px)', height: 64,
    background: 'rgba(10,10,10,0.94)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    transition: 'top 0.22s ease, box-shadow 0.22s ease',
  },
  navLink: { color: '#888', fontWeight: 500, fontSize: 14, textDecoration: 'none', padding: '8px 14px', borderRadius: 8 },
  navCta: {
    display: 'inline-flex', alignItems: 'center',
    color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
    padding: '8px 18px', borderRadius: 9, background: ORANGE,
    boxShadow: '0 2px 12px rgba(247,87,9,0.30)',
  },
}

// Shared site nav used on Landing, About, Contact, and the Legal pages.
// `top` and `elevated` let Landing account for its dismissible beta banner
// and scroll shadow — every other page just uses the defaults.
export default function SiteNav({ top = 0, elevated = false }) {
  return (
    <nav style={{ ...navStyles.nav, top, boxShadow: elevated ? '0 2px 20px rgba(0,0,0,0.4)' : 'none' }}>
      <Link to="/" style={{ display: 'block' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <img src="/offseaz_o_orange.png" alt="Offseaz" style={{ height: 54, width: 'auto', display: 'block' }} />
      </Link>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link to="/login" className="site-nav-link" style={navStyles.navLink}>Sign In</Link>
        <Link to="/register" style={navStyles.navCta}>Get Started</Link>
      </div>
    </nav>
  )
}
