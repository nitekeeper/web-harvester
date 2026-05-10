/**
 * Returns a CSS selector path segment for `el` that is as short as possible:
 * - Prefers `#id` if a unique non-empty id is present.
 * - Falls back to `tag.class` if the class uniquely identifies the element within its parent.
 * - Final fallback: `tag:nth-child(n)`.
 */
function segmentFor(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `#${el.id}`;
  const classes = Array.from(el.classList)
    .filter((c) => /^[a-zA-Z][\w-]*$/.test(c))
    .join('.');
  if (classes) {
    const candidate = `${tag}.${classes}`;
    if (el.parentElement && el.parentElement.querySelectorAll(candidate).length === 1) {
      return candidate;
    }
  }
  const parent = el.parentElement;
  if (!parent) return tag;
  const siblings = Array.from(parent.children);
  const index = siblings.indexOf(el) + 1;
  return `${tag}:nth-child(${index})`;
}

/**
 * Generates the shortest CSS selector that uniquely identifies `el` within
 * the document. Walks up the DOM until the selector is unique or the root
 * is reached. Returns `#id` for elements with a non-empty id, otherwise
 * builds a path using class names and `:nth-child`.
 */
export function generateSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body && current !== document.documentElement) {
    parts.unshift(segmentFor(current));
    const candidate = parts.join(' > ');
    if (document.querySelectorAll(candidate).length === 1) return candidate;
    current = current.parentElement;
  }
  return parts.join(' > ') || el.tagName.toLowerCase();
}
