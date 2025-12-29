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
  const { navMeshQuery, bounds } = useNavMesh()
  const { log } = useDebugLog()

  // Randomize speed with ±10% variance (stable per pedestrian instance)
  const effectiveSpeed = useMemo(() => {
    const variance = 0.1
    const randomFactor = 1 + (Math.random() * 2 - 1) * variance
    return speed * randomFactor
  }, [speed])

  // Use navmesh bounds for search extent, with fallback
  const searchExtent = bounds?.halfExtents ?? { x: 500, y: 500, z: 500 }

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

  // Random animation offset (stable per pedestrian instance)
  const animationOffset = useMemo(() => Math.random(), [])

  // Play walk animation with random start time
  useEffect(() => {
    const walkAction = actions['Walk']
    if (walkAction) {
      walkAction.play()
      // Set random start time within the animation duration
      const duration = walkAction.getClip().duration
      walkAction.time = animationOffset * duration
    }
  }, [actions, animationOffset])

  // Initialize position on navmesh
  useEffect(() => {
    if (!navMeshQuery || !groupRef.current || navState.current.initialized) return

    log(`[${id}] Initializing, navmesh bounds: ${bounds ? `${bounds.size.x.toFixed(0)}x${bounds.size.y.toFixed(0)}x${bounds.size.z.toFixed(0)}` : 'unknown'}`)

    // Find closest point on navmesh to start position with dynamic search extent
    const result = navMeshQuery.findClosestPoint(
      { x: startPosition.x, y: startPosition.y, z: startPosition.z },
      { halfExtents: searchExtent }
    )

    if (result.success) {
      groupRef.current.position.set(result.point.x, result.point.y, result.point.z)
      log(`[${id}] Snapped to navmesh at (${result.point.x.toFixed(1)}, ${result.point.y.toFixed(1)}, ${result.point.z.toFixed(1)})`)
    } else {
      // Fallback: use a random point on the navmesh
      log(`[${id}] WARNING: Could not find closest point, trying random point`)
      const randomResult = navMeshQuery.findRandomPoint()
      if (randomResult.success) {
        groupRef.current.position.set(
          randomResult.randomPoint.x,
          randomResult.randomPoint.y,
          randomResult.randomPoint.z
        )
        log(`[${id}] Using random navmesh point (${randomResult.randomPoint.x.toFixed(1)}, ${randomResult.randomPoint.y.toFixed(1)}, ${randomResult.randomPoint.z.toFixed(1)})`)
      } else {
        groupRef.current.position.copy(startPosition)
        log(`[${id}] ERROR: Could not find any navmesh point`)
      }
    }

    navState.current.initialized = true
  }, [navMeshQuery, bounds, startPosition, id, log, searchExtent])

  // Use refs to store values for useFrame
  const logRef = useRef(log)
  logRef.current = log
  const searchExtentRef = useRef(searchExtent)
  searchExtentRef.current = searchExtent

  // Track if we've logged the first frame
  const firstFrameLogged = useRef(false)

  // Movement logic in useFrame
  useFrame((_, delta) => {
    if (!navMeshQuery || !groupRef.current) return

    const state = navState.current
    const position = groupRef.current.position

    // Log first frame info
    if (!firstFrameLogged.current) {
      firstFrameLogged.current = true
      logRef.current(`[${id}] First frame: initialized=${state.initialized}, pos=(${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`)
    }

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

      // Compute path with dynamic search extent
      const startResult = navMeshQuery.findClosestPoint(
        { x: position.x, y: position.y, z: position.z },
        { halfExtents: searchExtentRef.current }
      )
      const endResult = navMeshQuery.findClosestPoint(
        { x: destination.x, y: destination.y, z: destination.z },
        { halfExtents: searchExtentRef.current }
      )

      if (!startResult.success || !endResult.success) {
        logRef.current(`[${id}] findClosestPoint failed: start=${startResult.success}, end=${endResult.success}, pos=(${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`)
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
      const moveDistance = Math.min(effectiveSpeed * delta, distance)
      position.addScaledVector(direction, moveDistance)

      // Face direction of movement (add PI because Soldier model faces +Z)
      const targetAngle = Math.atan2(direction.x, direction.z) + Math.PI
      const currentAngle = groupRef.current.rotation.y

      // Lerp angle with wrapping (find shortest rotation path)
      let angleDiff = targetAngle - currentAngle
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

      // Smoothly rotate (0.1 = 10% per frame, adjust for turn speed)
      groupRef.current.rotation.y += angleDiff * 0.1
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
