## Context

`@skillet/core` v0.1.0 operates strictly within the boundary of the package whose CLI is invoked. Its mental model: one package, one skill directory, one target directory. This is clean and simple but breaks down when skill-package authors want to *compose* skills: a `travel-planner` package that builds on a `superpowers-base` package should install both layers in one command. Today the user must run two install commands manually and keep them in sync.

An earlier design iteration considered placing dependency awareness in a second package (`@skillet/os`, `@skillet/deps`) that would "overload" core's commands. That design is **rejected** (see Decisions §1). This document describes the design for folding the feature into core.

The feature introduces two additions: (1) a `skillet` key in `package.json` that marks a package as skill-bearing and locates its skill trees; (2) a recursive walk of the invoked package's `dependencies` that finds all marked packages and installs their skills in the same operation as the invoking package's own skills. Both additions also require manifest and uninstall changes, described below.

All of the v0.1.0 per-skill pipeline (hash, render, copy, manifest write, collision handling, drift detection) is unchanged. The additions layer on top of it.

## Goals / Non-Goals

**Goals:**

- Define a single `skillet` key in `package.json` that serves as the marker for skill-package discovery both within the invoked package (multi-skill enumeration) and within dependency packages (the walk).
- Walk the invoked package's `dependencies` recursively, collecting all marked packages and feeding each skill into the existing per-skill install path.
- Delegate all version selection, deduplication, hoisting, and on-disk placement to npm; core reads what npm has already placed.
- Add exactly one manifest field (`requestedBy`) — an unordered set of top-level requesting package names — so that uninstall can correctly garbage-collect shared dependencies.
- Write `requestedBy` from the first v0.2.0 release, including for direct (non-composed) installs, to avoid a future migration.
- Implement a distributed-refcount GC on uninstall: remove the invoking package from `requestedBy`; delete installs whose sets become empty (with modified-content guardrails); keep installs still needed by others.
- Preserve byte-for-byte behavior for authors who declare no skill-package dependencies.

**Non-Goals:**

- Version selection, deduplication, or transitive resolution — npm's job entirely.
- Semantic compatibility checking between composed skills.
- Dangling-reference detection (skill text says "use brainstorming" but closure provides none) — relocated to authoring-time verify tooling.
- Per-skill `requires:` frontmatter — rejected; package is the unit of dependency.
- `peerDependencies` / `optionalDependencies` — v0.2.0 reads `dependencies` only.
- System-wide skill listing or a central index — non-goal reaffirmed.
- Scaffolding (`create-skillet-skill`) — authoring-time, separate lifecycle, separate package.
- A new command or flag for the dependency walk — it fires automatically when marked dependencies are present.

## Decisions

### Decision 1 — Fold dependency management into core; do not ship a separate package

**Choice:** Fold.

**Alternatives considered:**
- Ship `@skillet/deps` (or `@skillet/os`) as a separate package that imports core and overloads its commands.

**Rationale:** The separation would not protect the invariant it was intended to protect. v0.1.0's invariant is "core operates within one package." But dependency resolution *by definition* reads another package's `node_modules` and metadata; there is no way to follow `travel-planner` → `superpowers-base` without crossing the package boundary. A wrapper package would move the boundary-crossing code one import-level away but not eliminate it or its effects. The invariant is already spent the instant the feature exists; wrapping buys nothing for it. Folding is also free in practice because the behavior is opt-in via the marker — a non-composing author sees no new code on their critical path.

The resulting property is the one originally asked for: "If you have core, you have dependency management available if you want it." Composition is something a maintainer opts into by adding a dependency to `package.json`, not something that requires a different installer.

### Decision 2 — One marker, `skillet` key in `package.json`, serving both multi-skill discovery and dependency-walk discovery

**Choice:** One shared marker, with `skills` accepting string or string[].

**Alternatives considered:**
- A separate `skillet-dep.json` sidecar file for dependency-only packages.
- A dedicated `package.json` key with a different name (e.g. `skill-package`, `skillet-cli`) for the dependency case.
- Array entries pointing to individual skill tree directories rather than parent directories.

**Rationale:** Core already needs marker-based multi-skill discovery for the invoked package (v0.1.0 ended up supporting multiple skills per package). The dependency walk needs exactly the same information for a different package. Defining it once prevents the two from diverging. The marker's job is discovery, not configuration; it is intentionally minimal.

