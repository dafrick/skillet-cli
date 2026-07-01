## ADDED Requirements

### Requirement: .npmignore is not overwritten if it already exists
`executeScaffold` SHALL check whether `.npmignore` already exists before writing it. If it exists, the wizard SHALL skip the write entirely, leaving any author edits (including edits made via the `create-skillet check` interactive triage flow) intact. If it does not exist, the wizard SHALL write it with the existing default content (`node_modules\n`).

#### Scenario: .npmignore already exists — not overwritten
- **WHEN** `executeScaffold` runs and `.npmignore` already exists in the target directory
- **THEN** the existing `.npmignore` content is left unchanged; no write occurs

#### Scenario: .npmignore does not exist — written with default content
- **WHEN** `executeScaffold` runs and no `.npmignore` exists in the target directory
- **THEN** `.npmignore` is created with the default content

#### Scenario: Author-edited .npmignore survives a re-run
- **WHEN** an author has previously used the interactive npmignore triage flow to customize `.npmignore`, and then re-runs `create-skillet`
- **THEN** the customized `.npmignore` content is preserved unchanged

---

### Requirement: bin/cli.js overwrite is gated on content comparison, not unconditional
Before writing `bin/cli.js`, the wizard SHALL compare any existing on-disk content against a freshly rendered version (produced by the same rendering logic used to originally write the file). If no `bin/cli.js` exists, it SHALL be written unconditionally (first-time case). If it exists and matches the freshly rendered content exactly, it SHALL be rewritten silently (no-op from the user's perspective — idempotent). If it exists and differs from the freshly rendered content, the wizard SHALL warn that `bin/cli.js` appears to have been modified and ask for explicit consent before overwriting; declining SHALL leave the existing file untouched and the wizard SHALL continue with the remaining steps.

#### Scenario: No existing bin/cli.js — written unconditionally
- **WHEN** the wizard runs and no `bin/cli.js` exists
- **THEN** `bin/cli.js` is written with no comparison or prompt

#### Scenario: Existing bin/cli.js matches rendered content — silent rewrite
- **WHEN** the wizard runs and existing `bin/cli.js` content is byte-for-byte identical to the freshly rendered version
- **THEN** the file is rewritten (or left as-is) without any warning or prompt

#### Scenario: Existing bin/cli.js differs from rendered content — warns and asks for consent
- **WHEN** the wizard runs and existing `bin/cli.js` content differs from the freshly rendered version
- **THEN** the wizard prints a warning that `bin/cli.js` appears to have been modified and asks for explicit confirmation before overwriting

#### Scenario: User declines overwrite — existing file preserved
- **WHEN** the user declines the `bin/cli.js` overwrite consent prompt
- **THEN** the existing `bin/cli.js` content is left unchanged and the wizard continues with the remaining scaffold/execution steps

#### Scenario: User accepts overwrite — file replaced with rendered content
- **WHEN** the user accepts the `bin/cli.js` overwrite consent prompt
- **THEN** `bin/cli.js` is replaced with the freshly rendered content and made executable as before
