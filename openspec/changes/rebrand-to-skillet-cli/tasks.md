## 1. GitHub Repository Rename

- [ ] 1.1 Rename GitHub repo from `dafrick/skillet` to `dafrick/skillet-cli` via GitHub Settings → General → Repository name

## 2. Source Code

- [x] 2.1 Update `packages/core/src/ui/header.ts`: change hardcoded `https://github.com/dafrick/skillet` attribution URL to `https://github.com/dafrick/skillet-cli`

## 3. Package Metadata

- [x] 3.1 Update `packages/core/package.json` `repository.url` to `git+https://github.com/dafrick/skillet-cli.git`
- [x] 3.2 Update `packages/core/package.json` `homepage` to `https://github.com/dafrick/skillet-cli`
- [x] 3.3 Update `packages/core/package.json` `bugs.url` to `https://github.com/dafrick/skillet-cli/issues`

## 4. Tests

- [x] 4.1 Update `packages/core/test/unit/ui-header.test.ts`: replace all assertions containing `https://github.com/dafrick/skillet` with `https://github.com/dafrick/skillet-cli`

## 5. Documentation

- [x] 5.1 Update `README.md`: replace CI badge URL and all repo links from `dafrick/skillet` to `dafrick/skillet-cli`
- [x] 5.2 Update `packages/core/README.md`: replace GitHub repository link from `dafrick/skillet` to `dafrick/skillet-cli`

## 6. Pending Change Specs

- [x] 6.1 Update `openspec/changes/npm-package-polish/specs/npm-package-metadata/spec.md`: replace all three hardcoded `dafrick/skillet` URLs (repository, homepage, bugs) with `dafrick/skillet-cli` equivalents

## 7. New Packages (added on main after branch was created)

- [x] 7.1 Update `packages/create/package.json`: add `repository`, `homepage`, and `bugs` fields pointing to `dafrick/skillet-cli`
- [x] 7.2 Fix `openspec/specs/skill-package-marker/spec.md`: replace stale `@skillet/core` scope with `@skillet-cli/core`
- [x] 7.3 Extend `openspec/specs/npm-package-metadata/spec.md`: add requirements for `create-skillet` `repository`, `homepage`, and `bugs` fields

## 8. Verification

- [x] 8.1 Run `pnpm test` and confirm all tests pass with the updated URL assertions
- [x] 8.2 Grep the repo for any remaining `github.com/dafrick/skillet[^-]` occurrences and confirm none remain
