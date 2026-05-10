// src/domain/template/dynamicVariables.ts

/**
 * Determines if a value is a primitive (string, number, or boolean).
 *
 * @param value - Value to check.
 * @returns True if the value is a primitive type.
 */
function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * Processes an array during schema.org flattening.
 *
 * @param arr - The array to process.
 * @param variables - Mutable variables dictionary to populate.
 * @param prefix - Current prefix for nested paths.
 */
function processArray(arr: unknown[], variables: Record<string, unknown>, prefix: string): void {
  if (prefix === '') {
    for (const item of arr) {
      flattenSchemaOrg(item, variables, '');
    }
  } else {
    let index = 0;
    for (const item of arr) {
      flattenSchemaOrg(item, variables, `${prefix}[${index}]`);
      index++;
    }
  }
}

/**
 * Processes an object during schema.org flattening.
 *
 * @param obj - The object to process.
 * @param variables - Mutable variables dictionary to populate.
 * @param prefix - Current prefix for nested paths.
 */
function processObject(
  obj: Record<string, unknown>,
  variables: Record<string, unknown>,
  prefix: string,
): void {
  const rawType = Reflect.get(obj, '@type');
  const type = typeof rawType === 'string' ? rawType : '';
  const thisPrefix = prefix === '' && type ? `@${type}` : prefix;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('@')) continue;
    const childPrefix = thisPrefix ? `${thisPrefix}:${key}` : key;
    const value = Reflect.get(obj, key) as unknown;
    if (isPrimitive(value)) {
      Reflect.set(variables, `schema:${childPrefix}`, String(value));
    } else {
      flattenSchemaOrg(value, variables, childPrefix);
    }
  }
}

/**
 * Recursively flattens a schema.org JSON-LD object into the variables
 * dictionary using `schema:@Type:field` key notation. Primitive values are
 * stored as strings. Arrays are indexed numerically. Nested objects recurse
 * with colon-separated path segments.
 *
 * @param data - Raw schema.org data (may be an object, array, or primitive).
 * @param variables - Mutable variables dictionary to populate.
 * @param prefix - Internal recursion prefix; callers omit this argument.
 */
export function flattenSchemaOrg(
  data: unknown,
  variables: Record<string, unknown>,
  prefix = '',
): void {
  if (data === null || data === undefined) return;

  if (Array.isArray(data)) {
    processArray(data, variables, prefix);
    return;
  }

  if (typeof data === 'object') {
    processObject(data as Record<string, unknown>, variables, prefix);
    return;
  }

  if (prefix && isPrimitive(data)) {
    Reflect.set(variables, `schema:${prefix}`, String(data));
  }
}

/**
 * Scans a template source string and returns the unique set of CSS selector
 * expressions referenced as variables. Matches `{{selector:...}}` and
 * `{{selectorHtml:...}}`, stopping at `|` (filter separator) or `}}`.
 *
 * @param templateSource - The full template source string to scan.
 * @returns Array of expressions without braces, e.g. `['selector:.byline']`.
 */
export function scanForSelectors(templateSource: string): string[] {
  const regex = /\{\{(selector(?:Html)?:[^}|]+)/g;
  const found = new Set<string>();
  let match = regex.exec(templateSource);
  while (match !== null) {
    const selector = match[1];
    if (selector !== undefined) {
      found.add(selector.trim());
    }
    match = regex.exec(templateSource);
  }
  return Array.from(found);
}
