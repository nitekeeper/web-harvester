import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { resolveBuildStamp } from './scripts/buildStamp';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const buildStamp = resolveBuildStamp();

export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD': JSON.stringify(buildStamp),
  },
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
      'tests/integration/**/*.test.tsx',
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**'],
      exclude: ['*.config.ts', 'tests/**', 'audits/**', 'docs/**'],
      thresholds: {
        'src/domain/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/application/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@application': path.resolve(__dirname, 'src/application'),
      '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@presentation': path.resolve(__dirname, 'src/presentation'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@plugins': path.resolve(__dirname, 'src/plugins'),
    },
  },
});
