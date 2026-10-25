import shot1 from '../assets/2024/2024-1.webp'
import shot2 from '../assets/2024/2024-2.webp'
import heroShot from '../assets/2024/2024-5.webp'
import shot2025a from '../assets/2025/2025-3.webp'
import shot2025b from '../assets/2025/2025-4.webp'
import Masthead from './Masthead'
import SunBackdrop from './SunBackdrop'
import './Sponsor.css'

/*
 * The sponsor page. A step more sober than the title screen: this is read by
 * people deciding whether to spend money, so it opens with the pitch and one
 * photograph, then goes straight to the packages — the two things a sponsor
 * came for, above the fold and in that order.
 *
 * Everything on it is real — the lede, the packages, both years and every
 * photograph. `PhotoSlot` still draws an empty frame for a shot without a
 * `src`, so one can be added back without moving anything around it.
 */

const LEDE =
  'Big teams, school versus school. Neodev places a focus on collaboration and team dynamics, not just who can crank out the most code. Support brilliant and innovative high schoolers in this 14 hour long hackathon.'

/*
 * The tiers, cheapest first. `perks` is only what that tier adds — each one
 * also carries everything below it, which the card states in its own words
 * rather than by repeating the lists.
 */
const TIERS = [
  {
    name: 'Bronze',
    price: '$250',
    perks: [
      'Logo on the website',
      'Thank-you during the opening ceremony',
      'Distribute merch and swag',
    ],
  },
  {
    name: 'Silver',
    price: '$500',
    perks: [
      '5 min speaking time during the opening ceremony',
      'Send mentors',
      'Access to the email list',
    ],
  },
  {
    name: 'Gold',
    price: '$1000',
    perks: [
      'Sponsor booth',
      '10 min speaking time during the opening ceremony',
      'Access to resumes, LinkedIn and GitHub',
    ],
  },
  {
    name: 'Diamond',
    price: '$2000',
    perks: [
      '15 min speaking time during the opening ceremony',
      'Custom side track',
    ],
  },
]

/*
 * The years, most recent first. Each is the same three parts — a count, a
 * line about the year, and its photographs — but they are not the same block
 * twice: the current year turns around — photographs first, count last —
 * while the year before it leads with its count. `.year-shots` takes as many
 * columns as that year has photographs, so a year may carry any number.
 */
const YEARS = [
  {
    year: '2025',
    count: '80+',
    unit: 'Hackers',
    where: 'Accelerator Centre, University of Waterloo',
    shots: [{ src: shot2025a }, { src: shot2025b }],
  },
  {
    year: '2024',
    count: '70+',
    unit: 'Participants',
    where: 'Den 1880, Waterloo',
    shots: [{ src: shot1 }, { src: shot2 }],
  },
]

/**
 * A photograph, or the frame waiting for one. The frame holds its aspect
 * ratio whether or not it is filled, so dropping an image in later does not
 * move anything around it.
 */
function PhotoSlot({ src, code, alt, className = 'sponsor-slot' }) {
  return (
    <figure className={className}>
      <div className={`sponsor-photo-frame${src ? ' is-filled' : ''}`}>
        {src ? (
          <img src={src} alt={alt} loading="lazy" decoding="async" />
        ) : (
          <>
            <span className="sponsor-photo-code">{code}</span>
            <span className="sponsor-photo-hint">IMAGE</span>
          </>
        )}
      </div>
    </figure>
  )
}

/**
 * One year of the event: its headline count beside its photographs.
 *
 * `flip` turns the block around — photographs first, count last — so the
 * years alternate down the page instead of repeating one layout.
 */
function Year({ year, count, unit, where, shots, flip }) {
  const id = `year-${year}`

  return (
    <section
      className={`sponsor-band year${flip ? ' year--flip' : ''}`}
      aria-labelledby={id}
    >
      <h2 className="sponsor-h2" id={id}>
        Neodev {year}
      </h2>

      <div className="year-body">
        <div className="year-count">
          <strong>{count}</strong>
          <span>{unit}</span>
          <p className="year-where">
            <span>Location</span>
            {where}
          </p>
        </div>

        <div className="year-shots">
          {shots.map((shot, i) => (
            <PhotoSlot
              key={shot.src || shot.code}
              src={shot.src}
              code={shot.code}
              alt={`Neodev ${year}, photo ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function SponsorPage() {
  return (
    <>
      <Masthead page="sponsor" />

      <div className="sponsor-page">
        {/* The title screen's sun, on its own behind the pitch. */}
        <SunBackdrop className="sponsor-sun" />

        <main className="sponsor-main">
          {/* Pitch on the left, photograph on the right. */}
          <header className="sponsor-hero">
            <div className="sponsor-hero-copy">
              <h1 className="sponsor-title">Sponsor Neodev</h1>
              <p className="sponsor-lede">{LEDE}</p>
            </div>

            <PhotoSlot
              className="sponsor-hero-photo"
              src={heroShot}
              alt="Neodev 2024"
            />
          </header>

          {/* -------------------------------------------------- the packages */}
          <section className="sponsor-band" aria-labelledby="tiers-title">
            <h2 className="sponsor-h2" id="tiers-title">
              Sponsor packages
            </h2>

            <ol className="tiers">
              {TIERS.map((tier, i) => (
                <li className={`tier tier--${tier.name.toLowerCase()}`} key={tier.name}>
                  <header className="tier-head">
                    <h3 className="tier-name">{tier.name}</h3>
                    <p className="tier-price">{tier.price}</p>
                  </header>

                  {/*
                   * The tiers stack, so every card but the cheapest opens by
                   * naming the one below it and then lists only what it adds.
                   */}
                  {i > 0 && (
                    <p className="tier-inherits">
                      Everything in {TIERS[i - 1].name}, plus:
                    </p>
                  )}

                  <ul className="tier-perks">
                    {tier.perks.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>

          {/* ------------------------------------ the years, newest first */}
          {YEARS.map((entry, i) => (
            <Year key={entry.year} {...entry} flip={i % 2 === 0} />
          ))}

          {/*
           * The way back. The masthead's links all point into the title
           * screen's sections, so the foot of the page carries the plain
           * return to the top of it — a real navigation, not a hash.
           */}
          <footer className="sponsor-foot">
            <a className="sponsor-home" href="/">
              <svg className="sponsor-home-icon" aria-hidden="true">
                <use href="/icons.svg#home-icon" />
              </svg>
              Back to home page
            </a>
          </footer>
        </main>
      </div>
    </>
  )
}
