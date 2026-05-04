// Targeted edge-case tests to drive every filter to 100% line + branch
// coverage. These tests are intentionally narrow — they hit specific
// uncovered branches identified by `pnpm test:coverage` output.
import { describe, test, expect } from 'vitest';

import { blockquote } from '@domain/filters/blockquote';
import { calc } from '@domain/filters/calc';
import { callout } from '@domain/filters/callout';
import { date } from '@domain/filters/date';
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
import { object } from '@domain/filters/object';
import { replace } from '@domain/filters/replace';
import { reverse } from '@domain/filters/reverse';
import { round } from '@domain/filters/round';
import { slice } from '@domain/filters/slice';
import { strip_md } from '@domain/filters/strip_md';
import { table } from '@domain/filters/table';
import { title } from '@domain/filters/title';
import { unique } from '@domain/filters/unique';
import { wikilink } from '@domain/filters/wikilink';

// Shared literals reused across multiple tests below.
const ISO_DATE = '2024-12-01';
const URL_HTTPS = 'https://example.com';
const HELLO = 'hello';
const NOT_JSON = 'not-json';
const X_DOT_A_DOT_B = 'x => x.a.b';
const A_HELLO_OBJ = '{"a":"hello"}';

describe('coverage edges — primitives', () => {
  test('blockquote: primitive JSON input falls through to processBlockquote', () => {
    expect(blockquote('42')).toBe('> 42');
    expect(blockquote('true')).toBe('> true');
  });

  test('calc: divide by 4 keeps decimals trimmed', () => {
    expect(calc('5', '/4')).toBe('1.25');
  });

  test('callout: third param "false" sets fold to "+"', () => {
    expect(callout('body', '("info","Title","false")')).toBe('> [!info]+ Title\n> body');
  });

  test('date: empty params array leaves outputFormat empty', () => {
    expect(date(ISO_DATE, '')).toBe(ISO_DATE);
  });

  test('date_modify: empty cleaned param returns input unchanged', () => {
    expect(date_modify(ISO_DATE, '"+1 fortnight"')).toBe(ISO_DATE);
  });
});

describe('coverage edges — duration', () => {
  test('duration: long-hour ISO uses HH:mm:ss', () => {
    expect(duration('PT2H5M30S')).toBe('02:05:30');
  });

  test('duration: returns input unchanged when stripped is non-numeric', () => {
    expect(duration('"abc"')).toBe('"abc"');
  });

  test('duration: respects custom format with single-letter parts', () => {
    expect(duration('1868', '"H:m:s"')).toBe('0:31:8');
  });

  test('duration: format string with no time tokens leaves text intact', () => {
    expect(duration('60', '"--"')).toBe('--');
  });
});

describe('coverage edges — fragment_link', () => {
  test('handles object input as values mapped to fragment links', () => {
    const result = fragment_link(A_HELLO_OBJ, URL_HTTPS);
    expect(result).toContain(HELLO);
    expect(result).toContain(URL_HTTPS);
  });

  test('handles array of objects with text property', () => {
    const result = fragment_link('[{"text":"hello"}]', URL_HTTPS);
    expect(result).toContain(HELLO);
    expect(result).toContain('text');
  });
});

describe('coverage edges — join', () => {
  test('join: returns string for non-array JSON', () => {
    expect(join('123')).toBe('123');
  });
});

describe('coverage edges — link', () => {
  test('link: parenthesised param is stripped before quote stripping', () => {
    expect(link('https://x.com', '("home")')).toBe('[home](https://x.com)');
  });

  test('link: returns empty array stringified for empty array input', () => {
    expect(link('[]')).toBe('');
  });

  test('link: returns input unchanged for non-array, non-object JSON primitive', () => {
    expect(link('123')).toBe('123');
  });
});

describe('coverage edges — list', () => {
  test('list: catch branch — unparseable JSON wraps as single bullet', () => {
    expect(list(HELLO)).toBe('- hello');
  });

  test('list: numbered list with nested array re-numbers each level', () => {
    expect(list('[["a","b"]]', 'numbered')).toBe('\t1. a\n\t2. b');
  });
});

describe('coverage edges — merge', () => {
  test('merge: empty value returns []', () => {
    expect(merge('undefined')).toBe('[]');
    expect(merge('null')).toBe('[]');
  });

  test('merge: malformed JSON returns input unchanged', () => {
    expect(merge('not-json', '"a"')).toBe('not-json');
  });
});

