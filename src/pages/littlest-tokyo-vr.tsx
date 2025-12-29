import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { LittlestTokyoVR } from '../demos/LittlestTokyoVR'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LittlestTokyoVR />
  </StrictMode>,
)
