import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import webExtension from 'vite-plugin-web-extension';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const buildStamp = (() => {
  if (process.env.VITE_BUILD) return process.env.VITE_BUILD;
  try {
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    return `${date}-${hash}`;
  } catch {
    return 'dev';
  }
})();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const browser = env['VITE_BROWSER'] ?? 'chrome';

  return {
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      'import.meta.env.VITE_BUILD': JSON.stringify(buildStamp),
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
