import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@typescript-template/common': resolve(__dirname, 'packages/common/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', '.trunk', 'packages/*/src/**/*.integration.test.ts'],
  },
});
