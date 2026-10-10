import { defineConfig } from 'vitest/config';

// The Envio indexer has its own package and test runner; keep the root suite scoped to the app and server.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
