# Web Harvester

Web Harvester is a Chrome extension that lets you select any part of a web page, convert it to clean Markdown, and save it directly to a folder on your local filesystem — no account, no cloud, no intermediary app required.

## Features

- Select specific sections of a page using the visual picker
- Convert web content to Markdown automatically
- Save files directly to any local folder via the File System Access API
- Template engine with `{{variable|filter}}` syntax for custom file naming and formatting
- Highlight and annotate text on the page
- Reader mode for distraction-free reading
- Multi-destination support — save to different folders per clip

## Prerequisites

Both Windows and macOS require the following tools before building:

- **Node.js 20** — [nodejs.org](https://nodejs.org)
- **pnpm** — install after Node.js with `npm install -g pnpm`

---

## Building

### macOS

```bash
# Install dependencies
pnpm install

# Build the Chrome extension
pnpm build:chrome
```

The built extension will be in the `dist/` folder.

### Windows

Open **PowerShell** or **Command Prompt** and run the same commands:

```powershell
# Install dependencies
pnpm install

# Build the Chrome extension
pnpm build:chrome
```

The built extension will be in the `dist\` folder.

> **Note for Windows users:** If you see a script execution policy error in PowerShell, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then retry.

---

## Installing into Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `dist/` folder inside the project directory
5. The Web Harvester icon will appear in your Chrome toolbar

To update after rebuilding, click the refresh icon on the Web Harvester card on the `chrome://extensions` page.

---

## Future Browser Support

Web Harvester is currently available for Chrome. Support for additional browsers is planned, including:

- **Firefox** — via the WebExtensions API
- **Edge** — Chromium-based, minimal changes required
- **Safari** — via the Safari Web Extension format

The codebase is built on a browser adapter layer that abstracts all browser-specific APIs, making it straightforward to add new targets without touching core logic.

---

## Development

```bash
pnpm dev              # start dev build with file watching
pnpm test             # run unit tests
pnpm test:coverage    # run tests with coverage report
pnpm typecheck        # TypeScript type check
pnpm lint             # ESLint
```
