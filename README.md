# Web Harvester

Web Harvester is a browser extension for Chrome and Firefox that lets you select any part of a web page, convert it to clean Markdown, and save it directly to a folder on your local filesystem — no account, no cloud, no intermediary app required.

## Features

- Select specific sections of a page using the visual picker
- Convert web content to Markdown automatically
- Save files directly to any local folder via the File System Access API
- Template engine with `{{variable|filter}}` syntax for custom file naming and formatting
- Highlight and annotate text on the page
- Reader mode for distraction-free reading
- Side panel UI with **Highlights** and **Reader** tabs for managing saved highlights and reader-mode settings
- Multi-destination support — save to different folders per clip, with editable/renamable destination labels
- Internationalization — localized UI in English, Korean, German, and Arabic (with right-to-left layout support)
- Customizable appearance — Light, Dark, System, and a Custom theme driven by your own CSS

## Prerequisites

Both Windows and macOS require the following tools before building:

- **Node.js 20** — [nodejs.org](https://nodejs.org)
- **pnpm** — install after Node.js using one of the methods below:

### macOS / Linux

```bash
npm install -g pnpm
```

### Windows (choose one)

```powershell
# Via npm
npm install -g pnpm

# Via PowerShell installer
Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression

# Via Winget
winget install pnpm.pnpm
```

---

## Building

Web Harvester ships builds for two browsers. Pick the script for your target:

| Browser | Build command        | Output folder   |
| ------- | -------------------- | --------------- |
| Chrome  | `pnpm build:chrome`  | `dist/`         |
| Firefox | `pnpm build:firefox` | `dist-firefox/` |

### macOS / Linux

```bash
# Install dependencies
pnpm install

# Build the Chrome extension
pnpm build:chrome

# Build the Firefox extension
pnpm build:firefox
```

The Chrome build lands in `dist/` and the Firefox build in `dist-firefox/`.

### Windows

Open **PowerShell** or **Command Prompt** and run the same commands:

```powershell
# Install dependencies
pnpm install

# Build the Chrome extension
pnpm build:chrome

# Build the Firefox extension
pnpm build:firefox
```

The Chrome build lands in `dist\` and the Firefox build in `dist-firefox\`.

> **Note for Windows users:** If you see a script execution policy error in PowerShell, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then retry.

---

## Installing into Chrome

You can install Web Harvester either using the pre-built output included in this repository, or by building it yourself from source.

### Option 1 — Use the pre-built output (no build required)

The `dist/` folder in this repository contains a ready-to-use build. You can clone the repo and load it directly into Chrome without installing Node.js or pnpm.

```bash
git clone https://github.com/nitekeeper/web-harvester.git
```

Then follow the steps below, pointing Chrome at the `dist/` folder inside the cloned directory.

### Option 2 — Build from source

Follow the [Prerequisites](#prerequisites) and [Building](#building) sections above to produce your own `dist/` folder from the source code.

### Loading into Chrome

Once you have the `dist/` folder (from either option):

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `dist/` folder
5. The Web Harvester icon will appear in your Chrome toolbar

To update after rebuilding from source, click the refresh icon on the Web Harvester card on the `chrome://extensions` page.

---

## Installing into Firefox

Build the Firefox extension into `dist-firefox/` (see [Building](#building)), then load it as a temporary add-on:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select the `manifest.json` file inside the `dist-firefox/` folder
4. The Web Harvester icon will appear in your Firefox toolbar

> Temporary add-ons are removed when Firefox restarts; reload them the same way after a restart or rebuild. You can lint the Firefox build with `pnpm lint:manifest` (runs `web-ext lint` against `dist-firefox/`).

---

## Supported and Planned Browsers

Web Harvester is available today for **Chrome** and **Firefox**. Support for additional browsers is planned:

- **Edge** — Chromium-based, minimal changes expected
- **Safari** — via the Safari Web Extension format

Browser-specific APIs sit behind a set of adapter interfaces (storage, tabs, runtime, notifications, context menus, side panel, and more) under `src/infrastructure/adapters/interfaces/`. A Chrome implementation of those interfaces lives in `src/infrastructure/adapters/chrome/`; adding a new target means providing an implementation against the same interfaces rather than touching core logic.

---

## Development

```bash
pnpm dev              # start dev build with file watching
pnpm test             # run unit tests
pnpm test:coverage    # run tests with coverage report
pnpm typecheck        # TypeScript type check
pnpm lint             # ESLint
```
