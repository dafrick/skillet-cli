## ADDED Requirements

### Requirement: Dependency walk is seeded with the invoked package
When installing or updating, core SHALL begin the closure-resolution walk at the invoked package root `R`. Core SHALL collect `R`'s own skill trees via the `skillet` marker in `package.json` (`skillet.skillDir` for a single skill, or `skillet.skills` for multi-skill packages).

#### Scenario: Invoked package with no skill dependencies
- **WHEN** the invoked package declares no marked skill-package dependencies
- **THEN** core installs only the invoked package's own skills, identical to v0.1.0 behavior

#### Scenario: Invoked package with one marked dependency
- **WHEN** the invoked package's `package.json` `dependencies` contains one package that carries a `skillet` marker
- **THEN** core installs both the invoked package's own skills and the dependency's skills in one operation

### Requirement: Walk reads `dependencies` only; `devDependencies` are excluded
Core SHALL walk entries in the `dependencies` field of each package's `package.json`. Core SHALL NOT walk `devDependencies`, `peerDependencies`, or `optionalDependencies`.

#### Scenario: Skill-package dependency is in `devDependencies`
- **WHEN** a marked package appears only in `devDependencies` of the invoked package
- **THEN** core does not install that package's skills

#### Scenario: Skill-package dependency is in `dependencies`
- **WHEN** a marked package appears in `dependencies` of the invoked package
- **THEN** core installs that package's skills as part of the closure

### Requirement: Dependency location is resolved via `createRequire` and walk-up
Core SHALL locate each dependency's on-disk directory by: (1) creating a `require` function rooted at the walking package's directory using `createRequire` from `node:module`; (2) resolving the dependency's main entry point (which is always exported, unlike `./package.json` which may be restricted by an `exports` field); (3) walking parent directories from that entry point until a `package.json` is found. This reflects npm's hoisting and deduplication and requires no npm CLI invocation and no new library dependency.

#### Scenario: Dependency is installed and resolvable
- **WHEN** a dependency named in `dependencies` is present in `node_modules` (hoisted or nested)
- **THEN** core resolves it to its on-disk package root and reads its `package.json`

#### Scenario: Dependency is listed in `package.json` but not installed
- **WHEN** a dependency named in `dependencies` cannot be resolved on disk
- **THEN** core records a warning (identifying the missing package) and continues the walk; core does NOT invoke npm or any package manager to fix the gap

### Requirement: Non-marked dependencies are skipped; marked dependencies are recursed into
For each dependency resolved on disk, core SHALL read its `package.json`. If the `skillet` key is absent, core SHALL ignore the package and SHALL NOT recurse into its own dependencies. If the `skillet` key is present, core SHALL collect its skill trees and recurse into its own `dependencies` field (applying the same rule). Cycle detection is delegated to npm: core assumes the resolved `node_modules` graph is acyclic, as npm enforces this during installation.

#### Scenario: Ordinary library in `dependencies`
- **WHEN** a dependency has no `skillet` key in its `package.json`
- **THEN** core skips it and does not recurse into its transitive dependencies

#### Scenario: Marked skill-package in `dependencies`
- **WHEN** a dependency has a `skillet` key in its `package.json`
- **THEN** core collects its skill trees and recurses into its own `dependencies`, applying the same filtering rule

#### Scenario: Transitive marked dependency
- **WHEN** a dependency (A) has a marked dependency (B) in its own `dependencies`
- **THEN** core also collects and installs B's skills, without the invoked package needing to list B directly

### Requirement: All skills in the closure are attributed to the same `requestorRoot`
Every skill discovered during the walk — including the invoked package's own skills and all transitively discovered dependency skills — SHALL be attributed to the **npm package name** of the top-level invoked package `R`. This name is written into the `requestedBy` field of each skill's `.skill-meta.json`.

#### Scenario: Invoked package is `travel-planner`, dependency is `superpowers-base`
- **WHEN** `travel-planner` is installed and its walk reaches `superpowers-base`
- **THEN** `superpowers-base`'s skills get `requestedBy` containing `"travel-planner"` (not `"superpowers-base"` and not `"travel-planner@1.0.0"`)

### Requirement: Install set is deduplicated by (content hash, target, scope)
Before writing, core SHALL deduplicate the collected skill set. If the same (content hash, target, scope) triple appears more than once — reachable via a diamond dependency graph — it SHALL be written only once to the target directory, and `requestorRoot` SHALL be unioned only once.

