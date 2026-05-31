## Context

`@skillet/core` is a brand-new npm library — there is no existing codebase to migrate. The design must produce a stable, extensible foundation that skill authors depend on via `npm install`. Breaking changes to the author-facing API will require a major semver bump, so the architecture prioritises getting the abstractions right on the first release rather than iterating privately.

The target runtime is Node 24+ with ES modules. The package is published under the `@skillet` npm scope. Three v0.1 targets are supported: Claude Code, GitHub Copilot (user + project scope), and a generic `.agents/skills/` convention. All three are "Bucket A" (passthrough) — they consume the `SKILL.md` directory unchanged.

Explicitly anticipated future targets that the architecture must not foreclose: Kiro (`.kiro/steering/` steering files, Bucket B), legacy Copilot instructions (`.github/copilot-instructions.md` or `*.prompt.md`, Bucket B), an `AGENTS.md` aggregator (Bucket B), and Cursor-specific extensions beyond the generic `.agents/` convention (Bucket A or B depending on their eventual format).

## Goals / Non-Goals

**Goals:**
- Ship a working `run()` entrypoint that authors can invoke from a 3-line bin script
- Provide a stable adapter interface so new targets can be added without touching author code
- Implement the content-hash identity model so update logic is correct even when declared versions are not bumped
- Implement per-install `.skill-manifest.json` manifests and drift detection
- Support interactive and non-interactive (CI) operation modes
- Export lower-level primitives (`normalizeSkill`, `hashSkill`, `registry`, `registerAdapter`) for advanced consumers

**Non-Goals:**
- Skill authoring assistance, linting, or validation beyond required frontmatter fields
- Format translation for divergent targets (Kiro, legacy Copilot, Cursor-specific extensions) — interface is designed for it, implementation deferred
- A top-level `skillet` CLI for cross-package skill management
- Auto-updating skills on CLI invocation
- Authentication, signing, or trust mechanisms
- Sandboxing or capability restriction — what a skill is permitted to do at runtime is the agent's responsibility, not the installer's

## Decisions

### D1: Library is a dependency, not a framework

**Decision**: `@skillet/core` is a library that authors `import` and compose into their own npm package. It does not own `process.exit`, does not impose a project structure, and does not run anything unless `run()` is explicitly called. Authors remain in control of their package; the library provides machinery, not scaffolding.

**Rationale**: A framework approach (where the library takes over the bin script entirely, or auto-discovers skill directories) would couple every skill package tightly to `@skillet/core`'s conventions and make it harder to add custom commands, custom output, or non-standard publishing flows. The 3-line `bin/cli.js` contract keeps authors in control while eliminating the boilerplate they'd otherwise write.

**Alternative considered**: Convention-based auto-discovery (e.g. look for `skill/` in the package root automatically). Rejected because it removes author control over which directory is the skill and makes the library's behaviour implicit.

---

### D2: Adapter registry pattern for targets

**Decision**: Each target (Claude, Copilot, agents) is an adapter module that implements a fixed interface (`id`, `label`, `detect`, `supportsScope`, `resolveInstallPath`, `render`). Adapters are registered at library initialisation time in a central registry.

**Rationale**: Adding a new target requires writing one new file and registering it — no changes to orchestration code or the author-facing API. This is the primary extensibility mechanism.

**Alternative considered**: A config-file approach (JSON listing paths per target). Rejected because it cannot express `detect()` logic or future `render()` translation without becoming a mini-language.

---

### D3: Passthrough render in v0.1; abstract render step from the start

**Decision**: All v0.1 adapters implement `render()` as a no-op (return `sourceDir` unchanged). The orchestration layer calls `render()` and copies whatever path it returns, not `sourceDir` directly.

**Rationale**: When Bucket B adapters land, the orchestration code changes nothing — only the adapter's `render()` does work. If we skipped the render step in v0.1, adding it later would require patching every call site and possibly the manifest schema.

**Alternative considered**: Hard-code passthrough in orchestration for v0.1, add render abstraction later. Rejected: migration cost is higher than the near-zero cost of calling a no-op function today.

---

### D4: Content hash as canonical identity; declared version as informational only

**Decision**: The library computes a deterministic SHA-256 over the sorted, normalised skill tree. This hash, not the `version` field in frontmatter, is used to determine whether an install is up to date.

**Rationale**: Authors frequently forget to bump version strings. Content hashing makes the update gate reliable without requiring author discipline.

**Algorithm**: Sort all files by relative POSIX path, then for each file feed `path\0content\0` into the hash (with `\r\n`→`\n` normalisation for text files). Prefix the hex digest with `sha256:`.

