## Context

`packages/create/src/skill-dir.ts` contains the logic that drives the file-picker step of `create-skillet`. When a flat repo (SKILL.md at root, with sibling content) has 12 or fewer items, the wizard shows a multi-select checkbox. `getPreselected()` determines which items start checked.

Currently, `getPreselected()` returns `true` only for:
1. `SKILL.md` itself
2. Items whose names match the `SKILL_DIRS` constant: `['resources', 'assets', 'templates']`

Everything else — including common companion directories like `scripts/`, `prompts/`, `examples/` — defaults to unchecked. A user who accepts defaults silently ships an incomplete package.

## Goals / Non-Goals

**Goals:**
- All non-infrastructure sibling content is pre-selected by default in the file-picker checkbox
- Known infrastructure/noise items are excluded from pre-selection via a blocklist
- `SKILL_DIRS` is removed from `getPreselected()` only — the constant itself is retained for the `>12 items` branch at line 90
- Tests and spec are updated to reflect the new behavior

**Non-Goals:**
- The `>12 items` collapsed-confirm path (separate UX concern, out of scope)
- `readDirItems()` filter improvements (e.g., excluding `node_modules/` from the presented list) — only pre-selection logic changes
- Changes to `prompts.ts`, `scaffold.ts`, or `run.ts`
- Multi-skill packaging path

## Decisions

### Decision 1: Invert from allowlist to blocklist

**Chosen:** Replace the allowlist (`SKILL_DIRS`) with a blocklist. `getPreselected()` returns `true` for every item not on the blocklist.

**Alternatives considered:**
- *Keep allowlist, expand it* — Requires constant maintenance as skill repos diversify. Still wrong by default for any name not on the list.
- *Select all without exception* — Simpler, but surfaces infrastructure noise (`package.json`, `node_modules/`) as pre-selected items, increasing cognitive load and the risk of accidentally packaging noise.

**Rationale:** A blocklist matches the semantics of the problem: companion content is the common case; infrastructure is the exception to exclude. The user can still deselect anything that appears erroneously.

### Decision 2: Blocklist membership

The blocklist covers items that are infrastructure, tooling metadata, or generated artifacts — never skill content:

| Item | Reason |
|---|---|
| `README.md` | Documentation, not companion content (already excluded) |
| Dotfiles / dot-folders | Hidden configuration (already excluded) |
| Lock files (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) | Dependency lock files (already excluded) |
| `package.json` | npm manifest — not skill content |
| `node_modules/` | npm dependency tree — never user content |
| `bin/` | Generated entrypoint directory created by the wizard itself |

**Not on the blocklist:** `scripts/`, `prompts/`, `examples/`, `assets/`, `templates/`, `resources/`, and any other directories — all pre-selected.

### Decision 3: Remove SKILL_DIRS from `getPreselected()` only — keep the constant

`SKILL_DIRS` is used in two places in `skill-dir.ts`:
1. **Line 31 (inside `getPreselected()`)** — the allowlist check being replaced by the blocklist
2. **Line 90 (inside the `>12 items` collapsed-confirm branch)** — names "other skill-related folders" as a hint to the user

The allowlist check is removed from `getPreselected()`, but the constant itself must remain so line 90 continues to compile and produce its existing hint text. `LOCK_FILES` is retained and joined by a new `EXCLUDED_NAMES` set (or equivalent inline check) covering `package.json`, `node_modules`, and `bin`.

### Decision 4: Test-driven implementation order

Tests in `packages/create/test/unit/skill-dir.test.ts` must be updated BEFORE the implementation changes. The existing test file does NOT contain any assertion that `scripts/` is not pre-selected — there is no assertion to flip.

The correct TDD steps are:
1. Add a NEW test asserting `scripts/` IS pre-selected (currently fails because the allowlist excludes it)
2. Add NEW tests asserting `package.json`, `node_modules/`, and `bin/` are NOT pre-selected (blocklist items)
3. Confirm the existing tests for `assets/` and `templates/` remain valid — those directories are not on the blocklist, so they continue to be pre-selected after the fix
4. Then update `skill-dir.ts` to make the new tests pass

This ensures the new tests encode the intended behavior before any implementation changes.

## Risks / Trade-offs

- **Risk: A repo has a `bin/` directory that IS skill content** → The user can uncheck `bin/` from the pre-selected list and manually re-check it. The UX still defaults to wrong, but it's a rare edge case and the checkbox path always allows correction. Mitigation: the blocklist is documented in the spec so the behavior is explicit.
- **Risk: `node_modules/` appears in the checkbox list if scaffolding is incomplete** → `readDirItems()` does not currently filter `node_modules/`. This is a pre-existing issue and out of scope for this change. Even if it appears, the blocklist ensures it is not pre-selected.
- **Trade-off: More items pre-selected = more to review** — The user must scroll and uncheck noise if any slips through the blocklist. This is preferable to the current default of missing companion content silently.
