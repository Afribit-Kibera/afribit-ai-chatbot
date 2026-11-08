import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 8000 },
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "../../internal/frontend/playwright-report",
        open: "never",
      },
    ],
  ],
  outputDir: "../../internal/frontend/test-results",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 1024 }, colorScheme: "dark" },
    },
  ],
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
