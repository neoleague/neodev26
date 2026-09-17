import Seafloor from './Seafloor'
import './Faq.css'

/**
 * FAQ, staged as a dive. The wave sweep above has already put the reader under
 * the water; from here the questions descend past the reef, each one a station
 * further down than the last.
 *
 * The scene itself is `Seafloor` — this file is the questions and nothing
 * else. It used to draw its own water: light shafts, bubbles and a stepped
 * seabed built out of mixed sines. All three are gone with the old background.
 */

const FAQS = [
  {
    q: 'Who can join?',
    a: 'All students high school and below are welcome to participate!',
  },
  {
    q: 'What does it cost?',
    a: 'Neodev is completely free! Breakfast, lunch, and dinner will be provided as well.',
  },
  {
    q: 'Do I need a team?',
    a: "Teams are based on schools. You don't need a team to sign up!",
  },
  {
    q: 'What do I bring?',
    a: 'Participants must bring a laptop or device to work on. Chargers are also recommended.',
  },
]

export default function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title">
      <Seafloor />

      {/* ------------------------------------------------------- the content */}
      <div className="faq-inner">
        <header className="faq-head">
          <h2 className="faq-title" id="faq-title">
            FAQ
          </h2>
        </header>

        <ol className="dive">
          {FAQS.map((faq) => (
            <li className="station" key={faq.q}>
              <details className="card">
                <summary>
                  <span className="card-q">{faq.q}</span>
                  <span className="card-toggle" aria-hidden="true" />
                </summary>
                <p className="card-a">{faq.a}</p>
              </details>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
