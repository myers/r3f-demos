import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { ReactXRMultiview } from '../demos/ReactXRMultiview'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactXRMultiview />
  </StrictMode>,
)
