## 1. Tests First

- [x] 1.1 Locate or create integration tests for `executeScaffold` in `packages/create/` and identify the test that exercises the no-existing-package.json path
- [x] 1.2 Write a failing test asserting that terminal output after scaffold does NOT contain `"version": "1.0.0"` or `"license": "ISC"` (npm init defaults) when the user configured different values
- [x] 1.3 Write a failing test asserting that terminal output after scaffold DOES contain the user-configured version, license, author, and type values in a `package.json written:` block
- [x] 1.4 Confirm both new tests fail before any implementation changes

## 2. runSync stdio override

- [x] 2.1 Add `StdioOptions` import from `node:child_process` to `packages/create/src/scaffold.ts`
- [x] 2.2 Extend the `runSync` signature with an optional fourth parameter `stdioOverride?: StdioOptions` defaulting to `'inherit'`
- [x] 2.3 Replace the hardcoded `stdio: 'inherit'` in `runSync` with `stdio: stdioOverride ?? 'inherit'`
- [x] 2.4 Verify all existing `runSync` call sites compile and behave identically (no argument changes needed)

## 3. Suppress npm init stdout

- [x] 3.1 In `executeScaffold`, update the `runSync('npm', ['init', '-y'], 'npm init')` call to pass `['inherit', 'pipe', 'inherit']` as the fourth argument
- [x] 3.2 Confirm the "Wrote to..." block no longer appears in manual local test run

## 4. Print final package.json

- [x] 4.1 After `spinner.succeed('Seasoning done')` (and after the repository URL block), add `const finalPkg = fs.readFileSync(pkgJsonPath, 'utf8');`
- [x] 4.2 Add `process.stdout.write('\npackage.json written:\n' + finalPkg + '\n');` immediately after reading the file
- [x] 4.3 Confirm the printed JSON shows user-configured values in manual local test run

## 5. Spec update

- [x] 5.1 Confirm the new scenarios in `openspec/changes/package-json-display-accuracy/specs/skilletize-wizard/spec.md` will be merged into the canonical spec at archive time (no manual edit to the canonical spec required at this stage)

## 6. Verification

- [x] 6.1 Run the full `packages/create/` test suite and confirm all tests pass including the new ones from step 1
- [x] 6.2 Run `npm create skillet` end-to-end in a temp directory, complete all prompts, and verify terminal shows correct values (not npm defaults) in the `package.json written:` block
- [x] 6.3 Run TypeScript type-check (`tsc --noEmit`) on `packages/create/` to confirm no type errors from the `runSync` signature change
