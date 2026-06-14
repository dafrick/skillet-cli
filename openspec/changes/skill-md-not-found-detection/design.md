## Context

`packages/create/src/run.ts` line 34 prints the early gate summary line:

```ts
process.stdout.write(`SKILL.md:     ${detected.hasSkillMd ? 'found' : 'not found'}\n`);
```

`hasSkillMd` is a boolean that checks only for a root-level `SKILL.md`. Users who organize their projects with `SKILL.md` inside a subdirectory (e.g. `skill/openspec-auto/SKILL.md`) always see `not found` here, even though `DetectionResult.discoveredSkillDirs` already holds the discovered path(s) and the rest of the wizard uses that information correctly.

`DetectionResult` (from `detect.ts`) already exposes three relevant fields:
- `hasSkillMd: boolean` — root-level check
- `discoveredSkillDirs: string[]` — recursive scan results, relative paths with trailing slash
- `skillDir: string | null` — resolved best candidate

No changes to `DetectionResult` or `detectEnvironment()` are needed.

## Goals / Non-Goals

**Goals:**
- Make the `SKILL.md:` early gate line accurately reflect whether a `SKILL.md` was found anywhere in the project.
- Keep the logic extractable and unit-testable without mocking interactive prompts.
- Cover the helper with unit tests written test-first (TDD).

**Non-Goals:**
- Changing `DetectionResult`, `detectEnvironment()`, `scanForSkillMds()`, `skill-dir.ts`, or `prompts.ts`.
- Changing the behavior of the wizard beyond the single display line.
- Renaming the `SKILL.md:` label in the output.
- Adding new dependencies.

## Decisions

### Decision: Extract `skillMdStatus` as a pure named export in `run.ts`

**Chosen:** Add `export function skillMdStatus(detected: DetectionResult): string` in `run.ts` and call it from the display line.

**Rationale:** The function is pure (no I/O, no side-effects) and depends only on `DetectionResult`. Exporting it from `run.ts` lets unit tests import it directly without mocking `@inquirer/prompts` or `commander`. This avoids creating a separate utility file for a one-function change.

**Alternative considered:** Move to a dedicated `utils.ts`. Rejected — overkill for a single helper; increases file count with no structural benefit.

**Alternative considered:** Inline the ternary. Rejected — a three-branch conditional is hard to read and impossible to unit test without integration setup.

### Decision: Status string format

```ts
export function skillMdStatus(detected: DetectionResult): string {
  if (detected.hasSkillMd) return 'found';
  if (detected.discoveredSkillDirs.length === 1) return `found in ${detected.discoveredSkillDirs[0]}`;
  if (detected.discoveredSkillDirs.length > 1) return `found in ${detected.discoveredSkillDirs.length} locations`;
  return 'not found';
}
```

**Rationale:**
- Root `SKILL.md` → `"found"` (no path suffix needed, root is implied).
- Exactly one discovered location → `"found in skill/openspec-auto/"` (the relative path with trailing slash from `scanForSkillMds`). Tells the user exactly where without being verbose.
- Multiple locations → `"found in 3 locations"` (count only; listing all paths would overflow the summary line).
- None → `"not found"` (unchanged from current behavior when truly absent).

**Alternative considered:** Always print the path(s) for multiple locations. Rejected — the line label format `SKILL.md:     <value>` is single-line; listing multiple paths would break visual alignment. The count is sufficient for the summary gate.

### Decision: Test placement

Unit tests go in `packages/create/test/unit/run.test.ts` (new file), importing `skillMdStatus` directly. This follows the existing pattern (`detect.test.ts`, `scaffold.test.ts`, etc.) and keeps pure-function tests separate from e2e tests.

## Risks / Trade-offs

- [`run.ts` already imports `DetectionResult` transitively via `detectEnvironment`] Adding `export function` in `run.ts` is non-breaking — no callers of `run.ts` outside the package entry point exist. Low risk.
- [Display string is not a formal API] The status string values (`"found"`, `"found in …"`, `"not found"`) are user-facing output, not a structured type. If format changes are needed later, only `skillMdStatus` needs updating. Low risk.
- [Single-dir path display depends on `scanForSkillMds` output format] The trailing slash convention (`skill/openspec-auto/`) is already established in `detect.ts`. The helper mirrors it directly. Low risk.
