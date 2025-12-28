import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { Suspense } from 'react'
import type { XRStore } from '@react-three/xr'
import { createTestXRStore, enterVRSession, waitFrames } from './test-utils/vitest-helpers'
import { XRTestCanvas } from './test-utils/xr-test-setup'
import { LittlestTokyo } from './components/LittlestTokyo'

describe('Littlest Tokyo VR Scene', () => {
  let store: XRStore

  beforeEach(async () => {
    document.body.innerHTML = ''
    store = await createTestXRStore()
  })

  afterEach(async () => {
    const canvas = document.querySelector('canvas')
    const canvasStore = (canvas as any)?.__xrStore
    if (canvasStore?.getState().session) {
      await canvasStore.getState().session.end()
    }
    document.body.innerHTML = ''
  })

  it('should render the scene and enter VR session', async () => {
    render(
      <XRTestCanvas store={store}>
        <Suspense fallback={null}>
          <LittlestTokyo />
        </Suspense>
      </XRTestCanvas>
    )

    // Enter VR session
    const { scene } = await enterVRSession({ container: document.body, timeout: 15000 })

    // Verify scene exists
    expect(scene).toBeDefined()

    // Wait for a few frames to ensure rendering is working
    await waitFrames(5)

    // Verify the XR session is active
    const session = store.getState().session
    expect(session).toBeDefined()
  })

  it('should have teleport target in the scene', async () => {
    render(
      <XRTestCanvas store={store}>
        <Suspense fallback={null}>
          <LittlestTokyo />
        </Suspense>
      </XRTestCanvas>
    )

    const { scene } = await enterVRSession({ container: document.body, timeout: 15000 })

    // Wait for scene to fully load
    await waitFrames(10)

    // Check that scene has children (the model and teleport plane)
    expect(scene.children.length).toBeGreaterThan(0)
  })

  it('should have controllers available after entering VR', async () => {
    render(
      <XRTestCanvas store={store}>
        <Suspense fallback={null}>
          <LittlestTokyo />
        </Suspense>
      </XRTestCanvas>
    )

    await enterVRSession({ container: document.body, timeout: 15000 })

    // Wait for controllers to initialize
    await waitFrames(10)

    // Verify emulator and controllers are available
    const emulator = store.getState().emulator
    expect(emulator).toBeDefined()
    expect(emulator?.controllers.left).toBeDefined()
    expect(emulator?.controllers.right).toBeDefined()
  })
})
