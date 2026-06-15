## 1. Update Spec

- [ ] 1.1 Archive the delta spec from `openspec/changes/file-picker-companion-files-preselect/specs/skilletize-wizard/spec.md` into `openspec/specs/skilletize-wizard/spec.md` — replace the "Directory has 12 or fewer items" scenario with the blocklist-based version

## 2. Update Tests (test-first)

- [ ] 2.1 In `packages/create/test/unit/skill-dir.test.ts`, add a NEW test asserting that `scripts/` IS pre-selected (no existing assertion for this to flip — the test file does not currently test `scripts/` at all)
- [ ] 2.2 Add test: `package.json` is NOT pre-selected (blocklist item)
- [ ] 2.3 Add test: `node_modules/` is NOT pre-selected (blocklist item)
- [ ] 2.4 Add test: `bin/` is NOT pre-selected (blocklist item)
- [ ] 2.5 Run tests and confirm they fail (red phase): `pnpm --filter @skillet-cli/create test`

## 3. Update Implementation

- [ ] 3.1 In `packages/create/src/skill-dir.ts`, remove the `SKILL_DIRS` allowlist check from inside `getPreselected()` — do NOT delete the `SKILL_DIRS` constant itself, as it is still used at line 90 in the `>12 items` collapsed-confirm branch
- [ ] 3.2 Add an `EXCLUDED_NAMES` set containing `package.json`, `node_modules`, and `bin`
- [ ] 3.3 Rewrite `getPreselected()` to use the blocklist: return `false` for `README.md`, dotfiles/dot-folders, lock files, and `EXCLUDED_NAMES` members; return `true` for everything else (including `SKILL.md` and all companion directories)
- [ ] 3.4 Run tests and confirm they pass (green phase): `pnpm --filter @skillet-cli/create test`

## 4. Verify

- [ ] 4.1 Run the full create package test suite to check for regressions: `pnpm --filter @skillet-cli/create test`
- [ ] 4.2 Run the full monorepo lint and type-check: `pnpm lint && pnpm typecheck`
