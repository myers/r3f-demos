import { useMemo } from 'react'
import { useNavMesh } from './NavMeshProvider'
import { NavMeshHelper } from '@recast-navigation/three'
import * as THREE from 'three'

/**
 * Renders the navmesh as a visible mesh for debugging
 */
export function NavMeshDebug() {
  const { navMesh } = useNavMesh()

  const helper = useMemo(() => {
    if (!navMesh) return null

    return new NavMeshHelper(navMesh, {
      navMeshMaterial: new THREE.MeshBasicMaterial({
        color: '#4488ff',
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        wireframe: true,
      }),
    })
  }, [navMesh])

  if (!helper) return null

  return <primitive object={helper} />
}
