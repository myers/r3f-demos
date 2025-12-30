import { useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { useMemo } from 'react'
import { Html } from '@react-three/drei'

interface MultiviewInfo {
  sessionActive: boolean
  multiviewExtension: boolean | null
  layerType: string
  rendererType: string
}

/**
 * In-scene debug overlay showing multiview status.
 * Displays information about the XR session and multiview support.
 */
export function MultiviewStatus() {
  const gl = useThree((s) => s.gl)
  const { session } = useXR()

  const info = useMemo<MultiviewInfo>(() => {
    const rendererType = gl.constructor.name

    if (!session) {
      return {
        sessionActive: false,
        multiviewExtension: null,
        layerType: 'N/A',
        rendererType,
      }
    }

    // Check for multiview extension when in XR session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const glContext = (gl as any).getContext?.() as WebGL2RenderingContext | null
    let multiviewExt = null

    if (glContext) {
      const ext = glContext.getExtension('OVR_multiview2')
      multiviewExt = ext !== null
    }

    // Try to get the layer type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xr = (gl as any).xr
    const baseLayer = xr?.getBaseLayer?.()
    const layerType = baseLayer?.constructor.name || 'Unknown'

    return {
      sessionActive: true,
      multiviewExtension: multiviewExt,
      layerType,
      rendererType,
    }
  }, [session, gl])

  // Only show in non-XR mode (overlay would be annoying in VR)
  if (session) return null

  return (
    <Html
      position={[0, 2.5, -3]}
      center
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '11px',
        whiteSpace: 'pre',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
        Multiview Demo Status
      </div>
      <div>Renderer: {info.rendererType}</div>
      <div>XR Session: {info.sessionActive ? 'Active' : 'Inactive'}</div>
      <div>
        Multiview Ext:{' '}
        {info.multiviewExtension === null
          ? 'Check in VR'
          : info.multiviewExtension
            ? 'YES'
            : 'NO'}
      </div>
      <div>Layer Type: {info.layerType}</div>
    </Html>
  )
}

/**
 * HTML overlay version for outside the canvas
 */
export function MultiviewStatusOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '70px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '11px',
        zIndex: 100,
      }}
    >
      <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>
        WebGPU + Multiview Demo
      </div>
      <div style={{ color: '#aaa' }}>
        Uses WebGPURenderer with forceWebGL + multiview
      </div>
      <div style={{ color: '#aaa', marginTop: '4px' }}>
        Enter VR to test OVR_multiview2 extension
      </div>
    </div>
  )
}
