// tests/unit/domain/template/tokenizer.coverage.test.ts
// Additional branch-coverage tests that supplement the spec tests in
// tokenizer.test.ts. Kept separate so the spec file stays focused.

import { describe, test, expect } from 'vitest';

import { tokenize } from '@domain/template/tokenizer';

const SELECTOR_P = 'selector:p';

describe('tokenize — additional operators', () => {
  test('tokenizes >= and <= operators', () => {
    const result = tokenize('{% if a >= 1 %}{% if b <= 2 %}');
    expect(result.errors).toHaveLength(0);
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('op_gte');
    expect(types).toContain('op_lte');
  });

  test('tokenizes > and < single-char operators', () => {
    const result = tokenize('{% if a > 1 %}{% if b < 2 %}');
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('op_gt');
    expect(types).toContain('op_lt');
  });

  test('tokenizes || and && operators', () => {
    const result = tokenize('{% if a || b && c %}');
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('op_or');
    expect(types).toContain('op_and');
  });

  test('tokenizes => arrow', () => {
    const result = tokenize('{{x => y}}');
    expect(result.tokens.some((t) => t.type === 'arrow')).toBe(true);
  });

  test('tokenizes ! not operator', () => {
    const result = tokenize('{% if !x %}');
    expect(result.tokens.some((t) => t.type === 'op_not')).toBe(true);
  });
});

describe('tokenize — additional punctuation', () => {
  test('tokenizes parens, brackets, dollar', () => {
    const result = tokenize('{{(a)[0]$c}}');
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('lparen');
    expect(types).toContain('rparen');
    expect(types).toContain('lbracket');
    expect(types).toContain('rbracket');
    expect(types).toContain('dollar');
  });

  test('tokenizes lbrace and rbrace inside expression', () => {
    const result = tokenize('{{ {a: 1} }}');
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('lbrace');
    expect(types).toContain('rbrace');
  });

  test('tokenizes colon, comma, star, slash', () => {
    const result = tokenize('{{a:1,b*c/d}}');
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('colon');
    expect(types).toContain('comma');
    expect(types).toContain('star');
    expect(types).toContain('slash');
  });
});

describe('tokenize — keyword recognition', () => {
  test('recognizes elseif and else and set', () => {
    const r1 = tokenize('{% elseif x %}');
    const r2 = tokenize('{% else %}');
    const r3 = tokenize('{% set y = 1 %}');
    expect(r1.tokens.some((t) => t.type === 'keyword_elseif')).toBe(true);
    expect(r2.tokens.some((t) => t.type === 'keyword_else')).toBe(true);
    expect(r3.tokens.some((t) => t.type === 'keyword_set')).toBe(true);
  });

  test('recognizes contains and not as operator keywords', () => {
    const result = tokenize('{% if x contains y and not z %}');
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('op_contains');
    expect(types).toContain('op_not');
  });
});

