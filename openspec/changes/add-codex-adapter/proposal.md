## Why

Skillet currently ships with adapters for Claude Code, GitHub Copilot, and Agents, but lacks support for the OpenAI Codex CLI — a growing AI coding tool that stores configuration under `.codex/`. Adding a first-class Codex adapter lets users install skills into Codex-configured projects and home environments without any custom adapter code.

## What Changes

- Add a new `codex` adapter module at `packages/core/src/adapters/codex.ts` implementing the `Adapter` interface.
- Register the `codex` adapter in `packages/core/src/adapters/index.ts` alongside the existing built-ins.
- The adapter detects user scope when `~/.codex/` exists and project scope when `.codex/` exists in cwd.
- Skills install to `~/.codex/skills/<skill.name>/` (user) or `.codex/skills/<skill.name>/` (project).

## Capabilities

### New Capabilities

- `codex-adapter`: Codex CLI adapter — detects `.codex/` directories at user and project scope, resolves install paths under `.codex/skills/`, and passes through skill source directories unchanged.

### Modified Capabilities

- `adapter-registry`: The built-in adapter count increases from three to four; the spec requirement "Three built-in v0.1 adapters registered by default" must be updated to include `codex`.

## Impact

- **New file**: `packages/core/src/adapters/codex.ts`
- **Modified file**: `packages/core/src/adapters/index.ts` (register `codexAdapter`)
- **Spec update**: `openspec/specs/adapter-registry/spec.md` — requirement for built-in adapter count and codex detection scenarios
- No new dependencies; follows identical structural pattern to `claude.ts`
- No breaking changes — purely additive
