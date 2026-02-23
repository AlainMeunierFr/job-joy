import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig, cucumberReporter } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: process.env.BDD_FEATURE
    ? `tests/bdd/${process.env.BDD_FEATURE}.feature`
    : 'tests/bdd/**/*.feature',
  steps: 'tests/bdd/**/*.steps.ts',
});

export default defineConfig({
  testDir,
  webServer: {
    command: 'node dist/scripts/run-bdd-server.js',
    url: 'http://127.0.0.1:3011',
    reuseExistingServer: true,
    cwd: process.cwd(),
    timeout: 15000,
  },
  reporter: [
    cucumberReporter('html', {
      outputFile: 'cucumber-report/index.html',
      externalAttachments: true,
    }),
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3011',
    screenshot: 'on',
    trace: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
