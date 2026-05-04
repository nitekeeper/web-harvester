# ADR-016: DOMPurify as a Single Sanitisation Choke-Point

**Status:** Accepted
**Date:** 2026-05-02

## Context

The design doc (Section 16, "Security Rules") mandates that all HTML rendered
in the UI must pass through DOMPurify, with no `innerHTML` assignments outside
sanitised contexts. The extension processes arbitrary untrusted web content —
clipped page bodies, user templates, plugin output — and renders preview panes
inside the popup, side panel, and settings UI. A single XSS payload that
bypasses sanitisation could exfiltrate page content, storage, or the user's
session.

The library choice itself is unambiguous: DOMPurify is the de-facto
browser-side HTML sanitiser, audited, well-maintained, and designed for
exactly this threat model. The actual decision is _how_ DOMPurify is invoked
across the codebase. Three options were considered:

- **Option A — call `DOMPurify.sanitize` directly at every render site.** Pros:
  no abstraction, every caller sees exactly what they're doing. Cons: every
  caller can also configure DOMPurify differently (or forget config entirely);
  tightening the global default later requires touching every call site;
  reviewers must inspect every `dangerouslySetInnerHTML` to verify the input
  was sanitised; no static enforcement is possible because the call surface
  is too broad to ban.
- **Option B — single wrapper function in `src/shared/sanitize.ts` + ESLint
  ban on direct `dompurify` imports elsewhere.** Pros: one configuration site,
  one audit target, one place to add allowlists or tighten defaults; ESLint
  blocks accidental direct usage at lint time, no review-only enforcement;
  the wrapper is in `shared/` so every layer (domain, application,
  infrastructure, presentation, plugins) can consume it without crossing
  layer boundaries (per ADR-001). Cons: one extra indirection; if a plugin
  ever needs a non-default profile (e.g. MathML allowed), it must add a
  second named export to the wrapper rather than configure DOMPurify
  in-place.
- **Option C — wrapper without ESLint enforcement.** Pros: less config. Cons:
  the rule survives only as long as code review catches violations — the same
  failure mode as before any of this work; relies entirely on humans, which
  is exactly what the architectural-boundary enforcement work in ADR-015 was
  designed to eliminate.

Option B was chosen. The cost is a one-line wrapper plus two ESLint config
blocks; the benefit is that the security-critical configuration lives in one
auditable file, and ESLint statically prevents the rule from being broken.

## Decision

A single function `sanitizeHtml(dirty: string): string` lives in
`src/shared/sanitize.ts`. It wraps `DOMPurify.sanitize` with the library
defaults, which already strip `<script>`, inline event handlers,
`javascript:` URLs, and the other dangerous tag/attribute combinations.

ESLint enforces the choke-point with two rules in `eslint.config.ts`:

- `no-restricted-imports` bans the `dompurify` package across `src/**` with a
  message pointing offenders to `@shared/sanitize`.
- A file-scoped carve-out at `src/shared/sanitize.ts` disables
  `no-restricted-imports` so the wrapper itself can import dompurify.

The wrapper lives in `shared/` because the dependency rule from ADR-001 says
`shared/` may import from nothing else in `src/`, but external packages
(dompurify is one) are not layer imports — they are dependencies. Placing the
wrapper in `shared/` lets every layer use it without violating boundaries.

Future profiles (e.g. plain-text-only, MathML-enabled) are added as new named
exports in the same file (`sanitizeHtmlAsText`, `sanitizeHtmlAllowMath`)
rather than as ad-hoc DOMPurify configurations at call sites. This keeps the
"one auditable file" guarantee intact even as policy diversifies.

## Consequences

The design doc's "All HTML rendered in UI must pass through DOMPurify" rule is
now enforceable in CI: any new file that imports `dompurify` directly fails
`pnpm lint` with `--max-warnings 0`, blocking commit and PR merge. Reviewers
no longer need to grep for `dangerouslySetInnerHTML` to confirm the input was
sanitised — the import boundary makes the wrapper the only path.

If a future requirement needs a sanitisation profile that's incompatible with
the single-default model (e.g. a plugin renders trusted third-party HTML
that needs `<style>` to survive), the response is to add a new named export
to `src/shared/sanitize.ts` with a clearly named function, not to relax the
ESLint rule. The choke-point is the contract; the profiles are the variation
point.

The wrapper is intentionally minimal — it does not currently expose
DOMPurify's `Config` parameter to callers. This is a deliberate choice that
matches Option B above: configuration centralisation is more valuable than
caller flexibility for a security primitive. If we ever expose `Config`, do
so via named profile functions, never as a raw passthrough.
