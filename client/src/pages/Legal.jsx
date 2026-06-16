import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const LOGO   = '/Offseaz_Logo__White_Letter__Dark_PNG.png'
const ORANGE = '#F75709'

// ── Scroll to top on every page mount ────────────────────────────────────────
function ScrollTop() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return null
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function Sec({ n, title }) {
  return <h2 style={ls.secHead}>{n}. {title}</h2>
}
function P({ children }) {
  return <p style={ls.p}>{children}</p>
}
function Ul({ children }) {
  return <ul style={ls.ul}>{children}</ul>
}
function Li({ children }) {
  return <li style={ls.li}>{children}</li>
}
function B({ children }) {
  return <strong style={ls.strong}>{children}</strong>
}
function Email() {
  return (
    <a href="mailto:brody@offseaz.com" style={ls.emailLink}>
      brody@offseaz.com
    </a>
  )
}

// ── Shared page layout ────────────────────────────────────────────────────────
function LegalLayout({ title, lastUpdated, intro, children }) {
  return (
    <div style={ls.root}>
      <ScrollTop />

      {/* Sticky nav */}
      <nav style={ls.nav}>
        <Link to="/" style={{ display: 'block', flexShrink: 0 }}>
          <img src={LOGO} alt="Offseaz" style={{ height: 30, width: 'auto', display: 'block' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/login"    style={ls.navLink}>Sign In</Link>
          <Link to="/register" style={ls.navCta}>Get Started</Link>
        </div>
      </nav>

      {/* Content */}
      <div style={ls.wrap}>
        {/* Page header */}
        <div style={ls.pageHead}>
          <span style={ls.eyebrow}>Legal</span>
          <h1 style={ls.pageTitle}>{title}</h1>
          <p style={ls.lastUpdated}>Last Updated: {lastUpdated}</p>
        </div>

        {/* Intro paragraph */}
        {intro && <p style={ls.intro}>{intro}</p>}

        {/* Numbered sections */}
        <div style={ls.body}>{children}</div>
      </div>

      {/* Footer */}
      <footer style={ls.footer}>
        <div style={ls.footerLinks}>
          <Link to="/privacy"       style={ls.footerLink}>Privacy Policy</Link>
          <span style={ls.dot}>·</span>
          <Link to="/terms"         style={ls.footerLink}>Terms &amp; Conditions</Link>
          <span style={ls.dot}>·</span>
          <Link to="/refund"        style={ls.footerLink}>Refund Policy</Link>
          <span style={ls.dot}>·</span>
          <Link to="/accessibility" style={ls.footerLink}>Accessibility</Link>
        </div>
        <p style={ls.copy}>© {new Date().getFullYear()} Offseaz. All rights reserved.</p>
      </footer>
    </div>
  )
}

// ── Privacy Policy ────────────────────────────────────────────────────────────

export function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="September 16, 2025"
      intro="At Offseaz, your privacy is important to us. This Privacy Policy explains how we collect, use, store, and protect your information when you visit or interact with offseaz.com. By using our platform, you agree to the practices described in this policy."
    >
      <Sec n="1" title="Information We Collect" />
      <P>We may collect the following types of information:</P>
      <Ul>
        <Li><B>Personal Information:</B> such as your name, email address, and any details you provide when creating an account or filling out forms.</Li>
        <Li><B>Athletic Data:</B> including sport, position, training history, lifting maxes, workout logs, and performance metrics entered through the platform.</Li>
        <Li><B>Non-Personal Information:</B> such as browser type, device type, IP address, pages visited, and general usage data. This helps us understand how users interact with the platform.</Li>
        <Li><B>Cookies and Tracking Technologies:</B> small files stored on your device that help us improve platform functionality and enhance your experience.</Li>
      </Ul>

      <Sec n="2" title="How We Use Your Information" />
      <P>We use the information we collect to:</P>
      <Ul>
        <Li>Provide, operate, and improve the Offseaz platform and its services</Li>
        <Li>Generate personalized training blueprints and athlete performance reports</Li>
        <Li>Enable coaches to monitor athlete progress and communicate with their teams</Li>
        <Li>Respond to support requests and inquiries</Li>
        <Li>Send platform updates and notifications you have opted into</Li>
        <Li>Analyze usage trends to improve the platform experience</Li>
        <Li>Comply with applicable legal requirements</Li>
      </Ul>

      <Sec n="3" title="Sharing of Information" />
      <P>We do not sell or rent your personal information. We may share your data only in the following limited circumstances:</P>
      <Ul>
        <Li>With trusted third-party service providers who support our operations, including database hosting (Supabase), email delivery (Resend), and payment processing (Stripe)</Li>
        <Li>To comply with applicable laws, regulations, or legal requests</Li>
        <Li>To protect the rights, property, or safety of Offseaz, our users, or others</Li>
        <Li>Between coaches and athletes within the same team, as required for the platform to function — coaches can view athlete training data, logs, and profiles for athletes on their team</Li>
      </Ul>

      <Sec n="4" title="Athlete Data and Minor Privacy" />
      <P>Offseaz is designed to serve high school and college athletes, including individuals under the age of 18. We take the privacy of minors seriously.</P>
      <Ul>
        <Li>Athletes under 18 should have parental or guardian awareness before creating an account</Li>
        <Li>Athlete performance data is only visible to their assigned coach and teammates on the same team, based on the athlete's privacy settings</Li>
        <Li>We do not knowingly collect data from children under the age of 13. If you believe we have inadvertently collected such data, contact us immediately at <Email /></Li>
      </Ul>

      <Sec n="5" title="Cookies and Tracking" />
      <P>We use cookies and similar technologies to improve platform performance, maintain user sessions, and analyze usage. You can control or disable cookies through your browser settings, though some platform features may not function properly if cookies are disabled.</P>

      <Sec n="6" title="Data Security" />
      <P>We take appropriate technical and organizational measures to protect your personal information from unauthorized access, use, or disclosure. All data is stored using industry-standard encryption. However, no online transmission or storage system can be guaranteed to be 100% secure.</P>

      <Sec n="7" title="Your Rights" />
      <P>Depending on your location, you may have rights under applicable privacy laws, including the right to:</P>
      <Ul>
        <Li>Access and request a copy of the personal information we hold about you</Li>
        <Li>Correct or update inaccurate information</Li>
        <Li>Request deletion of your personal data</Li>
        <Li>Restrict or object to certain data processing activities</Li>
        <Li>Opt out of marketing communications</Li>
      </Ul>
      <P>To exercise any of these rights, contact us at <Email />.</P>

      <Sec n="8" title="Changes to This Policy" />
      <P>We may update this Privacy Policy from time to time. Any updates will be posted on this page with a revised Last Updated date. Continued use of the platform after updates constitutes acceptance of the revised policy.</P>

      <Sec n="9" title="Contact Us" />
      <P>If you have questions, concerns, or requests regarding this Privacy Policy, please contact us at <Email />.</P>
    </LegalLayout>
  )
}

