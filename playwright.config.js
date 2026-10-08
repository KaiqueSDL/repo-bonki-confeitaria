import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: 'browser.spec.js',
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 1366, height: 900 },
    launchOptions: process.env.CHROMIUM_PATH
      ? {
          executablePath: process.env.CHROMIUM_PATH,
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote'],
        }
      : undefined,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
