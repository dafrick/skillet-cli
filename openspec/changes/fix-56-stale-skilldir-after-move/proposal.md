## Why

After `create-skillet` moves skill content into `skill/`, the generated `bin/cli.js` still points at the package root because the file-move step (`setupSkillDir`) runs after scaffold generation and never patches the already-written artifacts. Any repo where the user moves files will fail on `npx . install` immediately after the wizard completes.

## What Changes

- `skill-dir.ts`: after successfully moving files into `skill/`, rewrite `bin/cli.js` to reference `skill/` as the skill URL and run `npm pkg set skillet.skillDir=./skill/` to sync `package.json`
- `scaffold.ts`: export `buildBinCliJs()` so `skill-dir.ts` can reuse the same template rather than duplicating it

## Capabilities

### New Capabilities
- (none — this is a bug fix, no new capabilities introduced)

### Modified Capabilities
- `skilletize-wizard`: The skill directory setup requirement needs a new post-move update rule: after files are moved into `skill/`, `bin/cli.js` and `package.json`'s `skillet.skillDir` field SHALL be updated to reflect the new location

## Impact

- `packages/create/src/scaffold.ts` — export `buildBinCliJs()`
- `packages/create/src/skill-dir.ts` — add post-move update logic
- `packages/create/test/unit/scaffold.test.ts` — test that `buildBinCliJs` is exported correctly (already implicitly tested, may need minor update)
- `packages/create/test/unit/skill-dir.test.ts` — new tests for post-move update behavior
- No changes to `@skillet-cli/core` — this fix stays entirely within the `create` package
