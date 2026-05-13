// src/presentation/content/picker.ts
//
// Visual section picker for the content script. Renders DOM overlays
// (hover + persistent exclude/include) over the host page so the user can
// pick page sections by hovering, clicking, and using `[`/`]` to walk the
// DOM tree. Resolves with the chosen XPaths on Enter, or cancels on Escape.
//
// Self-contained — no imports from `@application/`, `@domain/`, or
// `@infrastructure/`. Safe to bundle into a content script.

const SKIP_TAGS = new Set(['HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE']);
const HOVER_Z = '2147483647';
const PERSIST_Z = '2147483646';
const HOVER_BG = 'rgba(59, 130, 246, 0.15)';
const HOVER_OUTLINE = '2px solid #3b82f6';
const EXCLUDE_BG =
  'repeating-linear-gradient(' +
  '45deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.25) 6px, ' +
  'rgba(239, 68, 68, 0.45) 6px, rgba(239, 68, 68, 0.45) 12px)';
const EXCLUDE_OUTLINE = '2px solid #ef4444';
const INCLUDE_BG = 'rgba(34, 197, 94, 0.2)';
const INCLUDE_OUTLINE = '2px solid #22c55e';

/** Picker mode: which list of XPaths the user is selecting. */
export type PickerMode = 'exclude' | 'include';

/** Result returned to `onDone` once the user confirms with Enter. */
export interface PickerResult {
  readonly excludedXPaths?: string[];
  readonly includedXPaths?: string[];
}

/** Options for `startPicker`. */
export interface PickerOptions {
  readonly mode: PickerMode;
  readonly onDone: (result: PickerResult) => void;
  readonly onCancel: () => void;
}

/**
 * Mounts the visual section picker on the current document. Returns a
 * cleanup function that removes all overlays and event listeners. The
 * cleanup is also invoked automatically before `onDone` or `onCancel` fire.
 */
export function startPicker(options: PickerOptions): () => void {
  const state = createState();
  const hoverOverlay = createHoverOverlay();
  document.body.appendChild(hoverOverlay);

  const handlers = buildHandlers(state, hoverOverlay, options, () => cleanup());
  attachListeners(handlers);

  /** Removes overlays and listeners. Idempotent. */
  function cleanup(): void {
    if (state.disposed) return;
    state.disposed = true;
    detachListeners(handlers);
    hoverOverlay.remove();
    state.persistent.forEach((el) => el.remove());
    state.persistent.clear();
  }

  return cleanup;
}

// ── Internal state ──────────────────────────────────────────────────────────

/** Mutable picker state shared across event handlers. */
interface PickerState {
  hovered: HTMLElement | null;
  readonly persistent: Map<string, HTMLElement>;
  disposed: boolean;
}

/** Creates the mutable picker state. */
function createState(): PickerState {
  return { hovered: null, persistent: new Map(), disposed: false };
}

// ── Overlays ────────────────────────────────────────────────────────────────

/** Creates the single hover overlay element. */
function createHoverOverlay(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-wh-overlay', 'hover');
  applyBaseOverlayStyle(el, HOVER_Z);
  el.style.background = HOVER_BG;
  el.style.outline = HOVER_OUTLINE;
  el.style.display = 'none';
  return el;
}

/** Creates a persistent overlay (exclude or include) for an element. */
function createPersistentOverlay(mode: PickerMode): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-wh-overlay', mode);
  applyBaseOverlayStyle(el, PERSIST_Z);
  if (mode === 'exclude') {
    el.style.background = EXCLUDE_BG;
    el.style.outline = EXCLUDE_OUTLINE;
  } else {
    el.style.background = INCLUDE_BG;
    el.style.outline = INCLUDE_OUTLINE;
  }
  return el;
}

/** Applies the shared positioning/styling for any overlay. */
function applyBaseOverlayStyle(el: HTMLElement, zIndex: string): void {
  const s = el.style;
  s.position = 'fixed';
  s.top = '0';
  s.left = '0';
  s.width = '0';
  s.height = '0';
  s.pointerEvents = 'none';
  s.zIndex = zIndex;
  s.boxSizing = 'border-box';
}

