import './Contact.css'

/**
 * Contact — the cut-away.
 *
 * The dive ends at the seabed, so this section is what lies under it: bare
 * ground with nothing in it but the survey grid laid over the face, and a
 * terminal standing on it to send word back up.
 */

export default function ContactSection() {
  return (
    <section id="contact" aria-labelledby="contact-title">
      {/* The survey grid laid over the whole face. */}
      <div className="cut-grid" aria-hidden="true" />

      {/* ----------------------------------------------------- the content */}
      <div className="contact-inner">
        <header className="dig">
          <h2 className="dig-title" id="contact-title">
            Contact
          </h2>
        </header>

        {/*
          No endpoint yet — wire `action` to a form service (Formspree,
          Netlify Forms, your own handler) before this can actually send.
        */}
        <div className="transmit">
          <div className="transmit-bar">
            <span>transmit.exe</span>
            <span className="transmit-buttons" aria-hidden="true">
              <i>_</i>
              <i>□</i>
              <i>✕</i>
            </span>
          </div>

          <form className="geode-form">
            <p className="geode-lead">Send word up to the surface.</p>

            <label className="field">
              <span>Name</span>
              <input type="text" name="name" autoComplete="name" required />
            </label>

            <label className="field">
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>

            <label className="field field--wide">
              <span>Message</span>
              <textarea name="message" rows={4} required />
            </label>

            <button className="geode-send" type="submit">
              Send
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
