import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Object3D } from 'three'
import { world, type Entity } from '../ecs/world'

// Local model path (handles GitHub Pages base path)
const BASE_URL = import.meta.env.BASE_URL || '/'
const MODEL_URL = `${BASE_URL}models/LittlestTokyo.glb`

// The streetcar collision radius (in model space before scaling)
const STREETCAR_COLLISION_RADIUS = 50

export function LittlestTokyo() {
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions } = useAnimations(animations, scene as unknown as Object3D)
  const streetcarRef = useRef<THREE.Object3D | null>(null)
  const collisionGroupRef = useRef<THREE.Group | null>(null)
  const entityRef = useRef<Entity | null>(null)

  useEffect(() => {
    // Play the first animation clip
    if (animations.length > 0) {
      const firstAction = actions[animations[0].name]
      firstAction?.play()

      // Log animation info for debugging
      console.log('LittlestTokyo animations:', animations.map(a => a.name))
    }

    // Find the streetcar/train in the scene
    // Looking for objects that are animated (have keyframe tracks)
    if (animations.length > 0) {
      const animatedObjects = new Set<string>()
      animations.forEach(clip => {
        clip.tracks.forEach(track => {
          // Track names are like "objectName.property"
          const objectName = track.name.split('.')[0]
          animatedObjects.add(objectName)
        })
      })
      console.log('Animated objects in LittlestTokyo:', [...animatedObjects])

      // Try to find the streetcar - it's typically a larger animated object
      // Common names might be: Train, Tram, Streetcar, or similar
      const streetcarNames = ['Streetcar', 'Train', 'Tram', 'trolley', 'Vehicle']
      for (const name of animatedObjects) {
        const lowerName = name.toLowerCase()
        if (streetcarNames.some(n => lowerName.includes(n.toLowerCase()))) {
          const obj = scene.getObjectByName(name)
          if (obj) {
            console.log('Found streetcar candidate:', name, obj)
            streetcarRef.current = obj
            break
          }
        }
      }

      // If we didn't find by name, look for any object that moves significantly
      if (!streetcarRef.current) {
        // Find the first animated mesh that's not too small
        for (const name of animatedObjects) {
          const obj = scene.getObjectByName(name)
          if (obj) {
            console.log('Checking animated object:', name, obj.type)
            // Use the first significant animated object
            if (obj.type === 'Object3D' || obj.type === 'Group' || obj.type === 'Mesh') {
              streetcarRef.current = obj
              console.log('Using animated object as streetcar:', name)
              break
            }
          }
        }
      }
    }

    // Create a collision group to track the streetcar position
    if (streetcarRef.current && !collisionGroupRef.current) {
      const group = new THREE.Group()
      collisionGroupRef.current = group

      // Register with ECS collision system (static = streetcar pushes pedestrians but isn't pushed)
      const entity: Entity = {
        transform: group,
        collision: {
          radius: STREETCAR_COLLISION_RADIUS,
          separation: new THREE.Vector3(),
          isStatic: true,
        },
      }
      world.add(entity)
      entityRef.current = entity
      console.log('Registered streetcar collision entity (static)')
    }

    return () => {
      if (entityRef.current) {
        world.remove(entityRef.current)
        entityRef.current = null
      }
    }
  }, [actions, animations, scene])

  // Update collision position to match the animated streetcar
  useFrame(() => {
    if (streetcarRef.current && collisionGroupRef.current) {
      // Get the streetcar's position in model space (before the 0.01 scene scale)
      // We need to get the position relative to the scene root, not world position
      const modelPos = new THREE.Vector3()
      streetcarRef.current.getWorldPosition(modelPos)

      // The scene is scaled by 0.01, so world position = model position * 0.01
      // To get model space position, we divide by the scale (or multiply by 100)
      // But since the collision group is also in model space (inside the scaled group),
      // we can use the local position directly
      collisionGroupRef.current.position.set(
        modelPos.x / 0.01,  // Convert back to model space
        modelPos.y / 0.01,
        modelPos.z / 0.01
      )
    }
  })

  return (
    <primitive object={scene} scale={0.01} />
  )
}

// Preload the model
useGLTF.preload(MODEL_URL)
