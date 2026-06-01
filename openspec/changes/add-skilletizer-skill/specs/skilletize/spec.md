## ADDED Requirements

### Requirement: Skilletize fixture has a multi-file structure
`packages/core/fixtures/skilletize/` SHALL contain the following files:

```
fixtures/skilletize/
├── SKILL.md
└── resources/
    ├── package.json.template
    └── bin/
        └── cli.js
```

`SKILL.md` SHALL have valid `name: skilletize` and `description` frontmatter plus a non-empty markdown body with generic skill instructions usable by any AI agent. The `resources/` subfolder SHALL contain template files referenced by the skill that the AI scaffolds into the target project.

#### Scenario: Fixture directory has expected structure
- **WHEN** `packages/core/fixtures/skilletize/` is listed recursively
- **THEN** `SKILL.md`, `resources/package.json.template`, and `resources/bin/cli.js` all exist

#### Scenario: SKILL.md has valid frontmatter
- **WHEN** `normalizeSkill('packages/core/fixtures/skilletize')` is called
- **THEN** it returns a `NormalizedSkill` with `name: 'skilletize'`, a non-empty `description`, and a non-empty `contentHash`

---

### Requirement: SKILL.md guides an AI to scaffold a Skillet npm package
The `SKILL.md` content SHALL be a generic skill (no adapter-specific syntax) that instructs any AI agent to convert a raw skill directory into a publishable Skillet npm package. The instructions SHALL cover:

- Detecting existing skill files in the current directory (any `.md` file or a `SKILL.md`)
- Scaffolding `package.json` using `resources/package.json.template` as the template (fill in `name`, `version`, `description`, `bin`, and `dependencies` with `@skillet-cli/core`)
- Creating `bin/cli.js` using `resources/bin/cli.js` as the template, wiring the `skillDir` option to point to the skill directory
- Confirming with the user before writing any files

#### Scenario: Skill instructions reference resource templates
- **WHEN** `SKILL.md` is read
- **THEN** the content references `resources/package.json.template` and `resources/bin/cli.js` by relative path

#### Scenario: SKILL.md contains no adapter-specific syntax
- **WHEN** `SKILL.md` is read
- **THEN** it contains no Claude Code–only frontmatter keys or adapter-specific directives

---

### Requirement: Resource templates are valid and self-contained
`resources/package.json.template` SHALL be a valid JSON object (with placeholder values for `name`, `version`, `description`) that includes the `bin` field mapping to `./bin/cli.js` and a `dependencies` entry for `@skillet-cli/core`.

`resources/bin/cli.js` SHALL be a complete, working ESM CLI entry point that:
- Uses `#!/usr/bin/env node` shebang
- Imports `createRequire` from `node:module` and `run` from `@skillet-cli/core`
- Reads `package.json` via `createRequire`
- Calls `run({ skillDir: ..., pkg })` pointing `skillDir` to the skill directory

#### Scenario: resources/bin/cli.js is a valid ESM module
- **WHEN** `resources/bin/cli.js` is read
- **THEN** it contains `import { run } from '@skillet-cli/core'` and a `run({ skillDir` call

#### Scenario: package.json.template has required keys
- **WHEN** `resources/package.json.template` is parsed as JSON
- **THEN** it has `name`, `version`, `bin`, and `dependencies` fields, and `dependencies['@skillet-cli/core']` is present

---

### Requirement: packages/core bin entry point points to skilletize fixture
`packages/core/bin/cli.js` SHALL resolve `skillDir` to `packages/core/fixtures/skilletize/` (not `hello-skill/`).

#### Scenario: CLI demo installs the Skilletize skill
- **WHEN** `bin/cli.js` is read
- **THEN** the `skillDir` URL resolves to `fixtures/skilletize`
