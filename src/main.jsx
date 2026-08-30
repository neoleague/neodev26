import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/*
 * Self-hosted so the page never waits on (or depends on) a font CDN, and the
 * latin subsets only: the site is written in English, and the full packages
 * ship Thai, Vietnamese, Cyrillic and Greek cuts whose @font-face blocks are
 * most of the stylesheet. Same faces, same weights, same glyphs on screen —
 * general punctuation (the em dash, curly quotes) is inside latin.
 */
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/chakra-petch/latin-500.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import '@fontsource/chakra-petch/latin-ext-500.css'
import '@fontsource/chakra-petch/latin-ext-600.css'
import '@fontsource/chakra-petch/latin-ext-700.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
