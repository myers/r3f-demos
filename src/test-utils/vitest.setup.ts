/**
 * Vitest setupFiles for browser mode
 * This file runs in the browser context before tests execute
 */

// Silence console warnings in tests
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  // Suppress specific warnings if needed
  const message = args[0]
  if (typeof message === 'string' && message.includes('THREE.')) {
    return
  }
  originalWarn.apply(console, args)
}
