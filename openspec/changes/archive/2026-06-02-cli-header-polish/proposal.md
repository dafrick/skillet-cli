## Why

The initial branding implementation produced headers that were visually crowded: the full header had no breathing room before the wordmark, and the light header included a version number that added noise without meaningful value for end users. The description was also rendered inconsistently — always allocating a line even when absent.

## What Changes

- Full header (install/update): add a leading blank line before the wordmark; render `pkg.description` between the wordmark and attribution only when present
- Light header (list/uninstall): remove `pkg.version` from the title; render description inline with the name as `NAME - description` only when `pkg.description` is set
- Both headers: when `pkg.description` is absent, no description line or separator is emitted

## Capabilities

### Modified Capabilities

- `cli-surface`: header layout updated for full and light variants

## Impact

- `packages/core/src/ui/header.ts` (layout changes to `renderFullHeader` and `renderLightHeader`)
- `packages/core/test/unit/ui-header.test.ts` (test assertions updated to match new layout)
- No API, runtime, or dependency changes
