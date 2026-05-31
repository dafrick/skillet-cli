## Why

Skill authors publishing `SKILL.md`-based agent skills have no standard way to distribute and install them across the growing landscape of AI coding agents (Claude Code, Copilot, Cursor, Codex CLI, Gemini CLI). Each author currently writes bespoke shell scripts or manual instructions, duplicating effort and leaving users with fragile, agent-specific install flows. `@skillet/core` solves this once, for everyone.

## What Changes

- **New npm package `@skillet/core`** — a shared runtime library that skill authors add as a dependency to their npm skill package
- **`run()` entrypoint** — authors invoke a single function from their `bin/cli.js`; the library constructs and runs the full CLI
- **Agent detection** — detects Claude Code, GitHub Copilot, and the generic `.agents/` convention at both user and project scope
- **Full-tree installation** — copies the entire skill directory (not just `SKILL.md`) to the correct target location
- **Content-hash identity** — uses SHA-256 over the skill tree to identify and diff installs, independent of declared version strings
- **`.skill-manifest.json` manifests** — written into each install directory recording provenance, hashes, and timestamps
- **Drift detection** — detects user-local modifications to installed files before overwriting on update
- **Four CLI commands** — `install`, `update`, `uninstall`, `list` with interactive prompts and non-interactive (`--yes`, `--force`, `--target`) flags
- **Hook system** — `transform`, `beforeInstall`, `afterInstall`, `extendProgram` hooks for author customization
- **Update notifier** — passive npm version nudge on every CLI invocation (via `update-notifier`)
- **Three v0.1 targets** — `claude` (user + project scope), `copilot` (project scope), `agents` (user + project scope, always offered)
- **Adapter interface** — extensible registry so future targets (Kiro, legacy Copilot formats, `AGENTS.md`) can be added without breaking the author API

## Capabilities

### New Capabilities

- `skill-normalization`: Parse a `SKILL.md` directory into a `NormalizedSkill` object (frontmatter, body, sourceDir, contentHash)
- `content-hashing`: Deterministic SHA-256 tree hash with platform normalization (path separators, line endings) and configurable ignore set
- `adapter-registry`: Central registry of target adapters; each adapter implements detect / supportsScope / resolveInstallPath / render
- `install-orchestration`: Resolve targets (detect or explicit), render, copy tree, write `.skill-manifest.json` manifest, compute `postInstallHash`
- `drift-detection`: Compare current install folder hash against stored `postInstallHash` to identify locally modified installs
- `update-flow`: Reconcile existing installs with current source using render-hash comparison; three-way prompt (backup / overwrite / skip) on drift
- `cli-surface`: `commander`-based CLI with `install`, `update`, `uninstall`, `list` commands and full flag set

### Modified Capabilities

## Impact

- **New package**: `@skillet/core` published to npm under the `@skillet` scope
- **Node 24+**, ES modules (`"type": "module"`)
- **Runtime dependencies**: `commander` (CLI framework), `gray-matter` (SKILL.md frontmatter + body parsing), `update-notifier` (version nudge), `@inquirer/prompts` (interactive multi-select)
- **No existing code modified** — this is a net-new library with no prior codebase to migrate
- **Author impact**: skill package authors add `@skillet/core` as a dependency and replace any bespoke install scripts with a 3-line `bin/cli.js`
- **User impact**: users run `npx <skill> install` instead of following manual README steps; updates use `npm update && <skill> update`
