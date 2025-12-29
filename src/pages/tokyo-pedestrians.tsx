import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { TokyoPedestrians } from '../demos/TokyoPedestrians'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TokyoPedestrians />
  </StrictMode>,
)