#### Scenario: Diamond dependency graph
- **WHEN** the invoked package A depends on B and C, and both B and C depend on D
- **AND** all three carry the `skillet` marker
- **THEN** D's skills are installed once, not twice

### Requirement: Skills are installed in topological (dependency-before-dependent) order
Core SHALL order the install set so that a dependency's skills are written before the skills of any package that depends on it. If no dependency ordering is computable (e.g. no dependencies), installation order is implementation-defined. This ensures base-layer skills occupy their target slots before composed-layer skills arrive, so any name collision between the two layers follows a predictable path: the base is the existing install, and the composed layer is the incoming write that triggers the collision/update logic.

#### Scenario: Base layer installed before composed layer
- **WHEN** `travel-planner` depends on `superpowers-base`
- **THEN** `superpowers-base`'s skills are written to the target before `travel-planner`'s own skills

### Requirement: Install-time union on identical-content collision
When the per-skill write path finds the skill already installed at the target with an identical `contentHash`, core SHALL NOT rewrite the skill content. Core SHALL union `requestorRoot` into the existing manifest's `requestedBy` set and rewrite only the manifest.

#### Scenario: Same skill already installed by another root
- **WHEN** `superpowers-base`'s `brainstorming` skill is already installed at the target (placed by `travel-planner`)
- **AND** `recipe-planner` is installed and its walk reaches `superpowers-base`
- **THEN** the `brainstorming` skill content is not rewritten, and the manifest's `requestedBy` becomes `["travel-planner", "recipe-planner"]`

#### Scenario: Requesting the same skill a second time from the same root is a no-op on the set
- **WHEN** `travel-planner` is installed a second time without uninstalling first
- **AND** `superpowers-base`'s `brainstorming` already lists `"travel-planner"` in `requestedBy`
- **THEN** the set is unchanged (the union is idempotent)

### Requirement: Update reconciles the already-installed closure; `install --add-new` can extend it
The dependency walk runs for both the `install` and `update` commands. `update` reconciles the already-installed closure per the v0.1.0 two-step update flow. `install` (with the `--add-new` flag) can extend the closure with skills not yet present. The defaults from v0.1.0 are preserved unchanged for each command.

#### Scenario: Update after a dependency gains a new skill
- **WHEN** `superpowers-base` 1.1 adds a new skill `debugging`
- **AND** `travel-planner` depends on `superpowers-base@^1`
- **AND** the user runs `travel-planner update`
- **THEN** core reconciles the closure and installs `debugging` per the v0.1.0 update defaults

### Requirement: Every install writes `requestedBy`, including direct installs of a package's own skills
When the invoked package `P` is installed, `P`'s own skills SHALL receive `requestedBy: ["P"]`. This applies even if `P` has no skill-package dependencies. The field SHALL be present in all manifests written by v0.2.0 or later. The field is an **unordered set**: duplicate entries SHALL NOT be stored, and the order of entries is not significant.

#### Scenario: Direct install of a single-skill package
- **WHEN** `my-skills` is installed directly and has no skill-package dependencies
- **THEN** each of `my-skills`'s installed skills has a `.skill-meta.json` with `requestedBy: ["my-skills"]`

### Requirement: `requestedBy` stores package name, not `name@version`
The `requestedBy` array SHALL contain package names only (e.g. `"travel-planner"`), not versioned identifiers (e.g. `"travel-planner@1.0.0"`). The `source` field (provenance of the content) retains its version; `requestedBy` does not.

#### Scenario: Package is upgraded between installs
- **WHEN** `travel-planner` 1.0 is installed (placing `requestedBy: ["travel-planner"]` on shared skills)
- **AND** `travel-planner` is later upgraded to 1.1 and reinstalled
- **THEN** `requestedBy` still contains `"travel-planner"` — not `"travel-planner@1.0"` and `"travel-planner@1.1"` as two separate entries

### Requirement: `requestedBy` is excluded from `contentHash` and `postInstallHash`
Core SHALL NOT include the `requestedBy` field (or any part of `.skill-meta.json`) in the computation of `contentHash` or `postInstallHash`. This is consistent with the v0.1.0 exclusion of `.skill-meta.json` from content hashes.

