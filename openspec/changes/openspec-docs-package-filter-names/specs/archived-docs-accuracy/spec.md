## ADDED Requirements

### Requirement: Archived task files use correct pnpm filter names
Archived OpenSpec `tasks.md` files SHALL reference `create-skillet` as the pnpm filter name for the `packages/create` package, matching the actual `name` field in `packages/create/package.json`. The incorrect name `@skillet-cli/create` SHALL NOT appear in any archived task file.

#### Scenario: No occurrences of wrong filter name in archived tasks
- **WHEN** `grep -r "@skillet-cli/create" openspec/changes/archive/` is run
- **THEN** the command returns no matches (exit code 1, empty output)

#### Scenario: Correct filter name present in formerly affected files
- **WHEN** `grep -r "create-skillet" openspec/changes/archive/` is run
- **THEN** the command returns matches in `2026-06-11-npm-install-progress-feedback/tasks.md` and `2026-06-11-post-move-skilldir-display/tasks.md`
