// src/presentation/popup/components/MarkdownPreview.tsx

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

/** Props for {@link MarkdownPreview}. */
export interface MarkdownPreviewProps {
  /** Pre-rendered markdown to display. Empty string shows a placeholder. */
  readonly markdown: string;
  /** When true and markdown is empty, shows a loading indicator instead of the placeholder. */
  readonly isPreviewing?: boolean;
}

/**
 * Renders a read-only preview of the clip markdown. Falls back to a muted
 * placeholder when the preview is empty so the layout does not collapse.
 * Shows a pulsing loading indicator when a preview round-trip is in flight.
 */
export function MarkdownPreview({ markdown, isPreviewing = false }: MarkdownPreviewProps) {
  const fmt = useFormatMessage();

  if (!markdown) {
    if (isPreviewing) {
      return (
        <p
          data-testid="markdown-preview"
          className="text-xs text-muted-foreground italic animate-pulse"
        >
          {fmt({ id: 'popup.previewLoading', defaultMessage: 'Loading preview…' })}
        </p>
      );
    }
    return (
      <p data-testid="markdown-preview" className="text-xs text-muted-foreground italic">
        {fmt({ id: 'popup.previewEmpty', defaultMessage: 'Preview will appear here' })}
      </p>
    );
  }

  return (
    <pre
      data-testid="markdown-preview"
      className="preview-scroll text-xs bg-muted p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap break-words"
    >
      {markdown}
    </pre>
  );
}
