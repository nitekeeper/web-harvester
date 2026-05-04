// src/presentation/lib/mountApp.ts
//
// Shared SPA entry-point helper. Handles the common bootstrap sequence so
// each page entry file (popup, settings, side-panel) stays to a single line.

import { StrictMode, createElement, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

import { bootstrapTheme } from '@presentation/theme/bootstrapTheme';

/**
 * Mounts `Component` into the `#root` DOM element inside a React StrictMode
 * tree. Bootstraps the theme before rendering; swallows bootstrap errors so a
 * storage failure never blocks the page from loading.
 *
 * @throws {Error} When `#root` is absent from the document.
 */
export function mountApp(Component: ComponentType): void {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element not found');

  bootstrapTheme()
    .catch(() => {})
    .then(() => {
      createRoot(rootEl).render(createElement(StrictMode, null, createElement(Component)));
    })
    .catch(() => {});
}
