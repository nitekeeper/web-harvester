// src/presentation/background/background.ts
//
// Chrome MV3 background service worker — the extension's single composition
// root. Wires concrete adapters, application services, the plugin registry,
// and the six plugins together at startup. Bridge/adapter helpers live in
// `./bridges` and event-wiring helpers live in `./wiring`. See ADR-020 for
// the rationale behind the cross-layer imports.

import 'reflect-metadata';

import type { Container } from 'inversify';

import { ClipService, type IClipService } from '@application/ClipService';
import { HighlightService, type IHighlightService } from '@application/HighlightService';
import { ReaderService, type IReaderService } from '@application/ReaderService';
import {
  SettingsService,
  type AppSettings,
  type ISettingsService,
} from '@application/SettingsService';
import { type ITemplateService } from '@application/TemplateService';
import { createRootContainer } from '@core/container';
import { createPluginStorage } from '@core/context';
import { createHookSystem, type CoreHookSystem } from '@core/hooks';
import { createPluginRegistry, type PluginRegistry } from '@core/registry';
import { createUIRegistry } from '@core/ui-registry';
import type { IPlugin, IPluginContext, IUIRegistry } from '@domain/types';
import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import type { IStorageAdapter } from '@infrastructure/adapters/interfaces/IStorageAdapter';
import { TYPES } from '@infrastructure/adapters/tokens';
import { createDestinationStorage } from '@infrastructure/storage/destinations';
import { createSettingsStorage } from '@infrastructure/storage/settings';
import { ClipperPlugin } from '@plugins/clipper/ClipperPlugin';
import { HighlighterPlugin } from '@plugins/highlighter/HighlighterPlugin';
import { ReaderPlugin } from '@plugins/reader/ReaderPlugin';
import { SettingsPlugin } from '@plugins/settings/SettingsPlugin';
import { TemplatePlugin } from '@plugins/template/TemplatePlugin';
import { createLogger } from '@shared/logger';

import {
  buildClipHooksPort,
  buildHighlightHooksPort,
  buildNotificationsPort,
  buildTemplateService,
  saveToWithStringStrategy,
} from './bridges';
import {
  wireCommands,
  wireContextMenus,
  wireMessageListenerDeferred,
  wireOnInstalled,
  type MessageListenerServices,
} from './wiring';

const logger = createLogger('background');

// ── Service instantiation ────────────────────────────────────────────────────

/**
 * Bag of objects produced by `bootstrap()` and consumed by the wiring
 * helpers. Returned so tests (or future callers) can inspect the wired graph
 * without re-running bootstrap.
 */
export interface BackgroundContext {
  readonly container: Container;
  readonly hooks: CoreHookSystem;
  readonly ui: IUIRegistry;
  readonly registry: PluginRegistry;
  readonly settingsStorage: ReturnType<typeof createSettingsStorage>;
  readonly clipService: IClipService;
  readonly settingsService: ISettingsService;
  readonly templateService: ITemplateService;
  readonly highlightService: IHighlightService;
  readonly readerService: IReaderService;
}

/**
 * Constructs the five application services from the supplied container, hook
 * system, and storage facades. Returns a record of the freshly instantiated
 * services so the caller can bind them into the container.
 */
function createApplicationServices(args: {
  adapter: ChromeAdapter;
  hooks: CoreHookSystem;
  destinationStorage: Awaited<ReturnType<typeof createDestinationStorage>>;
}): {
  readonly clipService: IClipService;
  readonly settingsService: ISettingsService;
  readonly templateService: ITemplateService;
  readonly highlightService: IHighlightService;
  readonly readerService: IReaderService;
} {
  const { adapter, hooks, destinationStorage } = args;
  const settingsStoragePort = {
    get: (key: string): Promise<unknown> => adapter.getLocal(key),
    set: (key: string, value: unknown): Promise<void> => adapter.setLocal(key, value),
    onChanged: adapter.onChanged.bind(adapter),
  };
  const settingsService = new SettingsService(settingsStoragePort, hooks);
  const templateService = buildTemplateService(adapter, hooks);
  const highlightService = new HighlightService(adapter, buildHighlightHooksPort(hooks));
  const readerService = new ReaderService(adapter);
  const clipService = new ClipService(
    adapter,
    destinationStorage,
    buildClipHooksPort(hooks),
    buildNotificationsPort(adapter),
    saveToWithStringStrategy,
  );
  return { clipService, settingsService, templateService, highlightService, readerService };
}

// ── Container binding ────────────────────────────────────────────────────────

/**
 * Binds the freshly created services, hook system, UI registry, and plugin
 * registry into the supplied container under their `TYPES.*` tokens.
 */
