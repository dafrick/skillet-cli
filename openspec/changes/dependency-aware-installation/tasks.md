## 1. Skill-Package Marker — Reading and Validation

- [x] 1.1 Define the `skillet` key schema in `packages/core` (TypeScript type for `package.json` `skillet` field: `{ skills?: string | string[] }`)
- [x] 1.2 Implement `readSkilletMarker(packageRoot: string): { skillsDirs: string[] } | null` — reads `package.json`, returns null if `skillet` key absent; normalizes the `skills` field: string → `[value]`, string[] → as-is, missing → `["skills"]`
- [x] 1.3 Implement `discoverSkillTrees(parentDir: string): string[]` — scans immediate subdirectories of a single parent directory for `SKILL.md`, returns paths of matching skill trees; if `parentDir` does not exist, records a warning and returns `[]`; call once per entry in `skillsDirs` and union results
- [x] 1.4 Update `run()` to use `readSkilletMarker` as a fallback when `skillDir` is not passed, and use `discoverSkillTrees` (for each `skillsDirs` entry) to enumerate skill trees for the invoked package
- [x] 1.5 Write unit tests for `readSkilletMarker`: present key with string, present key with string[], absent key, absent `skills` sub-key (defaults to `["skills"]`), extra unknown fields ignored, `skills` with invalid type (number/null/object) → warning + default `["skills"]`
- [x] 1.6 Write unit tests for `discoverSkillTrees`: directory with multiple skill trees, subdirectory lacking `SKILL.md` is skipped, empty directory returns empty array, called once per entry in a multi-entry `skillsDirs`, non-existent directory returns empty array with warning
- [x] 1.7 Implement `readPackageName(packageRoot: string): string` — reads the `name` field from `package.json`; records a warning and falls back to `path.basename(packageRoot)` if the field is absent; this value is passed as `requestorRoot` to all install and walk operations in a given invocation
- [x] 1.8 Write unit tests for `readPackageName`: name field present, name field absent → warning + directory basename
- [x] 1.9 Add `installFixturePackages(sandbox, fixtures: { name: string; version: string; skillet?: object; deps?: Record<string, string> }[])` integration test helper in `test/integration/helpers/` — writes each fixture as a real npm package directory under `<sandbox.cwd>/fixtures/<name>/` (a `package.json` with the fixture's own `file:` deps where `deps` is provided, plus a stub `index.js` as `main`), then writes a root `package.json` in `<sandbox.cwd>` whose `dependencies` point to each top-level fixture via `file:./fixtures/<name>`, then runs `npm install --ignore-scripts` in `<sandbox.cwd>` to produce a real `node_modules` tree; `createRequire` resolves these packages identically to production, including npm's hoisting and nesting behaviour; used by all dependency-walk integration tests

## 2. Dependency Walk — Closure Resolution

- [x] 2.1 Implement `findPackageRoot(packageName: string, fromDir: string): string | null` — uses `createRequire` from `node:module` to resolve the package's main entry relative to `fromDir`, then walks parent directories to find the nearest `package.json`; returns the directory containing it, or null if not resolvable
- [x] 2.2 Implement `resolveSkillPackageClosure(packageRoot: string): SkillEntry[]` — walks `dependencies` (not `devDependencies`) of the package at `packageRoot`, using `findPackageRoot` to locate each dependency on disk
- [x] 2.3 In the walk, read each dependency's `package.json`; skip packages without a `skillet` marker, recurse into those that have one; maintain a visited set of resolved package roots to guard against corrupted `node_modules` graphs
- [x] 2.4 Attribute every skill in the closure (including the invoked package's own skills) to the top-level invoked package's npm name as `requestorRoot`
- [x] 2.5 Deduplicate the assembled install set by (content hash, target, scope) before handing to the write path
- [x] 2.6 Sort the install set in topological order (dependency-before-dependent)
- [x] 2.7 Record a warning (non-fatal) when a named dependency cannot be resolved on disk; continue the walk
- [x] 2.8 Write integration tests for `findPackageRoot` (using `installFixturePackages`): resolvable hoisted package, resolvable nested package produced by npm's own hoisting (achieved by giving the nested package a transitive dep that conflicts with another version at root level), unresolvable package returns null
- [x] 2.9 Write integration tests for the walk (using `installFixturePackages`): no marked dependencies (only own skills installed), one marked dependency, transitive marked dependency (A→B→C), diamond graph (A→B→D and A→C→D, D installed once), `devDependency` is skipped, unresolvable dependency produces warning and continues
- [x] 2.10 Write integration test: install a composed package; verify both the invoked package's skills and the dependency's skills appear in the target directory
- [x] 2.11 Write integration test asserting topological install order: install a package that depends on `superpowers-base`; capture the filesystem write sequence (e.g. via write-order timestamps or spy on the write path) and assert `superpowers-base`'s skills exist on disk before the dependent package's own skills are written

## 3. `requestedBy` Manifest Field

- [x] 3.1 Add `requestedBy: string[]` to the `.skill-meta.json` TypeScript type in `packages/core`
- [x] 3.2 Update the per-skill write path to always include `requestedBy` in the manifest it writes, seeded with `[requestorRoot]` for new installs
- [x] 3.3 Implement install-time union on identical-content collision: when the write path finds an existing `.skill-meta.json` with an identical `contentHash`, union `requestorRoot` into the existing `requestedBy` set and rewrite only the manifest (do not rewrite skill content)
- [x] 3.4 Implement union-after-update for same-source content changes: when the write path finds a different `contentHash` but the same `source` package+name, apply the existing update logic (overwrite if pristine; prompt/`--force` if modified), then union `requestorRoot` into `requestedBy` after the write
- [x] 3.5 Verify `requestedBy` is excluded from `contentHash` and `postInstallHash` computation (no code change needed if `.skill-meta.json` is already excluded — add an explicit test to assert this)
- [x] 3.6 Handle manifests without `requestedBy` (v0.1.0 era): skip them in the GC scan; they persist until manually removed or overwritten by a v0.2.0 install of the same skill
- [x] 3.7 Write unit tests for the union: same root is idempotent (no duplicate entry); new root adds to set; union after same-source update (content changed); `requestedBy` excluded from hash; `requestedBy` is an unordered set (no duplicates)
- [x] 3.8 Write integration test: install two packages sharing a base dependency; verify shared skill's `requestedBy` contains both package names
- [x] 3.9 Add a collision message for the version-skew case: when `source` package name matches but version differs, emit a message naming both versions and the roots that required them (before the existing prompt/`--force` step)
- [x] 3.10 Enhance the cross-package name collision message: when `source` indicates a genuinely different package owns the skill folder, name both packages from their `source` fields to explain why the slot is occupied (uses existing v0.1.0 collision machinery; only the message changes)
- [x] 3.11 Write integration test for the version-skew collision message (3.9): arrange two fixture packages requiring different major versions of a shared base whose skills hash differently; trigger the install write path; assert the emitted message names both package versions and both root package names (not just a generic collision message)
- [x] 3.12 Write integration test for the cross-package name collision message (3.10): arrange two unrelated packages that both ship a skill with the same folder name; trigger the install write path for the second package; assert the message identifies both source package names from their `source` fields

## 4. Uninstall GC — Distributed Refcount

- [x] 4.1 Implement `scanInstalledSkills(target: string, scope: string): InstalledSkill[]` — reads all `.skill-meta.json` manifests in the target's skill directory, returns parsed manifests with file paths
- [x] 4.2 Implement `gcUninstall(packageName: string, target: string, scope: string, force: boolean): void` — removes `packageName` from `requestedBy` on every skill in the scan result; garbage-collects skills whose set becomes empty; rewrites manifests for kept skills
- [x] 4.3 Apply the modified-content guardrail in the GC delete step: compare current content hash to `postInstallHash`; prompt in TTY mode, require `--force` in CI mode, record warning and skip if CI and no `--force`
- [x] 4.4 Wire `gcUninstall` as the sole uninstall path — it replaces the existing own-skills removal logic entirely; since v0.2.0 writes `requestedBy` on all installs including direct ones, the GC handles own-skill removal and shared-dependency GC uniformly through the same code path
- [x] 4.5 Write unit tests for `gcUninstall`: last requestor removed and skill is pristine → deleted without prompt; last requestor removed and skill is modified (TTY) → prompted; last requestor removed and skill is modified (CI, no `--force`) → warning, not deleted; last requestor removed and skill is modified (CI, `--force`) → deleted; one of many requestors removed → manifest rewritten, skill kept; skill not listing `P` → untouched; manifest without `requestedBy` (v0.1.0 era) → skipped, not removed
- [x] 4.6 Write integration test for the two-roots scenario: install `travel-planner` and `recipe-planner` (both depending on `superpowers-base`); uninstall `travel-planner`; assert `superpowers-base` skills remain; uninstall `recipe-planner`; assert `superpowers-base` skills are removed
- [x] 4.7 Write integration test for GC matching on recorded `requestedBy`: install `P` (which depends on `superpowers-base`); modify `P`'s `package.json` to drop the dependency without reinstalling; uninstall `P`; assert `superpowers-base` skills are still GC'd (because `requestedBy` was recorded at install time)
- [x] 4.8 Write integration test for multi-target GC independence: install `P` into two targets (e.g. `claude/user` and `agents/user`); uninstall from both targets; assert each target's GC runs independently — manifests in one target are not modified or removed as a side effect of GC in the other target

## 5. `run()` API and Back-Compatibility

- [ ] 5.1 Confirm `run({ skillDir })` still works for the invoked package: when `skillDir` is provided, use it and skip the marker fallback
- [ ] 5.2 Confirm single-skill packages with no marked dependencies behave identically to the v0.1.0 path (regression test using an existing fixture, no behavior delta expected)
- [ ] 5.3 Add integration test for a `skillDir`-only dependency (no marker): walk reaches it, it is skipped, no error, walk continues

## 6. Documentation and Author Guidance

- [ ] 6.1 Update `packages/core` README with the `skillet` marker schema and a minimal example `package.json` for a composable skill-package
- [ ] 6.2 Document the author constraint: packages intended to be depended upon must carry the `skillet` marker; `skillDir`-only packages are not discoverable as skill dependencies
- [ ] 6.3 Add a changelog entry for v0.2.0 covering: `skillet` marker (string and array forms), dependency walk, `requestedBy` manifest field, GC uninstall, v0.1.0 manifest handling, and what is unchanged from v0.1.0
