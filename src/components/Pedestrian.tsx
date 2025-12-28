import { useEffect, useRef, useMemo } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { ECS } from '../ecs/world'
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

  // Don't render until navmesh is loaded
  if (!navMeshQuery) return null

  return (
    <ECS.Entity>
      <ECS.Component name="pedestrian" data={true} />
      <ECS.Component name="navAgent" data={{
        speed,
        path: [],
        pathIndex: 0,
        currentTarget: null,
      }} />
      <ECS.Component name="transform">
        <group ref={groupRef}>
          <primitive object={clonedScene} scale={scale} />
        </group>
      </ECS.Component>
    </ECS.Entity>
  )
}

// Preload the soldier model
useGLTF.preload(SOLDIER_URL)