The marker key name stays `skillet` (not `skillet-cli` to match the renamed npm scope) because the key is part of the public authoring API — it must be typed by package authors — and the shorter form is cleaner. Scope renames do not need to affect the authoring surface.

`skillet.skills` accepts both a string and a string array; each entry is a parent directory scanned identically (immediate subdirectories with `SKILL.md` are skill trees). This lets a single package ship skill trees under multiple top-level directories without a wrapper directory. An array entry that points directly at a single skill tree and has no `SKILL.md`-bearing subdirectory produces zero skill trees (the scan finds nothing), which is the natural, unsurprising behavior.

### Decision 3 — `package.json` `dependencies` is the only dependency truth; no per-skill `requires:` frontmatter

**Choice:** Package-level `dependencies` only.

**Alternatives considered:**
- A `requires: [brainstorming, debugging]` key in individual `SKILL.md` frontmatter, letting skills declare their own prerequisites.

**Rationale (three reasons):**
1. It would duplicate, at finer granularity, information `package.json` already carries — and the two could disagree.
2. Honoring it would force core to understand that one skill *intends to use* another, breaking the agnosticism that lets core stay dependency-type-agnostic.
3. npm resolves, versions, and dedups at the package level; pushing dependency below the package level means re-implementing what npm does for free.

The package is the unit of dependency. Core stays blind to what happens inside one package.

### Decision 4 — Rely entirely on npm for version selection, dedup/hoist, transitive resolution, and on-disk placement

**Choice:** Read what npm placed; never re-implement npm.

**Rationale:** npm has already solved these problems correctly, with lockfiles, and under user control. Core locates installed dependency packages using `createRequire` from `node:module` plus a walk-up-to-package-root helper. `import.meta.resolve(specifier, parent)` was considered and rejected: both it and `createRequire().resolve()` throw `ERR_PACKAGE_PATH_NOT_EXPORTED` if a package's `exports` field does not expose `./package.json`. The robust workaround — resolve the package's main entry (always exported), then walk parent directories until `package.json` is found — avoids this entirely and requires no new library dependency. If a dependency is not resolvable (not installed), core records a warning and continues — the user's next `npm install` step is the fix.

### Decision 5 — Distributed refcount via `requestedBy` (uninstall Option 3); Option 1 never implemented

**Choice:** Option 3 — distributed refcount.

**Alternatives considered:**
- **Option 1:** Remove the whole declared closure on uninstall. **Rejected as a foot-gun.** The shared base is shared *by design*; removing it on any one package's uninstall breaks every other installed package that depends on base. This is the common path, not an edge case.
- **Option 2:** Remove only the package's own skills; leak dependencies. **Safe but untidy** — never breaks anyone, but dependency skills accumulate permanently. Acceptable only as a degraded fallback if `requestedBy` cannot be written.

**Rationale:** Option 3 is the only choice that is both safe (never removes a still-needed dependency) and tidy (reclaims dependencies when no one needs them). Option 1 is recorded for posterity; it is never to be implemented.

**Why the per-install refcount is not a central index — five properties:**

1. *Stored next to the install.* `requestedBy` lives in each skill's own `.skill-meta.json`, not in a separate shared file. No new file is created outside the skill's folder.
2. *Travels with the folder.* When a user copies or syncs their dotfiles, the skill folder and its manifest — including `requestedBy` — move together. The self-describing-artifact property of v0.1.0 §5.6 is preserved: a folder is fully self-describing without any external index.
3. *No new shared-write surface.* The union-on-collision at install time writes to a folder the colliding install was already going to write to. The same per-folder locking core already requires for collision handling covers the union write; no new coordination is introduced.
4. *Requestor always knowable without lookup.* Uninstall (like install) is invoked through a package's own CLI, so the invoking root's identity is in hand at the call site. No shared registry is needed to know who is removing what.
5. *Cross-install scan is read-only.* The GC scan at uninstall walks a bounded set of known target directories to find manifests listing `P`. It reads and rewrites individual manifests in-place; it does not write to any shared location and builds no persistent global state.

### Decision 6 — `requestedBy` stores package *name*, not `name@version`; refcount is per target and per scope for free

**Choice:** Name only; no extra structure for multi-target refcounting.

