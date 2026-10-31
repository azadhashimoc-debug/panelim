import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser-connected",
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3001", trace: "retain-on-failure" },
  projects: [
    {
      name: "connected-mobile",
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npm.cmd run dev -- --port 3001",
    url: "http://127.0.0.1:3001/isci",
    timeout: 120000,
    env: {
      PANELIM_BUILD_DIR: ".next-connected",
      APP_URL: "http://127.0.0.1:3001",
      NEXT_PUBLIC_SUPABASE_URL: "https://fixture-only.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-publishable-key-not-real",
      SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key-not-real",
      QR_SIGNING_SECRET: "fixture-signing-secret-at-least-32-characters",
    },
  },
});
