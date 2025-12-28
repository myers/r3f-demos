import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { XR, XROrigin, TeleportTarget } from '@react-three/xr'
import type { XRStore } from '@react-three/xr'

/**
 * Internal component that captures scene and stores it on canvas element.
 */
function SceneCapture({ store }: { store: XRStore }) {
  const { scene, gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    ;(canvas as any).__xrStore = store
    ;(canvas as any).__scene = scene
  }, [scene, store, gl])

  return null
}

export interface XRTestCanvasProps {
  store: XRStore
  children: ReactNode
}

/**
 * Canvas wrapper for XR tests.
 * Accepts a pre-created XR store to avoid act() warnings.
 */
export function XRTestCanvas({ store, children }: XRTestCanvasProps) {
  const [session, setSession] = useState<XRSession | null>(null)

  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      setSession(state.session ?? null)
    })
    setSession(store.getState().session ?? null)
    return unsubscribe
  }, [store])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {session == null && (
        <button onClick={() => store.enterXR('immersive-vr')}>Enter VR</button>
      )}

      <Canvas camera={{ position: [5, 2, 8], fov: 40 }}>
        <color attach="background" args={['#bfe3dd']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls target={[0, 0.5, 0]} />

        <SceneCapture store={store} />

        <XR store={store}>
          <Environment preset="city" />
          <XROrigin position={[0, 0, 5]} />
          <TeleportTarget onTeleport={(point) => point}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <planeGeometry args={[50, 50]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          </TeleportTarget>
          {children}
        </XR>
      </Canvas>
    </div>
  )
}
