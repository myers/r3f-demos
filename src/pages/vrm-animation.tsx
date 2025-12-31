import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { VRMAnimationViewer } from '../demos/VRMAnimationViewer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VRMAnimationViewer />
  </StrictMode>,
)
