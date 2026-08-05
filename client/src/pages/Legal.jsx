import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const LOGO   = '/Offseaz-Logo-White-Letter-Dark.png'
const ORANGE = '#F75709'

// ── Scroll to top on every page mount, or to a #section-id if the link that
//    brought us here included one (e.g. the signup age-block's "Learn more") ──
function ScrollTop() {
  useEffect(() => {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1))
      if (el) {
        el.scrollIntoView()
        return
      }
    }
    window.scrollTo(0, 0)
  }, [])
  return null
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function Sec({ n, title, id }) {
  return <h2 id={id} style={ls.secHead}>{n}. {title}</h2>
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

      {/* Fixed nav */}
      <nav style={ls.nav}>
        <Link to="/" style={{ display: 'block', flexShrink: 0 }}>
          <img src={LOGO} alt="Offseaz" className="logo-nav" />
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
          <span style={ls.dot}>·</span>
          <a href="mailto:brody@offseaz.com" style={ls.footerLink}>brody@offseaz.com</a>
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
      lastUpdated="August 5, 2026"
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
        <Li>With trusted third-party service providers who support our operations, including database hosting (Supabase), email delivery (Resend), and payment processing (Stripe). Stripe processes and stores payment card details directly — Offseaz never receives or stores full card numbers</Li>
        <Li>To comply with applicable laws, regulations, or legal requests</Li>
        <Li>To protect the rights, property, or safety of Offseaz, our users, or others</Li>
        <Li>Between coaches and athletes within the same team, as required for the platform to function — coaches can view athlete training data, logs, and profiles for athletes on their team</Li>
      </Ul>

      <Sec n="4" title="Athlete Data and Minor Privacy" />
      <P>Offseaz is designed to serve high school and college athletes, including individuals under the age of 18. We take the privacy of minors seriously.</P>
      <Ul>
        <Li>Athletes under 18 should have parental or guardian awareness before creating an account</Li>
        <Li>Athlete performance data is only visible to their assigned coach and teammates on the same team, based on the athlete's privacy settings</Li>
        <Li>If an athlete is under 18 and subscribes to a paid personalized blueprint, the paying party must be a parent or guardian who is at least 18 years old. We collect that parent or guardian's payment and contact information for billing purposes only — it is not merged with or exposed as part of the athlete's training profile</Li>
        <Li>We ask for date of birth at signup solely to confirm you meet the 13-and-older minimum age required to create an account (see Terms of Service, Section 1). It is used only to compute that one eligibility check and is not stored — this is true whether the check passes or fails</Li>
        <Li>We do not knowingly collect personal information from children under the age of 13. If you believe we have inadvertently collected such data, contact us immediately at <Email /></Li>
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
      lastUpdated="August 5, 2026"
      intro="Welcome to Offseaz. By accessing or using offseaz.com, you agree to comply with and be bound by these Terms and Conditions. Please read them carefully. If you do not agree, you should not use the platform."
    >
      <Sec n="1" title="Eligibility" id="eligibility" />
      <P>You must be at least 13 years old to create an Offseaz account or use this platform. We collect and verify date of birth at signup specifically to enforce this minimum, and accounts are not created for anyone who does not meet it — there is no exception and no parental-consent path around this age requirement. Athletes who are 13 or older but under 18 should use the platform with parental or guardian awareness. If an athlete under 18 subscribes to a paid personalized blueprint, a parent or guardian who is at least 18 years old must be the paying party and must agree to these Terms on the athlete's behalf — see Section 10, "Minors &amp; Parental Consent for Payment." By using Offseaz, you confirm that you meet these requirements.</P>

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

      <Sec n="5" title="Coach Team Tools — Free Forever" />
      <P>The core coach experience — team dashboard, roster management, the weekly Monday accountability report, and the ability to build and assign a fully custom training plan to your team — is free forever. A coach is never required to pay Offseaz for anything. Payment is only ever required if a coach chooses to unlock and assign one of Offseaz's pre-made sport blueprints, as described in Section 7.</P>

      <Sec n="6" title="Athlete Personalized Blueprint (Paid Subscription)" />
      <P>Athletes can take the needs-analysis survey and preview their personalized training blueprint at no cost, whether or not they belong to a team. Paying for a subscription unlocks the full usable plan and workout logging, and includes unlimited survey retakes and regenerated plans for as long as the subscription is active. Current pricing is $7.99/month or $59.99/year; these amounts are placeholders and subject to change as described in Section 8.</P>

      <Sec n="7" title="Coach Sport Blueprint Unlock (Paid, Optional)" />
      <P>Coaches may optionally purchase a seasonal unlock to assign Offseaz's pre-made, 16-week sport-specific blueprints to their team. This unlock is priced per sport, per season, by roster size at the time of purchase — up to 25 athletes: $99; 26–50 athletes: $149; 51+ athletes: $199 — and renews yearly at the roster tier locked in at purchase. These amounts are placeholders and subject to change as described in Section 8. This unlock is never required to use Offseaz as a coach: building and assigning your own custom plan remains free and fully supported whether or not you ever purchase a sport blueprint unlock.</P>

      <Sec n="8" title="Billing, Pricing & Renewal Terms" />
      <Ul>
        <Li>All payments must be made using the methods specified on the platform</Li>
        <Li>Pricing for both the athlete subscription and the coach sport blueprint unlock is subject to change with advance notice to active subscribers; changes apply at the next renewal, not to a period already paid for</Li>
        <Li>Athlete subscriptions renew automatically each month or year (matching the plan selected) unless canceled prior to the renewal date, and will be charged at the then-current price disclosed at checkout</Li>
        <Li>Coach sport blueprint unlocks renew automatically each year at the roster tier locked in at purchase, unless canceled prior to the renewal date</Li>
        <Li>There is no free trial period for either product. The athlete survey and blueprint preview are free to use with no time limit and no payment method required; a coach can preview Offseaz's pre-made sport blueprints before deciding whether to purchase an unlock. Checkout always discloses the exact amount that will be charged and when, before you pay</Li>
      </Ul>

      <Sec n="9" title="Payment Failures & Grace Periods" />
      <Ul>
        <Li>If an athlete's subscription renewal payment fails, the athlete keeps full access for a grace period of approximately two weeks while we attempt to process payment. All logged history and progress is preserved throughout the grace period. If payment is not resolved by the end of the grace period, the plan locks until payment resumes — logged history and progress are preserved and restored in full once payment succeeds</Li>
        <Li>Coaches receive email notifications when a payment issue occurs on their account</Li>
        <Li>If a coach's sport blueprint unlock lapses at renewal, athletes keep access to any pre-made plans already assigned to them through the end of the current season, but the coach cannot assign new pre-made blueprints until the unlock is renewed. Free custom team plans are never affected by a lapsed unlock</Li>
      </Ul>

      <Sec n="10" title="Minors & Parental Consent for Payment" />
      <P>If an athlete is under 18 and wants to subscribe to the paid personalized blueprint, a parent or guardian who is at least 18 years old must be the paying party on the account and must agree to these Terms, including the billing and cancellation terms in Sections 8 and 9, on the athlete's behalf. The athlete may continue to use the free survey and blueprint preview without a parent or guardian.</P>

      <Sec n="11" title="Intellectual Property" />
      <P>All content on the Offseaz platform, including text, graphics, logos, software, training templates, and design, is the property of Offseaz or its licensors and is protected by applicable intellectual property laws. You may not copy, distribute, or use platform content without prior written consent.</P>

      <Sec n="12" title="User Content" />
      <P>When you post or submit content to Offseaz, including workout logs, posts, photos, or comments, you grant Offseaz a non-exclusive, royalty-free license to use and display that content in connection with operating the platform. You are solely responsible for any content you provide and warrant that it does not violate any third-party rights.</P>

      <Sec n="13" title="Disclaimers" />
      <P>Offseaz provides training templates and tools for informational and organizational purposes only. We are not licensed medical professionals or certified athletic trainers. Athletes with injuries or medical conditions should consult a qualified professional before following any training program on the platform. Offseaz is not liable for injuries resulting from the use of training programs created, assigned, or followed through the platform.</P>

      <Sec n="14" title="Limitation of Liability" />
      <P>To the fullest extent permitted by law, Offseaz and its affiliates will not be liable for any indirect, incidental, or consequential damages resulting from your use or inability to use the platform.</P>

      <Sec n="15" title="Governing Law" />
      <P>These Terms are governed by the laws of the State of Minnesota, United States. Any disputes shall be resolved exclusively in the courts of the State of Minnesota.</P>

      <Sec n="16" title="Changes to These Terms" />
      <P>We may update these Terms at any time. Updates will be posted with a revised Last Updated date. Continued use of the platform after updates constitutes acceptance of the revised Terms.</P>

      <Sec n="17" title="Contact Us" />
      <P>If you have questions about these Terms, contact us at <Email />.</P>
    </LegalLayout>
  )
}

