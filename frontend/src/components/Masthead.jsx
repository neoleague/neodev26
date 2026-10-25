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

/** The title screen, for the section links to be relative to. */
const HOME = '/'

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/', icon: 'instagram-icon' },
  { label: 'LinkedIn', href: 'https://linkedin.com/', icon: 'linkedin-icon' },
  { label: 'Discord', href: 'https://discord.com/', icon: 'discord-icon' },
]

/**
 * @param {'home' | 'sponsor'} [page]
 *   Which of the site's two documents this masthead is being drawn on. It is
 *   the one thing the bar cannot work out for itself, and both of the things
 *   below that make a link smart are decided by it.
 *
 *   It replaces the `base` prefix this used to take. That was the same fact
 *   told slantwise — `''` meant "on the title screen" and `'/'` meant "not" —
 *   and it could only answer the first of the two questions.
 */
export default function Masthead({ page = 'home' }) {
  const onSponsor = page === 'sponsor'

  /*
   * Section links point at the page the sections are actually on. From the
   * title screen that is this page, so they stay bare hashes and `onNavClick`
   * in WaveTransition intercepts them and scrolls. From the sponsor page the
   * sections are not in this document at all, so they have to carry the
   * reader home first — the one case where a section link is a navigation,
   * and `jumpTo` puts them where they asked to go on arrival.
   */
  const base = onSponsor ? HOME : ''

  /*
   * Clicking Sponsor while already on the sponsor page. Left alone it would
   * fetch and rebuild the page the reader is already looking at, which reads
   * as a link that does nothing but flicker. Ride to the top instead — the
   * same thing every other link in this bar does, which is scroll.
   *
   * Native smooth scrolling is right here and only here: the sponsor page is
   * an ordinary document with no wave and no virtual axis, so there is no
   * crossing for it to cut across. The title screen's links must go through
   * `seekTo`; see the scrolling section of CLAUDE.md.
   */
  const onSponsorClick = (event) => {
    if (!onSponsor) return
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    event.preventDefault()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' })
  }

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
            <a
              href={SPONSOR.href}
              /* Screen readers announce the page the reader is on rather than
                 offering it as somewhere to go. */
              aria-current={onSponsor ? 'page' : undefined}
              onClick={onSponsorClick}
            >
              {SPONSOR.label}
            </a>
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
