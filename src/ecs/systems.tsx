import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pedestrianQuery } from './world'
import { useNavMesh } from '../components/NavMeshProvider'

/**
 * System that handles pedestrian movement and pathfinding
 * Uses useFrame to run once per frame
 */
export function PedestrianSystem() {
  const { navMeshQuery } = useNavMesh()

  useFrame((_, delta) => {
    if (!navMeshQuery) return

    // Process all pedestrian entities
    const entities = [...pedestrianQuery]
    for (const entity of entities) {
      const { transform, navAgent } = entity
      if (!transform) continue

      // If no current target, find a new destination
      if (!navAgent.currentTarget) {
        const destination = findRandomDestination(navMeshQuery)
        if (destination) {
          const path = computePath(navMeshQuery, transform.position, destination)
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
