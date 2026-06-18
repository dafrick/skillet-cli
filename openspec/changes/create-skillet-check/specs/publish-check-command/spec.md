## ADDED Requirements

### Requirement: create-skillet check subcommand is registered
`create-skillet` SHALL expose a `check` subcommand via Commander, routable as `create-skillet check`. The existing default wizard action SHALL remain unchanged and backward-compatible.

#### Scenario: check subcommand routes correctly
- **WHEN** `create-skillet check` is executed
- **THEN** the check command runs (not the wizard)

#### Scenario: wizard default action unchanged
- **WHEN** `create-skillet` is executed with no subcommand argument
- **THEN** the wizard flow runs exactly as before

#### Scenario: name argument still reaches wizard
- **WHEN** `create-skillet mypackage` is executed with a name that is not a registered subcommand
- **THEN** the wizard runs with `mypackage` as the `nameArg` value

---

### Requirement: check uses npm pack --dry-run --json as tarball manifest
The check command SHALL invoke `npm pack --dry-run --json` in the current working directory and parse its JSON output as the authoritative list of files that would be published.

#### Scenario: npm pack output is parsed
- **WHEN** `create-skillet check` runs in a directory with a valid `package.json`
- **THEN** the file list is derived from `npm pack --dry-run --json` output, not from a filesystem walk

#### Scenario: npm pack failure exits with error
- **WHEN** `npm pack --dry-run --json` exits with a non-zero status
- **THEN** the check command prints an error message and exits non-zero without presenting any prompts

---

### Requirement: check reads skill paths from package.json
The check command SHALL read `skillet.skillDir` (single-skill) or `skillet.skills` (multi-skill) from the project's `package.json` to determine which tarball entries are inside a declared skill path.

#### Scenario: single-skill path read
- **WHEN** `package.json` contains `skillet.skillDir = "skill/my-skill"`
- **THEN** tarball entries whose path starts with `skill/my-skill/` are classified as inside a skill path

#### Scenario: multi-skill paths read
- **WHEN** `package.json` contains `skillet.skills = ["skills/a", "skills/b"]`
- **THEN** tarball entries under `skills/a/` or `skills/b/` are classified as inside a skill path

#### Scenario: no skill marker exits with error
- **WHEN** `package.json` contains neither `skillet.skillDir` nor `skillet.skills`
- **THEN** the check command prints an error noting that skillet marker is missing and exits non-zero

---

### Requirement: tarball entries are classified into tiers
The check command SHALL classify every file in the tarball into exactly one tier based on path and name:

- **✓ package infrastructure**: entries NOT under any declared skill path
- **✓ skill content**: entries under a skill path matching known content patterns (SKILL.md, `*.md`, `prompts/`, `resources/`, `assets/`, `templates/`, `examples/`)
- **⚠ ambiguous**: entries under a skill path matching dev-tooling patterns (`*.ts`, `*.tsx`, lock files, `biome.json`, `tsconfig.json`, `vitest.config*`, `.eslintrc*`, `scripts/`)
- **✗ violation**: entries under a skill path matching `DEFAULT_IGNORE` entries (`.git`, `node_modules`, `.DS_Store`, `.skill-manifest.json`) — these MUST NOT be in the tarball

Any skill-path entry not matching ✓ content or ✗ violation patterns is classified as ⚠ ambiguous.

#### Scenario: bin/cli.js classified as infrastructure
- **WHEN** the tarball contains `bin/cli.js` and the skill path is `skill/my-skill`
- **THEN** `bin/cli.js` is classified as ✓ package infrastructure

#### Scenario: SKILL.md under skill path classified as skill content
- **WHEN** the tarball contains `skill/my-skill/SKILL.md`
- **THEN** it is classified as ✓ skill content

#### Scenario: prompts directory under skill path classified as skill content
- **WHEN** the tarball contains `skill/my-skill/prompts/default.md`
- **THEN** it is classified as ✓ skill content

#### Scenario: TypeScript source under skill path classified as ambiguous
- **WHEN** the tarball contains `skill/my-skill/build.ts`
- **THEN** it is classified as ⚠ ambiguous

