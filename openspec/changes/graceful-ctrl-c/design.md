## Context

`@inquirer/prompts` wraps `@inquirer/core`, which throws `ExitPromptError` when the user presses Ctrl+C during an active prompt. This exception propagates up through commander's `parseAsync`, through `run()`, and reaches Node.js unhandled — producing a raw stack trace to stdout and a non-zero exit.

The affected prompts in `run.ts` are: scope select, target multi-select, drift action select, uninstall multi-select, and GC confirm.

## Goals / Non-Goals

**Goals:**
- Catch `ExitPromptError` at the outermost `run()` boundary so all prompt sites are covered in one place
- Print a single, clean exit line and terminate with exit code 0
- No stack trace reaches stdout or stderr

**Non-Goals:**
- Catching other errors — existing error propagation is unchanged
- Changing prompt behavior itself (the prompts remain unchanged)
- Supporting `DEBUG=1` for this case (it's intentional user action, not an error)

## Decisions

### Catch at `run()` boundary, not per-prompt

**Decision:** Wrap `await program.parseAsync(argv)` in a single try/catch for `ExitPromptError`.

**Why over per-prompt catches:** There are five prompt call sites today and more may be added. A single catch at the top level is lower maintenance, can't be missed when adding new prompts, and keeps each prompt site clean.

**Alternative considered:** Wrapping each `await select(...)` / `await checkbox(...)` individually. Rejected — repetitive, easy to forget for new prompts.

### Exit code 0

**Decision:** Call `process.exit(0)` after printing the exit message.

**Why:** The user made a deliberate choice to cancel. This is not an error condition; it's normal flow. Exit code 0 avoids false positives in scripts that check `$?` after running a skill installer interactively.

**Alternative considered:** Exit code 130 (SIGINT convention). Rejected — convention applies when the process is killed by the OS signal handler, not when a library throws from within the process. The user sees a clean "Exiting..." message; callers should treat that as success.

### Message format

Print `\nExiting...\n` to stderr. The newline before ensures the message appears on its own line even if a prompt was mid-render.

## Risks / Trade-offs

- **Risk**: A future prompt outside `program.parseAsync` (e.g., in startup validation) would not be caught. → Mitigation: The current codebase has no such prompts; this is documented so future authors know where the catch lives.
- **Trade-off**: Exit code 0 on cancel means `echo $?` shows 0, which could confuse scripts expecting 130. → Acceptable: the CLI is interactive-first; scripted use bypasses prompts via `--yes` / `--target`.

## Open Questions

_(none)_
