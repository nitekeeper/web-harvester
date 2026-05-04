// src/presentation/popup/index.tsx

import 'reflect-metadata';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@presentation/styles/global.css';
import { bootstrapTheme } from '@presentation/theme/bootstrapTheme';

import { Popup } from './Popup';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

bootstrapTheme()
  .catch(() => {})
  .then(() => {
    createRoot(rootEl).render(
      <StrictMode>
        <Popup />
      </StrictMode>,
    );
  })
  .catch(() => {});
