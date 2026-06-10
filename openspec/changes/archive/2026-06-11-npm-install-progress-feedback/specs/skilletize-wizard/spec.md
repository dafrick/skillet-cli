## MODIFIED Requirements

### Requirement: Install step emits plain progress output, not a spinner
The `create-skillet` scaffold step that installs `@skillet-cli/core` SHALL write a plain-text progress line to stdout via `process.stdout.write` immediately before invoking npm install, and a plain-text confirmation line after successful completion. The step SHALL NOT use `spinner.start` or `spinner.succeed` for this install step. The `spawnSync` call SHALL retain `stdio: 'inherit'` so npm's own output reaches the terminal.

#### Scenario: Install step produces a visible progress message
- **WHEN** the wizard reaches the npm install step
- **THEN** a plain-text line mentioning `@skillet-cli/core` is written to stdout before the install begins, visible in both TTY and non-TTY contexts

#### Scenario: Install step does not use spinner.start before npm install
- **WHEN** the wizard reaches the npm install step
- **THEN** `spinner.start` is NOT called immediately before the `spawnSync` npm install call

#### Scenario: npm install output passes through to terminal in TTY context
- **WHEN** the wizard runs the npm install step in a TTY environment
- **THEN** npm's stdout and stderr are inherited (passed through directly) rather than captured