// ── Terms and Conditions ──────────────────────────────────────────────────────

export function Terms() {
  return (
    <LegalLayout
      title="Terms and Conditions"
      lastUpdated="September 16, 2025"
      intro="Welcome to Offseaz. By accessing or using offseaz.com, you agree to comply with and be bound by these Terms and Conditions. Please read them carefully. If you do not agree, you should not use the platform."
    >
      <Sec n="1" title="Eligibility" />
      <P>You must be at least 13 years old to use this platform. Athletes under the age of 18 should use the platform with parental or guardian awareness. By using Offseaz, you confirm that you meet these requirements.</P>

      <Sec n="2" title="Use of the Platform" />
      <P>You agree to use Offseaz only for lawful purposes and in ways that do not infringe on the rights of others. Prohibited activities include but are not limited to:</P>
      <Ul>
        <Li>Fraudulent or unlawful activity of any kind</Li>
        <Li>Attempting to gain unauthorized access to the platform or its systems</Li>
        <Li>Uploading or transmitting viruses, malware, or harmful code</Li>
        <Li>Harassing, threatening, or abusing other users</Li>
        <Li>Sharing another user's personal or athletic data without their consent</Li>
      </Ul>

      <Sec n="3" title="Accounts" />
      <P>If you create an account on Offseaz, you are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these Terms.</P>

      <Sec n="4" title="Coach Responsibilities" />
      <P>Coaches who use Offseaz to manage athletes take on the following responsibilities:</P>
      <Ul>
        <Li>Ensuring that training programs assigned through the platform are appropriate for the athletes receiving them</Li>
        <Li>Acknowledging any athlete-reported injury flags and adjusting programming accordingly</Li>
        <Li>Compliance with applicable high school athletic association rules and NCAA regulations regarding offseason contact and training</Li>
        <Li>Obtaining appropriate consent from athletes and parents before adding minors to their team</Li>
      </Ul>

      <Sec n="5" title="Payments and Subscriptions" />
      <P>Offseaz offers subscription-based access for coaches. The following terms apply:</P>
      <Ul>
        <Li>All payments must be made using the methods specified on the platform</Li>
        <Li>Subscription pricing is subject to change with advance notice to active subscribers</Li>
        <Li>Subscriptions renew automatically unless canceled prior to the renewal date</Li>
        <Li>A 30-day free trial is available for new coach accounts with full platform access</Li>
      </Ul>

      <Sec n="6" title="Intellectual Property" />
      <P>All content on the Offseaz platform, including text, graphics, logos, software, training templates, and design, is the property of Offseaz or its licensors and is protected by applicable intellectual property laws. You may not copy, distribute, or use platform content without prior written consent.</P>

      <Sec n="7" title="User Content" />
      <P>When you post or submit content to Offseaz, including workout logs, posts, photos, or comments, you grant Offseaz a non-exclusive, royalty-free license to use and display that content in connection with operating the platform. You are solely responsible for any content you provide and warrant that it does not violate any third-party rights.</P>

      <Sec n="8" title="Disclaimers" />
      <P>Offseaz provides training templates and tools for informational and organizational purposes only. We are not licensed medical professionals or certified athletic trainers. Athletes with injuries or medical conditions should consult a qualified professional before following any training program on the platform. Offseaz is not liable for injuries resulting from the use of training programs created, assigned, or followed through the platform.</P>

      <Sec n="9" title="Limitation of Liability" />
      <P>To the fullest extent permitted by law, Offseaz and its affiliates will not be liable for any indirect, incidental, or consequential damages resulting from your use or inability to use the platform.</P>

      <Sec n="10" title="Governing Law" />
      <P>These Terms are governed by the laws of the State of Minnesota, United States. Any disputes shall be resolved exclusively in the courts of the State of Minnesota.</P>

      <Sec n="11" title="Changes to These Terms" />
      <P>We may update these Terms at any time. Updates will be posted with a revised Last Updated date. Continued use of the platform after updates constitutes acceptance of the revised Terms.</P>

      <Sec n="12" title="Contact Us" />
      <P>If you have questions about these Terms, contact us at <Email />.</P>
    </LegalLayout>
  )
}

