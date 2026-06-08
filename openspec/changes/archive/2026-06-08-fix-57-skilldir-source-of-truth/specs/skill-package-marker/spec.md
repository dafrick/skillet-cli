## ADDED Requirements

### Requirement: `skillet.skillDir` is a recognized field in the `skillet` marker object
The `SkilletPackageJson` type SHALL include an optional `skillDir` field of type `string`. When present, its value is a path relative to the package root pointing directly to a skill directory (containing `SKILL.md`). The `readSkilletMarker` function SHALL return a `directSkillDir` field (resolved to an absolute path) when `skillDir` is present.

#### Scenario: `readSkilletMarker` returns `directSkillDir` when `skillDir` is set
- **WHEN** `package.json` contains `{ "skillet": { "skillDir": "skill/" } }`
- **THEN** `readSkilletMarker` returns `{ skillsDirs: [], directSkillDir: "<abs>/skill/" }`

#### Scenario: `readSkilletMarker` returns null when `skillet` key is absent
- **WHEN** `package.json` has no `skillet` key
- **THEN** `readSkilletMarker` returns `null` (unchanged from existing behavior)

#### Scenario: `readSkilletMarker` returns `skillsDirs` from `skills` when `skillDir` is absent
- **WHEN** `package.json` contains `{ "skillet": { "skills": "skills" } }` and no `skillDir`
- **THEN** `readSkilletMarker` returns `{ skillsDirs: ["<abs>/skills"] }` with no `directSkillDir`
