## Why

The `create-skillet` wizard runs `npm install @skillet-cli/core` silently, with no visible progress output in TTY or non-TTY (CI/Docker) environments. On a cold npm cache or slow network this install takes 2–5+ minutes, giving users no way to distinguish "working slowly" from "hung" — the exact situation reported in issue #61.

## What Changes

- **Remove** the `spinner.start` / `spinner.succeed` wrapper around the npm install step in `packages/create/src/scaffold.ts`. The spinner writes a static character to stdout with no newline and no animation, which interferes with npm's own output and is a no-op in non-TTY mode.
- **Add** a plain `process.stdout.write` line immediately before the `spawnSync` install call, emitting a message such as `\nInstalling @skillet-cli/core (first run may take a few minutes)…\n`. A plain write is required (not a spinner `start`) because the spinner is a no-op in non-TTY mode — the exact environment where the hang was observed.
- **Retain** `stdio: 'inherit'` on the `spawnSync` call so npm's own output (package-addition lines, progress bar) continues to reach the terminal in TTY contexts.
- **Add or update unit tests** in `packages/create/test/` to assert that the progress message is written to stdout in both TTY and non-TTY contexts, following a test-first approach.

No new abstractions, flags, or dependencies are introduced. This is approximately a 5-line change to `scaffold.ts` plus corresponding test updates.

## Capabilities

### New Capabilities

- `install-progress-message`: A plain-text progress message emitted to stdout before the npm install step in the `create-skillet` scaffold flow, visible in both TTY and non-TTY environments.

### Modified Capabilities

- `skilletize-wizard`: The install step within the wizard's scaffold phase changes its output behavior — the spinner wrapper is removed and a plain progress message is used instead.

## Impact

- **Files changed**: `packages/create/src/scaffold.ts`, `packages/create/test/` (unit tests for scaffold)
- **No API changes**: `executeScaffold` signature is unchanged
- **No dependency changes**: No new packages required
- **No breaking changes**: Output is additive; the install still succeeds or fails as before
- **Packages unaffected**: `packages/core`, `packages/ui` (spinner API), `packages/cli`
