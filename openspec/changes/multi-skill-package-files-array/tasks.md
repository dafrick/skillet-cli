## 1. Write Failing Tests (TDD)

- [ ] 1.1 In `packages/create/test/unit/scaffold.test.ts`, inside the `"executeScaffold — multi-skill mode"` describe block, add a test asserting `files[1]=skills/` is passed to `npm pkg set` when `skillsParentDirs` is `["skills"]`
- [ ] 1.2 Add a test asserting `files[1]=core/` and `files[2]=exp/` are passed when `skillsParentDirs` is `["core", "exp"]`
- [ ] 1.3 Add a test asserting `files[1]=skills/` is produced even when `skillsParentDirs` entry lacks a trailing slash (normalization test)
- [ ] 1.4 In the `"executeScaffold — files allowlist"` describe block (single-skill), add a regression guard test asserting `files[1]=<skillDir>` is unchanged
- [ ] 1.5 Run tests and confirm the new multi-skill `files` tests fail (`pnpm --filter @skillet-cli/create test`)

## 2. Implement the Fix

- [ ] 2.1 In `packages/create/src/scaffold.ts`, replace the unconditional `files[1]=${config.skillDir}` line with conditional logic: when `config.isMultiSkill` is `true`, map `config.skillsParentDirs` to `files[N]=<dir>/` entries (normalized to have trailing slash, starting at index 1); when `false`, use `files[1]=${config.skillDir}` as before
- [ ] 2.2 Run tests and confirm all tests pass (`pnpm --filter @skillet-cli/create test`)
- [ ] 2.3 Run the full test suite to confirm no regressions (`pnpm test`)
