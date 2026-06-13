## ADDED Requirements

### Requirement: Test docblock accurately describes post-move behavior
The docblock at the top of `packages/create/test/unit/skill-dir-post-move.test.ts` SHALL describe only the behaviors that `setupSkillDir` actually performs after moving files into `skill/`. It MUST NOT claim that `bin/cli.js` is rewritten, because that behavior was removed when `package.json`'s `skillet.skillDir` field became the source of truth.

#### Scenario: Docblock matches implementation
- **WHEN** a developer reads the top-of-file docblock in `skill-dir-post-move.test.ts`
- **THEN** the docblock lists only `npm pkg set skillet.skillDir=./skill/` as the post-move action and notes that `bin/cli.js` is NOT rewritten
