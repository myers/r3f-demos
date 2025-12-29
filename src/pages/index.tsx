import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { DemoSelection } from '../App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoSelection />
  </StrictMode>,
)
