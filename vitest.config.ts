import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

// Use headless mode in CI or when explicitly requested
const useHeadless = process.env.CI === 'true' || process.env.VITEST_BROWSER_HEADLESS === 'true'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: ['..']
    }
  },
  test: {
    include: ['src/**/*.browser.test.{ts,tsx}'],
    setupFiles: ['./src/test-utils/vitest.setup.ts'],
    browser: {
      enabled: true,
      provider: playwright({
        headless: useHeadless,
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-gl=swiftshader',
            '--disable-web-security',
          ]
        }
      }),
      instances: [
        {
          browser: 'chromium',
          viewport: { width: 1024, height: 768 }
        },
      ],
    },
  },
})
