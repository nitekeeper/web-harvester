/**
 * Generates a unique XPath string for a DOM element by walking the parent
 * chain. Each segment is `tagname[n]` where n is the 1-based sibling index.
 */
export function getElementXPath(element: Node): string {
  if (element.nodeType === Node.DOCUMENT_NODE) return '';
  const parent = element.parentNode;
  if (!parent) return '';
  if (element.nodeType !== Node.ELEMENT_NODE) {
    return getElementXPath(parent);
  }

  const tagName = (element as Element).tagName;
  const siblings = Array.from(parent.childNodes).filter(
    (n) => n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === tagName,
  );
  const index = siblings.indexOf(element as ChildNode) + 1;
  return getElementXPath(parent) + '/' + tagName.toLowerCase() + '[' + index + ']';
}

/**
 * Resolves an XPath expression against the given document.
 * Returns null if no matching element is found.
 */
export function getElementByXPath(xpath: string, doc: Document): Element | null {
  return doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    .singleNodeValue as Element | null;
}
