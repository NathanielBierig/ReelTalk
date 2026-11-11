import { defineConfig } from '@playwright/test'

// Pre-playtest smoke suite. Run from app/: `npm run e2e`
// Starts the real Worker + Durable Objects locally (wrangler dev) with fake reels enabled.
const PORT = 8787

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // wrangler.jsonc's custom build (npm ci + build) runs first, so the server serves a fresh build.
    command: `npx wrangler dev --port ${PORT} --var E2E_FAKE_REELS:1`,
    cwd: '..',
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
