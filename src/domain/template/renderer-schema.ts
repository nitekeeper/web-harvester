// Schema variable resolution helpers for the template renderer.
// Split out of `./renderer-eval` to keep each module under the 400-line ceiling.
//
// Provides shorthand schema lookup (`schema:genre` resolving to a stored
// `{{schema:@Movie.genre}}` key), nested-array indexing (`schema:cast[*].name`),
// and JSON-string parsing for stored schema values.

/**
 * Parsed components of a nested-array schema key like `key[*].prop`.
 */
export interface NestedArrayKey {
  arrayKey: string;
  indexOrStar: string;
  propertyPath: string | undefined;
}

/**
 * Resolve a schema variable with shorthand support.
 * Schema variables can be stored with full keys like `{{schema:@Movie.genre}}`
 * but referenced with shorthand like `schema:genre`.
 */
export function resolveSchemaVariable(name: string, variables: Record<string, unknown>): unknown {
  const schemaKey = name.slice('schema:'.length);

  // Pattern: `key[*].prop` or `key[0].prop`. Parsed without regex
  // alternation/`.*` to keep the linter happy about backtracking risk.
  const nestedArrayMatch = parseNestedArrayKey(schemaKey);
  if (nestedArrayMatch) {
    return resolveSchemaArray(nestedArrayMatch, variables);
  }

  const rawValue = resolveSchemaKey(schemaKey, variables);
  if (rawValue === undefined) return undefined;
  return parseSchemaValue(rawValue);
}

/**
 * Parse a `key[*].prop` or `key[0].prop` schema key into its components.
 * Returns `null` when the key does not match the expected pattern.
 */
export function parseNestedArrayKey(schemaKey: string): NestedArrayKey | null {
  const openIdx = schemaKey.indexOf('[');
  if (openIdx < 0) return null;
  const closeIdx = schemaKey.indexOf(']', openIdx + 1);
  if (closeIdx < 0) return null;

  const indexOrStar = schemaKey.slice(openIdx + 1, closeIdx);
  if (indexOrStar !== '*' && !/^\d+$/.test(indexOrStar)) return null;

  const arrayKey = schemaKey.slice(0, openIdx);
  const tail = schemaKey.slice(closeIdx + 1);
  if (tail === '') {
    return { arrayKey, indexOrStar, propertyPath: undefined };
  }
  if (tail.startsWith('.') && tail.length > 1) {
    return { arrayKey, indexOrStar, propertyPath: tail.slice(1) };
  }
  return null;
}

/**
 * Parse a schema value - if it's a JSON string, parse it to get the actual value.
 */
export function parseSchemaValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
  }
  return value;
}

function resolveSchemaArray(parts: NestedArrayKey, variables: Record<string, unknown>): unknown {
  const { arrayKey, indexOrStar, propertyPath } = parts;

  const arrayValue = resolveSchemaKey(arrayKey, variables);
  if (arrayValue === undefined) return undefined;

  const parsed = parseSchemaValue(arrayValue);
  if (!Array.isArray(parsed)) return undefined;

  if (indexOrStar === '*') {
    if (propertyPath) {
      return parsed
        .map((item: unknown) => getNestedValue(item, propertyPath))
        .filter((v: unknown) => v != null);
    }
    return parsed;
  }

  const index = parseInt(indexOrStar, 10);
  // eslint-disable-next-line security/detect-object-injection
  const item: unknown = parsed[index];
  if (item === undefined) return undefined;
  return propertyPath ? getNestedValue(item, propertyPath) : item;
}

/**
 * Resolve a schema key to its raw value from variables (before parsing).
 * Handles exact match, plain key, and shorthand resolution.
 */
function resolveSchemaKey(schemaKey: string, variables: Record<string, unknown>): unknown {
  const name = `schema:${schemaKey}`;

  const wrappedKey = `{{${name}}}`;
  if (Object.prototype.hasOwnProperty.call(variables, wrappedKey)) {
    const exactValue = Reflect.get(variables, wrappedKey);
    if (exactValue !== undefined) {
      return exactValue;
    }
  }

  if (Object.prototype.hasOwnProperty.call(variables, name)) {
    const plain = Reflect.get(variables, name);
    if (plain !== undefined) {
      return plain;
    }
  }

  // If no `@` in key, try shorthand resolution.
  if (!schemaKey.includes('@')) {
    const matchingKey = Object.keys(variables).find(
      (key) => key.includes('@') && key.endsWith(`:${schemaKey}}}`),
    );
    if (matchingKey) {
      return Reflect.get(variables, matchingKey);
    }
  }

  return undefined;
}

const BRACKET_KEY_RE = /^([^[]*)\[([^\]]+)\]/;
const TRAILING_QUOTE_RE = /(?:^["'])|(?:["']$)/g;

/**
 * Walk a dotted (and optionally bracketed) property path on an object/array,
 * returning the resolved value or `undefined`. Shared between schema lookups
 * and plain identifier resolution.
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === undefined || obj === null) return undefined;

  let value: unknown = obj;
  for (const key of path.split('.')) {
    if (value === undefined || value === null) return undefined;
    value = stepNestedValue(value, key);
  }
  return value;
}

function stepNestedValue(value: unknown, key: string): unknown {
  const match = key.includes('[') ? key.match(BRACKET_KEY_RE) : null;
  if (match) {
    return resolveBracketKey(value, match);
  }

  if (typeof value !== 'object') return undefined;

  const obj_ = value as object;
  const wrappedKey = `{{${key}}}`;
  if (Object.prototype.hasOwnProperty.call(obj_, wrappedKey)) {
    return Reflect.get(obj_, wrappedKey);
  }
  return Reflect.get(obj_, key);
}

function resolveBracketKey(value: unknown, match: RegExpMatchArray): unknown {
  // Both capture groups are non-optional in BRACKET_KEY_RE (`([^[]*)\[([^\]]+)\]`)
  // so they are guaranteed defined when the match succeeded. The first group
  // can be empty (e.g. property path `[0]` with no preceding identifier).
  const arrayKey = match[1] as string;
  const indexStr = match[2] as string;
  const baseValue: unknown = arrayKey ? Reflect.get(value as object, arrayKey) : value;
  if (Array.isArray(baseValue)) {
    const index = parseInt(indexStr, 10);
    // eslint-disable-next-line security/detect-object-injection
    return baseValue[index];
  }
  if (baseValue && typeof baseValue === 'object') {
    const cleanKey = indexStr.replace(TRAILING_QUOTE_RE, '');
    return Reflect.get(baseValue, cleanKey);
  }
  return undefined;
}
