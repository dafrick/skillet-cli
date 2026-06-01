## ADDED Requirements

### Requirement: package.json includes a license field
`packages/core/package.json` SHALL include a `"license"` field set to `"MIT"`, matching the `LICENSE` file at the repository root.

#### Scenario: License appears on the npm package page
- **WHEN** the package is published and the npm page is viewed
- **THEN** the sidebar shows "MIT" as the license

---

### Requirement: package.json includes a repository field
`packages/core/package.json` SHALL include a `"repository"` field in object form:
```json
{
  "type": "git",
  "url": "git+https://github.com/dafrick/skillet.git",
  "directory": "packages/core"
}
```
The `directory` key SHALL be present because this is a monorepo package, allowing tools to resolve the correct subdirectory.

#### Scenario: npm repo command opens the GitHub page
- **WHEN** a developer runs `npm repo @skillet-cli/core`
- **THEN** the GitHub repository page opens in their browser

#### Scenario: npm package page shows repository link
- **WHEN** the package is published and the npm page is viewed
- **THEN** the sidebar shows a "Repository" link pointing to the GitHub repo

---

### Requirement: package.json includes a homepage field
`packages/core/package.json` SHALL include a `"homepage"` field pointing to the GitHub repository URL (`https://github.com/dafrick/skillet`).

#### Scenario: npm package page shows homepage link
- **WHEN** the package is published and the npm page is viewed
- **THEN** the sidebar shows a "Homepage" link

---

### Requirement: package.json includes a bugs field
`packages/core/package.json` SHALL include a `"bugs"` field:
```json
{
  "url": "https://github.com/dafrick/skillet/issues"
}
```

#### Scenario: npm bugs command opens the issues page
- **WHEN** a developer runs `npm bugs @skillet-cli/core`
- **THEN** the GitHub issues page opens in their browser

---

### Requirement: package.json includes a keywords field
`packages/core/package.json` SHALL include a `"keywords"` array containing at minimum: `"ai"`, `"agents"`, `"skills"`, `"claude"`, `"copilot"`, `"cli"`, `"installer"`. Keywords SHALL be lowercase strings.

#### Scenario: Package appears in npm search for "ai skills"
- **WHEN** a developer searches npm for "ai skills"
- **THEN** `@skillet-cli/core` appears in results
