import { useEffect, useRef, useMemo } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

const SOLDIER_URL = 'https://threejs.org/examples/models/gltf/Soldier.glb'

interface PedestrianProps {
  path: THREE.Vector3[]
  speed?: number
  startOffset?: number
}

export function Pedestrian({ path, speed = 0.5, startOffset = 0 }: PedestrianProps) {
  const { scene, animations } = useGLTF(SOLDIER_URL)
  const groupRef = useRef<THREE.Group>(null)
  const progressRef = useRef(startOffset % 1)

  // Clone the model so each pedestrian has its own skeleton
  const clonedScene = useMemo(() => {
    return SkeletonUtils.clone(scene)
  }, [scene])

  const { actions } = useAnimations(animations, clonedScene)

  // Play walk animation
  useEffect(() => {
    const walkAction = actions['Walk']
    if (walkAction) {
      walkAction.play()
    }
  }, [actions])

  // Calculate total path length and segment lengths
  const pathData = useMemo(() => {
    const segments: { start: THREE.Vector3; end: THREE.Vector3; length: number }[] = []
    let totalLength = 0

    for (let i = 0; i < path.length; i++) {
      const start = path[i]
      const end = path[(i + 1) % path.length]
      const length = start.distanceTo(end)
      segments.push({ start, end, length })
      totalLength += length
    }

    return { segments, totalLength }
  }, [path])

  // Animate along path
  useFrame((_, delta) => {
    if (!groupRef.current || pathData.totalLength === 0) return

    // Update progress
    progressRef.current += (speed * delta) / pathData.totalLength
    if (progressRef.current >= 1) {
      progressRef.current -= 1
    }

    // Find current segment
    const targetDistance = progressRef.current * pathData.totalLength
    let accumulatedLength = 0
    let currentSegment = pathData.segments[0]
    let segmentProgress = 0

    for (const segment of pathData.segments) {
      if (accumulatedLength + segment.length >= targetDistance) {
        currentSegment = segment
        segmentProgress = (targetDistance - accumulatedLength) / segment.length
        break
      }
      accumulatedLength += segment.length
    }

    // Interpolate position
    const position = new THREE.Vector3().lerpVectors(
      currentSegment.start,
      currentSegment.end,
      segmentProgress
    )
    groupRef.current.position.copy(position)

    // Face direction of movement
    const direction = new THREE.Vector3()
      .subVectors(currentSegment.end, currentSegment.start)
      .normalize()
    if (direction.length() > 0) {
      const angle = Math.atan2(direction.x, direction.z)
      groupRef.current.rotation.y = angle
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} scale={0.01} />
    </group>
  )
}

// Preload the soldier model
useGLTF.preload(SOLDIER_URL)
