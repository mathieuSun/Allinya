import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM - compatible with all Node versions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Use node environment for simple tests
    include: ['tests/smoke.test.ts'], // Only run smoke tests in CI
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        '**/types/**',
        '**/*.d.ts',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@lib': path.resolve(__dirname, './client/src/lib'),
      '@components': path.resolve(__dirname, './client/src/components'),
      '@assets': path.resolve(__dirname, './attached_assets'),
    },
  },
});