import { defineConfig, devices } from '@playwright/test';

/**
 * Testes E2E do República.
 * Por padrão usa o Chromium do Playwright (`npx playwright install chromium`).
 * Para usar um navegador já instalado: PW_CHANNEL=chrome (ou msedge) npm run test:e2e
 */
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1600, height: 960 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(channel ? { channel } : {}),
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 960 },
        ...(channel ? { channel } : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run dev:web',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
