# Extension Security Checklist — Web Harvester

**Date:** YYYY-MM-DD
**Version:** x.y.z
**Auditor:** <!-- name -->

Checklist specific to Chrome MV3 extensions that write files to disk and process untrusted web content.

---

## Manifest Security

- [ ] `content_security_policy.extension_pages` is set and does not contain `unsafe-inline` or `unsafe-eval`
- [ ] `content_security_policy.sandbox` is set if any sandboxed pages exist
- [ ] `host_permissions` lists only the minimum required origins — no `<all_urls>` without justification
- [ ] `permissions` follows least-privilege — every declared permission has a documented use-case in ADRs
- [ ] `web_accessible_resources` exposes only files that must be accessible to web pages, with `matches` scoped to the minimum required origin pattern

**Verification:** `web-ext lint --source-dir src/` in CI passes with no warnings.

---

## Code Execution Safety

- [ ] No `eval()` anywhere in `src/`
  - Verified by: ESLint `no-eval` rule (errors, not warnings)
  - Verified by: CSP `script-src` blocks runtime eval at browser level
- [ ] No `new Function()` anywhere in `src/`
  - Verified by: ESLint `no-new-func` rule
- [ ] No `setTimeout(string, ...)` or `setInterval(string, ...)`
  - Verified by: ESLint `no-implied-eval` rule
- [ ] No dynamic `<script>` tag injection
  - Verified by: ESLint `no-script-url` rule + code review

---

## HTML Sanitization

- [ ] Every `innerHTML` assignment calls `sanitizeHTML()` from `src/shared/sanitize.ts`
- [ ] Every React `dangerouslySetInnerHTML` prop wraps value with `sanitizeHTML()`
- [ ] No raw HTML string concatenation passed to DOM APIs
  - Verified by: ESLint custom rule blocking direct `innerHTML` assignment (see `eslint.config.ts`)
- [ ] DOMPurify ALLOWED_TAGS and ALLOWED_ATTR are reviewed and match the minimum needed for markdown rendering
- [ ] `FORBID_SCRIPTS: true` is set in the DOMPurify config in `sanitize.ts`

---

## Message Passing (Content Script ↔ Background SW)

- [ ] Every `chrome.runtime.sendMessage` call sends a message typed by a Zod schema
- [ ] Background SW validates `sender.id === chrome.runtime.id` before processing any message
- [ ] Unknown/invalid message shapes are rejected with a typed error response — never silently dropped
- [ ] No message handler accepts arbitrary `any`-typed payloads
- [ ] Message schemas are defined in `src/shared/messages/` — never inline in handlers

---

## File System Access (FSA) Permission Lifecycle

- [ ] Directory handle is obtained only through `showDirectoryPicker()` — never constructed programmatically
- [ ] `queryPermission({ mode: 'readwrite' })` is called before every write operation
- [ ] If permission is `'prompt'`, `requestPermission()` is called and result is checked before proceeding
- [ ] Directory handles are stored only in-memory (React state or application layer) — never serialized to `chrome.storage.sync`
- [ ] `chrome.storage.local` stores only the display name of the chosen directory, not the handle itself
- [ ] No file write proceeds if permission check returns `'denied'` — operation is aborted and user is notified

---

## Secrets and Sensitive Data

- [ ] No API keys, tokens, or passwords in any file under `src/`
  - Verified by: `gitleaks detect` in CI
- [ ] No secrets in `package.json`, `.env.*`, or config files tracked by git
- [ ] `chrome.storage.local` stores no sensitive data — only user preferences
- [ ] Log output (via scoped logger) does not include file content, only metadata

---

## Supply Chain

- [ ] All dependencies are pinned in `pnpm-lock.yaml`
- [ ] `npm audit --audit-level=high` passes in CI
- [ ] Snyk deep scan passes in CI (no high/critical vulnerabilities)
- [ ] License compatibility check passes — only permissive licenses in production dependencies

---

_Sign-off: <!-- name, date, version -->_
