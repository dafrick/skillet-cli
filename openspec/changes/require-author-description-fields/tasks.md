## 1. Update prompt message labels

- [ ] 1.1 In `packages/create/src/prompts.ts` line 41, change `message: 'Description:'` to `message: 'Description (optional):'`
- [ ] 1.2 In `packages/create/src/prompts.ts` line 45, change `message: 'Author:'` to `message: 'Author (optional):'`

## 2. Add regression tests

- [ ] 2.1 In `packages/create/test/unit/prompts.test.ts`, add a test in the `collectConfig` suite that calls `collectConfig` with a single-skill `DetectionResult`, then asserts that the `input` mock was called with a `message` containing `'Description (optional):'` and another call with `'Author (optional):'`

## 3. Update the OpenSpec spec

- [ ] 3.1 Archive the `skilletize-wizard` delta spec from this change into the canonical `openspec/specs/skilletize-wizard/spec.md` by running `openspec archive change require-author-description-fields` (handled during archive phase — no manual edit needed here)
