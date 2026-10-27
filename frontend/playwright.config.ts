import { defineConfig, devices } from "@playwright/test";

const apiOnly = process.argv.includes("--project=api-real");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "ui-desktop",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "ui-mobile",
      testDir: "./tests/e2e",
      use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" },
    },
    {
      name: "api-real",
      testDir: "./tests/api",
      use: { trace: "off", screenshot: "off", video: "off" },
    },
  ],
  webServer: apiOnly
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
        env: { VITE_API_BASE_URL: "http://127.0.0.1:4173/api/v1" },
      },
});
