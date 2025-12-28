import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { init, NavMesh, NavMeshQuery, importNavMesh } from 'recast-navigation'

interface NavMeshContextValue {
  navMesh: NavMesh | null
  navMeshQuery: NavMeshQuery | null
  isLoading: boolean
  error: Error | null
}

const NavMeshContext = createContext<NavMeshContextValue>({
  navMesh: null,
  navMeshQuery: null,
  isLoading: true,
  error: null,
})

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

        if (!cancelled) {
          setValue({
            navMesh: navMesh,
            navMeshQuery,
            isLoading: false,
            error: null,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setValue({
            navMesh: null,
            navMeshQuery: null,
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
