// src/presentation/settings/sections/_ui.ts
//
// Internal barrel re-exporting the shadcn UI primitives that every settings
// section uses. Lives next to the sections so the per-section import lists
// stay short — and so jscpd does not flag the otherwise-identical import
// blocks as duplicates.

export { Button } from '@presentation/components/ui/button';
export { Input } from '@presentation/components/ui/input';
export { Label } from '@presentation/components/ui/label';
export { Separator } from '@presentation/components/ui/separator';
export { Textarea } from '@presentation/components/ui/textarea';
