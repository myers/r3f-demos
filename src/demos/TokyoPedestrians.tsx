import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import * as THREE from 'three'
import { Pedestrian } from '../components/Pedestrian'
import { NavMeshProvider } from '../components/NavMeshProvider'
import { NavMeshDebug } from '../components/NavMeshDebug'

// Base path for assets (handles GitHub Pages deployment)
const BASE_URL = import.meta.env.BASE_URL || '/'

interface TokyoPedestriansProps {
  onBack: () => void
}

// Navmesh is in model space, pedestrians work in same coordinate system
const MODEL_SCALE = 0.01

function PedestriansScene() {
  return (
    <>
      {/* Visible navmesh wireframe */}
      <group scale={MODEL_SCALE}>
        <NavMeshDebug />
      </group>

      {/* Pedestrians in model space */}
      <group scale={MODEL_SCALE}>
        <Pedestrian
          startPosition={new THREE.Vector3(0, -200, 0)}
          speed={30}
        />
        <Pedestrian
          startPosition={new THREE.Vector3(100, -200, 50)}
          speed={35}
        />
        <Pedestrian
          startPosition={new THREE.Vector3(-50, -200, 100)}
          speed={32}
        />
      </group>

      {/* Simple lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
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
        camera={{ position: [5, 5, 5], fov: 60 }}
        gl={{ antialias: true }}
        style={{ background: '#1a1a2e' }}
      >
        <Suspense fallback={null}>
          <NavMeshProvider navMeshUrl={navMeshUrl}>
            <PedestriansScene />
          </NavMeshProvider>
        </Suspense>

        <OrbitControls
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.05}
        />

        <Stats />
      </Canvas>
    </>
  )
}
