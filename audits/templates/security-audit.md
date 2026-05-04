# Security Audit — Web Harvester

<!-- Fill in date and version when copying to audits/reports/YYYY-MM-DD/ -->

**Date:** YYYY-MM-DD
**Version:** x.y.z
**Standard:** OWASP ASVS Level 3
**Auditor:** <!-- name -->

---

## Status Legend

- ✅ Pass — requirement met
- ⚠️ Adapted — requirement met via equivalent control (see reason)
- ➖ N/A — not applicable to this extension (see reason)
- ❌ Fail — requirement not met (open finding)

---

## V1 — Architecture, Design and Threat Modeling

| ID   | Requirement                                             | Status          | Notes                                                                           |
| ---- | ------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| V1.1 | Clean Architecture layer boundaries enforced            | ✅              | ESLint `import/no-restricted-paths` rule enforces layer boundaries at lint time |
| V1.2 | All inter-component interfaces are typed and documented | ✅              | All domain interfaces use named TypeScript types; JSDoc on public exports       |
| V1.3 | Threat model documented for extension attack surface    | <!-- status --> | <!-- notes -->                                                                  |
| V1.4 | All third-party dependencies reviewed for security      | ✅              | `npm audit` and Snyk scan run on every PR                                       |

---

## V2 — Authentication

| ID   | Requirement                     | Status | Notes                                                                                                                                                                               |
| ---- | ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2.x | All authentication requirements | ➖     | Web Harvester v1 has no user authentication. The extension writes to local disk only — there is no server, no login, and no credential storage. Revisit if a sync feature is added. |

---

## V3 — Session Management

| ID   | Requirement                         | Status | Notes                                                                                                                              |
| ---- | ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| V3.x | All session management requirements | ➖     | No session state exists. The extension is stateless between browser restarts except for settings stored in `chrome.storage.local`. |

---

## V4 — Access Control

| ID   | Requirement                                                   | Status | Notes                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V4.1 | Users can only access resources they are authorized for       | ✅     | The File System Access API requires an explicit user directory-picker gesture before any file write. The extension cannot write to disk without the user choosing a directory in the current session. |
| V4.2 | Directory handle is never persisted without explicit re-grant | ✅     | `queryPermission()` is called on each use; handles are never stored in `chrome.storage.sync` or any server.                                                                                           |
| V4.3 | No path traversal possible                                    | ✅     | All writes go through `saveTo()` in `src/infrastructure/fsa/fsa.ts` which accepts only a filename (no slashes). Validated by Zod schema before reaching FSA.                                          |

---

## V5 — Validation, Sanitization and Encoding

| ID   | Requirement                               | Status | Notes                                                                                                                                        |
| ---- | ----------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| V5.1 | All inputs validated with an allow-list   | ✅     | All messages between content script and background SW are typed with Zod schemas. Unknown message shapes are rejected before processing.     |
| V5.2 | All HTML output sanitized with DOMPurify  | ✅     | `sanitizeHTML()` from `src/shared/sanitize.ts` is the only approved path to render HTML. ESLint rule blocks direct `innerHTML` assignment.   |
| V5.3 | No use of `eval()` or `new Function()`    | ✅     | Blocked by ESLint `no-eval` and `no-new-func` rules. CSP `script-src` in manifest also blocks runtime eval at the browser level.             |
| V5.4 | Output encoding applied where appropriate | ⚠️     | Extension renders inside its own origin (popup/side-panel). DOMPurify sanitization is the primary control. No server-side rendering surface. |

---

## V6 — Cryptography

| ID   | Requirement                   | Status | Notes                                                                                               |
| ---- | ----------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| V6.x | All cryptography requirements | ➖     | No cryptographic operations in v1. All data is local. Revisit if sync or export features are added. |

---

## V7 — Error Handling and Logging

| ID   | Requirement                                                     | Status | Notes                                                                                                                                            |
| ---- | --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| V7.1 | Error handling at all trust boundaries                          | ✅     | Four layers: `window.onerror` global handler, React Error Boundaries at app root, plugin-level error boundaries, and hook-level error isolation. |
| V7.2 | Error messages do not leak internal state to untrusted contexts | ✅     | Error objects are logged via scoped logger; user-facing messages use i18n keys, never raw stack traces.                                          |
| V7.3 | No `console.log` in production code                             | ✅     | ESLint `no-console` rule blocks `console.*`; scoped logger is the only approved logging path.                                                    |

