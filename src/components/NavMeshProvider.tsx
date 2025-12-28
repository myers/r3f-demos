import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { init, NavMesh, NavMeshQuery, importNavMesh } from 'recast-navigation'
import { NavMeshHelper } from '@recast-navigation/three'

interface NavMeshBounds {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  halfExtents: { x: number; y: number; z: number }
}

interface NavMeshContextValue {
  navMesh: NavMesh | null
  navMeshQuery: NavMeshQuery | null
  bounds: NavMeshBounds | null
  isLoading: boolean
  error: Error | null
}

const NavMeshContext = createContext<NavMeshContextValue>({
  navMesh: null,
  navMeshQuery: null,
  bounds: null,
  isLoading: true,
  error: null,
})

/**
 * Calculate the bounding box of a navmesh using the NavMeshHelper geometry
 */
function calculateNavMeshBounds(navMesh: NavMesh): NavMeshBounds {
  // Create a temporary helper to get the navmesh geometry
  const helper = new NavMeshHelper(navMesh)
  const geometry = helper.navMeshGeometry

  // Compute bounding box from geometry
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!

  const min = { x: box.min.x, y: box.min.y, z: box.min.z }
  const max = { x: box.max.x, y: box.max.y, z: box.max.z }

  const size = {
    x: max.x - min.x,
    y: max.y - min.y,
    z: max.z - min.z,
  }

  const halfExtents = {
    x: size.x / 2,
    y: size.y / 2,
    z: size.z / 2,
  }

  // Clean up
  geometry.dispose()

  return { min, max, size, halfExtents }
}

export function useNavMesh() {
  return useContext(NavMeshContext)
}

interface NavMeshProviderProps {
  navMeshUrl: string
  children: ReactNode
}

export function NavMeshProvider({ navMeshUrl, children }: NavMeshProviderProps) {
  const [value, setValue] = useState<NavMeshContextValue>({
    navMesh: null,
    navMeshQuery: null,
    bounds: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Initialize recast-navigation WASM
        await init()

        // Fetch the navmesh binary
        const response = await fetch(navMeshUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch navmesh: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const navMeshData = new Uint8Array(arrayBuffer)

        // Import the navmesh
        const importResult = importNavMesh(navMeshData)
        const navMesh = importResult.navMesh
        const navMeshQuery = new NavMeshQuery(navMesh)
        const bounds = calculateNavMeshBounds(navMesh)

        if (!cancelled) {
          setValue({
            navMesh: navMesh,
            navMeshQuery,
            bounds,
            isLoading: false,
            error: null,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setValue({
            navMesh: null,
            navMeshQuery: null,
            bounds: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [navMeshUrl])

  return (
    <NavMeshContext.Provider value={value}>
      {children}
    </NavMeshContext.Provider>
  )
}
