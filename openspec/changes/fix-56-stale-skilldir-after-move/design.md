## Context

`create-skillet` generates a `bin/cli.js` and `package.json` during the scaffold phase (`executeScaffold`), then runs a separate skill directory setup phase (`setupSkillDir`) that may move files into `skill/`. The scaffold phase writes `skillDir` into `bin/cli.js` as a hardcoded `new URL('../<skillDir>', import.meta.url)` expression and also writes `skillet.skillDir` into `package.json` via `npm pkg set`. Both are written before the file-move step — so if files are moved, both values become stale.

Current flow:
```
executeScaffold(config)
  → writes bin/cli.js with config.skillDir (e.g., "./")
  → sets package.json skillet.skillDir to config.skillDir
setupSkillDir(detected)
  → moves SKILL.md (and others) into skill/
  → [nothing updates bin/cli.js or package.json]
```

## Goals / Non-Goals

**Goals:**
- After the file-move step, `bin/cli.js` references `skill/` as the skill URL
- After the file-move step, `package.json`'s `skillet.skillDir` is updated to `./skill/`
- The fix is contained entirely within the `packages/create` package
- `buildBinCliJs()` is the single source of template truth for both scaffold and post-move writes

**Non-Goals:**
- Removing `skillDir` from `bin/cli.js` entirely (Option B from the issue) — this would require core changes to support `skillet.skillDir` as a fallback, which is a separate change
- Modifying `@skillet-cli/core`
- Handling arbitrary skill directory renames beyond the `skill/` convention

## Decisions

### Decision 1: Export `buildBinCliJs` from scaffold.ts

**Choice**: Export `buildBinCliJs(skillDir: string): string` from `scaffold.ts` and import it in `skill-dir.ts`.

**Rationale**: A single template function eliminates duplication. If the generated binary ever changes (new imports, different call signature), only one place needs updating.

**Alternative considered**: Duplicate the template string in `skill-dir.ts`. Rejected — divergence risk is high since the template is non-trivial.

### Decision 2: Post-move writes happen at the end of `setupSkillDir`

**Choice**: After the move loop completes successfully (all files moved), `setupSkillDir` rewrites `bin/cli.js` using `buildBinCliJs('skill/')` and runs `npm pkg set skillet.skillDir=./skill/`.

**Rationale**: The move always targets `skill/` — the target directory is not configurable. The update can therefore be unconditional once any files are moved.

**Alternative considered**: Pass `config` from `run.ts` into `setupSkillDir` to make the target path dynamic. Rejected — the move step always creates `skill/` at the repo root; no dynamic path is needed for this fix.

### Decision 3: Use `spawnSync` for `npm pkg set` (consistent with scaffold.ts)

**Choice**: Reuse the existing `runSync` helper from `scaffold.ts` (exported alongside `buildBinCliJs`) for the `npm pkg set skillet.skillDir=./skill/` call.

**Rationale**: Consistent error handling, no new dependencies.

### Decision 4: Skip post-move update when no files are moved

**Choice**: The update is conditional — only runs when `selectedItems.length > 0` and the move completes without error.

**Rationale**: If the user selects no files or exits early, `bin/cli.js` is still correct (skillDir points to wherever SKILL.md actually is). No spurious update needed.

## Risks / Trade-offs

- **Partial move failure** → If one file move fails, the function calls `process.exit(1)` before reaching the update step. `bin/cli.js` is not updated, which is correct: the skill wasn't fully moved.
- **Hardcoded `skill/` target** → This fix only handles the `skill/` convention. If a future version made the target configurable, the hardcoded `'skill/'` in the post-move update would need revisiting. Low risk for now.
- **`npm pkg set` failure** → If the post-move `npm pkg set` fails (e.g., read-only filesystem), the wizard will print an error and exit 1. The user will have files moved but stale `package.json`. This is the same failure mode as any other `npm pkg set` call in the wizard and is acceptable.