---

## V8 — Data Protection

| ID   | Requirement                                      | Status | Notes                                                                                                                       |
| ---- | ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| V8.1 | No plaintext secrets stored                      | ✅     | No secrets exist in v1. Settings stored in `chrome.storage.local` contain only user preferences (paths, conflict strategy). |
| V8.2 | Sensitive data not logged                        | ✅     | Logger excludes file content from log output. Only metadata (filename, destination, status) is logged.                      |
| V8.3 | Data minimization — only necessary data retained | ✅     | Extension stores only destination directory preferences. No clipboard history, no page content is persisted.                |

---

## V9 — Communications

| ID   | Requirement                                 | Status | Notes                                                                                           |
| ---- | ------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| V9.1 | All internal messages validated             | ✅     | Zod schemas validate every `chrome.runtime.sendMessage` payload in both directions.             |
| V9.2 | No outbound HTTP calls to external services | ✅     | Manifest `host_permissions` lists no external origins. CSP `connect-src` blocks external fetch. |
| V9.3 | Message sender verified                     | ✅     | Background SW verifies `sender.id === chrome.runtime.id` before processing any message.         |

---

## V10 — Malicious Code

| ID    | Requirement                                        | Status | Notes                                                                                        |
| ----- | -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| V10.1 | No `eval()` or `new Function()`                    | ✅     | ESLint `no-eval`, `no-new-func` rules + CSP enforcement in manifest.                         |
| V10.2 | No dynamic code execution via `setTimeout(string)` | ✅     | ESLint `no-implied-eval` rule blocks this pattern.                                           |
| V10.3 | All rendered HTML sanitized                        | ✅     | DOMPurify `sanitizeHTML()` is mandatory before any `innerHTML` or `dangerouslySetInnerHTML`. |
| V10.4 | Dependency integrity verified                      | ✅     | `pnpm-lock.yaml` locks exact versions; Snyk scans for known malicious packages on every PR.  |

---

## V11 — Business Logic

| ID    | Requirement                             | Status | Notes                                                                                                                                                                                                                                 |
| ----- | --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V11.1 | No silent data overwrites               | ✅     | File conflict strategy is user-configurable (skip, overwrite, rename). Default is `rename`. No operation proceeds without the user-chosen strategy being applied.                                                                     |
| V11.2 | Business logic flows cannot be bypassed | ✅     | Clean Architecture enforces that all file writes pass through the application layer use-case, which applies conflict strategy before calling FSA. Direct calls to FSA from the presentation layer are blocked by ESLint import rules. |

---

## V13 — API and Web Service Security

| ID    | Requirement                      | Status | Notes                                           |
| ----- | -------------------------------- | ------ | ----------------------------------------------- |
| V13.x | All API/web service requirements | ➖     | No backend API in v1. All operations are local. |

---

## V14 — Configuration

| ID    | Requirement                                  | Status | Notes                                                                                                                                 |
| ----- | -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| V14.1 | CSP configured in manifest                   | ✅     | `content_security_policy` in `manifest.json` uses strict-dynamic or explicit source allowlists. No `unsafe-inline`, no `unsafe-eval`. |
| V14.2 | Extension permissions follow least-privilege | ✅     | Only `storage`, `scripting`, `activeTab`, and `sidePanel` declared. No `<all_urls>` host permissions.                                 |
| V14.3 | No secrets in source code                    | ✅     | `gitleaks` scans every commit. No API keys, tokens, or passwords exist in codebase.                                                   |

---

## Open Findings

| ID             | Severity                 | Description          | Owner         | Due           |
| -------------- | ------------------------ | -------------------- | ------------- | ------------- |
| <!-- F-001 --> | <!-- High/Medium/Low --> | <!-- description --> | <!-- name --> | <!-- date --> |

---

_Sign-off: <!-- name, date, version -->_
