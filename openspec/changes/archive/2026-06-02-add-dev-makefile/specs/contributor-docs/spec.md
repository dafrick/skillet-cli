## ADDED Requirements

### Requirement: CONTRIBUTING.md documents local build and manual testing
`CONTRIBUTING.md` SHALL include a "Local Build & Manual Testing" section that explains how to build the package, smoke-test the CLI, iterate with watch mode, and test against a local skill project using `pnpm link`.

#### Scenario: Contributor can smoke-test the CLI
- **WHEN** a contributor reads the local build section and runs `make run`
- **THEN** the CLI is built and prints its help output without requiring any additional configuration

#### Scenario: Contributor can iterate with watch mode
- **WHEN** a contributor reads the watch mode instructions
- **THEN** they can run `make watch` in one terminal and `make run` in another to get automatic recompilation on save

#### Scenario: Contributor can test against a real skill project
- **WHEN** a contributor reads the local linking instructions
- **THEN** they can link their local build into a skill project using `pnpm link --global` without re-linking after each build