function bindServices(
  container: Container,
  services: ReturnType<typeof createApplicationServices>,
  hooks: CoreHookSystem,
  ui: IUIRegistry,
  registry: PluginRegistry,
): void {
  container.bind(TYPES.IHookSystem).toConstantValue(hooks);
  container.bind(TYPES.IUIRegistry).toConstantValue(ui);
  container.bind(TYPES.IPluginRegistry).toConstantValue(registry);
  container.bind(TYPES.IClipService).toConstantValue(services.clipService);
  container.bind(TYPES.ISettingsService).toConstantValue(services.settingsService);
  container.bind(TYPES.ITemplateService).toConstantValue(services.templateService);
  container.bind(TYPES.IHighlightService).toConstantValue(services.highlightService);
  container.bind(TYPES.IReaderService).toConstantValue(services.readerService);
}

// ── Plugin context factory ───────────────────────────────────────────────────

/**
 * Builds a per-plugin `IPluginContext` factory that creates a namespaced
 * storage facade keyed on the plugin's id and threads through the shared
 * container, hook system, and UI registry.
 */
export function makeContextFactory(
  container: Container,
  hooks: CoreHookSystem,
  ui: IUIRegistry,
  adapter: IStorageAdapter,
): (plugin: IPlugin) => IPluginContext {
  return (plugin) => ({
    hooks,
    container,
    logger: createLogger(`plugin:${plugin.manifest.id}`),
    storage: createPluginStorage(plugin.manifest.id, adapter),
    ui,
  });
}

// ── Composition root ─────────────────────────────────────────────────────────

/**
 * Builds a fresh root container with one `ChromeAdapter` instance bound
 * under all nine adapter tokens. Returned alongside the adapter so the
 * bootstrap can pass it to other helpers without re-resolving the
 * container.
 */
function createContainerWithAdapters(): { adapter: ChromeAdapter; container: Container } {
  const adapter = new ChromeAdapter();
  const container = createRootContainer({
    storageAdapter: adapter,
    tabAdapter: adapter,
    runtimeAdapter: adapter,
    notificationAdapter: adapter,
    commandAdapter: adapter,
    contextMenuAdapter: adapter,
    actionAdapter: adapter,
    sidePanelAdapter: adapter,
    clipboardAdapter: adapter,
  });
  return { adapter, container };
}

/**
 * Composition root for the Chrome MV3 service worker. Wires concrete
 * adapters, application services, the plugin registry, and the six plugins,
 * then activates them all. Returns the wired graph so callers (and tests)
 * can inspect the result.
 */
export async function bootstrap(): Promise<BackgroundContext> {
  const { adapter, container } = createContainerWithAdapters();
  const hooks = createHookSystem();
  const ui = createUIRegistry();
  const settingsStorage = createSettingsStorage(adapter);

  // Register the message listener BEFORE any await so Chrome sees it even
  // when the service worker is restarted and the popup sends a preview request
  // during bootstrap (MV3 "receiving end does not exist" race condition).
  let resolveServices!: (s: MessageListenerServices) => void;
  const servicesPromise = new Promise<MessageListenerServices>((resolve) => {
    resolveServices = resolve;
  });
  wireMessageListenerDeferred(adapter, servicesPromise);

  const destinationStorage = await createDestinationStorage();

  const services = createApplicationServices({ adapter, hooks, destinationStorage });
  const registry = createPluginRegistry(makeContextFactory(container, hooks, ui, adapter));
  bindServices(container, services, hooks, ui, registry);

  registerPlugins(registry);
  await registry.activateAll();

  // Resolve after plugins are active so message handlers have the full hook
  // system available before processing the first preview request.
  resolveServices({
    clipService: services.clipService,
    storageAdapter: adapter,
  });

  wireOnInstalled(adapter, settingsStorage);
  await wireContextMenus(adapter, services.clipService);
  wireCommands(adapter, services.clipService);
  broadcastInitialSettings(services.settingsService, hooks);

  return { container, hooks, ui, registry, settingsStorage, ...services };
}

/**
 * Notifies subscribers once settings are loaded so plugins that tapped
 * `onSettingsChanged` during activation can observe the initial value.
 * Logs and swallows errors so a failed broadcast never breaks startup.
 */
function broadcastInitialSettings(settingsService: ISettingsService, hooks: CoreHookSystem): void {
  settingsService
    .get()
    .then((settings: AppSettings) => hooks.onSettingsChanged.call(settings))
    .catch((err: unknown) => {
      logger.error('Initial settings broadcast failed', err);
    });
}

/**
 * Registers the five background plugins into the supplied registry. Plugin
 * activation order is determined by the registry's topological sort over
 * `manifest.dependencies`, not by registration order here.
 * ThemePlugin is intentionally absent — it is a UI-only plugin activated
 * per-page via `bootstrapTheme()` in popup/settings/side-panel entry points.
 */
function registerPlugins(registry: PluginRegistry): void {
  registry.register(new ClipperPlugin());
  registry.register(new TemplatePlugin());
  registry.register(new HighlighterPlugin());
  registry.register(new ReaderPlugin());
  registry.register(new SettingsPlugin());
}

bootstrap().catch((err: unknown) => {
  logger.error('Background bootstrap failed', err);
});
