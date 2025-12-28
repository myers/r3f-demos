import { useEffect, useRef, useMemo } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { world, type Entity } from '../ecs/world'
import { useNavMesh } from './NavMeshProvider'

const SOLDIER_URL = 'https://threejs.org/examples/models/gltf/Soldier.glb'

interface PedestrianProps {
  /** Starting position (will find nearest point on navmesh) */
  startPosition?: THREE.Vector3
  /** Walking speed in units per second */
  speed?: number
  /** Scale of the model (in model space - 100 is human-sized for LittlestTokyo) */
  scale?: number
}

export function Pedestrian({
  startPosition = new THREE.Vector3(0, 0, 0),
  speed = 30,
  scale = 100,
}: PedestrianProps) {
  const { scene, animations } = useGLTF(SOLDIER_URL)
  const groupRef = useRef<THREE.Group>(null)
  const entityRef = useRef<Entity | null>(null)
  const { navMeshQuery } = useNavMesh()

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

  // Create and manage entity
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
    } else {
      // Fallback to start position if navmesh query fails
      groupRef.current.position.copy(startPosition)
    }

    // Create entity with all components
    const entity = world.add({
      pedestrian: true,
      transform: groupRef.current,
      navAgent: {
        speed,
        path: [],
        pathIndex: 0,
        currentTarget: null,
      },
    })
    entityRef.current = entity

    // Cleanup: remove entity when component unmounts
    return () => {
      if (entityRef.current) {
        world.remove(entityRef.current)
        entityRef.current = null
      }
    }
  }, [navMeshQuery, startPosition, speed])

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
