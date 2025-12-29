import { Suspense, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { XR, createXRStore, XROrigin } from '@react-three/xr'
import { SplashScreen } from 'r3f-xr-widgets'
import { WebGPUCanvas } from '../components/WebGPUCanvas'
import { MultiviewScene } from '../components/MultiviewScene'
import {
  MultiviewStatus,
  MultiviewStatusOverlay,
} from '../components/MultiviewStatus'

// Base path for links (handles GitHub Pages deployment)
const BASE_URL = import.meta.env.BASE_URL || '/'

// Create XR store with layers feature for XRProjectionLayer support
// Controllers and hands are enabled by default in @react-three/xr v6
const xrStore = createXRStore({
  layers: true, // Enable XRProjectionLayer support for multiview
})

/**
 * XR configuration component that runs inside the Canvas/XR context.
 * Sets up reference space and logs multiview-related info on session start.
 */
function XRConfig() {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    // Configure XR reference space
    gl.xr.setReferenceSpaceType('local-floor')

    // Debug logging when session starts
    const onSessionStart = () => {
      console.log('[Multiview Demo] XR Session started')
      console.log('[Multiview Demo] Renderer:', gl.constructor.name)

      // Check for multiview extension
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const glContext = (gl as any).getContext?.() as WebGL2RenderingContext | null
      if (glContext) {
        const ext = glContext.getExtension('OVR_multiview2')
        console.log('[Multiview Demo] OVR_multiview2 extension:', ext ? 'Available' : 'Not available')
      }

      // Log XR layer info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const xr = (gl as any).xr
      const baseLayer = xr?.getBaseLayer?.()
      const binding = xr?.getBinding?.()
      console.log('[Multiview Demo] Base Layer:', baseLayer?.constructor.name)
      console.log('[Multiview Demo] Binding:', binding?.constructor.name)
    }

    gl.xr.addEventListener('sessionstart', onSessionStart)
    return () => gl.xr.removeEventListener('sessionstart', onSessionStart)
  }, [gl])

  return null
}

/**
 * React XR Multiview Demo
 *
 * Demonstrates WebGPURenderer with WebGL backend and multiview support
 * for optimized VR rendering. Multiview allows rendering both eye views
 * in a single draw call, significantly improving performance on Quest
 * and other VR headsets that support the OVR_multiview2 extension.
 *
 * Key features:
 * - WebGPURenderer with forceWebGL: true for WebGL2 backend
 * - multiview: true for OVR_multiview2 extension usage
 * - XRProjectionLayer support via 'layers' optional feature
 * - Debug overlay showing multiview status
 */
export function ReactXRMultiview() {
  return (
    <>
      {/* Back button */}
      <a
        href={BASE_URL}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          padding: '8px 16px',
          fontSize: '14px',
          cursor: 'pointer',
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        ← Back to Demos
      </a>

      {/* Status overlay */}
      <MultiviewStatusOverlay />

      {/* Main 3D canvas with WebGPU renderer */}
      <WebGPUCanvas
        camera={{ position: [0, 1.6, 3], fov: 50 }}
        style={{ background: '#111' }}
      >
        <XR store={xrStore}>
          <XRConfig />

          <Suspense fallback={null}>
            <MultiviewScene />
          </Suspense>

          {/* In-scene status display */}
          <MultiviewStatus />

          {/* XR origin - controllers and hands are rendered automatically by the store */}
          <XROrigin />

          {/* Desktop controls */}
          <OrbitControls
            target={[0, 0.5, -2]}
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
          />

          {/* Performance stats */}
          <Stats />
        </XR>
      </WebGPUCanvas>

      {/* VR entry splash screen */}
      <SplashScreen store={xrStore} modes={['immersive-vr']}>
        <h1>WebGPU Multiview Demo</h1>
        <p>Test WebGPURenderer with multiview optimization for VR.</p>
        <p style={{ fontSize: '0.9em', color: '#666' }}>
          Uses forceWebGL + multiview for OVR_multiview2 support.
          <br />
          Check console for multiview status when entering VR.
        </p>
      </SplashScreen>
    </>
  )
}
