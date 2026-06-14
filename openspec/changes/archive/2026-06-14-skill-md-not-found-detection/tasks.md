## 1. Tests (write first — TDD)

- [x] 1.1 Create `packages/create/test/unit/run.test.ts` with test cases for `skillMdStatus` covering: root found, single nested dir, multiple nested dirs, none found, root + non-empty discoveredSkillDirs (root wins)

## 2. Implementation

- [x] 2.1 Add `export function skillMdStatus(detected: DetectionResult): string` to `packages/create/src/run.ts` with the four-branch logic (hasSkillMd → "found"; 1 discovered → "found in <path>"; >1 discovered → "found in N locations"; else → "not found")
- [x] 2.2 Replace the inline ternary on the `SKILL.md:` display line in `run.ts` with a call to `skillMdStatus(detected)`

## 3. Verification

- [x] 3.1 Run `pnpm --filter create-skillet test` and confirm all unit tests pass including the new `run.test.ts` suite
- [x] 3.2 Confirm the `SKILL.md:` line output matches expected strings for each scenario (root, single nested, multiple, none)
