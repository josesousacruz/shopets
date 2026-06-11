import { defineConfig, devices } from "@playwright/test";

/**
 * E2E do storefront (Remix) — Sprint 6 Fase C.
 *
 * Pressupostos:
 *  - Storefront rodando em http://localhost:3000  (npm run dev)
 *  - API Laravel  rodando em http://127.0.0.1:8888 (php artisan serve --port=8888)
 *  - Driver de pagamento `fake` ativo → aprovação via botão dev "Já fiz o pagamento (simular)".
 *
 * Os servidores NÃO são iniciados automaticamente (webServer comentado de
 * propósito): eles já estão de pé no ambiente de desenvolvimento. Para CI,
 * descomente o bloco `webServer` abaixo.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    locale: "pt-BR",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Para CI: descomente para subir os servidores automaticamente.
  // webServer: [
  //   {
  //     command: "npm run dev",
  //     url: "http://localhost:3000",
  //     reuseExistingServer: true,
  //     timeout: 120_000,
  //   },
  // ],
});
