/**
 * Core barrel re-exporting DI tokens for plugin code. Plugins are forbidden
 * (by ESLint layer rules) from importing directly from `@infrastructure/`, so
 * this module provides the tokens via the `@core/` alias which plugins are
 * allowed to import.
 */
export { TYPES } from '@infrastructure/adapters/tokens.js';
