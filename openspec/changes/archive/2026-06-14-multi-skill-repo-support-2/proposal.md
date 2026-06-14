## Why

`create-skillet` currently lets users pick a single skill to package when multiple `SKILL.md` files are found — but the correct model for a multi-skill repo is one npm package that installs all skills together. This misalignment means maintainers of multi-skill repos cannot correctly use the wizard today.

## What Changes

- Replace the `select()` skill-picker in `prompts.ts` with an informational step that displays all discovered skills and asks for confirmation to proceed with multi-skill packaging
- Add `isMultiSkill: boolean` and `skillsParentDirs: string[]` to `WizardConfig`
- Derive common parent directory(ies) from `discoveredSkillDirs` automatically (using `path.dirname()` + deduplication); root-level entries (where the normalised path is `"./"` or `"."`) are excluded before derivation because `@skillet-cli/core` scans *subdirectories* of each `skillet.skills` entry and cannot locate a `SKILL.md` that lives directly in the repo root via this mechanism
- In `scaffold.ts`, branch on `isMultiSkill`: write `skillet.skills` for multi-skill packages instead of `skillet.skillDir`
- Update the `run.ts` preview block to display parent directories for multi-skill packages
- The single-skill wizard path remains unchanged

## Capabilities

### New Capabilities

- `multi-skill-wizard-flow`: The wizard correctly handles repos with multiple `SKILL.md` files — informs the user, confirms intent, derives parent directories, and writes `skillet.skills` to `package.json`

### Modified Capabilities

- `skilletize-wizard`: The wizard's behavior when `discoveredSkillDirs.length > 1` changes from a skill-picker select menu to an inform-and-confirm flow

## Impact

- `packages/create/src/prompts.ts` — replaces `select()` multi-skill branch with inform + confirm
- `packages/create/src/types.ts` (or wherever `WizardConfig` is defined) — adds `isMultiSkill` and `skillsParentDirs` fields
- `packages/create/src/scaffold.ts` — branches on `isMultiSkill` to write `skillet.skills` vs `skillet.skillDir`
- `packages/create/src/run.ts` — updates preview output for multi-skill; adds a guard so `setupSkillDir` is only called when `!config.isMultiSkill` (calling it unconditionally would re-introduce `skillet.skillDir` on a package that the scaffold just wrote `skillet.skills` to)
- No changes to `@skillet-cli/core` runtime or `detect.ts`
- No direct changes to `skill-dir.ts` — the guard lives in `run.ts` instead, which is cleaner
