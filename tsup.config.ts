import { defineConfig } from 'tsup';
import { glob } from 'glob';
import path from 'path';

// Get all TypeScript files in the api directory
const entryPoints = glob.sync('api/**/*.ts', {
  ignore: [
    'api/**/*.test.ts',
    'api/**/*.spec.ts',
    'api/tsconfig.json',
  ],
});

export default defineConfig({
  entry: entryPoints,
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: false,
  outDir: 'api-dist',
  minify: false,
  bundle: false,
  skipNodeModulesBundle: true,
  // Keep the directory structure
  outExtension() {
    return {
      js: '.js',
    };
  },
  // Handle path aliases
  esbuildOptions(options) {
    options.alias = {
      '@shared': path.resolve(process.cwd(), 'shared'),
    };
    // Keep imports external to avoid bundling dependencies
    options.external = [
      '@neondatabase/serverless',
      '@supabase/supabase-js',
      '@vercel/node',
      'express',
      'express-session',
      'passport',
      'passport-local',
      'connect-pg-simple',
      'postgres',
      'drizzle-orm',
      'drizzle-zod',
      'zod',
      'agora-token',
      'memorystore',
      'ws',
      'dotenv',
      'bcrypt',
      'crypto',
      'path',
      'url',
      'fs',
      'util',
      'child_process',
    ];
  },
  onSuccess: 'echo "✅ API build completed successfully!"',
});