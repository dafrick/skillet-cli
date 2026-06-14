## 1. Types — Extend WizardConfig

- [ ] 1.1 In `packages/create/src/prompts.ts`, add `isMultiSkill: boolean` and `skillsParentDirs: string[]` to the `WizardConfig` interface

## 2. Tests — Write failing tests first (TDD)

- [ ] 2.1 Write unit tests for parent-directory derivation logic: given `discoveredSkillDirs`, expect correct `skillsParentDirs` output (single parent, multiple parents, trailing-slash normalization, root-level entry `"./"` normalizes to `"."`)
- [ ] 2.2 Write unit tests for `collectConfig` in `prompts.ts`: when `discoveredSkillDirs.length > 1`, expect `isMultiSkill: true`, `skillsParentDirs` populated, and no skill-path input prompt shown
- [ ] 2.3 Write unit tests for `executeScaffold` in `scaffold.ts`: when `isMultiSkill: true` with one parent, expect `npm pkg set skillet.skills=<dir>` and no `skillet.skillDir`; when multiple parents, expect JSON array form
- [ ] 2.4 Write unit tests for the `run.ts` preview block: when `isMultiSkill: true`, expect `skillsParent:` in output instead of `skillDir:`
- [ ] 2.5 Write a failing unit test for `run.ts` that exercises the scenario: `isMultiSkill: true` AND `detected.hasSkillMd: true` — assert that `setupSkillDir` is NOT called and that `package.json` does NOT contain `skillet.skillDir` after the run completes

## 3. prompts.ts — Multi-skill inform-and-confirm flow

- [ ] 3.1 Add a helper `deriveParentDirs(discoveredSkillDirs: string[]): string[]` that normalizes trailing slashes, calls `path.dirname()` on each entry, and deduplicates with a `Set`
- [ ] 3.2 Replace the `select()` branch in `collectConfig` (when `discoveredSkillDirs.length > 1`) with: print discovered skill list, print "All N skills will be packaged into this single npm package.", ask `confirm()` — decline exits with code 0
- [ ] 3.3 Populate `isMultiSkill: true` and `skillsParentDirs` from `deriveParentDirs()` in the returned `WizardConfig`
- [ ] 3.4 Ensure the single-skill path returns `isMultiSkill: false` and `skillsParentDirs: []`

## 4. scaffold.ts — Write skillet.skills for multi-skill packages

- [ ] 4.1 In `executeScaffold`, branch on `config.isMultiSkill`: when true, build the `npm pkg set skillet.skills=<value>` arg (plain string if `skillsParentDirs.length === 1`, JSON array string otherwise); remove `skillet.skillDir` from the `pkgSetArgs` array for this branch
- [ ] 4.2 Verify the single-skill `pkgSetArgs` branch is unmodified (still sets `skillet.skillDir`)

## 5. run.ts — Update preview block and guard setupSkillDir

- [ ] 5.1 In the NPM preview step, branch on `config.isMultiSkill`: when true, print `  skillsParent:  <parent dirs joined by ", ">` instead of `  skillDir:     <path>`
- [ ] 5.2 Verify the single-skill preview line is unmodified
- [ ] 5.3 Guard the `setupSkillDir(detected)` call so it only executes when `!config.isMultiSkill`; this prevents `setupSkillDir` from writing `skillet.skillDir` (and moving files into `skill/`) on a package that the scaffold just wrote `skillet.skills` to

## 6. Verification

- [ ] 6.1 Run `pnpm test --filter create-skillet` (or equivalent) and confirm all new and existing tests pass
- [ ] 6.2 Manually run `create-skillet` in a test fixture directory with two SKILL.md files under `skills/brainstorming/` and `skills/debugging/`, and confirm: informational message is shown, confirm prompt appears, `package.json` contains `skillet.skills: "skills"`, and `skillet.skillDir` is absent
- [ ] 6.3 Manually run `create-skillet` in a single-skill fixture and confirm behavior is identical to pre-change
