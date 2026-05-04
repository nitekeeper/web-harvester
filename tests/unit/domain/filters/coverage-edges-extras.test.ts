// Targeted edge-case tests (continued) — split from coverage-edges.test.ts
// to keep each file under the 400-line limit. These tests hit additional
// branches identified by `pnpm test:coverage` output.
import { describe, test, expect } from 'vitest';

import { calc } from '@domain/filters/calc';
import { callout } from '@domain/filters/callout';
import { date_modify } from '@domain/filters/date_modify';
import { duration } from '@domain/filters/duration';
import { fragment_link } from '@domain/filters/fragment_link';
import { join } from '@domain/filters/join';
import { link } from '@domain/filters/link';
import { list } from '@domain/filters/list';
import { map } from '@domain/filters/map';
import { merge } from '@domain/filters/merge';
import { nth } from '@domain/filters/nth';
import { number_format } from '@domain/filters/number_format';
import { replace } from '@domain/filters/replace';
import { round } from '@domain/filters/round';
import { table } from '@domain/filters/table';
import { title } from '@domain/filters/title';
import { wikilink } from '@domain/filters/wikilink';

// Shared literals reused across multiple tests below.
const ISO_DATE = '2024-12-01';
const URL_HTTPS = 'https://example.com';
const HELLO = 'hello';
const NOT_JSON = 'not-json';
const X_DOT_A_DOT_B = 'x => x.a.b';
const A_NUM_ARR = '[{"a":1}]';

describe('coverage edges — calc / callout / date_modify gaps', () => {
  test('calc: invalid operator returns input unchanged', () => {
    expect(calc('10', '%5')).toBe('10');
  });

  test('callout: defaults type when first param empty after split', () => {
    expect(callout('body', '("","Title")')).toBe('> [!info] Title\n> body');
  });

  test('date_modify: invalid format param returns input unchanged', () => {
    expect(date_modify(ISO_DATE, 'not-a-format')).toBe(ISO_DATE);
  });

  test('callout: type defaults when only title is supplied', () => {
    expect(callout('body', '("","")')).toBe('> [!info]\n> body');
  });
});

describe('coverage edges — duration extras', () => {
  test('duration: H format with hours zero stays 0', () => {
    expect(duration('60', '"H"')).toBe('0');
  });

  test('duration: ISO with years, months, days components', () => {
    const result = duration('P1Y');
    expect(result).toMatch(/^\d+:00:00$/);
  });

  test('duration: ISO with day component', () => {
    expect(duration('P1D')).toBe('24:00:00');
  });

  test('duration: bare m token replaces with minutes', () => {
    expect(duration('60', '"m"')).toBe('1');
  });
});

describe('coverage edges — fragment_link / join extras', () => {
  test('fragment_link: object with text key but data not array gets handled', () => {
    const result = fragment_link('{"text":"hello"}', URL_HTTPS);
    expect(result).toContain(HELLO);
  });

  test('join: returns empty for "undefined" sentinel', () => {
    expect(join('undefined')).toBe('');
  });

  test('join: catch branch returns input for malformed JSON', () => {
    expect(join('{not json}')).toBe('{not json}');
  });
});

describe('coverage edges — link extras', () => {
  test('link: nested object inside array is processed', () => {
    expect(link('[{"a":"v"}]')).toBe('[v](a)');
  });

  test('link: catch branch wraps non-JSON URL', () => {
    expect(link('https://x.com', '"home"')).toBe('[home](https://x.com)');
  });

  test('link: nested object inside array recurses into processObject', () => {
    expect(link('[{"a":{"b":"v"}}]')).toBe('[v](b)');
  });

  test('link: falsy array items render as empty strings', () => {
    expect(link('["",null]')).toBe('\n');
  });
});

describe('coverage edges — list / replace / round extras', () => {
  test('list: catch branch wraps single value', () => {
    expect(list(NOT_JSON, 'task')).toBe('- [ ] not-json');
  });

  test('list: single non-array JSON value goes through wrap branch', () => {
    expect(list('"hello"')).toBe('- hello');
  });

  test('replace: invalid regex pattern returns acc unchanged', () => {
    expect(replace(HELLO, '"":"",/[/g":"x"')).toBe(HELLO);
  });

  test('replace: search containing newline uses split/join branch', () => {
    expect(replace('a\nb', '"\\n":"-"')).toBe('a-b');
  });

  test('replace: regex mode entered when "/" follows a `:` mid-token', () => {
    const out = replace('a1b2c', '"x":/\\d/g:""');
    expect(out).toBe('a1b2c');
  });

  test('replace: handles \\r and \\t escape sequences in replacement', () => {
    expect(replace('a-b', '"-":"\\r"')).toBe('a\rb');
    expect(replace('a-b', '"-":"\\t"')).toBe('a\tb');
  });

  test('round: rounds individual numeric values', () => {
    expect(round('1.55', '1')).toBe('1.6');
  });

  test('round: rounds individual numeric value with no decimals', () => {
    expect(round('1.7', '0')).toBe('2');
  });

  test('round: parameter undefined keeps integers (covers no-decimals path)', () => {
    expect(round('3.7')).toBe('4');
  });

  test('round: numeric JSON-string roundtrips through processValue', () => {
    expect(round('"3.7"', '1')).toBe('3.7');
  });

  test('round: passes JSON `null` through unchanged via processValue', () => {
    expect(round('null', '0')).toBe('null');
  });

  test('round: passes JSON `true` through unchanged via processValue', () => {
    expect(round('true', '0')).toBe('true');
  });
});

