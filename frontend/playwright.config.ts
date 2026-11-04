import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const apiOnly = process.argv.includes("--project=api-real");
const realtime = process.argv.includes("--project=realtime");
const envFile = fileURLToPath(new URL(".env", import.meta.url));
if ((apiOnly || realtime) && existsSync(envFile)) loadEnvFile(envFile);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: realtime
      ? process.env.SNSQB_REALTIME_E2E_ORIGIN || "http://127.0.0.1:4173"
      : "http://127.0.0.1:4173",
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
    {
      name: "realtime",
      testDir: "./tests/realtime",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer:
    apiOnly || realtime
      ? undefined
      : {
          command:
            "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort",
          url: "http://127.0.0.1:4173",
          reuseExistingServer: false,
          env: {
            VITE_API_BASE_URL: realtime
              ? process.env.SNSQB_TEST_API_BASE_URL ||
                "https://snsqb.duckdns.org/api/v1"
              : "http://127.0.0.1:4173/api/v1",
          },
        },
});
