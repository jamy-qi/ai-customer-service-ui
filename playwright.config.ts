import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // 使用 .e2e.ts，避免 Vitest 将浏览器用例当作单元测试收集。
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 20_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 960 },
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // 本机可直接指定 Chrome；CI 使用 playwright install 安装的 Chromium。
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
  },
  webServer: {
    command: 'npm run dev:mock',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { MOCK_DELAY: '0' },
  },
})
