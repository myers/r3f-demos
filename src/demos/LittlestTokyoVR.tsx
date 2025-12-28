import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import { XR, createXRStore, XROrigin, TeleportTarget } from '@react-three/xr'
import { SplashScreen } from 'r3f-xr-widgets'
import { LittlestTokyo } from '../components/LittlestTokyo'

const store = createXRStore({
  controller: {
    teleportPointer: true,
  },
  hand: {
    teleportPointer: true,
  },
})

function TeleportArea() {
  return (
    <TeleportTarget onTeleport={(point) => point}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </TeleportTarget>
  )
}

interface LittlestTokyoVRProps {
  onBack: () => void
}

export function LittlestTokyoVR({ onBack }: LittlestTokyoVRProps) {
  return (
    <>
      <button
        onClick={onBack}
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
        }}
      >
        ← Back to Demos
      </button>
      <Canvas
        camera={{ position: [5, 2, 8], fov: 40 }}
        gl={{ antialias: true }}
        style={{ background: '#bfe3dd' }}
      >
        <XR store={store}>
          <Suspense fallback={null}>
            <LittlestTokyo />
            <Environment preset="city" />
          </Suspense>

          <XROrigin position={[0, 0, 5]} />
          <TeleportArea />

          <OrbitControls
            target={[0, 0.5, 0]}
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
          />

          <Stats />
        </XR>
      </Canvas>

      <SplashScreen store={store} modes={['immersive-vr']}>
        <h1>Littlest Tokyo</h1>
        <p>Walk through this animated city scene using VR teleportation.</p>
        <p style={{ fontSize: '0.9em', color: '#666' }}>
          Use your controller to point and teleport around the model.
        </p>
      </SplashScreen>
    </>
  )
}
