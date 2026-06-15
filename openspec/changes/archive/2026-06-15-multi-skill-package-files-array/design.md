## Context

`create-skillet` generates a `package.json` for npm publishing via a sequence of `npm pkg set` calls in `executeScaffold` (`packages/create/src/scaffold.ts`). One of these calls sets the `files` allowlist that controls what `npm publish` includes in the tarball.

When multi-skill support was added (commit `730085d`), the `skillet.skills` field was correctly updated to use `skillsParentDirs`, but the `files` array construction was left unchanged. It still references `config.skillDir`, which in multi-skill mode is always `discoveredSkillDirs[0]` — the first skill directory, not a parent directory. The result: multi-skill packages publish only one skill.

`skillsParentDirs` (e.g. `["skills"]`) is already computed and deduplicated by `deriveParentDirs()` in `prompts.ts`. It is the right value to use for `files`: it covers all skill subdirectories in a single entry.

## Goals / Non-Goals

**Goals:**
- Fix the `files` array so all skill directories are included in `npm publish` for multi-skill packages
- Keep the single-skill `files` path byte-for-byte unchanged
- Add test coverage for the previously untested multi-skill `files` behavior
- Follow TDD: write failing tests first, then fix the implementation

**Non-Goals:**
- Changes to `prompts.ts`, `detect.ts`, `run.ts`, or `deriveParentDirs()` — these are correct
- Fixing `printPublishPreview` in `run.ts` (separate pre-existing issue)
- Changing how `skillsParentDirs` is computed

## Decisions

### Decision: Use `skillsParentDirs` for multi-skill `files` entries (not individual skill dirs)

**Chosen:** `files[1]=skills/` (parent dir), not `files[1]=skills/brainstorming/ files[2]=skills/debugging/` (individual dirs).

**Rationale:** `skillsParentDirs` is already computed and deduplicated. It produces the fewest `npm pkg set` arguments (one per parent, not one per skill). It also naturally covers future skills added under the same parent without requiring a re-scaffold. The issue description lists this as the first option and it matches how `skillet.skills` itself is written.

**Alternative considered:** List each individual skill dir. More explicit, but verbose, fragile (breaks when skills are added), and not how `skillet.skills` works.

### Decision: Normalize `skillsParentDirs` entries to have a trailing slash

**Chosen:** Ensure each entry ends with `/` before writing to `files[N]`.

**Rationale:** `deriveParentDirs()` strips trailing slashes (via `path.dirname()`). The npm `files` field works with or without trailing slashes, but a trailing slash makes directory inclusion explicit and matches the style shown in the issue's expected output. Normalization is a one-liner (`dir.endsWith('/') ? dir : dir + '/'`).

### Decision: Conditional branch in `pkgSetArgs` construction

**Chosen:** Build `filesArgs` as a separate array using `config.isMultiSkill`, then spread into `pkgSetArgs`.

**Rationale:** Keeps the construction readable. The conditional is straightforward:
```ts
const filesArgs = config.isMultiSkill
  ? config.skillsParentDirs.map((dir, i) => {
      const normalized = dir.endsWith('/') ? dir : `${dir}/`;
      return `files[${i + 1}]=${normalized}`;
    })
  : [`files[1]=${config.skillDir}`];

const pkgSetArgs = [
  // ... other fields ...
  'files[0]=bin',
  ...filesArgs,
];
```

## Risks / Trade-offs

- **`skillsParentDirs` is empty in single-skill mode** → Mitigation: the `isMultiSkill` branch is only entered when `isMultiSkill: true`, where `skillsParentDirs` is guaranteed non-empty by `WizardConfig` contract.
- **Parent dir includes non-skill files** → Acceptable trade-off; the parent dir approach is already used for `skillet.skills` and is consistent with npm publishing conventions.
- **No migration needed** — this is a fix for newly scaffolded packages; existing `package.json` files are not modified.

## Open Questions

_(none — approach is fully specified)_
