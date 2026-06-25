## Context

`create-skillet` is a one-shot scaffold tool that authors use to initialize a new skill package. Once run, authors expand their skill over time — adding `prompts/`, `scripts/`, or additional skill directories. There is currently no lifecycle guidance for these post-publish expansion steps, and one code path (`.npmignore` always-overwrite in `scaffold.ts`) actively destroys customizations the author may have made via `create-skillet check`.

The three changes are independent and confined to `packages/create`. No changes to `@skillet-cli/core` or runtime install behavior.

## Goals / Non-Goals

**Goals:**
- Make `.npmignore` writes idempotent on scaffold re-run
- Surface post-publish expansion guidance at the moment of completion (wizard output)
- Document the full expansion workflow in `packages/create/README.md`

**Non-Goals:**
- New CLI commands or flags (`skillet update`, `create-skillet --update`)
- Changing how `files` is calculated during the wizard
- Changing multi-skill discovery logic
- Any changes to `@skillet-cli/core`

## Decisions

### 1. Conditional `.npmignore` write

**Decision:** Write `.npmignore` only when it does not already exist (`!fs.existsSync(npmignorePath)`).

**Rationale:** The `.npmignore` baseline (`**/node_modules\n`) is only meaningful on first scaffold. On subsequent runs, the file already exists and may have been extended by `create-skillet check` interactive triage or by the author directly. Always overwriting it silently destroys those customizations.

**Alternative considered:** Merge existing content with the baseline. Rejected — if the file exists, the baseline entry is either already there or the author intentionally removed it. A conditional write is simpler and preserves full author control.

### 2. "To expand your skill" in the completion block

**Decision:** Add 3–4 lines after the existing "Next steps" block in the wizard's completion output, covering: (a) adding new directories to `files`, (b) re-running `create-skillet` for structural changes, (c) using `create-skillet check` to verify the tarball.

**Rationale:** The completion block is the one moment every author sees after running the wizard. It is already the place for next-step guidance (`npx . install`, `npm publish`). A short "To expand your skill" addendum gives authors the map they need before they hit the gap, without requiring them to find the README.

**Alternative considered:** A separate `create-skillet help expand` subcommand. Rejected — the information is short enough for inline output and a subcommand would be overhead for a one-time read.

### 3. README section

**Decision:** Add a new "Expanding your skill" section to `packages/create/README.md` after the existing subcommands section.

**Rationale:** The README is the durable reference. The completion block is the discoverability hook; the README is where authors go when they've forgotten the details. Both serve different moments in the authoring lifecycle.

## Risks / Trade-offs

- **`.npmignore` conditional write may leave out `**/node_modules` on first run if the file was pre-created empty** → Acceptable: if the author created `.npmignore` manually before running the wizard, we respect their file. The `create-skillet check` will show them if `node_modules` leaks in.
- **Completion block output grows by 3–4 lines** → Minor. The existing block is already multi-line; the addendum is clearly separated and optional-reading.

## Migration Plan

No migration needed. The `.npmignore` fix is strictly additive — existing packages with customized `.npmignore` files benefit immediately on the next re-run; packages without a customized `.npmignore` see no change.
