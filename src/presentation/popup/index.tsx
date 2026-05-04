// src/presentation/popup/index.tsx

import 'reflect-metadata';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@presentation/styles/global.css';

import { Popup } from './Popup';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
