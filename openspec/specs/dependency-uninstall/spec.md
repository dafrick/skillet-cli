## ADDED Requirements

### Requirement: Uninstall scans the bounded set of known target directories
When uninstalling package `P`, for each selected target and scope, core SHALL scan the known target directories (the bounded set defined by the v0.1.0 target catalog) for installed skills. This scan is read-only and builds no persistent global state. It is the same scan v0.1.0 §5.6 already anticipates for `list`.

#### Scenario: Uninstall scans target directories for skills listing `P`
- **WHEN** `P` is uninstalled from a given target and scope
- **THEN** core reads all `.skill-meta.json` manifests in that target's skill directory and collects those listing `P` in `requestedBy`

#### Scenario: Uninstall with multiple selected targets runs GC independently per target
- **WHEN** `P` is uninstalled and two targets (e.g., `~/.claude/skills` and `.agents/skills`) are both selected
- **THEN** core runs the GC scan independently for each (target, scope) pair; `requestedBy` removal and garbage collection within each target do not affect the other target's manifests

### Requirement: Uninstall removes `P` from `requestedBy` on every skill `P` requested
For each skill install whose `.skill-meta.json` lists `P` in `requestedBy`, core SHALL remove `P` from the set.

#### Scenario: `P` is present in `requestedBy` of multiple skills
- **WHEN** `P` installed skills A, B, and a shared skill C (all listing `P` in `requestedBy`)
- **AND** `P` is uninstalled
- **THEN** `P` is removed from `requestedBy` on A, B, and C

#### Scenario: `P` is not listed in `requestedBy` of a skill
- **WHEN** a skill's `.skill-meta.json` does not list `P` in `requestedBy`
- **THEN** that skill is not modified and is not removed

### Requirement: Skills whose `requestedBy` becomes empty are garbage-collected
After removing `P` from a skill's `requestedBy`, if the resulting set is empty, core SHALL delete the install (the skill folder and its `.skill-meta.json`). If the set is non-empty after removing `P`, core SHALL rewrite the manifest with `P` removed and SHALL NOT delete the install.

#### Scenario: Last requestor removed — skill is garbage-collected
- **WHEN** `brainstorming`'s `requestedBy` is `["travel-planner"]`
- **AND** `travel-planner` is uninstalled
- **THEN** `brainstorming`'s `requestedBy` becomes `[]` and core deletes the skill folder and manifest

#### Scenario: One of multiple requestors removed — skill is kept
- **WHEN** `brainstorming`'s `requestedBy` is `["travel-planner", "recipe-planner"]`
- **AND** `travel-planner` is uninstalled
- **THEN** `brainstorming`'s `requestedBy` becomes `["recipe-planner"]`, the manifest is rewritten, and the skill folder is kept

### Requirement: Pristine installs with empty `requestedBy` are removed without prompting
If a skill whose `requestedBy` becomes empty has content that matches its `postInstallHash` (pristine — not locally modified), core SHALL delete the skill folder and manifest without any prompt.

#### Scenario: Pristine skill with empty `requestedBy` is removed silently
- **WHEN** the last requestor is removed from a skill whose content has NOT drifted from its `postInstallHash`
- **THEN** core deletes the skill folder and manifest without prompting, in both TTY and non-TTY modes

### Requirement: Modified installs require `--force` before deletion
If a skill whose `requestedBy` becomes empty has locally modified content (drift, as defined by v0.1.0 §5.7), core SHALL NOT silently delete it. In interactive (TTY) mode, core SHALL prompt the user. In non-TTY (CI) mode, core SHALL require the `--force` flag; without it, the skill is not deleted and core records a warning.

#### Scenario: Modified skill with empty `requestedBy` in TTY mode
- **WHEN** the last requestor is removed from a skill whose content has drifted from its `postInstallHash`
- **AND** the session is interactive (TTY)
- **THEN** core prompts the user before deleting

#### Scenario: Modified skill with empty `requestedBy` in CI mode without `--force`
- **WHEN** the last requestor is removed from a modified skill
- **AND** the session is non-TTY
- **AND** `--force` is not set
- **THEN** core records a warning, does not delete the skill, and continues with the rest of the GC

