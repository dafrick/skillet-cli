## 1. Write failing tests

- [x] 1.1 In `packages/create/test/unit/scaffold.test.ts`, add a test case asserting that when `config.description` is `''`, the `npm pkg set` argument list does NOT contain any element matching `description=`
- [x] 1.2 Add a test case asserting that when `config.author` is `''`, the `npm pkg set` argument list does NOT contain any element matching `author=`
- [x] 1.3 Add regression-guard test cases asserting that when `config.description` and `config.author` are non-empty, they ARE included in the `npm pkg set` argument list (prevents future regression to the "always-skip" direction)
- [x] 1.4 Run the new tests and confirm they fail (red) before the fix is applied

## 2. Implement the fix

- [x] 2.1 In `packages/create/src/scaffold.ts`, inside `executeScaffold()`, replace the unconditional `description=${config.description}` entry in `pkgSetArgs` with a conditional spread: `...(config.description ? [\`description=${config.description}\`] : [])`
- [x] 2.2 Replace the unconditional `author=${config.author}` entry in `pkgSetArgs` with a conditional spread: `...(config.author ? [\`author=${config.author}\`] : [])`

## 3. Verify

- [x] 3.1 Run the full unit test suite for `packages/create` and confirm all tests pass (including the new cases added in step 1)
- [x] 3.2 Confirm the fix does not affect the `repositoryUrl` guard — its existing tests still pass unchanged
