import type { Highlight } from '@application/HighlightService';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { useHighlightsStore } from '@presentation/stores/useHighlightsStore';

const COLOR_DOT_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-300',
  green: 'bg-green-400',
  blue: 'bg-blue-400',
  pink: 'bg-pink-400',
  purple: 'bg-purple-400',
};

/** Returns a Tailwind background class for the given highlight color name. */
function colorDotClass(color: string): string {
  if (Object.prototype.hasOwnProperty.call(COLOR_DOT_CLASSES, color)) {
    // eslint-disable-next-line security/detect-object-injection
    return COLOR_DOT_CLASSES[color] as string;
  }
  return 'bg-yellow-300';
}

/** A single highlight card in the list. */
function HighlightCard({ highlight }: { readonly highlight: Highlight }) {
  return (
    <div
      data-testid="highlight-card"
      className="flex items-start gap-2 p-2.5 rounded-md border border-border bg-card"
    >
      <span
        aria-hidden="true"
        className={`mt-1 shrink-0 w-2.5 h-2.5 rounded-full ${colorDotClass(highlight.color)}`}
      />
      <p className="text-[12.5px] text-foreground leading-snug line-clamp-3">{highlight.text}</p>
    </div>
  );
}

/** Empty-state notice shown when no highlights exist for the current page. */
function EmptyHighlights() {
  const fmt = useFormatMessage();
  return (
    <p data-testid="highlights-empty" className="p-4 text-sm text-muted-foreground italic">
      {fmt({
        id: 'sidepanel.highlights.empty',
        defaultMessage: 'No highlights yet. Use the highlight tool to capture text from the page.',
      })}
    </p>
  );
}

/**
 * Content for the Highlights tab in the side panel. Reads from
 * {@link useHighlightsStore} — the composition root populates the store from
 * `highlights:{url}` in chrome.storage after the panel opens. Renders a
 * loading notice, an empty-state message, or a card list accordingly.
 */
export function HighlightsTab() {
  const highlights = useHighlightsStore((s) => s.highlights);
  const isLoading = useHighlightsStore((s) => s.isLoading);
  const fmt = useFormatMessage();

  if (isLoading) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {fmt({ id: 'sidepanel.highlights.loading', defaultMessage: 'Loading…' })}
      </p>
    );
  }

  if (highlights.length === 0) {
    return <EmptyHighlights />;
  }

  return (
    <div data-testid="highlights-list" className="flex flex-col gap-2 p-3">
      {highlights.map((h) => (
        <HighlightCard key={h.id} highlight={h} />
      ))}
    </div>
  );
}