describe('tokenize — string edge cases', () => {
  test('reports error when string contains }} before closing quote', () => {
    const result = tokenize('{{"unterminated}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports error when string contains %} before closing quote', () => {
    const result = tokenize('{% set x = "bad%} %}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports error for unterminated string at EOF', () => {
    const result = tokenize('{{"never closed');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('handles all single-char escape sequences', () => {
    const result = tokenize('{{"a\\tb\\rc\\\\d\\\'e\\?"}}');
    const str = result.tokens.find((t) => t.type === 'string');
    expect(str?.value).toBe("a\tb\rc\\d'e?");
  });
});

describe('tokenize — number edge cases', () => {
  test('tokenizes negative floats', () => {
    const result = tokenize('{{-3.14}}');
    const num = result.tokens.find((t) => t.type === 'number');
    expect(num?.value).toBe('-3.14');
  });
});

describe('tokenize — identifier edge cases', () => {
  test('tokenizes kebab-case identifier', () => {
    const result = tokenize('{{my-var}}');
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('my-var');
  });

  test('tokenizes nested property access via dot', () => {
    const result = tokenize('{{author.name}}');
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('author.name');
  });

  test('tokenizes @-prefixed identifier (schema:@Type)', () => {
    const result = tokenize('{{@Article}}');
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('@Article');
  });

  test('tokenizes underscore-prefixed identifier', () => {
    const result = tokenize('{{_private}}');
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('_private');
  });
});

describe('tokenize — CSS selectors basics', () => {
  test('captures simple selector body', () => {
    const result = tokenize('{{selector:p.title}}');
    expect(result.errors).toHaveLength(0);
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('selector:p.title');
  });

  test('captures selector with attribute brackets', () => {
    const result = tokenize('{{selector:a[href="x"]}}');
    expect(result.errors).toHaveLength(0);
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('selector:a[href="x"]');
  });

  test('captures selectorHtml prefix variant', () => {
    const result = tokenize('{{selectorHtml:div.body}}');
    expect(result.errors).toHaveLength(0);
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('selectorHtml:div.body');
  });

  test('captures selector with pseudo-class parens', () => {
    const result = tokenize('{{selector:p:nth-child(2)}}');
    expect(result.errors).toHaveLength(0);
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('selector:p:nth-child(2)');
  });
});

describe('tokenize — CSS selectors quoting', () => {
  test('captures selector with pipe filter', () => {
    const result = tokenize('{{selector:p|trim}}');
    expect(result.errors).toHaveLength(0);
    const ids = result.tokens.filter((t) => t.type === 'identifier').map((t) => t.value);
    expect(ids).toContain(SELECTOR_P);
    expect(ids).toContain('trim');
  });

  test('captures selector with single-quoted attr', () => {
    const result = tokenize("{{selector:a[title='hi']}}");
    expect(result.errors).toHaveLength(0);
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe("selector:a[title='hi']");
  });

  test('captures selector with escaped attribute quotes', () => {
    const result = tokenize('{{selector:a[href=\\"x\\"]}}');
    expect(result.errors).toHaveLength(0);
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('selector:a[href=\\"x\\"]');
  });

  test('captures selector with escaped char inside string', () => {
    const result = tokenize('{{selector:a[title="a\\"b"]}}');
    expect(result.errors).toHaveLength(0);
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe('selector:a[title="a\\"b"]');
  });
});

describe('tokenize — CSS selector boundary variants', () => {
  test('selector inside a tag stops at %}', () => {
    const result = tokenize('{% set x = selector:p %}');
    expect(result.errors).toHaveLength(0);
    const id = result.tokens.find((t) => t.type === 'identifier' && t.value === SELECTOR_P);
    expect(id).toBeDefined();
  });

  test('selector with escaped single-quote attribute', () => {
    const result = tokenize("{{selector:a[title=\\'x\\']}}");
    expect(result.errors).toHaveLength(0);
    const id = result.tokens.find((t) => t.type === 'identifier');
    expect(id?.value).toBe("selector:a[title=\\'x\\']");
  });

  test('selector stops at single } when inside braces', () => {
    const result = tokenize('{{ {x: selector:p} }}');
    const id = result.tokens.find((t) => t.type === 'identifier' && t.value === SELECTOR_P);
    expect(id).toBeDefined();
  });
});

describe('tokenize — CSS selector errors', () => {
  test('reports unclosed bracket in selector at }}', () => {
    const result = tokenize('{{selector:p[attr=val}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports unclosed paren in selector at }}', () => {
    const result = tokenize('{{selector:p:nth-child(2}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports unclosed string in selector at }}', () => {
    const result = tokenize('{{selector:p[attr="value}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports extra ] in selector', () => {
    const result = tokenize('{{selector:p]extra}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports extra ) in selector', () => {
    const result = tokenize('{{selector:p)extra}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports unclosed bracket in tag-context selector at %}', () => {
    const result = tokenize('{% set x = selector:p[attr=val %}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('selector stops at -}} trim marker', () => {
    const result = tokenize('{%- if true -%}');
    expect(result.tokens.some((t) => t.type === 'tag_end')).toBe(true);
  });
});

describe('tokenize — tag edge cases', () => {
  test('tokenizes -%} trim tag end', () => {
    const result = tokenize('{% if x -%}');
    expect(result.errors).toHaveLength(0);
    const end = result.tokens.find((t) => t.type === 'tag_end');
    expect(end?.value).toBe('-%}');
  });

  test('reports malformed tag end with single }', () => {
    const result = tokenize('{% if x }');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports unclosed tag interrupted by another tag', () => {
    const result = tokenize('{% if x\n{% set y = 1 %}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports unclosed variable interrupted by another tag', () => {
    const result = tokenize('{{title\n{% set y = 1 %}');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('tokenize — escaped filter argument', () => {
  test('tokenizes escaped argument with backslash quoting', () => {
    const result = tokenize('{{x|join:\\"-\\"}}');
    expect(result.errors).toHaveLength(0);
    const strs = result.tokens.filter((t) => t.type === 'string');
    expect(strs.length).toBeGreaterThan(0);
  });

  test('decodes all argument escape sequences', () => {
    const result = tokenize('{{x|join:\\n\\t\\r\\,\\|\\\\\\?}}');
    expect(result.errors).toHaveLength(0);
    const strs = result.tokens.filter((t) => t.type === 'string');
    expect(strs[0]?.value).toBe('\n\t\r,|\\?');
  });

  test('terminates escaped argument at +}} marker', () => {
    const result = tokenize('{{x|join:\\foo+}}');
    expect(result.tokens.some((t) => t.type === 'string')).toBe(true);
  });

  test('terminates escaped argument at +%} marker', () => {
    const result = tokenize('{% set y = x|join:\\foo+%}');
    expect(result.tokens.some((t) => t.type === 'string')).toBe(true);
  });
});

describe('tokenize — expression edge cases', () => {
  test('reports unexpected character', () => {
    const result = tokenize('{{~}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports unclosed variable when expression hits EOF after whitespace', () => {
    const result = tokenize('{{ ');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports unclosed tag when expression hits EOF after whitespace', () => {
    const result = tokenize('{% ');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('handles assign in tag expression', () => {
    const result = tokenize('{% set x = 1 %}');
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('op_assign');
  });

  test('emits valid rbrace when followed by space (object literal in expression)', () => {
    const result = tokenize('{{ {a:1} }}');
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('rbrace');
  });
});