#### Scenario: Modified skill with empty `requestedBy` in CI mode with `--force`
- **WHEN** the last requestor is removed from a modified skill
- **AND** the session is non-TTY
- **AND** `--force` is set
- **THEN** core deletes the skill folder and manifest without prompting

### Requirement: GC matches on the recorded `requestedBy`, not a recomputed closure
Core SHALL determine which skills to GC by reading `requestedBy` from manifests, not by re-resolving `P`'s current `package.json` dependency closure. This ensures that skills `P` previously placed — but which `P` no longer declares in its current `package.json` — are still reclaimed.

#### Scenario: Package's `package.json` changed between install and uninstall
- **WHEN** `P` was installed when it depended on `superpowers-base`, placing skills with `requestedBy: ["P"]`
- **AND** `P`'s `package.json` was later updated to drop the `superpowers-base` dependency
- **AND** `P` is now uninstalled
- **THEN** core still removes `P` from `superpowers-base`'s skills' `requestedBy` and GCs those skills if the set becomes empty — because GC reads the recorded manifests, not the current `package.json`

### Requirement: Installs not listing `P` in `requestedBy` are untouched by the GC
Skills installed by other packages — whose `requestedBy` does not include `P` — SHALL NOT be modified or removed during `P`'s uninstall.

#### Scenario: Uninstalling `P` does not affect skills from an unrelated package
- **WHEN** `recipe-planner` has its own skills installed with `requestedBy: ["recipe-planner"]`
- **AND** `travel-planner` is uninstalled
- **THEN** `recipe-planner`'s skills are unchanged

### Requirement: Manifests without `requestedBy` are skipped by the GC
A manifest written by v0.1.0 (lacking `requestedBy`) SHALL be skipped by the uninstall GC scan — core takes no action on it during uninstall. The skill persists until it is manually removed or overwritten by a v0.2.0 install or update of the same skill. Since v0.2.0 has not launched publicly, no formal migration of existing manifests is required; the migration plan recommends a clean reinstall of all skills after upgrading.

#### Scenario: Legacy manifest is not affected by uninstall GC
- **WHEN** a `.skill-meta.json` without `requestedBy` exists in the target directory
- **AND** any package is uninstalled
- **THEN** core skips that manifest in the GC scan; the skill persists and is not removed

### Requirement: The two-roots example produces correct GC behavior
The refcount correctly handles the canonical shared-base scenario where two independent root packages both depend on the same base layer.

#### Scenario: Two roots share base; one is uninstalled
- **WHEN** `travel-planner` and `recipe-planner` are both installed, each placing `"travel-planner"` and `"recipe-planner"` respectively in `requestedBy` of `superpowers-base`'s skills
- **AND** `travel-planner` is uninstalled
- **THEN** `travel-planner`'s own skills are removed (their `requestedBy` becomes `[]`)
- **AND** `superpowers-base`'s skills retain `requestedBy: ["recipe-planner"]` and are NOT removed
- **AND** `recipe-planner`'s own skills are untouched

#### Scenario: Second root uninstalled; shared base is finally collected
- **WHEN** (continuing the above) `recipe-planner` is later uninstalled
- **THEN** `superpowers-base`'s skills' `requestedBy` becomes `[]` and they are garbage-collected

### Requirement: `--force` retains its v0.1.0 meaning for the modified-content guardrail in GC
The `--force` flag, when passed during uninstall, SHALL cause core to delete modified skills whose `requestedBy` becomes empty without prompting, consistent with v0.1.0's `--force` semantics for destructive operations. It does not bypass any other part of the GC algorithm.

#### Scenario: `--force` uninstall removes a modified skill without prompt
- **WHEN** a skill's content has drifted from its `postInstallHash`
- **AND** the skill's `requestedBy` becomes empty during the GC
- **AND** `--force` is passed
- **THEN** core deletes the skill without interactive prompt, in both TTY and non-TTY modes
