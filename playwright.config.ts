import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results/preview",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3002", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        defaultBrowserType: "chromium",
        channel: "chrome",
      },
    },
  ],
  webServer: {
    command: "npm.cmd run dev -- --port 3002",
    url: "http://127.0.0.1:3002/",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      PANELIM_BUILD_DIR: ".next-preview",
      APP_URL: "http://127.0.0.1:3002",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      QR_SIGNING_SECRET: "",
      NODE_OPTIONS: "--max-old-space-size=4096",
    },
  },
});
