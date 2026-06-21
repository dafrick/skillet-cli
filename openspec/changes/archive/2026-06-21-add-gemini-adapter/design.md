## Context

Skillet's adapter system is a simple plugin registry where each adapter implements a four-method interface (`detect`, `supportsScope`, `resolveInstallPath`, `render`). Three built-in adapters (`claude`, `copilot`, `agents`) are registered automatically when `packages/core` is imported from `adapters/index.ts`.

The Gemini CLI stores per-user configuration in `~/.gemini/` and per-project configuration in `.gemini/` within the working directory — a pattern identical to the Claude adapter's use of `~/.claude/` and `.claude/`. The implementation is therefore a near-direct structural copy of `claude.ts` with directory names swapped.

## Goals / Non-Goals

**Goals:**
- Add a `gemini` built-in adapter that detects Gemini CLI installations at user and project scope.
- Install skills to `~/.gemini/skills/<name>/` (user) and `.gemini/skills/<name>/` (project).
- Register the adapter automatically on package import (fourth built-in adapter).

**Non-Goals:**
- Parsing or modifying any Gemini CLI configuration files (e.g., `settings.json`).
- Supporting Gemini-specific rendering transforms — this is a passthrough adapter.
- Any changes to the CLI surface, install orchestration, or user-facing prompts beyond what the adapter registry already handles.

## Decisions

### D1: Passthrough adapter (no render transform)

The `render()` method returns `skill.sourceDir` unchanged, consistent with all three existing built-in adapters. Gemini CLI reads instruction files from directories directly; no format conversion is needed.

*Alternative considered*: Rendering a `GEMINI.md` instruction index file, similar to how some tools aggregate prompt files. Rejected — Gemini CLI's skill loading model matches Claude Code's, and adding a transform would be premature without confirmed Gemini CLI behavior requiring it.

### D2: Mirror the claude adapter structure exactly

`gemini.ts` follows the identical shape as `claude.ts`, with `.gemini` substituted for `.claude`. This keeps the codebase consistent and makes the new file instantly recognizable to contributors.

*Alternative considered*: A generic factory function `makeDirectoryAdapter(dir)` to deduplicate `claude.ts` and `gemini.ts`. Deferred — refactoring two files into a shared factory is a separate concern and adds indirection for minimal gain at this stage.

### D3: Register as the fourth built-in in index.ts

`geminiAdapter` is imported and registered in `adapters/index.ts` alongside the three existing adapters. No changes to `registry.ts` are needed.

## Risks / Trade-offs

- **Gemini CLI directory convention may change** → The `.gemini/` path is based on current public behavior of Gemini CLI. If Google changes the config path, the adapter will need an update. Mitigation: the adapter is easy to patch; detection logic is isolated to one file.
- **False positive detection** → If a project has a `.gemini/` directory for an unrelated reason, the adapter will offer the Gemini option. Mitigation: Consistent with how all other adapters behave (e.g., `.github/` for Copilot); acceptable UX trade-off.
