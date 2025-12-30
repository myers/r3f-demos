import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pedestrianQuery, collidableQuery } from './world'
import { useNavMesh } from '../components/NavMeshProvider'

// Collision detection settings
const SEPARATION_STRENGTH = 0.5 // How strongly entities push apart

/**
 * System that handles collision avoidance between entities
 * Calculates separation forces for all collidable entities
 */
export function CollisionSystem() {
  useFrame(() => {
    const entities = [...collidableQuery]
    if (entities.length < 2) return

    // Reset separation forces
    for (const entity of entities) {
      entity.collision.separation.set(0, 0, 0)
    }

    // Check all pairs for collisions
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i]
        const b = entities[j]

        const posA = a.transform.position
        const posB = b.transform.position

        // Calculate distance (ignoring Y axis for ground-based collision)
        const dx = posB.x - posA.x
        const dz = posB.z - posA.z
        const distSq = dx * dx + dz * dz
        const minDist = a.collision.radius + b.collision.radius

        if (distSq < minDist * minDist && distSq > 0.001) {
          const dist = Math.sqrt(distSq)
          const overlap = minDist - dist

          // Normalize direction and scale by overlap
          const nx = dx / dist
          const nz = dz / dist
          const force = overlap * SEPARATION_STRENGTH

          // Apply forces (static objects don't receive forces, only push others)
          if (!a.collision.isStatic) {
            a.collision.separation.x -= nx * force
            a.collision.separation.z -= nz * force
          }
          if (!b.collision.isStatic) {
            b.collision.separation.x += nx * force
            b.collision.separation.z += nz * force
          }
        }
      }
    }
  })

  return null
}

/**
 * System that handles pedestrian movement and pathfinding
 * Uses useFrame to run once per frame
 */
export function PedestrianSystem() {
  const { navMeshQuery } = useNavMesh()

  useFrame((_, delta) => {
    if (!navMeshQuery) {
      console.log('PedestrianSystem: no navMeshQuery')
      return
    }

    // Process all pedestrian entities
    const entities = [...pedestrianQuery]
    if (entities.length === 0) {
      console.log('PedestrianSystem: no entities found')
      return
    }

    for (const entity of entities) {
      const { transform, navAgent } = entity
      if (!transform) {
        console.log('PedestrianSystem: entity has no transform')
        continue
      }

      // If no current target, find a new destination
      if (!navAgent.currentTarget) {
        const destination = findRandomDestination(navMeshQuery)
        console.log('PedestrianSystem: finding new destination', destination)
        if (destination) {
          const path = computePath(navMeshQuery, transform.position, destination)
          console.log('PedestrianSystem: computed path length', path.length)
          if (path.length > 0) {
            navAgent.path = path
            navAgent.pathIndex = 0
            navAgent.currentTarget = path[0]
          }
        }
        continue
      }

      // Move towards current path point
      const position = transform.position
      const target = navAgent.currentTarget
      const direction = new THREE.Vector3().subVectors(target, position)
      const distance = direction.length()

      if (distance < 5) {
        // Reached current waypoint, move to next
        navAgent.pathIndex++

        if (navAgent.pathIndex >= navAgent.path.length) {
          // Reached destination, find new one
          navAgent.currentTarget = null
          navAgent.path = []
          navAgent.pathIndex = 0
        } else {
          navAgent.currentTarget = navAgent.path[navAgent.pathIndex]
        }
      } else {
        // Move towards target
        direction.normalize()
        const moveDistance = Math.min(navAgent.speed * delta, distance)
        position.addScaledVector(direction, moveDistance)

        // Face direction of movement
        const angle = Math.atan2(direction.x, direction.z)
        transform.rotation.y = angle
      }
    }
  })

  return null
}

/**
 * Find a random walkable point on the navmesh
 */
function findRandomDestination(
  navMeshQuery: ReturnType<typeof useNavMesh>['navMeshQuery']
): THREE.Vector3 | null {
  if (!navMeshQuery) return null

  const result = navMeshQuery.findRandomPoint()
  if (result.success) {
    return new THREE.Vector3(
      result.randomPoint.x,
      result.randomPoint.y,
      result.randomPoint.z
    )
  }
  return null
}

/**
 * Compute a path between two points using the navmesh
 */
function computePath(
  navMeshQuery: ReturnType<typeof useNavMesh>['navMeshQuery'],
  from: THREE.Vector3,
  to: THREE.Vector3
): THREE.Vector3[] {
  if (!navMeshQuery) return []

  // Find nearest points on navmesh
  const startResult = navMeshQuery.findClosestPoint({
    x: from.x,
    y: from.y,
    z: from.z,
  })
  const endResult = navMeshQuery.findClosestPoint({ x: to.x, y: to.y, z: to.z })

  if (!startResult.success || !endResult.success) return []

  // Find path
  const pathResult = navMeshQuery.computePath(startResult.point, endResult.point)

  if (!pathResult.success || pathResult.path.length === 0) return []

  // Convert to Vector3 array
  return pathResult.path.map((p) => new THREE.Vector3(p.x, p.y, p.z))
}
