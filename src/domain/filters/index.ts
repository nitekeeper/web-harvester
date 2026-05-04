// Filter registry barrel for the Web Harvester template engine.
//
// Provides the public `IFilterRegistry` contract along with
// `createPopulatedFilterRegistry()`, which returns a registry pre-populated
// with all pure (non-browser) filters ported from the the upstream source.
// Browser-only filters (markdown, html_to_json, strip_tags, …) are not
// registered here — they are injected by `BrowserFilterPlugin` at startup.

import { blockquote } from '@domain/filters/blockquote';
import { calc } from '@domain/filters/calc';
import { callout } from '@domain/filters/callout';
import { camel } from '@domain/filters/camel';
import { capitalize } from '@domain/filters/capitalize';
import { date } from '@domain/filters/date';
import { date_modify } from '@domain/filters/date_modify';
import { decode_uri } from '@domain/filters/decode_uri';
import { duration } from '@domain/filters/duration';
import { first } from '@domain/filters/first';
import { footnote } from '@domain/filters/footnote';
import { fragment_link } from '@domain/filters/fragment_link';
import { join } from '@domain/filters/join';
import { kebab } from '@domain/filters/kebab';
import { last } from '@domain/filters/last';
import { length } from '@domain/filters/length';
import { link } from '@domain/filters/link';
import { list } from '@domain/filters/list';
import { lower } from '@domain/filters/lower';
import { map } from '@domain/filters/map';
import { merge } from '@domain/filters/merge';
import { nth } from '@domain/filters/nth';
import { number_format } from '@domain/filters/number_format';
import { object } from '@domain/filters/object';
import { pascal } from '@domain/filters/pascal';
import { createFilterRegistry } from '@domain/filters/registry';
import type { FilterFn, IFilterRegistry } from '@domain/filters/registry';
import { replace } from '@domain/filters/replace';
import { reverse } from '@domain/filters/reverse';
import { round } from '@domain/filters/round';
import { safe_name } from '@domain/filters/safe_name';
import { slice } from '@domain/filters/slice';
import { snake } from '@domain/filters/snake';
import { split } from '@domain/filters/split';
import { strip_md } from '@domain/filters/strip_md';
import { table } from '@domain/filters/table';
import { title } from '@domain/filters/title';
import { trim } from '@domain/filters/trim';
import { uncamel } from '@domain/filters/uncamel';
import { unescape } from '@domain/filters/unescape';
import { unique } from '@domain/filters/unique';
import { upper } from '@domain/filters/upper';
import { wikilink } from '@domain/filters/wikilink';

export { createFilterRegistry } from '@domain/filters/registry';
export type { FilterFn, IFilterRegistry } from '@domain/filters/registry';

const PURE_FILTERS: ReadonlyArray<readonly [string, FilterFn]> = [
  ['blockquote', blockquote],
  ['calc', calc],
  ['callout', callout],
  ['camel', camel],
  ['capitalize', capitalize],
  ['date', date],
  ['date_modify', date_modify],
  ['decode_uri', decode_uri],
  ['duration', duration],
  ['first', first],
  ['footnote', footnote],
  ['fragment_link', fragment_link],
  ['join', join],
  ['kebab', kebab],
  ['last', last],
  ['length', length],
  ['link', link],
  ['list', list],
  ['lower', lower],
  ['map', map],
  ['merge', merge],
  ['nth', nth],
  ['number_format', number_format],
  ['object', object],
  ['pascal', pascal],
  ['replace', replace],
  ['reverse', reverse],
  ['round', round],
  ['safe_name', safe_name],
  ['slice', slice],
  ['snake', snake],
  ['split', split],
  ['strip_md', strip_md],
  ['stripmd', strip_md],
  ['table', table],
  ['title', title],
  ['trim', trim],
  ['uncamel', uncamel],
  ['unescape', unescape],
  ['unique', unique],
  ['upper', upper],
  ['wikilink', wikilink],
];

/**
 * Create a filter registry pre-populated with every pure (non-browser)
 * filter ported from the the upstream source. Browser-only filters
 * (`markdown`, `html_to_json`, `strip_tags`, etc.) are NOT registered
 * here — they are injected by `BrowserFilterPlugin` at startup.
 */
export function createPopulatedFilterRegistry(): IFilterRegistry {
  const reg = createFilterRegistry();
  for (const [name, fn] of PURE_FILTERS) reg.register(name, fn);
  return reg;
}
