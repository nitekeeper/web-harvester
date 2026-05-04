# Code Quality Audit — Web Harvester

**Date:** YYYY-MM-DD
**Version:** x.y.z
**Auditor:** <!-- name -->

---

## Coverage Thresholds

| Metric     | Required | Actual                        | Status         |
| ---------- | -------- | ----------------------------- | -------------- |
| Statements | ≥ 90%    | <!-- from coverage report --> | <!-- ✅/❌ --> |
| Branches   | ≥ 85%    | <!-- from coverage report --> | <!-- ✅/❌ --> |
| Functions  | ≥ 90%    | <!-- from coverage report --> | <!-- ✅/❌ --> |
| Lines      | ≥ 90%    | <!-- from coverage report --> | <!-- ✅/❌ --> |

Source: `audits/reports/YYYY-MM-DD/coverage.json`

---

## Bundle Size

| Entry Point          | Limit  | Actual      | Status         |
| -------------------- | ------ | ----------- | -------------- |
| `dist/popup.js`      | 200 KB | <!-- KB --> | <!-- ✅/❌ --> |
| `dist/background.js` | 50 KB  | <!-- KB --> | <!-- ✅/❌ --> |
| `dist/content.js`    | 100 KB | <!-- KB --> | <!-- ✅/❌ --> |

Source: `pnpm size-limit` output in CI log.

---

## Dead Code

| Tool   | Findings                         | Status                        |
| ------ | -------------------------------- | ----------------------------- |
| `knip` | <!-- count of unused exports --> | <!-- ✅ none / ❌ N found --> |

Source: `knip` step in CI log.

---

## Duplicate Code

| Tool    | Duplication % | Threshold | Status         |
| ------- | ------------- | --------- | -------------- |
| `jscpd` | <!-- % -->    | 0%        | <!-- ✅/❌ --> |

Source: `jscpd` step in CI log.

---

## Complexity Scores

SonarJS complexity warnings are surfaced via ESLint. If ESLint passes, complexity is within threshold.

| Metric                | Source                                     | Status                                      |
| --------------------- | ------------------------------------------ | ------------------------------------------- |
| Cyclomatic complexity | ESLint `sonarjs/cognitive-complexity` rule | <!-- ✅ no violations / ❌ N violations --> |
| Cognitive complexity  | ESLint `sonarjs/cognitive-complexity` rule | <!-- ✅ no violations / ❌ N violations --> |

---

## Circular Dependencies

| Tool               | Findings                           | Status         |
| ------------------ | ---------------------------------- | -------------- |
| `madge --circular` | <!-- list any cycles or "none" --> | <!-- ✅/❌ --> |

---

## ESLint Summary

| Severity | Count                |
| -------- | -------------------- |
| Errors   | <!-- from CI log --> |
| Warnings | <!-- from CI log --> |

SARIF report: `audits/reports/YYYY-MM-DD/eslint.sarif`

---

## Type Coverage

TypeScript `strict` mode is enabled. Zero `any` types in production code. Enforced by ESLint `@typescript-eslint/no-explicit-any`.

| Metric                 | Status                        |
| ---------------------- | ----------------------------- |
| TypeScript strict mode | ✅ enabled in `tsconfig.json` |
| `any` types in `src/`  | <!-- 0 / N occurrences -->    |

---

## JSDoc Coverage on Public Interfaces

All exported functions and types in `src/domain/` and `src/application/` must have JSDoc comments.

| Status         | Details                               |
| -------------- | ------------------------------------- |
| <!-- ✅/❌ --> | <!-- output of `pnpm jsdoc-check` --> |

---

_Sign-off: <!-- name, date, version -->_
