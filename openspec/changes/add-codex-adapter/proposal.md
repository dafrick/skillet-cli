## Why

Skillet currently ships with adapters for Claude Code, GitHub Copilot, and Agents, but lacks support for the OpenAI Codex CLI — a growing AI coding tool that stores configuration under `.codex/`. Adding a first-class Codex adapter lets users install skills into Codex-configured projects and home environments without any custom adapter code.

## What Changes

- Add a new `codex` adapter module at `packages/core/src/adapters/codex.ts` implementing the `Adapter` interface.
- Register the `codex` adapter in `packages/core/src/adapters/index.ts` alongside the existing built-ins.
- The adapter detects user scope when `~/.codex/` exists and project scope when `.codex/config.toml` exists in cwd.
- Skills install to `~/.agents/skills/<skill.name>/` (user) or `.agents/skills/<skill.name>/` (project) — the directories Codex CLI actually reads.

## Capabilities

### New Capabilities

- `codex-adapter`: Codex CLI adapter — detects `~/.codex/` (user) and `.codex/config.toml` (project), resolves install paths under `.agents/skills/` (where Codex CLI reads skills), and passes through skill source directories unchanged.

### Modified Capabilities

- `adapter-registry`: The built-in adapter count increases from three to four; the spec requirement "Three built-in v0.1 adapters registered by default" must be updated to include `codex`.
- `agents-adapter`: The `agents` adapter label changes from `'Agents (.agents/)'` to `'Generic agents (.agents/)'` to distinguish it from the new `codex` adapter, which also installs to `.agents/skills/`.
- `adapter-interface`: Gains an optional `installNote?(scope: Scope): string | undefined` method. When present and returning a string, the installer displays it as a contextual note during scope confirmation.
- `install-orchestration`: Installer checks for `adapter.installNote` and renders the returned string (if any) alongside the scope confirmation prompt.

## Impact

- **New file**: `packages/core/src/adapters/codex.ts`
- **Modified file**: `packages/core/src/adapters/index.ts` (register `codexAdapter`)
- **Modified file**: `packages/core/src/adapters/agents.ts` (label updated to `'Generic agents (.agents/)'`)
- **Spec update**: `openspec/specs/adapter-registry/spec.md` — requirement for built-in adapter count and codex detection scenarios
- No new dependencies; follows identical structural pattern to `claude.ts`
- No breaking changes — purely additive
