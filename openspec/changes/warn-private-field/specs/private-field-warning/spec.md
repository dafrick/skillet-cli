## ADDED Requirements

### Requirement: Wizard detects the private field from an existing package.json
During environment detection, the wizard SHALL read the `private` field from an existing `package.json`. If the field is present and strictly equal to `true`, `DetectionResult.isPrivate` SHALL be `true`. In all other cases — including when no `package.json` exists, when the field is absent, or when the field is `false` — `isPrivate` SHALL be `false`.

#### Scenario: package.json has "private": true
- **WHEN** a `package.json` exists in the current directory and contains `"private": true`
- **THEN** `detectEnvironment()` returns a `DetectionResult` where `isPrivate` is `true`

#### Scenario: package.json has no private field
- **WHEN** a `package.json` exists in the current directory and does not contain a `private` field
- **THEN** `detectEnvironment()` returns a `DetectionResult` where `isPrivate` is `false`

#### Scenario: No package.json present
- **WHEN** no `package.json` exists in the current directory
- **THEN** `detectEnvironment()` returns a `DetectionResult` where `isPrivate` is `false`

---

### Requirement: Early-gate summary warns when private is true
When `isPrivate` is `true`, the early-gate confirmation summary SHALL include a `private:` line reading `true ⚠  (cannot publish until removed)`. This line SHALL NOT appear when `isPrivate` is `false`.

#### Scenario: private: true shown in early-gate summary
- **WHEN** `detected.isPrivate` is `true` and the early-gate summary is printed
- **THEN** the summary output includes a line containing `private:` and the warning text `(cannot publish until removed)`

#### Scenario: private line absent when not private
- **WHEN** `detected.isPrivate` is `false` and the early-gate summary is printed
- **THEN** the summary output does NOT include a `private:` line

---

### Requirement: Wizard prompts to remove the private flag when detected
When `isPrivate` is `true`, after the license prompt and before the skill content path prompt, the wizard SHALL ask: `package.json has "private": true — remove it so you can publish? (Y/n)`. The default SHALL be `true` (yes, remove). The user's answer SHALL be exposed as `removePrivate: boolean` on `WizardConfig`.

#### Scenario: User accepts removal
- **WHEN** `detected.isPrivate` is `true` and the user answers yes (or accepts the default)
- **THEN** `collectConfig` returns a `WizardConfig` where `removePrivate` is `true`

#### Scenario: User declines removal
- **WHEN** `detected.isPrivate` is `true` and the user answers no
- **THEN** `collectConfig` returns a `WizardConfig` where `removePrivate` is `false`

#### Scenario: Prompt not shown when not private
- **WHEN** `detected.isPrivate` is `false`
- **THEN** no `private` removal prompt is shown and `WizardConfig.removePrivate` is `false`

---

### Requirement: Scaffold removes the private field when the user consented
When `config.removePrivate` is `true`, the scaffold execution SHALL run `npm pkg delete private` as an additional step after the `npm pkg set` step and before writing `bin/cli.js`. The step SHALL use the same `runSync` mechanism as all other scaffold steps so that a non-zero exit causes the wizard to print an error and exit with code 1.

#### Scenario: npm pkg delete private runs when removePrivate is true
- **WHEN** `executeScaffold` is called with `config.removePrivate = true`
- **THEN** `npm pkg delete private` is executed

#### Scenario: npm pkg delete private is skipped when removePrivate is false
- **WHEN** `executeScaffold` is called with `config.removePrivate = false`
- **THEN** `npm pkg delete private` is NOT executed

---

### Requirement: Completion block conditionally suppresses npm publish
When `config.removePrivate` is `false` AND the package was originally private (`detected.isPrivate` was `true`), the wizard SHALL omit `npm publish` from the completion next-steps block and instead print `Remove "private": true first: npm pkg delete private`. When `removePrivate` is `true` or `isPrivate` was never `true`, the normal `npm publish` line SHALL appear.

#### Scenario: npm publish suppressed when user declined private removal
- **WHEN** `detected.isPrivate` was `true` and `config.removePrivate` is `false`
- **THEN** the completion output does NOT include `npm publish` and DOES include `npm pkg delete private`

#### Scenario: npm publish shown when private flag was removed
- **WHEN** `detected.isPrivate` was `true` and `config.removePrivate` is `true`
- **THEN** the completion output includes `npm publish` and does NOT include `npm pkg delete private`

#### Scenario: npm publish shown when package was never private
- **WHEN** `detected.isPrivate` was `false`
- **THEN** the completion output includes `npm publish`
