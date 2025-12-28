import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import * as THREE from 'three'
import { LittlestTokyo } from '../components/LittlestTokyo'
import { Pedestrian } from '../components/Pedestrian'
import { NavMeshProvider } from '../components/NavMeshProvider'
import { PedestrianSystem } from '../ecs/systems'

// Base path for assets (handles GitHub Pages deployment)
const BASE_URL = import.meta.env.BASE_URL || '/'

interface TokyoPedestriansProps {
  onBack: () => void
}

// LittlestTokyo uses position=[1,1,0] scale=0.01
// Navmesh is in model space, so pedestrians need same transform
const MODEL_POSITION: [number, number, number] = [1, 1, 0]
const MODEL_SCALE = 0.01

function PedestriansScene() {
  return (
    <>
      <LittlestTokyo />
      <Environment preset="city" />

      {/* ECS System for pedestrian movement */}
      <PedestrianSystem />

      {/* Pedestrians in model space, wrapped with same transform as Tokyo */}
      <group position={MODEL_POSITION} scale={MODEL_SCALE}>
        {/* Start positions in navmesh/model coordinates */}
        <Pedestrian
          startPosition={new THREE.Vector3(0, -200, 0)}
          speed={30}
          scale={1}
        />
        <Pedestrian
          startPosition={new THREE.Vector3(100, -200, 50)}
          speed={35}
          scale={1}
        />
        <Pedestrian
          startPosition={new THREE.Vector3(-50, -200, 100)}
          speed={32}
          scale={1}
        />
      </group>
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