describe('coverage edges — map', () => {
  test('map: non-JSON input is wrapped to single-element array (caught path)', () => {
    expect(map('not-an-array', 'x => x')).toBe('["not-an-array"]');
  });

  test('map: simple identifier expression on array of strings returns items unchanged', () => {
    expect(map('["a","b"]', 'x => x')).toBe('["a","b"]');
  });

  test('map: nested property access on array of objects', () => {
    const out = map('[{"a":{"b":"x"}},{"a":{"b":"y"}}]', X_DOT_A_DOT_B);
    expect(out).toBe('["x","y"]');
  });

  test('map: array index access on nested array', () => {
    const out = map('[{"items":["x","y"]}]', 'x => x.items[0]');
    expect(out).toBe('["x"]');
  });

  test('map: parenthesised string-literal expression', () => {
    const out = map('["a"]', 'x => ("${x}!")');
    expect(out).toBe('["a!"]');
  });
});

describe('coverage edges — nth / number_format / object / replace', () => {
  test('nth: input that fails JSON.parse returns input unchanged', () => {
    expect(nth(NOT_JSON, '2')).toBe(NOT_JSON);
  });

  test('nth: empty value returns empty', () => {
    expect(nth('')).toBe('');
  });

  test('nth: undefined sentinel returns input', () => {
    expect(nth('undefined')).toBe('undefined');
  });

  test('number_format: param with quoted decimal point only', () => {
    expect(number_format('1234.5', '1,"."')).toBe('1,234.5');
  });

  test('number_format: parses non-numeric string to NaN, walked unchanged', () => {
    expect(number_format('null')).toBe('null');
  });

  test('number_format: nested object', () => {
    expect(number_format('{"a":1234}')).toBe('{"a":"1,234"}');
  });

  test('number_format: invalid decimals param defaults to 0', () => {
    expect(number_format('1234', 'abc')).toBe('1,234');
  });

  test('object: returns input for primitive parsed JSON', () => {
    expect(object('42', 'keys')).toBe('42');
  });

  test('replace: regex with bad pattern returns acc unchanged', () => {
    expect(replace(HELLO, '"":"",/[/:""')).toBe(HELLO);
  });

  test('replace: pipe split branch fires when search is "|"', () => {
    expect(replace('a|b', '"|":"-"')).toBe('a-b');
  });
});

describe('coverage edges — reverse / round / slice / strip_md', () => {
  test('reverse: primitive JSON value returns input unchanged via fallthrough', () => {
    expect(reverse('42')).toBe('42');
  });

  test("round: rounds an object's numeric values", () => {
    expect(round('{"a":1.5}', '0')).toBe('{"a":2}');
  });

  test('round: passes non-numeric string through', () => {
    expect(round(A_HELLO_OBJ)).toBe(A_HELLO_OBJ);
  });

  test('slice: parses JSON array but slice returns multi-element array', () => {
    expect(slice('[1,2,3,4]', '0,2')).toBe('[1,2]');
  });

  test('slice: invalid index parts treated as undefined', () => {
    expect(slice('abcdef', 'x,y')).toBe('abcdef');
  });

  test('strip_md: wikilink with alias captures group 2', () => {
    expect(strip_md('[[Page|Display]]')).toBe('Display');
  });

  test('strip_md: wikilink without alias captures group 1', () => {
    expect(strip_md('[[PageName]]')).toBe('PageName');
  });
});

describe('coverage edges — table / title / unique / wikilink', () => {
  test('table: empty object returns input unchanged', () => {
    expect(table('{}')).toBe('{}');
  });

  test('table: empty array returns input unchanged', () => {
    expect(table('[]')).toBe('[]');
  });

  test('title: object input title-cases keys and values', () => {
    expect(title('{"hello world":"foo bar"}')).toBe('{"Hello World":"Foo Bar"}');
  });

  test('title: nested array of strings', () => {
    expect(title('[["hello world"]]')).toBe('[["Hello World"]]');
  });

  test('unique: returns primitive JSON value unchanged', () => {
    expect(unique('42')).toBe('42');
  });

  test('wikilink: array of objects', () => {
    expect(wikilink('[{"PageA":"Display A"}]')).toBe('["[[PageA|Display A]]"]');
  });

  test('wikilink: array containing falsy values produces empty entries', () => {
    expect(wikilink('["",""]')).toBe('["",""]');
  });

  test('wikilink: nested object processed recursively', () => {
    expect(wikilink('{"outer":{"inner":"v"}}')).toBe('["[[inner|v]]"]');
  });

  test('wikilink: primitive JSON returns input unchanged', () => {
    expect(wikilink('42')).toBe('42');
  });

  test('duration: ISO with months component', () => {
    expect(duration('P2M')).toBe('1440:00:00');
  });

  test('fragment_link: param without URL falls back to using param as URL', () => {
    const out = fragment_link('"hello"', 'no-scheme-here');
    expect(out).toContain('no-scheme-here');
  });
});
