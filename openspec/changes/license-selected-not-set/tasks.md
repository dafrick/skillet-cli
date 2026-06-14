## 1. Write failing regression integration test (red)

- [x] 1.1 In `packages/create/test/integration/scaffold.test.ts`, add a new test case that calls `executeScaffold` from a fresh directory (no pre-existing `package.json`), then reads the resulting `package.json` and asserts both `"license"` equals `"MIT"` AND `"type"` equals `"module"` — mark with 90 000 ms timeout. This test must be committed and confirmed red (failing) before the code fix is applied.

## 2. Update unit test assertion (red)

- [x] 2.1 In `packages/create/test/unit/scaffold.test.ts`, update the `'runs npm init -y when no package.json exists'` test to assert that the `npm init` command string includes both `--init-license=MIT` (matching `baseConfig.license`) and `--init-type=module`. This assertion must also be confirmed red before the code fix.

## 3. Apply the code fix (green)

- [ ] 3.1 In `packages/create/src/scaffold.ts`, update the `npm init -y` call to pass both `--init-license=${config.license}` and `--init-type=module` as additional arguments so the user-selected license and the correct module type are written directly at init time — before any `npm pkg set` runs.

## 4. Verify

- [ ] 4.1 Run `pnpm test --filter create-skillet` and confirm all unit and integration tests pass, including the new regression test.
