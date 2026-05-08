// src/presentation/content/reader.ts

import { generateReaderCSS } from '@application/ReaderService';
import type { ReaderSettings } from '@application/ReaderService';

import { defuddleExtract } from './defuddleParse';

let savedBodyHTML: string | null = null;
let savedHeadStyles: Element[] = [];

/** Escapes HTML special chars to prevent XSS in title/byline. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Builds the reader-mode HTML shell with title, byline, and article body. */
function buildReaderShell(content: string, title: string, author: string): string {
  const byline = author ? `<p id="wh-reader-byline">${escapeHtml(author)}</p>` : '';
  return (
    `<div id="wh-reader-content">` +
    `<header id="wh-reader-header">` +
    `<h1 id="wh-reader-title">${escapeHtml(title)}</h1>` +
    byline +
    `</header>` +
    `<article id="wh-reader-article">${content}</article>` +
    `</div>`
  );
}

/**
 * Activates reader mode: extracts article content via Defuddle, saves and
 * strips page stylesheets, replaces the body with a clean reader shell, and
 * injects theme-aware CSS with the supplied settings.
 */
export async function activateReader(settings: ReaderSettings): Promise<void> {
  const { content, title, author } = await defuddleExtract(document, location.href);

  savedBodyHTML = document.body.innerHTML;

  savedHeadStyles = Array.from(
    document.head.querySelectorAll('link[rel="stylesheet"], style:not(#wh-reader-style)'),
  );
  for (const el of savedHeadStyles) {
    el.remove();
  }

  document.body.innerHTML = buildReaderShell(content, title, author);

  const styleEl = document.createElement('style');
  styleEl.id = 'wh-reader-style';
  styleEl.textContent = generateReaderCSS(settings);
  document.head.appendChild(styleEl);

  document.documentElement.style.setProperty('--wh-reader-font-size', `${settings.fontSize}px`);
  document.documentElement.style.setProperty('--wh-reader-line-height', `${settings.lineHeight}`);
  document.documentElement.style.setProperty('--wh-reader-max-width', `${settings.maxWidth}em`);

  if (settings.theme === 'light') document.documentElement.classList.add('theme-light');
  else if (settings.theme === 'dark') document.documentElement.classList.add('theme-dark');
  else if (settings.theme === 'sepia') document.documentElement.classList.add('theme-sepia');
}

/**
 * Deactivates reader mode: restores the original body HTML and head
 * stylesheets, removes the injected style tag and CSS custom properties.
 */
export function deactivateReader(): void {
  if (savedBodyHTML === null) return;
  document.body.innerHTML = savedBodyHTML;
  for (const el of savedHeadStyles) {
    document.head.appendChild(el);
  }
  document.getElementById('wh-reader-style')?.remove();
  document.documentElement.style.removeProperty('--wh-reader-font-size');
  document.documentElement.style.removeProperty('--wh-reader-line-height');
  document.documentElement.style.removeProperty('--wh-reader-max-width');
  document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
  savedBodyHTML = null;
  savedHeadStyles = [];
}
