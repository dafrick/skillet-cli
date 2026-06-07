## ADDED Requirements

### Requirement: CLI exits cleanly on Ctrl+C during interactive prompts
When the user presses Ctrl+C during any interactive prompt, the CLI SHALL catch the resulting `ExitPromptError` from `@inquirer/core`, print a brief exit message to stderr, and terminate with exit code 0. No stack trace SHALL be written to stdout or stderr.

#### Scenario: Ctrl+C during scope prompt exits cleanly
- **WHEN** the user presses Ctrl+C while the scope select prompt is displayed
- **THEN** the process prints a brief exit message and exits with code 0, with no stack trace visible

#### Scenario: Ctrl+C during target multi-select exits cleanly
- **WHEN** the user presses Ctrl+C while the target checkbox prompt is displayed
- **THEN** the process prints a brief exit message and exits with code 0, with no stack trace visible

#### Scenario: Ctrl+C during drift prompt exits cleanly
- **WHEN** the user presses Ctrl+C while the drift action select prompt is displayed
- **THEN** the process prints a brief exit message and exits with code 0, with no stack trace visible

#### Scenario: Exit message appears on its own line
- **WHEN** Ctrl+C is pressed mid-prompt (which may leave partial output on the current line)
- **THEN** the exit message is preceded by a newline so it always starts on a fresh line
