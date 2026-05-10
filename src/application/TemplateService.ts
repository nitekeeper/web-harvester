// src/application/TemplateService.ts
//
// Application-layer facade for the user's clip templates. Wraps a template
// storage port with CRUD operations and exposes a `render()` method that
// composes the injected `compileTemplate` function with the
// `onTemplateRender` waterfall hook so plugins can post-process the rendered
// output before it is returned to the caller.
//
// Stays inside the application layer's allowed import surface (only `domain/`
// and `shared/`) — all infrastructure dependencies (`compileTemplate`, the
// hook system, the storage backend) are accepted through locally-defined
// port interfaces. See ADR-001 / ADR-017.

import { DEFAULT_TEMPLATE } from '@domain/templates/defaultTemplate';
import type { ILogger } from '@domain/types';
import { createLogger } from '@shared/logger';
import { SYSTEM_TEMPLATES } from '@shared/systemTemplates';
import type { TemplateConfig } from '@shared/types';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Variable bag passed to a template at render time. Mirrors the shape used by
 * the underlying `compileTemplate` — a string-keyed map whose values are the
 * raw extractor output (typically strings, but kept as `unknown` so callers
 * can supply richer types like dates or numbers without a cast).
 */
export type TemplateVariables = Record<string, unknown>;

/**
 * Result of a single render. `output` is the final rendered string (after
 * the `onTemplateRender` hook); `ok` reflects whether `compileTemplate`
 * reported any errors; `errors` is the raw error list from the compiler so
 * callers can decide how to surface failures.
 */
export interface CompileResult {
  /** `true` when the underlying compile produced no errors. */
  readonly ok: boolean;
  /** Final rendered output, possibly transformed by the `onTemplateRender` hook. */
  readonly output: string;
  /** Compile errors emitted by the injected `compileTemplate`, untouched. */
  readonly errors: readonly unknown[];
}

/**
 * Function signature for the injected template compiler. Matches the shape
 * the test fixture and `@domain/template/compiler.ts` produce: takes the
 * combined template source plus the variable bag and returns (or resolves
 * to) a `CompileResult`. Defined as a constructor parameter so the service
 * stays inside the application layer's allowed import surface.
 */
export type CompileTemplateFn = (
  template: string,
  variables: TemplateVariables,
) => CompileResult | Promise<CompileResult>;

// ── Port interfaces (subset used by this service) ─────────────────────────────

/**
 * Minimal template storage port required by `TemplateService`. Mirrors the
 * key/value surface of a typical `IPluginStorage`-like adapter — defined
 * locally so this service does not import from the infrastructure layer.
 */
export interface ITemplateStoragePort {
  /** Resolves to the template stored under `key`, or `undefined` when absent. */
  get(key: string): Promise<TemplateConfig | undefined>;
  /** Resolves to every persisted template in insertion order. */
  getAll(): Promise<TemplateConfig[]>;
  /** Persists `value` under `key`, overwriting any existing entry. */
  set(key: string, value: TemplateConfig): Promise<void>;
  /** Removes the template stored under `key`; a no-op when absent. */
  remove(key: string): Promise<void>;
}

/**
 * Local hook port describing the single waterfall hook this service emits.
 * Mirrors the relevant slice of `IHookSystem` from `@core/hooks` — defined
 * here because `application/` cannot import from `core/`, and the
 * placeholder `IHookSystem` in `@domain/types` exposes hooks only as
 * `unknown`.
 */
export interface ITemplateHooksPort {
  readonly onTemplateRender: {
    /** Run all registered taps in priority order, returning the final string. */
    call(value: string): Promise<string>;
  };
}

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Public surface of the template service. CRUD over template storage plus a
 * `render()` method that composes the injected compiler with the
 * `onTemplateRender` waterfall hook so plugins can transform the result.
 */
export interface ITemplateService {
  /**
   * Returns the user's default template. Falls back to `DEFAULT_TEMPLATE`
   * when no templates have been saved; otherwise returns the first stored
   * template (insertion order).
   */
  getDefault(): Promise<TemplateConfig>;
  /** Returns every persisted template. */
  getAll(): Promise<TemplateConfig[]>;
  /** Returns a template by id, or `undefined` when none matches. */
  getById(id: string): Promise<TemplateConfig | undefined>;
  /** Persists a template, overwriting any existing entry with the same id. */
  save(template: TemplateConfig): Promise<void>;
  /** Removes the template with the given id; a no-op when absent. */
  remove(id: string): Promise<void>;
  /**
   * Renders the template with the given id against `variables`. Throws
   * `TemplateNotFoundError` when no template matches. The rendered output
   * is passed through the `onTemplateRender` waterfall hook before it is
   * returned, so plugins can post-process the result.
   */
  render(id: string, variables: TemplateVariables): Promise<CompileResult>;
}

