## 1. Commander Refactor

- [x] 1.1 Refactor `packages/create/src/run.ts` to use Commander subcommand model: move wizard logic into a default action, add `program.addCommand(new Command('check')…)` stub routing to the new check module
- [x] 1.2 Verify `create-skillet` (no args) still runs wizard and `create-skillet mypackage` still passes nameArg

## 2. Check Module — Core

- [x] 2.1 Create `packages/create/src/check.ts` exporting `runCheck({ interactive: boolean })`
- [x] 2.2 Implement `npm pack --dry-run --json` invocation and JSON parsing inside `runCheck`
- [x] 2.3 Read `skillet.skillDir` / `skillet.skills` from `package.json` to derive skill path prefixes
- [x] 2.4 Implement classification logic: infrastructure ✓ (outside skill paths), skill content ✓ (SKILL.md, *.md, prompts/, resources/, assets/, templates/, examples/), ambiguous ⚠ (*.ts, *.tsx, lock files, dev configs, scripts/), violation ✗ (DEFAULT_IGNORE matches inside skill path)
- [x] 2.5 Print grouped output by tier (✓ infrastructure, ✓ skill content, ⚠ ambiguous, ✗ violations) with file sizes
- [x] 2.6 Exit non-zero immediately if ✗ violations are present (even in preview mode)

## 3. Check Module — Interactive Flow

- [x] 3.1 When `interactive: true` and ⚠ ambiguous items exist, show `@inquirer/prompts` checkbox over ambiguous items
- [x] 3.2 After ambiguous checkbox, prompt "Also exclude any ✓ skill content items?" — if yes, show checkbox over all ✓ skill content entries
- [x] 3.3 Collect selected patterns; skip all prompts if no ⚠ items exist
- [x] 3.4 If any patterns selected: append to `.npmignore` (do not overwrite existing content), print instructions to rerun `npm publish`, exit 1
- [x] 3.5 If no patterns selected: exit 0

## 4. Check Module — Preview Mode

- [x] 4.1 When `interactive: false`: display classified output, skip all prompts, do not write `.npmignore`
- [x] 4.2 Handle `npm pack` failure in preview mode: print warning, return without throwing (non-fatal)
- [x] 4.3 Exit/return 0 in preview mode unless ✗ violations are present

## 5. Wire check into CLI

- [x] 5.1 Register `check` subcommand in `run.ts` calling `runCheck({ interactive: true })`
- [x] 5.2 Replace `printPublishPreview` call in wizard (post-`setupSkillDir`) with `runCheck({ interactive: false })`
- [x] 5.3 Remove or deprecate `packages/create/src/publish-preview.ts` (replace entirely if no other callers)

## 6. Scaffold Updates

- [x] 6.1 Add `npm pkg set scripts.prepublishOnly=create-skillet check` to the `npm pkg set` args in `executeScaffold`
- [x] 6.2 After `npm install @skillet-cli/core@latest`, add `npm install --save-dev create-skillet@latest` step in `executeScaffold`
- [x] 6.3 Update `run.ts` next-steps message to mention `create-skillet check` as the publish health command

## 7. Tests

- [x] 7.1 Unit test: `runCheck` in preview mode — mock `npm pack` output, assert tier classification and output, assert no `.npmignore` write
- [x] 7.2 Unit test: violation detection — mock pack output containing `node_modules` under skill path, assert exit 1 / throw
- [x] 7.3 Unit test: ambiguous classification — lock file under skill path → ⚠; `.md` under skill path → ✓; `package.json` outside skill path → ✓ infrastructure
- [x] 7.4 Unit test: interactive flow — user selects ambiguous item → `.npmignore` appended, exit 1; user selects nothing → exit 0
- [x] 7.5 Unit test: `executeScaffold` — assert `npm install --save-dev create-skillet@latest` called; assert `prepublishOnly` set via `npm pkg set`
- [x] 7.6 Unit test: Commander routing — `check` subcommand routes to check, default routes to wizard

## 8. Version Bump

- [x] 8.1 Bump `packages/create/package.json` version (patch: 0.2.3 → 0.2.4)
