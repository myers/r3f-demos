import { expect } from 'vitest'
import { createXRStore, type XRStore } from '@react-three/xr'
import type { Scene } from 'three'
import { LOCAL_XR_ASSET_PATH } from './xr-test-config'

export interface EnterVRSessionOptions {
  container: HTMLElement
  timeout?: number
}

/**
 * Helper function to enter VR session via Enter VR button for Vitest browser tests.
 */
export async function enterVRSession(
  options: EnterVRSessionOptions
): Promise<{ scene: Scene; store: XRStore }> {
  const { container, timeout = 10000 } = options

  const actualCanvas = container.querySelector('canvas')
  if (!actualCanvas) {
    throw new Error('enterVRSession: <canvas> element not found in container')
  }

  // Wait for store and scene to be available
  await expect.poll(() => (actualCanvas as any).__xrStore, { timeout }).toBeDefined()
  await expect.poll(() => (actualCanvas as any).__scene, { timeout }).toBeDefined()

  const store = (actualCanvas as any).__xrStore as XRStore
  const scene = (actualCanvas as any).__scene as Scene

  // Find Enter VR button
  const enterVRButton = container.querySelector('button')
  if (!enterVRButton) {
    throw new Error('enterVRSession: Enter VR button not found')
  }

  // Wait for button to be enabled (iwer initialization)
  await expect.poll(() => !(enterVRButton as HTMLButtonElement).disabled, { timeout }).toBe(true)

  // Click the button
  enterVRButton.click()

  // Wait for session to be ready
  await expect.poll(() => store.getState().session, { timeout }).toBeDefined()

  return { scene, store }
}

/**
 * Creates an XR store and waits for iwer to be ready.
 */
export async function createTestXRStore(): Promise<XRStore> {
  const store = createXRStore({
    baseAssetPath: LOCAL_XR_ASSET_PATH,
    emulate: {
      type: 'metaQuest3',
      inject: true,
      primaryInputMode: 'controller',
    },
    controller: {
      teleportPointer: true,
    },
    hand: {
      teleportPointer: true,
    },
    offerSession: false,
  })

  // Poll until iwer is ready
  while (true) {
    const supported = await navigator.xr?.isSessionSupported('immersive-vr')
    if (supported) break
    await new Promise(r => setTimeout(r, 50))
  }

  return store
}

/**
 * Wait for a number of animation frames
 */
export async function waitFrames(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  }
}
