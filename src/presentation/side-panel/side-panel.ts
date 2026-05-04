// src/presentation/side-panel/side-panel.ts
//
// Side-panel SPA entry point. Mounts the {@link SidePanel} component into
// the root element. Composition root wiring (stores, services) lives in a
// later task; this entry is intentionally minimal so the bundle stays
// trivially inspectable. Uses `createElement` rather than JSX so the file
// can keep its `.ts` extension (referenced verbatim from
// `manifest.chrome.json`).

import 'reflect-metadata';

import '@presentation/styles/global.css';
import { mountApp } from '@presentation/lib/mountApp';

import { SidePanel } from './SidePanel';

mountApp(SidePanel);
