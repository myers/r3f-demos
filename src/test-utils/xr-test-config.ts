/**
 * Configuration for XR tests to use local assets instead of CDN
 */

// Path to locally installed WebXR Input Profiles assets
export const LOCAL_XR_ASSET_PATH =
  typeof window !== 'undefined'
    ? `${window.location.origin}/node_modules/@webxr-input-profiles/assets/dist/profiles/`
    : '/node_modules/@webxr-input-profiles/assets/dist/profiles/'