describe('coverage edges — table extras', () => {
  test('table: flat array with custom headers wraps into rows', () => {
    expect(table('[1,2,3,4]', '"x","y"')).toBe('| x | y |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |');
  });

  test('table: primitive JSON value returns input unchanged', () => {
    expect(table('42')).toBe('42');
  });

  test('table: array of objects with row missing a header (renders empty cell)', () => {
    expect(table('[{"a":1},{"a":2,"b":3}]')).toBe('| a |\n| - |\n| 1 |\n| 2 |');
  });

  test('table: array of arrays with custom headers', () => {
    expect(table('[[1,2]]', '"x","y"')).toBe('| x | y |\n| - | - |\n| 1 | 2 |');
  });

  test('table: array of arrays without custom headers uses empty headers', () => {
    expect(table('[[1,2]]')).toBe('|  |  |\n| - | - |\n| 1 | 2 |');
  });

  test('table: array of objects with custom headers overrides auto keys', () => {
    expect(table('[{"name":"Alice","age":30}]', '"NAME","AGE"')).toBe(
      '| NAME | AGE |\n| - | - |\n|  |  |',
    );
  });

  test('table: row missing a header column renders empty cell', () => {
    expect(table('[{"a":1},{"b":2}]')).toBe('| a |\n| - |\n| 1 |\n|  |');
  });
});

describe('coverage edges — title / wikilink extras', () => {
  test('title: array of nested objects', () => {
    expect(title('[{"hello":"world"}]')).toBe('[{"Hello":"World"}]');
  });

  test('title: passes plain numeric JSON through unchanged via processValue', () => {
    expect(title('42')).toBe('42');
  });

  test("wikilink: array containing falsy entries hits the `['']` branch", () => {
    expect(wikilink('[null,0]')).toBe('["",""]');
  });

  test('wikilink: array with alias wraps each entry with the alias', () => {
    expect(wikilink('["Page A","Page B"]', '"Alias"')).toBe(
      '["[[Page A|Alias]]","[[Page B|Alias]]"]',
    );
  });

  test('wikilink: array entry that is non-empty string with empty alias', () => {
    expect(wikilink('["NoAlias"]')).toBe('["[[NoAlias]]"]');
  });
});

describe('coverage edges — map / merge / nth extras', () => {
  test('map: nested property access on primitive value yields undefined', () => {
    expect(map(A_NUM_ARR, X_DOT_A_DOT_B)).toBe('["undefined"]');
  });

  test('map: object literal with non-JSON value falls back to stripped string', () => {
    expect(map(A_NUM_ARR, 'x => ({k: bare})')).toBe('[{"k":"bare"}]');
  });

  test('map: nested property miss on object returns undefined', () => {
    expect(map('[{"a":{"x":1}}]', X_DOT_A_DOT_B)).toBe('["undefined"]');
  });

  test('map: single-quote string-literal expression', () => {
    expect(map('["a"]', "x => '${x}!'")).toBe('["a!"]');
  });

  test('merge: array input passes through with no extras when no param', () => {
    expect(merge('[1,2]')).toBe('[1,2]');
  });

  test('nth: empty value returns input unchanged (early return)', () => {
    expect(nth('null')).toBe('null');
  });

  test('nth: input that is JSON object (not array) returns input unchanged', () => {
    expect(nth('{"a":1}', '1')).toBe('{"a":1}');
  });
});

describe('coverage edges — number_format extras', () => {
  test('number_format: JSON-quoted numeric string formats correctly', () => {
    expect(number_format('"1234"')).toBe('1,234');
  });

  test('number_format: backslash-escaped char in param is unescaped', () => {
    expect(number_format('1234.5', '1,"\\\\"')).toBe('1,234\\5');
  });

  test('number_format: param with default thousands separator only', () => {
    expect(number_format('1234.5', '1')).toBe('1,234.5');
  });

  test('number_format: only decimals param leaves separators at defaults', () => {
    expect(number_format('1234.567', '2')).toBe('1,234.57');
  });

  test('number_format: ignores trailing comma producing extra empty param', () => {
    expect(number_format('1234.5', '1,')).toBe('1,234.5');
  });

  test('number_format: JSON array of numbers (covers Array.isArray branch)', () => {
    expect(number_format('[1234,5678]')).toBe('["1,234","5,678"]');
  });
});
