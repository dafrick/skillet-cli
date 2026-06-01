## 1. Package Metadata

- [x] 1.1 Add `"license": "MIT"` to `packages/core/package.json`
- [x] 1.2 Add `"repository"` field (object form with `type`, `url`, and `directory`) to `packages/core/package.json`
- [x] 1.3 Add `"homepage"` field pointing to the GitHub repo to `packages/core/package.json`
- [x] 1.4 Add `"bugs"` field with GitHub issues URL to `packages/core/package.json`
- [x] 1.5 Add `"keywords"` array (`["ai", "agents", "skills", "claude", "copilot", "cli", "skill-installer"]`) to `packages/core/package.json`

## 2. Package README

- [x] 2.1 Create `packages/core/README.md` with: one-sentence purpose statement, installation section, minimal working example (matching the root README's "Building with @skillet-cli/core" pattern), RunOptions reference table, and a link to the GitHub repository
- [x] 2.2 Verify `npm pack --dry-run` in `packages/core/` lists `README.md` in the tarball contents

## 3. Contributing Docs

- [x] 3.1 Add a note to `CONTRIBUTING.md` that `packages/core/README.md` and the root `README.md` must both be updated when the public API (RunOptions, the minimal example) changes
