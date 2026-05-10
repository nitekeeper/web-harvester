// src/presentation/settings/sections/_aboutParts.tsx
//
// Re-export barrel for About sub-components.
// All implementation has been split into focused files:
//   _aboutShared.tsx  — shared constants and Eyebrow primitive
//   _aboutHero.tsx    — HeroNameRow, HeroCard
//   _aboutResources.tsx — ResourceRowDef, ResourceRow, ResourcesCard
//   _aboutDiag.tsx    — DiagnosticsBlockProps, DiagnosticsBlock, CopyButton, DiagFieldRows
//   _aboutLegal.tsx   — LegalBlockProps, LegalBlock

export { C, BORDER_1, MONO, COPY_FLASH_MS, DIAG_LABELS, Eyebrow } from './_aboutShared';
export { HeroNameRow, HeroCard } from './_aboutHero';
export type { ResourceRowDef } from './_aboutResources';
export { ResourceRow, ResourcesCard } from './_aboutResources';
export { CopyButton, DiagFieldRows } from './_aboutDiag';
export type { DiagnosticsBlockProps } from './_aboutDiag';
export { DiagnosticsBlock } from './_aboutDiag';
export type { LegalBlockProps } from './_aboutLegal';
export { LegalBlock } from './_aboutLegal';
