// src/presentation/side-panel/side-panel.ts
//
// Side-panel SPA entry point. Mounts the {@link SidePanel} component into
// the root element. Composition root wiring (stores, services) lives in a
// later task; this entry is intentionally minimal so the bundle stays
// trivially inspectable. Uses `createElement` rather than JSX so the file
// can keep its `.ts` extension (referenced verbatim from
// `manifest.chrome.json`).

import 'reflect-metadata';

import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import '@presentation/styles/global.css';
import { bootstrapTheme } from '@presentation/theme/bootstrapTheme';

import { SidePanel } from './SidePanel';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

bootstrapTheme()
  .catch(() => {})
  .then(() => {
    createRoot(rootEl).render(createElement(StrictMode, null, createElement(SidePanel)));
  })
  .catch(() => {});
