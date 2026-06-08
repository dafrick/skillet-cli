### Requirement: `skillet.skillDir` is recognized as a direct skill directory path
When `package.json` contains a `skillet` key with a `skillDir` sub-key, `@skillet-cli/core` SHALL treat the value as a relative path (from the package root) pointing directly to the skill directory — i.e. the directory that itself contains `SKILL.md`. Core SHALL resolve this path to an absolute path and use it as the skill location without performing subdirectory discovery.

#### Scenario: `skillet.skillDir` resolves to the skill directory directly
- **WHEN** `package.json` contains `{ "skillet": { "skillDir": "skill/" } }` and `skill/SKILL.md` exists
- **THEN** `run()` installs from `skill/` without scanning `skill/*/SKILL.md`

#### Scenario: `skillet.skillDir` with root-relative path
- **WHEN** `package.json` contains `{ "skillet": { "skillDir": "./" } }` and `SKILL.md` exists at the package root
- **THEN** `run()` installs from the package root directory directly

#### Scenario: `skillet.skillDir` takes precedence over `skillet.skills` when both are present
- **WHEN** `package.json` contains both `skillet.skillDir` and `skillet.skills`
- **THEN** `run()` uses `skillDir` and ignores `skills`

#### Scenario: `skillet.skillDir` is absent — falls back to existing `skills` discovery
- **WHEN** `package.json` contains `{ "skillet": { "skills": "skills" } }` and no `skillDir` key
- **THEN** `run()` uses the existing subdirectory-discovery logic on `skills/`

#### Scenario: `skillet` key present but neither `skillDir` nor `skills` present — default discovery applies
- **WHEN** `package.json` contains `{ "skillet": {} }` with no sub-keys
- **THEN** `run()` falls back to the existing default discovery behavior (scans `skills/`)

### Requirement: Programmatic `skillDir` argument to `run()` continues to override all package.json config
When a caller passes `skillDir` explicitly to `run({ skillDir, pkg })`, that value SHALL be used as the skill location regardless of any `skillet.skillDir` or `skillet.skills` entry in `package.json`. The explicit argument always wins.

#### Scenario: Explicit `skillDir` argument bypasses package.json
- **WHEN** `run()` is called with `skillDir: "/abs/path/to/skill"` and `package.json` has a different `skillet.skillDir`
- **THEN** `run()` uses the explicitly passed path, not the one from `package.json`