/** Positions an overlay over the bounding rect of `target`. */
function positionOverlay(overlay: HTMLElement, target: Element): void {
  const rect = target.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

// ── XPath resolution ────────────────────────────────────────────────────────

/** Returns true when `tag` is one we never select on. */
function isSkipTag(tag: string): boolean {
  return SKIP_TAGS.has(tag.toUpperCase());
}

/** Resolves the picker target by walking up past skip tags. */
function resolveTarget(el: Element | null): HTMLElement | null {
  let cur: Element | null = el;
  while (cur && isSkipTag(cur.tagName)) {
    cur = cur.parentElement;
  }
  return cur as HTMLElement | null;
}

/**
 * Computes an XPath for the given element. Format: `/html/body/div[2]/p[1]`.
 * The `[n]` index is added only when the element has same-tag siblings.
 */
function computeXPath(el: Element): string {
  const segments: string[] = [];
  let cur: Element | null = el;
  while (cur && cur.nodeType === Node.ELEMENT_NODE) {
    segments.unshift(xpathSegment(cur));
    if (cur.tagName.toUpperCase() === 'HTML') break;
    cur = cur.parentElement;
  }
  return '/' + segments.join('/');
}

/** Builds one path segment, with optional `[n]` index for tag-siblings. */
function xpathSegment(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (!parent) return tag;
  const sameTag = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
  if (sameTag.length <= 1) return tag;
  const idx = sameTag.indexOf(el) + 1;
  return `${tag}[${idx}]`;
}

// ── Event handlers ──────────────────────────────────────────────────────────

/** Bundle of DOM event handlers attached and detached together. */
interface Handlers {
  readonly mousemove: (e: MouseEvent) => void;
  readonly click: (e: MouseEvent) => void;
  readonly keydown: (e: KeyboardEvent) => void;
}

/** Attaches the three event listeners (mousemove + click in capture). */
function attachListeners(h: Handlers): void {
  document.addEventListener('mousemove', h.mousemove, true);
  document.addEventListener('click', h.click, true);
  document.addEventListener('keydown', h.keydown);
}

/** Removes the listeners attached by `attachListeners`. */
function detachListeners(h: Handlers): void {
  document.removeEventListener('mousemove', h.mousemove, true);
  document.removeEventListener('click', h.click, true);
  document.removeEventListener('keydown', h.keydown);
}

/** Builds the handler set bound to `state`, `hoverOverlay`, and options. */
function buildHandlers(
  state: PickerState,
  hoverOverlay: HTMLElement,
  options: PickerOptions,
  cleanup: () => void,
): Handlers {
  return {
    mousemove: (e) => onMouseMove(e, state, hoverOverlay),
    click: (e) => onClick(e, state, options.mode),
    keydown: (e) => onKeyDown(e, state, hoverOverlay, options, cleanup),
  };
}

/** mousemove handler — updates hovered element and repositions overlay. */
function onMouseMove(e: MouseEvent, state: PickerState, hoverOverlay: HTMLElement): void {
  const target = resolveTarget(e.target as Element | null);
  if (!target) return;
  state.hovered = target;
  positionOverlay(hoverOverlay, target);
}

/** click handler — toggles a persistent overlay for the hovered XPath. */
function onClick(e: MouseEvent, state: PickerState, mode: PickerMode): void {
  const target = resolveTarget(e.target as Element | null) ?? state.hovered;
  if (!target) return;
  e.preventDefault();
  e.stopPropagation();
  togglePersistent(state, target, mode);
}

/** Adds or removes the persistent overlay for `target`. */
function togglePersistent(state: PickerState, target: HTMLElement, mode: PickerMode): void {
  const xpath = computeXPath(target);
  const existing = state.persistent.get(xpath);
  if (existing) {
    existing.remove();
    state.persistent.delete(xpath);
    return;
  }
  const overlay = createPersistentOverlay(mode);
  document.body.appendChild(overlay);
  positionOverlay(overlay, target);
  state.persistent.set(xpath, overlay);
}

// ── Keyboard handling ───────────────────────────────────────────────────────

/** keydown dispatcher — Escape, Enter, `[`, `]`. */
function onKeyDown(
  e: KeyboardEvent,
  state: PickerState,
  hoverOverlay: HTMLElement,
  options: PickerOptions,
  cleanup: () => void,
): void {
  if (e.key === 'Escape') {
    cleanup();
    options.onCancel();
    return;
  }
  if (e.key === 'Enter') {
    const result = buildResult(state, options.mode);
    cleanup();
    options.onDone(result);
    return;
  }
  if (e.key === ']') {
    expandToParent(state, hoverOverlay);
    return;
  }
  if (e.key === '[') {
    shrinkToChild(state, hoverOverlay);
  }
}

/** Walks the hover up to its parent (skipping forbidden tags). */
function expandToParent(state: PickerState, hoverOverlay: HTMLElement): void {
  const cur = state.hovered;
  if (!cur) return;
  const parent = cur.parentElement;
  if (!parent || isSkipTag(parent.tagName)) return;
  state.hovered = parent;
  positionOverlay(hoverOverlay, parent);
}

/** Walks the hover down to its first non-skip element child. */
function shrinkToChild(state: PickerState, hoverOverlay: HTMLElement): void {
  const cur = state.hovered;
  if (!cur) return;
  const child = Array.from(cur.children).find(
    (c): c is HTMLElement => c instanceof HTMLElement && !isSkipTag(c.tagName),
  );
  if (!child) return;
  state.hovered = child;
  positionOverlay(hoverOverlay, child);
}

/** Constructs the `PickerResult` for the current persistent set. */
function buildResult(state: PickerState, mode: PickerMode): PickerResult {
  const xpaths = Array.from(state.persistent.keys());
  return mode === 'exclude' ? { excludedXPaths: xpaths } : { includedXPaths: xpaths };
}
