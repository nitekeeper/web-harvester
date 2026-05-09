import { useEffect, useRef, useState } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

import { FIXTURE_PAGE } from './noteNamePreview';

/** Props for {@link LivePreview}. */
export interface LivePreviewProps {
  /** Whether the preview panel is visible. */
  readonly open: boolean;
  /** Current body template content. */
  readonly bodyTemplate: string;
}

const DEBOUNCE_MS = 250;

const PREVIEW_LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--wh-subtle)',
  marginBottom: 10,
};

const PREVIEW_BODY_STYLE: React.CSSProperties = {
  fontFamily: 'var(--wh-serif)',
  fontSize: 13.5,
  lineHeight: 1.6,
  color: 'var(--wh-text)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const PREVIEW_CONTAINER_STYLE: React.CSSProperties = {
  background: 'var(--wh-panel)',
  border: '1px solid var(--wh-border)',
  borderRadius: 6,
  padding: 14,
};

/**
 * Renders the body template against the fixture page to give a rough live
 * preview. Substitution is intentionally simple (regex replace) — it does not
 * implement the full template engine, only enough for visual feedback.
 */
function renderPreview(template: string): string {
  const nowLabel = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return template
    .replace(/\{\{\s*page\.title\s*\}\}/g, FIXTURE_PAGE.title)
    .replace(/\{\{\s*page\.url\s*\}\}/g, FIXTURE_PAGE.url)
    .replace(/\{\{\s*page\.domain\s*\}\}/g, FIXTURE_PAGE.domain)
    .replace(/\{\{\s*now\s*\|[^{}]+\}\}/g, nowLabel)
    .replace(/\{\{[^{}]*\}\}/g, '[…]')
    .replace(/\{%[^%]*%\}/g, '');
}

/**
 * Collapsible live preview panel rendered inline below the body editor.
 * Re-renders on a 250ms debounce after body template edits. Uses Charter
 * serif for the preview body per the design spec.
 */
export function LivePreview({ open, bodyTemplate }: LivePreviewProps) {
  const fmt = useFormatMessage();
  const [preview, setPreview] = useState(() => renderPreview(bodyTemplate));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPreview(renderPreview(bodyTemplate)), DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [bodyTemplate]);

  if (!open) return null;

  return (
    <div data-testid="live-preview" style={PREVIEW_CONTAINER_STYLE}>
      <div style={PREVIEW_LABEL_STYLE}>
        {fmt({ id: 'settings.templates.previewTitle', defaultMessage: 'Preview — fixture page' })}
      </div>
      <div style={PREVIEW_BODY_STYLE}>{preview}</div>
    </div>
  );
}
