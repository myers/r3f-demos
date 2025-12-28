import { useEffect, useRef, useMemo } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { useNavMesh } from './NavMeshProvider'
import { useDebugLog } from './DebugLog'

const SOLDIER_URL = 'https://threejs.org/examples/models/gltf/Soldier.glb'

interface PedestrianProps {
  /** Unique ID for debug logging */
  id?: string
  /** Starting position (will find nearest point on navmesh) */
  startPosition?: THREE.Vector3
  /** Walking speed in units per second */
  speed?: number
  /** Scale of the model (in model space - 30 is human-sized for LittlestTokyo) */
  scale?: number
}

export function Pedestrian({
  id = 'ped',
  startPosition = new THREE.Vector3(0, 0, 0),
  speed = 30,
  scale = 30,
}: PedestrianProps) {
  const { scene, animations } = useGLTF(SOLDIER_URL)
  const groupRef = useRef<THREE.Group>(null)
  const { navMeshQuery } = useNavMesh()
  const { log } = useDebugLog()

  // Navigation state
  const navState = useRef({
    path: [] as THREE.Vector3[],
    pathIndex: 0,
    currentTarget: null as THREE.Vector3 | null,
    initialized: false,
  })

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

  // Initialize position on navmesh
  useEffect(() => {
    if (!navMeshQuery || !groupRef.current || navState.current.initialized) return

    log(`[${id}] Initializing at start position (${startPosition.x.toFixed(1)}, ${startPosition.y.toFixed(1)}, ${startPosition.z.toFixed(1)})`)

    // Find closest point on navmesh to start position
    const result = navMeshQuery.findClosestPoint({
      x: startPosition.x,
      y: startPosition.y,
      z: startPosition.z,
    })

    if (result.success) {
      groupRef.current.position.set(result.point.x, result.point.y, result.point.z)
      log(`[${id}] Snapped to navmesh at (${result.point.x.toFixed(1)}, ${result.point.y.toFixed(1)}, ${result.point.z.toFixed(1)})`)
    } else {
      groupRef.current.position.copy(startPosition)
      log(`[${id}] WARNING: Could not find navmesh point, using start position`)
    }

    navState.current.initialized = true
  }, [navMeshQuery, startPosition, id, log])

  // Use a ref to store log function to avoid re-renders
  const logRef = useRef(log)
  logRef.current = log

  // Movement logic in useFrame
  useFrame((_, delta) => {
    if (!navMeshQuery || !groupRef.current) return

    const state = navState.current
    const position = groupRef.current.position

    // If no current target, find a new destination
    if (!state.currentTarget) {
      const randomResult = navMeshQuery.findRandomPoint()
      if (!randomResult.success) {
        logRef.current(`[${id}] findRandomPoint failed`)
        return
      }

      const destination = new THREE.Vector3(
        randomResult.randomPoint.x,
        randomResult.randomPoint.y,
        randomResult.randomPoint.z
      )

      // Compute path
      const startResult = navMeshQuery.findClosestPoint({
        x: position.x,
        y: position.y,
        z: position.z,
      })
      const endResult = navMeshQuery.findClosestPoint({
        x: destination.x,
        y: destination.y,
        z: destination.z,
      })

      if (!startResult.success || !endResult.success) {
        logRef.current(`[${id}] findClosestPoint failed: start=${startResult.success}, end=${endResult.success}`)
        return
      }

      const pathResult = navMeshQuery.computePath(startResult.point, endResult.point)
      if (!pathResult.success || pathResult.path.length === 0) {
        logRef.current(`[${id}] computePath failed: success=${pathResult.success}, length=${pathResult.path?.length || 0}`)
        return
      }

      state.path = pathResult.path.map((p) => new THREE.Vector3(p.x, p.y, p.z))
      state.pathIndex = 0
      state.currentTarget = state.path[0]
      logRef.current(`[${id}] New path with ${state.path.length} waypoints`)
      return
    }

    // Move towards current target
    const direction = new THREE.Vector3().subVectors(state.currentTarget, position)
    const distance = direction.length()

    if (distance < 5) {
      // Reached waypoint, move to next
      state.pathIndex++
      if (state.pathIndex >= state.path.length) {
        // Reached destination, find new one
        logRef.current(`[${id}] Reached destination`)
        state.currentTarget = null
        state.path = []
        state.pathIndex = 0
      } else {
        state.currentTarget = state.path[state.pathIndex]
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
