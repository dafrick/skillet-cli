## Why

Skill-package authors need to compose skills by building on shared base packages, but today `@skillet/core` installs only the skills of the package whose CLI is invoked — it has no way to follow that package's npm dependencies and install the skills they provide. Users of a composed skill-package must manually install every layer of the stack themselves. This becomes a maintenance burden as skill ecosystems grow. The fix belongs in core now, before the dependency graph becomes entangled without a principled install model.

## What Changes

- **New: skill-package marker** — a `skillet` key in `package.json` that declares "this is a skill-package" and names the directory (or directories) where its skill trees live. The `skillet.skills` field accepts either a string (one parent directory) or a string array (multiple parent directories); each named directory is scanned the same way — immediate subdirectories containing `SKILL.md` are skill trees. Consumed by core both for multi-skill discovery in the invoked package and for discovery inside dependency packages during the dependency walk.
- **New: dependency-aware installation** — when installing or updating a marked package, core also installs the skills of every marked package in its `dependencies` closure, transitively, in one operation. npm owns version resolution, deduplication, hoisting, and on-disk placement; core only reads the result.
- **New: `requestedBy` manifest field** — `.skill-meta.json` gains one field: an array of top-level package names that requested this skill at this target/scope. Written from the first v0.2.0 release for every install, including direct (non-composed) installs. Excluded from all content hashes.
- **New: distributed-refcount uninstall GC** — uninstalling a package removes it from `requestedBy` on every skill it placed; skills whose sets become empty are garbage-collected (with the same modified-content guardrails as any destructive operation). Skills still needed by another package are kept.
- **Amendment: partial repeal of the "cross-package management is a non-goal" charter item** — the repeal is scoped precisely to the declared-dependency closure of the invoked package. System-wide skill management and a central index remain non-goals.
- **No change** to the content-hash algorithm, render hash, drift detection, collision machinery, adapter interface, scopes, CI safety, or the three-line `bin/cli.js`.

## Capabilities

### New Capabilities

- `skill-package-marker`: The `skillet` key in `package.json` — its presence, its schema (`skills` path), its dual role in multi-skill discovery for the invoked package and in dependency discovery for the walk, and its relationship to the existing `run({ skillDir })` API.
- `dependency-install`: The closure-resolution algorithm for install/update — walking `dependencies` (not `devDependencies`), resolving via Node module resolution, skipping non-marked packages, deduplicating by content hash, installing in topological order, and the install-time union behavior on identical-content collision.
- `dependency-uninstall`: The GC algorithm for uninstall — scanning known target directories, removing the invoking package name from `requestedBy`, garbage-collecting installs whose sets become empty, handling legacy manifests without the field, and the modified-content guardrail in the GC step.

### Modified Capabilities

- (none — no existing spec-level requirements are changed; the new behavior is additive and opt-in)

## Impact

- **`packages/core`**: all implementation changes land here — marker reading, the dependency walk, `requestedBy` field write in the install path, and the GC uninstall path.
- **`.skill-meta.json` schema**: one new field added; existing manifests remain valid (treated as "unknown requestor" on read).
- **`run()` API surface**: `skillDir` parameter remains supported and honored; no new required parameters. Dependency packages use the marker exclusively.
- **Skill-package authors who compose**: add a `skillet` marker to `package.json` and list dependencies normally; write no resolution code.
- **Skill-package authors who do not compose**: zero behavioral change.
- **npm**: no new dependency on npm CLI or lockfile parsing; core uses `createRequire` from `node:module` plus a walk-up-to-`package.json` helper to locate installed dependency packages on disk.
