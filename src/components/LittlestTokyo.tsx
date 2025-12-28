import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { Group } from 'three'

// DRACO compressed model URL from Three.js examples
const MODEL_URL = 'https://threejs.org/examples/models/gltf/LittlestTokyo.glb'

export function LittlestTokyo() {
  const group = useRef<Group>(null)
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    // Play the first animation clip
    if (animations.length > 0) {
      const firstAction = actions[animations[0].name]
      firstAction?.play()
    }
  }, [actions, animations])

  return (
    <group ref={group} position={[1, 1, 0]} scale={0.01}>
      <primitive object={scene} />
    </group>
  )
}

// Preload the model
useGLTF.preload(MODEL_URL)
