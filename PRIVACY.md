# Privacy Policy — Web Harvester

_Last updated: May 2026_

## Overview

Web Harvester is a browser extension that clips web content to Markdown and saves it to destinations you configure. This policy explains what data the extension accesses, how it is used, and how it is stored.

## Data We Collect

Web Harvester does not collect, transmit, or share any personal data. All data stays on your device.

### Data accessed during clipping

When you clip a page, the extension reads:

- The page URL and title
- The page content (HTML) to convert to Markdown
- Any text you have selected on the page
- Page metadata (author, date, description, and other `<meta>` tags if present)

This data is processed locally in your browser and written to a destination you have chosen (for example, a folder on your filesystem via the File System Access API). It is never sent to any external server.

### Data stored locally

The extension stores the following on your device using browser-provided storage (`chrome.storage.local` and IndexedDB):

| Data                                                        | Where                  | Purpose                                           |
| ----------------------------------------------------------- | ---------------------- | ------------------------------------------------- |
| Extension settings (theme, language, font size, custom CSS) | `chrome.storage.local` | Persist your preferences across sessions          |
| Destination configurations                                  | IndexedDB              | Remember the folders or locations you have set up |
| Note templates                                              | `chrome.storage.local` | Persist your custom templates                     |
| Page highlights                                             | `chrome.storage.local` | Remember highlights you have placed on pages      |

None of this data leaves your device.

## Data We Do Not Collect

- We do not collect analytics or usage data
- We do not use cookies
- We do not track your browsing history
- We do not transmit any data to external servers
- We do not use third-party analytics or advertising services

## Permissions

Web Harvester requests the following Chrome permissions:

| Permission       | Reason                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------- |
| `activeTab`      | Read the content of the page you are currently viewing when you activate the extension |
| `storage`        | Save your settings and highlights locally                                              |
| `scripting`      | Inject the content script that enables reader mode and highlighting                    |
| `contextMenus`   | Add a right-click menu item for clipping                                               |
| `sidePanel`      | Show the extension in the Chrome side panel                                            |
| `clipboardWrite` | Copy diagnostic information to the clipboard from the About page                       |
| `notifications`  | Notify you when a clip has been saved                                                  |
| `<all_urls>`     | Allow the content script to run on any page you choose to clip                         |

## Your Control Over Data

- You can delete all locally stored settings and highlights by removing the extension from Chrome (`chrome://extensions` → Remove)
- Destination data in IndexedDB is cleared when you remove the extension or clear browser storage from `chrome://settings/cookies`
- Files written to your filesystem by the extension are under your full control

## Changes to This Policy

If this policy changes materially, the updated version will be committed to the repository and the _Last updated_ date above will reflect the change.

## Contact

If you have questions about this policy, open an issue at the project repository.
