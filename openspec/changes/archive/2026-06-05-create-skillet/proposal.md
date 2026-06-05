## Why

Skill authors need a guided path to turn an existing skill directory into a publishable npm package. Today that requires understanding npm conventions, writing `bin/cli.js` from scratch, manually editing `package.json`, and knowing which fields Skillet requires — knowledge most authors don't have. `create-skillet` removes all of that friction with an interactive wizard that collects answers, runs native npm commands, and scaffolds exactly what's needed.

## What Changes

- **New `packages/create`**: `create-skillet` npm package — an interactive CLI wizard that walks a skill author through converting a raw skill directory into a publishable Skillet npm package. Uses only native npm commands (`npm init -y`, `npm pkg set`) rather than manual JSON edits.
- **New `packages/ui`**: `@skillet-cli/ui` internal shared package (private, not published) — extracts brand color tokens, spinner, wordmark rendering, and header factory from `packages/core` so both `core` and `create` share a consistent visual identity.
- **Updated `packages/core`**: Migrates `src/ui/` imports to `@skillet-cli/ui`; adds a one-time cross-promotion hint after successful install suggesting `npm create skillet` when the tool is not detected.

## Capabilities

### New Capabilities

- `skilletize-wizard`: Interactive CLI wizard that converts a raw skill directory into a publishable Skillet npm package; handles `package.json` init, `bin/cli.js` scaffolding, `skill/` subfolder setup, git-derived defaults, and local/publish path guidance
- `shared-ui`: `@skillet-cli/ui` provides brand-consistent colors, spinner, and wordmark rendering as a shared internal dependency for all `@skillet-cli/*` packages

### Modified Capabilities

- `monorepo-setup`: Two new packages added (`packages/create`, `packages/ui`); build order becomes `ui` → `core`, `ui` → `create`

## Impact

- `packages/create/` — new package (`create-skillet`, published to npm)
- `packages/ui/` — new package (`@skillet-cli/ui`, private, workspace-internal only)
- `packages/core/src/ui/` — color, spinner, wordmark, header modules migrated to `@skillet-cli/ui`; `verbs.ts` and `taglines.ts` remain local to core
- `packages/core/src/run.ts` — cross-promotion hint added after install completion (TTY, shown once)
- `pnpm-workspace.yaml` — no change needed (`packages/*` glob already covers new packages)
- Build tooling: Makefile targets for `packages/create` (build, test, publish); CI matrix extended to include new packages
