import { defineConfig } from '@playwright/test';

/** End-to-end runs of presenter scenarios 1, 3 and 4 against the built app, at phone and laptop widths. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // Each test gets a fresh browser profile, so it starts on the welcome screen with nothing saved.
    serviceWorkers: 'block',
    timezoneId: 'Asia/Dhaka',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, hasTouch: true } },
    { name: 'laptop', use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
