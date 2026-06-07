## 1. Fix Font Loading

- [x] 1.1 In `packages/ui/src/wordmark.ts`, import ANSI Shadow font data from `figlet/fonts/ANSI Shadow`
- [x] 1.2 Call `figlet.parseFont('ANSI Shadow', ansiShadowFontData)` at module level before `generateWordmark` is defined

## 2. Tests

- [x] 2.1 Add a unit test in `packages/ui/test/unit/` verifying `generateWordmark` returns a non-empty string without throwing (covers the bundled/no-filesystem scenario)

## 3. Verify

- [x] 3.1 Run `pnpm build` in `packages/ui` and confirm it succeeds
- [x] 3.2 Run `pnpm build` in `packages/create` and confirm it succeeds
- [x] 3.3 Run `pnpm test` in `packages/ui` and confirm all tests pass
