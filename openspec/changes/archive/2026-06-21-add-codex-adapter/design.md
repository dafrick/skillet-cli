## Context

Skillet's adapter layer (`packages/core/src/adapters/`) follows a uniform structural pattern: each adapter is a self-contained module that exports a single `const` implementing the `Adapter` interface. Detection is purely filesystem-based (`fs.existsSync`) and install-path resolution is simple path arithmetic.

The OpenAI Codex CLI stores configuration under `.codex/` (project, via `.codex/config.toml`) and `~/.codex/` (user). Critically, Codex loads skills from **`.agents/skills/`** (project, scanned up to repo root) and **`$HOME/.agents/skills/`** (user) — not from `.codex/skills/`. This is distinct from configuration: the config directory is `.codex/`, but the skill-loading path is `.agents/skills/`.

The existing `agents` adapter already installs to `.agents/skills/`. The `codex` adapter has the same install paths but different detection: it fires when Codex is configured (`~/.codex/` or `.codex/config.toml`), whereas the `agents` adapter fires when `.agents/` already exists. The two coexist without conflict — they just happen to write to the same directories under different trigger conditions.

## Goals / Non-Goals

**Goals:**
- Provide a `codex` adapter (`id: 'codex'`, `label: 'Codex CLI'`) that detects Codex configuration via `~/.codex/` (user) and `.codex/config.toml` (project).
- Install skills to `$HOME/.agents/skills/<skill.name>/` (user) and `.agents/skills/<skill.name>/` (project) — the directories Codex CLI actually reads.
- Relabel the existing `agents` adapter to `'Generic agents (.agents/)'` to distinguish it from Codex.
- Register the new adapter as a built-in alongside `claude`, `copilot`, and `agents`.
- Surface a scope note at user scope explaining that the install path is shared with generic agents environments, so users understand the consequence without needing to know the implementation.

**Non-Goals:**
- Installing to `.codex/skills/` — Codex CLI does not read from there.
- Supporting any Codex-specific prompt rendering (passthrough only).
- Auto-creating `.codex/` or `.agents/` directories if absent.

## Decisions

### Decision: Install to `.agents/skills/`, detect via `.codex/`

**Choice**: `resolveInstallPath()` returns paths under `.agents/skills/`, not `.codex/skills/`. Detection uses `~/.codex/` (user) and `.codex/config.toml` presence (project).

**Rationale**: The Codex official docs state: "Codex reads skills from `.agents/skills/` in every directory from your current working directory up to the repository root" and `$HOME/.agents/skills/` for user scope. `.codex/skills/` is not mentioned as a skill-loading path. The design must match where Codex actually reads, not where its config lives.

**Alternatives considered**:
- Detect via `.codex/` directory (not `config.toml`) for project scope — rejected because the mere presence of a `.codex/` directory without `config.toml` does not reliably indicate Codex is configured for the project. `config.toml` is the canonical project-scope marker.

### Decision: Project detection on `.codex/config.toml`, not `.codex/` directory

**Choice**: `detect()` checks `fs.existsSync(path.join(ctx.cwd, '.codex', 'config.toml'))` for project scope.

**Rationale**: `.codex/config.toml` is Codex's project-level configuration file. Its presence is a reliable signal that Codex is in use for this project. A bare `.codex/` directory could be stale or empty. Checking the file is more specific and avoids false positives.

### Decision: Relabel agents adapter to 'Generic agents (.agents/)'

**Choice**: Change `agentsAdapter.label` from `'Agents (.agents/)'` to `'Generic agents (.agents/)'`.

**Rationale**: Now that `codex` also installs to `.agents/skills/`, users see both adapters in the install prompt. The label distinction makes clear that `agents` is the fallback for any tool reading `.agents/`, while `codex` is the Codex-specific adapter.

### Decision: Surface shared install path via optional installNote?() method

**Choice**: Add an optional `installNote?(scope: Scope): string | undefined` method to the `Adapter` interface. `codexAdapter` implements it for `'user'` scope, returning: `"installs to ~/.agents/skills/ — also available to any generic agents environment"`. The installer renders the string (if any) as a contextual note during scope confirmation.

**Rationale**: Codex user-scope installs to `~/.agents/skills/`, the same path the generic `agents` adapter uses. A user selecting Codex user scope implicitly installs for all agents-based environments. This is correct and desirable, but non-obvious. The note makes the consequence visible without requiring the user to understand the underlying path overlap.

The method is optional on the interface (duck-typed) so existing adapters need no changes. The orchestration checks `typeof adapter.installNote === 'function'` — no coupling to any specific adapter id. Any future adapter that shares an install path with another environment can use the same hook.

**Alternatives considered**:
- Hardcode a check in install orchestration for `adapter.id === 'codex'` — rejected because it couples orchestration to a specific adapter, violating the adapter abstraction.
- Add a `sharedEnvironments?: string[]` metadata field — more expressive but higher surface area for a single use case.

### Decision: Register codex as the fourth built-in

**Choice**: `registry.register(codexAdapter)` in `packages/core/src/adapters/index.ts`.

**Rationale**: Codex CLI is a first-party supported target; users should not need to register the adapter manually.

## Risks / Trade-offs

- **Same install paths as agents adapter** → Both `codex` and `agents` install to `.agents/skills/`. Running `skillet install` in a project with both `.agents/` and `.codex/config.toml` will show both in the adapter list and install to the same location. This is harmless (idempotent copies) but may confuse users. Mitigation: adapter labels clearly distinguish the two; the `installNote` on the Codex user-scope path explicitly surfaces the shared-path consequence.
- **Codex changes skill-loading path** → If OpenAI moves skill discovery to a different directory, the adapter silently becomes useless. Mitigation: adapter tests pin the path; a failing test signals the need for an update.
- **The skillet repo itself triggers project detection** → The skillet repo has a `.codex/` directory. If `config.toml` exists there, it will trigger Codex project detection when running `skillet install` inside the repo. Acceptable: it means Codex is configured there.

## Migration Plan

Additive change — no migration required:
1. Update `agentsAdapter.label` in `agents.ts`
2. Add optional `installNote?(scope: Scope): string | undefined` to the `Adapter` interface in `adapters/types.ts`
3. Add `packages/core/src/adapters/codex.ts` (implements `installNote` for user scope)
4. Register in `packages/core/src/adapters/index.ts`
5. Update install orchestration in `packages/core/src/install.ts` to render `installNote` when present
6. Update specs and tests
