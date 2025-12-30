import { useEffect, useRef, useMemo } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { useNavMesh } from './NavMeshProvider'
import { useDebugLog } from './DebugLog'
import { world, type Entity } from '../ecs/world'

// CC0 VRM model from OpenGameArt
const DEFAULT_VRM_URL = 'https://opengameart.org/sites/default/files/sendagaya_shino.vrm'

// Collision radius for pedestrians (in navmesh/model space)
const COLLISION_RADIUS = 15

interface VRMPedestrianProps {
  /** Unique ID for debug logging */
  id?: string
  /** URL to VRM model file */
  vrmUrl?: string
  /** Starting position (will find nearest point on navmesh) */
  startPosition?: THREE.Vector3
  /** Walking speed in units per second */
  speed?: number
  /** Scale of the model (in model space) */
  scale?: number
}

// Custom hook to load VRM with the plugin
function useVRM(url: string) {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser))
  })
  return gltf.userData.vrm as VRM
}

export function VRMPedestrian({
  id = 'vrm',
  vrmUrl = DEFAULT_VRM_URL,
  startPosition = new THREE.Vector3(0, 0, 0),
  speed = 30,
  scale = 30,
}: VRMPedestrianProps) {
  const vrm = useVRM(vrmUrl)
  const groupRef = useRef<THREE.Group>(null)
  const vrmRef = useRef<VRM | null>(null)
  const { navMeshQuery, bounds } = useNavMesh()
  const { log } = useDebugLog()
  const entityRef = useRef<Entity | null>(null)

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

  // Clone the VRM model so each pedestrian has its own skeleton and animations
  const clonedScene = useMemo(() => {
    if (!vrm?.scene) return null

    // Clone the scene
    const cloned = SkeletonUtils.clone(vrm.scene)

    // Apply VRM optimizations
    VRMUtils.removeUnnecessaryVertices(cloned)
    VRMUtils.combineSkeletons(cloned)

    // Fix VRM 0.x orientation (rotates to face forward)
    // Note: rotateVRM0 checks version automatically
    if (vrm) {
      VRMUtils.rotateVRM0(vrm)
    }

    // Prevent frustum culling issues
    cloned.traverse((obj) => {
      obj.frustumCulled = false
    })

    return cloned
  }, [vrm])

  // Store VRM reference for updates
  useEffect(() => {
    if (vrm) {
      vrmRef.current = vrm

      // Apply combineMorphs for mobile performance
      VRMUtils.combineMorphs(vrm)

      log(`[${id}] VRM loaded successfully`)
    }

    // Cleanup on unmount
    return () => {
      if (vrmRef.current?.scene) {
        VRMUtils.deepDispose(vrmRef.current.scene)
      }
      vrmRef.current = null
    }
  }, [vrm, id, log])

  // Blink animation state
  const blinkState = useRef({
    nextBlinkTime: Math.random() * 3,
    isBlinking: false,
    blinkProgress: 0,
  })

  // Register with ECS world for collision detection
  useEffect(() => {
    if (!groupRef.current) return

    const entity: Entity = {
      transform: groupRef.current,
      collision: {
        radius: COLLISION_RADIUS,
        separation: new THREE.Vector3(),
      },
    }

    world.add(entity)
    entityRef.current = entity

    return () => {
      world.remove(entity)
      entityRef.current = null
    }
  }, [])

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

  // Movement and VRM update logic in useFrame
  useFrame((_, delta) => {
    // Update VRM (required every frame for spring bones, expressions, etc.)
    if (vrmRef.current) {
      vrmRef.current.update(delta)

      // Automatic blink animation
      const blink = blinkState.current
      blink.nextBlinkTime -= delta

      if (blink.nextBlinkTime <= 0 && !blink.isBlinking) {
        blink.isBlinking = true
        blink.blinkProgress = 0
      }

      if (blink.isBlinking) {
        blink.blinkProgress += delta * 10 // Blink speed
        const blinkValue = blink.blinkProgress < 0.5
          ? blink.blinkProgress * 2
          : 2 - blink.blinkProgress * 2

        vrmRef.current.expressionManager?.setValue('blink', Math.max(0, blinkValue))

        if (blink.blinkProgress >= 1) {
          blink.isBlinking = false
          blink.nextBlinkTime = 2 + Math.random() * 4 // 2-6 seconds between blinks
          vrmRef.current.expressionManager?.setValue('blink', 0)
        }
      }
    }

    if (!navMeshQuery || !groupRef.current) return

    const navStateVal = navState.current
    const position = groupRef.current.position

    // Apply separation force from collision system
    if (entityRef.current?.collision) {
      const separation = entityRef.current.collision.separation
      position.add(separation)
    }

    // Log first frame info
    if (!firstFrameLogged.current) {
      firstFrameLogged.current = true
      logRef.current(`[${id}] First frame: initialized=${navStateVal.initialized}, pos=(${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`)
    }

    // If no current target, find a new destination
    if (!navStateVal.currentTarget) {
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

      navStateVal.path = pathResult.path.map((p) => new THREE.Vector3(p.x, p.y, p.z))
      navStateVal.pathIndex = 0
      navStateVal.currentTarget = navStateVal.path[0]
      logRef.current(`[${id}] New path with ${navStateVal.path.length} waypoints`)
      return
    }

    // Move towards current target
    const direction = new THREE.Vector3().subVectors(navStateVal.currentTarget, position)
    const distance = direction.length()

    if (distance < 5) {
      // Reached waypoint, move to next
      navStateVal.pathIndex++
      if (navStateVal.pathIndex >= navStateVal.path.length) {
        // Reached destination, find new one
        logRef.current(`[${id}] Reached destination`)
        navStateVal.currentTarget = null
        navStateVal.path = []
        navStateVal.pathIndex = 0
      } else {
        navStateVal.currentTarget = navStateVal.path[navStateVal.pathIndex]
      }
    } else {
      // Move towards target
      direction.normalize()
      const moveDistance = Math.min(effectiveSpeed * delta, distance)
      position.addScaledVector(direction, moveDistance)

      // Face direction of movement
      // VRM models face -Z by default (after rotateVRM0 for 0.x models)
      const targetAngle = Math.atan2(direction.x, direction.z)
      const currentAngle = groupRef.current.rotation.y

      // Lerp angle with wrapping (find shortest rotation path)
      let angleDiff = targetAngle - currentAngle
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

      // Smoothly rotate (0.1 = 10% per frame, adjust for turn speed)
      groupRef.current.rotation.y += angleDiff * 0.1
    }
  })

  // Don't render until navmesh and VRM are loaded
  if (!navMeshQuery || !clonedScene) return null

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} scale={scale} />
    </group>
  )
}
