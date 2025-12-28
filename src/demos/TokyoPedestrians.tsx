import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import * as THREE from 'three'
import { LittlestTokyo } from '../components/LittlestTokyo'
import { Pedestrian } from '../components/Pedestrian'
import { NavMeshProvider } from '../components/NavMeshProvider'

// Base path for assets (handles GitHub Pages deployment)
const BASE_URL = import.meta.env.BASE_URL || '/'

interface TokyoPedestriansProps {
  onBack: () => void
}

function PedestriansScene() {
  return (
    <>
      <LittlestTokyo />
      <Environment preset="city" />

      {/* Three pedestrians starting at different positions */}
      <Pedestrian
        startPosition={new THREE.Vector3(0, 1, 2)}
        speed={0.4}
      />
      <Pedestrian
        startPosition={new THREE.Vector3(2, 1, 0)}
        speed={0.5}
      />
      <Pedestrian
        startPosition={new THREE.Vector3(-1, 1, 1)}
        speed={0.45}
      />
    </>
  )
}

export function TokyoPedestrians({ onBack }: TokyoPedestriansProps) {
  const navMeshUrl = `${BASE_URL}models/LittlestTokyo.navmesh.bin`

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
          <NavMeshProvider navMeshUrl={navMeshUrl}>
            <PedestriansScene />
          </NavMeshProvider>
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
