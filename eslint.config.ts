import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import formatjs from 'eslint-plugin-formatjs';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

// Layer directory paths used by the boundary zone matrix below. Pulled into
// constants so each path string appears only once (sonarjs/no-duplicate-string).
const SHARED = './src/shared';
const DOMAIN = './src/domain';
const APPLICATION = './src/application';
const INFRASTRUCTURE = './src/infrastructure';
const PRESENTATION = './src/presentation';
const CORE = './src/core';
const PLUGINS = './src/plugins';

/**
 * Architectural layer boundary zones for `import/no-restricted-paths`.
 * Each zone says: a file in `target/` may not import from `from/`
 * (i.e. `target` is the importer's directory, `from` is the forbidden source).
 * The optional `except` list carves out subpaths of `from/` that remain allowed.
 *
 * The matrix mirrors ADR-001 (refined by ADR-015):
 *
 * - shared:        nothing else in src/
 * - domain:        shared
 * - application:   domain + shared
 * - presentation:  application + shared
 * - infrastructure: domain + application + shared
 * - core:          shared + domain + infra adapter interfaces/tokens
 * - plugins:       core + domain + application + shared
 */
const layerBoundaryZones = [
  // shared/ may not import anything else from src/
  { target: SHARED, from: DOMAIN },
  { target: SHARED, from: APPLICATION },
  { target: SHARED, from: INFRASTRUCTURE },
  { target: SHARED, from: PRESENTATION },
  { target: SHARED, from: CORE },
  { target: SHARED, from: PLUGINS },

  // domain/ may import from shared/ only
  { target: DOMAIN, from: APPLICATION },
  { target: DOMAIN, from: INFRASTRUCTURE },
  { target: DOMAIN, from: PRESENTATION },
  { target: DOMAIN, from: CORE },
  { target: DOMAIN, from: PLUGINS },

  // application/ may import from domain + shared only
  { target: APPLICATION, from: INFRASTRUCTURE },
  { target: APPLICATION, from: PRESENTATION },
  { target: APPLICATION, from: CORE },
  { target: APPLICATION, from: PLUGINS },

  // presentation/ may import from application + shared only
  { target: PRESENTATION, from: DOMAIN },
  { target: PRESENTATION, from: INFRASTRUCTURE },
  { target: PRESENTATION, from: CORE },
  { target: PRESENTATION, from: PLUGINS },

  // infrastructure/ may import from domain + application + shared only
  { target: INFRASTRUCTURE, from: PRESENTATION },
  { target: INFRASTRUCTURE, from: CORE },
  { target: INFRASTRUCTURE, from: PLUGINS },

  // core/ may import from shared + domain + infrastructure adapter interfaces/tokens only
  // (see ADR-015 for the carve-out for adapter contracts)
  {
    target: CORE,
    from: INFRASTRUCTURE,
    except: ['./adapters/interfaces/', './adapters/tokens.ts'],
  },
  { target: CORE, from: APPLICATION },
  { target: CORE, from: PRESENTATION },
  { target: CORE, from: PLUGINS },

  // plugins/ may import from core + domain + application + shared only
  { target: PLUGINS, from: INFRASTRUCTURE },
  { target: PLUGINS, from: PRESENTATION },
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  security.configs.recommended,
  sonarjs.configs.recommended,
  {
    plugins: {
      import: importPlugin,
      formatjs,
      jsdoc,
    },
    rules: {
      // Console
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Import order
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            {
              pattern: '@{domain,application,infrastructure,presentation,shared,core,plugins}/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // handled by TypeScript

      // SonarJS complexity
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      // Duplicate-code detection (pulled forward from phase 10):
      // catches copy-pasted function bodies during phases 4–9.
      'sonarjs/no-identical-functions': 'error',
      // sonarjs v2 + eslint v9 incompat: several decorated rules wrap base rules
      // and forward options as undefined, causing "Cannot read properties of
      // undefined (reading '<opt>')" crashes. Disable the decorators; the base
      // rules from eslint / @typescript-eslint still apply. Track upstream:
      // https://github.com/SonarSource/SonarJS/issues for v9 compat fixes.
      'sonarjs/no-empty-function': 'off',
      'sonarjs/no-unused-expressions': 'off',
      // Allow intentional task-tracker comments (e.g. "TODO(Task 15)") used to
      // mark cross-task work that is tracked separately in the project plan.
      'sonarjs/todo-tag': 'off',

      // FormatJS — enforce formatMessage() for all user-facing strings
      'formatjs/no-literal-string-in-jsx': 'error',
      'formatjs/enforce-id': 'error',
      'formatjs/enforce-default-message': 'error',

      // JSDoc — require on exported interfaces and functions
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: {
            FunctionDeclaration: false,
            MethodDefinition: false,
            ClassDeclaration: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration'],
        },
      ],
      'jsdoc/require-description': ['warn', { contexts: ['TSInterfaceDeclaration'] }],

      // Enforce CLAUDE.md: "Named exports only — no default exports"
      'import/no-default-export': 'error',

      // Enforce CLAUDE.md: "No file longer than 400 lines"
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],

      // Enforce CLAUDE.md: "No function longer than 40 lines"
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },
  {
    // Architectural boundary enforcement (ADR-001 + ADR-015).
    // Applied only to src/ — tests may freely cross layers to build fixtures.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          basePath: '.',
          zones: layerBoundaryZones,
        },
      ],
      // Ban direct chrome.* usage outside the single Chrome adapter.
      // The adapter file itself is exempted in a later config block.
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='chrome']",
          message:
            'chrome.* APIs are only allowed in src/infrastructure/adapters/chrome/ChromeAdapter.ts. Use the appropriate I*Adapter interface instead.',
        },
        {
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name=/^(log|debug|info|warn|error|trace|table|dir|group|groupEnd|count|time|timeEnd)$/]",
          message:
            'console.* is only allowed in src/shared/logger.ts. Use createLogger(scope) from @shared/logger instead.',
        },
      ],
      // Ban direct dompurify imports outside the sanctioned wrapper.
      // The wrapper file itself is exempted in a later config block.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'dompurify',
              message:
                'Import sanitizeHtml from @shared/sanitize instead. Direct use of dompurify is only allowed in src/shared/sanitize.ts (the single sanctioned sanitisation choke-point — see ADR-016).',
            },
          ],
        },
      ],
    },
  },
  {
    // Carve-out: the background service worker entry is the extension's
    // composition root and must wire concrete classes from every layer
    // (infrastructure/core/domain/plugins). See ADR-020.
    // The chrome.* and console.* bans remain in force; only the cross-layer
    // import-direction rule is relaxed for this entry point.
    files: ['src/presentation/background/**/*.ts'],
    rules: {
      'import/no-restricted-paths': 'off',
    },
  },
  {
    // Carve-out: bootstrapTheme.ts is the UI-page composition root for the
    // theme plugin and must wire concrete classes from infrastructure/core/plugins,
    // mirroring the same exception granted to the background entry (ADR-020).
    files: ['src/presentation/theme/bootstrapTheme.ts'],
    rules: {
      'import/no-restricted-paths': 'off',
    },
  },
  {
    // Carve-out: ChromeAdapter.ts is the single sanctioned consumer of chrome.*.
    files: ['src/infrastructure/adapters/chrome/ChromeAdapter.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name=/^(log|debug|info|warn|error|trace|table|dir|group|groupEnd|count|time|timeEnd)$/]",
          message:
            'console.* is only allowed in src/shared/logger.ts. Use createLogger(scope) from @shared/logger instead.',
        },
      ],
    },
  },
  {
    // Carve-out: logger.ts is the single sanctioned consumer of console.*.
    files: ['src/shared/logger.ts'],
    rules: {
      'no-console': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='chrome']",
          message:
            'chrome.* APIs are only allowed in src/infrastructure/adapters/chrome/ChromeAdapter.ts. Use the appropriate I*Adapter interface instead.',
        },
      ],
    },
  },
  {
    // Carve-out: sanitize.ts is the single sanctioned consumer of dompurify.
    files: ['src/shared/sanitize.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Config files conventionally use default exports (required by their tooling)
    files: ['*.config.ts', '*.config.js', '*.config.mjs'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    // Carve-out: shadcn-generated UI components are external/generated code and
    // are not held to our internal style rules (import order, JSDoc, JSX i18n,
    // file/function size, sonarjs complexity, etc.). Treat them like a vendored
    // third-party library.
    files: ['src/presentation/components/ui/**/*.{ts,tsx}'],
    rules: {
      'import/order': 'off',
      'import/no-default-export': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-description': 'off',
      'formatjs/no-literal-string-in-jsx': 'off',
      'formatjs/enforce-id': 'off',
      'formatjs/enforce-default-message': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-identical-functions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
);
