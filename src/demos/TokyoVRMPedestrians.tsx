import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls, button, monitor } from 'leva'
import * as THREE from 'three'
import { VRMPedestrian } from '../components/VRMPedestrian'
import { NavMeshProvider } from '../components/NavMeshProvider'
import { NavMeshDebug } from '../components/NavMeshDebug'
import { LittlestTokyo } from '../components/LittlestTokyo'
import { DebugLogProvider, DebugLogPanel } from '../components/DebugLog'
import { CollisionSystem } from '../ecs/systems'

// Base path for assets (handles GitHub Pages deployment)
const BASE_URL = import.meta.env.BASE_URL || '/'

// Navmesh is in model space, pedestrians work in same coordinate system
const MODEL_SCALE = 0.01

// VRM model URLs (CC0 licensed models from various sources)
// Note: Using local models or reliable CDN-hosted VRM files
const VRM_MODELS = [
  // VRoid sample models - these are examples, replace with your own VRM URLs
  'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
]

// Component to track and expose FPS to leva
function FPSMonitor() {
  const fpsRef = useRef(60)
  const framesRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useControls({
    fps: monitor(() => fpsRef.current, { graph: true, interval: 100 }),
  })

  useFrame(() => {
    framesRef.current++
    const now = performance.now()
    const elapsed = now - lastTimeRef.current
    if (elapsed >= 500) {
      fpsRef.current = Math.round((framesRef.current / elapsed) * 1000)
      framesRef.current = 0
      lastTimeRef.current = now
    }
  })

  return null
}

// Seeded random number generator for stable pedestrian positions
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Generate stable pedestrian configs based on count
function generatePedestrianConfigs(count: number, vrmModels: string[]) {
  const configs = []
  for (let i = 0; i < count; i++) {
    const seed = i * 12345
    configs.push({
      id: `vrm${i + 1}`,
      vrmUrl: vrmModels[i % vrmModels.length],
      startPosition: new THREE.Vector3(
        (seededRandom(seed) - 0.5) * 200,
        -200,
        (seededRandom(seed + 1) - 0.5) * 200
      ),
      speed: 28 + seededRandom(seed + 2) * 10, // 28-38 speed range
    })
  }
  return configs
}

function VRMPedestriansScene({ pedestrianCount }: { pedestrianCount: number }) {
  const { showTokyo, showNavMesh } = useControls({
    showTokyo: { value: true, label: 'Show Tokyo Model' },
    showNavMesh: { value: true, label: 'Show NavMesh' },
  })

  // Generate stable configs based on count
  const pedestrianConfigs = useMemo(
    () => generatePedestrianConfigs(pedestrianCount, VRM_MODELS),
    [pedestrianCount]
  )

  return (
    <>
      {/* Tokyo model */}
      {showTokyo && <LittlestTokyo />}

      {/* Visible navmesh wireframe */}
      {showNavMesh && (
        <group scale={MODEL_SCALE}>
          <NavMeshDebug />
        </group>
      )}

      {/* VRM Pedestrians in model space */}
      <group scale={MODEL_SCALE}>
        {pedestrianConfigs.map((config) => (
          <Suspense key={config.id} fallback={null}>
            <VRMPedestrian
              id={config.id}
              vrmUrl={config.vrmUrl}
              startPosition={config.startPosition}
              speed={config.speed}
            />
          </Suspense>
        ))}
      </group>

      {/* Lighting optimized for VRM MToon materials */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
    </>
  )
}

export function TokyoVRMPedestrians() {
  const navMeshUrl = `${BASE_URL}models/LittlestTokyo.navmesh.bin`

  const { pedestrianCount, showDebugLog } = useControls({
    'Back to Demos': button(() => {
      window.location.href = BASE_URL
    }),
    pedestrianCount: { value: 1, min: 1, max: 10, step: 1, label: 'VRM Pedestrians' },
    showDebugLog: { value: false, label: 'Show Debug Log' },
  })

  return (
    <DebugLogProvider>
      <Canvas
        camera={{ position: [5, 5, 5], fov: 60 }}
        gl={{ antialias: true }}
        style={{ background: '#1a1a2e' }}
      >
        <Suspense fallback={null}>
          <NavMeshProvider navMeshUrl={navMeshUrl}>
            <VRMPedestriansScene pedestrianCount={pedestrianCount} />
          </NavMeshProvider>
        </Suspense>

        <CollisionSystem />

        <OrbitControls
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.05}
        />

        <FPSMonitor />
      </Canvas>
      {showDebugLog && <DebugLogPanel />}
    </DebugLogProvider>
  )
}
