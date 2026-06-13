## 1. Verify current state

- [ ] 1.1 Confirm `packages/create/package.json` `name` field is `create-skillet`
- [ ] 1.2 Confirm `grep -r "@skillet-cli/create" openspec/changes/archive/` returns exactly 4 matches across the two expected files

## 2. Fix archived task files

- [ ] 2.1 Replace all 3 occurrences of `@skillet-cli/create` with `create-skillet` in `openspec/changes/archive/2026-06-11-npm-install-progress-feedback/tasks.md` (lines 19–21)
- [ ] 2.2 Replace the 1 occurrence of `@skillet-cli/create` with `create-skillet` in `openspec/changes/archive/2026-06-11-post-move-skilldir-display/tasks.md` (line 15)

## 3. Verify fix

- [ ] 3.1 Run `grep -r "@skillet-cli/create" openspec/changes/archive/` and confirm it returns no matches
- [ ] 3.2 Run `grep -r "create-skillet" openspec/changes/archive/` and confirm it returns matches in both fixed files
