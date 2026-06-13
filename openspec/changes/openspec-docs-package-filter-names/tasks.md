## 1. Verify current state

- [x] 1.1 Confirm `packages/create/package.json` `name` field is `create-skillet`
- [x] 1.2 Confirm `grep -r "@skillet-cli/create" openspec/changes/archive/` returns exactly 4 matches across the two expected files

## 2. Fix archived task files

- [x] 2.1 Replace all 3 occurrences of `@skillet-cli/create` with `create-skillet` in `openspec/changes/archive/2026-06-11-npm-install-progress-feedback/tasks.md` (lines 19–21)
- [x] 2.2 Replace the 1 occurrence of `@skillet-cli/create` with `create-skillet` in `openspec/changes/archive/2026-06-11-post-move-skilldir-display/tasks.md` (line 15)

## 3. Verify fix

- [x] 3.1 Run `grep -r "@skillet-cli/create" openspec/changes/archive/` and confirm it returns no matches
- [x] 3.2 Run `grep -r "create-skillet" openspec/changes/archive/` and confirm it returns matches in both fixed files
