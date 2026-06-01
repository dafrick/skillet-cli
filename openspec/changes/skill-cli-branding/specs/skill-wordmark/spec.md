## ADDED Requirements

### Requirement: Wordmark is generated from pkg.name using figlet ANSI Shadow
The library SHALL generate the full-header wordmark dynamically by passing the display name derived from `pkg.name` to `figlet` with the "ANSI Shadow" font, then applying the five-stop Ember heated-iron gradient row-by-row (same gradient as the current SKILLET wordmark). The generated art SHALL replace any hardcoded wordmark string.

#### Scenario: Plain package name renders as uppercased wordmark
- **WHEN** `pkg.name` is `"my-skill"` and the full header is rendered
- **THEN** figlet generates an ANSI Shadow wordmark for `"MY-SKILL"` with the Ember gradient applied

#### Scenario: Scoped package name strips the scope prefix
- **WHEN** `pkg.name` is `"@my-org/my-skill"` and the full header is rendered
- **THEN** figlet generates a wordmark for `"MY-SKILL"` (scope prefix `@my-org/` is stripped)

#### Scenario: Skillet's own CLI generates the SKILLET wordmark
- **WHEN** `run({ pkg })` is called and `pkg.name` is `"@skillet-cli/core"`
- **THEN** figlet generates a wordmark for `"CORE"` — or, if the bin entry point passes a display override, the correct "SKILLET" string is used

#### Scenario: Wordmark is suppressed in non-TTY and CI environments
- **WHEN** `process.stdout.isTTY` is falsy or the `CI` environment variable is set
- **THEN** no wordmark is rendered (consistent with existing header suppression behavior)

#### Scenario: NO_COLOR suppresses gradient but preserves structure
- **WHEN** the `NO_COLOR` environment variable is set
- **THEN** the figlet wordmark is printed without ANSI color codes but the ASCII structure is preserved

---

### Requirement: Display name derivation from pkg.name
The library SHALL derive the display name for the wordmark and light header by: (1) stripping any npm scope prefix (everything up to and including the first `/`), (2) uppercasing the result.

#### Scenario: Scope prefix is stripped before uppercasing
- **WHEN** `pkg.name` is `"@acme/code-reviewer"`
- **THEN** the derived display name is `"CODE-REVIEWER"`

#### Scenario: Unscoped name is uppercased directly
- **WHEN** `pkg.name` is `"code-reviewer"`
- **THEN** the derived display name is `"CODE-REVIEWER"`
