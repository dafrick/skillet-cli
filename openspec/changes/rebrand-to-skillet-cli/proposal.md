## Why

The GitHub repository is named `dafrick/skillet`, but the npm package scope is already `@skillet-cli/core`. Multiple other repos on GitHub share the name "skillet", making it harder to find and link to this project. Renaming the repo to `dafrick/skillet-cli` aligns it with the existing npm scope and makes the identity unambiguous.

## What Changes

- GitHub repository renamed from `dafrick/skillet` to `dafrick/skillet-cli`
- All hardcoded `github.com/dafrick/skillet` URLs updated to `github.com/dafrick/skillet-cli` across source, tests, docs, and openspec artifacts
- Attribution hyperlink in the CLI header (`header.ts`) updated to the new URL
- `packages/core/package.json` `repository`, `homepage`, and `bugs.url` fields updated
- README badges and links updated
- Test assertions that assert the old URL updated to the new URL

## Capabilities

### New Capabilities
<!-- None — this is a pure rename/consistency change -->

### Modified Capabilities

- `monorepo-setup`: `repository`, `homepage`, and `bugs.url` in `packages/core/package.json` must reference `github.com/dafrick/skillet-cli`
- `cli-surface`: Attribution hyperlink emitted by the CLI header must point to `https://github.com/dafrick/skillet-cli`

## Impact

- `packages/core/package.json` — repository, homepage, bugs URLs
- `packages/core/src/ui/header.ts` — hardcoded attribution URL
- `packages/core/test/unit/ui-header.test.ts` — URL assertions
- `packages/core/README.md` — repo link
- `README.md` — CI badge and repo links
- `openspec/changes/npm-package-polish/specs/npm-package-metadata/spec.md` — spec references the old URL
- `openspec/changes/skill-cli-branding/tasks.md` — completed task log references the old URL (informational, low priority)
