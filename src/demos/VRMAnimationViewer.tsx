import { Suspense, useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useControls, button, folder } from 'leva'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm'
import { createVRMAnimationClip, VRMAnimationLoaderPlugin, VRMAnimation } from '@pixiv/three-vrm-animation'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

// Base path for assets (handles GitHub Pages deployment)
const BASE_URL = import.meta.env.BASE_URL || '/'

// Available VRM models
const VRM_MODELS: Record<string, string> = {
  'VRM Sample': 'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
  'Sendagaya Shino': 'https://opengameart.org/sites/default/files/sendagaya_shino.vrm',
}

// Available animations (.vrma files from three-vrm examples)
const ANIMATIONS: Record<string, string> = {
  'Idle Loop': 'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@dev/packages/three-vrm-animation/examples/animations/idle_loop.vrma',
  'VRMA Sample': 'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@dev/packages/three-vrm-animation/examples/animations/VRMA_01.vrma',
}

// Custom hook to load VRM with the plugin
function useVRM(url: string): VRM | null {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser))
  })
  return gltf.userData.vrm as VRM
}

// Custom hook to load VRM animation
function useVRMAnimation(url: string): VRMAnimation | null {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser))
  })
  return gltf.userData.vrmAnimations?.[0] ?? null
}

interface VRMModelProps {
  vrmUrl: string
  animationUrl: string
  playbackSpeed: number
  paused: boolean
}

function VRMModel({ vrmUrl, animationUrl, playbackSpeed, paused }: VRMModelProps) {
  const vrm = useVRM(vrmUrl)
  const vrmAnimation = useVRMAnimation(animationUrl)

  const groupRef = useRef<THREE.Group>(null)
  const vrmRef = useRef<VRM | null>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const currentActionRef = useRef<THREE.AnimationAction | null>(null)

  // Clone the VRM model
  const clonedScene = useMemo(() => {
    if (!vrm?.scene) return null

    const cloned = SkeletonUtils.clone(vrm.scene)
    VRMUtils.removeUnnecessaryVertices(cloned)
    VRMUtils.combineSkeletons(cloned)

    if (vrm) {
      VRMUtils.rotateVRM0(vrm)
    }

    cloned.traverse((obj) => {
      obj.frustumCulled = false
    })

    return cloned
  }, [vrm])

  // Store VRM reference
  useEffect(() => {
    if (vrm) {
      vrmRef.current = vrm
      VRMUtils.combineMorphs(vrm)
    }

    return () => {
      if (vrmRef.current?.scene) {
        VRMUtils.deepDispose(vrmRef.current.scene)
      }
      vrmRef.current = null
    }
  }, [vrm])

  // Setup animation mixer and apply animation
  useEffect(() => {
    if (!vrm || !vrmAnimation) return

    // Create mixer attached to VRM scene
    const mixer = new THREE.AnimationMixer(vrm.scene)
    mixerRef.current = mixer

    // Create animation clip from VRM animation
    const clip = createVRMAnimationClip(vrmAnimation, vrm)
    const action = mixer.clipAction(clip)
    action.play()
    currentActionRef.current = action

    return () => {
      mixer.stopAllAction()
      mixerRef.current = null
      currentActionRef.current = null
    }
  }, [vrm, vrmAnimation])

  // Handle pause state
  useEffect(() => {
    if (currentActionRef.current) {
      currentActionRef.current.paused = paused
    }
  }, [paused])

  // Blink animation state
  const blinkState = useRef({
    nextBlinkTime: Math.random() * 3,
    isBlinking: false,
    blinkProgress: 0,
  })

  // Update loop
  useFrame((_, delta) => {
    if (!vrmRef.current) return

    // Update VRM (spring bones, etc.)
    vrmRef.current.update(delta)

    // Update animation mixer
    if (mixerRef.current && !paused) {
      mixerRef.current.update(delta * playbackSpeed)
    }

    // Automatic blink animation
    const blink = blinkState.current
    blink.nextBlinkTime -= delta

    if (blink.nextBlinkTime <= 0 && !blink.isBlinking) {
      blink.isBlinking = true
      blink.blinkProgress = 0
    }

    if (blink.isBlinking) {
      blink.blinkProgress += delta * 10
      const blinkValue = blink.blinkProgress < 0.5
        ? blink.blinkProgress * 2
        : 2 - blink.blinkProgress * 2

      vrmRef.current.expressionManager?.setValue('blink', Math.max(0, blinkValue))

      if (blink.blinkProgress >= 1) {
        blink.isBlinking = false
        blink.nextBlinkTime = 2 + Math.random() * 4
        vrmRef.current.expressionManager?.setValue('blink', 0)
      }
    }
  })

  if (!clonedScene) return null

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  )
}

// Loading fallback component
function LoadingIndicator() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#4a9eff" wireframe />
    </mesh>
  )
}

// Inner scene component that uses Suspense for loading
function VRMScene({ modelUrl, animationUrl, playbackSpeed, paused }: {
  modelUrl: string
  animationUrl: string
  playbackSpeed: number
  paused: boolean
}) {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <VRMModel
        vrmUrl={modelUrl}
        animationUrl={animationUrl}
        playbackSpeed={playbackSpeed}
        paused={paused}
      />
    </Suspense>
  )
}

export function VRMAnimationViewer() {
  // Track current selections to trigger re-render on change
  const [currentModel, setCurrentModel] = useState(Object.values(VRM_MODELS)[0])
  const [currentAnimation, setCurrentAnimation] = useState(Object.values(ANIMATIONS)[0])

  const controls = useControls({
    'Back to Demos': button(() => {
      window.location.href = BASE_URL
    }),
    Model: folder({
      model: {
        value: Object.keys(VRM_MODELS)[0],
        options: Object.keys(VRM_MODELS),
        label: 'VRM Model',
        onChange: (value: string) => {
          setCurrentModel(VRM_MODELS[value])
        },
      },
    }),
    Animation: folder({
      animation: {
        value: Object.keys(ANIMATIONS)[0],
        options: Object.keys(ANIMATIONS),
        label: 'Animation',
        onChange: (value: string) => {
          setCurrentAnimation(ANIMATIONS[value])
        },
      },
      playbackSpeed: {
        value: 1,
        min: 0.1,
        max: 2,
        step: 0.1,
        label: 'Speed'
      },
      paused: {
        value: false,
        label: 'Paused',
      },
    }),
  })

  return (
    <Canvas
      camera={{ position: [0, 1.5, 3], fov: 50 }}
      gl={{ antialias: true }}
      style={{ background: '#1a1a2e' }}
    >
      {/* Use key to force remount when model or animation changes */}
      <VRMScene
        key={`${currentModel}-${currentAnimation}`}
        modelUrl={currentModel}
        animationUrl={currentAnimation}
        playbackSpeed={controls.playbackSpeed}
        paused={controls.paused}
      />

      {/* Lighting for VRM MToon materials */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />

      {/* Ground grid */}
      <Grid
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#4a4a6a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#6a6a8a"
        fadeDistance={15}
        fadeStrength={1}
        followCamera={false}
        position={[0, 0, 0]}
      />

      <OrbitControls
        target={[0, 1, 0]}
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={10}
      />
    </Canvas>
  )
}
