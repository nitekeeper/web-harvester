// Re-exports from @shared/highlighter for backwards compatibility.
// New code should import from @shared/highlighter directly.

export {
  type HighlightData,
  type TextHighlightData,
  type ElementHighlightData,
  type AnyHighlightData,
  type StoredData,
  type HighlightsStorage,
  type ExportedHighlight,
  BLOCK_HIGHLIGHT_TAGS,
  EPHEMERAL_PARAMS,
  normalizeUrl,
  groupHighlights,
  collapseGroupsForExport,
} from '@shared/highlighter';
