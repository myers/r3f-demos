import { useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import type { Object3D } from 'three'

// DRACO compressed model URL from Three.js examples
const MODEL_URL = 'https://threejs.org/examples/models/gltf/LittlestTokyo.glb'

export function LittlestTokyo() {
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions } = useAnimations(animations, scene as unknown as Object3D)

  useEffect(() => {
    // Play the first animation clip
    if (animations.length > 0) {
      const firstAction = actions[animations[0].name]
      firstAction?.play()
    }
  }, [actions, animations])

  return (
    <primitive object={scene} position={[1, 1, 0]} scale={0.01} />
  )
}

// Preload the model
useGLTF.preload(MODEL_URL)