**Stability commitment**: The algorithm is frozen for the lifetime of the `sha256:` prefix. Any future change uses a new prefix and requires manifest migration code that can read both old and new formats. See D13 for the full versioning policy.

---

### D5: Per-install `.skill-manifest.json` instead of a central index

**Decision**: Each installed skill directory contains its own manifest. No global index file.

**Rationale**: Manifests survive filesystem-level moves/copies, are self-describing, avoid write contention across concurrent package installs, and make drift detection purely local. The only tradeoff — scanning directories to enumerate all installs — is fast and not on the hot path.

**Alternative considered**: `~/.skillet/installed.json`. Rejected due to fragility, contention, and loss of portability when dotfiles are synced between machines.

---

### D6: `postInstallHash` as the drift baseline

**Decision**: Immediately after writing the install, re-hash the installed folder (excluding the manifest) and store the result as `postInstallHash` in the manifest.

**Rationale**: Comparing the live folder hash to `postInstallHash` cleanly detects any user edit without needing a separate "original files" snapshot.

**Why not use `contentHash` directly?** In v0.1 they'd be equal, but a Bucket B adapter writes a *transformed* tree to disk that differs from the source. `postInstallHash` is always "what we actually wrote", regardless of adapter type.

---

### D7: `renderHash` tracked from v0.1 despite being redundant

**Decision**: `renderHash = sha256(contentHash + "|" + adapterId + "|" + libVersion)` is stored in the manifest even though all v0.1 adapters are passthrough.

**Rationale**: When `@skillet/core` improves a Bucket B adapter's rendering logic, the `renderHash` change flags "this install is stale even though the source hasn't changed". Adding this field later requires a manifest migration; storing it now costs nothing.

---

### D8: Dependency choices — `commander`, `gray-matter`, `@inquirer/prompts`, `vitest`

**Decision**: 
- **CLI framework**: `commander` — standard, well-maintained, TypeScript types included.
- **Frontmatter parsing**: `gray-matter` — de-facto standard for parsing frontmatter + body from a single file in one call. Returns `{ data: { name, description, ... }, content: "markdown body" }` directly matching the SKILL.md structure; uses `js-yaml` internally.
- **Interactive prompts**: `@inquirer/prompts` — modern successor to `inquirer`, modular and tree-shakeable.
- **Test framework**: `vitest` — native TypeScript + ESM support, clean setup/teardown ergonomics for filesystem integration tests, built-in coverage.

**Non-interactive detection**: Check `process.stdin.isTTY`. If falsy, behave as if `--yes` was passed for selection prompts; still require `--force` to overwrite modified installs.

---

### D9: `install` and `update` share machinery but differ in defaults

**Decision**: Both commands call the same internal `performInstall(target, scope, skill, opts)` function. The difference is in how the target list is assembled before dispatch: `install` detects and prompts for all available targets; `update` filters to targets where the skill is already installed.

**Rationale**: Avoids duplicating the core copy/manifest logic while keeping the user-facing semantics distinct and predictable. This split prevents two annoying failure modes: `install` after `npm update` accidentally adding the skill to new places the user didn't ask for; and `update` failing to do anything useful when the user wanted to add a target.

---

### D10: Hooks are optional callbacks, not plugin files

**Decision**: Hooks (`transform`, `beforeInstall`, `afterInstall`, `extendProgram`) are async functions passed in the `run()` options object.

**Rationale**: Simple to implement, simple to document, zero overhead when not used. A plugin-file discovery system would add complexity and a new failure mode (file not found, parse error).

---

### D11: Package exports both `run()` and lower-level primitives; `registry` is an object with methods

**Decision**: The package's `exports` map exposes the high-level `run()` and the low-level primitives (`normalizeSkill`, `hashSkill`, `registry`, `registerAdapter`, `install`, `update`).

`registry` is exported as an **object with methods**: `registry.register(adapter)`, `registry.get(id)`, `registry.list()`. The top-level `registerAdapter(adapter)` export is a convenience alias for `registry.register(adapter)`, matching the brief's explicit enumeration while keeping the registry object as the primary API for reads.

**Rationale**: Advanced consumers (e.g. a `@skillet/cli` meta-package) need access to internals without forking the library. The object-with-methods shape for `registry` is cleaner for consumers who want to inspect or enumerate adapters — they import one thing and call methods on it rather than importing multiple flat functions.

---

### D12: Auto-update is not the default; three alternatives explicitly rejected

**Decision**: The library does not automatically reinstall skill files. Updating is a deliberate two-step act: `npm update` refreshes the JavaScript package; `<skill> update` reconciles the installed files. The library nudges users toward the second step via `update-notifier` but never performs it automatically.

**Alternatives rejected**:

