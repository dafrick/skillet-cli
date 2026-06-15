## 1. Tests (write before implementation)

- [x] 1.1 Add unit test in `detect.test.ts`: `isPrivate` is `true` when `package.json` contains `"private": true`
- [x] 1.2 Add unit test in `detect.test.ts`: `isPrivate` is `false` when `package.json` has no `private` field
- [x] 1.3 Add unit test in `detect.test.ts`: `isPrivate` is `false` when no `package.json` exists
- [x] 1.4 Add unit test in `prompts.test.ts` (or equivalent): `collectConfig` includes `removePrivate: true` when user confirms removal
- [x] 1.5 Add unit test in `prompts.test.ts`: `collectConfig` includes `removePrivate: false` when user declines removal
- [x] 1.6 Add unit test in `prompts.test.ts`: no private prompt shown and `removePrivate` is `false` when `isPrivate` is `false`
- [x] 1.7 Add unit test in `scaffold.test.ts` (or equivalent): `npm pkg delete private` is called when `removePrivate` is `true`
- [x] 1.8 Add unit test in `scaffold.test.ts`: `npm pkg delete private` is NOT called when `removePrivate` is `false`
- [x] 1.9 Add integration/run test: early-gate summary includes `private:` warning line when `isPrivate` is `true`
- [x] 1.10 Add integration/run test: early-gate summary does NOT include `private:` line when `isPrivate` is `false`
- [x] 1.11 Add integration/run test: completion block omits `npm publish` and includes `npm pkg delete private` note when `isPrivate` was `true` and `removePrivate` is `false`
- [x] 1.12 Add integration/run test: completion block includes `npm publish` when `isPrivate` was `true` and `removePrivate` is `true`
- [x] 1.13 Add integration/run test: completion block includes `npm publish` when `isPrivate` was `false`

## 2. Detection

- [x] 2.1 Add `private?: boolean` to the `PackageJson` interface in `packages/create/src/detect.ts`
- [x] 2.2 Add `isPrivate: boolean` to the `DetectionResult` interface in `packages/create/src/detect.ts`
- [x] 2.3 Read `pkg.private` from parsed `package.json` and assign `isPrivate: pkg.private === true` in `detectEnvironment()` (default `false` when no `package.json`)
- [x] 2.4 Verify tests 1.1–1.3 pass

## 3. Prompts

- [x] 3.1 Add `removePrivate: boolean` to the `WizardConfig` interface in `packages/create/src/prompts.ts`
- [x] 3.2 After the `license` prompt in `collectConfig`, add a conditional `confirm` prompt: when `detected.isPrivate` is `true`, ask `package.json has "private": true — remove it so you can publish?` with `default: true`
- [x] 3.3 Set `removePrivate` in the returned `WizardConfig` (`true` if prompted and accepted, `false` otherwise)
- [x] 3.4 Verify tests 1.4–1.6 pass

## 4. Early-gate summary

- [x] 4.1 In `packages/create/src/run.ts`, after the `package.json:` summary line, conditionally print `private:       true ⚠  (cannot publish until removed)\n` when `detected.isPrivate` is `true`
- [x] 4.2 Verify tests 1.9–1.10 pass

## 5. Scaffold

- [x] 5.1 In `packages/create/src/scaffold.ts`, after the `npm pkg set` step and before writing `bin/cli.js`, add a conditional call: when `config.removePrivate` is `true`, call `runSync('npm', ['pkg', 'delete', 'private'], 'npm pkg delete private')`
- [x] 5.2 Verify tests 1.7–1.8 pass

## 6. Completion block

- [x] 6.1 In `packages/create/src/run.ts`, thread `detected` and `config` into the completion block logic; when `detected.isPrivate && !config.removePrivate`, omit `npm publish` and instead print `    Remove "private": true first: npm pkg delete private\n`
- [x] 6.2 When `!detected.isPrivate || config.removePrivate`, print `    npm publish      — publish to npm\n` as before
- [x] 6.3 Verify tests 1.11–1.13 pass

## 7. Final verification

- [x] 7.1 Run the full `packages/create` test suite and confirm all tests pass
- [x] 7.2 Run `pnpm typecheck` (or equivalent) across the monorepo to confirm no TypeScript errors (only pre-existing publish-preview.ts issue remains, unrelated to this change)
- [ ] 7.3 Smoke-test manually: run `create-skillet` in a directory whose `package.json` has `"private": true`, confirm warning line appears, confirm prompt appears, confirm `npm pkg delete private` runs when accepted, confirm `npm publish` appears in completion
- [ ] 7.4 Smoke-test: run `create-skillet` in a directory whose `package.json` has no `private` field, confirm no warning line and normal `npm publish` in completion
