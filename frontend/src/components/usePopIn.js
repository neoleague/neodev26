import { useEffect, useRef } from 'react'

/**
 * Marks `.pop` descendants as on-screen so About.css can play their pop-in.
 *
 * The elements start hidden in CSS and are revealed the first time they cross
 * into view, one at a time — the observer stops watching each one once it has
 * fired, so nothing re-pops on the way back up the page. Under
 * `prefers-reduced-motion: reduce`, or without IntersectionObserver, every
 * `.pop` is revealed immediately and no animation runs (CSS holds it still).
 */
export default function usePopIn() {
  const root = useRef(null)

  useEffect(() => {
    const host = root.current
    if (!host) return

    const targets = host.querySelectorAll('.pop')
    const still =
      typeof matchMedia !== 'function' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches

    if (still || typeof IntersectionObserver !== 'function') {
      targets.forEach((el) => el.classList.add('is-in'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        })
      },
      /* A little inset, so a thing pops once it is properly on screen. */
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return root
}
