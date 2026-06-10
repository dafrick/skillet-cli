## ADDED Requirements

### Requirement: Plain progress message emitted before npm install in all environments
Before invoking `npm install @skillet-cli/core`, `executeScaffold` SHALL write a plain-text progress line to `process.stdout` using `process.stdout.write`. This write SHALL occur regardless of whether stdout is a TTY. The message SHALL mention `@skillet-cli/core` and set expectations about duration (e.g., "this may take a few minutes on first run").

#### Scenario: Progress message emitted in TTY environment
- **WHEN** `executeScaffold` is called and stdout is a TTY
- **THEN** a line containing `@skillet-cli/core` is written to stdout before the npm install `spawnSync` call

#### Scenario: Progress message emitted in non-TTY environment
- **WHEN** `executeScaffold` is called and stdout is not a TTY (CI, Docker, piped output)
- **THEN** a line containing `@skillet-cli/core` is written to stdout before the npm install `spawnSync` call

#### Scenario: Progress message appears before npm install output
- **WHEN** `executeScaffold` runs the full scaffold flow
- **THEN** the progress message write occurs before the `spawnSync('npm install @skillet-cli/core', ...)` call in program order

### Requirement: Confirmation message written after successful npm install
After `npm install @skillet-cli/core` completes successfully, `executeScaffold` SHALL write a plain-text confirmation line to `process.stdout` using `process.stdout.write`. The spinner's `start`/`succeed` wrapper SHALL NOT be used for the install step.

#### Scenario: Confirmation message written on success
- **WHEN** `spawnSync('npm install @skillet-cli/core', ...)` exits with status 0
- **THEN** a plain confirmation line is written to stdout after the install call

#### Scenario: No confirmation message on install failure
- **WHEN** `spawnSync('npm install @skillet-cli/core', ...)` exits with a non-zero status
- **THEN** no confirmation message is written; the error path is taken (spinner.fail, stderr write, process.exit(1))
