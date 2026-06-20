## Why

Skillet currently ships built-in adapters for Claude Code, GitHub Copilot, and the generic Agents environment, but has no support for Gemini CLI — Google's AI assistant CLI tool. As Gemini CLI adoption grows, skillet users who work in that environment cannot install skills without building a custom adapter themselves.

## What Changes

- Add a new `gemini` adapter module at `packages/core/src/adapters/gemini.ts` that detects `~/.gemini/` (user scope) and `.gemini/` in the cwd (project scope), and installs skills to `~/.gemini/skills/<name>/` or `.gemini/skills/<name>/`.
- Register the `gemini` adapter as a fourth built-in adapter alongside `claude`, `copilot`, and `agents` in `packages/core/src/adapters/index.ts`.
- Update the adapter-registry spec to include Gemini detection and install-path scenarios.

## Capabilities

### New Capabilities

- `gemini-adapter`: A built-in passthrough adapter for Gemini CLI that detects the Gemini environment and resolves skill install paths under `.gemini/skills/`.

### Modified Capabilities

- `adapter-registry`: Adding a fourth built-in adapter (`gemini`) to the set that is registered by default on package import, and adding detection/install-path scenarios for it.

## Impact

- `packages/core/src/adapters/gemini.ts` — new file
- `packages/core/src/adapters/index.ts` — import and register `geminiAdapter`
- `packages/core/src/adapters/registry.ts` — no changes expected (generic)
- No breaking changes; the existing three adapters are unaffected
- No new runtime dependencies
