// src/presentation/settings/sections/_aboutParts.tsx
//
// Re-export barrel for About sub-components.
// All implementation has been split into focused files:
//   _aboutShared.tsx  — shared constants and Eyebrow primitive
//   _aboutHero.tsx    — HeroNameRow, HeroCard
//   _aboutResources.tsx — ResourceRowDef, ResourceRow, ResourcesCard
//   _aboutDiag.tsx    — DiagnosticsBlockProps, DiagnosticsBlock, CopyButton, DiagFieldRows
//   _aboutLegal.tsx   — LegalBlockProps, LegalBlock

export { HeroCard } from './_aboutHero';
export type { ResourceRowDef } from './_aboutResources';
export { ResourcesCard } from './_aboutResources';
export { DiagnosticsBlock } from './_aboutDiag';
export { LegalBlock } from './_aboutLegal';