// ── Refund Policy ─────────────────────────────────────────────────────────────

export function Refund() {
  return (
    <LegalLayout
      title="Refund Policy"
      lastUpdated="September 16, 2025"
      intro="At Offseaz, we want coaches and athletes to be fully satisfied with their experience on the platform. This Refund Policy explains the terms under which refunds are provided for subscription purchases made through offseaz.com."
    >
      <Sec n="1" title="Free Trial" />
      <P>New coach accounts receive a 30-day free trial with full access to all platform features. No payment is required during the trial period. You may cancel at any time during the trial without being charged.</P>

      <Sec n="2" title="Eligibility for Refunds" />
      <Ul>
        <Li>Refund requests for paid subscriptions must be submitted within 15 days of the original charge date</Li>
        <Li>Refunds are evaluated on a case-by-case basis and may be approved at our discretion</Li>
        <Li>Proof of purchase is required for all refund requests</Li>
      </Ul>

      <Sec n="3" title="Non-Refundable Items" />
      <P>The following are not eligible for refunds:</P>
      <Ul>
        <Li>Subscription charges for periods of service already used beyond the 15-day window</Li>
        <Li>Charges that occurred more than 15 days before the refund request</Li>
        <Li>Accounts that have been suspended or terminated due to violations of these Terms</Li>
      </Ul>

      <Sec n="4" title="How to Request a Refund" />
      <P>To request a refund, contact us at <Email /> with your account email address and the reason for your request. If approved, refunds will be processed to your original payment method within 10 business days.</P>

      <Sec n="5" title="Cancellations" />
      <P>You may cancel your Offseaz subscription at any time from your account settings. Cancellation stops future billing. You will retain access to the platform through the end of your current billing period.</P>

      <Sec n="6" title="Consumer Rights" />
      <P>This Refund Policy does not limit any statutory rights you may have under applicable consumer protection laws in your jurisdiction.</P>

      <Sec n="7" title="Contact Us" />
      <P>For questions about our Refund Policy or to request a refund, contact us at <Email />.</P>
    </LegalLayout>
  )
}

// ── Accessibility Statement ───────────────────────────────────────────────────