**Rationale:** The refcount answers "does any currently installed package still need this dependency?" Upgrading `travel-planner` from 1.0 to 1.1 must not fork the refcount into two phantom entries. The name is the stable identity of a consumer; the version is not. The `source` field (which records the content's provenance) retains the version; `requestedBy` (which records consumers) does not.

Because `.skill-meta.json` manifests are already written per-install-per-target, the requestor set is **per target and per scope for free** — no extra structure is needed to refcount independently at `~/.claude/skills/...` versus `.agents/skills/...`. Each manifest tracks its own set of requestors for its own install location.

### Decision 7 — Write `requestedBy` from the first v0.2.0 release, including for direct installs

**Choice:** Write immediately; seed for direct installs.

**Rationale:** This follows the same logic as v0.1.0's `renderHash`: recording a few bytes now costs nothing; adding the field later would force a manifest migration to reconstruct requestor history that was never recorded. For direct installs, seeding `requestedBy: ["P"]` makes the model uniform — uninstalling `P` removes `P` → empty → remove, exactly reproducing v0.1.0 uninstall as a special case of the general GC rule.

### Decision 8 — Uninstall GC matches on the recorded `requestedBy`, not a recomputed closure

**Choice:** Match on recorded set.

**Rationale:** A package's `package.json` may change between install and uninstall (e.g. `travel-planner` drops a dependency, then is uninstalled). A recomputed closure would miss skills that `P` previously placed and leak them. Matching on the recorded `requestedBy` removes exactly what `P` actually caused to be placed, regardless of how `P`'s manifest has since drifted.

### Decision 9 — Explicit version-conflict message when `source` package name matches but version differs

**Choice:** Show an explicit version-conflict message, distinct from a generic collision.

**Rationale:** When two roots require different major versions of the same base package and npm places two copies on disk, both walks reach skills with the same folder name but different `contentHash` values and different `source` version strings. The existing collision path (prompt/`--force`) is mechanically correct, but without context the user cannot tell why a skill is being flagged as conflicting — they may not realize they have two roots requiring different major versions of the same package. A specialized message ("Two installed packages require different major versions of `superpowers-base`; the skill `brainstorming` at this location was placed by `superpowers-base@1.0.0` and is now being updated from `superpowers-base@2.0.0`") gives actionable context. The underlying action (prompt/`--force`) is unchanged; only the message is specialized.

### Decision 10 — `requestedBy` excluded from all content hashes

**Choice:** Exclude from `contentHash` and `postInstallHash`.

**Rationale:** Same reason `.skill-meta.json` is already excluded in v0.1.0 — it is library metadata, and hashing it would be circular (the hash is stored in the same manifest as `requestedBy`).

## Risks / Trade-offs

**Shared-dependency version skew** → If two roots require incompatible major versions of the same base, npm may place two copies on disk. They collide on the same skill folder name. This falls through to the existing §5.4 collision path (different `contentHash`, same `source` package name, different version), handled as update/prompt with a specialized version-conflict message (Decision 9). The correct long-term answer may involve `peerDependencies`; deferred to a future revision. Risk level: low today, revisit when the ecosystem has multiple competing base packages.

**v0.1.0 manifests without `requestedBy`** → Since v0.2.0 has not launched publicly, no formal migration is required. The migration plan (below) recommends a clean reinstall. Manifests that are not reinstalled are skipped by the GC — they persist until manually removed or overwritten by a v0.2.0 install of the same skill. This is acceptable; a stale skill file does no harm.

**Diamond-graph deduplication** → npm guarantees one copy of a given package version on disk, but the walk may reach the same skill twice via a diamond dependency graph (A → B → D, A → C → D). The walk must deduplicate by (content hash, target, scope) before writing, or the content would be written once but `requestedBy` unioned twice with the same name (idempotent on the set, but wasteful). The dedup step is normative.

**Directory-scan cost on uninstall** → The GC scan walks all known target directories to find installs listing `P` in `requestedBy`. The target set is bounded and small (the v0.1.0 target catalog — unchanged by this extension). This is a one-time read at uninstall time and introduces no persistent global state. Acceptable.

**`run({ skillDir })` back-compat for dependency discovery** → Authors who pass an explicit `skillDir` to `run()` without carrying the `skillet` marker can still be installed directly, but their package cannot be discovered as a skill dependency. This is a deliberate opt-in boundary: to be depended upon, a package must carry the marker. The constraint is documented but not enforced at runtime — core does not error if a dependency lacks the marker; it simply skips it.

## What v0.2.0 Does Not Change

The following components are unchanged from v0.1.0:

- The content-hash algorithm and its stability commitment. `requestedBy` is excluded from `contentHash` and `postInstallHash` — it is library metadata, and hashing it would be circular.
- The render hash, drift detection (`postInstallHash` comparison), and the three-way modified-install prompt (pristine → overwrite; modified → prompt/`--force`).
- The adapter interface, the Bucket A / Bucket B split, and the v0.1.0 target catalog. Dependency installation produces more skills to write but writes each one through the identical adapter path.
- Scopes and scope-defaulting.
- The two-step update flow and the `install` vs `update` default split. The walk runs for both; `update` reconciles the already-installed closure, `install`/`--add-new` can extend it.
- CI safety: non-TTY mode skips selection prompts but never silently overwrites modified installs without `--force`. The GC step inherits this.
- The three-line `bin/cli.js` and the `run()` API surface.

## Migration Plan

1. **Bump `@skillet-cli/core` to v0.2.0.** No breaking changes to the public API or `bin/cli.js` surface.
2. **Existing skill-packages** work exactly as before. Authors who want to participate in composition add the `skillet` marker to their `package.json` and list their base packages in `dependencies`. The author writes no resolution code, no walk, no refcount logic — the three-line `bin/cli.js` is unchanged.
3. **Existing on-disk installs (v0.1.0 manifests):** Uninstall and reinstall all skill packages after upgrading. v0.2.0 has not launched publicly, so no formal migration of old manifests is required. Old manifests without `requestedBy` are skipped by the GC and persist harmlessly until overwritten.

## Open Questions

- **Shared-dependency version skew: what is the correct behavior?** If `travel-planner` requires `superpowers-base@^1` and `recipe-planner` requires `superpowers-base@^2`, npm may place two copies on disk; both walks reach skills with the same folder name, triggering the version-conflict collision path. v0.2.0 handles this mechanically (prompt/`--force` with an explicit message) but leaves the design question open: should composed skills be allowed to pin different major versions of a shared base, and if so, what is the intended user experience? Likely interacts with the `peerDependencies` question below.
- **`peerDependencies` for the base layer.** Should the shared base declare itself as a peer dependency so the whole tree dedups onto one version? npm peer-dependency handling is complex. Deferred until version skew is observed in practice.
- **`optionalDependencies` semantics.** v0.2.0 reads `dependencies` only. What should happen if a skill-package marks a dependency as optional? Deferred.
- **Maintainer verify / conflict tooling.** Also authoring-time, and — unlike the runtime — permitted to be skill-aware. This is the correct home for the dangling-reference check deliberately kept out of the runtime: a tool that reads skill bodies, notices a skill instructs the agent to use some other skill, and warns the maintainer if nothing in the declared closure provides it. Likewise a conflict check (two skills in a closure colliding on a name). The clean architectural principle: **agnostic runtime (core), opinionated dev tools (create + verify), and they never touch the installer's critical path.** What is the right CLI shape and output format? Deferred.
- **Scaffolding (`create-skillet-skill`).** A package invoked as `npm create skillet-skill <name>` which by npm convention downloads and runs it once and discards it. It would emit the boilerplate an author should not hand-write: a `package.json` (core dependency, `bin`, `files`, `type: module`, and the `skillet` marker), the three-line `cli.js`, and a starter `skills/<name>/SKILL.md` with valid frontmatter. It belongs *out* of core for the mirror-image of the reasons dependency management belongs *in*: it runs once at authoring time before the package exists, it is never a dependency of anything (so it never ships to a user's machine), and the dependency arrow points only one way — the scaffolder must know about core; core must never know about the scaffolder. Not scheduled.
- **System-wide listing.** A command that scans all target directories and lists every installed skill from any source. GC does not require it. Deferred.
- **Partial install failure semantics.** If the GC walk completes step 1–3 for some installs and then errors, is there a rollback strategy? v0.1.0 does not address partial install failure; v0.2.0 inherits that omission. Flagged for future consideration.
