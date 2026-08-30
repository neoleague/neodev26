import SynthwaveBackground from './components/SynthwaveBackground'
import AboutSection from './components/AboutSection'
import WaveTransition from './components/WaveTransition'
import FaqSection from './components/FaqSection'
import ContactSection from './components/ContactSection'
import Scrollbar from './components/Scrollbar'
import Masthead from './components/Masthead'
import './App.css'

/** Event details — swap these once the date and venue are locked in. */
const EVENT = {
  date: 'DATE',
  place: 'PLACE',
  signupUrl: '#signup',
}

function App() {
  return (
    <>
      <SynthwaveBackground
        className="page-background"
        speed={0.9}
        horizon={0.58}
        sunSize={0.3}
        /* The beach and everything under it paint over this. */
        visibleWhile=".screen"
      />

      <Masthead />

      <div className="screen">
        <main id="hero">
          <h1 className="wordmark" data-text="NEODEV">
            NEODEV
          </h1>
          <p className="tagline">Neo Developers League</p>
          <p className="details">
            {EVENT.date} <span aria-hidden="true">—</span> {EVENT.place}
          </p>
          <a className="signup" href={EVENT.signupUrl}>
            Sign Up
          </a>
        </main>
      </div>

      <AboutSection />

      <WaveTransition />

      {/*
        Everything below the wave, wrapped as one. The transition lifts this
        out of the document so the page ends at the beach — which only works
        if nothing is left behind it in flow.
      */}
      <div className="depths">
        <FaqSection />
        <ContactSection />
      </div>

      {/*
        Last, so it paints over everything. The page's only scrollbar — the
        native one is hidden, because it cannot describe a page that holds a
        whole section out of the document. See Scrollbar.jsx.
      */}
      <Scrollbar />
    </>
  )
}

export default App
