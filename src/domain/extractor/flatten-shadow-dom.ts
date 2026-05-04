/**
 * Walks the entire DOM tree rooted at `doc` and replaces any shadow roots
 * with their flattened content, marked with `data-clip-shadow="true"`.
 *
 * This is a pure synchronous DOM transformation. It does NOT inject any
 * external scripts, so it is safe to use in the domain layer.
 *
 * The attribute name `data-clip-shadow` replaces `data-defuddle-shadow` from
 * the original the upstream source implementation.
 *
 * Note: Elements with closed shadow roots (`mode: 'closed'`) are silently
 * skipped, as `node.shadowRoot` returns `null` for them.
 */
export function flattenShadowDom(doc: Document): void {
  flattenNode(doc.documentElement);
}

function flattenNode(node: Element): void {
  // First recurse into light DOM children.
  Array.from(node.children).forEach(flattenNode);

  // Then flatten the shadow root if present.
  const shadow = node.shadowRoot;
  if (!shadow) return;

  // Recursively flatten within the shadow tree before lifting it.
  Array.from(shadow.children).forEach(flattenNode);

  // Create a wrapper div that marks the flattened shadow boundary.
  const wrapper = node.ownerDocument.createElement('div');
  wrapper.setAttribute('data-clip-shadow', 'true');
  // Direct assignment is intentional: shadow.innerHTML is an in-memory string;
  // setElementHTML uses DOMParser which wraps content in a synthetic body element.
  wrapper.innerHTML = shadow.innerHTML;

  // Replace all existing light-DOM children with the flattened shadow content.
  node.replaceChildren(wrapper);
}
