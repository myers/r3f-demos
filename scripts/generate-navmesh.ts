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

import { readFile, writeFile } from 'fs/promises'
import { dirname, basename, join } from 'path'
import { init, NavMeshQuery } from 'recast-navigation'
import { generateSoloNavMesh, exportNavMesh } from '@recast-navigation/generators'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import {
  Mesh,
  BufferGeometry,
  BufferAttribute,
  Scene,
  LoadingManager,
} from 'three'

async function loadGLB(path: string): Promise<GLTF> {
  const buffer = await readFile(path)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  )

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader(new LoadingManager())
    loader.parse(
      arrayBuffer,
      '',
      (gltf) => resolve(gltf),
      (error) => reject(error)
    )
  })
}

function extractMeshes(scene: Scene): Mesh[] {
  const meshes: Mesh[] = []

  scene.traverse((object) => {
    if (object instanceof Mesh) {
      // Clone and apply world transform
      const mesh = object.clone()
      mesh.updateMatrixWorld(true)

      // Ensure geometry is BufferGeometry
      if (mesh.geometry instanceof BufferGeometry) {
        // Apply the world matrix to the geometry
        const geometry = mesh.geometry.clone()
        geometry.applyMatrix4(mesh.matrixWorld)
        mesh.geometry = geometry

        // Reset mesh transform since it's baked into geometry
        mesh.position.set(0, 0, 0)
        mesh.rotation.set(0, 0, 0)
        mesh.scale.set(1, 1, 1)
        mesh.updateMatrix()

        meshes.push(mesh)
      }
    }
  })

  return meshes
}

function mergeGeometries(meshes: Mesh[]): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  let indexOffset = 0

  for (const mesh of meshes) {
    const geometry = mesh.geometry as BufferGeometry
    const posAttr = geometry.getAttribute('position')

    if (!posAttr) continue

    // Add positions
    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
    }

    // Add indices
    const index = geometry.getIndex()
    if (index) {
      for (let i = 0; i < index.count; i++) {
        indices.push(index.getX(i) + indexOffset)
      }
    } else {
      // Non-indexed geometry - create indices
      for (let i = 0; i < posAttr.count; i++) {
        indices.push(i + indexOffset)
      }
    }

    indexOffset += posAttr.count
  }

  const merged = new BufferGeometry()
  merged.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  merged.setIndex(new BufferAttribute(new Uint32Array(indices), 1))

  return merged
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

  // Load the GLB
  const gltf = await loadGLB(inputPath)
  console.log('GLB loaded successfully')

  // Extract meshes
  const meshes = extractMeshes(gltf.scene)
  console.log(`Found ${meshes.length} meshes`)

  if (meshes.length === 0) {
    console.error('No meshes found in the model')
    process.exit(1)
  }

  // Merge into single geometry
  const mergedGeometry = mergeGeometries(meshes)
  console.log(
    `Merged geometry: ${mergedGeometry.getAttribute('position').count} vertices, ${mergedGeometry.getIndex()!.count / 3} triangles`
  )

  // Create a mesh for navmesh generation
  const navMeshInputMesh = new Mesh(mergedGeometry)

  // Generate navmesh with settings tuned for the Tokyo scene
  // The model is scaled at 0.01 in the scene, so we adjust accordingly
  console.log('Generating NavMesh...')

  const result = generateSoloNavMesh([navMeshInputMesh], {
    // Cell size - smaller = more detailed but slower
    cs: 0.05,
    // Cell height
    ch: 0.1,
    // Walkable slope in degrees
    walkableSlopeAngle: 45,
    // Minimum floor to ceiling height for areas to be walkable
    walkableHeight: 2.0,
    // Maximum step height for climbing
    walkableClimb: 0.5,
    // Minimum width for walkable areas (in cells)
    walkableRadius: 0.5,
    // Max edge length
    maxEdgeLen: 12,
    // Max edge error
    maxSimplificationError: 1.3,
    // Min region area (cells)
    minRegionArea: 8,
    // Merge region area
    mergeRegionArea: 20,
    // Max verts per polygon
    maxVertsPerPoly: 6,
    // Detail sample distance
    detailSampleDist: 6,
    // Detail sample max error
    detailSampleMaxError: 1,
  })

  if (!result.success) {
    console.error('Failed to generate NavMesh:', result.error)
    process.exit(1)
  }

  const { navMesh } = result

  // Test the navmesh
  const navMeshQuery = new NavMeshQuery(navMesh)
  const randomPoint = navMeshQuery.findRandomPoint()
  console.log('NavMesh generated successfully!')
  console.log('Random walkable point:', randomPoint.point)

  // Export the navmesh
  const navMeshExport = exportNavMesh(navMesh)

  // Write to file
  const outputPath = join(
    dirname(inputPath),
    basename(inputPath, '.glb') + '.navmesh.bin'
  )
  await writeFile(outputPath, Buffer.from(navMeshExport))
  console.log(`NavMesh saved to: ${outputPath}`)
  console.log(`File size: ${(navMeshExport.byteLength / 1024).toFixed(2)} KB`)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
