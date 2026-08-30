import './Masthead.css'

/*
 * One entry per destination that exists. The section links are plain hash
 * anchors so that on the title screen `onNavClick` in WaveTransition can
 * intercept them and run the wave — it only ever looks at `a[href^="#"]`, so
 * the sponsor link below is left alone and navigates like any other link.
 */
const NAV = [
  { label: 'About', href: '#about-title' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

/** The sponsor page is a separate document, not a section — hence no hash. */
const SPONSOR = { label: 'Sponsor', href: '/sponsor.html' }

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/', icon: 'instagram-icon' },
  { label: 'LinkedIn', href: 'https://linkedin.com/', icon: 'linkedin-icon' },
  { label: 'Discord', href: 'https://discord.com/', icon: 'discord-icon' },
]

/**
 * @param {string} [base]
 *   Prefix for the section links. Empty on the title screen, where they point
 *   at sections of the page the reader is already on; `/` on the sponsor page,
 *   where they have to send the reader back to the title screen first.
 */
export default function Masthead({ base = '' }) {
  return (
    <header id="masthead">
      <nav aria-label="Primary">
        <ul className="nav-links">
          {NAV.map((item) => (
            <li key={item.label}>
              <a href={`${base}${item.href}`}>{item.label}</a>
            </li>
          ))}
          <li>
            <a href={SPONSOR.href}>{SPONSOR.label}</a>
          </li>
        </ul>
      </nav>

      <ul className="socials">
        {SOCIALS.map((item) => (
          <li key={item.label}>
            <a href={item.href} target="_blank" rel="noreferrer" title={item.label}>
              <svg className="social-icon" aria-hidden="true">
                <use href={`/icons.svg#${item.icon}`} />
              </svg>
              <span className="sr-only">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </header>
  )
}