export function Accessibility() {
  return (
    <LegalLayout
      title="Accessibility Statement"
      lastUpdated="September 16, 2025"
      intro="At Offseaz, we are committed to ensuring that our platform is accessible to all individuals, including people with disabilities. We strive to provide an inclusive and user-friendly experience so that everyone can use the platform with ease."
    >
      <Sec n="1" title="What Web Accessibility Means" />
      <P>An accessible platform allows visitors with disabilities to experience the same or a similar level of functionality and ease as other users. This may involve the use of assistive technologies such as screen readers, keyboard navigation, and built-in accessibility features of the user's device.</P>

      <Sec n="2" title="Our Commitment" />
      <P>We have designed and continue to improve the Offseaz platform in accordance with WCAG 2.1 guidelines, targeting AA level compliance. Our ongoing efforts include:</P>
      <Ul>
        <Li>Clear and consistent heading structures across all pages</Li>
        <Li>Logical content order for keyboard and screen reader navigation</Li>
        <Li>Alternative text for all meaningful images</Li>
        <Li>Color combinations that meet required contrast standards using our brand color palette</Li>
        <Li>Mobile-responsive design optimized for all screen sizes and devices</Li>
        <Li>Touch-friendly tap targets and spacing for mobile users</Li>
        <Li>Consistent and predictable navigation throughout the platform</Li>
      </Ul>

      <Sec n="3" title="Known Limitations" />
      <P>Some areas of the platform may rely on third-party tools or integrations that are outside of our direct control. We will continue working to improve accessibility across all areas of the platform and with any third-party services we use.</P>

      <Sec n="4" title="Feedback and Assistance" />
      <P>We are continuously working to improve accessibility. If you experience any accessibility issues or need assistance using the platform, please contact our accessibility coordinator:</P>
      <div style={ls.contactBlock}>
        <p style={ls.contactLine}><B>Name:</B> Brody Adelman</p>
        <p style={ls.contactLine}><B>Email:</B> <Email /></p>
      </div>
      <P>We value your feedback and will make every effort to address your concerns promptly.</P>

      <Sec n="5" title="Updates" />
      <P>This Accessibility Statement will be reviewed and updated periodically as we continue to improve the platform. Last updated September 16, 2025.</P>
    </LegalLayout>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ls = {
  root: {
    background: '#0A0A0A',
    color: '#EFEFEF',
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    minHeight: '100vh',
    overflowX: 'hidden',
  },

  // Navbar
  nav: {
    position: 'sticky', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(20px, 5vw, 56px)', height: 64,
    background: 'rgba(10,10,10,0.90)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  navLink: {
    color: '#888', fontWeight: 500, fontSize: 14,
    textDecoration: 'none', padding: '8px 14px', borderRadius: 8,
  },
  navCta: {
    display: 'inline-flex', alignItems: 'center',
    color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
    padding: '8px 18px', borderRadius: 9, background: '#F75709',
    boxShadow: '0 2px 12px rgba(247,87,9,0.30)',
  },

  // Content wrapper
  wrap: {
    maxWidth: 740,
    margin: '0 auto',
    padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 40px) clamp(60px, 8vw, 100px)',
  },

  // Page header
  pageHead: { marginBottom: 40 },
  eyebrow: {
    display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
    color: ORANGE, textTransform: 'uppercase', marginBottom: 16,
  },
  pageTitle: {
    fontSize: 'clamp(28px, 5vw, 44px)',
    fontWeight: 900, letterSpacing: '-0.02em', color: '#EFEFEF',
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    margin: '0 0 12px',
  },
  lastUpdated: {
    fontSize: 13, color: '#444', margin: 0,
  },

  // Intro
  intro: {
    fontSize: 16, color: '#888', lineHeight: 1.8,
    borderLeft: `3px solid ${ORANGE}55`,
    paddingLeft: 20, marginBottom: 48,
    background: 'rgba(247,87,9,0.04)',
    borderRadius: '0 8px 8px 0',
    padding: '16px 20px',
  },

  // Body content
  body: { display: 'flex', flexDirection: 'column' },

  secHead: {
    fontSize: 17, fontWeight: 700,
    color: '#E0E0E0',
    fontFamily: "'Calibri', 'Trebuchet MS', sans-serif",
    letterSpacing: '-0.01em',
    margin: '36px 0 10px',
    paddingBottom: 8,
    borderBottom: '1px solid #1A1A1A',
  },

  p: {
    fontSize: 15, color: '#888', lineHeight: 1.8,
    margin: '0 0 12px',
  },

  ul: {
    margin: '0 0 14px 0',
    paddingLeft: 24,
    display: 'flex', flexDirection: 'column', gap: 7,
  },
  li: {
    fontSize: 15, color: '#777', lineHeight: 1.75,
    paddingLeft: 4,
  },

  strong: { color: '#CCC', fontWeight: 700 },

  emailLink: {
    color: ORANGE, fontWeight: 600, textDecoration: 'none',
  },

  contactBlock: {
    background: '#141414',
    border: '1px solid #202020',
    borderRadius: 12,
    padding: '16px 20px',
    margin: '4px 0 16px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  contactLine: {
    fontSize: 15, color: '#888', margin: 0, lineHeight: 1.7,
  },

  // Footer
  footer: {
    borderTop: '1px solid #141414',
    padding: 'clamp(28px, 4vw, 40px) clamp(20px, 5vw, 56px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    background: '#080808',
  },
  footerLinks: {
    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
  },
  footerLink: {
    fontSize: 13, color: '#444', textDecoration: 'none', fontWeight: 500,
    transition: 'color 0.15s',
  },
  dot: { color: '#2A2A2A', fontSize: 13 },
  copy: { fontSize: 12, color: '#2A2A2A', margin: 0 },
}
