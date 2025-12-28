import { useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import type { Object3D } from 'three'

// Local model path (handles GitHub Pages base path)
const BASE_URL = import.meta.env.BASE_URL || '/'
const MODEL_URL = `${BASE_URL}models/LittlestTokyo.glb`

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
    <primitive object={scene} scale={0.01} />
  )
}

// Preload the model
useGLTF.preload(MODEL_URL)
