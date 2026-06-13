## Context

The `packages/create` package has the npm package name `create-skillet` (per `packages/create/package.json`). Two archived OpenSpec task files reference the wrong filter name `@skillet-cli/create`, which would silently match no package if someone ran those commands verbatim. The fix is a pure find-and-replace in documentation files with no architectural implications.

## Goals / Non-Goals

**Goals:**
- Correct the pnpm filter name in all affected archived `tasks.md` files so they match the actual package name `create-skillet`.

**Non-Goals:**
- Changing any source code, tests, or configuration.
- Renaming the package itself.
- Modifying any active (non-archived) change files.
- Adding new linting or validation to prevent future drift.

## Decisions

**Direct text replacement in place** — edit each affected line in the two archived `tasks.md` files. No tooling or scripting layer is warranted for a four-line correction in static documentation.

Alternative considered: a grep-based script to catch all occurrences automatically. Rejected because the full set of affected lines is already known and static; scripting adds complexity without benefit.

## Risks / Trade-offs

[Stale archived docs] → The archived files are historical records, not active instructions. Editing them is low risk; the only concern is altering the historical record, which is acceptable since the original content was incorrect.

[Missing occurrences] → Discovery already confirmed exactly four affected lines across two files and zero occurrences in active changes, proposal files, or design files. The scope is fully bounded.
