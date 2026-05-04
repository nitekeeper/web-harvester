// Table filter — render JSON arrays / objects as a Markdown table.

import {
  PARSE_FAILED,
  parseJson,
  stripLooseQuotes,
  stripOuterParens,
} from '@domain/filters/_shared';

function escapeCell(cell: string): string {
  return cell.replace(/\|/g, '\\|');
}

function parseHeaders(params: string | undefined): string[] {
  if (!params) return [];
  const headerStr = stripOuterParens(params);
  return headerStr.split(',').map((h) => stripLooseQuotes(h.trim()));
}

function renderObjectRows(record: Record<string, unknown>): string {
  const entries = Object.entries(record);
  if (entries.length === 0) return '';
  const first = entries[0];
  /* v8 ignore next -- length check above guarantees first is defined */
  if (!first) return '';
  const [firstKey, firstValue] = first;
  const rest = entries.slice(1);
  const lines = [
    `| ${escapeCell(firstKey)} | ${escapeCell(String(firstValue))} |`,
    '| - | - |',
    ...rest.map(([key, value]) => `| ${escapeCell(key)} | ${escapeCell(String(value))} |`),
  ];
  return lines.join('\n');
}

function renderArrayOfObjects(data: Record<string, unknown>[], custom: string[]): string {
  /* v8 ignore next -- callers guarantee data is non-empty at this point */
  const firstRow = data[0] ?? {};
  const headers = custom.length > 0 ? custom : Object.keys(firstRow);
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '-').join(' | ')} |`,
    ...data.map(
      (row) =>
        `| ${headers
          .map((h) => {
            // eslint-disable-next-line security/detect-object-injection
            const cell = Object.prototype.hasOwnProperty.call(row, h) ? row[h] : '';
            /* v8 ignore next -- defensive `?? ''` for null/undefined cells */
            return escapeCell(String(cell ?? ''));
          })
          .join(' | ')} |`,
    ),
  ];
  return lines.join('\n');
}

function renderArrayOfArrays(data: unknown[][], custom: string[]): string {
  const maxColumns = Math.max(...data.map((row) => row.length));
  const headers = custom.length > 0 ? custom : new Array<string>(maxColumns).fill('');
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '-').join(' | ')} |`,
    ...data.map((row) => {
      const padded = [...row, ...new Array<string>(maxColumns - row.length).fill('')];
      return `| ${padded.map((c) => escapeCell(String(c))).join(' | ')} |`;
    }),
  ];
  return lines.join('\n');
}

function renderFlatArray(data: unknown[], custom: string[]): string {
  if (custom.length > 0) {
    const numColumns = custom.length;
    const lines = [`| ${custom.join(' | ')} |`, `| ${custom.map(() => '-').join(' | ')} |`];
    for (let i = 0; i < data.length; i += numColumns) {
      const row = data.slice(i, i + numColumns);
      const padded = [...row, ...new Array<string>(numColumns - row.length).fill('')];
      lines.push(`| ${padded.map((c) => escapeCell(String(c))).join(' | ')} |`);
    }
    return lines.join('\n');
  }
  const lines = ['| Value |', '| - |', ...data.map((item) => `| ${escapeCell(String(item))} |`)];
  return lines.join('\n');
}

function renderArray(data: unknown[], custom: string[]): string | undefined {
  if (data.length === 0) return undefined;
  if (typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
    return renderArrayOfObjects(data as Record<string, unknown>[], custom);
  }
  if (Array.isArray(data[0])) return renderArrayOfArrays(data as unknown[][], custom);
  return renderFlatArray(data, custom);
}

/**
 * Render a JSON array or object as a GitHub-flavored Markdown table.
 * Supports single objects (key/value table), arrays of objects (auto column
 * headers), arrays of arrays (custom or empty headers), and flat arrays
 * (single-column or multi-column with custom headers).
 */
export function table(value: string, params?: string): string {
  if (!value || value === 'undefined' || value === 'null') return value;
  const data = parseJson(value);
  if (data === PARSE_FAILED) return value;
  const customHeaders = parseHeaders(params);

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return renderObjectRows(data as Record<string, unknown>) || value;
  }
  if (Array.isArray(data)) {
    return renderArray(data, customHeaders) ?? value;
  }
  return value;
}
