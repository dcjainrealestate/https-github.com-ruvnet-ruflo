// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:8934',
    trace: 'retain-on-failure',
    // Only set when PW_EXECUTABLE_PATH is provided (e.g. to reuse a
    // preinstalled browser in a sandboxed dev environment) — left unset in
    // CI, where `npx playwright install --with-deps chromium` provides its
    // own matching browser.
    launchOptions: process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {},
  },
  webServer: {
    command: 'node tests/serve.js',
    url: 'http://localhost:8934/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
