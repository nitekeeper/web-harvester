import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import webExtension from 'vite-plugin-web-extension';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const browser = env['VITE_BROWSER'] ?? 'chrome';

  return {
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    plugins: [
      tailwindcss(),
      webExtension({
        manifest: `src/manifest.${browser}.json`,
        browser,
        // Ensure UMD packages (e.g. defuddle) are correctly transformed to ESM
        // when building background service workers and content scripts.
        // vite-plugin-web-extension builds each entry point in a separate Vite
        // pipeline that does not inherit the top-level build.commonjsOptions,
        // so we must supply CJS transform settings here explicitly.
        scriptViteConfig: {
          build: {
            commonjsOptions: {
              transformMixedEsModules: true,
              requireReturnsDefault: 'auto',
            },
          },
        },
      }),
    ],
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
  };
});
