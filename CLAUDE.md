# Claude Instructions — Web Harvester

# Shell Rules

- Run ONE command at a time, never chain with &&
- Never source nvm.sh
- Use `git -C /path/to/repo` instead of `cd /path && git`
- pnpm, node, git are already in PATH

## Commands

```bash
pnpm test                 # run unit tests (vitest)
pnpm test:watch           # vitest in watch mode
pnpm test:coverage        # unit tests + coverage thresholds
pnpm test:browser         # browser-mode vitest
pnpm test:e2e             # build + playwright E2E
pnpm typecheck            # TypeScript type check
pnpm lint                 # ESLint (max-warnings 0)
pnpm lint:fix             # ESLint auto-fix
pnpm lint:dupes           # jscpd duplicate code detection (threshold: 0)
pnpm format               # Prettier auto-fix
pnpm format:check         # Prettier check only
pnpm build:chrome         # production build → dist/
pnpm dev                  # dev build (chrome, watch mode)
```

## TDD Development Cycle (strictly enforced)

For every piece of logic, follow this cycle without exception:

1. **Define** — understand exactly what the logic must do
2. **Test** — write the failing test first (Red)
3. **Implement** — write the minimum implementation to pass the test (Green)
4. **Verify** — run the test automatically after implementation
5. **Fix** — if the test fails, fix the implementation and re-run — repeat until it passes
6. **Refactor** — clean up while keeping tests green
7. **Quality gate** — run each check separately (never chain with &&):

   ```
   pnpm typecheck
   pnpm lint
   pnpm format:check
   pnpm test:coverage
   pnpm lint:dupes
   ```

8. **Fix** — if any quality check fails, fix it before moving on
9. **Commit** — once all tests and all quality checks pass, commit the changes with a descriptive commit message
10. **Repeat** — move to the next piece of logic

Never write implementation code before the test exists.
Never claim a task is complete without running tests AND quality checks and confirming all pass.
Never move to the next task while any test or quality check is failing.
Never skip the commit step — every passing cycle ends with a commit.

## ESLint Quirks

These rules trip up subagents — handle them proactively:

- **`jsdoc/require-jsdoc`** — every exported function, class, and interface needs a `/** ... */` JSDoc block
- **`sonarjs/void-use`** — `void somePromise()` is blocked; use `.catch(err => logger.error(...))` instead
- **`security/detect-object-injection`** — `obj[key]` on externally-supplied objects is flagged; guard with `Object.prototype.hasOwnProperty.call(obj, key)` before accessing
- **commitlint `subject-case`** — commit subjects must be fully lowercase, including acronyms (`mv3` not `MV3`, `fsa` not `FSA`)
- **`sonarjs/todo-tag`** — disabled globally; TODO comments are allowed

## TypeScript Path Aliases

Always use aliases — never relative paths from `src/`:

| Alias               | Resolves to            |
| ------------------- | ---------------------- |
| `@domain/*`         | `src/domain/*`         |
| `@application/*`    | `src/application/*`    |
| `@infrastructure/*` | `src/infrastructure/*` |
| `@presentation/*`   | `src/presentation/*`   |
| `@shared/*`         | `src/shared/*`         |
| `@core/*`           | `src/core/*`           |
| `@plugins/*`        | `src/plugins/*`        |

## Test Helpers

Pre-built helpers in `tests/helpers/` — use these, don't re-implement:

- **`MockAdapter`** (`tests/helpers/MockAdapter.ts`) — in-memory implementation of all 9 browser adapter interfaces (`ITabAdapter`, `IStorageAdapter`, `IRuntimeAdapter`, `INotificationAdapter`, `ICommandAdapter`, `IContextMenuAdapter`, `IActionAdapter`, `ISidePanelAdapter`, `IClipboardAdapter`). Methods: `getLocal`, `setLocal`, `removeLocal`, `getSync`, `setSync`, `removeSync`, `onChanged`, plus vi.fn() stubs for all event/action methods.
- **`mockFsaHandles`** (`tests/helpers/mockFsaHandles.ts`) — `createMockDirHandle()` for FSA unit tests

## Layer Rules

Respect Clean Architecture — never violate these import boundaries:

