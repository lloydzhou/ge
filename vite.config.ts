import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Examples are embedded HTML pages that directly import ge-core source via `@ge` alias.
// Each example is a standalone HTML under /examples, opened through the Vite dev server.
export default defineConfig({
  root: '.',
  plugins: [react()],
  resolve: {
    alias: {
      '@ge': fileURLToPath(new URL('./packages/ge-core/src/index.ts', import.meta.url)),
      '@ge-react': fileURLToPath(new URL('./packages/ge-react/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: '/examples/01-basic.html',
  },
});
