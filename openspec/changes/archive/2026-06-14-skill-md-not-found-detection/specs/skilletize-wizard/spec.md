## MODIFIED Requirements

### Requirement: Early gate informs user before making any changes
Before making any changes, the wizard SHALL display a summary of what was detected in the current directory and ask for confirmation. The summary SHALL include: (1) the absolute path of the current working directory, (2) the `SKILL.md` status using context-aware detection (root found, nested found with path, multiple found with count, or not found anywhere), (3) whether a `package.json` already exists, (4) the detected git user name (or "(not detected)" if unavailable). Declining SHALL print manual setup instructions and exit with code 0.

#### Scenario: Detection context shown at gate — SKILL.md at root
- **WHEN** the early gate is displayed and `SKILL.md` exists at the project root
- **THEN** the output includes the absolute current working directory path, `SKILL.md: found`, package.json presence, and detected git user

#### Scenario: Detection context shown at gate — SKILL.md in subdirectory only
- **WHEN** the early gate is displayed and no root `SKILL.md` exists but one is found inside a subdirectory (e.g. `skill/my-skill/SKILL.md`)
- **THEN** the `SKILL.md:` line reads `found in skill/my-skill/` rather than `not found`

#### Scenario: Detection context shown at gate — multiple SKILL.md files
- **WHEN** the early gate is displayed and `SKILL.md` files are found in two or more subdirectories
- **THEN** the `SKILL.md:` line reads `found in N locations` where N is the number of discovered directories

#### Scenario: Detection context shown at gate — no SKILL.md anywhere
- **WHEN** the early gate is displayed and no `SKILL.md` exists anywhere in the project
- **THEN** the `SKILL.md:` line reads `not found`

#### Scenario: User declines early gate
- **WHEN** the user runs `create-skillet` and answers "no" to the initial confirmation
- **THEN** the wizard prints manual setup instructions (npm init, npm pkg set, bin/cli.js steps) and exits with code 0 without making any changes

#### Scenario: User accepts early gate
- **WHEN** the user runs `create-skillet` and answers "yes" to the initial confirmation
- **THEN** the wizard proceeds to the NPM configuration phase
