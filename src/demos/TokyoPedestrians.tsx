import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import * as THREE from 'three'
import { LittlestTokyo } from '../components/LittlestTokyo'
import { Pedestrian } from '../components/Pedestrian'

// Define walking paths around the Tokyo scene
// The Tokyo model is at position [1, 1, 0] with scale 0.01
// Ground level is approximately y = 1
const PATHS = {
  // Path along front of scene
  path1: [
    new THREE.Vector3(-1, 1, 2),
    new THREE.Vector3(3, 1, 2),
    new THREE.Vector3(3, 1, 2.5),
    new THREE.Vector3(-1, 1, 2.5),
  ],
  // Path along side
  path2: [
    new THREE.Vector3(2.5, 1, -1),
    new THREE.Vector3(2.5, 1, 3),
    new THREE.Vector3(3, 1, 3),
    new THREE.Vector3(3, 1, -1),
  ],
  // Diagonal path
  path3: [
    new THREE.Vector3(-0.5, 1, 0),
    new THREE.Vector3(2, 1, 1.5),
    new THREE.Vector3(2.5, 1, 1),
    new THREE.Vector3(0, 1, -0.5),
  ],
}

interface TokyoPedestriansProps {
  onBack: () => void
}

export function TokyoPedestrians({ onBack }: TokyoPedestriansProps) {
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
        <Suspense fallback={null}>
          <LittlestTokyo />
          <Environment preset="city" />

          {/* Three pedestrians on different paths */}
          <Pedestrian path={PATHS.path1} speed={0.4} startOffset={0} />
          <Pedestrian path={PATHS.path2} speed={0.5} startOffset={0.3} />
          <Pedestrian path={PATHS.path3} speed={0.45} startOffset={0.6} />
        </Suspense>

        <OrbitControls
          target={[0, 0.5, 0]}
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
        />

        <Stats />
      </Canvas>
    </>
  )
}
