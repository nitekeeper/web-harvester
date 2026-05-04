// tests/e2e/clip-flow.spec.ts
//
// Full extension E2E for the popup happy path. Loads the built extension into
// a persistent Chromium context, opens the popup HTML inside an extension
// page, and asserts the destination selector mounts. The popup is opened via
// chrome-extension:// navigation rather than chrome.action.openPopup because
// the latter cannot be triggered from Playwright without user gestures.
//
// Note: MV3 service worker extensions can be flaky to load in headless mode,
// especially on WSL/CI runners without a system Chrome. The test waits for
// the service-worker event with a generous timeout; failures here usually
// indicate an environment limitation rather than a regression in the popup
// shell — the same UI is also covered by the browser-mode component tests in
// `tests/browser/popup/`.

import path from 'node:path';

import { chromium, expect, test } from '@playwright/test';

const EXTENSION_PATH = path.resolve('./dist');
const SW_TIMEOUT_MS = 15_000;

test.describe('clip flow', () => {
  test('opens the popup html and renders the destination selector', async () => {
    // Use the bundled `chromium` channel so the test runs without a system
    // Chrome install and supports MV3 extensions in the new headless mode.
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--no-sandbox`,
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      // Wait for the service worker so the extension id becomes resolvable.
      let [serviceWorker] = context.serviceWorkers();
      serviceWorker ??= await context.waitForEvent('serviceworker', {
        timeout: SW_TIMEOUT_MS,
      });

      const extensionId = serviceWorker.url().split('/')[2];
      expect(extensionId).toBeDefined();

      const popup = await context.newPage();
      await popup.goto(
        `chrome-extension://${String(extensionId)}/src/presentation/popup/popup.html`,
      );
      await popup.waitForLoadState('domcontentloaded');

      const destSelector = popup.getByTestId('destination-selector');
      await expect(destSelector).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
