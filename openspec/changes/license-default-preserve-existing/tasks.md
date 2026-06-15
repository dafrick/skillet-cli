## 1. Failing Tests

- [x] 1.1 In `packages/create/test/unit/detect.test.ts`, add a test asserting that `detectEnvironment()` sets `license` to `"Apache-2.0"` when `package.json` contains `"license": "Apache-2.0"`
- [x] 1.2 In `packages/create/test/unit/detect.test.ts`, add a test asserting that `detectEnvironment()` sets `license` to `"(MIT AND CC-BY-SA-4.0)"` verbatim when `package.json` contains a compound SPDX expression
- [x] 1.3 In `packages/create/test/unit/detect.test.ts`, add a test asserting that `detectEnvironment()` sets `license` to `""` when `package.json` has no `license` field
- [x] 1.4 In `packages/create/test/unit/prompts.test.ts`, add a test asserting that the License `input()` call receives `default: "Apache-2.0"` when `detected.license` is `"Apache-2.0"`
- [x] 1.5 In `packages/create/test/unit/prompts.test.ts`, add a test asserting that the License `input()` call receives `default: "MIT"` when `detected.license` is `""`
- [x] 1.6 Confirm all new tests fail (TypeScript errors or assertion failures) before touching implementation

## 2. detect.ts Implementation

- [x] 2.1 Add `license?: string` to the `PackageJson` interface (lines 110–118 of `packages/create/src/detect.ts`)
- [x] 2.2 Add `license: string` to the `DetectionResult` interface (after `description`, before `hasPackageJson`)
- [x] 2.3 In `detectEnvironment()`, declare `let license = ''` alongside the other `package.json` locals
- [x] 2.4 Inside the `package.json` parse block, assign `license = pkg.license ?? ''`
- [x] 2.5 Include `license` in the returned object literal of `detectEnvironment()`
- [x] 2.6 Run detect tests and confirm 1.1–1.3 pass

## 3. prompts.ts Implementation

- [x] 3.1 In `collectConfig()`, change the License prompt default from `'MIT'` to `detected.license || 'MIT'` (line 57 of `packages/create/src/prompts.ts`)
- [x] 3.2 Run prompts tests and confirm 1.4–1.5 pass

## 4. Full Test Suite

- [x] 4.1 Run the full `packages/create` test suite (`pnpm --filter @skillet-cli/create test`) and confirm all tests pass
- [x] 4.2 Run TypeScript type-check (`pnpm --filter @skillet-cli/create typecheck`) and confirm no errors
