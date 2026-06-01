## Why

`@skillet-cli/core` is published to npm but arrives with no README, no keywords, no repository link, no license field, and no bugs URL — the package page on npmjs.com is effectively blank. Skill authors evaluating the package have nothing to read and no way to verify it is the right tool. This is the first impression the library makes on the ecosystem; it needs to be a good one.

## What Changes

- **New**: `packages/core/README.md` — a package-scoped README written for skill authors (the library's actual audience), covering installation, the `run()` API, and the `RunOptions` table. npm automatically includes `README.md` in the published tarball without any `files` change, so this shows up on the npm package page immediately on next publish.
- **Updated**: `packages/core/package.json` — add `repository`, `homepage`, `bugs`, `keywords`, and `license` fields. These populate the sidebar on the npm package page and are indexed by search.

## Capabilities

### New Capabilities

- `npm-readme`: Package-level `README.md` for `@skillet-cli/core` — content, audience, structure, and maintenance expectations (kept in sync with the root README's "Building with @skillet-cli/core" section).
- `npm-package-metadata`: Complete `package.json` metadata — `repository`, `homepage`, `bugs`, `keywords`, `license` fields required for a production-grade npm listing.

### Modified Capabilities

_(none — no existing spec-level behavior changes)_

## Impact

- `packages/core/README.md` — new file, published to npm automatically
- `packages/core/package.json` — metadata-only additions; no behavioral change
- No changes to CI, release workflow, or publish steps (npm includes `README.md` by default; the existing `release.yml` picks it up without modification)
