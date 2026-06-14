## Context

`packages/create/src/scaffold.ts` contains `runSync`, a helper that builds a shell command string and calls `spawnSync` with `stdio: 'inherit'`. When `npm init -y` is called through `runSync`, npm unconditionally prints a `"Wrote to <path>/package.json:\n{...}"` block to its own stdout. Because stdio is inherited, this output passes directly to the terminal, showing npm's default values (`"version": "1.0.0"`, `"license": "ISC"`, `"type": "commonjs"`, `"author": ""`). The subsequent `npm pkg set` commands (step 2) run silently and update the file to the user's configured values, but no follow-up output corrects the display. The terminal is left showing wrong intermediate state.

The existing `runSync` signature is `(cmd, args, stepName): void` with no way to customize `stdio`. All callers (npm init, npm pkg set, repository set) currently inherit all three streams.

## Goals / Non-Goals

**Goals:**
- Suppress `npm init -y`'s stdout so the "Wrote to..." block never reaches the terminal.
- After all `npm pkg set` commands complete, print the final `package.json` content to stdout so the user sees accurate, configured values.
- Preserve all error output — npm errors must still reach the terminal.
- Keep the change minimal and contained to the scaffold execution path.

**Non-Goals:**
- Changing how `npm pkg set`, `npm install`, or any other command handles stdio.
- Modifying the prompts, detection, or skill-dir setup phases.
- Handling the case where `package.json` already exists (that path skips `npm init -y` entirely).
- Changing the `shell: true` approach or the Windows `.cmd` workaround.

## Decisions

### Decision 1: Add an optional `stdio` parameter to `runSync`

**Choice:** Extend `runSync` with a fourth optional parameter `stdioOverride?: StdioOptions` that defaults to `'inherit'` when not provided.

**Rationale:** This is the least-invasive change. All existing callers continue to work without modification. Only the `npm init -y` call passes a custom value (`['inherit', 'pipe', 'inherit']` to capture stdout while keeping stdin and stderr inherited).

**Alternatives considered:**
- Create a separate `runSyncQuiet` function — rejected because it duplicates logic and adds surface area without benefit.
- Inline `spawnSync` directly at the call site — rejected because it bypasses the error-handling and shell-escaping logic that `runSync` provides.
- Switch to writing `package.json` directly via `fs.writeFile` — rejected because the spec (`skilletize-wizard`) explicitly requires `npm init -y` and `npm pkg set` only; no direct file writes.

### Decision 2: Print the final `package.json` after "Seasoning done"

**Choice:** After `spinner.succeed('Seasoning done')` and after the repository URL block, read `package.json` from disk using `fs.readFileSync` and write its content to stdout with a leading label: `'\npackage.json written:\n' + content + '\n'`.

**Rationale:** Reading from disk guarantees the output reflects the true final state (including any field ordering or formatting npm applies), not a re-serialized in-memory object. The label mirrors npm's own "Wrote to..." framing but is accurate because it appears after all mutations are complete.

**Alternatives considered:**
- Print nothing (silently suppress all package.json display) — rejected because users expect to see what was written; suppression creates a different kind of uncertainty.
- Reconstruct the JSON from `config` in memory — rejected because npm may reorder or normalize fields; disk read is the ground truth.
- Print immediately after `npm init -y` with a note that it will be updated — rejected because it adds complexity and still shows wrong values mid-run.

### Decision 3: Capture only stdout, not stderr, for `npm init -y`

**Choice:** Use `['inherit', 'pipe', 'inherit']` (stdin inherit, stdout pipe, stderr inherit).

**Rationale:** npm error messages go to stderr. Capturing only stdout ensures that if `npm init -y` fails in an unexpected way, the error still reaches the terminal. The captured stdout value is discarded (not used).

## Risks / Trade-offs

- [Risk] `runSync` with `stdio: ['inherit', 'pipe', 'inherit']` returns stdout as a Buffer in `result.stdout` — this is allocated in memory even though we discard it. For `npm init -y` the output is small (a few hundred bytes), so memory impact is negligible.
- [Risk] If npm changes how it formats or routes its init output in a future version, the fix may not be needed — but it will also not break anything, since stdout capture is a no-op if npm stops printing to stdout.
- [Trade-off] The `StdioOptions` type import from `node:child_process` adds a type-only import to `scaffold.ts` — minimal coupling, already used via `spawnSync`.

## Migration Plan

No deployment migration needed. This is a behavior change to a CLI tool, not a service. The change takes effect when users install the updated `@skillet-cli/create` package.

## Open Questions

_(none)_
