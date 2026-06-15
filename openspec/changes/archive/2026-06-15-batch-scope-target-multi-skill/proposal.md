## Why

In multi-skill packages, `npx . install` prompts for scope and target once per skill rather than once for the whole batch — 20 interactions for a 10-skill package. This is an unintentional consequence of bundling prompt collection and file installation into a single per-skill function (`runInstall()`), and it must be fixed so users can say "install all skills with these settings" in a single interaction.

## What Changes

- `runInstall()` in `packages/core/src/run.ts` is split into two concerns: prompt collection (called once before the skill loop) and per-skill installation (called once per skill, no prompts).
- `registerInstallCommand()` action handler is refactored to hoist scope+target prompt resolution above the skill loop, then iterate over skills calling only the install step.
- A consolidated summary line is printed after all skills are installed: `N skills × M targets installed · Xs`.
- The existing `runInstallPrompts()` function is unchanged; it is simply moved to be called once rather than once per skill.
- No new CLI flags, no public API changes, no changes to `install.ts`, adapters, `walk.ts`, or any other module.

## Capabilities

### New Capabilities

- `batch-install-prompt`: Multi-skill install collects scope and target once for the entire batch, then installs all skills to those targets without re-prompting, and prints a single consolidated summary.

### Modified Capabilities

- `cli-surface`: The install interaction flow gains multi-skill prompt-batching scenarios — scope and target are collected once when installing N skills, and a single consolidated summary is shown after all installs complete.

## Impact

- **`packages/core/src/run.ts`**: Only file changed. `runInstall()` (lines 122–213) refactored; `registerInstallCommand()` action handler (lines 432–465) updated to hoist prompt resolution.
- **Tests**: New test cases added to the existing unit test file `packages/core/test/unit/run-multi-skill.test.ts` (mock TTY, assert `select`/`checkbox` prompts fire once for a 2-skill package) and to the existing integration test file `packages/core/test/integration/install.test.ts` (multi-skill fixture with flags, assert single consolidated summary line).
- **No breaking changes**: `--scope`, `--target`, and `--yes` flag behaviour is unchanged; non-interactive path is unchanged.