#### Scenario: `requestedBy` changes after a second package installs the shared skill
- **WHEN** `recipe-planner` is installed and unions `"recipe-planner"` into `brainstorming`'s `requestedBy`
- **THEN** `brainstorming`'s `contentHash` and `postInstallHash` are unchanged

### Requirement: Same-source content update is followed by a requestor union
When the per-skill write path finds an existing skill at the target where the `contentHash` differs from the incoming skill but the `source` field indicates the same package and skill name (same source package, same version — an update to the skill's content), core SHALL apply the existing update logic (overwrite if pristine; prompt or require `--force` if the install is locally modified), and SHALL then union `requestorRoot` into the manifest's `requestedBy` set after the write completes.

#### Scenario: Skill content updated by its source package; second root installs simultaneously
- **WHEN** `superpowers-base`'s `brainstorming` is already installed from `npm:superpowers-base@1.1.0` (placed by `travel-planner`) with a known content hash
- **AND** a fresh install via `recipe-planner` reaches `superpowers-base@1.1.0` but the skill content has changed (new hash — a content-only update, not a version bump)
- **THEN** core updates the skill content per the v0.1.0 update logic
- **AND** unions `"recipe-planner"` into `requestedBy` after the update completes

#### Scenario: Skill content updated; install is pristine — updated silently
- **WHEN** the existing install's content matches its `postInstallHash` (pristine, not locally modified)
- **THEN** core overwrites the skill content without prompting and then unions the requestor

#### Scenario: Skill content updated; install is locally modified — prompt required
- **WHEN** the existing install's content does not match its `postInstallHash` (locally modified)
- **THEN** core follows the v0.1.0 prompt/`--force` flow before overwriting; the requestor union happens only if the write proceeds

### Requirement: Version-conflict collision shows an explicit message when source package name matches but version differs
When the per-skill write path finds an existing skill at the target where the `source` field names the same package but a different version (e.g. `npm:superpowers-base@1.0.0` vs. `npm:superpowers-base@2.0.0`), core SHALL emit a collision message that explicitly identifies the version conflict. The message SHALL name both versions and the two root packages that require them. The underlying action (prompt/`--force` per v0.1.0 §6.5) is unchanged; only the message is specialized for this case.

#### Scenario: Same source package, different major version collision
- **WHEN** `brainstorming` is already installed from `npm:superpowers-base@1.0.0` (placed by `travel-planner`)
- **AND** a new install attempts to write `brainstorming` from `npm:superpowers-base@2.0.0` (reached via `recipe-planner`)
- **THEN** core shows a message indicating that `travel-planner` and `recipe-planner` require different versions of `superpowers-base`, and prompts or requires `--force` before overwriting

### Requirement: Cross-package name collision shows a source-field-aware message
When the per-skill write path finds an existing skill at the target where the `source` field names a *different* package entirely (a name collision between two unrelated packages' skills — e.g. two independent packages both ship a skill called `brainstorming`), core SHALL use the existing v0.1.0 collision/drift machinery (backup / overwrite / skip) and SHALL enhance the collision message to identify both packages by name from their `source` fields, explaining that an unrelated package already occupies this skill name. Dependency installation makes this case fire more often than in v0.1.0, since more packages contribute skills in one operation.

#### Scenario: Two unrelated packages ship skills with the same folder name
- **WHEN** `brainstorming` is already installed with `source: "npm:superpowers-base@1.0.0"`
- **AND** a new install attempts to write a skill also named `brainstorming` but with `source: "npm:acme-skills@1.0.0"` (a genuinely different package)
- **THEN** core uses the v0.1.0 collision machinery (prompt or `--force`) and shows a message that names both `superpowers-base` and `acme-skills`, making clear that a different package already owns this skill name

### Requirement: CI safety is preserved for the dependency walk and union step
In non-TTY (CI) mode, the dependency walk and `requestedBy` union SHALL complete without prompting. The union step on an identical-content collision does not modify skill content and therefore SHALL NOT trigger a modified-content prompt. A content-differing collision in CI mode follows v0.1.0 CI safety rules unchanged.

#### Scenario: Dependency walk in CI environment with no collisions
- **WHEN** the install is run in a non-TTY environment and all dependency skills are new
- **THEN** all skills are installed without any interactive prompts
