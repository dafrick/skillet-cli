## Why

The `create-skillet` wizard and `check` subcommand produce noisy, passive output that puts work back on the user: violations are flagged but the user is left to manually write `.npmignore`, prompts use low-level technical language, and the terminal fills with npm install logs. These friction points undermine the tool's promise of a polished, end-to-end experience.

## What Changes

- **Interactive `.npmignore` writer**: when `create-skillet check` (or the post-wizard check) finds tarball violations, the CLI prompts the user to select which entries to exclude and writes `.npmignore` directly — no manual editing required
- **Collapsible directory tree**: the tarball file list collapses directories by default; users can expand, include, exclude, or split a directory entry into its children for fine-grained control
- **Tighter CLI output**: wizard output sections are compacted; long output blocks (tarball listing, scaffold commands, skill-file selector) become visually grouped with expand affordances where appropriate
- **High-level plugin/extension prompt**: the two separate manifest prompts ("Generate Claude Code + Copilot CLI manifests?" / "Generate Gemini CLI extension?") are replaced by a single higher-level question ("Add plugin/extension marketplace support?") with sub-questions revealed only if the user opts in
- **"I'll run" wording**: the wizard preview block changes from "Commands to run:" (sounds like the user must act) to "Here's what I'll do:" (makes clear the CLI will execute these steps)
- **Suppressed npm output**: `npm install @skillet-cli/core` output is hidden by default; only a one-line progress indicator and final success/failure line are shown

## Capabilities

### New Capabilities

- `interactive-npmignore`: Interactive tarball-violation triage — collapsible directory tree with per-entry include/exclude/split selection; writes `.npmignore` when the user confirms

### Modified Capabilities

- `scaffold-publish-preview`: Violation handling changes from a static instruction ("add to .npmignore") to an interactive prompt that writes `.npmignore`; file tree display adds directory collapsing
- `skilletize-wizard`: Plugin/extension prompts consolidated into one high-level opt-in; preview block uses "Here's what I'll do:" language; npm install output suppressed to a single status line

## Impact

- `packages/create/src/check.ts` — interactive `.npmignore` writing replaces static violation message; directory collapsing logic added to file display
- `packages/create/src/run.ts` — "Here's what I'll do:" wording; plugin/extension prompt consolidation
- `packages/create/src/prompts.ts` — consolidated plugin/extension opt-in prompt replaces two separate confirms
- `packages/create/src/scaffold.ts` — npm install piped through progress wrapper; stdout suppressed
- `packages/create/src/plugin-manifests.ts` — no logic changes; prompt restructuring is in `prompts.ts`
- No new npm dependencies expected; collapsible tree uses existing `@inquirer/prompts` checkbox/confirm primitives
