// Module declaration for `turndown-plugin-gfm`, which ships JS only.
// See https://github.com/mixmark-io/turndown-plugin-gfm
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';

  /** Applies the full GFM (GitHub-Flavored Markdown) plugin to a TurndownService. */
  export function gfm(service: TurndownService): void;
  /** Applies only the strikethrough rule. */
  export function strikethrough(service: TurndownService): void;
  /** Applies only the tables rule. */
  export function tables(service: TurndownService): void;
  /** Applies only the task list items rule. */
  export function taskListItems(service: TurndownService): void;
}
