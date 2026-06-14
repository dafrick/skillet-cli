## Why

When Skillet installs a skill, `copyTree()` copies the full directory tree with no filtering — meaning `.git`, `node_modules`, `.DS_Store`, and `.skill-manifest.json` land in the install destination even though those same entries are excluded from the content hash. Separately, `create-skillet`'s scaffold never sets the `files` field in `package.json`, so `npm publish` includes everything not in `.gitignore`, risking leaking credentials or other unintended files. Both gaps stem from the same root cause: the exclusion list defined for hashing is not enforced anywhere else.

## What Changes

- **Install-time filter**: `copyTree()` in `packages/core/src/install.ts` gains a `filter` callback that skips any entry whose basename appears in the shared `DEFAULT_IGNORE` set from `hash.ts`.
- **Shared ignore export**: `DEFAULT_IGNORE` is exported from `packages/core/src/hash.ts` so both hashing and copying use a single source of truth.
- **Publish-time allowlist**: `executeScaffold()` in `packages/create/src/scaffold.ts` adds `npm pkg set files[]=bin files[]=${config.skillDir}` to restrict what `npm publish` includes.
- **UX preview**: `run.ts` Step 5 prints a tree of the skill directory contents that will be packaged, noting excluded entries, before the final confirmation prompt.

## Capabilities

### New Capabilities

- `install-tree-filter`: The install copy step excludes noise files (`.git`, `node_modules`, `.DS_Store`, `.skill-manifest.json`) using the same ignore set as content hashing.
- `scaffold-files-allowlist`: `create-skillet` scaffold sets the `files` field in the generated `package.json` to `["bin", "<skillDir>"]`, limiting what `npm publish` ships.
- `scaffold-publish-preview`: The `create-skillet` wizard displays the file tree that will be included in the published package before the user confirms.

### Modified Capabilities

- `content-hashing`: `DEFAULT_IGNORE` is exported (not just used internally), making it a shared constant. No requirement changes — the hash algorithm and ignore set remain identical.
- `install-orchestration`: The copy step gains a filter; the post-install hash and manifest writing are unchanged. The `postInstallHash` requirement is unaffected because `.skill-manifest.json` was already excluded from hashing.

## Impact

- `packages/core/src/hash.ts` — export `DEFAULT_IGNORE`
- `packages/core/src/install.ts` — import `DEFAULT_IGNORE`, add `filter` to `fs.cp`
- `packages/create/src/scaffold.ts` — add `npm pkg set files` command
- `packages/create/src/run.ts` — add file-tree preview step
- Existing tests for `copyTree` will need updating; new unit tests required for filter behavior
- No public API changes; `DEFAULT_IGNORE` export is additive
