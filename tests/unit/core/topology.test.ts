import { describe, it, expect } from 'vitest';

import { topologicalSort, CircularDependencyError } from '@core/topology';

describe('topologicalSort - basic ordering', () => {
  it('returns plugins in dependency order', () => {
    const plugins = [
      { id: 'template', dependencies: ['clipper'] },
      { id: 'clipper', dependencies: [] },
      { id: 'theme', dependencies: [] },
    ];
    const order = topologicalSort(plugins);
    expect(order.indexOf('clipper')).toBeLessThan(order.indexOf('template'));
  });

  it('handles plugins with no dependencies', () => {
    const plugins = [
      { id: 'a', dependencies: [] },
      { id: 'b', dependencies: [] },
    ];
    const order = topologicalSort(plugins);
    expect(order).toHaveLength(2);
    expect(order).toContain('a');
    expect(order).toContain('b');
  });

  it('handles empty input', () => {
    expect(topologicalSort([])).toEqual([]);
  });
});

describe('topologicalSort - error cases', () => {
  it('throws CircularDependencyError on circular deps', () => {
    const plugins = [
      { id: 'a', dependencies: ['b'] },
      { id: 'b', dependencies: ['a'] },
    ];
    expect(() => topologicalSort(plugins)).toThrow(CircularDependencyError);
  });

  it('throws on missing dependency', () => {
    const plugins = [{ id: 'a', dependencies: ['missing'] }];
    expect(() => topologicalSort(plugins)).toThrow(/missing dependency/i);
  });
});

describe('topologicalSort - complex graphs', () => {
  it('handles a longer chain correctly', () => {
    const plugins = [
      { id: 'd', dependencies: ['c'] },
      { id: 'c', dependencies: ['b'] },
      { id: 'b', dependencies: ['a'] },
      { id: 'a', dependencies: [] },
    ];
    const order = topologicalSort(plugins);
    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles a diamond dependency correctly', () => {
    const plugins = [
      { id: 'd', dependencies: ['b', 'c'] },
      { id: 'b', dependencies: ['a'] },
      { id: 'c', dependencies: ['a'] },
      { id: 'a', dependencies: [] },
    ];
    const order = topologicalSort(plugins);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
  });
});
