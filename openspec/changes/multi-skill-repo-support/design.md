## Context

`create-skillet` is the wizard in `packages/create/` that scaffolds a skill repo into an npm package. Detection (`detect.ts`) already scans the repo and populates `DetectionResult.discoveredSkillDirs[]` with relative paths to every directory containing a `SKILL.md`. When that array has more than one entry, `prompts.ts` currently shows a `select()` menu and lets the user pick a single skill — which is wrong. The correct behavior is to package all skills into a single npm package by writing `skillet.skills` (a parent-directory key) to `package.json` instead of `skillet.skillDir` (a single-skill path).

The `@skillet-cli/core` runtime already supports both keys:
- `skillet.skillDir` (string): direct path to a directory containing `SKILL.md`
- `skillet.skills` (string | string[]): one or more parent directories whose immediate subdirectories are scanned for `SKILL.md`

No changes to core are needed. The work is entirely in `packages/create/`.

## Goals / Non-Goals

**Goals:**
- Replace the single-skill `select()` picker with an inform-and-confirm flow for multi-skill repos
- Add `isMultiSkill: boolean` and `skillsParentDirs: string[]` to `WizardConfig`
- Automatically derive common parent directories from `discoveredSkillDirs` using `path.dirname()` + Set deduplication
- Write `skillet.skills` (not `skillet.skillDir`) in `scaffold.ts` when `isMultiSkill` is true
- Update the `run.ts` preview block to show parent directories for multi-skill packages
- Keep the single-skill path fully intact

**Non-Goals:**
- Batch packaging (N separate npm packages from one repo)
- Monorepo / workspaces publish support
- Changes to `@skillet-cli/core` runtime
- Changes to `detect.ts` or `skill-dir.ts`
- Allowing the user to manually override or subset the multi-skill selection

## Decisions

### Decision: Inform-and-confirm rather than a select menu

**Chosen:** Show a list of discovered skills, inform the user all will be packaged together, then ask a single yes/no confirm.

**Alternative considered:** Keep the select menu but add a "package all" option at the top.

**Rationale:** The multi-skill-as-one-package model is not optional — it is the only correct behavior for multi-skill repos in the current architecture. Presenting a picker implies a choice that doesn't exist. An informational step + confirm is both honest and simpler.

### Decision: Derive parent directories automatically via `path.dirname()`

**Chosen:** For each entry in `discoveredSkillDirs` (e.g. `skills/brainstorming/`), call `path.dirname()` → `skills`, then deduplicate with a `Set`. Result is a `string[]` (e.g. `["skills"]` or `["core", "exp"]`).

**Alternative considered:** Ask the user to confirm or enter the parent path manually.

**Rationale:** The parent directories are mechanically derivable from `discoveredSkillDirs`. Asking the user adds friction without value — they already confirmed which repo they're in.

### Decision: Write `skillet.skills` as a plain string when all skills share one parent; JSON array when they span multiple parents

**Chosen:** `skillsParentDirs.length === 1` → `npm pkg set skillet.skills=<dir>`; else → `npm pkg set skillet.skills=["a","b"]`.

**Alternative considered:** Always write an array.

**Rationale:** The core runtime supports both forms, and the string form is more readable for the common case. Writing an array unconditionally would be surprising for users inspecting `package.json` when there's only one parent.

### Decision: Add `isMultiSkill` and `skillsParentDirs` to `WizardConfig`; keep `skillDir` field

**Chosen:** Add the two new fields. When `isMultiSkill` is true, `skillDir` holds the first discovered dir as a fallback but `skillsParentDirs` is the authoritative source for `scaffold.ts`.

**Alternative considered:** Replace `skillDir: string` with a discriminated union type.

**Rationale:** A discriminated union would require broader type changes across the codebase. Additive fields are lower-risk and the existing `skillDir` field is still needed for the single-skill path.

### Decision: `scaffold.ts` branches on `isMultiSkill` to choose which `npm pkg set` command to run

**Chosen:** `if (config.isMultiSkill)` → set `skillet.skills`; else → set `skillet.skillDir` as today.

**Rationale:** Keeps the single-skill scaffold path byte-for-byte identical. The new branch is isolated and testable independently.

## Risks / Trade-offs

- **Skills spanning multiple parent directories produce a JSON array value** for `skillet.skills`. The `npm pkg set` command serializes arrays as JSON. This is correct per the core spec, but visually unusual in `package.json`. Mitigation: document in the preview step what will be written.
- **No rollback if confirm is declined mid-flow** — but this is unchanged from today; the confirm gates exist for exactly this reason.
- **`path.dirname()` on a path like `./` returns `.`** — edge case if a skill is discovered at the root. Mitigation: normalize discovered paths before deriving parents; a root SKILL.md is already handled by `skill-dir.ts` and the single-skill path.
