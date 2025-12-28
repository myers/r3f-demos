import { World } from 'miniplex'
import { createReactAPI } from 'miniplex-react'
import * as THREE from 'three'

/**
 * Entity type for our ECS world
 */
export interface Entity {
  // Core transform - the Three.js group for this entity
  transform?: THREE.Group

  // Pedestrian marker component
  pedestrian?: true

  // Navigation agent component
  navAgent?: {
    speed: number
    path: THREE.Vector3[]
    pathIndex: number
    currentTarget: THREE.Vector3 | null
  }

  // Animation state
  animation?: {
    mixer: THREE.AnimationMixer
    actions: Record<string, THREE.AnimationAction>
    currentAction: string
  }
}

// Create the ECS world
export const world = new World<Entity>()

// Create React bindings
export const ECS = createReactAPI(world)

// Create queries for systems
export const pedestrianQuery = world.with('pedestrian', 'transform', 'navAgent')
