// src/presentation/settings/settings.ts
//
// Settings SPA entry point. Mounts the {@link Settings} component into the
// root element. Composition root wiring (stores, services) lives in a later
// task; this entry is intentionally minimal so the bundle stays trivially
// inspectable. Uses `createElement` rather than JSX so the file can keep its
// `.ts` extension (referenced verbatim from `manifest.chrome.json`).

import 'reflect-metadata';

import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import '@presentation/styles/global.css';
import { bootstrapTheme } from '@presentation/theme/bootstrapTheme';

import { Settings } from './Settings';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

bootstrapTheme()
  .catch(() => {})
  .then(() => {
    createRoot(rootEl).render(createElement(StrictMode, null, createElement(Settings)));
  })
  .catch(() => {});
