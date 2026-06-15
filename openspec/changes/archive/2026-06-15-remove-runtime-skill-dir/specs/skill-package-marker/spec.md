## REMOVED Requirements

### Requirement: Explicit `skillDir` passed to `run()` is honored for the invoked package
**Reason**: `package.json` (`skillet.skillDir` / `skillet.skills`) is now the sole canonical source for skill location. The runtime override was a stop-gap added before the `skillet` key existed in `package.json`. It has no published consumers and is removed in `@skillet-cli/core` v0.3.0.
**Migration**: Set `skillet.skillDir` (for a single skill) or `skillet.skills` (for multi-skill packages) in your `package.json`. The `run()` call no longer accepts a `skillDir` argument.

## MODIFIED Requirements

### Requirement: `skillet.skillDir` is recognized as a direct skill directory path (via `skillet` marker only)
The `SkilletPackageJson` type SHALL include an optional `skillDir` field of type `string`. When present, its value is a path relative to the package root pointing directly to a skill directory (containing `SKILL.md`). The `readSkilletMarker` function SHALL return a `directSkillDir` field (resolved to an absolute path) when `skillDir` is present. This field is read exclusively from `package.json`; there is no runtime argument equivalent.

#### Scenario: `readSkilletMarker` returns `directSkillDir` when `skillDir` is set
- **WHEN** `package.json` contains `{ "skillet": { "skillDir": "skill/" } }`
- **THEN** `readSkilletMarker` returns `{ skillsDirs: [], directSkillDir: "<abs>/skill/" }`

#### Scenario: `readSkilletMarker` returns null when `skillet` key is absent
- **WHEN** `package.json` has no `skillet` key
- **THEN** `readSkilletMarker` returns `null` (unchanged from existing behavior)

#### Scenario: `readSkilletMarker` returns `skillsDirs` from `skills` when `skillDir` is absent
- **WHEN** `package.json` contains `{ "skillet": { "skills": "skills" } }` and no `skillDir`
- **THEN** `readSkilletMarker` returns `{ skillsDirs: ["<abs>/skills"] }` with no `directSkillDir`

#### Scenario: `run()` called without `skillet` key in `package.json` throws an error
- **WHEN** `run({ pkg })` is called and the invoked package's `package.json` has no `skillet` key
- **THEN** `run()` throws an error at startup naming `skillet.skillDir` and `skillet.skills` as the expected configuration fields
