## Context

`packages/core/src/run.ts` wires up the CLI. The install command's action handler in `registerInstallCommand()` (line 432) iterates over each discovered skill and calls `runInstall()` (line 122) per skill. `runInstall()` bundles two concerns: prompt resolution (calling `runInstallPrompts()` at line 158) and the actual per-target file installation loop. Because `runInstallPrompts()` runs inside `runInstall()`, it fires once per skill — producing 2N prompt interactions for N skills.

The current function boundaries:
- `runInstallPrompts(allTargets, opts)` — prompts for scope and targets; returns `TargetOption[]`
- `runInstall(skill, pkg, hooks, opts, verbMode, ...)` — resolves targets (calling prompts if TTY), loops over targets, calls `performInstall`, prints summary line per skill
- `registerInstallCommand()` action — loops over skills, calls `runInstall()` per skill

## Goals / Non-Goals

**Goals:**
- Collect scope and target prompts exactly once for the entire batch, regardless of how many skills are in the package
- Print a single consolidated summary after all skills complete (e.g., `2 skills × 2 targets installed · 0.6s`)
- Keep per-skill spinner lines so the user sees progress per skill
- Maintain identical behavior for single-skill packages and non-interactive paths
- Preserve all existing flag semantics (`--scope`, `--target`, `--yes`, `--force`)

**Non-Goals:**
- Changes to `install.ts`, adapters, `walk.ts`, or any other module
- New CLI flags or public API surface changes
- Redesigning the `update` or `uninstall` commands
- Changing the per-skill spinner UX within the batch

## Decisions

### Decision 1: Split `runInstall()` into prompt resolution and per-skill install steps

**Chosen:** Extract the "resolve selectedTargets" block from `runInstall()` into a standalone function `resolveTargets(opts, isTTY)` that can be called once before the skill loop. Extract the per-skill install work (spinner + `performInstall`) into `installSkill(skill, selectedTargets, ...)`.

**Alternative considered:** Keep `runInstall()` intact but add a `preResolvedTargets` parameter that, when provided, skips the prompt. Rejected because it conflates two different call-sites in one function and requires callers to know the function's internal branching logic.

**Rationale:** Clean separation of concerns. `resolveTargets()` has no skill dependency — it only needs `opts` and environment state. `installSkill()` has no prompt dependency. The two are composed in `registerInstallCommand()`.

### Decision 2: Hoist prompt resolution into `registerInstallCommand()` action handler

**Chosen:** The action handler calls `resolveTargets()` once, then loops over skills calling `installSkill()`.

**Alternative considered:** Add a `batchInstall(skills, ...)` top-level function that owns both steps. Rejected — adds a third indirection for no benefit given the refactor is already local to `registerInstallCommand()`.

**Rationale:** Minimal diff. The loop over skills already lives in the action handler; hoisting one more call before it is the smallest possible change.

### Decision 3: Single consolidated summary line after all skills complete

**Chosen:** After the skills loop, print `N skills × M targets installed · Xs` (TTY) or `[pkg.name] N skills × M targets installed` (CI). Remove the per-skill summary line from `installSkill()`.

**Alternative considered (Option B):** Keep per-skill summary lines, add an extra batch summary at the end. Rejected — for a 10-skill package this would produce 10 redundant summary lines plus one final line, adding noise.

**Rationale:** One summary line per batch run is the expected UX for a batch operation. Per-skill spinner done lines (`✔ Seared claude …`) already confirm individual completion.

### Decision 4: TDD — write failing tests first

Tests for the new behavior must be written before the implementation refactor. Two tests are required:
1. **Unit test**: for a 2-skill package in TTY mode, `runInstallPrompts` (or its extracted equivalent) is called exactly once.
2. **Integration test**: `npx . install --target claude --scope user --yes` with a 2-skill fixture produces exactly one summary line containing `2 skills`.

## Risks / Trade-offs

- [Risk: Single-skill regression] Hoisting prompt resolution out of `runInstall()` removes the single-skill code path. Mitigation: the `resolveTargets()` function handles both N=1 and N>1 identically; single-skill packages pass a 1-element array and print `1 skill × M targets installed`.
- [Risk: "No targets selected" edge case] Currently each `runInstall()` call may print `No targets selected.` independently. After the refactor, target resolution happens once — if zero targets are selected, bail before the skill loop with a single message. Mitigation: explicit guard before the loop.
- [Risk: Error mid-batch] If `installSkill()` throws for skill 2 of 3, skills 3 is not installed and no summary prints. Mitigation: consistent with the current per-skill throw behavior; document in tasks that error handling behavior is unchanged (fail fast).

## Migration Plan

No deployment steps — this is a pure runtime code change inside `run.ts`. No data migration, no schema changes, no adapter interface changes. The change is backward-compatible: single-skill and non-interactive invocations produce identical output to today (modulo the summary line wording).

Rollback: revert the `run.ts` changes. No other files affected.

## Open Questions

(none — blocking questions resolved in discovery)
