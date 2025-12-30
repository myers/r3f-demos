import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Mesh } from 'three'

// Cube positions matching the original proj-multiview.html sample
const CUBE_POSITIONS = [
  [-1, 0, -2],
  [1, 0, -2],
  [0, 1.5, -2],
  [-2, 0.5, -3],
  [2, 0.5, -3],
] as const

// Colors for variety
const CUBE_COLORS = ['#ff6b35', '#4ecdc4', '#ffe66d', '#c3b1e1', '#a8e6cf']

interface SpinningCubeProps {
  position: readonly [number, number, number]
  color: string
}

function SpinningCube({ position, color }: SpinningCubeProps) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.7
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

/**
 * Scene content matching the original proj-multiview.html sample.
 * Renders spinning cubes at various positions with lighting.
 */
export function MultiviewScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, 2, -2]} intensity={0.5} color="#ffccaa" />

      {/* Spinning cubes */}
      {CUBE_POSITIONS.map((pos, i) => (
        <SpinningCube key={i} position={pos} color={CUBE_COLORS[i]} />
      ))}

      {/* Floor grid for spatial reference */}
      <gridHelper args={[10, 10, '#444', '#222']} position={[0, -0.5, 0]} />

      {/* Ground plane for depth perception */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
  )
}