1. **Auto-update on every CLI invocation.** Every time the user runs any `<skill> ...` command, silently reinstall. Rejected: surprising to users, slow, and races with concurrent invocations.
2. **`postinstall` hook in the author's `package.json`.** Run `<skill> install` automatically when npm finishes installing the package. Rejected as default behaviour: surprises users who didn't expect filesystem writes outside `node_modules/`. Authors who want this can add a `postinstall` script to their own `package.json`; the library won't impose it.
3. **A `<skill> upgrade` meta-command that shells out to npm.** Convenient but means the library is invoking the user's package manager, which has many failure modes (which package manager? user-level or project? permissions?). Deferred; users can write a shell alias if they want one command.

---

### D13: Versioning policy and hash algorithm stability commitment

**Decision**: The following semver policy governs `@skillet/core` releases:

- **Patch** (`0.1.0` → `0.1.1`): bug fixes, no behaviour change.
- **Minor** (`0.1.0` → `0.2.0`): new adapters, new optional hooks, new flags with safe defaults. Existing authors get these by bumping the dependency caret — no code changes required on their side.
- **Major** (`0.x` → `1.0`, and beyond): changes to the author-facing API, the `.skill-manifest.json` manifest schema, or the hash algorithm. Paired with migration notes.

The hash algorithm is a special case within this policy. Changing it would invalidate every existing install's stored `contentHash` and `postInstallHash`. Any future change therefore requires one of two approaches: (a) continue computing the old algorithm for comparison against existing manifests (identified by the `sha256:` prefix) while computing the new algorithm for new installs, or (b) a one-time migration command. The `sha256:` prefix in stored hashes exists precisely to make this future-safe — the algorithm is self-describing in the manifest.

**Rationale**: A clear, published policy is itself a feature for skill authors who depend on this library. The hash stability commitment in particular shapes implementation: the prefix must be stored, never stripped, in all persisted hashes.

## Risks / Trade-offs

**[Risk] Hash algorithm stability** → The `sha256:` prefix is a contract. Mitigation: freeze the algorithm definition in the spec; any future change requires a new prefix and migration code that reads old-format manifests.

**[Risk] `update-notifier` checks npm on every run** → It caches results for 24 hours and is async/non-blocking, so latency impact is minimal. Mitigation: the library passes the author's `pkg` object to `update-notifier` so it checks the *author's* package version, not its own.

**[Risk] Interactive prompts break in CI** → Non-TTY detection defaults to `--yes` mode. Mitigation: document clearly; CI users can also pass `--target` and `--yes` explicitly.

**[Risk] Concurrent installs of different packages to the same target directory** → Each package installs to its own `<skills>/<name>/` subdirectory. The only collision risk is two packages publishing skills with the same `name`. Mitigation (deferred): detect `source` field mismatch on install and warn.

**[Risk] Windows path handling** → Relative path normalisation (backslash → forward slash) is part of the hashing spec. Mitigation: unit-test the hash function on both path separator styles.

**[Trade-off] Two-step update UX** → `npm update` + `<skill> update` is two commands instead of one. This is intentional (no auto-write surprises) but needs clear documentation in every skill's README. `update-notifier` nudges mitigate the discoverability gap.

## Open Questions

Questions carried forward from the initial brief — documented so they are not lost:

- **System-wide listing.** Is there demand for a top-level `skillet list` command that scans all known target directories and lists every installed skill from any package? Probably yes eventually; deferred until a clear need emerges.
- **Package name collision.** What happens if two different npm packages publish skills with the same `name`? They'd install to the same target directory and the second would overwrite the first. Detecting this at install time (by comparing the `source` field in the existing manifest against the incoming install's source) and warning the user is the right mitigation — deferred.
- **Skill validation.** Should the library offer a `validate` subcommand running lint-style checks (frontmatter completeness, suspiciously short descriptions, references to nonexistent files)? This is an authoring-tool concern rather than a runtime concern; deferred.
- **Symlink installs.** For local development of a skill, an author might want the install to be a symlink to the source so edits are live. Could be opt-in via `--link`. Deferred.
- **Dry run.** A `--dry-run` flag that prints what would be installed or changed without writing. Cheap to add; deferred until clearly needed.
- **Telemetry.** Not in v0.1, probably not ever for a tool of this category. Explicitly: no telemetry.

Open questions arising from implementation analysis:

- **Copilot detection heuristic**: Detecting Copilot via the presence of `.github/` is coarse — any repo with GitHub Actions would match. Should the detector require `.github/copilot-instructions.md` or some other Copilot-specific marker instead? Needs validation against real Copilot installs.
- **Backup naming**: The drift-prompt "backup and overwrite" option creates a timestamped sibling folder. Exact naming scheme not yet specified (e.g. `<name>.bak.20260530T120000Z/`). Agree on format before implementing.
