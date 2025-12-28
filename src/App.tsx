import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import { LittlestTokyo } from './components/LittlestTokyo'

function App() {
  return (
    <Canvas
      camera={{ position: [5, 2, 8], fov: 40 }}
      gl={{ antialias: true }}
      style={{ background: '#bfe3dd' }}
    >
      <Suspense fallback={null}>
        <LittlestTokyo />
        <Environment preset="city" />
      </Suspense>

      <OrbitControls
        target={[0, 0.5, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
      />

      <Stats />
    </Canvas>
  )
}

export default App
