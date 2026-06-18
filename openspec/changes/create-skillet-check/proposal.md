## Why

The current post-wizard publish preview reads the skill directory through `DEFAULT_IGNORE` — but `DEFAULT_IGNORE` governs install-time copy behavior, not what `npm publish` will actually include. A skill author can unknowingly ship lock files, TypeScript sources, dev configs, or nested `node_modules` inside skill subdirectories, with no tooling to catch it before publishing. There is also no way to run a pre-publish check later without re-running the full wizard.

## What Changes

- **New `create-skillet check` subcommand**: runs `npm pack --dry-run --json` as ground truth; classifies tarball contents by skill-path membership and name-based noise patterns; offers interactive `.npmignore` additions; exits 1 if `.npmignore` was modified (forcing a re-run of `npm publish`).
- **Scaffold generates pre-publish wiring**: adds `create-skillet` as a `devDependency` and `"prepublishOnly": "create-skillet check"` to the generated `package.json` so the check runs automatically on every publish.
- **Post-wizard preview replaced**: the current DEFAULT_IGNORE-based file listing is replaced with the same npm-pack-based output in read-only mode (no interactive prompts, no `.npmignore` writes).
- **Commander refactor**: `create-skillet`'s CLI is refactored from a single default action to a multi-subcommand structure (`create-skillet` → wizard, `create-skillet check` → publish check), fully backward-compatible.

## Capabilities

### New Capabilities
- `publish-check-command`: `create-skillet check` subcommand — npm-pack-based publish health check with path+name classification, interactive `.npmignore` exclusion, and exit-1 abort flow.

### Modified Capabilities
- `scaffold-publish-preview`: Replace DEFAULT_IGNORE file listing with npm-pack-based output in read-only (preview) mode; wire `create-skillet` as devDep and `prepublishOnly` script into generated package.

## Impact

- `packages/create/src/run.ts` — Commander refactor to subcommand model
- `packages/create/src/publish-preview.ts` — replaced or delegated to check command
- `packages/create/src/scaffold.ts` — adds devDep install + prepublishOnly script writing
- New: `packages/create/src/check.ts` — check command implementation
- `packages/create/package.json` — version bump