// ── Errors ────────────────────────────────────────────────────────────────────

/**
 * Thrown by `render()` when the supplied template id does not match any
 * persisted template.
 */
export class TemplateNotFoundError extends Error {
  /**
   * @param templateId - The id that was looked up but not found.
   */
  constructor(templateId: string) {
    super(`Template "${templateId}" was not found`);
    this.name = 'TemplateNotFoundError';
  }
}

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Combines a template's frontmatter and body sections into a single source
 * string for the compiler. The frontmatter (when present) is wrapped with
 * `---` fences when not already fenced (new-format templates store raw YAML
 * lines; legacy DEFAULT_TEMPLATE includes fences directly).
 */
function combineTemplateSource(template: TemplateConfig): string {
  if (template.frontmatterTemplate.length === 0) {
    return template.bodyTemplate;
  }
  const fm = template.frontmatterTemplate;
  const fenced = fm.startsWith('---') ? fm : `---\n${fm}\n---`;
  return `${fenced}\n\n${template.bodyTemplate}`;
}

/**
 * Application service that owns the user's clip templates. Provides simple
 * CRUD over the injected storage port plus a `render()` method that runs the
 * injected `compileTemplate` and fans the result through the
 * `onTemplateRender` waterfall hook so plugins can transform the output.
 */
export class TemplateService implements ITemplateService {
  /**
   * @param storage - Template storage port for persistence.
   * @param hooks - Hook port exposing `onTemplateRender` for plugin notifications.
   * @param compileTemplate - Compiler function injected to keep this service inside the application layer.
   * @param logger - Scoped logger; defaults to a `TemplateService`-scoped logger.
   */
  constructor(
    private readonly storage: ITemplateStoragePort,
    private readonly hooks: ITemplateHooksPort,
    private readonly compileTemplate: CompileTemplateFn,
    private readonly logger: ILogger = createLogger('TemplateService'),
  ) {}

  /**
   * Returns the user's default template. When no templates are stored the
   * built-in `DEFAULT_TEMPLATE` is returned; otherwise the first stored
   * template (insertion order) is treated as the default.
   */
  async getDefault(): Promise<TemplateConfig> {
    const all = await this.storage.getAll();
    const first = all[0];
    if (first === undefined) {
      this.logger.debug('No stored templates — returning built-in default');
      return DEFAULT_TEMPLATE;
    }
    return first;
  }

  /** Returns every persisted template in insertion order. */
  async getAll(): Promise<TemplateConfig[]> {
    return this.storage.getAll();
  }

  /** Returns the template stored under `id`. Checks built-in system templates first, then user storage. */
  async getById(id: string): Promise<TemplateConfig | undefined> {
    const system = SYSTEM_TEMPLATES.find((t) => t.id === id);
    if (system !== undefined) return system;
    return this.storage.get(id);
  }

  /**
   * Persists `template` under its own `id`, overwriting any existing entry
   * with the same id.
   */
  async save(template: TemplateConfig): Promise<void> {
    await this.storage.set(template.id, template);
    this.logger.debug(`Template "${template.id}" saved`);
  }

  /**
   * Removes the template stored under `id`. A no-op when no template matches.
   */
  async remove(id: string): Promise<void> {
    await this.storage.remove(id);
    this.logger.debug(`Template "${id}" removed`);
  }

  /**
   * Renders the template identified by `id` against `variables`. Steps:
   *   1. Resolve the template — throws `TemplateNotFoundError` if missing.
   *   2. Combine frontmatter + body into a single source string.
   *   3. Invoke the injected `compileTemplate` and await its result.
   *   4. Pass the rendered output through `onTemplateRender` so plugins can
   *      transform it.
   *   5. Return a `CompileResult` carrying the (possibly transformed) output
   *      and the compiler's error list unchanged.
   */
  async render(id: string, variables: TemplateVariables): Promise<CompileResult> {
    const systemTemplate = SYSTEM_TEMPLATES.find((t) => t.id === id);
    let template: TemplateConfig | undefined = systemTemplate ?? (await this.storage.get(id));
    if (!template) {
      if (id === DEFAULT_TEMPLATE.id) {
        this.logger.debug('render: id matches built-in default — using DEFAULT_TEMPLATE');
        template = DEFAULT_TEMPLATE;
      } else {
        throw new TemplateNotFoundError(id);
      }
    }

    const source = combineTemplateSource(template);
    const compiled = await this.compileTemplate(source, variables);
    const finalOutput = await this.hooks.onTemplateRender.call(compiled.output);

    return {
      ok: compiled.ok,
      output: finalOutput,
      errors: compiled.errors,
    };
  }
}
