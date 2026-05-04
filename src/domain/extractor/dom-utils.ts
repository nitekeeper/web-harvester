/**
 * Generates a unique XPath string for a DOM element by walking the parent chain.
 * Each segment is `tagname[n]` where n is the 1-based sibling index among
 * same-tag siblings.
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

/**
 * Safely sets the inner HTML of an element by parsing through DOMParser and
 * replacing children. Avoids direct innerHTML assignment.
 */
export function setElementHTML(element: Element, html: string): void {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  element.replaceChildren(...Array.from(parsed.body.childNodes));
}

/**
 * Serializes an element's child nodes to an HTML string. Element children are
 * serialized via outerHTML; text nodes are HTML-escaped; comment nodes are
 * preserved as HTML comments.
 */
export function serializeChildren(element: Element): string {
  return Array.from(element.childNodes)
    .map((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return (node as Element).outerHTML;
      if (node.nodeType === Node.TEXT_NODE) {
        const text: string = (node as Text).data;
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      if (node.nodeType === Node.COMMENT_NODE) {
        return `<!--${(node as Comment).data}-->`;
      }
      return '';
    })
    .join('');
}

/**
 * Converts all relative URLs in src, href, and srcset attributes to absolute
 * using the given base URL. Returns modified body innerHTML.
 *
 * Ported from src/content.ts lines 238–263 of the original the upstream source.
 */
export function absolutizeUrls(html: string, baseUrl: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // [srcset] is included so <source srcset> inside <picture> elements is
  // also processed (otherwise responsive images keep relative URLs).
  doc.querySelectorAll('[src],[href],[srcset]').forEach((element) => {
    (['src', 'href', 'srcset'] as const).forEach((attr) => {
      const value = element.getAttribute(attr);
      if (!value) return;

      if (attr === 'srcset') {
        const newSrcset = value
          .split(',')
          .map((entry) => {
            const [url, descriptor] = entry.trim().split(/\s+/, 2);
            if (!url) return entry;
            try {
              const absolute = new URL(url, baseUrl).href;
              return descriptor ? `${absolute} ${descriptor}` : absolute;
            } catch {
              return entry;
            }
          })
          .join(', ');
        element.setAttribute(attr, newSrcset);
      } else if (
        !value.startsWith('http') &&
        !value.startsWith('data:') &&
        !value.startsWith('#') &&
        !value.startsWith('//')
      ) {
        try {
          element.setAttribute(attr, new URL(value, baseUrl).href);
        } catch {
          // leave unchanged if URL construction fails
        }
      }
    });
  });

  return doc.body.innerHTML;
}
