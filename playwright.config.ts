import { defineConfig, devices } from '@playwright/test';

// vite.config.ts ile aynı port; orada strictPort:true olduğu için başka bir
// projenin sunucusuna bağlanma ihtimali yok.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5180';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
