## MODIFIED Requirements

### Requirement: NPM preview step shows a summary before npm execution
After all configuration prompts, the wizard SHALL display a human-readable summary of the actions it will take, framed as "Here's what I'll do:" (not "Commands to run:"). The summary SHALL describe each step in plain English rather than showing raw shell commands. The user must confirm before the wizard executes any steps.

#### Scenario: User reviews and proceeds
- **WHEN** the user confirms the preview
- **THEN** the wizard proceeds to npm execution

#### Scenario: User declines at preview
- **WHEN** the user answers "no" at the preview confirmation
- **THEN** the wizard prints "No changes made. Re-run `create-skillet` to start over." and exits with code 0 without touching the filesystem
- **Implementation note**: export the cancel message as a named constant (e.g., `CANCEL_MESSAGE`) so that tests assert against the constant rather than a string literal, preventing message-drift failures

#### Scenario: Preview uses "Here's what I'll do:" framing
- **WHEN** the wizard displays the pre-execution summary
- **THEN** the heading reads "Here's what I'll do:" and each listed action is described in plain language (e.g., "Initialize package.json", "Set package fields", "Install @skillet-cli/core") rather than as shell commands (e.g., `npm init -y`, `npm pkg set name=...`)

---

### Requirement: Install step emits plain progress output, not a spinner
The `create-skillet` scaffold step that installs `@skillet-cli/core` SHALL suppress npm's stdout by piping it rather than inheriting it. A single plain-text progress line SHALL be written to stdout before the install (e.g., `  Installing @skillet-cli/core…`) and a result line after. On success: `  ✓ Installed @skillet-cli/core`. On failure: the captured npm stderr SHALL be forwarded to the terminal and the wizard SHALL exit with code 1.

#### Scenario: Install step produces a visible progress message before starting
- **WHEN** the wizard reaches the npm install step
- **THEN** a plain-text line mentioning `@skillet-cli/core` is written to stdout before the install begins

#### Scenario: npm install stdout is suppressed
- **WHEN** the wizard runs the npm install step
- **THEN** npm's stdout output (package list, progress bars, audit summary) does NOT appear in the terminal; only the single-line indicator from the wizard is shown

#### Scenario: npm install stderr is shown on failure
- **WHEN** `npm install @skillet-cli/core` exits non-zero
- **THEN** the captured stderr is written to the terminal so the author can diagnose the failure, and the wizard exits with code 1

#### Scenario: Success line shown after install completes
- **WHEN** `npm install @skillet-cli/core` exits zero
- **THEN** the wizard writes `  ✓ Installed @skillet-cli/core` (or equivalent) to stdout

---

## ADDED Requirements

### Requirement: Plugin/extension marketplace support prompt is a single high-level opt-in
The wizard SHALL present a single high-level confirmation prompt for marketplace distribution: "Add plugin/extension marketplace support?" with a brief description of what it enables (Claude Code, Copilot CLI, and Gemini CLI plugin galleries). This replaces the two independent low-level prompts for Claude/Copilot manifests and Gemini extension. The high-level prompt defaults to `true` when a repository URL is present; `false` when absent. When the user opts in, two follow-up sub-prompts are shown — one for Claude Code + Copilot CLI and one for Gemini CLI — each defaulting to `true`. When the user opts out, both sub-prompts are skipped and `generateClaudePlugin` and `generateGeminiPlugin` are both `false`.

#### Scenario: High-level opt-in shown when repository URL present
- **WHEN** the user has provided a repository URL during configuration
- **THEN** the "Add plugin/extension marketplace support?" prompt defaults to `true`

#### Scenario: High-level opt-in defaults off when no repository URL
- **WHEN** no repository URL was provided
- **THEN** the "Add plugin/extension marketplace support?" prompt defaults to `false`

#### Scenario: Sub-prompts shown on opt-in
- **WHEN** the user answers "yes" to the high-level marketplace prompt
- **THEN** two follow-up confirms appear: one for Claude Code + Copilot CLI and one for Gemini CLI, each defaulting to `true`

#### Scenario: Sub-prompts skipped on opt-out
- **WHEN** the user answers "no" to the high-level marketplace prompt
- **THEN** neither the Claude/Copilot nor the Gemini sub-prompt is shown; both `generateClaudePlugin` and `generateGeminiPlugin` are `false`

#### Scenario: User can opt into one platform but not the other
- **WHEN** the user answers "yes" to the high-level prompt and "yes" to Claude/Copilot but "no" to Gemini
- **THEN** `generateClaudePlugin` is `true` and `generateGeminiPlugin` is `false`
