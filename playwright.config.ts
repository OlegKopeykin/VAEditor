import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './test',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },
  webServer: {
    command: 'npm run demo',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ]
})
