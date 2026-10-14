import { Link } from 'react-router-dom'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const LOGO   = '/Offseaz-Logo-White-Letter-Dark.png'

const LINKS = [
  ['/',              'Home'],
  ['/about',          'About'],
  ['/contact',        'Contact'],
  ['/feedback',       'Give Feedback'],
  ['/privacy',        'Privacy Policy'],
  ['/terms',          'Terms & Conditions'],
  ['/refund',         'Refund Policy'],
  ['/accessibility',  'Accessibility'],
]

function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
}
function InstagramIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4.5" /><circle cx="17.5" cy="6.5" r="1" fill={ORANGE} stroke="none" /></svg>
}
function FacebookIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={BLUE}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
}
function TikTokIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={YELLOW}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.35 6.35 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.15a8.24 8.24 0 004.83 1.55V7.28a4.85 4.85 0 01-1.06-.59z" /></svg>
}

const SOCIALS = [
  { href: 'https://x.com/Offseaz',         label: '@Offseaz', color: '#fff',  Icon: XIcon         },
  { href: 'https://instagram.com/0ffseaz', label: '@0ffseaz', color: ORANGE,  Icon: InstagramIcon },
  { href: 'https://facebook.com/Offseaz',  label: 'Offseaz',  color: BLUE,    Icon: FacebookIcon  },
  { href: 'https://tiktok.com/@0ffseaz',   label: '@0ffseaz', color: YELLOW,  Icon: TikTokIcon    },
]

const fs = {
  footer: {
    padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,56px) clamp(28px,3vw,40px)',
    background: '#080808', borderTop: '1px solid #1A1A1A',
  },
  footerLinks: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    alignItems: 'center', gap: '6px 4px', marginBottom: 16,
  },
  footerSocials: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    gap: '10px 22px', margin: '14px 0',
  },
}

// Shared site footer used on Landing, About, Contact, and the Legal pages —
// one link set, one social set, everywhere.
export default function SiteFooter() {
  return (
    <footer style={fs.footer}>
      <div style={{ textAlign: 'center' }}>
        <img src={LOGO} alt="Offseaz" className="logo-footer" style={{ margin: '0 auto 14px' }} />
        <p style={{ fontSize: 13, color: '#EEE', margin: '0 0 20px' }}>
          Built for coaches and athletes who take the offseason seriously.
        </p>
        <div style={fs.footerLinks}>
          {LINKS.map(([to, label], i, arr) => (
            <span key={to} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Link to={to} style={{ fontSize: 13, color: BLUE, textDecoration: 'none', fontWeight: 500 }}>{label}</Link>
              {i < arr.length - 1 && <span style={{ fontSize: 13, color: YELLOW }}>·</span>}
            </span>
          ))}
        </div>
        <div style={fs.footerSocials}>
          {SOCIALS.map(({ href, label, color, Icon }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600, color, opacity: 0.8 }}>
              <Icon /><span>{label}</span>
            </a>
          ))}
        </div>
        <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
          <a href="mailto:brody@offseaz.com" style={{ color: BLUE, textDecoration: 'none', fontWeight: 500 }}>brody@offseaz.com</a>
        </p>
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>© {new Date().getFullYear()} Offseaz. All rights reserved.</p>
      </div>
    </footer>
  )
}