// ── Refund Policy ─────────────────────────────────────────────────────────────

export function Refund() {
  return (
    <LegalLayout
      title="Refund Policy"
      lastUpdated="August 5, 2026"
      intro="At Offseaz, we want coaches and athletes to be fully satisfied with their experience on the platform. This Refund Policy explains the terms under which refunds are provided for both of Offseaz's paid products: the athlete personalized blueprint subscription and the coach sport blueprint unlock."
    >
      <Sec n="1" title="What This Policy Covers" />
      <P>Coach team tools — the dashboard, roster, Monday accountability report, and building and assigning a free custom team plan — are free forever and never involve a charge, so there is nothing to refund there. This policy applies only to the two paid products on Offseaz: (1) an athlete's personalized blueprint subscription, and (2) a coach's optional seasonal unlock of Offseaz's pre-made sport blueprints. Neither product has a free trial — the athlete survey and blueprint preview, and the coach's preview of pre-made blueprints, are free with no time limit, and payment is only charged when you actively choose to subscribe or purchase an unlock.</P>

      <Sec n="2" title="Eligibility for Refunds" />
      <Ul>
        <Li>Refund requests must be submitted within 15 days of the original charge date, for either the athlete subscription or the coach sport blueprint unlock</Li>
        <Li>Refunds are evaluated on a case-by-case basis and may be approved at our discretion</Li>
        <Li>Proof of purchase is required for all refund requests</Li>
      </Ul>

      <Sec n="3" title="Non-Refundable Items" />
      <P>The following are not eligible for refunds:</P>
      <Ul>
        <Li>Charges for periods of service already used beyond the 15-day window</Li>
        <Li>Charges that occurred more than 15 days before the refund request</Li>
        <Li>Accounts that have been suspended or terminated due to violations of these Terms</Li>
      </Ul>

      <Sec n="4" title="How to Request a Refund" />
      <P>To request a refund, contact us at <Email /> with your account email address and the reason for your request. If approved, refunds will be processed to your original payment method within 10 business days.</P>

      <Sec n="5" title="Cancellations" />
      <P>You may cancel your athlete subscription or coach sport blueprint unlock at any time from your account settings. Cancellation stops future billing. You will retain access through the end of your current paid period, with no automatic partial refund for the unused portion of that period.</P>

      <Sec n="6" title="Payment Failures &amp; Grace Periods" />
      <Ul>
        <Li>If an athlete's renewal payment fails, they keep full access for a grace period of approximately two weeks while we attempt to process payment. All logged history and progress is preserved during the grace period and, if the plan later locks, is preserved and fully restored once payment succeeds</Li>
        <Li>Coaches are notified by email of any payment issue on their account</Li>
        <Li>If a coach's sport blueprint unlock lapses at renewal, athletes keep access to any pre-made plans already assigned to them for the remainder of the current season, but the coach cannot assign new pre-made blueprints until the unlock is renewed. A coach's free custom team plan is never affected by a lapsed unlock</Li>
      </Ul>

      <Sec n="7" title="Consumer Rights" />
      <P>This Refund Policy does not limit any statutory rights you may have under applicable consumer protection laws in your jurisdiction.</P>

      <Sec n="8" title="Contact Us" />
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
    paddingTop: 64,
  },

  // Navbar
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
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
    fontFamily: "'Manrope', 'Inter', sans-serif",
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
    fontFamily: "'Manrope', 'Inter', sans-serif",
    letterSpacing: '-0.01em',
    margin: '36px 0 10px',
    paddingBottom: 8,
    borderBottom: '1px solid #1A1A1A',
    scrollMarginTop: 84, // keeps the heading clear of the fixed 64px nav when linked to directly
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
