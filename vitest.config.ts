import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@ge': fileURLToPath(new URL('./packages/ge-core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: [
      'packages/**/__tests__/**/*.test.ts',
      'packages/**/src/**/*.test.ts',
    ],
    environment: 'node',
    globals: false,
  },
});
