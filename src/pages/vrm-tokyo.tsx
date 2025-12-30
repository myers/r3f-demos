import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { TokyoVRMPedestrians } from '../demos/TokyoVRMPedestrians'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TokyoVRMPedestrians />
  </StrictMode>,
)