#### Scenario: lock file under skill path classified as ambiguous
- **WHEN** the tarball contains `skill/my-skill/package-lock.json`
- **THEN** it is classified as ⚠ ambiguous

#### Scenario: node_modules under skill path classified as violation
- **WHEN** the tarball contains `skill/my-skill/node_modules/some-dep/index.js`
- **THEN** it is classified as ✗ violation

---

### Requirement: check displays classified output grouped by tier
The check command SHALL print a summary grouped by tier (✓ infrastructure, ✓ skill content, ⚠ ambiguous, ✗ violations), with file sizes where available from npm pack output.

#### Scenario: output shows all tiers present in tarball
- **WHEN** the tarball contains files in multiple tiers
- **THEN** each tier with at least one file is printed as a labeled group

#### Scenario: violation tier causes non-zero exit in non-interactive path
- **WHEN** the tarball contains ✗ violation entries
- **THEN** the check prints a clear error noting these MUST be excluded and exits non-zero, regardless of interactive mode

---

### Requirement: interactive mode prompts for .npmignore exclusions
When running in interactive mode (TTY), the check command SHALL present:
1. A checkbox prompt over all ⚠ ambiguous items, allowing the user to select items to add to `.npmignore`
2. An optional checkbox prompt over all ✓ skill content items (shown only if user opts in), allowing fine-grained exclusion

#### Scenario: no ambiguous items skips first prompt
- **WHEN** the tarball contains no ⚠ ambiguous entries
- **THEN** no exclusion checkbox is presented and the check exits 0

#### Scenario: user selects ambiguous items to exclude
- **WHEN** the user checks one or more ⚠ items in the checkbox prompt
- **THEN** those patterns are appended to `.npmignore` and the check exits 1

#### Scenario: user selects no items to exclude
- **WHEN** the user confirms with no items checked in either prompt
- **THEN** `.npmignore` is not modified and the check exits 0

#### Scenario: user opts in to reviewing skill content items
- **WHEN** the user answers yes to "Also exclude any ✓ skill content items?"
- **THEN** a checkbox over all ✓ skill content entries is shown and any selected items are added to `.npmignore`

---

### Requirement: .npmignore update triggers exit 1
If `.npmignore` is modified by the check, the check SHALL exit with code 1 and print instructions to rerun `npm publish`.

#### Scenario: exit 1 after .npmignore write
- **WHEN** at least one pattern was written to `.npmignore`
- **THEN** the process exits with code 1 and the output includes a message instructing the user to rerun `npm publish`

#### Scenario: .npmignore patterns are appended, not overwritten
- **WHEN** an existing `.npmignore` is present with prior content
- **THEN** new patterns are appended rather than replacing the file

---

### Requirement: preview mode runs check without prompts or .npmignore writes
When called with `interactive: false`, the check function SHALL display the classified output but SHALL NOT show any prompts or write to `.npmignore`.

#### Scenario: no prompts in preview mode
- **WHEN** the check runs in preview mode
- **THEN** no `@inquirer/prompts` prompts are shown

#### Scenario: no .npmignore writes in preview mode
- **WHEN** the check runs in preview mode
- **THEN** `.npmignore` is not modified regardless of what ⚠ entries are present

#### Scenario: preview exits 0 unless violations present
- **WHEN** the check runs in preview mode with no ✗ violations
- **THEN** the process exits 0 (or returns without throwing)

---

### Requirement: scaffold installs create-skillet as devDependency
The scaffold SHALL install `create-skillet@latest` as a `devDependency` in the generated package after installing `@skillet-cli/core@latest`.

#### Scenario: create-skillet devDep installed
- **WHEN** `executeScaffold` completes successfully
- **THEN** `npm install --save-dev create-skillet@latest` was executed as part of the scaffold steps

---

### Requirement: scaffold writes prepublishOnly script
The scaffold SHALL set `"prepublishOnly": "create-skillet check"` in the generated `package.json` scripts field.

#### Scenario: prepublishOnly set in package.json
- **WHEN** `executeScaffold` completes successfully
- **THEN** `package.json` contains `"scripts": { "prepublishOnly": "create-skillet check" }` (among any other scripts already present)
