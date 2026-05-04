// Public barrel for the Web Harvester template engine.
//
// Application-layer code should import from this module rather than reaching
// into individual files (`compiler.ts`, `renderer.ts`, etc.).

export { compileTemplate } from '@domain/template/compiler';
export type { TemplateVariables, CompileResult, CompileError } from '@domain/template/compiler';
export { render, renderAST } from '@domain/template/renderer';
export type {
  RenderContext,
  RenderOptions,
  RenderResult,
  RenderError,
  AsyncResolver,
} from '@domain/template/renderer';
export { parse, parseTokens } from '@domain/template/parser';
export { tokenize, formatToken, formatError } from '@domain/template/tokenizer';
