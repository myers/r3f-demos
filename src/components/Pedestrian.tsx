import { useEffect, useRef, useMemo, useCallback } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { useNavMesh } from './NavMeshProvider'

const SOLDIER_URL = 'https://threejs.org/examples/models/gltf/Soldier.glb'

interface PedestrianProps {
  /** Starting position (will find nearest point on navmesh) */
  startPosition?: THREE.Vector3
  /** Walking speed in units per second */
  speed?: number
  /** Scale of the model */
  scale?: number
}

export function Pedestrian({
  startPosition = new THREE.Vector3(0, 0, 0),
  speed = 0.5,
  scale = 0.01,
}: PedestrianProps) {
  const { scene, animations } = useGLTF(SOLDIER_URL)
  const groupRef = useRef<THREE.Group>(null)
  const { navMeshQuery } = useNavMesh()

  // Path state
  const pathRef = useRef<THREE.Vector3[]>([])
  const pathIndexRef = useRef(0)
  const currentTargetRef = useRef<THREE.Vector3 | null>(null)

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

  // Find a random destination on the navmesh
  const findNewDestination = useCallback(() => {
    if (!navMeshQuery || !groupRef.current) return null

    const result = navMeshQuery.findRandomPoint()
    if (result.success) {
      return new THREE.Vector3(
        result.randomPoint.x,
        result.randomPoint.y,
        result.randomPoint.z
      )
    }
    return null
  }, [navMeshQuery])

  // Compute path to destination
  const computePath = useCallback(
    (from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] => {
      if (!navMeshQuery) return []

      // Find nearest points on navmesh
      const startResult = navMeshQuery.findClosestPoint({ x: from.x, y: from.y, z: from.z })
      const endResult = navMeshQuery.findClosestPoint({ x: to.x, y: to.y, z: to.z })

      if (!startResult.success || !endResult.success) return []

      // Find path
      const pathResult = navMeshQuery.computePath(startResult.point, endResult.point)

      if (!pathResult.success || pathResult.path.length === 0) return []

      // Convert to Vector3 array
      return pathResult.path.map(
        (p) => new THREE.Vector3(p.x, p.y, p.z)
      )
    },
    [navMeshQuery]
  )

  // Initialize position on navmesh
  useEffect(() => {
    if (!navMeshQuery || !groupRef.current) return

    // Find closest point on navmesh to start position
    const result = navMeshQuery.findClosestPoint({
      x: startPosition.x,
      y: startPosition.y,
      z: startPosition.z,
    })

    if (result.success) {
      groupRef.current.position.set(result.point.x, result.point.y, result.point.z)
    }
  }, [navMeshQuery, startPosition])

  // Animate along path
  useFrame((_, delta) => {
    if (!groupRef.current || !navMeshQuery) return

    // If no current target, find a new destination
    if (!currentTargetRef.current) {
      const destination = findNewDestination()
      if (destination) {
        const path = computePath(groupRef.current.position, destination)
        if (path.length > 0) {
          pathRef.current = path
          pathIndexRef.current = 0
          currentTargetRef.current = path[0]
        }
      }
      return
    }

    // Move towards current path point
    const position = groupRef.current.position
    const target = currentTargetRef.current
    const direction = new THREE.Vector3().subVectors(target, position)
    const distance = direction.length()

    if (distance < 0.1) {
      // Reached current waypoint, move to next
      pathIndexRef.current++

      if (pathIndexRef.current >= pathRef.current.length) {
        // Reached destination, find new one
        currentTargetRef.current = null
        pathRef.current = []
        pathIndexRef.current = 0
      } else {
        currentTargetRef.current = pathRef.current[pathIndexRef.current]
      }
    } else {
      // Move towards target
      direction.normalize()
      const moveDistance = Math.min(speed * delta, distance)
      position.addScaledVector(direction, moveDistance)

      // Face direction of movement
      const angle = Math.atan2(direction.x, direction.z)
      groupRef.current.rotation.y = angle
    }
  })

  // Don't render until navmesh is loaded
  if (!navMeshQuery) return null

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} scale={scale} />
    </group>
  )
}

// Preload the soldier model
useGLTF.preload(SOLDIER_URL)
