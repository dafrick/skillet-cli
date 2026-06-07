## Why

When a user presses Ctrl+C during any interactive prompt, the CLI crashes with an `ExitPromptError` stack trace instead of exiting cleanly. This is a rough edge that makes the tool feel broken rather than polished.

## What Changes

- Catch `ExitPromptError` from `@inquirer/core` at the top level of `run()` and exit gracefully with a brief message
- No other behavior changes; only the Ctrl+C interrupt path is affected

## Capabilities

### New Capabilities

- `graceful-exit-behavior`: The CLI handles Ctrl+C interrupts during interactive prompts by printing a short exit message and terminating cleanly instead of crashing with a stack trace

### Modified Capabilities

_(none — the cli-surface spec's error-handling requirement already states "no stack traces to stdout"; this change brings behavior into compliance with that intent for the SIGINT case)_

## Impact

- `packages/core/src/run.ts` — add `ExitPromptError` catch around `program.parseAsync`
- No API surface, dependency, or adapter changes required
