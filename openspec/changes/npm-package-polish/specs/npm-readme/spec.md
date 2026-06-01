## ADDED Requirements

### Requirement: Package README exists at packages/core/README.md
`packages/core/README.md` SHALL exist in the repository. npm SHALL automatically include it in the published tarball (npm's default behavior for `README.md` files; no `files` array change is required).

#### Scenario: README is included in the published tarball
- **WHEN** `npm pack` is run in `packages/core/`
- **THEN** the resulting `.tgz` contains `README.md` at the package root

---

### Requirement: README targets skill authors, not end users
The package README SHALL be written for developers building a skill installer using `@skillet-cli/core` as a library dependency. It SHALL NOT document end-user CLI commands (`install`, `update`, `list`, `uninstall`) — that is the skill author's responsibility.

#### Scenario: Reader can understand the library's purpose in under 30 seconds
- **WHEN** a developer visits the npm package page
- **THEN** the README opens with a one-sentence description of what `@skillet-cli/core` does and who it is for

---

### Requirement: README covers installation
The README SHALL include an installation section showing how to add `@skillet-cli/core` as a dependency.

#### Scenario: Installation command is present
- **WHEN** a developer reads the README
- **THEN** they find an `npm install @skillet-cli/core` (or equivalent) code block

---

### Requirement: README includes a minimal working example
The README SHALL include a complete, minimal code example showing how to create an entry-point file that calls `run()`. The example SHALL be the same pattern shown in the root README's "Building with @skillet-cli/core" section.

#### Scenario: Minimal example compiles and runs
- **WHEN** a developer copies the example into a new package and runs it
- **THEN** the CLI starts without errors

---

### Requirement: README documents the RunOptions API
The README SHALL include a `RunOptions` reference table listing all options (`skillDir`, `pkg`, `hooks.transform`, `hooks.beforeInstall`, `hooks.afterInstall`, `hooks.extendProgram`) with their types and descriptions.

#### Scenario: All RunOptions are documented
- **WHEN** a developer searches the README for `hooks.afterInstall`
- **THEN** they find an entry describing the option's type and purpose

---

### Requirement: README links to the GitHub repository for further reading
The README SHALL include at least one link to the GitHub repository (e.g., for contributing, full docs, or issue reporting). This ensures npm readers can reach the canonical source.

#### Scenario: GitHub link is present
- **WHEN** a developer reads the README on npmjs.com
- **THEN** they find a clickable link that leads to the GitHub repository
