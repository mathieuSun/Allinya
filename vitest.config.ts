import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        '**/types/**',
        '**/*.d.ts',
        'dist/',
      ],
    },
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
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