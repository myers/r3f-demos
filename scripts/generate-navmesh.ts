/**
 * NavMesh Generation Utility
 *
 * Generates a navigation mesh from a GLB model and exports it as a binary file.
 *
 * Usage:
 *   npx tsx scripts/generate-navmesh.ts public/models/LittlestTokyo.glb
 *
 * Output:
 *   Creates a .navmesh.bin file next to the input file
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { dirname, basename, join } from 'path'
import { init, NavMeshQuery, exportNavMesh } from 'recast-navigation'
import { threeToTiledNavMesh } from '@recast-navigation/three'
import { NodeIO } from '@gltf-transform/core'
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3d'
import {
  Mesh,
  BufferGeometry,
  BufferAttribute,
  Matrix4,
  Vector3,
  Quaternion,
} from 'three'

async function loadGLB(pathOrUrl: string) {
  let data: Uint8Array

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    console.log(`Fetching from URL: ${pathOrUrl}`)
    const response = await fetch(pathOrUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }
    data = new Uint8Array(await response.arrayBuffer())
  } else {
    const buffer = await readFile(pathOrUrl)
    data = new Uint8Array(buffer)
  }

  // Set up gltf-transform with DRACO support
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
    })

  return io.readBinary(data)
}

interface MeshData {
  positions: Float32Array
  indices: Uint32Array
  worldMatrix: Matrix4
}

function extractMeshData(document: Awaited<ReturnType<typeof loadGLB>>): MeshData[] {
  const meshDataList: MeshData[] = []
  const root = document.getRoot()

  // Process all nodes
  for (const node of root.listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue

    // Build world matrix from node hierarchy
    const worldMatrix = new Matrix4()
    let currentNode = node
    const matrices: Matrix4[] = []

    while (currentNode) {
      const t = currentNode.getTranslation()
      const r = currentNode.getRotation()
      const s = currentNode.getScale()

      const nodeMatrix = new Matrix4()
      nodeMatrix.compose(
        new Vector3(t[0], t[1], t[2]),
        new Quaternion(r[0], r[1], r[2], r[3]),
        new Vector3(s[0], s[1], s[2])
      )
      matrices.unshift(nodeMatrix)

      const parent = currentNode.getParentNode()
      currentNode = parent as typeof currentNode
    }

    for (const m of matrices) {
      worldMatrix.multiply(m)
    }

    // Extract primitives
    for (const primitive of mesh.listPrimitives()) {
      const posAccessor = primitive.getAttribute('POSITION')
      const indAccessor = primitive.getIndices()

      if (!posAccessor) continue

      const positions = new Float32Array(posAccessor.getArray()!)
      let indices: Uint32Array

      if (indAccessor) {
        const indArray = indAccessor.getArray()!
        indices = new Uint32Array(indArray.length)
        for (let i = 0; i < indArray.length; i++) {
          indices[i] = indArray[i]
        }
      } else {
        // Non-indexed: create sequential indices
        indices = new Uint32Array(positions.length / 3)
        for (let i = 0; i < indices.length; i++) {
          indices[i] = i
        }
      }

      meshDataList.push({ positions, indices, worldMatrix })
    }
  }

  return meshDataList
}

function createThreeMeshes(meshDataList: MeshData[]): Mesh[] {
  const meshes: Mesh[] = []

  for (const { positions, indices, worldMatrix } of meshDataList) {
    const geometry = new BufferGeometry()

    // Apply world transform to positions
    const transformedPositions = new Float32Array(positions.length)
    const vec = new Vector3()

    for (let i = 0; i < positions.length; i += 3) {
      vec.set(positions[i], positions[i + 1], positions[i + 2])
      vec.applyMatrix4(worldMatrix)
      transformedPositions[i] = vec.x
      transformedPositions[i + 1] = vec.y
      transformedPositions[i + 2] = vec.z
    }

    geometry.setAttribute('position', new BufferAttribute(transformedPositions, 3))
    geometry.setIndex(new BufferAttribute(indices, 1))

    meshes.push(new Mesh(geometry))
  }

  return meshes
}

async function main() {
  const inputPath = process.argv[2]

  if (!inputPath) {
    console.error('Usage: npx tsx scripts/generate-navmesh.ts <path-to-glb>')
    console.error('Example: npx tsx scripts/generate-navmesh.ts public/models/LittlestTokyo.glb')
    process.exit(1)
  }

  console.log(`Loading ${inputPath}...`)

  // Initialize recast-navigation
  await init()

  // Load the GLB using gltf-transform
  const document = await loadGLB(inputPath)
  console.log('GLB loaded successfully')

  // Extract mesh data
  const meshDataList = extractMeshData(document)
  console.log(`Found ${meshDataList.length} mesh primitives`)

  if (meshDataList.length === 0) {
    console.error('No meshes found in the model')
    process.exit(1)
  }

  // Convert to Three.js meshes for navmesh generation
  const meshes = createThreeMeshes(meshDataList)

  let totalVerts = 0
  let totalTris = 0
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)

  for (const mesh of meshes) {
    const geo = mesh.geometry as BufferGeometry
    const pos = geo.getAttribute('position')
    totalVerts += pos.count
    totalTris += geo.getIndex()!.count / 3

    // Calculate bounds
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      min.x = Math.min(min.x, x)
      min.y = Math.min(min.y, y)
      min.z = Math.min(min.z, z)
      max.x = Math.max(max.x, x)
      max.y = Math.max(max.y, y)
      max.z = Math.max(max.z, z)
    }
  }
  console.log(`Total: ${totalVerts} vertices, ${totalTris} triangles`)
  console.log(`Bounds min: (${min.x.toFixed(2)}, ${min.y.toFixed(2)}, ${min.z.toFixed(2)})`)
  console.log(`Bounds max: (${max.x.toFixed(2)}, ${max.y.toFixed(2)}, ${max.z.toFixed(2)})`)
  console.log(`Size: ${(max.x - min.x).toFixed(2)} x ${(max.y - min.y).toFixed(2)} x ${(max.z - min.z).toFixed(2)}`)

  // Generate navmesh
  console.log('Generating NavMesh...')

  const result = threeToTiledNavMesh(meshes, {
    // Settings for large model (545x434x552 units)
    cs: 2.0,
    ch: 1.0,
    tileSize: 128,
    walkableSlopeAngle: 60,
    walkableHeight: 10,
    walkableClimb: 10,
    walkableRadius: 2,
    maxEdgeLen: 100,
    maxSimplificationError: 3.0,
    minRegionArea: 4,
    mergeRegionArea: 20,
    maxVertsPerPoly: 6,
    detailSampleDist: 12,
    detailSampleMaxError: 2,
  })

  if (!result.success) {
    console.error('Failed to generate NavMesh:', result.error)
    process.exit(1)
  }

  const { navMesh } = result

  // Check navmesh stats
  console.log('NavMesh generated successfully!')
  console.log('NavMesh tile count:', navMesh.getMaxTiles())

  // Count actual tiles with data
  let tilesWithData = 0
  for (let i = 0; i < navMesh.getMaxTiles(); i++) {
    const tile = navMesh.getTile(i)
    if (tile && tile.header()) {
      tilesWithData++
    }
  }
  console.log('Tiles with data:', tilesWithData)

  // Test the navmesh
  const navMeshQuery = new NavMeshQuery(navMesh)
  const randomPoint = navMeshQuery.findRandomPoint()
  console.log('Random walkable point:', randomPoint.randomPoint)
  console.log('Find random point success:', randomPoint.success)

  // Export the navmesh
  const navMeshExport = exportNavMesh(navMesh)

  // Determine output path
  let outputPath: string
  if (inputPath.startsWith('http://') || inputPath.startsWith('https://')) {
    const modelName = basename(new URL(inputPath).pathname, '.glb')
    await mkdir('public/models', { recursive: true })
    outputPath = join('public/models', modelName + '.navmesh.bin')
  } else {
    outputPath = join(
      dirname(inputPath),
      basename(inputPath, '.glb') + '.navmesh.bin'
    )
  }

  await writeFile(outputPath, Buffer.from(navMeshExport))
  console.log(`NavMesh saved to: ${outputPath}`)
  console.log(`File size: ${(navMeshExport.byteLength / 1024).toFixed(2)} KB`)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