- `domain/` imports from `shared/` only
- `application/` imports from `domain/` and `shared/` only
- `presentation/` imports from `application/` and `shared/` only
- `infrastructure/` imports from `domain/`, `application/`, and `shared/`
- `shared/` imports from nothing
- `core/` (micro-kernel) imports from `shared/`, `domain/`, and `infrastructure/adapters/interfaces/` + `infrastructure/adapters/tokens` only (interface/token contracts only — never concrete infra; see ADR-015)
- `plugins/` import from `core/`, `domain/`, `application/`, and `shared/` only

These boundaries are enforced statically by `import/no-restricted-paths` in `eslint.config.ts` — `pnpm lint` will fail on any violation. Tests under `tests/` are exempt (fixtures may cross layers).

## Browser API Rule

`chrome.*` APIs appear **only** inside `src/infrastructure/adapters/chrome/ChromeAdapter.ts`.
No other file touches `chrome.*` directly — use the appropriate `I*Adapter` interface.
Enforced by `no-restricted-syntax` in `eslint.config.ts`.

## Catalog Rule

Before writing any new function or utility:

1. Search `docs/catalog/` for existing similar logic
2. Search the codebase with grep
3. If similar logic exists, extend it — never duplicate it
4. If new, add it to the catalog in the same task

## API Docs Rule

When adding or significantly changing a public-facing service, interface, or factory function:

1. Check `docs/api/` for an existing file covering that service
2. If it exists, update it in the same task
3. If it doesn't exist, create a new file in `docs/api/` in the same task

Internal helpers (unexported functions) do not need API docs.

## Architecture Rule

When making a non-obvious architectural decision (new pattern, significant design choice, tradeoff between approaches):

1. Write a new ADR in `docs/architecture/` in the same task
2. Continue the numbering sequence from the highest existing ADR number
3. Use the standard format: Context / Decision / Consequences

Minor implementation details do not need an ADR — only decisions with real tradeoffs.

## Plugin Rule

New features are implemented as plugins. Never modify existing plugin code to add a new feature — add a new plugin instead.

## No Hardcoded Strings

UI strings will go through `formatMessage()` (i18n) once `@formatjs/intl` is added (not yet installed). Until then, avoid hardcoding user-facing text in ways that will be hard to extract later.

## No console.log

Use the scoped logger (`createLogger('context-name')`) instead of `console.log` in all production code.
`console.*` is allowed only in `src/shared/logger.ts`. Enforced by `no-restricted-syntax` in `eslint.config.ts`.

## Decision Points

When a decision is needed from the user, always:

1. Present 2-3 options minimum
2. List pros and cons for each option
3. State a clear recommendation with reasoning
4. Never ask an open-ended question without options

## Code Quality

- No file longer than 400 lines — split if exceeded
- No function longer than 40 lines — extract if exceeded
- No `any` types — use `unknown` and narrow
- No default exports — named exports only
- No duplicate logic — search before creating

## context7 — Library Documentation

Before using any library API, fetch current docs via context7. Use these pre-resolved IDs:

| Library            | context7 ID                            | Notes                                |
| ------------------ | -------------------------------------- | ------------------------------------ |
| InversifyJS        | `/inversify/monorepo`                  | DI decorators, container, binding    |
| React              | `/websites/react_dev`                  | Hooks, components, React 19 APIs     |
| Vitest             | `/websites/main_vitest_dev`            | Test APIs, mocking, coverage config  |
| Vite               | `/vitejs/vite`                         | Build config, plugins                |
| Vite (v6 specific) | `/websites/v6_vite_dev`                | v6-specific config and APIs          |
| Playwright         | `/microsoft/playwright.dev`            | E2E, browser context, fixtures       |
| TypeScript         | `/microsoft/typescript`                | Utility types, strict mode, generics |
| TypeScript ESLint  | `/typescript-eslint/typescript-eslint` | ESLint rule config                   |

**When to query context7:**

- Writing InversifyJS decorators or container bindings
- Using React 19 APIs (especially new hooks or concurrent features)
- Configuring Vitest (coverage, mocking, browser mode)
- Vite plugin or build config changes
- Playwright test helpers or fixture patterns
- Any time you're unsure about a library's current API

## Superpowers Skills

Use these skills at the appropriate moments during implementation:

| Skill                                        | When to use                                                    |
| -------------------------------------------- | -------------------------------------------------------------- |
| `superpowers:systematic-debugging`           | Any test failure or unexpected behavior before proposing a fix |
| `superpowers:verification-before-completion` | Before marking any task complete or making success claims      |
| `superpowers:requesting-code-review`         | After completing a phase or major feature                      |
| `superpowers:brainstorming`                  | Before implementing anything with design choices               |
